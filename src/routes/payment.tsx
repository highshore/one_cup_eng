import { useState, useEffect } from "react";
import { styled } from "styled-components";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

// Declare the jQuery global variable
declare global {
  interface Window {
    PaypleCpayAuthCheck: (paymentParams: any) => void;
    $: any; // jQuery
    receivePaypleResult: (response: any) => void; // Add Payple callback function
  }
}

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

  const handlePaymentClick = async () => {
    if (!currentUser) {
      setError("로그인이 필요합니다.");
      return;
    }

    // Debug the current user information
    console.log("Current user object:", {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
      emailVerified: currentUser.emailVerified,
      isAnonymous: currentUser.isAnonymous,
      providerData: currentUser.providerData,
    });

    setIsProcessing(true);
    setError(null);

    try {
      // Create user info object with default email if missing
      const userEmail = currentUser.email || "hello@1cupenglish.com";

      // Log what we're sending for debugging
      const userInfo = {
        userId: currentUser.uid,
        userEmail: userEmail,
        userName: currentUser.displayName || "사용자",
      };
      console.log("Sending user info to payment function:", userInfo);

      // Call the Firebase function to get payment window data
      const getPaymentWindow = httpsCallable(functions, "getPaymentWindow");
      const result = await getPaymentWindow(userInfo);

      // Cast the result data to the expected type
      const paymentData = result.data as {
        success: boolean;
        authKey: string;
        paymentParams: any;
        message?: string;
      };

      // Check if the response indicates success
      if (!paymentData || !paymentData.success) {
        throw new Error(
          paymentData?.message || "결제 정보를 가져오는데 실패했습니다."
        );
      }

      // Log payment parameters for debugging
      console.log("Payment parameters received:", paymentData.paymentParams);

      // Store the payment session info in sessionStorage for the callback
      sessionStorage.setItem(
        "paymentSessionInfo",
        JSON.stringify({
          userId: currentUser.uid,
          timestamp: Date.now(),
        })
      );

      // Check if jQuery and PaypleCpayAuthCheck are available
      if (typeof window.$ === "undefined") {
        console.error("jQuery is not loaded");
        throw new Error(
          "결제 스크립트(jQuery)가 로드되지 않았습니다. 페이지를 새로고침 해주세요."
        );
      }

      if (typeof window.PaypleCpayAuthCheck !== "function") {
        console.error(
          "Payple script is not loaded or PaypleCpayAuthCheck is not a function"
        );
        console.log(
          "Window object:",
          Object.keys(window).filter((key) => key.includes("Pay"))
        );
        throw new Error(
          "결제 스크립트(Payple)가 로드되지 않았습니다. 페이지를 새로고침 해주세요."
        );
      }

      // Open Payple payment window with the received parameters
      try {
        console.log(
          "Attempting to open Payple payment window with params:",
          paymentData.paymentParams
        );

        // Add a custom callback function for testing
        const callbackFunction = (response: any) => {
          console.log("Payment callback received:", response);

          // Store response in sessionStorage as a backup method
          try {
            sessionStorage.setItem(
              "paypleCallbackResponse",
              JSON.stringify(response)
            );
          } catch (e) {
            console.error("Error storing callback response:", e);
          }
        };

        // Clone the payment parameters and add the callback
        const paymentParamsWithCallback = {
          ...paymentData.paymentParams,
          callbackFunction: callbackFunction.name, // Pass the function name
        };

        // Define the callback function on the window object so Payple can access it
        (window as any)[callbackFunction.name] = callbackFunction;

        // Try opening the payment window with callback first
        try {
          window.PaypleCpayAuthCheck(paymentParamsWithCallback);
        } catch (e) {
          console.warn("Failed to open with callback, trying without:", e);
          window.PaypleCpayAuthCheck(paymentData.paymentParams);
        }
      } catch (paypleError: unknown) {
        console.error("Error calling PaypleCpayAuthCheck:", paypleError);
        const errorMessage =
          paypleError instanceof Error
            ? paypleError.message
            : "알 수 없는 오류";
        throw new Error(
          "결제창을 여는 중 오류가 발생했습니다: " + errorMessage
        );
      }
    } catch (err: any) {
      console.error("Payment initialization error:", err);
      // Extract the specific error message if it's a Firebase error
      const errorMessage =
        err.code === "functions/invalid-argument"
          ? err.message || "결제 정보가 유효하지 않습니다."
          : "결제 초기화 중 오류가 발생했습니다. 다시 시도해주세요.";

      setError(errorMessage);
      setIsProcessing(false);
    }
  };

  // Add Payple callback function to window object
  useEffect(() => {
    // Define the callback function for Payple
    (window as any).receivePaypleResult = function (response: any) {
      console.log("Payple callback received:", response);

      // Store response in sessionStorage
      try {
        sessionStorage.setItem(
          "paypleCallbackResponse",
          JSON.stringify(response)
        );

        // Check if user is still on payment page, and redirect if needed
        if (window.location.pathname !== "/payment-result") {
          console.log("Redirecting to payment-result page with callback data");
          window.location.href = "/payment-result";
        }
      } catch (e) {
        console.error("Error handling Payple callback:", e);
      }
    };

    return () => {
      // Clean up the callback when component unmounts
      (window as any).receivePaypleResult = undefined;
    };
  }, []);

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
          paypleScript.src = "https://cpay.payple.kr/js/v1/payment.js"; // Production URL
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
        paypleScript.src = "https://cpay.payple.kr/js/v1/payment.js"; // Production URL
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
      if (jqueryScript) document.body.removeChild(jqueryScript);
      if (paypleScript) document.body.removeChild(paypleScript);
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
