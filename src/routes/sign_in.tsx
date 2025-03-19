import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { useState, useEffect, useRef } from "react";
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
  RecaptchaContainer,
  SwitcherLink,
} from "../components/auth_components.tsx";
import {
  globalRecaptchaVerifier,
  ErrorMessage,
  formatKoreanPhoneNumber,
  initializeRecaptcha,
  cleanupRecaptcha,
  getRateLimitWaitTime,
} from "../utils/auth_utils";

export default function SignIn() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [error, setError] = useState("");
  const [recaptchaVerified, setRecaptchaVerified] = useState(false);
  const [rateLimitEndTime, setRateLimitEndTime] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<string>("");
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    recaptchaVerifierRef.current = initializeRecaptcha(
      "recaptcha-container",
      () => {
        setRecaptchaVerified(true);
        setError("");
      },
      () => {
        setRecaptchaVerified(false);
        setError("reCAPTCHA has expired, please verify again");
      }
    );

    return () => {
      if (recaptchaVerifierRef.current === globalRecaptchaVerifier) {
        cleanupRecaptcha("recaptcha-container");
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (rateLimitEndTime) {
      timer = setInterval(() => {
        const now = Date.now();
        const remaining = rateLimitEndTime - now;

        if (remaining <= 0) {
          setRateLimitEndTime(null);
          setRemainingTime("");
          clearInterval(timer);
        } else {
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          setRemainingTime(`${minutes}:${seconds.toString().padStart(2, "0")}`);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [rateLimitEndTime]);

  const onPhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
  };

  const onVerificationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVerificationCode(e.target.value);
  };

  const onSendCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (
      isLoading ||
      !phoneNumber ||
      !recaptchaVerified ||
      !recaptchaVerifierRef.current
    ) {
      if (!recaptchaVerified) {
        setError("Please complete the reCAPTCHA verification");
      }
      return;
    }

    try {
      setIsLoading(true);

      // Format the phone number for Korean numbers
      let formattedPhoneNumber: string;
      try {
        formattedPhoneNumber = formatKoreanPhoneNumber(phoneNumber);
      } catch (error: unknown) {
        if (error instanceof Error) {
          setError(
            "Please enter a valid Korean phone number (e.g., 01012345678)"
          );
        } else {
          setError("An error occurred while formatting the phone number");
        }
        return;
      }

      // Reset reCAPTCHA state before sending code
      setRecaptchaVerified(false);

      const result = await signInWithPhoneNumber(
        auth,
        formattedPhoneNumber,
        recaptchaVerifierRef.current
      );

      // Store the confirmation result for later use
      setConfirmationResult(result);
      setVerificationId(result.verificationId);
    } catch (e) {
      console.error("Error sending verification code:", e);
      if (e instanceof FirebaseError) {
        if (e.code === "auth/invalid-app-credential") {
          // If the verifier is invalid, clear it and re-render
          if (globalRecaptchaVerifier) {
            cleanupRecaptcha("recaptcha-container");
            recaptchaVerifierRef.current = initializeRecaptcha(
              "recaptcha-container",
              () => {
                setRecaptchaVerified(true);
                setError("");
              },
              () => {
                setRecaptchaVerified(false);
                setError("reCAPTCHA has expired, please verify again");
              }
            );
          }
          setError("reCAPTCHA verification failed, please verify again");
        } else if (e.code === "auth/too-many-requests") {
          const waitTime = getRateLimitWaitTime(e);
          if (waitTime) {
            const endTime = Date.now() + waitTime;
            setRateLimitEndTime(endTime);
            setError(
              `Too many attempts. Please wait ${remainingTime} before trying again`
            );
          } else {
            setError(ErrorMessage[e.code] || `Error: ${e.code}`);
          }
        } else {
          setError(ErrorMessage[e.code] || `Error: ${e.code}`);
        }
      } else {
        setError("An error occurred while sending the verification code");
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

      // Confirm the verification code
      const credential = await confirmationResult.confirm(verificationCode);

      // User is signed in
      console.log("User signed in successfully:", credential.user);

      navigate("/");
    } catch (e) {
      console.error("Error verifying code:", e);
      if (e instanceof FirebaseError) {
        setError("Invalid verification code. Please try again.");
      } else {
        setError("An error occurred while verifying the code");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormWrapper>
      <Title>Log In with Phone</Title>

      {!verificationId ? (
        // Step 1: Phone number entry and send verification code
        <>
          <Form onSubmit={onSendCode}>
            <InputWrapper>
              <InputField
                id="phone"
                name="phone"
                type="tel"
                placeholder="Phone Number (with country code, e.g. +1234567890)"
                required
                value={phoneNumber}
                onChange={onPhoneNumberChange}
                disabled={!!rateLimitEndTime}
              />
              <InputLabel htmlFor="phone">Phone Number</InputLabel>
            </InputWrapper>

            <RecaptchaContainer id="recaptcha-container"></RecaptchaContainer>

            <SubmitButton
              type="submit"
              value={isLoading ? "Sending..." : "Send Verification Code"}
              disabled={!recaptchaVerified || !!rateLimitEndTime}
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
                placeholder="Verification Code"
                required
                value={verificationCode}
                onChange={onVerificationCodeChange}
              />
              <InputLabel htmlFor="code">Verification Code</InputLabel>
            </InputWrapper>

            <SubmitButton
              type="submit"
              value={isLoading ? "Verifying..." : "Verify Code"}
            />
          </Form>
        </>
      )}

      {error ? <Error>{error}</Error> : null}
      <SwitcherLink href="/signup">
        Don't have an account? Create one &rarr;
      </SwitcherLink>
    </FormWrapper>
  );
}
