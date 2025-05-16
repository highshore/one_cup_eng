import { HttpsError, onCall, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import axios from "axios";
import * as logger from "firebase-functions/logger";

// Helper to normalize phone numbers to E.164 format
const normalizePhoneNumber = (phoneNumber: string | undefined | null): string | null => {
  if (!phoneNumber) return null;
  logger.log("normalizePhoneNumber - input:", phoneNumber); // Log input
  let cleaned = phoneNumber.startsWith("+")
    ? "+" + phoneNumber.replace(/[^0-9]/g, "")
    : phoneNumber.replace(/[^0-9]/g, "");

  if (cleaned.startsWith("+8201")) {
    cleaned = "+82" + cleaned.substring(4);
  } else if (cleaned.startsWith("01")) {
    cleaned = "+82" + cleaned.substring(1);
  } else if (cleaned.startsWith("82") && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  const result = /^\+821[0-9]{8,9}$/.test(cleaned) ? cleaned : null;
  logger.log("normalizePhoneNumber - output:", result); // Log output
  return result;
};

// Define the expected structure of the data object passed to the function
interface KakaoLoginRequestData {
  kakaoAccessToken: string;
  kakaoSub: string;
}

export const resolveKakaoLogin = onCall<KakaoLoginRequestData>(
  { region: "asia-northeast3" },
  async (request: CallableRequest<KakaoLoginRequestData>) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "The function must be called while authenticated (OIDC user).");
    }
    const { kakaoAccessToken, kakaoSub } = request.data;
    if (!kakaoAccessToken || typeof kakaoAccessToken !== 'string') {
      throw new HttpsError("invalid-argument", "Missing 'kakaoAccessToken' string.");
    }
    if (!kakaoSub || typeof kakaoSub !== 'string') {
      throw new HttpsError("invalid-argument", "Missing 'kakaoSub' string.");
    }

    const oidcUserUid = request.auth.uid;
    logger.log(`resolveKakaoLogin: Started for OIDC UID: ${oidcUserUid}, Kakao Sub: ${kakaoSub}`);

    let kakaoUserInfo: any;
    try {
      const response = await axios.get("https://kapi.kakao.com/v2/user/me", {
        headers: { Authorization: `Bearer ${kakaoAccessToken}` },
        params: { property_keys: JSON.stringify(["kakao_account.phone_number", "kakao_account.profile", "kakao_account.email"]) },
      });
      kakaoUserInfo = response.data;
      logger.log("Kakao raw user info for OIDC UID", oidcUserUid, JSON.stringify(kakaoUserInfo));
    } catch (error: any) {
      logger.error("Error fetching Kakao user info for OIDC UID", oidcUserUid, error.response?.data || error.message);
      throw new HttpsError("internal", `Failed to fetch Kakao user info for ${oidcUserUid}.`);
    }

    const kakaoPhoneNumberRaw = kakaoUserInfo.kakao_account?.phone_number;
    const kakaoEmail = kakaoUserInfo.kakao_account?.email;
    let kakaoProfileImageUrl = kakaoUserInfo.kakao_account?.profile?.profile_image_url;
    const kakaoProfileNickname = kakaoUserInfo.kakao_account?.profile?.nickname;
    const normalizedKakaoPhone = normalizePhoneNumber(kakaoPhoneNumberRaw);

    if (kakaoProfileImageUrl && kakaoProfileImageUrl.startsWith("http://")) {
      kakaoProfileImageUrl = kakaoProfileImageUrl.replace("http://", "https://");
    }

    if (normalizedKakaoPhone) {
      try {
        const existingUserByPhone = await admin.auth().getUserByPhoneNumber(normalizedKakaoPhone);
        logger.log(`Found existing user by phone. Matched UID: ${existingUserByPhone.uid}, Phone: ${existingUserByPhone.phoneNumber}`);
        
        if (existingUserByPhone.uid !== oidcUserUid) {
          logger.log(`UIDs differ: OIDC UID ${oidcUserUid} vs. Phone-matched UID ${existingUserByPhone.uid}. Switching accounts.`);
          await admin.auth().deleteUser(oidcUserUid);
          logger.log(`Deleted temporary Firebase OIDC user ${oidcUserUid}.`);
          
          const updatePayloadForPhoneUser: admin.auth.UpdateRequest = {};
          if (kakaoProfileNickname && !existingUserByPhone.displayName) updatePayloadForPhoneUser.displayName = kakaoProfileNickname;
          if (kakaoEmail && !existingUserByPhone.email) updatePayloadForPhoneUser.email = kakaoEmail;
          if (kakaoProfileImageUrl && !existingUserByPhone.photoURL) updatePayloadForPhoneUser.photoURL = kakaoProfileImageUrl;
          // Phone number is the linking key, not updated here. Email verification status not handled by Kakao OIDC by default.

          if (Object.keys(updatePayloadForPhoneUser).length > 0) {
              await admin.auth().updateUser(existingUserByPhone.uid, updatePayloadForPhoneUser);
              logger.log(`Updated Auth for phone-matched user ${existingUserByPhone.uid} with Kakao details (only if empty):`, JSON.stringify(updatePayloadForPhoneUser));
          }

          const existingUserDocRef = admin.firestore().collection("users").doc(existingUserByPhone.uid);
          await existingUserDocRef.set({ kakaoId: kakaoSub, lastLoginAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
          logger.log(`Updated existing user ${existingUserByPhone.uid} Firestore doc with kakaoId: ${kakaoSub}.`);

          const customTokenForExistingUser = await admin.auth().createCustomToken(existingUserByPhone.uid);
          return {
            status: "account_exists_by_phone",
            existingUserUid: existingUserByPhone.uid,
            customToken: customTokenForExistingUser,
          };
        } else {
          // OIDC user UID IS THE SAME as the phone-matched UID.
          logger.log(`UIDs match: OIDC UID ${oidcUserUid} is the same as Phone-matched UID.`);
          const currentUserAuth = await admin.auth().getUser(oidcUserUid); // Fetch current OIDC user state
          const updatePayloadForOidcUser: admin.auth.UpdateRequest = {};
          if (kakaoProfileNickname && !currentUserAuth.displayName) updatePayloadForOidcUser.displayName = kakaoProfileNickname;
          if (kakaoEmail && !currentUserAuth.email) updatePayloadForOidcUser.email = kakaoEmail;
          if (kakaoProfileImageUrl && !currentUserAuth.photoURL) updatePayloadForOidcUser.photoURL = kakaoProfileImageUrl;
          if (normalizedKakaoPhone && currentUserAuth.phoneNumber !== normalizedKakaoPhone) updatePayloadForOidcUser.phoneNumber = normalizedKakaoPhone; // Ensure phone is up-to-date or set

          if (Object.keys(updatePayloadForOidcUser).length > 0) {
            await admin.auth().updateUser(oidcUserUid, updatePayloadForOidcUser);
            logger.log(`Updated Auth for current OIDC user ${oidcUserUid} (only if empty/different phone):`, JSON.stringify(updatePayloadForOidcUser));
          }
          const userDocRef = admin.firestore().collection("users").doc(oidcUserUid);
          await userDocRef.set({ kakaoId: kakaoSub, lastLoginAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
          logger.log(`Ensured Firestore doc for ${oidcUserUid} has kakaoId: ${kakaoSub}.`);
        }
      } catch (error: any) {
        if (error.code === "auth/user-not-found") {
          logger.log(`No Firebase user found with phone '${normalizedKakaoPhone}'. Will treat ${oidcUserUid} as new/unlinked regarding phone.`);
        } else {
          logger.error(`Error in getUserByPhoneNumber for phone '${normalizedKakaoPhone}', OIDC UID ${oidcUserUid}:`, error);
        }
      }
    }

    // Fallthrough for new users or OIDC users not matched by phone, or OIDC users who were phone matched.
    logger.log(`Proceeding to finalize Auth and Firestore for OIDC UID: ${oidcUserUid} with Kakao Sub: ${kakaoSub}`);
    const finalAuthUser = await admin.auth().getUser(oidcUserUid); // Get potentially updated auth state
    const authSetupPayload: admin.auth.UpdateRequest = {};
    if (kakaoProfileNickname && !finalAuthUser.displayName) authSetupPayload.displayName = kakaoProfileNickname;
    if (kakaoEmail && !finalAuthUser.email) authSetupPayload.email = kakaoEmail;
    if (kakaoProfileImageUrl && !finalAuthUser.photoURL) authSetupPayload.photoURL = kakaoProfileImageUrl;
    if (normalizedKakaoPhone && !finalAuthUser.phoneNumber) {
      authSetupPayload.phoneNumber = normalizedKakaoPhone; // Add phone if Kakao provided one and user doesn't have one
    }

    if (Object.keys(authSetupPayload).length > 0) {
      try {
        await admin.auth().updateUser(oidcUserUid, authSetupPayload);
        logger.log(`Successfully updated Firebase Auth for OIDC UID ${oidcUserUid} (only if empty):`, JSON.stringify(authSetupPayload));
      } catch (authError: any) {
        logger.error(`Error updating Firebase Auth for OIDC UID ${oidcUserUid}:`, authError, "Payload:", JSON.stringify(authSetupPayload));
      }
    }

    const userDocRef = admin.firestore().collection("users").doc(oidcUserUid);
    const userDocSnapshot = await userDocRef.get();
    const ancientDate = new Date(1000, 0, 1);
    const firestoreUserData: any = {
      kakaoId: kakaoSub,
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      displayName: finalAuthUser.displayName || kakaoProfileNickname || null, // Prefer Auth, then Kakao, then null
      email: finalAuthUser.email || kakaoEmail || null,
      photoURL: finalAuthUser.photoURL || kakaoProfileImageUrl || null,
    };

    if (!userDocSnapshot.exists) {
      logger.log(`Creating NEW Firestore document for OIDC UID: ${oidcUserUid}`);
      firestoreUserData.cat_business = false;
      firestoreUserData.cat_tech = false;
      firestoreUserData.last_received = ancientDate;
      firestoreUserData.left_count = 0; 
      firestoreUserData.received_articles = [];
      firestoreUserData.saved_words = [];
      firestoreUserData.createdAt = admin.firestore.FieldValue.serverTimestamp();
      if(normalizedKakaoPhone && !finalAuthUser.phoneNumber) firestoreUserData.phone = normalizedKakaoPhone; // Redundant if Auth was updated, but safe for Firestore
      else if (finalAuthUser.phoneNumber) firestoreUserData.phone = finalAuthUser.phoneNumber; // Ensure Firestore phone matches Auth if Auth had it
    } else {
      logger.log(`Updating EXISTING Firestore document for OIDC UID: ${oidcUserUid}`);
      const existingData = userDocSnapshot.data();
      if(normalizedKakaoPhone && (!existingData || !existingData.phone) && !finalAuthUser.phoneNumber) {
          firestoreUserData.phone = normalizedKakaoPhone;
      } else if (finalAuthUser.phoneNumber && (!existingData || existingData.phone !== finalAuthUser.phoneNumber)){
          firestoreUserData.phone = finalAuthUser.phoneNumber;
      }
    }
    
    await userDocRef.set(firestoreUserData, { merge: true });
    logger.log(`Successfully created/updated Firestore document for OIDC UID ${oidcUserUid} with kakaoId ${kakaoSub}.`);

    return {
      status: "success",
      uid: oidcUserUid,
      message: "Kakao login processed. User Auth updated (if fields were empty) and Firestore document created/updated with Kakao ID.",
    };
  }
); 