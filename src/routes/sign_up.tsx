import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { FirebaseError } from "firebase/app";
import {
  FormWrapper,
  Title,
  Form,
  InputWrapper,
  InputField,
  InputLabel,
  SubmitButton,
  Error,
  SwitcherLink,
} from "../components/auth_components.tsx";
import {
  ErrorMessage,
  formatKoreanPhoneNumber,
  isRateLimited,
  setAuthLanguage,
} from "../utils/auth_utils";

export default function SignUp() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = 
    useState<ConfirmationResult | null>(null);
  const [error, setError] = useState("");
  const [isRateLimitActive, setIsRateLimitActive] = useState(false);

  // Initialize language for SMS
  useEffect(() => {
    setAuthLanguage(auth);
  }, []);

  const onPhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
  };

  const onVerificationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVerificationCode(e.target.value);
  };

  const setupRecaptcha = () => {
    // Initialize the invisible reCAPTCHA
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'sign-up-button', {
      'size': 'invisible',
      'callback': () => {
        console.log("reCAPTCHA verified");
      },
      'expired-callback': () => {
        setError("자동 인증이 만료되었습니다. 다시 시도해 주세요.");
      }
    });
  };

  const onSendCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (isLoading || !phoneNumber || isRateLimitActive) {
      return;
    }

    try {
      setIsLoading(true);

      // Format the phone number
      let formattedPhoneNumber: string;
      try {
        formattedPhoneNumber = formatKoreanPhoneNumber(phoneNumber);
      } catch (error: unknown) {
        setError("올바른 휴대폰 번호를 입력해 주세요 (예: 01012345678)");
        setIsLoading(false);
        return;
      }

      // Setup reCAPTCHA if not already set up
      if (!window.recaptchaVerifier) {
        setupRecaptcha();
      }
      
      // Make sure recaptchaVerifier is defined at this point
      if (!window.recaptchaVerifier) {
        setError("인증 서비스 준비에 실패했습니다. 페이지를 새로고침한 후 다시 시도해 주세요.");
        setIsLoading(false);
        return;
      }
      
      const appVerifier = window.recaptchaVerifier;

      // Send verification code
      const result = await signInWithPhoneNumber(auth, formattedPhoneNumber, appVerifier);
      setConfirmationResult(result);
      window.confirmationResult = result;
      
    } catch (e) {
      console.error("Error sending verification code:", e);
      
      // Reset reCAPTCHA on error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
      
      if (e instanceof FirebaseError) {
        console.error(`Firebase error code: ${e.code}`);
        
        if (e.code === "auth/too-many-requests") {
          const timeout = isRateLimited(e);
          if (timeout) {
            setIsRateLimitActive(true);
            setError("너무 많은 시도가 있었습니다. 잠시 후 다시 시도해 주세요.");
            
            // Reset rate limit after timeout
            setTimeout(() => {
              setIsRateLimitActive(false);
            }, timeout);
          }
        } else {
          setError(ErrorMessage[e.code] || `오류: ${e.code}`);
        }
      } else {
        setError("인증 코드 전송 중 오류가 발생했습니다");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (isLoading || !verificationCode || !confirmationResult) return;

    try {
      setIsLoading(true);
      navigate("/");
    } catch (e) {
      if (e instanceof FirebaseError) {
        setError("올바르지 않은 인증 코드입니다. 다시 확인해 주세요.");
      } else {
        setError("인증 코드 확인 중 오류가 발생했습니다");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    // Go back to phone input
    setConfirmationResult(null);
    window.confirmationResult = null;
    setVerificationCode("");
    // Clear reCAPTCHA
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
  };

  return (
    <FormWrapper>
      <Title>계정 만들기</Title>

      {!confirmationResult ? (
        // Step 1: Phone number entry and send verification code
        <>
          <Form onSubmit={onSendCode}>
            <InputWrapper>
              <InputField
                id="phone"
                name="phone"
                type="tel"
                required
                value={phoneNumber}
                onChange={onPhoneNumberChange}
                disabled={isRateLimitActive}
                placeholder="휴대폰 번호 입력"
              />
              <InputLabel htmlFor="phone">휴대폰 번호 (예: 01012345678)</InputLabel>
            </InputWrapper>

            <SubmitButton
              id="sign-up-button"
              type="submit"
              value={isLoading ? "전송 중입니다..." : "인증 코드 받기"}
              disabled={isRateLimitActive || isLoading}
            />
          </Form>
        </>
      ) : (
        // Step 2: Verification code entry
        <>
          <Form onSubmit={onVerifyCode}>
            <InputWrapper>
              <InputField
                id="code"
                name="code"
                type="text"
                placeholder="인증 코드"
                required
                value={verificationCode}
                onChange={onVerificationCodeChange}
              />
              <InputLabel htmlFor="code">인증 코드</InputLabel>
            </InputWrapper>

            <SubmitButton
              type="submit"
              value={isLoading ? "인증 중..." : "인증하기"}
            />
            
            <SubmitButton
              type="button"
              onClick={resetForm}
              value="다시 시도"
              style={{ marginTop: '10px', backgroundColor: '#6c757d' }}
            />
          </Form>
        </>
      )}

      {error ? <Error>{error}</Error> : null}
      <SwitcherLink href="/signin">
        이미 계정이 있으신가요? 로그인으로 이동 &rarr;
      </SwitcherLink>
    </FormWrapper>
  );
}
