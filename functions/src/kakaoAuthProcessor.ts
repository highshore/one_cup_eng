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
}

export const resolveKakaoLogin = onCall(async (request: CallableRequest<KakaoLoginRequestData>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const { kakaoAccessToken } = request.data;
  if (!kakaoAccessToken || typeof kakaoAccessToken !== 'string') {
    throw new HttpsError("invalid-argument", "Missing 'kakaoAccessToken' string.");
  }

  const currentFirebaseUserUid = request.auth.uid;
  let kakaoUserInfo: any;
  try {
    const response = await axios.get("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${kakaoAccessToken}` },
      params: { property_keys: JSON.stringify(["kakao_account.phone_number", "kakao_account.profile", "kakao_account.email"]) },
    });
    kakaoUserInfo = response.data;
    logger.log("Kakao raw user info for UID", currentFirebaseUserUid, JSON.stringify(kakaoUserInfo));
  } catch (error: any) {
    logger.error("Error fetching Kakao user info for UID", currentFirebaseUserUid, error.response?.data || error.message);
    throw new HttpsError("internal", `Failed to fetch Kakao user info for ${currentFirebaseUserUid}.`);
  }

  const kakaoPhoneNumberRaw = kakaoUserInfo.kakao_account?.phone_number;
  const kakaoEmail = kakaoUserInfo.kakao_account?.email;
  let kakaoProfileImageUrl = kakaoUserInfo.kakao_account?.profile?.profile_image_url;
  const kakaoProfileNickname = kakaoUserInfo.kakao_account?.profile?.nickname;
  // const kakaoId = kakaoUserInfo.id; // kakaoId would be for Firestore, which we are removing from this path

  logger.log(`Raw data from Kakao for UID ${currentFirebaseUserUid}: phone='${kakaoPhoneNumberRaw}', email='${kakaoEmail}', profile_image='${kakaoProfileImageUrl}', nickname='${kakaoProfileNickname}'`);
  const normalizedKakaoPhone = normalizePhoneNumber(kakaoPhoneNumberRaw);
  logger.log(`Normalized Kakao phone for UID ${currentFirebaseUserUid}: '${normalizedKakaoPhone}' (Raw was: '${kakaoPhoneNumberRaw}')`);

  const authUpdatePayload: admin.auth.UpdateRequest = {};
  if (kakaoProfileNickname) authUpdatePayload.displayName = kakaoProfileNickname;
  if (kakaoEmail) authUpdatePayload.email = kakaoEmail;
  if (kakaoProfileImageUrl) {
    if (kakaoProfileImageUrl.startsWith("http://")) {
      kakaoProfileImageUrl = kakaoProfileImageUrl.replace("http://", "https://");
      logger.log(`Changed photoURL to HTTPS for UID ${currentFirebaseUserUid}: ${kakaoProfileImageUrl}`);
    }
    authUpdatePayload.photoURL = kakaoProfileImageUrl;
  }

  if (normalizedKakaoPhone) {
    try {
      logger.log(`Attempting to find user by phone: '${normalizedKakaoPhone}' for UID ${currentFirebaseUserUid}`);
      const existingUserByPhone = await admin.auth().getUserByPhoneNumber(normalizedKakaoPhone);
      logger.log(`Found existing user by phone. UID: ${existingUserByPhone.uid}, Phone: ${existingUserByPhone.phoneNumber}`);
      
      if (existingUserByPhone.uid !== currentFirebaseUserUid) {
        logger.log(`UIDs differ: Kakao-login UID ${currentFirebaseUserUid} vs. Phone-matched UID ${existingUserByPhone.uid}. Switching accounts.`);
        await admin.auth().deleteUser(currentFirebaseUserUid);
        logger.log(`Deleted temporary Firebase user ${currentFirebaseUserUid}.`);
        
        // Optional: Update existing user's *Firestore* doc with Kakao ID or lastLoginAt. 
        // This is if you want to mark the existing Firestore user as having linked Kakao.
        const existingUserDocRef = admin.firestore().collection("users").doc(existingUserByPhone.uid);
        await existingUserDocRef.set({ kakaoId: kakaoUserInfo.id, lastLoginAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        logger.log(`Updated existing user ${existingUserByPhone.uid} Firestore doc with Kakao details.`);

        const customTokenForExistingUser = await admin.auth().createCustomToken(existingUserByPhone.uid);
        return {
          status: "account_exists_by_phone",
          existingUserUid: existingUserByPhone.uid,
          customToken: customTokenForExistingUser,
        };
      } else {
        logger.log(`UIDs match: Kakao-login UID ${currentFirebaseUserUid} is the same as Phone-matched UID ${existingUserByPhone.uid}. Updating this user's Auth phone.`);
        authUpdatePayload.phoneNumber = normalizedKakaoPhone;
      }
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        logger.log(`No Firebase user found with phone '${normalizedKakaoPhone}'. Will add phone to current Auth user ${currentFirebaseUserUid}.`);
        authUpdatePayload.phoneNumber = normalizedKakaoPhone;
      } else {
        logger.error(`Error in getUserByPhoneNumber for phone '${normalizedKakaoPhone}', UID ${currentFirebaseUserUid}:`, error);
      }
    }
  }

  if (Object.keys(authUpdatePayload).length > 0) {
    try {
      await admin.auth().updateUser(currentFirebaseUserUid, authUpdatePayload);
      logger.log(`Successfully updated Firebase Auth for ${currentFirebaseUserUid} with payload:`, JSON.stringify(authUpdatePayload));
    } catch (authError: any) {
      logger.error(`Error updating Firebase Auth for ${currentFirebaseUserUid}:`, authError, "Payload:", JSON.stringify(authUpdatePayload));
      // If Auth update fails, you might reconsider if the function should return an error
      // For now, it proceeds and returns success, as Firestore part is removed.
    }
  }

  // Firestore document creation/update is REMOVED from this main success path.
  // If you need to update an existing user's Firestore document (e.g., lastLoginAt for an existing user,
  // or kakaoId for a user who successfully logs in via Kakao), that logic would need to be added here
  // or handled by the client/another function after this one returns successfully.
  logger.log(`resolveKakaoLogin for UID ${currentFirebaseUserUid} completed. Auth updated (if changes were needed). No automatic Firestore document write in this path.`);

  return {
    status: "success",
    uid: currentFirebaseUserUid,
    message: "Kakao login processed for Firebase Auth. Firestore not automatically modified.",
  };
}); 