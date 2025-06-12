"use client";

import { useState, useEffect } from "react";
import { styled } from "styled-components";
import { useRouter, useSearchParams } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase/firebase";

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
    PCD_PAY_GOODS?: string;
    PCD_PAY_TOTAL?: string;
    PCD_PAY_WORK?: string;
    PCD_PAY_CODE?: string;
    [key: string]: string | undefined;
  };
}

export default function PaymentResultClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(
    null
  );

  // Add state for debug info
  const [debugInfo, setDebugInfo] = useState<{ [key: string]: any }>({});
  const [showDebug, setShowDebug] = useState(false);

  // Add immediate logging of the URL and search parameters when component mounts
  useEffect(() => {
    console.log("Payment result page loaded");
    console.log("Full URL:", window.location.href);
    console.log("Search params:", searchParams.toString());
    console.log("Hash:", window.location.hash);

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
  }, [searchParams]);

  useEffect(() => {
    const processPaymentResult = async () => {
      try {
        // Get URL search params - parse them more carefully
        const paymentParams: Record<string, string> = {};

        // Extract all parameters from Next.js searchParams
        Array.from(searchParams.entries()).forEach(([key, value]) => {
          paymentParams[key] = value;
          // Log each parameter to see what's coming through
          console.log(`Parameter ${key}: ${value}`);
        });

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
          if (window.location.hash && window.location.hash.length > 1) {
            const hashParams = new URLSearchParams(
              window.location.hash.substring(1)
            );
            Array.from(hashParams.entries()).forEach(([key, value]) => {
              paymentParams[key] = value;
            });
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

        // Store the received parameters for debugging, even if incomplete
        sessionStorage.setItem(
          "rawPaymentParams",
          JSON.stringify(paymentParams)
        );

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
        if (paymentParams.PCD_PAY_WORK === "CERT") {
          console.log("This is a billing key authorization (CERT) response");
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
  }, [searchParams, error]);

  // Add useEffect to gather debug info
  useEffect(() => {
    // Collect debug info from session storage
    const debugData = {
      paymentSessionInfo: sessionStorage.getItem("paymentSessionInfo"),
      paypleCallbackResponse: sessionStorage.getItem("paypleCallbackResponse"),
      rawPaymentParams: sessionStorage.getItem("rawPaymentParams"),
      paymentVerificationResult: sessionStorage.getItem(
        "paymentVerificationResult"
      ),
      paymentVerificationError: sessionStorage.getItem(
        "paymentVerificationError"
      ),
      paymentResultRefreshed: sessionStorage.getItem(
        "payment_result_refreshed"
      ),
      rawLocationSearch: searchParams.toString(),
      rawLocationHash:
        typeof window !== "undefined" ? window.location.hash : "",
      timestamp: new Date().toISOString(),
    };

    setDebugInfo(debugData);

    // Log debug info to console
    console.log("Payment result debug info:", debugData);
  }, [searchParams]);

  const handleContinue = () => {
    router.push("/profile");
  };

  const handleRetry = () => {
    router.push("/payment");
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
                  <InfoLabel>결제 결과</InfoLabel>
                  <InfoValue>{paymentResult.data.PCD_PAY_RST || "-"}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>상품명</InfoLabel>
                  <InfoValue>
                    {paymentResult.data.PCD_PAY_GOODS ||
                      "One Cup English 프리미엄 멤버십"}
                  </InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>구독 금액</InfoLabel>
                  <InfoValue>
                    ₩
                    {paymentResult.data.PCD_PAY_TOTAL
                      ? Number(
                          paymentResult.data.PCD_PAY_TOTAL
                        ).toLocaleString()
                      : "-"}
                    /월
                  </InfoValue>
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

        {/* Debug section - only accessible by clicking a hidden button */}
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button
            onClick={() => setShowDebug(!showDebug)}
            style={{
              background: "transparent",
              border: "none",
              color: "#999",
              padding: "10px",
              cursor: "pointer",
            }}
          >
            {showDebug ? "Hide Debug Info" : "•••"}
          </button>

          {showDebug && (
            <div
              style={{
                textAlign: "left",
                border: "1px solid #ddd",
                padding: "10px",
                borderRadius: "5px",
                backgroundColor: "#f9f9f9",
                marginTop: "10px",
                fontSize: "12px",
                whiteSpace: "pre-wrap",
                overflow: "auto",
                maxHeight: "400px",
              }}
            >
              <h4>Debug Information</h4>

              <h5>URL Data</h5>
              <div>
                Search: <code>{debugInfo.rawLocationSearch || "None"}</code>
              </div>
              <div>
                Hash: <code>{debugInfo.rawLocationHash || "None"}</code>
              </div>

              <h5>Raw Payment Parameters</h5>
              <pre>
                {debugInfo.rawPaymentParams
                  ? JSON.stringify(
                      JSON.parse(debugInfo.rawPaymentParams),
                      null,
                      2
                    )
                  : "None"}
              </pre>

              <h5>Session Info</h5>
              <pre>
                {debugInfo.paymentSessionInfo
                  ? JSON.stringify(
                      JSON.parse(debugInfo.paymentSessionInfo),
                      null,
                      2
                    )
                  : "None"}
              </pre>

              <h5>Callback Response</h5>
              <pre>
                {debugInfo.paypleCallbackResponse
                  ? JSON.stringify(
                      JSON.parse(debugInfo.paypleCallbackResponse),
                      null,
                      2
                    )
                  : "None"}
              </pre>

              <h5>Verification Result</h5>
              <pre>
                {debugInfo.paymentVerificationResult
                  ? JSON.stringify(
                      JSON.parse(debugInfo.paymentVerificationResult),
                      null,
                      2
                    )
                  : "None"}
              </pre>

              <h5>Verification Error</h5>
              <pre>
                {debugInfo.paymentVerificationError
                  ? JSON.stringify(
                      JSON.parse(debugInfo.paymentVerificationError),
                      null,
                      2
                    )
                  : "None"}
              </pre>

              <button
                onClick={() => {
                  // Call the manual verification if we have raw parameters or callback data
                  const rawParams = debugInfo.rawPaymentParams
                    ? JSON.parse(debugInfo.rawPaymentParams)
                    : null;
                  const callbackData = debugInfo.paypleCallbackResponse
                    ? JSON.parse(debugInfo.paypleCallbackResponse)
                    : null;
                  const dataToVerify =
                    rawParams && Object.keys(rawParams).length > 0
                      ? rawParams
                      : callbackData;

                  if (dataToVerify && !debugInfo.paymentVerificationResult) {
                    try {
                      const sessionInfo = debugInfo.paymentSessionInfo
                        ? JSON.parse(debugInfo.paymentSessionInfo)
                        : null;

                      if (sessionInfo && sessionInfo.userId) {
                        console.log("Manually attempting verification with:", {
                          userId: sessionInfo.userId,
                          dataToVerify,
                        });

                        const verifyPayment = httpsCallable(
                          functions,
                          "verifyPaymentResult"
                        );
                        verifyPayment({
                          userId: sessionInfo.userId,
                          paymentParams: dataToVerify,
                          timestamp: Date.now(),
                        })
                          .then((result) => {
                            console.log(
                              "Manual verification result:",
                              result.data
                            );
                            sessionStorage.setItem(
                              "paymentVerificationResult",
                              JSON.stringify(result.data)
                            );
                            setDebugInfo({
                              ...debugInfo,
                              paymentVerificationResult: JSON.stringify(
                                result.data
                              ),
                            });
                          })
                          .catch((error) => {
                            console.error("Manual verification error:", error);
                            sessionStorage.setItem(
                              "paymentVerificationError",
                              JSON.stringify({
                                message: error.message,
                                code: error.code,
                                details: error.details,
                                timestamp: new Date().toISOString(),
                              })
                            );
                            setDebugInfo({
                              ...debugInfo,
                              paymentVerificationError: JSON.stringify({
                                message: error.message,
                                code: error.code,
                                details: error.details,
                              }),
                            });
                          });
                      } else {
                        console.error(
                          "No valid session info for manual verification"
                        );
                      }
                    } catch (e) {
                      console.error(
                        "Error parsing data for manual verification:",
                        e
                      );
                    }
                  } else {
                    console.log(
                      "No data to verify or verification already exists"
                    );
                  }
                }}
                style={{
                  background: "#2c1810",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "8px 12px",
                  marginTop: "10px",
                  cursor: "pointer",
                }}
              >
                Try Manual Verification
              </button>
            </div>
          )}
        </div>
      </Card>
    </Wrapper>
  );
}
