import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import axios from "axios";
import { Timestamp } from "firebase-admin/firestore";

// Payple configuration from environment variables
const PAYPLE_CST_ID = process.env.PAYPLE_CST_ID || "eklass";
const PAYPLE_CUST_KEY =
  process.env.PAYPLE_CUST_KEY ||
  "152ca21974f01290cb85d75279313e9fc7f7846d90f92af3ac2fd9a552d3cc06";
const PAYPLE_CLIENT_KEY =
  process.env.PAYPLE_CLIENT_KEY || "87D77596FABD4476364691DCE189C90B";
const PAYPLE_AUTH_URL =
  process.env.PAYPLE_AUTH_URL || "https://cpay.payple.kr/php/auth.php";
const PAYPLE_HOSTNAME =
  process.env.PAYPLE_HOSTNAME || "https://1cupenglish.com";

// Subscription price in KRW
const SUBSCRIPTION_PRICE = 9900;

// Common function options
const functionConfig = {
  cors: true, // Allow CORS from any origin (simpler than specifying domains)
  region: "us-central1", // Set the region (default is us-central1)
};

// Interface for Payple authentication response
interface PaypleAuthResponse {
  result: string;
  auth_data: any;
  PCD_PAY_HOST?: string;
  PCD_PAY_URL?: string;
  cst_id?: string;
  custKey?: string;
  AuthKey?: string;
  return_url?: string;
}

// Get Payple Auth Token
async function getPaypleAuthToken(): Promise<PaypleAuthResponse> {
  try {
    // Log full details of the auth request for debugging
    const requestData = {
      cst_id: PAYPLE_CST_ID,
      custKey: PAYPLE_CUST_KEY,
      PCD_PAY_TYPE: "card",
      PCD_SIMPLE_FLAG: "Y",
      PCD_PAY_WORK: "AUTH",
      PCD_PAYCANCEL_FLAG: "N",
    };

    logger.info("Payple auth request details:", {
      url: PAYPLE_AUTH_URL,
      data: JSON.stringify(requestData),
      referer: PAYPLE_HOSTNAME,
      cst_id_length: PAYPLE_CST_ID.length,
      custKey_length: PAYPLE_CUST_KEY.length,
    });

    const response = await axios.post(PAYPLE_AUTH_URL, requestData, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        referer: PAYPLE_HOSTNAME,
      },
    });

    // Log full response for debugging
    logger.info("Payple auth response:", JSON.stringify(response.data));

    // Check if the response contains the expected fields for payment URL
    if (!response.data.PCD_PAY_URL) {
      logger.warn(
        "Payple auth response missing PCD_PAY_URL - using default URL"
      );
    } else {
      logger.info("Payment URL from auth response:", response.data.PCD_PAY_URL);
    }

    if (response.data.result !== "success") {
      logger.error("Payple auth failed with error:", {
        result: response.data.result,
        message: response.data.message || "No error message provided",
        data: JSON.stringify(response.data),
      });
      throw new Error(
        "Payple authentication failed: " + JSON.stringify(response.data)
      );
    }

    return response.data;
  } catch (error) {
    logger.error("Error getting Payple auth token:", error);
    if (axios.isAxiosError(error)) {
      logger.error("Axios error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: JSON.stringify(error.response?.data),
        headers: JSON.stringify(error.response?.headers),
        message: error.message,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.config?.data,
        },
      });
    }
    throw new Error(
      "Payple authentication failed: " +
        (error instanceof Error ? error.message : String(error))
    );
  }
}

// Interface for payment window data
interface PaymentWindowData {
  userId: string;
  userEmail: string;
  userName: string;
}

// Function to get payment window parameters
export const getPaymentWindow = onCall<PaymentWindowData>(
  functionConfig,
  async (request) => {
    try {
      // Log incoming request data for debugging
      logger.info("getPaymentWindow called with data:", request.data);
      logger.info("Auth context:", request.auth);

      // Ensure the user is authenticated
      if (!request.auth) {
        logger.error("Authentication required - no auth context");
        throw new HttpsError("unauthenticated", "Authentication required");
      }

      // Extract user data from request with more detailed validation
      const { userId, userEmail, userName } = request.data || {};

      // Log each field individually for debugging
      logger.info(`userId: ${userId || "missing"}`);
      logger.info(`userEmail: ${userEmail || "missing"}`);
      logger.info(`userName: ${userName || "missing"}`);

      // Validate user information with specific error messages
      if (!userId) {
        logger.error("Missing userId in request data");
        throw new HttpsError("invalid-argument", "User ID is required");
      }

      // Use default email if missing
      const email = userEmail || "hello@1cupenglish.com";
      logger.info(`Using email: ${email} ${!userEmail ? "(default)" : ""}`);

      // Use auth UID as fallback if userId doesn't match
      if (userId !== request.auth.uid) {
        logger.warn(
          `userId mismatch: data=${userId}, auth=${request.auth.uid}`
        );
        logger.info("Using auth.uid as userId instead");
      }

      // Get user data from Firestore to check subscription status
      const userDoc = await admin
        .firestore()
        .doc(`users/${request.auth.uid}`)
        .get();
      if (!userDoc.exists) {
        logger.error(`User not found in Firestore: ${request.auth.uid}`);
        throw new HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      logger.info(`Found user data for ${request.auth.uid}`);

      // Check if user already has an active subscription
      if (userData?.hasActiveSubscription) {
        logger.warn(`User ${request.auth.uid} already has active subscription`);
        throw new HttpsError(
          "already-exists",
          "User already has an active subscription"
        );
      }

      // Get user's auth record to access phone number
      let userPhone = "";
      let displayName = userName || "구독자";

      try {
        const authUser = await admin.auth().getUser(request.auth.uid);
        if (authUser.phoneNumber) {
          // Format phone number from auth (remove country code and any non-digits)
          userPhone = authUser.phoneNumber
            .replace(/^\+82/, "0")
            .replace(/\D/g, "");
          logger.debug(`Using phone from Auth: ${userPhone}`);
        }

        if (authUser.displayName && authUser.displayName.trim() !== "") {
          displayName = authUser.displayName;
          logger.debug(`Using displayName from Auth: ${displayName}`);
        }
      } catch (authError) {
        logger.error(
          `Error fetching user from Auth for ${request.auth.uid}:`,
          authError
        );
        // If auth data retrieval fails, fall back to userData from Firestore
        if (userData?.phone) {
          userPhone = userData.phone.replace(/^\+82/, "0").replace(/\D/g, "");
          logger.debug(`Using phone from Firestore as fallback: ${userPhone}`);
        }

        if (userData?.name) {
          displayName = userData.name;
          logger.debug(`Using name from Firestore as fallback: ${displayName}`);
        }
      }

      // Get authentication token from Payple
      const authResponse = await getPaypleAuthToken();

      const orderDate = new Date();
      const orderMonth = (orderDate.getMonth() + 1).toString().padStart(2, "0");
      const orderDay = orderDate.getDate().toString().padStart(2, "0");
      const orderNumber = `OCE${orderDate.getFullYear()}${orderMonth}${orderDay}${Math.floor(
        Math.random() * 1000000
      )
        .toString()
        .padStart(6, "0")}`;

      // Create payment parameters for Payple according to their documentation
      const paymentParams = {
        clientKey: PAYPLE_CLIENT_KEY, // 클라이언트 키 - Required
        PCD_PAY_TYPE: "card", // 결제 방법 (card) - Required
        PCD_PAY_WORK: "AUTH", // 결제요청 업무구분 (AUTH: 빌링키발급) - Required
        PCD_CARD_VER: "01", // DEFAULT: 01 (정기결제/빌링키) - Required for billing

        // Required parameters
        PCD_PAY_GOODS: "One Cup English 프리미엄 멤버십", // 상품명 - Required
        PCD_PAY_TOTAL: SUBSCRIPTION_PRICE, // 결제 금액 - Required
        PCD_RST_URL: "https://1cupenglish.com/payment-result", // 결제(요청)결과 RETURN URL - Required

        // Billing-specific parameters
        PCD_REGULER_FLAG: "Y", // 정기결제 여부 (Y) - Required for billing
        PCD_SIMPLE_FLAG: "Y", // 간편결제 여부 (빌링키는 Y로 설정) - Required for billing

        // Order details
        PCD_PAY_OID: orderNumber, // 주문번호 - Optional but recommended
        PCD_PAY_YEAR: orderDate.getFullYear().toString(), // 결제 구분 년도 - Optional
        PCD_PAY_MONTH: orderMonth, // 결제 구분 월 - Optional

        // Customer details
        PCD_PAYER_NO: request.auth.uid, // 결제자 고유번호 - Optional
        PCD_PAYER_NAME: displayName, // 결제자 이름 - Optional
        PCD_PAYER_EMAIL: email, // 결제자 이메일 - Optional
        PCD_PAYER_HP: userPhone, // 결제자 휴대폰 번호 - Optional
        PCD_PAYER_AUTHTYPE: "sms", // 본인인증 방식 (sms : 문자인증) - Optional

        // Payple credentials
        cst_id: PAYPLE_CST_ID, // 가맹점 ID - Required for backend use
        custKey: PAYPLE_CUST_KEY, // 가맹점 키 - Required for backend use
        AuthKey: authResponse.AuthKey, // 인증 키 - Required from auth response

        // Callback function for client-side handling
        callbackFunction: "receivePaypleResult", // 클라이언트에서 정의한 콜백함수
      };

      // If no phone number was found, log a message but don't throw an error
      // Some Payple configurations may not require a phone number
      if (!userPhone) {
        logger.warn(`No phone number found for user ${request.auth.uid}`);
      }

      // Store the order in Firestore for later verification
      await admin
        .firestore()
        .collection("payment_orders")
        .doc(orderNumber)
        .set({
          userId: request.auth.uid,
          userEmail: email,
          userName: displayName,
          userPhone,
          orderNumber,
          amount: SUBSCRIPTION_PRICE,
          orderDate: Timestamp.fromDate(orderDate),
          status: "pending",
          type: "subscription_init",
          paypleParams: paymentParams, // Store the params we're sending for debugging
        });

      logger.info(
        `Payment window parameters prepared for user ${request.auth.uid}`
      );

      // Return data needed for frontend to open payment window
      return {
        success: true,
        authKey: authResponse.AuthKey,
        paymentParams,
      };
    } catch (error: any) {
      logger.error("Error in getPaymentWindow:", error);
      throw new HttpsError(
        "internal",
        error.message || "Failed to initialize payment"
      );
    }
  }
);

// Interface for payment verification data
interface VerifyPaymentData {
  userId: string;
  paymentParams: Record<string, any>;
}

// Function to verify payment result callback from Payple
export const verifyPaymentResult = onCall<VerifyPaymentData>(
  functionConfig,
  async (request) => {
    try {
      const { userId, paymentParams } = request.data;

      if (!userId || !paymentParams) {
        logger.error("Missing required parameters:", {
          hasUserId: !!userId,
          hasPaymentParams: !!paymentParams,
        });
        throw new HttpsError(
          "invalid-argument",
          "Invalid payment verification request"
        );
      }

      // Log the payment parameters for debugging
      logger.info(
        "Payment verification params:",
        JSON.stringify(paymentParams)
      );

      // Check if we have necessary payment result details
      if (!paymentParams.PCD_PAY_RST) {
        logger.error(
          "Missing payment result status (PCD_PAY_RST) in params:",
          JSON.stringify(paymentParams)
        );
        throw new HttpsError(
          "invalid-argument",
          "Payment result information is incomplete"
        );
      }

      // Check if this is an AUTH (billing key) response or a PAYMENT response
      const isAuthOnly =
        paymentParams.PCD_PAY_WORK === "AUTH" ||
        (paymentParams.PCD_PAY_TYPE === "card" &&
          paymentParams.PCD_CARD_VER === "01" &&
          !paymentParams.PCD_PAY_GOODS);

      logger.info("Verification request type:", {
        isAuthOnly,
        PCD_PAY_WORK: paymentParams.PCD_PAY_WORK,
        PCD_PAY_TYPE: paymentParams.PCD_PAY_TYPE,
        PCD_CARD_VER: paymentParams.PCD_CARD_VER,
      });

      // Validate payment result with more detailed error handling
      if (paymentParams.PCD_PAY_RST !== "success") {
        const errorCode = paymentParams.PCD_PAY_CODE || "unknown";
        const errorMsg = paymentParams.PCD_PAY_MSG || "Unknown error";

        logger.error("Payment verification failed:", {
          code: errorCode,
          message: errorMsg,
          orderNumber: paymentParams.PCD_PAY_OID,
          allParams: JSON.stringify(paymentParams),
        });

        throw new HttpsError(
          "aborted",
          `Payment failed: ${errorMsg} (Code: ${errorCode})`
        );
      }

      // Extract billing key with fallbacks - according to Payple documentation
      const billingKey =
        paymentParams.PCD_PAYER_ID || // This is the main parameter for the billing key
        paymentParams.PCD_CARD_BILLKEY || // Legacy parameter
        ""; // Empty string if not found

      if (!billingKey) {
        logger.warn(
          "No billing key (PCD_PAYER_ID) found in payment response:",
          JSON.stringify(paymentParams)
        );
        throw new HttpsError(
          "internal",
          "결제 정보에 빌링키가 없습니다. 다시 시도해주세요."
        );
      }

      // Check for other important fields in the response
      const paymentOrderId = paymentParams.PCD_PAY_OID || ""; // Order ID
      const payerName = paymentParams.PCD_PAYER_NAME || ""; // Customer name
      const payerEmail = paymentParams.PCD_PAYER_EMAIL || ""; // Customer email
      const paymentTotal = paymentParams.PCD_PAY_TOTAL || ""; // Payment amount
      const paymentCardName = paymentParams.PCD_PAY_CARDNAME || ""; // Card issuer name
      const paymentTime = paymentParams.PCD_PAY_TIME || ""; // Payment timestamp

      logger.info("Payment details from Payple:", {
        billingKey,
        paymentOrderId,
        payerName,
        payerEmail,
        paymentTotal,
        paymentCardName,
        paymentTime,
      });

      // If this is just an AUTH response (billing key acquisition), we might not have an order yet
      if (isAuthOnly) {
        logger.info("Processing billing key acquisition for user:", userId);

        // Update user with billing key
        await admin.firestore().doc(`users/${userId}`).update({
          billingKey: billingKey,
          paymentMethod: "card",
          billingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Create a payment order record if we have an order ID
        if (paymentParams.PCD_PAY_OID) {
          await admin
            .firestore()
            .collection("payment_orders")
            .doc(paymentParams.PCD_PAY_OID)
            .set(
              {
                userId,
                orderNumber: paymentParams.PCD_PAY_OID,
                status: "auth_completed",
                type: "subscription_init",
                billingKey: billingKey,
                paymentMethod: "card",
                authResult: paymentParams,
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
        }

        logger.info("Successfully stored billing key for user:", userId);

        // Now we need to make the actual first payment using the billing key
        try {
          // Get a fresh auth token
          const authResponse = await getPaypleAuthToken();

          // Generate a new order number for the initial payment
          const orderDate = new Date();
          const orderMonth = (orderDate.getMonth() + 1)
            .toString()
            .padStart(2, "0");
          const orderDay = orderDate.getDate().toString().padStart(2, "0");
          const orderNumber = `OCEPAY${orderDate.getFullYear()}${orderMonth}${orderDay}${Math.floor(
            Math.random() * 1000000
          )
            .toString()
            .padStart(6, "0")}`;

          // Create payment request for initial payment using billing key - according to Payple documentation
          const paymentRequest = {
            // Payple credentials (required)
            PCD_CST_ID: PAYPLE_CST_ID, // 가맹점 ID
            PCD_CUST_KEY: PAYPLE_CUST_KEY, // 가맹점 키
            PCD_AUTH_KEY: authResponse.AuthKey, // 인증 키

            // Payment details (required)
            PCD_PAY_TYPE: "card", // 결제 방법 (card)
            PCD_PAYER_ID: billingKey, // 빌링키 (이전 응답의 PCD_PAYER_ID)
            PCD_PAY_GOODS: "One Cup English 프리미엄 멤버십 (정기결제)", // 상품명
            PCD_SIMPLE_FLAG: "Y", // 간편결제 여부 (빌링키는 Y로 설정)
            PCD_PAY_TOTAL: SUBSCRIPTION_PRICE, // 결제 금액
            PCD_PAY_OID: orderNumber, // 주문번호

            // Optional parameters for better tracking
            // NOTE: Payple requires PCD_PAYER_NO to be a number, so we use a timestamp-based number
            PCD_PAYER_NO: Date.now(), // Generate a numeric ID based on timestamp
            PCD_PAY_YEAR: new Date().getFullYear().toString(), // 결제 년도
            PCD_PAY_MONTH: (new Date().getMonth() + 1)
              .toString()
              .padStart(2, "0"), // 결제 월
            PCD_PAY_ISTAX: "Y", // 과세여부 (Y: 과세, N: 비과세)
            PCD_PAY_TAXTOTAL: Math.floor(SUBSCRIPTION_PRICE / 11).toString(), // 부가세 (자동계산)
          };

          logger.info("Making initial payment with billing key:", {
            billingKey,
            orderNumber,
            amount: SUBSCRIPTION_PRICE,
          });

          // Call Payple API to process the payment with billing key
          let paymentURL = "";

          // Check if the auth response URL is absolute or relative
          if (authResponse.PCD_PAY_URL) {
            // If it starts with http, it's absolute
            if (authResponse.PCD_PAY_URL.startsWith("http")) {
              paymentURL = authResponse.PCD_PAY_URL;
            } else {
              // It's relative, prepend the base URL
              paymentURL = `https://cpay.payple.kr${authResponse.PCD_PAY_URL}`;
            }
          } else {
            // Use default URL if none provided
            paymentURL =
              "https://cpay.payple.kr/php/SimplePayCardAct.php?ACT_=PAYM";
          }

          // Log the payment URL for debugging
          logger.info("Making payment request to URL:", paymentURL);

          const paymentResponse = await axios.post(paymentURL, paymentRequest, {
            headers: {
              "Content-Type": "application/json",
              referer: PAYPLE_HOSTNAME,
            },
          });

          logger.info(
            "Initial payment response:",
            JSON.stringify(paymentResponse.data)
          );

          // Check if payment was successful
          if (paymentResponse.data.PCD_PAY_RST === "success") {
            // Update order status
            await admin
              .firestore()
              .collection("payment_orders")
              .doc(orderNumber)
              .set({
                userId,
                orderNumber,
                amount: SUBSCRIPTION_PRICE,
                status: "completed",
                type: "subscription_initial_payment",
                paymentResult: paymentResponse.data,
                billingKey: billingKey,
                paymentMethod: "card",
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

            // Update user subscription status
            const subscriptionStartDate = new Date();
            await admin
              .firestore()
              .doc(`users/${userId}`)
              .update({
                hasActiveSubscription: true,
                subscriptionStartDate: admin.firestore.Timestamp.fromDate(
                  subscriptionStartDate
                ),
                subscriptionEndDate: admin.firestore.Timestamp.fromDate(
                  new Date(
                    subscriptionStartDate.setMonth(
                      subscriptionStartDate.getMonth() + 1
                    )
                  )
                ),
                billingKey: billingKey,
                paymentMethod: "card",
                billingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

            logger.info("User subscription activated:", { userId });

            return {
              success: true,
              message: "결제가 성공적으로 완료되었습니다.",
              data: paymentResponse.data,
            };
          } else {
            // Payment failed, log the error with detailed information
            const errorCode = paymentResponse.data.PCD_PAY_CODE || "unknown";
            const errorMsg =
              paymentResponse.data.PCD_PAY_MSG || "알 수 없는 오류";

            logger.error("Initial payment failed:", {
              code: errorCode,
              message: errorMsg,
              data: JSON.stringify(paymentResponse.data),
            });

            // Store the failed payment attempt for tracking
            await admin
              .firestore()
              .collection("payment_orders")
              .doc(orderNumber)
              .set(
                {
                  userId,
                  orderNumber,
                  amount: SUBSCRIPTION_PRICE,
                  status: "failed",
                  type: "subscription_initial_payment",
                  errorCode: errorCode,
                  errorMessage: errorMsg,
                  paymentResult: paymentResponse.data,
                  failedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              );

            throw new HttpsError(
              "aborted",
              `결제 실패: ${errorMsg} (코드: ${errorCode})`
            );
          }
        } catch (paymentError) {
          logger.error(
            "Error making initial payment with billing key:",
            paymentError
          );
          throw new HttpsError(
            "internal",
            "빌링키 결제 중 오류가 발생했습니다: " +
              (paymentError instanceof Error
                ? paymentError.message
                : String(paymentError))
          );
        }
      } else {
        // This is a standard payment verification
        // Get order from Firestore
        const orderDoc = await admin
          .firestore()
          .collection("payment_orders")
          .doc(paymentParams.PCD_PAY_OID)
          .get();

        if (!orderDoc.exists) {
          logger.error("Order not found:", {
            orderId: paymentParams.PCD_PAY_OID,
          });
          throw new HttpsError("not-found", "Order not found");
        }

        const orderData = orderDoc.data();
        logger.info("Found order:", {
          orderId: paymentParams.PCD_PAY_OID,
          orderStatus: orderData?.status,
          orderUserId: orderData?.userId,
        });

        // Validate that the order belongs to the user
        if (orderData?.userId !== userId) {
          logger.error("Order user mismatch:", {
            requestUserId: userId,
            orderUserId: orderData?.userId,
            orderId: paymentParams.PCD_PAY_OID,
          });
          throw new HttpsError(
            "permission-denied",
            "Order does not belong to this user"
          );
        }

        // Update order status
        await admin
          .firestore()
          .collection("payment_orders")
          .doc(paymentParams.PCD_PAY_OID)
          .update({
            status: "completed",
            billingKey: billingKey,
            paymentMethod: "card",
            paymentResult: paymentParams,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        logger.info("Order updated to completed:", {
          orderId: paymentParams.PCD_PAY_OID,
        });

        // Update user subscription status
        const subscriptionStartDate = new Date();
        await admin
          .firestore()
          .doc(`users/${userId}`)
          .update({
            hasActiveSubscription: true,
            subscriptionStartDate: admin.firestore.Timestamp.fromDate(
              subscriptionStartDate
            ),
            subscriptionEndDate: admin.firestore.Timestamp.fromDate(
              new Date(
                subscriptionStartDate.setMonth(
                  subscriptionStartDate.getMonth() + 1
                )
              )
            ),
            billingKey: billingKey,
            paymentMethod: "card",
            billingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        logger.info("User subscription activated:", { userId });
      }

      return {
        success: true,
        message: "Payment verified successfully",
        data: paymentParams,
      };
    } catch (error: any) {
      logger.error("Error verifying payment:", error);
      // Return a user-friendly error but also log the full technical details
      return {
        success: false,
        message: error.message || "Payment verification failed",
        errorCode: error.code || "unknown_error",
      };
    }
  }
);

// Function to process monthly recurring payments
export const processRecurringPayments = onSchedule(
  {
    schedule: "every day 00:05",
    timeZone: "Asia/Seoul",
  },
  async (event) => {
    const db = admin.firestore();
    const today = new Date();

    logger.info(`Running recurring payments job for ${today.toISOString()}`);

    try {
      // Find users whose subscriptions need to be renewed today
      const usersToRenew = await db
        .collection("users")
        .where("hasActiveSubscription", "==", true)
        .where(
          "subscriptionEndDate",
          "<=",
          admin.firestore.Timestamp.fromDate(today)
        )
        .get();

      logger.info(`Found ${usersToRenew.size} subscriptions to renew`);

      for (const userDoc of usersToRenew.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;

        // Skip if no billing key
        if (!userData.billingKey) {
          logger.warn(`User ${userId} has no billing key, skipping renewal`);
          continue;
        }

        try {
          // Get Payple auth token for billing
          const authResponse = await getPaypleAuthToken();

          // Generate order number
          const orderDate = new Date();
          const orderMonth = (orderDate.getMonth() + 1)
            .toString()
            .padStart(2, "0");
          const orderDay = orderDate.getDate().toString().padStart(2, "0");
          const orderNumber = `OCEREC${orderDate.getFullYear()}${orderMonth}${orderDay}${Math.floor(
            Math.random() * 1000000
          )
            .toString()
            .padStart(6, "0")}`;

          // Create payment request for recurring payment - according to Payple documentation
          const paymentRequest = {
            // Payple credentials (required)
            PCD_CST_ID: PAYPLE_CST_ID, // 가맹점 ID
            PCD_CUST_KEY: PAYPLE_CUST_KEY, // 가맹점 키
            PCD_AUTH_KEY: authResponse.AuthKey, // 인증 키

            // Payment details (required)
            PCD_PAY_TYPE: "card", // 결제 방법 (card)
            PCD_PAYER_ID: userData.billingKey, // 빌링키 (이전 응답의 PCD_PAYER_ID)
            PCD_PAY_GOODS: "One Cup English 프리미엄 멤버십 (정기결제)", // 상품명
            PCD_SIMPLE_FLAG: "Y", // 간편결제 여부 (빌링키는 Y로 설정)
            PCD_PAY_TOTAL: SUBSCRIPTION_PRICE, // 결제 금액
            PCD_PAY_OID: orderNumber, // 주문번호

            // Optional parameters for better tracking - using numeric values for required fields
            PCD_PAYER_NO: Date.now(), // Generate a numeric ID based on timestamp
            PCD_PAY_YEAR: new Date().getFullYear().toString(), // 결제 년도
            PCD_PAY_MONTH: (new Date().getMonth() + 1)
              .toString()
              .padStart(2, "0"), // 결제 월
            PCD_PAY_ISTAX: "Y", // 과세여부 (Y: 과세, N: 비과세)
            PCD_PAY_TAXTOTAL: Math.floor(SUBSCRIPTION_PRICE / 11).toString(), // 부가세 (자동계산)
          };

          // Call Payple API to process the recurring payment
          let paymentURL = "";

          // Check if the auth response URL is absolute or relative
          if (authResponse.PCD_PAY_URL) {
            // If it starts with http, it's absolute
            if (authResponse.PCD_PAY_URL.startsWith("http")) {
              paymentURL = authResponse.PCD_PAY_URL;
            } else {
              // It's relative, prepend the base URL
              paymentURL = `https://cpay.payple.kr${authResponse.PCD_PAY_URL}`;
            }
          } else {
            // Use default URL if none provided
            paymentURL =
              "https://cpay.payple.kr/php/SimplePayCardAct.php?ACT_=PAYM";
          }

          // Log the payment URL for debugging
          logger.info("Making recurring payment request to URL:", paymentURL);

          const paymentResponse = await axios.post(paymentURL, paymentRequest, {
            headers: {
              "Content-Type": "application/json",
              referer: PAYPLE_HOSTNAME,
            },
          });

          // Check if payment was successful
          if (paymentResponse.data.PCD_PAY_RST === "success") {
            // Update subscription dates
            const newStartDate = new Date();
            const newEndDate = new Date(
              newStartDate.setMonth(newStartDate.getMonth() + 1)
            );

            // Record the payment
            await db.collection("payment_orders").doc(orderNumber).set({
              userId,
              orderNumber,
              amount: SUBSCRIPTION_PRICE,
              orderDate: admin.firestore.FieldValue.serverTimestamp(),
              status: "completed",
              type: "subscription_recurring",
              paymentResult: paymentResponse.data,
              billingKey: userData.billingKey,
              paymentMethod: "card",
            });

            // Update user subscription
            await db.doc(`users/${userId}`).update({
              subscriptionStartDate: admin.firestore.Timestamp.fromDate(
                new Date()
              ),
              subscriptionEndDate:
                admin.firestore.Timestamp.fromDate(newEndDate),
              lastBillingDate: admin.firestore.FieldValue.serverTimestamp(),
            });

            logger.info(`Successfully renewed subscription for user ${userId}`);
          } else {
            // Payment failed, log with detailed information
            const errorCode = paymentResponse.data.PCD_PAY_CODE || "unknown";
            const errorMsg =
              paymentResponse.data.PCD_PAY_MSG || "알 수 없는 오류";

            logger.error(
              `Failed to process recurring payment for user ${userId}:`,
              {
                code: errorCode,
                message: errorMsg,
                data: JSON.stringify(paymentResponse.data),
              }
            );

            // Record the failed payment
            await db.collection("payment_orders").doc(orderNumber).set({
              userId,
              orderNumber,
              amount: SUBSCRIPTION_PRICE,
              orderDate: admin.firestore.FieldValue.serverTimestamp(),
              status: "failed",
              type: "subscription_recurring",
              paymentResult: paymentResponse.data,
              errorCode: errorCode,
              errorMessage: errorMsg,
              error: errorMsg,
            });

            // Update user with failed billing status
            await db.doc(`users/${userId}`).update({
              lastBillingAttemptStatus: "failed",
              lastBillingAttemptError: errorMsg,
              lastBillingAttemptAt:
                admin.firestore.FieldValue.serverTimestamp(),
            });

            // TODO: Notify user about failed payment (e.g., email notification)
          }
        } catch (err) {
          logger.error(
            `Error processing recurring payment for user ${userId}:`,
            err
          );
        }
      }

      logger.info(
        `Completed subscription renewal process for ${usersToRenew.size} users`
      );
    } catch (error) {
      logger.error("Error in processRecurringPayments:", error);
    }
  }
);

// Interface for subscription cancellation data
interface CancelSubscriptionData {
  reason?: string;
}

// Function to cancel subscription
export const cancelSubscription = onCall<CancelSubscriptionData>(
  functionConfig,
  async (request) => {
    try {
      // Ensure the user is authenticated
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required");
      }

      const userId = request.auth.uid;

      // Get user data
      const userDoc = await admin.firestore().doc(`users/${userId}`).get();
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();

      // Check if user has an active subscription
      if (!userData?.hasActiveSubscription) {
        throw new HttpsError(
          "failed-precondition",
          "No active subscription to cancel"
        );
      }

      // Update user subscription status
      await admin
        .firestore()
        .doc(`users/${userId}`)
        .update({
          hasActiveSubscription: false,
          subscriptionCancelledDate:
            admin.firestore.FieldValue.serverTimestamp(),
          cancellationReason:
            request.data.reason || "User requested cancellation",
        });

      return {
        success: true,
        message: "Subscription cancelled successfully",
      };
    } catch (error: any) {
      logger.error("Error cancelling subscription:", error);
      return {
        success: false,
        message: error.message || "Failed to cancel subscription",
      };
    }
  }
);
