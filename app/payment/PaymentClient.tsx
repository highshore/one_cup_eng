"use client";

import { useState, useEffect } from "react";
import { styled } from "styled-components";
import { useRouter } from "next/navigation";
import { auth, db, functions } from "../lib/firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

// Declare the jQuery global variable and other globals
declare global {
  interface Window {
    PaypleCpayAuthCheck: (paymentParams: any) => void;
    $: any; // jQuery
    PaypleCpayCallback: any[]; // Array of callback handlers
    functionsInstance?: typeof functions;
  }
}

// Initialize the Payple callback array if it doesn't exist
if (typeof window !== "undefined" && !window.PaypleCpayCallback) {
  window.PaypleCpayCallback = [];
}

// Add our callback handler to the array
if (typeof window !== "undefined") {
  window.PaypleCpayCallback.push(function (response: any) {
    // Enhanced debug logging
    try {
      // Store response in sessionStorage
      sessionStorage.setItem(
        "paypleCallbackResponse",
        JSON.stringify(response)
      );

      // Get the session info
      const sessionInfo = sessionStorage.getItem("paymentSessionInfo");
      if (sessionInfo) {
        const parsedSession = JSON.parse(sessionInfo);

        // Manually call our Firebase function to verify the payment
        const verifyPayment = httpsCallable(functions, "verifyPaymentResult");
        verifyPayment({
          userId: parsedSession.userId,
          paymentParams: response,
          timestamp: Date.now(),
        })
          .then((result) => {
            // Store the verification result
            sessionStorage.setItem(
              "paymentVerificationResult",
              JSON.stringify(result.data)
            );

            // Redirect to the result page - the user stays in the frontend app
            // Payple handles the server-side POST to our HTTP function separately
            window.location.href = "/payment/result";
          })
          .catch((error) => {
            sessionStorage.setItem(
              "paymentVerificationError",
              JSON.stringify({
                message: error.message,
                code: error.code,
                details: error.details,
                timestamp: new Date().toISOString(),
              })
            );

            // Still redirect to result page to show the error
            window.location.href = "/payment/result";
          });
      } else {
        // Fallback: still redirect but without verification
        window.location.href = "/payment/result";
      }
    } catch (e) {
      // Still redirect to the result page to show the error
      window.location.href = "/payment/result";
    }

    // Return true to indicate the callback was handled
    return true;
  });
}

const MainCard = styled.div`
  background: white;
  border-radius: 8px;
  width: 100%;
  min-height: 100vh;
  padding: 2rem 0rem;

  @media (max-width: 768px) {
    padding: 2rem 0rem;
    border-radius: 6px;
  }
`;

const PricingCard = styled.div`
  border: 2px solid #000;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  background: #fff;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #ff6b35, #f7931e);
  }

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const PricingHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const PricingTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #000;
  margin-bottom: 0.5rem;
`;

const PricingAmount = styled.div`
  font-size: 3rem;
  font-weight: 700;
  color: #000;
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const PricingPeriod = styled.span`
  font-size: 1.125rem;
  color: #666;
  font-weight: 400;
`;

const FeaturesList = styled.div`
  margin: 2rem 0;
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: flex-start;
  padding: 0.75rem 0;
  font-size: 1rem;
  color: #333;
  line-height: 1.2;

  &::before {
    content: "✓";
    color: #16a34a;
    font-weight: 700;
    margin-right: 1rem;
    margin-top: 0.125rem;
    flex-shrink: 0;
  }
`;

const ActionButton = styled.button<{ $variant?: "primary" | "secondary" }>`
  width: 100%;
  padding: 1rem 2rem;
  border: none;
  border-radius: 20px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  letter-spacing: -0.01em;

  ${(props) =>
    props.$variant === "secondary"
      ? `
    background: #fff;
    color: #000;
    border: 1px solid #d1d5db;
    
    &:hover:not(:disabled) {
      background: #f9fafb;
      border-color: #9ca3af;
    }
  `
      : `
    background: #000;
    color: #fff;
    
    &:hover:not(:disabled) {
      background: #1f2937;
    }
    
    &:active:not(:disabled) {
      transform: translateY(1px);
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
  }
`;

const CheckboxSection = styled.div`
  margin-bottom: 2rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: flex-start;
  cursor: pointer;
  font-size: 1rem;
  color: #333;
  line-height: 1.5;
  gap: 0.75rem;
`;

const CheckboxInput = styled.input`
  width: 18px;
  height: 18px;
  margin-top: 0.125rem;
  accent-color: #000;
  flex-shrink: 0;
`;

const PolicyCard = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 1.5rem;
  margin-top: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const PolicyTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #000;
  margin-bottom: 1rem;
`;

const PolicySection = styled.div`
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const PolicySubtitle = styled.h4`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const PolicyText = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 0.5rem;

  &:last-child {
    margin-bottom: 0;
  }

  strong {
    color: #374151;
    font-weight: 600;
  }

  a {
    color: #000;
    text-decoration: underline;
    font-weight: 500;

    &:hover {
      color: #374151;
    }
  }
`;

const ErrorMessage = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
  color: #dc2626;
  font-weight: 500;
  text-align: center;
  font-size: 0.875rem;
`;

const LoadingSpinner = styled.div`
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-left-color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  animation: spin 1s linear infinite;
  display: inline-block;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const AlreadySubscribedCard = styled.div`
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  margin-top: 1rem;
`;

const AlreadySubscribedIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 1rem;
`;

const AlreadySubscribedTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: #0369a1;
  margin-bottom: 0.5rem;
`;

const AlreadySubscribedText = styled.p`
  font-size: 1rem;
  color: #0284c7;
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const Badge = styled.span`
  display: inline-block;
  background: #fef3c7;
  color: #92400e;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
`;

interface UserData {
  hasActiveSubscription?: boolean;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  billingKey?: string;
}

export default function PaymentClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // --- NEW STATE ---
  const [selectMeetup, setSelectMeetup] = useState(true); // Default to selected
  const [totalAmount, setTotalAmount] = useState(0); // Will be calculated
  const [selectedProductName] = useState("밋업 참여 티켓");
  // --- END NEW STATE ---

  // Check authentication and fetch user data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        fetchUserData(user.uid);
      } else {
        setLoading(false);
        // Remove the redirect to auth - allow access without login
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Calculate total amount based on meetup selection
  useEffect(() => {
    const meetupPrice = 4700;
    const amount = selectMeetup ? meetupPrice : 0;
    setTotalAmount(amount);
  }, [selectMeetup]);

  const fetchUserData = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        setUserData(userDoc.data() as UserData);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("사용자 정보를 가져오는 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  // Make functions available globally for the callback to use
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.functionsInstance = functions;

      return () => {
        window.functionsInstance = undefined;
      };
    }
  }, []);

  const handlePaymentClick = async () => {
    if (!currentUser) {
      // Store the current path for post-login redirect
      localStorage.setItem("returnUrl", "/payment");
      // Redirect to auth page
      router.push("/auth");
      return;
    }

    // --- VALIDATION ---
    if (!selectMeetup) {
      setError("밋업 참여를 선택해주세요.");
      return;
    }
    if (totalAmount <= 0) {
      setError(
        "결제 금액을 계산하는 중 오류가 발생했습니다. 다시 시도해주세요."
      );
      return;
    }
    // --- END VALIDATION ---

    setIsProcessing(true);
    setError(null);

    try {
      // --- UPDATE User Info for Payment ---
      const userInfo = {
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        userName: currentUser.displayName || "사용자",
        userPhone:
          currentUser.phoneNumber?.slice(-8) || Date.now().toString().slice(-8),
        pcd_amount: totalAmount, // Pass calculated amount
        pcd_good_name: selectedProductName, // Pass selected items description
        selected_categories: {
          meetup: selectMeetup,
        },
      };
      // --- END UPDATE ---

      // Store session info for result page
      sessionStorage.setItem(
        "paymentSessionInfo",
        JSON.stringify({
          userId: currentUser.uid,
          timestamp: Date.now(),
          amount: totalAmount, // Store amount in session too
          productName: selectedProductName,
        })
      );

      // Get payment window data
      const getPaymentWindow = httpsCallable(functions, "getPaymentWindow");
      const result = await getPaymentWindow(userInfo);
      const paymentData = result.data as any;

      if (!paymentData?.success) {
        throw new Error(
          paymentData?.message || "결제 정보를 가져오는데 실패했습니다."
        );
      }

      // Verify scripts are loaded
      if (
        typeof window.$ === "undefined" ||
        typeof window.PaypleCpayAuthCheck !== "function"
      ) {
        throw new Error(
          "결제 스크립트가 로드되지 않았습니다. 페이지를 새로고침 해주세요."
        );
      }

      window.PaypleCpayAuthCheck(paymentData.paymentParams);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "결제 초기화 중 오류가 발생했습니다."
      );
      setIsProcessing(false);
    }
  };

  // Add the Payple script dynamically
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadPaypleScript = () => {
      // First load jQuery if it's not already loaded
      if (typeof window.$ === "undefined") {
        const jqueryScript = document.createElement("script");
        jqueryScript.src = "https://code.jquery.com/jquery-3.6.0.min.js";
        jqueryScript.async = true;
        jqueryScript.onload = () => {
          // After jQuery is loaded, load the Payple script
          const paypleScript = document.createElement("script");
          paypleScript.src = "https://cpay.payple.kr/js/v1/payment.js";
          paypleScript.async = true;
          document.body.appendChild(paypleScript);
        };
        document.body.appendChild(jqueryScript);
      } else {
        // jQuery already loaded, just load Payple script
        const paypleScript = document.createElement("script");
        paypleScript.src = "https://cpay.payple.kr/js/v1/payment.js";
        paypleScript.async = true;
        document.body.appendChild(paypleScript);
      }
    };

    loadPaypleScript();

    return () => {
      // Clean up scripts when component unmounts
      const jqueryScript = document.querySelector(
        'script[src="https://code.jquery.com/jquery-3.6.0.min.js"]'
      );
      const paypleScript = document.querySelector(
        'script[src="https://cpay.payple.kr/js/v1/payment.js"]'
      );
      if (jqueryScript && jqueryScript.parentNode) {
        jqueryScript.parentNode.removeChild(jqueryScript);
      }
      if (paypleScript && paypleScript.parentNode) {
        paypleScript.parentNode.removeChild(paypleScript);
      }
    };
  }, []);

  if (loading) {
    return (
      <MainCard>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <LoadingSpinner />
        </div>
      </MainCard>
    );
  }

  return (
    <MainCard>
      {userData?.hasActiveSubscription ? (
        <AlreadySubscribedCard>
          <AlreadySubscribedIcon>✓</AlreadySubscribedIcon>
          <AlreadySubscribedTitle>이미 구독 중입니다</AlreadySubscribedTitle>
          <AlreadySubscribedText>
            현재 멤버십을 이용 중입니다. 프로필 페이지에서 구독 상태를 확인하실
            수 있습니다.
          </AlreadySubscribedText>
          <ActionButton
            $variant="secondary"
            onClick={() => router.push("/profile")}
          >
            프로필로 이동
          </ActionButton>
        </AlreadySubscribedCard>
      ) : (
        <>
          <PricingCard>
            <PricingHeader>
              <PricingTitle>Monthly Membership</PricingTitle>
              <PricingAmount>
                4,700
                <PricingPeriod> 원 / 1개월</PricingPeriod>
              </PricingAmount>
            </PricingHeader>

            <FeaturesList>
              <FeatureItem>월 4회 오프라인 영어 모임</FeatureItem>
              <FeatureItem>
                통번역사 출신 및 다양한 백그라운드를 가진 멤버들과 실전 대화
              </FeatureItem>
              <FeatureItem>소규모 그룹 (5명 이하) 집중 학습</FeatureItem>
              <FeatureItem>매주 최신 영어 아티클 제공</FeatureItem>
            </FeaturesList>

            <ActionButton
              onClick={handlePaymentClick}
              disabled={isProcessing || !selectMeetup}
            >
              {isProcessing ? (
                <LoadingSpinner />
              ) : (
                `월 ${totalAmount.toLocaleString()}원으로 시작하기`
              )}
            </ActionButton>
          </PricingCard>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <PolicyCard>
            <PolicyTitle>결제 및 환불 정책</PolicyTitle>

            <PolicySection>
              <PolicySubtitle>자동 결제</PolicySubtitle>
              <PolicyText>
                30일마다 자동으로 결제됩니다. 재결제 시 알림톡을 드리며 언제든지
                취소할 수 있습니다.
              </PolicyText>
            </PolicySection>

            <PolicySection>
              <PolicySubtitle>7일 체험 기간 및 환불 정책</PolicySubtitle>
              <PolicyText>
                결제일로부터 <strong>7일 이내 전액 환불</strong>이 가능합니다.
                7일 이후에는 사용하지 않은 기간에 대해 일할 계산으로 환불됩니다.
                또한, 운영진 판단에 의거 정책 위반이나 원활한 서비스 제공이
                어려울 경우 일방적으로 환불 처리를 해드릴 수 있습니다.
              </PolicyText>
            </PolicySection>

            <PolicySection>
              <PolicySubtitle>구독 관리</PolicySubtitle>
              <PolicyText>
                <a
                  href="/profile"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push("/profile");
                  }}
                >
                  프로필 페이지
                </a>
                에서 구독을 관리하실 수 있습니다.
              </PolicyText>
            </PolicySection>
          </PolicyCard>
        </>
      )}
    </MainCard>
  );
}
