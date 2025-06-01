import { useState, useEffect, ReactNode } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { auth, db } from "../../../firebase";
import styled from "styled-components";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import kakaoBtnImg from "../../../shared/assets/kakao_btn.png"; // Import the image
import logoImage from "../../../shared/assets/1cup_logo_new.svg"; // Added from auth_components
import Footer from "../../../shared/components/footer"; // Added from auth_components - assuming path

console.log("Vite env variables:", import.meta.env); // Temporary log

// Using direct Firebase Authentication for phone number authentication
// (FirebaseUI is not compatible with Firebase v11.5.0)
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";

// Kakao Auth URL constants - Will be used to construct KAKAO_AUTH_URL
const KAKAO_CLIENT_ID = import.meta.env.VITE_KAKAO_CLIENT_ID;
const KAKAO_REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI;
// Removed scope parameter to rely on Kakao app's default consent items
const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${KAKAO_REDIRECT_URI}&response_type=code`;

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

// Original AuthContainer from auth.tsx - will be removed as AuthLayout's ContentContainer will be used.
// const AuthContainer = styled.div`
//   max-width: 550px;
//   margin: 0 auto;
//   padding: 3rem 2rem;
// `;

// --- START: Components migrated from auth_components.tsx ---

// Layout Components
export const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  background-color: ${colors.primaryBg};
`;

export const ContentContainer = styled.div`
  width: 100%; /* Take full width within PageWrapper */
  max-width: 550px; /* Max width from original AuthContainer */
  margin: -135px 0 0 0;
  padding: 50px 2rem; /* Adjusted vertical padding from 50px to 30px */
  min-height: calc(
    100vh
  ); /* Adjusted for Header height (70px) + Footer height (60px) */
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

export const Header = styled.header`
  /* This is the Layout Header */
  /* Original fixed positioning - removed for scrolling */
  /* position: fixed; */
  /* top: 0; */
  /* left: 0; */
  /* z-index: 100; */

  padding: 20px; /* Re-add padding for spacing from viewport edges */

  display: flex;
  align-items: center;
  width: 100%; /* Ensures the header takes up the available width within PageWrapper */
`;

export const Logo = styled.img`
  height: 28px;
  width: auto; /* Adjust width to auto to maintain aspect ratio */
  margin-left: 8px;
`;

// Form Components
export const FormWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 20px 0;
`;

export const Title = styled.h1`
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 30px;
  text-align: center;
  color: ${colors.text.dark};
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  margin-bottom: 20px;
  box-sizing: border-box;
  min-height: 150px;
`;

export const InputWrapper = styled.div`
  position: relative;
  width: 100%;
  margin-bottom: 10px;
  box-sizing: border-box;
  min-height: 60px;
`;

export const InputField = styled.input`
  width: 100%;
  padding: 15px;
  border-radius: 50px;
  border: 1.5px solid ${colors.primaryPale};
  font-size: 16px;
  outline: none;
  background-color: white;
  transition: border-color 0.3s;
  box-sizing: border-box;
  height: 54px;
  margin: 0;
  position: relative;
  z-index: 1;

  &:focus {
    border-color: ${colors.primary};
  }

  &:focus + label {
    color: ${colors.primary};
  }

  &:not(:focus):not(:placeholder-shown) + label {
    transform: translateY(-24px) scale(0.8);
    color: ${colors.text.light};
    background-color: white;
    padding: 0 5px;
  }

  &:focus + label,
  &:not(:placeholder-shown) + label {
    transform: translateY(-24px) scale(0.8);
    background-color: white;
    padding: 0 5px;
  }

  &::placeholder {
    color: transparent;
  }

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus {
    -webkit-text-fill-color: inherit;
    -webkit-box-shadow: 0 0 0px 1000px white inset;
    transition: background-color 5000s ease-in-out 0s;
    background-clip: content-box !important;
  }
`;

export const InputLabel = styled.label`
  position: absolute;
  left: 24px;
  top: 16px;
  color: ${colors.text.light};
  font-size: 16px;
  pointer-events: none;
  transition: 0.3s ease all;
  transform-origin: left top;
  z-index: 1;
`;

export const SubmitButton = styled.input`
  padding: 15px;
  border-radius: 50px;
  border: none;
  background-color: ${colors.primary};
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  height: 54px;
  width: 100%;
  display: block;
  box-sizing: border-box;
  transition: background-color 0.3s;
  position: relative;
  outline: none;

  &:hover {
    background-color: ${colors.primaryLight};
  }

  &:active {
    transform: translateY(1px);
    transition: transform 0.1s;
  }

  &:focus {
    outline: none;
  }

  &:disabled {
    background-color: #b0b0b0;
    cursor: not-allowed;
  }
`;

// Utility Components
export const RecaptchaContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1rem 0;
`;

export const SwitcherLink = styled.a`
  display: block;
  text-align: center;
  margin-top: 1rem;
  color: ${colors.text.dark};
  text-decoration: none;
  font-size: 0.875rem;

  &:hover {
    text-decoration: underline;
  }
`;

export const Error = styled.p`
  color: #d93025;
  margin-bottom: 12px;
  text-align: center;
  font-size: 14px;
`;

export const Link = styled(RouterLink)`
  text-decoration: none;
  color: ${colors.text.dark};
  font-size: 14px;
  margin: 4px 0px;
  text-align: center;
  &:hover {
    text-decoration: underline;
  }
`;

export const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 25px 0;
  width: 100%;

  &::before,
  &::after {
    content: "";
    flex: 1;
    border-bottom: 1px solid #ddd;
  }

  span {
    padding: 0 15px;
    color: #666;
    font-size: 14px;
  }
`;

export const FooterWrapper = styled.div`
  width: 100%;
  padding: 15px 0;
  text-align: center;
  font-size: 14px;
  color: ${colors.text.medium};
  background-color: ${colors.primaryBg};
  margin-top: 50px;
`;

// Layout Component
interface AuthLayoutProps {
  children: ReactNode;
}

function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <PageWrapper>
      <Header>
        {" "}
        {/* Moved Header outside ContentContainer, directly under PageWrapper */}
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          <Logo src={logoImage} alt="1 Cup English Logo" />
        </Link>
      </Header>
      <ContentContainer>{children}</ContentContainer>
      <FooterWrapper>
        <Footer />
      </FooterWrapper>
    </PageWrapper>
  );
}

// --- END: Components migrated from auth_components.tsx ---

// --- START: Original styled components from auth.tsx that are still in use ---
const AuthPageHeading = styled.h1`
  /* Renamed from Header in original auth.tsx */
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 1.8rem;
  width: 100%;
  text-align: center;
  color: ${colors.text.dark};
`;

const Description = styled.p`
  margin-bottom: 2rem;
  text-align: center;
  color: ${colors.text.light};
  width: 100%;
  font-size: 1.1rem;
  line-height: 1.5;
`;

const FormContainer = styled.div`
  /* Specific to phone auth part */
  margin-top: 2.5rem;
  width: 100%;
`;

const Input = styled.input`
  /* Specific to phone auth part */
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
  /* Specific to phone auth part */
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
  /* Base for Success/Error messages in phone auth */
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  font-size: 1.1rem;
`;

const ErrorMessage = styled(Message)`
  /* Specific to phone auth part */
  background-color: #fdeded;
  color: #5f2120;
`;

const SuccessMessage = styled(Message)`
  /* Specific to phone auth part */
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

// Styled Components for Choice Buttons (from original auth.tsx)
const ChoiceButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 1rem;
`;

const ChoiceButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 1rem 3rem;
  border: 1px solid ${colors.primaryPale};
  border-radius: 12px; // Slightly more rounded
  cursor: pointer;
  font-weight: 700;
  font-size: 1.05rem; // Slightly smaller than main button
  transition: all 0.2s ease;
  gap: 0.8rem; // Space between icon and text

  img,
  svg {
    width: 24px; // Control icon size
    height: 24px; // Control icon size
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const PhoneButton = styled(ChoiceButton)`
  background-color: white;
  color: ${colors.text.dark};

  &:hover {
    border-color: ${colors.accent};
  }
`;

const KakaoButton = styled(ChoiceButton)`
  background-color: #fee500; // Kakao yellow
  color: #3c1e1e; // Kakao text color (approximate)
  border-color: #fee500;

  &:hover {
    background-color: #fdd800; // Slightly darker yellow on hover
    border-color: #fdd800;
  }
`;

export default function Auth() {
  const navigate = useNavigate();
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationId, setVerificationId] =
    useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isValidPhoneNumber, setIsValidPhoneNumber] = useState(false);

  // Handle Kakao Login Click
  const handleKakaoLoginClick = () => {
    window.location.href = KAKAO_AUTH_URL;
  };

  const handlePhoneAuthClick = () => {
    setErrorState(null);
    setMessage(null);
    setShowPhoneAuth(true);
  };

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
    } catch (err: any) {
      console.error("reCAPTCHA 설정 실패:", err);
      setErrorState(
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
    setErrorState(null);

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
    } catch (err: unknown) {
      console.error("인증번호 전송 오류:", err);
      // Even more defensive error handling with type assertions
      let errorMessage = "인증번호 전송에 실패했습니다";
      // First check if err is an object
      if (err && typeof err === "object") {
        // Then check if it has a message property
        if (
          "message" in err &&
          typeof (err as { message: unknown }).message === "string"
        ) {
          errorMessage = (err as { message: string }).message;
        }
      }
      setErrorState(errorMessage);

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
    setErrorState(null);

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
    } catch (err: unknown) {
      // Even more defensive error handling with type assertions
      let errorMessage = "인증코드 확인에 실패했습니다";
      // First check if err is an object
      if (err && typeof err === "object") {
        // Then check if it has a message property
        if (
          "message" in err &&
          typeof (err as { message: unknown }).message === "string"
        ) {
          errorMessage = (err as { message: string }).message;
        }
      }
      setErrorState(errorMessage);

      console.error("인증코드 확인 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Setup reCAPTCHA only when the phone auth UI is visible
    if (showPhoneAuth) {
      try {
        setupInvisibleRecaptcha();
      } catch (err: any) {
        console.error("reCAPTCHA 설정 오류:", err);
        setErrorState("전화번호 인증 설정에 실패했습니다. 다시 시도해주세요.");
      }
    }

    // Cleanup function remains the same
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (err) {
          console.error("reCAPTCHA 초기화 오류:", err);
        }
      }
    };
  }, [showPhoneAuth]); // Depend on showPhoneAuth

  return (
    <AuthLayout>
      <AuthPageHeading>
        {showPhoneAuth ? "휴대폰으로 로그인" : "Welcome! 🥳"}
      </AuthPageHeading>
      <Description>
        {showPhoneAuth
          ? "인증코드를 받으실 휴대폰 번호를 입력해주세요. 인증은 Google의 보안 서비스를 통해 진행합니다."
          : ""}
      </Description>

      {!showPhoneAuth ? (
        <ChoiceButtonContainer>
          <PhoneButton onClick={handlePhoneAuthClick}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
              />
            </svg>
            전화번호로 시작하기
          </PhoneButton>
          <KakaoButton onClick={handleKakaoLoginClick}>
            <img src={kakaoBtnImg} alt="Kakao Login" />
            카카오로 시작하기
          </KakaoButton>
        </ChoiceButtonContainer>
      ) : (
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setVerificationCode(e.target.value)
                }
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

          {errorState && <ErrorMessage>{errorState}</ErrorMessage>}
          {message && <SuccessMessage>{message}</SuccessMessage>}
        </FormContainer>
      )}
    </AuthLayout>
  );
}
