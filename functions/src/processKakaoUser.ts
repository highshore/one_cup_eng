import * as admin from "firebase-admin";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import axios from "axios";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Helper to normalize phone numbers to E.164 format
const normalizePhoneNumber = (phoneNumber: string | undefined | null): string | null => {
  if (!phoneNumber) return null;
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
  logger.log("normalizePhoneNumber - input:", phoneNumber, "output:", result);
  return result;
};

interface ProcessKakaoUserRequestData {
  kakaoAccessToken: string;
  kakaoSub: string;
  oidcUserUid: string;
}

export const processKakaoUser = onCall<ProcessKakaoUserRequestData>(
  { region: "asia-northeast3", timeoutSeconds: 60, memory: "256MiB" },
  async (request: CallableRequest<ProcessKakaoUserRequestData>) => {
    if (!request.auth || request.auth.uid !== request.data.oidcUserUid) {
      throw new HttpsError("unauthenticated", "The function must be called by the authenticated OIDC user.");
    }

    const { kakaoAccessToken, kakaoSub, oidcUserUid } = request.data;

    if (!kakaoAccessToken || typeof kakaoAccessToken !== 'string') {
      throw new HttpsError("invalid-argument", "Missing or invalid 'kakaoAccessToken' string.");
    }
    if (!kakaoSub || typeof kakaoSub !== 'string') {
      throw new HttpsError("invalid-argument", "Missing or invalid 'kakaoSub' string.");
    }
    if (!oidcUserUid || typeof oidcUserUid !== 'string') {
      throw new HttpsError("invalid-argument", "Missing or invalid 'oidcUserUid' string.");
    }

    logger.log(`processKakaoUser: Started for OIDC UID: ${oidcUserUid}, Kakao Sub: ${kakaoSub}`);

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

    // Priority 1: Check for existing Firebase Account by Phone Number from Kakao
    if (normalizedKakaoPhone) {
      try {
        const existingUserByPhone = await admin.auth().getUserByPhoneNumber(normalizedKakaoPhone);
        logger.log(`Found existing Firebase Auth user by phone. Matched UID: ${existingUserByPhone.uid}, Phone: ${existingUserByPhone.phoneNumber}`);

        if (existingUserByPhone.uid !== oidcUserUid) {
          logger.log(`Phone-matched UID ${existingUserByPhone.uid} differs from OIDC UID ${oidcUserUid}. Merging Kakao into phone account.`);
          
          // Delete the temporary OIDC user
          await admin.auth().deleteUser(oidcUserUid).catch(err => logger.error(`Failed to delete OIDC user ${oidcUserUid} during phone merge:`, err));
          logger.log(`Deleted temporary Firebase OIDC user ${oidcUserUid}.`);
          
          const updatePayloadForPhoneUser: admin.auth.UpdateRequest = {};
          if (kakaoProfileNickname && !existingUserByPhone.displayName) updatePayloadForPhoneUser.displayName = kakaoProfileNickname;
          if (kakaoEmail && !existingUserByPhone.email) updatePayloadForPhoneUser.email = kakaoEmail; // Consider email verification implications
          if (kakaoProfileImageUrl && !existingUserByPhone.photoURL) updatePayloadForPhoneUser.photoURL = kakaoProfileImageUrl;

          if (Object.keys(updatePayloadForPhoneUser).length > 0) {
            await admin.auth().updateUser(existingUserByPhone.uid, updatePayloadForPhoneUser);
            logger.log(`Updated Auth for phone-matched user ${existingUserByPhone.uid} with Kakao details (only if empty):`, JSON.stringify(updatePayloadForPhoneUser));
          }

          const existingUserDocRef = admin.firestore().collection("users").doc(existingUserByPhone.uid);
          await existingUserDocRef.set({ kakaoId: kakaoSub, lastLoginAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
          logger.log(`Updated Firestore for phone-matched user ${existingUserByPhone.uid} with kakaoId: ${kakaoSub}.`);

          const customToken = await admin.auth().createCustomToken(existingUserByPhone.uid);
          return {
            status: "merged_by_phone",
            customToken: customToken,
            finalUid: existingUserByPhone.uid,
            message: "Account merged: Kakao identity linked to existing phone-verified user.",
          };
        }
        // If existingUserByPhone.uid IS oidcUserUid, it means OIDC user already has this phone. No merge needed here; proceed to P3 logic for updates.
        logger.log(`Phone number ${normalizedKakaoPhone} is already associated with OIDC user ${oidcUserUid}. No merge needed based on phone.`);

      } catch (error: any) {
        if (error.code === "auth/user-not-found") {
          logger.log(`No Firebase user found with phone '${normalizedKakaoPhone}'. Proceeding to check by kakaoSub.`);
        } else {
          logger.error(`Error in getUserByPhoneNumber for phone '${normalizedKakaoPhone}', OIDC UID ${oidcUserUid}:`, error);
          // Don't throw here, allow to proceed to kakaoSub check
        }
      }
    }

    // Priority 2: Check for Existing Definitive Link by kakaoSub in Firestore
    // This runs if no phone merge happened (or Kakao didn't provide phone).
    const usersRef = admin.firestore().collection("users");
    const querySnapshot = await usersRef.where("kakaoId", "==", kakaoSub).limit(1).get();

    if (!querySnapshot.empty) {
      const existingUserDoc = querySnapshot.docs[0];
      const firestoreUserUid = existingUserDoc.id;
      logger.log(`Found existing Firestore user by kakaoId ${kakaoSub}. Matched UID: ${firestoreUserUid}`);

      if (firestoreUserUid !== oidcUserUid) {
        logger.log(`Firestore-matched UID ${firestoreUserUid} differs from OIDC UID ${oidcUserUid}. Merging Kakao into Firestore account.`);
        
        await admin.auth().deleteUser(oidcUserUid).catch(err => logger.error(`Failed to delete OIDC user ${oidcUserUid} during kakaoId merge:`, err));
        logger.log(`Deleted temporary Firebase OIDC user ${oidcUserUid}.`);

        // Optionally update Auth of firestoreUserUid with Kakao data if empty
        const firestoreAuthUser = await admin.auth().getUser(firestoreUserUid);
        const updatePayloadForFirestoreUser: admin.auth.UpdateRequest = {};
        if (kakaoProfileNickname && !firestoreAuthUser.displayName) updatePayloadForFirestoreUser.displayName = kakaoProfileNickname;
        if (kakaoEmail && !firestoreAuthUser.email) updatePayloadForFirestoreUser.email = kakaoEmail;
        if (kakaoProfileImageUrl && !firestoreAuthUser.photoURL) updatePayloadForFirestoreUser.photoURL = kakaoProfileImageUrl;
        if (normalizedKakaoPhone && !firestoreAuthUser.phoneNumber) updatePayloadForFirestoreUser.phoneNumber = normalizedKakaoPhone;
        
        if (Object.keys(updatePayloadForFirestoreUser).length > 0) {
          await admin.auth().updateUser(firestoreUserUid, updatePayloadForFirestoreUser);
          logger.log(`Updated Auth for Firestore-matched user ${firestoreUserUid} with Kakao details (only if empty/new):`, JSON.stringify(updatePayloadForFirestoreUser));
        }
        
        // Ensure Firestore doc has lastLoginAt updated
        await existingUserDoc.ref.set({ lastLoginAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        logger.log(`Updated Firestore lastLoginAt for ${firestoreUserUid}.`);

        const customToken = await admin.auth().createCustomToken(firestoreUserUid);
        return {
          status: "merged_by_kakao_id",
          customToken: customToken,
          finalUid: firestoreUserUid,
          message: "Account merged: Kakao identity linked to existing user found by kakaoId.",
        };
      }
      // If firestoreUserUid IS oidcUserUid, it means OIDC user already linked via kakaoId. Proceed to P3 for updates.
      logger.log(`kakaoId ${kakaoSub} is already associated with OIDC user ${oidcUserUid}. No merge needed based on kakaoId.`);
    }

    // Priority 3: Process as New Kakao Link or Update Existing OIDC User
    // This means no merge occurred. The oidcUserUid is the one to use.
    logger.log(`Proceeding to finalize Auth and Firestore for OIDC UID: ${oidcUserUid} with Kakao Sub: ${kakaoSub}`);
    const finalAuthUser = await admin.auth().getUser(oidcUserUid); // Get current auth state
    const authUpdatePayload: admin.auth.UpdateRequest = {};

    if (kakaoProfileNickname && !finalAuthUser.displayName) authUpdatePayload.displayName = kakaoProfileNickname;
    if (kakaoEmail && !finalAuthUser.email) authUpdatePayload.email = kakaoEmail; // Consider email verification needs
    if (kakaoProfileImageUrl && !finalAuthUser.photoURL) authUpdatePayload.photoURL = kakaoProfileImageUrl;
    if (normalizedKakaoPhone && !finalAuthUser.phoneNumber) {
      authUpdatePayload.phoneNumber = normalizedKakaoPhone; 
      logger.log(`Preparing to add phone ${normalizedKakaoPhone} to Auth user ${oidcUserUid}`);
    }

    if (Object.keys(authUpdatePayload).length > 0) {
      try {
        await admin.auth().updateUser(oidcUserUid, authUpdatePayload);
        logger.log(`Successfully updated Firebase Auth for OIDC UID ${oidcUserUid} (only if empty/new phone):`, JSON.stringify(authUpdatePayload));
      } catch (authError: any) {
        logger.error(`Error updating Firebase Auth for OIDC UID ${oidcUserUid}:`, authError, "Payload:", JSON.stringify(authUpdatePayload));
        // If adding phone number fails (e.g. already in use by another user not caught above, which shouldn't happen if logic is correct),
        // this is a critical issue. However, we proceed to Firestore update for now.
      }
    }
    
    // Re-fetch user after potential update to get the most current state for Firestore
    const updatedFinalAuthUser = await admin.auth().getUser(oidcUserUid);

    const userDocRef = admin.firestore().collection("users").doc(oidcUserUid);
    const userDocSnapshot = await userDocRef.get();
    const ancientDate = new Date(1000, 0, 1); 

    const firestoreUserData: any = {
      kakaoId: kakaoSub,
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      displayName: updatedFinalAuthUser.displayName || kakaoProfileNickname || null,
      email: updatedFinalAuthUser.email || kakaoEmail || null,
      photoURL: updatedFinalAuthUser.photoURL || kakaoProfileImageUrl || null,
      phone: updatedFinalAuthUser.phoneNumber || null, // Reflect Auth phone number
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
    } else {
      logger.log(`Updating EXISTING Firestore document for OIDC UID: ${oidcUserUid}`);
      // Ensure phone field in Firestore is consistent with Auth, if it changed.
      const existingData = userDocSnapshot.data();
      if (updatedFinalAuthUser.phoneNumber && (!existingData || existingData.phone !== updatedFinalAuthUser.phoneNumber)){
          firestoreUserData.phone = updatedFinalAuthUser.phoneNumber;
      } else if (!updatedFinalAuthUser.phoneNumber && existingData && existingData.phone) {
          firestoreUserData.phone = null; // Phone removed from Auth, remove from Firestore
      }
    }
    
    await userDocRef.set(firestoreUserData, { merge: true });
    logger.log(`Successfully created/updated Firestore document for OIDC UID ${oidcUserUid}.`);

    return {
      status: "success_oidc_user",
      finalUid: oidcUserUid,
      message: "Kakao login processed. User Auth/Firestore updated for OIDC user.",
    };
  }
); 