import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import styled from "styled-components";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// Using direct Firebase Authentication for phone number authentication
// (FirebaseUI is not compatible with Firebase v11.5.0)
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";

// Add RecaptchaVerifier to the global Window interface
declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}

// Define colors to match with auth_components.tsx
const colors = {
  primary: "#2C1810",
  primaryLight: "#4A2F23",
  primaryDark: "#1A0F0A",
  primaryPale: "#F5EBE6",
  primaryBg: "#FDF9F6",
  accent: "#C8A27A",
  text: {
    dark: "#2C1810",
    medium: "#4A2F23",
    light: "#8B6B4F",
  },
};

const AuthContainer = styled.div`
  max-width: 550px;
  margin: 0 auto;
  padding: 3rem 2rem;
`;

const Header = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 1.8rem;
  text-align: center;
  color: ${colors.text.dark};
`;

const Description = styled.p`
  margin-bottom: 2rem;
  text-align: center;
  color: ${colors.text.light};
  font-size: 1.1rem;
  line-height: 1.5;
`;

const FormContainer = styled.div`
  margin-top: 2.5rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 1rem 1.2rem;
  margin-bottom: 1.2rem;
  border: 1px solid ${colors.primaryPale};
  border-radius: 50px;
  font-size: 1.1rem;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
    box-shadow: 0 0 0 2px rgba(200, 162, 122, 0.2);
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 1rem;
  background-color: ${colors.primary};
  color: white;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  font-weight: 700;
  font-size: 1.1rem;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${colors.primaryLight};
    transform: translateY(-2px);
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    transform: none;
  }
`;

const Message = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  font-size: 1.1rem;
`;

const ErrorMessage = styled(Message)`
  background-color: #fdeded;
  color: #5f2120;
`;

const SuccessMessage = styled(Message)`
  background-color: #edf7ed;
  color: #1e4620;
`;

const HelpText = styled.p`
  font-size: 1rem;
  color: ${colors.text.light};
  margin-top: -0.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const ValidationMessage = styled.p`
  font-size: 1rem;
  color: #d93025;
  margin-top: -0.5rem;
  margin-bottom: 1.5rem;
`;

export default function Auth() {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationId, setVerificationId] =
    useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isValidPhoneNumber, setIsValidPhoneNumber] = useState(false);

  // Handle phone number input change
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Only allow digits, spaces, and hyphens for better user experience
    const filtered = input.replace(/[^\d\s-]/g, "");
    setPhoneNumber(filtered);

    // Validate on every change
    validatePhoneNumber(filtered);
  };

  // Validate Korean phone number format
  const validatePhoneNumber = (input: string) => {
    // Clean up the input (remove non-digits)
    const cleanNumber = input.replace(/\D/g, "");

    // Allow more flexible validation to avoid frustrating users
    // Allow 10-11 digits Korean mobile numbers
    // Starting with 01X where X is usually 0, 1, 6, 7, 8, or 9
    const minLength = 10; // Minimum length for a valid Korean mobile number

    // Basic check: starts with 01 and has at least 10 digits
    setIsValidPhoneNumber(
      cleanNumber.startsWith("01") && cleanNumber.length >= minLength
    );
  };

  // Format phone number for Firebase (E.164 format)
  const formatPhoneNumberForFirebase = (input: string): string => {
    // Remove any non-digit characters
    let cleaned = input.replace(/\D/g, "");

    // For Korean numbers, we need to ensure proper E.164 format
    // E.164 format is: +[country code][number without leading 0]

    // If the number starts with 0 (Korean mobile typically starts with 010)
    if (cleaned.startsWith("0") && cleaned.length >= 10) {
      return "+82" + cleaned.substring(1);
    }

    // If already in the correct format with +82
    if (cleaned.startsWith("82") && !cleaned.startsWith("+")) {
      return "+" + cleaned;
    }

    // If already has the plus sign
    if (cleaned.startsWith("+")) {
      return cleaned;
    }

    // Default case - just add +82 prefix if it seems to be a Korean number without leading 0
    if (cleaned.length >= 9 && !cleaned.startsWith("0")) {
      return "+82" + cleaned;
    }

    // If all else fails, just format as a Korean number
    return "+82" + (cleaned.startsWith("0") ? cleaned.substring(1) : cleaned);
  };

  useEffect(() => {
    // Check if user is already signed in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // User is already signed in, redirect to home
        navigate("/profile");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const setupInvisibleRecaptcha = () => {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (err) {
        console.error("reCAPTCHA 초기화 오류:", err);
      }
    }

    // Add console warning about domain configuration
    console.warn(
      "IMPORTANT: If using 1cupenglish.com domain, ensure it is added to Firebase Auth Authorized Domains and reCAPTCHA settings in Google Cloud Console"
    );

    try {
      console.log("보이지 않는 reCAPTCHA 설정 중");
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "send-code-button",
        {
          size: "invisible",
          callback: () => {
            console.log("reCAPTCHA 인증 성공");
            // The callback is just for notification - sendVerificationCode is called directly
          },
          // Set language to Korean
          hl: "ko",
        }
      );
    } catch (err) {
      console.error("reCAPTCHA 설정 실패:", err);
      setError(
        "전화번호 인증 설정에 실패했습니다. 새로고침 후 다시 시도해주세요."
      );
    }
  };

  const onSignInSubmit = () => {
    if (!isValidPhoneNumber || loading) return;

    if (!window.recaptchaVerifier) {
      setupInvisibleRecaptcha();
    }

    // For invisible reCAPTCHA, we should directly call sendVerificationCode
    // The reCAPTCHA will be solved automatically during the phone auth process
    sendVerificationCode();
  };

  const sendVerificationCode = async () => {
    setLoading(true);
    setError(null);

    try {
      // Format the phone number for Firebase
      const formattedPhoneNumber = formatPhoneNumberForFirebase(phoneNumber);

      console.log("원본 전화번호:", phoneNumber);
      console.log("포맷된 전화번호:", formattedPhoneNumber);

      // Send verification code directly with signInWithPhoneNumber
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhoneNumber,
        window.recaptchaVerifier
      );

      console.log("인증번호 전송 성공");
      setVerificationId(confirmationResult);
      setMessage("인증번호가 전송되었습니다!");
    } catch (err) {
      console.error("인증번호 전송 오류:", err);
      const errorMessage =
        err instanceof Error ? err.message : "인증번호 전송에 실패했습니다";
      setError(errorMessage);

      // Reset the reCAPTCHA on error
      console.log("오류 후 reCAPTCHA 초기화");
      try {
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
        }
        setupInvisibleRecaptcha();
      } catch (clearErr) {
        console.error("reCAPTCHA 초기화 오류:", clearErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationId) return;

    setLoading(true);
    setError(null);

    try {
      // Confirm the verification code
      const userCredential = await verificationId.confirm(verificationCode);

      // Check if this is a new user or existing user
      const userDoc = await getDoc(doc(db, `users/${userCredential.user.uid}`));

      if (!userDoc.exists()) {
        // Create a date for Jan 1, 1000 AD
        const ancientDate = new Date(1000, 0, 1); // Month is 0-based, so 0 = January

        // This is a new user, create their document
        await setDoc(doc(db, `users/${userCredential.user.uid}`), {
          cat_business: false,
          cat_tech: false,
          last_received: ancientDate,
          left_count: 0, // Default number of articles available
          received_articles: [],
          saved_words: [],
          createdAt: serverTimestamp(),
        });
        console.log("새 사용자 문서 생성:", userCredential.user.uid);
      }

      // User is now signed in
      setMessage("로그인 성공!");

      // Redirect to home page
      setTimeout(() => {
        navigate("/profile");
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "인증코드 확인에 실패했습니다"
      );
      console.error("인증코드 확인 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Setup reCAPTCHA when component mounts
    try {
      setupInvisibleRecaptcha();
    } catch (err) {
      console.error("reCAPTCHA 설정 오류:", err);
      setError("전화번호 인증 설정에 실패했습니다. 다시 시도해주세요.");
    }

    return () => {
      // Clean up reCAPTCHA when component unmounts
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (err) {
          console.error("reCAPTCHA 초기화 오류:", err);
        }
      }
    };
  }, []);

  return (
    <AuthContainer>
      <Header>휴대폰으로 로그인</Header>
      <Description>인증코드를 받으실 휴대폰 번호를 입력해주세요.</Description>

      <FormContainer>
        {!verificationId ? (
          <>
            <Input
              type="tel"
              placeholder="휴대폰 번호 (예: 01012345678)"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              disabled={loading}
            />
            {phoneNumber && !isValidPhoneNumber ? (
              <ValidationMessage>
                올바른 휴대폰 번호를 입력해주세요 (예: 01012345678)
              </ValidationMessage>
            ) : (
              <HelpText>공백이나 대시(-) 없이 번호만 입력해주세요.</HelpText>
            )}
            <Button
              id="send-code-button"
              onClick={onSignInSubmit}
              disabled={!isValidPhoneNumber || loading}
            >
              {loading ? "전송 중..." : "인증번호 전송"}
            </Button>
          </>
        ) : (
          <>
            <Input
              type="text"
              placeholder="인증번호 입력"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              disabled={loading}
            />
            <Button
              onClick={verifyCode}
              disabled={!verificationCode || loading}
            >
              {loading ? "확인 중..." : "인증번호 확인"}
            </Button>
          </>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {message && <SuccessMessage>{message}</SuccessMessage>}
      </FormContainer>
    </AuthContainer>
  );
}
