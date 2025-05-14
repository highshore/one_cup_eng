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
import { getFunctions, httpsCallable } from 'firebase/functions';
import LoadingScreen from "../components/loading_screen";

const KAKAO_CLIENT_ID = import.meta.env.VITE_KAKAO_CLIENT_ID;
const KAKAO_CLIENT_SECRET = import.meta.env.VITE_KAKAO_CLIENT_SECRET;
const KAKAO_REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI;

const KakaoCallback = () => {
  const navigate = useNavigate();
  const functions = getFunctions();
  const resolveKakaoLogin = httpsCallable(functions, 'resolveKakaoLogin');

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

        const provider = new OAuthProvider("oidc.kakao");
        const credential = provider.credential({
          idToken: kakaoIdToken,
        });

        await setPersistence(auth, browserSessionPersistence);
        const userCredential = await signInWithCredential(auth, credential);
        console.log("Successfully signed in with Kakao OIDC. UID:", userCredential.user.uid);

        console.log("Calling resolveKakaoLogin function with Kakao Access Token...");
        const result = await resolveKakaoLogin({ kakaoAccessToken });
        const functionData = result.data as any;

        console.log("resolveKakaoLogin function response:", functionData);

        if (functionData.status === "account_exists_by_phone") {
          console.log("Account exists by phone. Current UID:", userCredential.user.uid, "Existing UID to switch to:", functionData.existingUserUid);
          await signOut(auth);
          console.log("Signed out current Kakao OIDC user.");
          await signInWithCustomToken(auth, functionData.customToken);
          console.log("Signed in with custom token for existing user:", functionData.existingUserUid);
          navigate("/profile");
        } else if (functionData.status === "success") {
          console.log("resolveKakaoLogin successful for UID:", functionData.uid);
          navigate("/profile");
        } else {
          console.error("resolveKakaoLogin returned an unexpected status:", functionData);
          navigate("/auth");
        }

      } catch (err: any) {
        console.error("Error during Kakao login process:", err);
        if (err.details) {
            console.error("Function error details:", err.details);
        }
        navigate("/auth");
      }
    };

    processLogin(code);
  }, [navigate, resolveKakaoLogin]);

  return (
    <LoadingScreen />
  );
};

export default KakaoCallback;