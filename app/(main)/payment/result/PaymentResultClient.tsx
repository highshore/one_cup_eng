"use client";

import { useState, useEffect } from "react";
import { styled } from "styled-components";
import { useRouter, useSearchParams } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../lib/firebase/firebase";

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
        console.log("Session info amount:", sessionInfo.amount);
        console.log("Session info productName:", sessionInfo.productName);
      } catch (e) {
        console.error("Error parsing session info:", e);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const processPaymentResult = async () => {
      try {
        console.log("Starting payment result processing...");

        // Method 1: Check sessionStorage for immediate callback response
        const callbackResponse = sessionStorage.getItem(
          "paypleCallbackResponse"
        );
        const verificationResult = sessionStorage.getItem(
          "paymentVerificationResult"
        );
        const verificationError = sessionStorage.getItem(
          "paymentVerificationError"
        );

        console.log("Session storage check:", {
          hasCallbackResponse: !!callbackResponse,
          hasVerificationResult: !!verificationResult,
          hasVerificationError: !!verificationError,
        });

        // If we have verification error, show it
        if (verificationError) {
          try {
            const errorData = JSON.parse(verificationError);
            console.log("Found verification error:", errorData);
            setError(errorData.message || "결제 검증 중 오류가 발생했습니다.");
            setErrorCode(errorData.code || "VERIFICATION_ERROR");
            setPaymentResult({
              success: false,
              message: errorData.message || "결제 검증 실패",
              errorCode: errorData.code,
            });
            setLoading(false);
            return;
          } catch (e) {
            console.error("Error parsing verification error:", e);
          }
        }

        // If we have verification result, use it
        if (verificationResult) {
          try {
            const resultData = JSON.parse(verificationResult);
            console.log("Found verification result:", resultData);
            setPaymentResult(resultData);
            setLoading(false);
            return;
          } catch (e) {
            console.error("Error parsing verification result:", e);
          }
        }

        // If we have callback response but no verification result, try to verify now
        if (callbackResponse) {
          try {
            const responseData = JSON.parse(callbackResponse);
            console.log("Found callback response, verifying:", responseData);

            const sessionInfo = sessionStorage.getItem("paymentSessionInfo");
            if (sessionInfo) {
              const parsedSession = JSON.parse(sessionInfo);
              const verifyPayment = httpsCallable(
                functions,
                "verifyPaymentResult"
              );

              const result = await verifyPayment({
                userId: parsedSession.userId,
                paymentParams: responseData,
                timestamp: Date.now(),
              });

              console.log("Verification result:", result.data);
              setPaymentResult(result.data as PaymentResult);
            } else {
              throw new Error("세션 정보를 찾을 수 없습니다.");
            }
          } catch (e) {
            console.error("Error verifying payment:", e);
            setError(
              e instanceof Error
                ? e.message
                : "결제 검증 중 오류가 발생했습니다."
            );
            setPaymentResult({
              success: false,
              message: "결제 검증 실패",
            });
          }
          setLoading(false);
          return;
        }

        // Method 2: Check URL parameters (backup method)
        const urlParams = new URLSearchParams(window.location.search);
        const hasUrlParams =
          urlParams.has("PCD_PAY_RST") || urlParams.has("success");

        console.log("URL parameters check:", {
          hasUrlParams,
          PCD_PAY_RST: urlParams.get("PCD_PAY_RST"),
          success: urlParams.get("success"),
        });

        if (hasUrlParams) {
          // Process URL parameters
          const payResult = urlParams.get("PCD_PAY_RST");
          const payMsg = urlParams.get("PCD_PAY_MSG");
          const payOid = urlParams.get("PCD_PAY_OID");

          const result: PaymentResult = {
            success: payResult === "success",
            message:
              payMsg ||
              (payResult === "success"
                ? "결제가 완료되었습니다."
                : "결제가 실패했습니다."),
            data: Object.fromEntries(
              urlParams.entries()
            ) as PaymentResult["data"],
          };

          console.log("Processed URL result:", result);
          setPaymentResult(result);
          setLoading(false);
          return;
        }

        // Method 3: Check for manual verification via session info
        const sessionInfo = sessionStorage.getItem("paymentSessionInfo");
        if (sessionInfo) {
          console.log("Found session info, attempting manual verification...");

          try {
            const parsedSession = JSON.parse(sessionInfo);
            const verifyPayment = httpsCallable(
              functions,
              "checkPaymentStatus"
            );

            const result = await verifyPayment({
              userId: parsedSession.userId,
              timestamp: parsedSession.timestamp,
            });

            console.log("Manual verification result:", result.data);
            setPaymentResult(result.data as PaymentResult);
          } catch (e) {
            console.error("Manual verification failed:", e);
            setError(
              e instanceof Error
                ? e.message
                : "결제 상태 확인 중 오류가 발생했습니다."
            );
            setPaymentResult({
              success: false,
              message: "결제 상태 확인 실패",
            });
          }
        } else {
          // No payment information found
          console.log("No payment information found");
          setError("결제 정보를 찾을 수 없습니다.");
          setPaymentResult({
            success: false,
            message: "결제 정보 없음",
          });
        }

        setLoading(false);
      } catch (err) {
        console.error("Error processing payment result:", err);
        setError(
          err instanceof Error
            ? err.message
            : "결제 결과 처리 중 오류가 발생했습니다."
        );
        setPaymentResult({
          success: false,
          message: "처리 오류",
        });
        setLoading(false);
      }
    };

    // Create debug info
    const debugData = {
      url: window.location.href,
      searchParams: searchParams.toString(),
      sessionStorage: {
        paymentSessionInfo: sessionStorage.getItem("paymentSessionInfo"),
        paypleCallbackResponse: sessionStorage.getItem(
          "paypleCallbackResponse"
        ),
        paymentVerificationResult: sessionStorage.getItem(
          "paymentVerificationResult"
        ),
        paymentVerificationError: sessionStorage.getItem(
          "paymentVerificationError"
        ),
      },
      timestamp: new Date().toISOString(),
    };
    setDebugInfo(debugData);

    processPaymentResult();
  }, [searchParams]);

  const handleContinue = () => {
    router.push("/");
  };

  const handleRetry = () => {
    router.push("/payment");
  };

  if (loading) {
    return (
      <Wrapper>
        <Card>
          <LoadingSpinner />
          <Subtitle>결제 결과를 확인하고 있습니다...</Subtitle>
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
            <Title>결제 완료!</Title>
            <Subtitle>{paymentResult.message}</Subtitle>

            {paymentResult.data && (
              <ResultInfo>
                <InfoRow>
                  <InfoLabel>주문번호:</InfoLabel>
                  <InfoValue>
                    {paymentResult.data.PCD_PAY_OID || "N/A"}
                  </InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>결제수단:</InfoLabel>
                  <InfoValue>
                    {paymentResult.data.PCD_PAY_TYPE || "N/A"}
                  </InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>결제자 ID:</InfoLabel>
                  <InfoValue>
                    {paymentResult.data.PCD_PAYER_ID || "N/A"}
                  </InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>결제 상태:</InfoLabel>
                  <InfoValue>
                    {paymentResult.data.PCD_PAY_RST || "success"}
                  </InfoValue>
                </InfoRow>
              </ResultInfo>
            )}

            <Button onClick={handleContinue}>메인으로 돌아가기</Button>
          </>
        ) : (
          <>
            <ErrorIcon />
            <Title>결제 실패</Title>
            <Subtitle>
              {paymentResult?.message ||
                error ||
                "결제 처리 중 오류가 발생했습니다."}
            </Subtitle>

            {errorCode && <ErrorText>오류 코드: {errorCode}</ErrorText>}

            {paymentResult?.data && (
              <ResultInfo>
                <InfoRow>
                  <InfoLabel>오류 메시지:</InfoLabel>
                  <InfoValue>
                    {paymentResult.data.PCD_PAY_MSG || "N/A"}
                  </InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>주문번호:</InfoLabel>
                  <InfoValue>
                    {paymentResult.data.PCD_PAY_OID || "N/A"}
                  </InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>결제 상태:</InfoLabel>
                  <InfoValue>
                    {paymentResult.data.PCD_PAY_RST || "failed"}
                  </InfoValue>
                </InfoRow>
              </ResultInfo>
            )}

            <Button onClick={handleRetry} style={{ marginBottom: "10px" }}>
              다시 시도하기
            </Button>
            <Button
              onClick={handleContinue}
              style={{ backgroundColor: "#666" }}
            >
              메인으로 돌아가기
            </Button>
          </>
        )}

        {/* Debug section */}
        {process.env.NODE_ENV === "development" && (
          <div style={{ marginTop: "20px", textAlign: "left" }}>
            <button
              onClick={() => setShowDebug(!showDebug)}
              style={{
                background: "#f0f0f0",
                border: "1px solid #ccc",
                padding: "5px 10px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              {showDebug ? "Hide" : "Show"} Debug Info
            </button>

            {showDebug && (
              <pre
                style={{
                  background: "#f5f5f5",
                  padding: "10px",
                  fontSize: "10px",
                  overflow: "auto",
                  maxHeight: "300px",
                  marginTop: "10px",
                }}
              >
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            )}
          </div>
        )}
      </Card>
    </Wrapper>
  );
}
