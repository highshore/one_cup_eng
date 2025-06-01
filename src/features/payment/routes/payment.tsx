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

const SubscriptionDescription = styled.p`
  font-size: 14px;
  color: #666;
  margin: 10px 0;
  line-height: 1.5;
`;

const Button = styled.button`
  background-color: #2c1810;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 800;
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

// --- NEW Policy Info Box ---
const PolicyInfoBox = styled.div`
  background-color: #f9f9f9; // Restore light grey background
  border: none;
  border-radius: 6px; // Slightly smaller radius
  padding: 12px 15px; // Adjusted padding
  margin-top: 20px; // Add margin-top for spacing within card
  width: auto; // Remove fixed width
  font-size: 12px; // Smaller font size
  line-height: 1.5; // Tighter line height
  color: #666;

  h4 {
    font-size: 12px; // Smaller heading
    font-weight: 600;
    color: #444;
    margin-top: 10px; // Adjusted spacing
    margin-bottom: 6px;
    &:first-child {
      margin-top: 0;
    }
  }

  p {
    margin-bottom: 6px;
  }

  strong {
    font-weight: 600;
    color: #444;
  }

  a {
    color: #2c1810;
    text-decoration: underline;
    font-weight: 500;
  }
`;
// --- END Policy Info Box ---

interface UserData {
  hasActiveSubscription?: boolean;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  billingKey?: string;
}

// Add styled components for checkboxes and labels
const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 16px;
  margin: 8px 0;
`;

const CheckboxInput = styled.input`
  margin-right: 10px;
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const PriceDetail = styled.span`
  font-size: 14px;
  color: #555;
  margin-left: auto; // Push price to the right
`;

const TotalAmountDisplay = styled.div`
  font-size: 20px;
  font-weight: 700;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
  text-align: right;
  color: #2c1810;
`;

export default function Payment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // --- NEW STATE ---
  const [selectTech, setSelectTech] = useState(false);
  const [selectBusiness, setSelectBusiness] = useState(false);
  const [selectMeetup, setSelectMeetup] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedProductName, setSelectedProductName] = useState("");
  // --- END NEW STATE ---

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

  // --- NEW useEffect for Calculation ---
  useEffect(() => {
    let amount = 0;
    let nameParts: string[] = [];
    const techPrice = 4700;
    const businessPrice = 4700;

    if (selectTech) {
      amount += techPrice;
      nameParts.push("Tech");
    }
    if (selectBusiness) {
      amount += businessPrice;
      nameParts.push("Business");
    }

    // Apply 20% discount if both are selected
    if (selectTech && selectBusiness) {
      amount = Math.round(amount * 0.8); // 9400 * 0.8 = 7520 KRW
    }

    if (selectMeetup) {
      nameParts.push("Meetup Ticket");
      // Meetup is free for now, no price change
    }

    setTotalAmount(amount);
    setSelectedProductName(nameParts.join(" + ") || "항목 선택 필요");
  }, [selectTech, selectBusiness, selectMeetup]);
  // --- END NEW useEffect ---

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

    // --- VALIDATION ---
    if (!selectTech && !selectBusiness) {
      setError(
        "최소 하나 이상의 카테고리(Tech 또는 Business)를 선택해야 합니다."
      );
      return;
    }
    if (totalAmount <= 0 && (selectTech || selectBusiness)) {
      setError(
        "결제 금액을 계산하는 중 오류가 발생했습니다. 다시 시도해주세요."
      );
      console.error("Calculated amount is zero despite selection", {
        selectTech,
        selectBusiness,
        totalAmount,
      });
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
          // Pass detailed selection
          tech: selectTech,
          business: selectBusiness,
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
      <Wrapper>
        <LoadingSpinner />
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <Card>
        <Title>One Cup English 멤버십</Title>
        <Subtitle>원하는 카테고리를 선택하고 멤버십을 시작하세요</Subtitle>

        {/* --- UPDATED Subscription Card --- */}
        <SubscriptionCard>
          <SubscriptionTitle>멤버십 옵션 선택</SubscriptionTitle>
          {/* --- NEW Discount Info Text --- */}
          <InfoText style={{ marginBottom: "15px", color: "#555" }}>
            Tech와 Business 카테고리를 모두 선택하시면 <strong>20% 할인</strong>
            이 적용됩니다.
          </InfoText>
          {/* --- END Discount Info Text --- */}

          <CheckboxLabel>
            <CheckboxInput
              type="checkbox"
              checked={selectTech}
              onChange={() => setSelectTech(!selectTech)}
            />
            기술 분야 (Tech) 아티클 구독
            <PriceDetail>월 4700원</PriceDetail>
          </CheckboxLabel>

          <CheckboxLabel>
            <CheckboxInput
              type="checkbox"
              checked={selectBusiness}
              onChange={() => setSelectBusiness(!selectBusiness)}
            />
            비즈니스 분야 (Business) 아티클 구독
            <PriceDetail>월 4700원</PriceDetail>
          </CheckboxLabel>

          {selectTech && selectBusiness && (
            <InfoText style={{ color: "#990033", fontWeight: "500" }}>
              20% 할인 적용 완료!
            </InfoText>
          )}

          <CheckboxLabel>
            <CheckboxInput
              type="checkbox"
              checked={selectMeetup}
              onChange={() => setSelectMeetup(!selectMeetup)}
            />
            밋업 (Meetup) 참여 티켓 🎫
            <PriceDetail>멤버 한정 무료</PriceDetail>
          </CheckboxLabel>

          <SubscriptionDescription>
            • 매일 새로운 영어 아티클 (선택 카테고리)
            <br />
            • 단어장 무제한 저장
            <br />
            • 아티클 속독 모드 및 음성 모드
            <br />• 추후 추가되는 프리미엄 기능 모두 이용 가능
            {(selectTech || selectBusiness) && selectMeetup && (
              <>
                <br />• 밋업 우선 참여 기회
              </>
            )}
          </SubscriptionDescription>

          {/* --- MOVED Policy Info Box Content --- */}
          <PolicyInfoBox>
            <h4>자동 결제 안내</h4>
            <p>
              요금제에 가입하시면 결제 시점을 기준으로 자동 결제가 진행됩니다.
            </p>

            <h4>청약철회 (전액 환불) 가능 기간</h4>
            <p>
              신규 결제(생애 최초 결제) 또는 매월 반복 결제 모두 결제일로부터
              7일 이내에는 <strong>청약철회(전액 환불)</strong>가 가능합니다.
            </p>

            <h4>7일 이후 환불 규정</h4>
            <p>
              결제일로부터 7일이 지난 경우에는 청약철회가 아닌 해지 및 부분 환불
              규정이 적용됩니다.
            </p>

            <h4>부분 환불 기준</h4>
            <p>
              예) 월 멤버십을 20일 사용 후 해지한 경우, 남은 10일분(30일 기준)에
              해당하는 금액을 다음과 같이 환불해드립니다:
              <br />
              <strong>환불 금액 = (정가) × (남은 일수) ÷ 30</strong>
            </p>

            <h4>멤버십 정지 및 환불 요청 방법</h4>
            <p>
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
            </p>
          </PolicyInfoBox>
          {/* --- END MOVED Policy Info Box Content --- */}

          <TotalAmountDisplay>
            총 결제 금액: 월 {totalAmount}원
          </TotalAmountDisplay>

          {userData?.hasActiveSubscription ? (
            <>
              <InfoText style={{ marginTop: "20px" }}>
                이미 멤버십 이용 중입니다. 현재 멤버십 플랜은 프로필 페이지에서
                확인 가능합니다.
              </InfoText>
              <Button onClick={() => navigate("/profile")}>
                프로필로 돌아가기
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handlePaymentClick}
                disabled={isProcessing || (!selectTech && !selectBusiness)} // Disable if no category selected
                style={{ marginTop: "20px" }}
              >
                {isProcessing ? <LoadingSpinner /> : "멤버십 시작하기"}
              </Button>
              {error && <ErrorText>{error}</ErrorText>}
              <InfoText>
                멤버십은 매월 자동으로 갱신되며, 언제든지 취소할 수 있습니다.
              </InfoText>
            </>
          )}
        </SubscriptionCard>

        {/* --- Policy Info Box Content MOVED INSIDE SubscriptionCard --- */}
        {/* <PolicyInfoBox> ... </PolicyInfoBox> */}
      </Card>
    </Wrapper>
  );
}
