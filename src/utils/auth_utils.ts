import { RecaptchaVerifier } from "firebase/auth";
import { auth } from "../firebase";
import { FirebaseError } from "firebase/app";

// Global variable to track reCAPTCHA initialization
export let globalRecaptchaVerifier: RecaptchaVerifier | null = null;

export const ErrorMessage: { [key: string]: string } = {
  "auth/invalid-phone-number": "Invalid phone number format",
  "auth/invalid-verification-code": "Invalid verification code",
  "auth/code-expired": "Verification code has expired",
  "auth/too-many-requests":
    "Too many attempts. Please wait a few minutes before trying again",
  "auth/invalid-app-credential": "reCAPTCHA verification failed",
  "auth/network-request-failed": "Network error. Please check your connection",
  "auth/user-disabled": "This account has been disabled",
  "auth/user-not-found": "No account found with this phone number",
  "auth/account-exists-with-different-credential":
    "An account already exists with this phone number",
};

export const formatKoreanPhoneNumber = (phone: string): string => {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // Check if it's a valid Korean phone number (10 or 11 digits starting with 0)
  if (!/^0\d{9,10}$/.test(cleaned)) {
    throw new (Error as any)("Invalid Korean phone number format");
  }

  // Remove leading 0 and add country code
  return `+82${cleaned.slice(1)}`;
};

export const initializeRecaptcha = (
  containerId: string,
  onVerified: () => void,
  onExpired: () => void
) => {
  // Clean up any existing reCAPTCHA elements first
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = "";
  }

  // Use global verifier if it exists, otherwise create a new one
  if (!globalRecaptchaVerifier) {
    globalRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "normal",
      callback: () => {
        onVerified();
      },
      "expired-callback": () => {
        onExpired();
        // Clear and re-render the verifier when it expires
        if (globalRecaptchaVerifier) {
          globalRecaptchaVerifier.clear();
          const container = document.getElementById(containerId);
          if (container) {
            container.innerHTML = "";
          }
          globalRecaptchaVerifier.render();
        }
      },
    });

    // Render the verifier
    globalRecaptchaVerifier.render();
  }

  return globalRecaptchaVerifier;
};

export const cleanupRecaptcha = (containerId: string) => {
  if (globalRecaptchaVerifier) {
    globalRecaptchaVerifier.clear();
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = "";
    }
    globalRecaptchaVerifier = null;
  }
};

export const getRateLimitWaitTime = (error: FirebaseError): number | null => {
  if (error.code === "auth/too-many-requests") {
    // Firebase typically sets a 5-10 minute timeout
    // We'll return 5 minutes as a conservative estimate
    return 5 * 60 * 1000; // 5 minutes in milliseconds
  }
  return null;
};
