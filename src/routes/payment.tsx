import { useState, useEffect } from "react";
import { styled } from "styled-components";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

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
window.PaypleCpayCallback.push(function(response: any) {
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
      timestamp: new Date().toISOString()
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
        timestamp: Date.now()
      })
      .then(result => {
        console.log("Payment verification result:", result.data);
        
        // Store the verification result
        sessionStorage.setItem("paymentVerificationResult", JSON.stringify(result.data));
        
        // Redirect to the result page - the user stays in the frontend app
        // Payple handles the server-side POST to our HTTP function separately
        window.location.href = "/payment-result";
      })
      .catch(error => {
        console.error("Payment verification error:", error);
        sessionStorage.setItem("paymentVerificationError", JSON.stringify({
          message: error.message,
          code: error.code,
          details: error.details,
          timestamp: new Date().toISOString()
        }));
        
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
      timestamp: new Date().toISOString()
    });
    
    // Still redirect to the result page to show the error
    window.location.href = "/payment-result";
  }
  
  // Return true to indicate the callback was handled
  return true;
});

// Expose a function to check the callback state
window.checkCallbackState = function() {
  console.log("PaypleCpayCallback state:", {
    exists: !!window.PaypleCpayCallback,
    isArray: Array.isArray(window.PaypleCpayCallback),
    length: window.PaypleCpayCallback?.length || 0,
    sessionInfo: sessionStorage.getItem("paymentSessionInfo"),
    callbackResponse: sessionStorage.getItem("paypleCallbackResponse"),
    verificationResult: sessionStorage.getItem("paymentVerificationResult"),
    verificationError: sessionStorage.getItem("paymentVerificationError")
  });
};

// Styled components
const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 850px;
  margin: 0 auto;
  padding: 20px;
`;

const Card = styled.div`
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 30px;
  width: 100%;
  margin-bottom: 20px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #333;
`;

const Subtitle = styled.h2`
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #555;
`;

const SubscriptionCard = styled.div`
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const SubscriptionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
`;

const SubscriptionPrice = styled.div`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 15px;
  color: #2c1810;
`;

const SubscriptionDescription = styled.p`
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
  line-height: 1.5;
`;

const Button = styled.button`
  background-color: #2c1810;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  width: 100%;

  &:hover {
    background-color: #3a2218;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const InfoText = styled.p`
  font-size: 14px;
  color: #666;
  margin: 10px 0;
  line-height: 1.5;
`;

const ErrorText = styled.p`
  color: #e53935;
  font-size: 14px;
  margin: 10px 0;
`;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #2c1810;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
  margin: 0 auto;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
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

  // Check authentication and fetch user data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        fetchUserData(user.uid);
      } else {
        setLoading(false);
        navigate("/auth");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

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
      setError("로그인이 필요합니다.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Simple user info with minimal data
      const userInfo = {
        userId: currentUser.uid,
        userEmail: currentUser.email || "hello@1cupenglish.com",
        userName: currentUser.displayName || "사용자",
        userPhone: currentUser.phoneNumber?.slice(-8) || Date.now().toString().slice(-8)
      };
      
      // Store session info for result page
      sessionStorage.setItem(
        "paymentSessionInfo",
        JSON.stringify({
          userId: currentUser.uid,
          timestamp: Date.now(),
        })
      );

      // Log debug info
      console.log("PaypleCpayCallback array setup:", {
        exists: !!window.PaypleCpayCallback,
        isArray: Array.isArray(window.PaypleCpayCallback),
        length: window.PaypleCpayCallback?.length || 0
      });

      // Get payment window data
      const getPaymentWindow = httpsCallable(functions, "getPaymentWindow");
      const result = await getPaymentWindow(userInfo);
      const paymentData = result.data as any;

      if (!paymentData?.success) {
        throw new Error(paymentData?.message || "결제 정보를 가져오는데 실패했습니다.");
      }

      // Verify scripts are loaded
      if (typeof window.$ === "undefined" || typeof window.PaypleCpayAuthCheck !== "function") {
        console.error("Payment scripts not loaded");
        throw new Error("결제 스크립트가 로드되지 않았습니다. 페이지를 새로고침 해주세요.");
      }

      // Call Payple with debug info
      console.log("Opening payment window with params:", {
        PCD_RST_URL: paymentData.paymentParams.PCD_RST_URL || 'Not set'
      });
      
      // Add explanation about the data flow between Payple, our HTTP function, and the frontend
      console.log("Payment flow: User stays in frontend → Payple opens payment window → " +
                  "User completes payment → Payple sends POST to our HTTP function → " +
                  "Our callback array handles the frontend response → Redirect to result page");
      
      window.PaypleCpayAuthCheck(paymentData.paymentParams);
    } catch (err) {
      console.error("Payment error:", err);
      setError(err instanceof Error ? err.message : "결제 초기화 중 오류가 발생했습니다.");
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
      <Wrapper>
        <LoadingSpinner />
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <Card>
        <Title>One Cup English 구독</Title>
        <Subtitle>원컵 잉글리시 프리미엄 멤버십을 시작하세요</Subtitle>

        <SubscriptionCard>
          <SubscriptionTitle>프리미엄 멤버십</SubscriptionTitle>
          <SubscriptionPrice>₩9,900/월</SubscriptionPrice>
          <SubscriptionDescription>
            • 매일 새로운 기술/비즈니스 영어 아티클
            <br />
            • 단어장 무제한 저장
            <br />
            • 아티클 전체 내용 확인 및 오디오 청취
            <br />• 프리미엄 기능 모두 이용 가능
          </SubscriptionDescription>

          {userData?.hasActiveSubscription ? (
            <>
              <InfoText>
                이미 구독 중입니다. 구독 시작일:{" "}
                {userData.subscriptionStartDate?.toLocaleDateString()}
              </InfoText>
              <Button onClick={() => navigate("/profile")}>
                프로필로 돌아가기
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handlePaymentClick} disabled={isProcessing}>
                {isProcessing ? <LoadingSpinner /> : "구독 시작하기"}
              </Button>
              {error && <ErrorText>{error}</ErrorText>}
              <InfoText>
                구독은 매월 자동으로 갱신되며, 언제든지 취소할 수 있습니다.
              </InfoText>
            </>
          )}
        </SubscriptionCard>
      </Card>
    </Wrapper>
  );
}
