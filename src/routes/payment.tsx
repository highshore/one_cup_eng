import { useState, useEffect } from "react";
import styled from "styled-components";
import { auth } from "../firebase";

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 1rem;
`;

const Subtitle = styled.p`
  font-size: 1.125rem;
  color: #666;
`;

const FormSection = styled.section`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
`;

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
`;

const Button = styled.button`
  background-color: #4a76f5;
  color: white;
  font-weight: 600;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #3a66e5;
  }

  &:disabled {
    background-color: #a0b0e0;
    cursor: not-allowed;
  }
`;

const InfoText = styled.p`
  font-size: 0.95rem;
  color: #666;
  margin-top: 0.5rem;
`;

const DebugBox = styled.div`
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;
  font-family: monospace;
  white-space: pre-wrap;
  font-size: 0.8rem;
  max-height: 300px;
  overflow-y: auto;
`;

const DebugButton = styled.button`
  background-color: #333;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  margin-top: 0.5rem;
  cursor: pointer;
  font-size: 0.8rem;
`;

// Create a type for window.PaypleCpayAuthCheck
declare global {
  interface Window {
    PaypleCpayAuthCheck: (obj: any) => void;
    jQuery: any;
    $: any;
  }
}

// Define a type for the Payple response
interface PaypleResponse {
  PCD_PAY_RST: string;
  PCD_PAY_MSG: string;
  PCD_PAY_OID?: string;
  PCD_PAYER_ID?: string;
  PCD_PAYER_NO?: string;
  PCD_PAYER_NAME?: string;
  PCD_PAYER_EMAIL?: string;
  PCD_PAYER_HP?: string;
  PCD_PAY_CARDNUM?: string;
  PCD_PAY_CARDNAME?: string;
  [key: string]: any;
}

export default function Payment() {
  const [userInfo, setUserInfo] = useState({
    amount: "0",
    phoneNumber: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    billingKey?: string;
  } | null>(null);

  // Debug logger function
  const logDebug = (message: string) => {
    console.log(`DEBUG: ${message}`);
    setDebugInfo((prev) => [
      ...prev,
      `[${new Date().toISOString()}] ${message}`,
    ]);
  };

  // Check if window.PaypleCpayAuthCheck exists (every 500ms for 10 seconds)
  useEffect(() => {
    if (scriptLoaded) return; // Only run if script not loaded yet

    let checkCount = 0;
    const maxChecks = 20; // 10 seconds total

    const checkInterval = setInterval(() => {
      checkCount++;
      if (window.PaypleCpayAuthCheck !== undefined) {
        logDebug(`PaypleCpayAuthCheck found after ${checkCount} checks`);
        setScriptLoaded(true);
        clearInterval(checkInterval);
      } else {
        logDebug(
          `Check ${checkCount}/${maxChecks}: PaypleCpayAuthCheck not found`
        );
        if (checkCount >= maxChecks) {
          logDebug(
            "Gave up checking for PaypleCpayAuthCheck after max attempts"
          );
          clearInterval(checkInterval);
        }
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, [scriptLoaded]);

  // Load Payple script
  useEffect(() => {
    logDebug("Starting to load payment scripts");

    // Check if script is already loaded
    if (document.querySelector('script[src*="payment.js"]')) {
      logDebug("Script tag already exists in document");
      if (window.PaypleCpayAuthCheck !== undefined) {
        logDebug("PaypleCpayAuthCheck function already available");
        setScriptLoaded(true);
        return;
      } else {
        logDebug(
          "Script tag exists but PaypleCpayAuthCheck function not available"
        );
      }
    }

    // First, try to clean up any existing failed scripts
    const existingScripts = document.querySelectorAll('script[src*="payple"]');
    logDebug(
      `Found ${existingScripts.length} existing Payple script tags, cleaning up`
    );
    existingScripts.forEach((elem) => {
      try {
        document.head.removeChild(elem);
        logDebug("Removed existing script element");
      } catch (e) {
        logDebug(`Error removing script: ${e}`);
      }
    });

    // First load jQuery, as Payple depends on it
    const loadJQuery = () => {
      return new Promise<void>((resolve) => {
        // Check if jQuery is already loaded
        if (window.jQuery) {
          logDebug("jQuery already loaded");
          resolve();
          return;
        }

        logDebug("Loading jQuery");
        const jqueryScript = document.createElement("script");
        jqueryScript.src = "https://code.jquery.com/jquery-3.6.4.min.js";
        jqueryScript.integrity =
          "sha256-oP6HI9z1XaZNBrJURtCoUT5SUnxFr8s3BzRl+cbzUq8=";
        jqueryScript.crossOrigin = "anonymous";
        jqueryScript.onload = () => {
          logDebug("jQuery loaded successfully");
          resolve();
        };
        jqueryScript.onerror = (error) => {
          logDebug(`Error loading jQuery: ${error}`);
          // Try to continue anyway, but it will likely fail
          resolve();
        };
        document.head.appendChild(jqueryScript);
      });
    };

    // Try both script URLs, first demo then production
    const loadPaypleScript = async (url: string, isAlternative = false) => {
      logDebug(`Attempting to load script from ${url}`);
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.onload = () => {
        logDebug(`Script loaded successfully from ${url}`);

        // Check if the function exists after loading
        if (window.PaypleCpayAuthCheck !== undefined) {
          logDebug("PaypleCpayAuthCheck function is available");
          setScriptLoaded(true);
        } else {
          logDebug(
            "WARNING: Script loaded but PaypleCpayAuthCheck function is not available"
          );

          // If still not available and this isn't the alternate URL, try the other URL
          if (!isAlternative) {
            logDebug("Will try alternative URL");
            loadPaypleScript("https://cpay.payple.kr/js/v1/payment.js", true);
          }
        }
      };
      script.onerror = (error) => {
        logDebug(`Error loading script from ${url}: ${error}`);

        // If this is the first attempt, try the alternative URL
        if (!isAlternative) {
          loadPaypleScript("https://cpay.payple.kr/js/v1/payment.js", true);
        }
      };
      document.head.appendChild(script);
      logDebug(`Added script to document head: ${url}`);
    };

    // First load jQuery, then load Payple script
    loadJQuery().then(() => {
      // Start with the demo URL
      loadPaypleScript("https://democpay.payple.kr/js/v1/payment.js");
    });

    return () => {
      logDebug("Cleanup: removing any payple scripts");
      const scripts = document.querySelectorAll(
        'script[src*="payple"], script[src*="jquery"]'
      );
      scripts.forEach((elem) => {
        if (document.head.contains(elem)) {
          document.head.removeChild(elem);
          logDebug("Removed script during cleanup");
        }
      });
    };
  }, []);

  // Check if user is authenticated and get phone number
  useEffect(() => {
    logDebug("Checking user authentication status");
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        logDebug(`User authenticated: ${user.uid}`);
        setIsAuthenticated(true);
        // Get phone number if available
        if (user.phoneNumber) {
          logDebug(`User has phone number: ${user.phoneNumber}`);
          setUserInfo((prev) => ({
            ...prev,
            phoneNumber: user.phoneNumber || "",
          }));
        } else {
          logDebug("User has no phone number");
        }
      } else {
        logDebug("User is not authenticated");
        setIsAuthenticated(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle payment
  const handlePayment = () => {
    logDebug("Payment button clicked");

    // Check relevant global objects and functions
    logDebug(
      `window.PaypleCpayAuthCheck exists: ${
        window.PaypleCpayAuthCheck !== undefined
      }`
    );
    logDebug(`scriptLoaded state: ${scriptLoaded}`);
    logDebug(
      `Current script tags in document: ${
        document.querySelectorAll('script[src*="payple"]').length
      }`
    );

    if (!scriptLoaded || window.PaypleCpayAuthCheck === undefined) {
      const errorMsg =
        "결제 모듈이 아직 로드되지 않았습니다. 새로고침 후 다시 시도해주세요.";
      logDebug(`ERROR: ${errorMsg}`);
      alert(errorMsg);
      return;
    }

    if (!isAuthenticated) {
      logDebug("ERROR: User not authenticated");
      alert("로그인이 필요합니다.");
      return;
    }

    if (!userInfo.phoneNumber) {
      logDebug("ERROR: No phone number available");
      alert(
        "전화번호 정보가 필요합니다. 계정 설정에서 전화번호를 추가해주세요."
      );
      return;
    }

    setIsLoading(true);
    logDebug("Set loading state to true");

    // Generate order ID
    const orderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const currentUser = auth.currentUser;
    logDebug(`Generated order ID: ${orderId}`);
    logDebug(`Current user ID: ${currentUser?.uid}`);

    // Format phone number (removing country code if needed)
    const formattedPhone = userInfo.phoneNumber.replace(/^\+82/, "0");
    logDebug(`Formatted phone number: ${formattedPhone}`);

    // Try both client keys
    // First attempt with production key
    const tryPayment = (useTestKey = false) => {
      // Create payment object
      const clientKey = useTestKey
        ? "test_DF55F29DA654A8CBC0F0A9DD4B556486" // Payple test key
        : "87D77596FABD4476364691DCE189C90B"; // Your actual client key

      logDebug(
        `Using client key: ${clientKey} (${useTestKey ? "test" : "production"})`
      );

      const paymentObj = {
        clientKey: clientKey,
        PCD_PAY_TYPE: "card",
        PCD_PAY_WORK: "AUTH", // Only card registration without immediate payment
        PCD_CARD_VER: "01", // Billing payment
        PCD_PAY_GOODS: "영어 한잔 정기구독",
        PCD_PAY_TOTAL: 0, // Set amount to 0
        PCD_PAYER_NO: currentUser?.uid || "", // Use user ID as payer number
        PCD_PAYER_HP: formattedPhone, // Format phone number
        PCD_PAY_OID: orderId,
        PCD_PAY_ISTAX: "Y", // Taxable

        // Your Firebase function endpoint
        PCD_RST_URL: import.meta.env.PROD
          ? "https://us-central1-one-cup-eng.cloudfunctions.net/paymentService/api/payment/result"
          : "http://localhost:5001/one-cup-eng/us-central1/paymentService/api/payment/result",

        // Callback function to handle the result
        callbackFunction: (response: PaypleResponse) => {
          logDebug(`Payment callback received: ${JSON.stringify(response)}`);
          handlePaymentResult(response);
        },
      };

      logDebug(
        `Calling PaypleCpayAuthCheck with: ${JSON.stringify(paymentObj)}`
      );

      // Call Payple payment
      try {
        window.PaypleCpayAuthCheck(paymentObj);
        logDebug("PaypleCpayAuthCheck called successfully");
      } catch (error) {
        logDebug(`ERROR calling PaypleCpayAuthCheck: ${error}`);

        if (!useTestKey) {
          // If production key failed, try test key
          logDebug("Trying again with test key");
          tryPayment(true);
        } else {
          // Both keys failed
          setIsLoading(false);
          alert("결제 모듈 호출 중 오류가 발생했습니다. 다시 시도해주세요.");
        }
      }
    };

    // Start with production key
    tryPayment(false);
  };

  // Handle payment result
  const handlePaymentResult = (response: PaypleResponse) => {
    logDebug(`Payment result received: ${JSON.stringify(response)}`);
    setIsLoading(false);

    if (response.PCD_PAY_RST === "success") {
      // Payment successful
      logDebug("Payment successful");
      setResult({
        success: true,
        message: "카드 등록이 완료되었습니다.",
        billingKey: response.PCD_PAYER_ID,
      });

      console.log("Payment successful", response);
    } else {
      // Payment failed
      logDebug(`Payment failed: ${response.PCD_PAY_MSG}`);
      setResult({
        success: false,
        message: `카드 등록에 실패했습니다: ${response.PCD_PAY_MSG}`,
      });
      console.log("Payment failed", response);
    }
  };

  // Reset result and try again
  const handleReset = () => {
    logDebug("Reset called - clearing result state");
    setResult(null);
  };

  return (
    <Container>
      <Header>
        <Title>정기 구독 결제</Title>
        <Subtitle>안전하고 간편한 결제 서비스를 이용해보세요</Subtitle>
      </Header>

      <div style={{ textAlign: "right", marginBottom: "1rem" }}>
        <DebugButton onClick={() => setShowDebug(!showDebug)}>
          {showDebug ? "디버그 정보 숨기기" : "디버그 정보 보기"}
        </DebugButton>
      </div>

      {showDebug && (
        <DebugBox>
          <strong>Debug Information:</strong>
          <div>Script loaded: {scriptLoaded ? "Yes" : "No"}</div>
          <div>
            PaypleCpayAuthCheck exists:{" "}
            {window.PaypleCpayAuthCheck !== undefined ? "Yes" : "No"}
          </div>
          <div>
            Script tags:{" "}
            {document.querySelectorAll('script[src*="payple"]').length}
          </div>
          <div>Authenticated: {isAuthenticated ? "Yes" : "No"}</div>
          <div>User ID: {auth.currentUser?.uid || "None"}</div>
          <div>Phone: {userInfo.phoneNumber}</div>
          <hr />
          <strong>Log:</strong>
          {debugInfo.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </DebugBox>
      )}

      {!isAuthenticated ? (
        <FormSection>
          <SectionTitle>로그인 필요</SectionTitle>
          <div style={{ textAlign: "center", margin: "2rem 0" }}>
            <p style={{ fontSize: "1.2rem", marginBottom: "2rem" }}>
              결제를 진행하기 위해서는 로그인이 필요합니다.
            </p>
            <Button onClick={() => (window.location.href = "/auth")}>
              로그인 페이지로 이동
            </Button>
          </div>
        </FormSection>
      ) : result ? (
        <FormSection>
          <SectionTitle>
            {result.success ? "결제 완료" : "결제 실패"}
          </SectionTitle>
          <div style={{ textAlign: "center", margin: "2rem 0" }}>
            {result.success ? (
              <>
                <p style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
                  카드 등록이 성공적으로 완료되었습니다.
                </p>
                <p style={{ marginBottom: "2rem" }}>
                  정기 구독이 시작되었습니다. 이제 매월 자동으로 결제됩니다.
                </p>
              </>
            ) : (
              <>
                <p
                  style={{
                    fontSize: "1.2rem",
                    marginBottom: "1rem",
                    color: "#e53935",
                  }}
                >
                  {result.message}
                </p>
                <p style={{ marginBottom: "2rem" }}>
                  다시 시도하거나 다른 카드로 결제해 주세요.
                </p>
              </>
            )}
            <Button onClick={handleReset}>
              {result.success ? "완료" : "다시 시도"}
            </Button>
          </div>
        </FormSection>
      ) : (
        <>
          <FormSection>
            <SectionTitle>구독 정보</SectionTitle>
            <Form>
              <FormGroup>
                <Label htmlFor="amount">결제 금액</Label>
                <Input
                  type="text"
                  id="amount"
                  value={`${userInfo.amount}원`}
                  readOnly
                />
              </FormGroup>

              <InfoText>
                ✓ 첫 번째 결제 후 매월 자동으로 결제됩니다.
                <br />✓ 언제든지 구독을 취소할 수 있습니다.
              </InfoText>
            </Form>
          </FormSection>

          <FormSection>
            <SectionTitle>결제 정보</SectionTitle>
            <Form>
              <FormGroup>
                <Label htmlFor="phoneNumber">전화번호</Label>
                <Input
                  type="text"
                  id="phoneNumber"
                  value={userInfo.phoneNumber.replace(/^\+82/, "0")}
                  readOnly
                />
                <InfoText>
                  *계정에 등록된 전화번호로 결제 정보가 전송됩니다.
                </InfoText>
              </FormGroup>

              <Button
                type="button"
                onClick={handlePayment}
                disabled={isLoading || !userInfo.phoneNumber || !scriptLoaded}
                style={{
                  opacity:
                    isLoading || !userInfo.phoneNumber || !scriptLoaded
                      ? 0.7
                      : 1,
                }}
              >
                {isLoading
                  ? "처리 중..."
                  : scriptLoaded
                  ? "카드 등록 및 결제하기"
                  : "스크립트 로딩 중..."}
              </Button>

              {!scriptLoaded && (
                <InfoText style={{ color: "#e53935" }}>
                  결제 모듈을 로딩 중입니다. 잠시만 기다려주세요.
                </InfoText>
              )}

              {!userInfo.phoneNumber && (
                <InfoText style={{ color: "#e53935" }}>
                  전화번호 정보가 없습니다. 계정 설정에서 전화번호를
                  추가해주세요.
                </InfoText>
              )}
            </Form>
          </FormSection>
        </>
      )}

      <FormSection>
        <SectionTitle>결제 안내</SectionTitle>
        <div style={{ fontSize: "0.95rem", lineHeight: "1.6" }}>
          <p>
            • 등록하신 카드는 안전하게 보관되며, 매월 자동으로 결제가
            이루어집니다.
          </p>
          <p>
            • 결제일에 잔액 부족 등의 이유로 결제가 실패할 경우, 최대 3회까지
            재시도합니다.
          </p>
          <p>• 구독 취소는 마이페이지에서 언제든지 가능합니다.</p>
          <p>• 결제 관련 문의사항은 hello@nativept.kr로 연락주세요.</p>
        </div>
      </FormSection>
    </Container>
  );
}
