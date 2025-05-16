import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  OAuthProvider,
  signInWithCredential,
  setPersistence,
  browserSessionPersistence,
  signOut,
  signInWithCustomToken,
} from "firebase/auth";
import { auth } from "../firebase";
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import LoadingScreen from "../components/loading_screen";

const KAKAO_CLIENT_ID = import.meta.env.VITE_KAKAO_CLIENT_ID;
const KAKAO_CLIENT_SECRET = import.meta.env.VITE_KAKAO_CLIENT_SECRET;
const KAKAO_REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI;

// Define expected response types for the consolidated callable function
interface ProcessKakaoUserRequestData {
  kakaoAccessToken: string;
  kakaoSub: string;
  oidcUserUid: string; // UID from the initial OIDC sign-in
}

interface ProcessKakaoUserResponse {
  status: "merged_by_phone" | "merged_by_kakao_id" | "success_oidc_user" | string; // Allow other strings for robustness
  customToken?: string; // If status is one of the "merged_*"
  finalUid?: string; // The UID the client should consider active
  message?: string;
}

const KakaoCallback = () => {
  const navigate = useNavigate();
  const functions = getFunctions(auth.app, "asia-northeast3");
  // Define the consolidated callable function
  const processKakaoUser = httpsCallable<ProcessKakaoUserRequestData, ProcessKakaoUserResponse>(functions, 'processKakaoUser');

  useEffect(() => {
    const code = new URL(document.location.toString()).searchParams.get("code");

    if (!code) {
      console.error("Kakao callback: No authorization code found.");
      navigate("/");
      return;
    }

    const processLogin = async (authCode: string) => {
      try {
        const tokenResponse = await fetch(
          "https://kauth.kakao.com/oauth/token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              client_id: KAKAO_CLIENT_ID,
              redirect_uri: KAKAO_REDIRECT_URI,
              code: authCode,
              client_secret: KAKAO_CLIENT_SECRET,
            }),
          }
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.id_token || !tokenData.access_token) {
          console.error("Kakao callback: Failed to get tokens from Kakao.", tokenData);
          navigate("/");
          return;
        }

        const kakaoIdToken = tokenData.id_token;
        const kakaoAccessToken = tokenData.access_token;
        let kakaoSub = "";

        try {
          const payloadBase64Url = kakaoIdToken.split('.')[1];
          const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(payloadBase64)
              .split('')
              .map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              })
              .join('')
          );
          const decodedIdToken = JSON.parse(jsonPayload);
          if (decodedIdToken && typeof decodedIdToken.sub === 'string') {
            kakaoSub = decodedIdToken.sub;
            console.log("Decoded Kakao Sub (User ID):", kakaoSub);
          } else {
            throw new Error("Kakao sub not found in ID token");
          }
        } catch (e) {
          console.error("Error decoding Kakao ID token or getting sub:", e);
          navigate("/auth"); // Critical error, redirect to auth
          return;
        }

        // OIDC Sign-in first
        const provider = new OAuthProvider("oidc.kakao");
        const credential = provider.credential({
          idToken: kakaoIdToken,
        });

        await setPersistence(auth, browserSessionPersistence);
        const oidcUserCredential = await signInWithCredential(auth, credential);
        const oidcUser = oidcUserCredential.user;
        console.log("Temporarily signed in with Kakao OIDC. UID:", oidcUser.uid);

        console.log("Calling processKakaoUser function with Kakao Access Token, Sub, and OIDC UID...");
        
        const processResult: HttpsCallableResult<ProcessKakaoUserResponse> = await processKakaoUser({ 
          kakaoAccessToken, 
          kakaoSub,
          oidcUserUid: oidcUser.uid 
        });
        const functionData = processResult.data;

        console.log("processKakaoUser function response:", functionData);

        if ((functionData.status === "merged_by_phone" || functionData.status === "merged_by_kakao_id") && functionData.customToken && functionData.finalUid) {
          console.log(`Account merged (status: ${functionData.status}). Current OIDC UID: ${oidcUser.uid}, Final UID to switch to: ${functionData.finalUid}`);
          if (oidcUser.uid !== functionData.finalUid) { // Check if a switch is actually needed
          await signOut(auth);
            console.log("Signed out temporary Kakao OIDC user.");
            await signInWithCustomToken(auth, functionData.customToken);
            console.log("Signed in with custom token for merged user:", functionData.finalUid);
          } else {
            // This case implies the OIDC user was the one kept, but a custom token was still issued (e.g. to refresh claims).
            // Or, it implies that the merge target was the OIDC user itself (which shouldn't happen if logic is to delete OIDC user on merge to *another* account)
            // For safety, if custom token is present, we use it. If OIDC user is already the final UID, signInWithCustomToken might be redundant
            // but harmless if claims need update.
            // Consider if the server should avoid sending a custom token if finalUid === oidcUserUid and no specific claim change is needed.
            console.log("OIDC user UID is the same as final UID. Re-signing with custom token (if provided) to ensure claims or if merge logic resulted in this.");
            await signOut(auth).catch(e => console.warn("Sign out failed before custom token re-sign (same user), might be okay:", e)); // Attempt sign out just in case
          await signInWithCustomToken(auth, functionData.customToken);
          }
          navigate("/profile");
        } else if (functionData.status === "success_oidc_user" && functionData.finalUid === oidcUser.uid) {
          // This case means the OIDC user was processed (new or existing OIDC user updated)
          console.log("processKakaoUser successful for OIDC user (Kakao linked & Firestore doc created/updated). UID:", functionData.finalUid);
          navigate("/profile");
        } else {
          console.error("processKakaoUser returned an unexpected status or missing data:", functionData);
          // Attempt to sign out the OIDC user before redirecting to auth
          if (auth.currentUser) { // Check if a user is signed in before attempting to sign out
            await signOut(auth).catch(err => console.warn("Sign out after failed processKakaoUser failed:", err));
          }
          navigate("/auth");
        }

      } catch (err: any) {
        console.error("Error during Kakao login process:", err);
        // Removed specific check for findUserByKakaoId as it's no longer used
        if (err.details) {
            console.error("Function error details:", err.details);
        }
        // Attempt to sign out any partial session
        if (auth.currentUser) { // Check if a user is signed in before attempting to sign out
            await signOut(auth).catch(signOutError => console.warn("Sign out during error handling failed:", signOutError));
        }
        navigate("/auth");
      }
    };

    processLogin(code);
  }, [navigate, processKakaoUser]); // Updated dependency array

  return (
    <LoadingScreen />
  );
};

export default KakaoCallback;