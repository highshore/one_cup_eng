"use client";

import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "../lib/firebase/firebase";
import styled from "styled-components";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import Footer from "../lib/components/footer";

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";

const KAKAO_CLIENT_ID = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
const KAKAO_REDIRECT_URI = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI;
const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${KAKAO_REDIRECT_URI}&response_type=code`;

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}

// ... All styled components from the original auth.tsx file go here ...

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

// Layout Components
const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  background-color: ${colors.primaryBg};
`;

const ContentContainer = styled.div`
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

const Header = styled.header`
  padding: 20px;
  display: flex;
  align-items: center;
  width: 100%;
`;

const Logo = styled.img`
  height: 28px;
  width: auto;
  margin-left: 8px;
`;

// Utility Components
const StyledLink = styled(Link)`
  text-decoration: none;
  color: ${colors.text.dark};
  font-size: 14px;
  margin: 4px 0px;
  text-align: center;
  &:hover {
    text-decoration: underline;
  }
`;

const FooterWrapper = styled.div`
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
        <StyledLink
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          <Logo
            src="/images/logos/1cup_logo_new.svg"
            alt="1 Cup English Logo"
          />
        </StyledLink>
      </Header>
      <ContentContainer>{children}</ContentContainer>
      <FooterWrapper>
        <Footer />
      </FooterWrapper>
    </PageWrapper>
  );
}

// ... END: Components migrated from auth_components.tsx ...

// ... START: Original styled components from auth.tsx that are still in use ...
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
  const router = useRouter();
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
    const cleaned = input.replace(/[^\d]/g, "");

    // For Korean numbers, we need to ensure proper E.164 format
    // E.164 format is: +[country code][number without leading 0]
    if (cleaned.startsWith("010")) {
      // Remove leading 0 and add +82
      return `+82${cleaned.slice(1)}`;
    }

    // If already in the correct format with +82
    if (cleaned.startsWith("8210")) {
      return `+${cleaned}`;
    }

    // If starts with just the country code without +
    if (cleaned.startsWith("82") && cleaned.length >= 12) {
      return `+${cleaned}`;
    }

    // If all else fails, just format as a Korean number
    return `+82${cleaned}`;
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          // Create user document if it doesn\'t exist
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || "Anonymous User",
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            // Add other default fields as needed
            account_status: "free", // e.g. \'free\', \'premium\'
            user_type: "member", // e.g. \'member\', \'admin\'
            phone_number: user.phoneNumber,
          });
        } else {
          // Update last login time
          await updateDoc(userDocRef, {
            lastLoginAt: serverTimestamp(),
          });
        }

        // Get return URL from localStorage, fallback to /profile
        const returnUrl = localStorage.getItem("returnUrl");
        const finalUrl = returnUrl || "/profile";

        // Clear the stored return URL
        if (returnUrl) {
          localStorage.removeItem("returnUrl");
        }

        // Redirect user
        router.push(finalUrl);
        router.refresh();
      } else {
        // User is signed out
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  const setupInvisibleRecaptcha = () => {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (err) {}
    }

    try {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "send-code-button",
        {
          size: "invisible",
          callback: () => {},
          // Set language to Korean
          hl: "ko",
        }
      );
    } catch (err: any) {
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

      // Send verification code directly with signInWithPhoneNumber
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhoneNumber,
        window.recaptchaVerifier
      );

      setVerificationId(confirmationResult);
      setMessage("인증번호가 전송되었습니다!");
    } catch (err: unknown) {
      let errorMessage = "인증번호 전송에 실패했습니다";
      if (err && typeof err === "object") {
        if (
          "message" in err &&
          typeof (err as { message: unknown }).message === "string"
        ) {
          errorMessage = (err as { message: string }).message;
        }
      }
      setErrorState(errorMessage);

      try {
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
        }
        setupInvisibleRecaptcha();
      } catch {
        // Silent error handling for cleanup
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
      const user = userCredential.user; // Convenience variable for user object

      // Reference to the user's document in Firestore
      const userDocRef = doc(db, `users/${user.uid}`);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        // NEW USER: Create their document in Firestore
        const ancientDate = new Date(1000, 0, 1); // Month is 0-based

        const newUserFirestoreData: {
          cat_business: boolean;
          cat_tech: boolean;
          last_received: Date;
          left_count: number;
          received_articles: unknown[];
          saved_words: unknown[];
          createdAt: ReturnType<typeof serverTimestamp>;
          photoURL?: string;
        } = {
          cat_business: false,
          cat_tech: false,
          last_received: ancientDate,
          left_count: 0,
          received_articles: [],
          saved_words: [],
          createdAt: serverTimestamp(),
        };

        // If Auth profile has a photoURL, add it to the new Firestore document
        if (user.photoURL) {
          newUserFirestoreData.photoURL = user.photoURL;
        }

        await setDoc(userDocRef, newUserFirestoreData);
      } else {
        // EXISTING USER: Check if photoURL needs to be updated
        if (user.photoURL) {
          const currentFirestorePhotoURL = userDocSnap.data()?.photoURL;
          if (currentFirestorePhotoURL !== user.photoURL) {
            await updateDoc(userDocRef, {
              photoURL: user.photoURL,
            });
          }
        }
      }

      setMessage("로그인 성공!");
    } catch (err: unknown) {
      let errorMessage = "인증코드 확인에 실패했습니다";
      if (err && typeof err === "object") {
        if (
          "message" in err &&
          typeof (err as { message: unknown }).message === "string"
        ) {
          errorMessage = (err as { message: string }).message;
        }
      }
      setErrorState(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Setup reCAPTCHA only when the phone auth UI is visible
    if (showPhoneAuth) {
      try {
        setupInvisibleRecaptcha();
      } catch (err: unknown) {
        setErrorState("전화번호 인증 설정에 실패했습니다. 다시 시도해주세요.");
      }
    }

    // Cleanup function
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch {
          // Silent error handling for cleanup
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
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
              />
            </svg>
            전화번호로 시작하기
          </PhoneButton>
          <KakaoButton onClick={handleKakaoLoginClick}>
            <img src="/images/kakao_btn.png" alt="Kakao Login" />
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
