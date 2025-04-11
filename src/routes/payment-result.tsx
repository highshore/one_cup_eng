import { useState, useEffect } from "react";
import { styled } from "styled-components";
import { useNavigate, useLocation } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

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
  text-align: center;
`;

const Subtitle = styled.h2`
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #555;
  text-align: center;
`;

const ResultInfo = styled.div`
  margin-top: 20px;
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f9f9f9;
`;

const InfoRow = styled.div`
  display: flex;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;

  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.div`
  flex: 1;
  font-weight: 500;
  color: #555;
`;

const InfoValue = styled.div`
  flex: 2;
  color: #333;
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
  max-width: 300px;
  margin: 0 auto;

  &:hover {
    background-color: #3a2218;
  }
`;

const ErrorText = styled.p`
  color: #e53935;
  font-size: 14px;
  margin: 20px 0;
  text-align: center;
`;

const SuccessIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #4caf50;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;

  &::after {
    content: "✓";
    color: white;
    font-size: 40px;
  }
`;

const ErrorIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #e53935;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;

  &::after {
    content: "×";
    color: white;
    font-size: 40px;
  }
`;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #2c1810;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  animation: spin 1s linear infinite;
  margin: 30px auto;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

interface PaymentResult {
  success: boolean;
  message: string;
  errorCode?: string;
  data?: {
    PCD_PAY_RST: string;
    PCD_PAY_MSG: string;
    PCD_PAY_OID: string;
    PCD_PAY_TYPE: string;
    PCD_PAYER_ID: string;
    PCD_PAYER_NO: string;
    PCD_REGULER_FLAG: string;
    PCD_PAYER_EMAIL: string;
    PCD_PAY_YEAR: string;
    PCD_PAY_MONTH: string;
    [key: string]: string;
  };
}

export default function PaymentResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(
    null
  );

  // Add immediate logging of the URL and search parameters when component mounts
  useEffect(() => {
    console.log("Payment result page loaded");
    console.log("Full URL:", window.location.href);
    console.log("Search params:", location.search);
    console.log("Hash:", location.hash);

    // Log session storage for debugging
    console.log(
      "Session storage paymentSessionInfo exists:",
      !!sessionStorage.getItem("paymentSessionInfo")
    );
    if (sessionStorage.getItem("paymentSessionInfo")) {
      try {
        const sessionInfo = JSON.parse(
          sessionStorage.getItem("paymentSessionInfo") || "{}"
        );
        console.log("Session info userId:", sessionInfo.userId);
        console.log("Session info timestamp:", sessionInfo.timestamp);
      } catch (e) {
        console.error("Error parsing session info:", e);
      }
    }

    // Check if we need to go into test mode with mocked data
    if (location.search.includes("test=true") || !location.search) {
      console.log(
        "No search parameters or test mode activated - creating test payment data"
      );

      // Create a test user session if none exists
      if (!sessionStorage.getItem("paymentSessionInfo")) {
        const testUserId = "test_user_" + Math.floor(Math.random() * 1000);
        sessionStorage.setItem(
          "paymentSessionInfo",
          JSON.stringify({
            userId: testUserId,
            timestamp: Date.now(),
          })
        );
        console.log("Created test payment session with userId:", testUserId);
      }

      // Create test payment callback data
      const testPaymentData = {
        PCD_PAY_RST: "success",
        PCD_PAY_MSG: "success",
        PCD_PAY_OID: "TEST" + Date.now().toString(),
        PCD_PAY_TYPE: "card",
        PCD_PAYER_ID: "TEST_BILLING_KEY_" + Math.floor(Math.random() * 1000000),
        PCD_PAYER_NO:
          JSON.parse(sessionStorage.getItem("paymentSessionInfo") || "{}")
            .userId || "test_user",
        PCD_PAYER_NAME: "Test User",
        PCD_PAYER_EMAIL: "test@example.com",
        PCD_PAY_YEAR: new Date().getFullYear().toString(),
        PCD_PAY_MONTH: (new Date().getMonth() + 1).toString().padStart(2, "0"),
        PCD_PAY_GOODS: "One Cup English 프리미엄 멤버십 (테스트)",
        PCD_PAY_TOTAL: "9900",
        PCD_PAY_WORK: "AUTH",
        PCD_REGULER_FLAG: "Y",
        PCD_CARD_VER: "01",
      };

      // Store in sessionStorage for test
      sessionStorage.setItem(
        "paypleCallbackResponse",
        JSON.stringify(testPaymentData)
      );
      console.log("Created test payment data:", testPaymentData);
    }
  }, [location]);

  useEffect(() => {
    const processPaymentResult = async () => {
      try {
        // Get URL search params
        const searchParams = new URLSearchParams(location.search);
        const paymentParams: Record<string, string> = {};

        // Extract all parameters
        for (const [key, value] of searchParams.entries()) {
          paymentParams[key] = value;
        }

        console.log("Payment result params from URL:", paymentParams);
        console.log(
          "Payment params count from URL:",
          Object.keys(paymentParams).length
        );

        // If no parameters in the URL, check for form POST data, hash fragment or sessionStorage
        if (Object.keys(paymentParams).length === 0) {
          console.log(
            "No URL parameters found, checking alternative sources..."
          );

          // Try to parse hash fragment (some payment gateways use this)
          if (location.hash && location.hash.length > 1) {
            const hashParams = new URLSearchParams(location.hash.substring(1));
            for (const [key, value] of hashParams.entries()) {
              paymentParams[key] = value;
            }
            console.log("Found parameters in hash fragment:", paymentParams);
          }

          // If still no parameters, check sessionStorage for callback response
          if (Object.keys(paymentParams).length === 0) {
            console.log(
              "Checking sessionStorage for paypleCallbackResponse..."
            );
            const callbackResponse = sessionStorage.getItem(
              "paypleCallbackResponse"
            );

            if (callbackResponse) {
              try {
                const callbackData = JSON.parse(callbackResponse);
                console.log(
                  "Found callback data in sessionStorage:",
                  callbackData
                );

                // Convert callback data to paymentParams format
                for (const key in callbackData) {
                  if (Object.prototype.hasOwnProperty.call(callbackData, key)) {
                    paymentParams[key] = String(callbackData[key]);
                  }
                }

                console.log(
                  "Converted sessionStorage data to payment params:",
                  paymentParams
                );

                // Remove the stored callback response to prevent reuse
                sessionStorage.removeItem("paypleCallbackResponse");
              } catch (e) {
                console.error("Error parsing callback response:", e);
              }
            } else {
              console.warn(
                "No payment parameters found in URL, hash fragment, or sessionStorage"
              );
            }
          }
        }

        // If still no parameters, and test=true is in the URL, create test data
        if (
          Object.keys(paymentParams).length === 0 &&
          location.search.includes("test=true")
        ) {
          const testData = {
            PCD_PAY_RST: "success",
            PCD_PAY_MSG: "테스트 결제 성공",
            PCD_PAY_OID: "TEST" + Date.now(),
            PCD_PAYER_ID:
              "TEST_ID_" + Math.random().toString(36).substring(2, 8),
            PCD_PAY_TYPE: "card",
          };

          for (const [key, value] of Object.entries(testData)) {
            paymentParams[key] = value;
          }

          console.log("Created test payment parameters:", paymentParams);
        }

        // Final check for necessary payment data
        if (!paymentParams.PCD_PAY_RST) {
          console.error("Missing payment result status (PCD_PAY_RST)");
          console.log("Available params:", Object.keys(paymentParams));

          // If there are no parameters at all, we might be in a strange state
          if (Object.keys(paymentParams).length === 0) {
            // Try refreshing the page once to see if it helps
            if (!sessionStorage.getItem("payment_result_refreshed")) {
              console.log("No parameters found, attempting one refresh");
              sessionStorage.setItem("payment_result_refreshed", "true");
              window.location.reload();
              return; // Exit early since we're refreshing
            }

            setError(
              "결제 응답 데이터가 없습니다. 결제가 정상적으로 진행되지 않았거나 페이플에서 리디렉션이 제대로 이루어지지 않았습니다."
            );
            setLoading(false);
            return;
          }

          throw new Error("결제 결과 정보가 없습니다. 다시 시도해주세요.");
        }

        // Clean up refresh indicator
        sessionStorage.removeItem("payment_result_refreshed");

        // If payment failed, display the error immediately
        if (paymentParams.PCD_PAY_RST !== "success") {
          setPaymentResult({
            success: false,
            message: paymentParams.PCD_PAY_MSG || "결제 승인이 실패했습니다.",
            errorCode: paymentParams.PCD_PAY_CODE || "unknown",
          });
          setLoading(false);
          return;
        }

        // Get the payment session info from sessionStorage
        const sessionInfo = sessionStorage.getItem("paymentSessionInfo");
        if (!sessionInfo) {
          console.error(
            "Payment session information not found in sessionStorage"
          );

          // Create a fallback using the PCD_PAYER_NO if available (this might be the user ID)
          if (paymentParams.PCD_PAYER_NO) {
            console.log(
              "Attempting to use PCD_PAYER_NO as userId fallback:",
              paymentParams.PCD_PAYER_NO
            );

            // Verify payment result with Firebase function using the parameter from Payple
            const verifyPayment = httpsCallable(
              functions,
              "verifyPaymentResult"
            );
            const result = await verifyPayment({
              userId: paymentParams.PCD_PAYER_NO,
              paymentParams,
              timestamp: Date.now(),
            });

            const resultData = result.data as PaymentResult;
            setPaymentResult(resultData);
            setLoading(false);
            return;
          }

          throw new Error(
            "결제 세션 정보를 찾을 수 없습니다. 다시 시도해주세요."
          );
        }

        const { userId, timestamp } = JSON.parse(sessionInfo);
        console.log("Using userId from session:", userId);

        // Add some additional info to the payment params
        if (paymentParams.PCD_PAY_WORK === "AUTH") {
          console.log("This is a billing key authorization (AUTH) response");
        } else {
          console.log("This is a payment confirmation response");
        }

        // Verify payment result with Firebase function
        console.log("Calling verifyPaymentResult with:", {
          userId,
          paymentParamsCount: Object.keys(paymentParams).length,
        });
        const verifyPayment = httpsCallable(functions, "verifyPaymentResult");
        const result = await verifyPayment({
          userId,
          paymentParams,
          timestamp,
        });

        console.log("Verification result received:", result.data);
        const resultData = result.data as PaymentResult;

        // Check if there's an error code in the result
        if (!resultData.success && resultData.errorCode) {
          setErrorCode(resultData.errorCode);
        }

        setPaymentResult(resultData);

        // Clean up session storage
        sessionStorage.removeItem("paymentSessionInfo");
      } catch (err: any) {
        console.error("Error processing payment result:", err);
        // Display the full error for debugging
        console.error("Full error object:", JSON.stringify(err, null, 2));
        setError(err.message || "결제 결과 처리 중 오류가 발생했습니다.");
        if (err.code) {
          setErrorCode(err.code);
        }
      } finally {
        setLoading(false);
      }
    };

    processPaymentResult();
  }, [location.search, location.hash, error]);

  const handleContinue = () => {
    navigate("/profile");
  };

  const handleRetry = () => {
    navigate("/payment");
  };

  // Debug function to manually test payment verification
  const handleManualPaymentTest = async () => {
    try {
      setLoading(true);
      console.log("Manually testing payment verification...");

      // Create test payment data
      const testPaymentData = {
        PCD_PAY_RST: "success",
        PCD_PAY_MSG: "테스트 결제 성공",
        PCD_PAY_OID: "TEST" + Date.now(),
        PCD_PAYER_ID: "TEST_ID_" + Math.random().toString(36).substring(2, 8),
        PCD_PAY_TYPE: "card",
        PCD_PAY_WORK: "AUTH",
        PCD_REGULER_FLAG: "Y",
        PCD_CARD_VER: "01",
      };

      // Get or create a test user ID
      let userId = sessionStorage.getItem("debugUserId");
      if (!userId) {
        userId = "test_user_" + Math.floor(Math.random() * 1000);
        sessionStorage.setItem("debugUserId", userId);
      }

      console.log("Testing with userId:", userId);

      // Call the Firebase function directly
      const verifyPayment = httpsCallable(functions, "verifyPaymentResult");
      const result = await verifyPayment({
        userId,
        paymentParams: testPaymentData,
        timestamp: Date.now(),
      });

      console.log("Debug test verification result:", result.data);
      setPaymentResult(result.data as PaymentResult);
    } catch (err: any) {
      console.error("Error in manual payment test:", err);
      setError(err.message || "수동 테스트 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Wrapper>
        <Card>
          <Title>결제 결과 처리 중</Title>
          <LoadingSpinner />
        </Card>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <Card>
        {paymentResult?.success ? (
          <>
            <SuccessIcon />
            <Title>구독 등록 완료</Title>
            <Subtitle>
              One Cup English 프리미엄 멤버십에 가입되었습니다
            </Subtitle>

            {paymentResult.data && (
              <ResultInfo>
                <InfoRow>
                  <InfoLabel>구독자 이메일</InfoLabel>
                  <InfoValue>{paymentResult.data.PCD_PAYER_EMAIL}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>결제 방식</InfoLabel>
                  <InfoValue>신용카드 (정기결제)</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>구독 금액</InfoLabel>
                  <InfoValue>₩9,900/월</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>다음 결제일</InfoLabel>
                  <InfoValue>
                    {new Date(
                      new Date().setMonth(new Date().getMonth() + 1)
                    ).toLocaleDateString()}
                  </InfoValue>
                </InfoRow>
              </ResultInfo>
            )}

            <Button onClick={handleContinue}>프로필로 이동</Button>
          </>
        ) : (
          <>
            <ErrorIcon />
            <Title>구독 등록 실패</Title>
            <Subtitle>
              {paymentResult?.message || "결제 처리 중 오류가 발생했습니다"}
            </Subtitle>
            {error && <ErrorText>{error}</ErrorText>}
            {errorCode && <ErrorText>오류 코드: {errorCode}</ErrorText>}

            <ResultInfo>
              <InfoRow>
                <InfoLabel>문제 해결 방법</InfoLabel>
                <InfoValue>
                  • 카드 정보를 다시 확인해 주세요
                  <br />
                  • 결제 한도를 확인해 주세요
                  <br />
                  • 다른 카드로 시도해 보세요
                  <br />• 문제가 지속되면 고객센터로 문의해 주세요
                </InfoValue>
              </InfoRow>
            </ResultInfo>

            <Button onClick={handleRetry}>다시 시도하기</Button>
          </>
        )}

        {/* Debug buttons - only shown in test mode */}
        {location.search.includes("test=true") && (
          <div
            style={{
              marginTop: "20px",
              padding: "10px",
              border: "1px dashed #ccc",
            }}
          >
            <h3>디버그 도구</h3>
            <button
              style={{
                padding: "8px 16px",
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                marginRight: "8px",
              }}
              onClick={handleManualPaymentTest}
            >
              수동 결제 테스트
            </button>
            <button
              style={{
                padding: "8px 16px",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
              onClick={() => {
                // Show the actual data being used in the component
                console.log("Current payment result state:", paymentResult);
                console.log("Session storage:", {
                  paymentSessionInfo:
                    sessionStorage.getItem("paymentSessionInfo"),
                  callbackResponse: sessionStorage.getItem(
                    "paypleCallbackResponse"
                  ),
                  debugUserId: sessionStorage.getItem("debugUserId"),
                });
                alert("콘솔에서 디버그 정보를 확인하세요");
              }}
            >
              디버그 정보 보기
            </button>
          </div>
        )}
      </Card>
    </Wrapper>
  );
}
