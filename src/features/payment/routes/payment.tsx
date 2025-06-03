import { useState, useEffect } from "react";
import { styled } from "styled-components";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../firebase";

// Declare the jQuery global variable and other globals
declare global {
  interface Window {
    PaypleCpayAuthCheck: (paymentParams: any) => void;
    $: any; // jQuery
    PaypleCpayCallback: any[]; // Array of callback handlers
    functionsInstance?: typeof functions;
    checkCallbackState: () => void; // Add the debug function
  }
}

// Initialize the Payple callback array if it doesn't exist
if (!window.PaypleCpayCallback) {
  window.PaypleCpayCallback = [];
}

// Add our callback handler to the array
window.PaypleCpayCallback.push(function (response: any) {
  console.log("Payple callback received through callback array:", response);

  // Enhanced debug logging
  try {
    console.log("Payple callback details:", {
      responseType: typeof response,
      hasData: !!response,
      keys: response ? Object.keys(response) : [],
      payResult: response?.PCD_PAY_RST,
      payCode: response?.PCD_PAY_CODE,
      payMsg: response?.PCD_PAY_MSG,
      payerId: response?.PCD_PAYER_ID,
      timestamp: new Date().toISOString(),
    });

    // Store response in sessionStorage
    sessionStorage.setItem("paypleCallbackResponse", JSON.stringify(response));

    // Get the session info
    const sessionInfo = sessionStorage.getItem("paymentSessionInfo");
    if (sessionInfo) {
      const parsedSession = JSON.parse(sessionInfo);
      console.log("Session info found:", parsedSession);

      // Manually call our Firebase function to verify the payment
      const verifyPayment = httpsCallable(functions, "verifyPaymentResult");
      verifyPayment({
        userId: parsedSession.userId,
        paymentParams: response,
        timestamp: Date.now(),
      })
        .then((result) => {
          console.log("Payment verification result:", result.data);

          // Store the verification result
          sessionStorage.setItem(
            "paymentVerificationResult",
            JSON.stringify(result.data)
          );

          // Redirect to the result page - the user stays in the frontend app
          // Payple handles the server-side POST to our HTTP function separately
          window.location.href = "/payment-result";
        })
        .catch((error) => {
          console.error("Payment verification error:", error);
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
          window.location.href = "/payment-result";
        });
    } else {
      console.error("No session info found in sessionStorage");

      // Fallback: still redirect but without verification
      window.location.href = "/payment-result";
    }
  } catch (e) {
    console.error("Error in Payple callback handler:", e);

    // Log the full error details
    console.error("Error details:", {
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : null,
      timestamp: new Date().toISOString(),
    });

    // Still redirect to the result page to show the error
    window.location.href = "/payment-result";
  }

  // Return true to indicate the callback was handled
  return true;
});

// Expose a function to check the callback state
window.checkCallbackState = function () {
  console.log("PaypleCpayCallback state:", {
    exists: !!window.PaypleCpayCallback,
    isArray: Array.isArray(window.PaypleCpayCallback),
    length: window.PaypleCpayCallback?.length || 0,
    sessionInfo: sessionStorage.getItem("paymentSessionInfo"),
    callbackResponse: sessionStorage.getItem("paypleCallbackResponse"),
    verificationResult: sessionStorage.getItem("paymentVerificationResult"),
    verificationError: sessionStorage.getItem("paymentVerificationError"),
  });
};



const MainCard = styled.div`
  background: white;
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  padding: 2.5rem;
  width: 100%;
  margin: 2rem 0;
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 16px;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2.5rem;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -1rem;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 3px;
    background: linear-gradient(90deg, #2c1810 0%, #4a2f23 100%);
    border-radius: 2px;
  }

  @media (max-width: 768px) {
    margin-bottom: 2rem;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  color: #2c1810;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  font-weight: 400;
  color: #666;
  margin: 0;
  line-height: 1.6;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const SectionCard = styled.div`
  background: #fafafa;
  border: 2px solid #f0f0f0;
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;

  &:hover {
    border-color: #e0e0e0;
    background: #f8f8f8;
  }

  @media (max-width: 768px) {
    padding: 1rem;
    border-radius: 12px;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #2c1810;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &::before {
    content: '✨';
    font-size: 1.2em;
  }
`;

const OptionsGrid = styled.div`
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const OptionCard = styled.div<{ $selected: boolean; $disabled?: boolean }>`
  border: 2px solid ${props => props.$selected ? '#2c1810' : '#e0e0e0'};
  border-radius: 12px;
  padding: 1.25rem;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s ease;
  background: ${props => props.$selected ? 'linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%)' : 'white'};
  position: relative;
  opacity: ${props => props.$disabled ? 0.6 : 1};

  &:hover {
    border-color: ${props => props.$disabled ? '#e0e0e0' : (props.$selected ? '#2c1810' : '#ccc')};
    transform: ${props => props.$disabled ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.$disabled ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.1)'};
  }

  ${props => props.$selected && `
    
  `}
`;

const OptionHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const OptionIcon = styled.span`
  font-size: 1.5rem;
  margin-right: 0.75rem;
`;

const OptionTitle = styled.h4`
  font-size: 1.1rem;
  font-weight: 700;
  color: #2c1810;
  margin: 0;
  flex: 1;
`;

const OptionPrice = styled.span<{ $highlighted?: boolean }>`
  font-size: 1rem;
  font-weight: ${props => props.$highlighted ? '800' : '600'};
  color: ${props => props.$highlighted ? '#2c1810' : '#666'};
  background: ${props => props.$highlighted ? 'linear-gradient(90deg, #fff3e0, #ffecb3)' : 'transparent'};
  padding: ${props => props.$highlighted ? '0.25rem 0.5rem' : '0'};
  border-radius: ${props => props.$highlighted ? '6px' : '0'};
`;

const OptionDescription = styled.p`
  font-size: 0.9rem;
  color: #666;
  margin: 0.5rem 0 0 0;
  line-height: 1.5;
`;

const FeaturesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1rem 0;
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
  font-size: 0.9rem;
  color: #555;

  &::before {
    content: '✓';
    color: #4caf50;
    font-weight: bold;
    margin-right: 0.75rem;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #e8f5e8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
  }
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  width: 100%;
  padding: 1rem 2rem;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  ${props => props.$variant === 'secondary' ? `
    background: transparent;
    color: #2c1810;
    border: 2px solid #2c1810;
    
    &:hover {
      background: #2c1810;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(44, 24, 16, 0.3);
    }
  ` : `
    background: linear-gradient(135deg, #2c1810 0%, #4a2f23 100%);
    color: white;
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(44, 24, 16, 0.4);
    }
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s;
    }
    
    &:hover:not(:disabled)::before {
      left: 100%;
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  @media (max-width: 768px) {
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
  }
`;

const PolicyCard = styled.div`
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1.5rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const PolicyTitle = styled.h4`
  font-size: 1rem;
  font-weight: 700;
  color: #2c1810;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &::before {
    content: '📋';
  }
`;

const PolicySection = styled.div`
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const PolicySubtitle = styled.h5`
  font-size: 0.9rem;
  font-weight: 600;
  color: #495057;
  margin-bottom: 0.5rem;
`;

const PolicyText = styled.p`
  font-size: 0.85rem;
  color: #6c757d;
  line-height: 1.5;
  margin-bottom: 0.5rem;

  &:last-child {
    margin-bottom: 0;
  }

  strong {
    color: #495057;
    font-weight: 600;
  }

  a {
    color: #2c1810;
    text-decoration: none;
    font-weight: 600;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const ErrorMessage = styled.div`
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  border: 2px solid #ef5350;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  color: #c62828;
  font-weight: 500;
  text-align: center;
`;

const LoadingSpinner = styled.div`
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-left-color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
  display: inline-block;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const AlreadySubscribedCard = styled.div`
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border: 2px solid #2196f3;
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  margin-top: 1rem;
`;

const AlreadySubscribedIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const AlreadySubscribedTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1976d2;
  margin-bottom: 1rem;
`;

const AlreadySubscribedText = styled.p`
  font-size: 1rem;
  color: #1565c0;
  margin-bottom: 1.5rem;
  line-height: 1.6;
`;

interface UserData {
  hasActiveSubscription?: boolean;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  billingKey?: string;
}

export default function Payment() {
  const navigate = useNavigate();
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
    window.functionsInstance = functions;

    return () => {
      window.functionsInstance = undefined;
    };
  }, []);

  const handlePaymentClick = async () => {
    if (!currentUser) {
      // Store the current path for post-login redirect
      localStorage.setItem('returnUrl', '/payment');
      // Redirect to auth page
      navigate('/auth');
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
      console.error("Calculated amount is zero");
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

      // Log debug info
      console.log("PaypleCpayCallback array setup:", {
        exists: !!window.PaypleCpayCallback,
        isArray: Array.isArray(window.PaypleCpayCallback),
        length: window.PaypleCpayCallback?.length || 0,
      });

      // Get payment window data
      const getPaymentWindow = httpsCallable(functions, "getPaymentWindow");
      console.log("Calling getPaymentWindow with userInfo:", userInfo); // Log the data being sent
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
        console.error("Payment scripts not loaded");
        throw new Error(
          "결제 스크립트가 로드되지 않았습니다. 페이지를 새로고침 해주세요."
        );
      }

      // Call Payple with debug info
      console.log("Opening payment window with params:", {
        PCD_RST_URL: paymentData.paymentParams.PCD_RST_URL || "Not set",
        PCD_AMOUNT: paymentData.paymentParams.PCD_AMOUNT, // Log amount from response
        PCD_GOOD_NAME: paymentData.paymentParams.PCD_GOOD_NAME, // Log name from response
      });

      // Add explanation about the data flow between Payple, our HTTP function, and the frontend
      console.log(
        "Payment flow: User stays in frontend → Payple opens payment window → " +
          "User completes payment → Payple sends POST to our HTTP function → " +
          "Our callback array handles the frontend response → Redirect to result page"
      );

      window.PaypleCpayAuthCheck(paymentData.paymentParams);
    } catch (err) {
      console.error("Payment error:", err);
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
    const loadPaypleScript = () => {
      // First load jQuery if it's not already loaded
      if (typeof window.$ === "undefined") {
        const jqueryScript = document.createElement("script");
        jqueryScript.src = "https://code.jquery.com/jquery-3.6.0.min.js";
        jqueryScript.async = true;
        jqueryScript.onload = () => {
          console.log("jQuery successfully loaded");
          // After jQuery is loaded, load the Payple script
          const paypleScript = document.createElement("script");
          paypleScript.src = "https://cpay.payple.kr/js/v1/payment.js";
          paypleScript.async = true;
          paypleScript.onload = () => {
            console.log("Payple script successfully loaded");
          };
          paypleScript.onerror = (e) => {
            console.error("Failed to load Payple script:", e);
          };
          document.body.appendChild(paypleScript);
        };
        jqueryScript.onerror = (e) => {
          console.error("Failed to load jQuery:", e);
        };
        document.body.appendChild(jqueryScript);
      } else {
        // jQuery already loaded, just load Payple script
        const paypleScript = document.createElement("script");
        paypleScript.src = "https://cpay.payple.kr/js/v1/payment.js";
        paypleScript.async = true;
        paypleScript.onload = () => {
          console.log("Payple script successfully loaded");
        };
        paypleScript.onerror = (e) => {
          console.error("Failed to load Payple script:", e);
        };
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
        <LoadingSpinner />
    );
  }

  return (
      <MainCard>
        <Header>
          <Title>영어 한잔 멤버십</Title>
          <Subtitle>원하는 카테고리를 선택하고 멤버십을 시작하세요</Subtitle>
        </Header>

        {userData?.hasActiveSubscription ? (
          <AlreadySubscribedCard>
            <AlreadySubscribedIcon>🎉</AlreadySubscribedIcon>
            <AlreadySubscribedTitle>멤버십 이용 중</AlreadySubscribedTitle>
            <AlreadySubscribedText>
              이미 멤버십을 이용 중입니다. 현재 멤버십 플랜은 프로필 페이지에서 확인 가능합니다.
            </AlreadySubscribedText>
            <ActionButton $variant="secondary" onClick={() => navigate("/profile")}>
              프로필로 돌아가기
            </ActionButton>
          </AlreadySubscribedCard>
        ) : (
          <>
            <SectionCard>
              <SectionTitle>밋업 멤버십</SectionTitle>
              
              <OptionsGrid>
                <OptionCard 
                  $selected={selectMeetup}
                  onClick={() => setSelectMeetup(!selectMeetup)}
                >
                  <OptionHeader>
                    <OptionIcon>🎫</OptionIcon>
                    <OptionTitle>밋업 (Meetup) 참여 티켓</OptionTitle>
                    <OptionPrice>월 4,700원</OptionPrice>
                  </OptionHeader>
                  <OptionDescription>
                    통역사 출신과 함께하는 오프라인 영어 모임
                  </OptionDescription>
                </OptionCard>

                <OptionCard 
                  $selected={true}
                  $disabled={true}
                >
                  <OptionHeader>
                    <OptionIcon>📰</OptionIcon>
                    <OptionTitle>아티클 서비스</OptionTitle>
                    <OptionPrice>포함됨</OptionPrice>
                  </OptionHeader>
                  <OptionDescription>
                    매주 새로운 영어 아티클과 단어장 서비스
                  </OptionDescription>
                </OptionCard>

                <OptionCard 
                  $selected={true}
                  $disabled={true}
                >
                  <OptionHeader>
                    <OptionIcon>🚀</OptionIcon>
                    <OptionTitle>추후 개발 기능</OptionTitle>
                    <OptionPrice>포함됨</OptionPrice>
                  </OptionHeader>
                  <OptionDescription>
                    앞으로 추가될 모든 프리미엄 기능들
                  </OptionDescription>
                </OptionCard>
              </OptionsGrid>

              <FeaturesList>
                <FeatureItem>월 4회 오프라인 영어 모임 참여 기회</FeatureItem>
                <FeatureItem>통역사 및 다양한 업계 종사자와 실전 영어 대화</FeatureItem>
                <FeatureItem>소규모 그룹 (5명 이하) 집중 학습</FeatureItem>
                <FeatureItem>매주 해외에서 가장 핫한 영어 아티클 제공</FeatureItem>
                <FeatureItem>단어장 무제한 저장 및 관리</FeatureItem>
                <FeatureItem>아티클 속독 모드 및 음성 모드 제공</FeatureItem>
                <FeatureItem>추후 추가되는 모든 프리미엄 기능</FeatureItem>
              </FeaturesList>
            </SectionCard>
            <ActionButton
                onClick={handlePaymentClick}
                disabled={isProcessing || !selectMeetup}
                style={{ marginTop: '1.5rem', position: 'relative', zIndex: 2 }}
              >
                {isProcessing ? <LoadingSpinner /> : `월 ${totalAmount.toLocaleString()}원에 멤버십 시작하기`}
              </ActionButton>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <PolicyCard>
              <PolicyTitle>결제 및 환불 정책</PolicyTitle>
              
              <PolicySection>
                <PolicySubtitle>자동 결제 안내</PolicySubtitle>
                <PolicyText>
                  요금제에 가입하시면 결제 시점을 기준으로 30일 후 자동 결제가 진행됩니다.
                </PolicyText>
              </PolicySection>

              <PolicySection>
                <PolicySubtitle>청약철회 (전액 환불) 가능 기간</PolicySubtitle>
                <PolicyText>
                  신규 결제(생애 최초 결제) 또는 매월 반복 결제 모두 결제일로부터 7일 이내에는 <strong>청약철회(전액 환불)</strong>가 가능합니다.
                </PolicyText>
              </PolicySection>

              <PolicySection>
                <PolicySubtitle>7일 이후 환불 규정</PolicySubtitle>
                <PolicyText>
                  결제일로부터 7일이 지난 경우에는 청약철회가 아닌 해지 및 부분 환불 규정이 적용됩니다.
                </PolicyText>
              </PolicySection>

              <PolicySection>
                <PolicySubtitle>부분 환불 기준</PolicySubtitle>
                <PolicyText>
                  예) 월 멤버십을 20일 사용 후 해지한 경우, 남은 10일분(30일 기준)에 해당하는 금액을 다음과 같이 환불해드립니다:
                </PolicyText>
                <PolicyText>
                  <strong>환불 금액 = (정가) × (남은 일수) ÷ 30</strong>
                </PolicyText>
              </PolicySection>

              <PolicySection>
                <PolicySubtitle>멤버십 정지 및 환불 요청 방법</PolicySubtitle>
                <PolicyText>
                  멤버십 해지 및 환불은{" "}
                  <a
                    href="/profile"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/profile");
                    }}
                  >
                    프로필 페이지
                  </a>
                  에서 직접 신청하실 수 있습니다.
                </PolicyText>
              </PolicySection>
            </PolicyCard>
          </>
        )}
      </MainCard>
  );
}
