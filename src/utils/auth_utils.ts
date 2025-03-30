import { FirebaseError } from "firebase/app";

export const formatKoreanPhoneNumber = (phone: string): string => {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // Check if it's a valid Korean phone number (10 or 11 digits starting with 0)
  if (!/^0\d{9,10}$/.test(cleaned)) {
    throw new Error("올바르지 않은 휴대폰 번호 형식입니다");
  }

  // Remove leading 0 and add country code
  return `+82${cleaned.slice(1)}`;
};

// Error messages for Firebase authentication errors
export const ErrorMessage: { [key: string]: string } = {
  "auth/invalid-phone-number": "올바르지 않은 휴대폰 번호 형식입니다",
  "auth/invalid-verification-code": "올바르지 않은 인증 코드입니다",
  "auth/code-expired": "인증 코드가 만료되었습니다",
  "auth/too-many-requests": "너무 많은 시도가 있었습니다. 잠시 후 다시 시도해 주세요",
  "auth/captcha-check-failed": "자동 인증에 실패했습니다. 다시 시도해 주세요",
  "auth/invalid-app-credential": "인증에 실패했습니다. 다시 시도해 주세요",
  "auth/network-request-failed": "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요",
  "auth/user-disabled": "이 계정은 비활성화되었습니다",
  "auth/user-not-found": "등록된 계정을 찾을 수 없습니다",
  "auth/account-exists-with-different-credential": "이미 등록된 휴대폰 번호입니다",
};

// Check if we're rate limited and return timeout duration (in ms)
export const isRateLimited = (error: FirebaseError): number | null => {
  if (error.code === "auth/too-many-requests") {
    return 5 * 60 * 1000; // 5 minutes in milliseconds
  }
  return null;
};
