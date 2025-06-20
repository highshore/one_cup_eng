import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import axios from "axios";
import { Timestamp } from "firebase-admin/firestore";
import { format } from "date-fns";
import { sendKakaoMessages } from "./index";

// Payple configuration from environment variables
// For v2 functions, config values are available as process.env.PAYPLE_CST_ID etc.
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
const PAYPLE_REMOTE_HOSTNAME =
  process.env.PAYPLE_REMOTE_HOSTNAME || "https://1cupenglish.com";
const PAYPLE_REFUND_KEY =
  process.env.PAYPLE_REFUND_KEY ||
  "196dddada23664e2d7f8d29dec674fc17c2f7d430213659bccf8f1b2940ae95f";

// Log config for debugging
logger.info("Payple configuration:", {
  cst_id_exists: !!PAYPLE_CST_ID,
  cust_key_exists: !!PAYPLE_CUST_KEY,
  client_key_exists: !!PAYPLE_CLIENT_KEY,
  auth_url: PAYPLE_AUTH_URL,
  hostname: PAYPLE_HOSTNAME,
  remote_hostname: PAYPLE_REMOTE_HOSTNAME,
  refund_key_exists: !!PAYPLE_REFUND_KEY,
});

// Check if required credentials are available
if (!PAYPLE_CST_ID || !PAYPLE_CUST_KEY || !PAYPLE_CLIENT_KEY) {
  logger.warn(
    "Missing Payple credentials in environment. This will cause issues in production but may be expected during local testing."
  );
}

// Subscription price in KRW
const SUBSCRIPTION_PRICE = 9900;

// Common function options for onCall functions that need CORS
const onCallFunctionConfig = {
  cors: true,
  region: "asia-northeast3",
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
async function getPaypleAuthToken(
  isCancel = false
): Promise<PaypleAuthResponse> {
  try {
    // Log full details of the auth request for debugging
    const requestData = {
      cst_id: PAYPLE_CST_ID,
      custKey: PAYPLE_CUST_KEY,
      PCD_PAY_TYPE: "card",
      PCD_SIMPLE_FLAG: "Y",
      PCD_PAY_WORK: "CERT",
      PCD_PAYCANCEL_FLAG: isCancel ? "Y" : "N",
    };

    logger.info("Payple auth request details:", {
      url: PAYPLE_AUTH_URL,
      referer: PAYPLE_HOSTNAME,
      cst_id: PAYPLE_CST_ID, // Log the actual value for debugging
      cst_id_length: PAYPLE_CST_ID?.length || 0,
      custKey_length: PAYPLE_CUST_KEY?.length || 0,
    });

    // Try direct authentication with minimal headers first
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
        message: response.data.result_msg || "No error message provided",
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
  userPhone?: string;
  pcd_amount: number;
  pcd_good_name: string;
  selected_categories: string[];
}

// Function to get payment window parameters
export const getPaymentWindow = onCall<PaymentWindowData>(
  {
    ...onCallFunctionConfig,
    secrets: [
      "PAYPLE_CST_ID",
      "PAYPLE_CUST_KEY",
      "PAYPLE_CLIENT_KEY",
      "PAYPLE_REFUND_KEY",
    ],
  },
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
      const {
        userId,
        userEmail,
        userName,
        userPhone,
        pcd_amount,
        pcd_good_name,
        selected_categories,
      } = request.data || {};

      // Log each field individually for debugging
      logger.info(`userId: ${userId || "missing"}`);
      logger.info(`userName: ${userName || "missing"}`);
      logger.info(`userPhone: ${userPhone || "missing"}`);
      logger.info(`pcd_amount: ${pcd_amount || "missing"}`);
      logger.info(`pcd_good_name: ${pcd_good_name || "missing"}`);
      logger.info(
        `selected_categories: ${JSON.stringify(selected_categories || {})}`
      );

      // Validate user information with specific error messages
      if (!userId) {
        logger.error("Missing userId in request data");
        throw new HttpsError("invalid-argument", "User ID is required");
      }

      // Validate email - make it optional
      let email = ""; // Default to empty string
      if (userEmail && userEmail.trim() !== "") {
        email = userEmail.trim();
        logger.info(`Using provided email: ${email}`);
      } else {
        logger.info("No userEmail provided, using empty string as fallback.");
      }
      // const email = userEmail; // Use the validated userEmail
      logger.info(`Using email: ${email}`);

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
      let payerPhoneNumber = userPhone || "";
      let displayName = userName || "구독자";

      // If no phone number provided in request data, try to get from Auth or Firestore
      if (!payerPhoneNumber) {
        try {
          const authUser = await admin.auth().getUser(request.auth.uid);
          if (authUser.phoneNumber) {
            // Format phone number from auth (remove country code and any non-digits)
            payerPhoneNumber = authUser.phoneNumber
              .replace(/^\+82/, "0")
              .replace(/\D/g, "");

            // Ensure the phone number is in the correct format
            if (payerPhoneNumber.length >= 10) {
              // Keep full phone number if it's valid (010xxxxxxxx)
              logger.debug(`Using full phone from Auth: ${payerPhoneNumber}`);
            } else {
              // Get just the last 8 digits and pad if needed
              payerPhoneNumber = payerPhoneNumber.slice(-8).padStart(8, "0");
              logger.debug(
                `Using phone from Auth (last 8 digits): ${payerPhoneNumber}`
              );
            }
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
            payerPhoneNumber = userData.phone
              .replace(/^\+82/, "0")
              .replace(/\D/g, "");

            if (payerPhoneNumber.length >= 10) {
              logger.debug(
                `Using full phone from Firestore as fallback: ${payerPhoneNumber}`
              );
            } else {
              payerPhoneNumber = payerPhoneNumber.slice(-8).padStart(8, "0");
              logger.debug(
                `Using phone from Firestore as fallback (last 8 digits): ${payerPhoneNumber}`
              );
            }
          }

          if (userData?.name) {
            displayName = userData.name;
            logger.debug(
              `Using name from Firestore as fallback: ${displayName}`
            );
          }
        }
      } else {
        // Format the provided phone number
        payerPhoneNumber = payerPhoneNumber.replace(/\D/g, "");

        if (payerPhoneNumber.length >= 10) {
          logger.debug(
            `Using full phone from request data: ${payerPhoneNumber}`
          );
        } else {
          payerPhoneNumber = payerPhoneNumber.slice(-8).padStart(8, "0");
          logger.debug(
            `Using phone from request data (last 8 digits): ${payerPhoneNumber}`
          );
        }
      }

      // Last resort fallback for phone number - generate a numeric value based on timestamp
      if (!payerPhoneNumber) {
        payerPhoneNumber = Date.now().toString().slice(-8);
        logger.warn(
          `No phone number found, using timestamp-based number: ${payerPhoneNumber}`
        );
      }

      // No need for auth token here, we're just opening the card registration window

      const orderDate = new Date();
      const orderMonth = (orderDate.getMonth() + 1).toString().padStart(2, "0");
      const orderDay = orderDate.getDate().toString().padStart(2, "0");
      const orderNumber = `OCE${orderDate.getFullYear()}${orderMonth}${orderDay}${Math.floor(
        Math.random() * 1000000
      )
        .toString()
        .padStart(6, "0")}`;

      // Create payment parameters for Payple - use server-side callback URL
      const paymentParams = {
        clientKey: PAYPLE_CLIENT_KEY,
        PCD_PAY_TYPE: "card",
        PCD_PAY_WORK: "CERT",
        PCD_CARD_VER: "01",

        // Required parameters
        PCD_PAY_GOODS: pcd_good_name || "영어 한잔 멤버십",
        PCD_PAY_TOTAL: pcd_amount,

        // Billing-specific parameters
        PCD_REGULER_FLAG: "Y",
        PCD_SIMPLE_FLAG: "Y",

        // Order details
        PCD_PAY_OID: orderNumber,
        PCD_PAY_YEAR: orderDate.getFullYear().toString(),
        PCD_PAY_MONTH: orderMonth,

        // Customer details - use user ID for consistency
        PCD_PAYER_NO: request.auth.uid,
        PCD_PAYER_NAME: displayName,
        PCD_PAYER_EMAIL: email,
        PCD_PAYER_HP: payerPhoneNumber,

        // Use our server-side Firebase Function endpoint to handle the POST
        PCD_RST_URL:
          "https://asia-northeast3-one-cup-eng.cloudfunctions.net/paymentCallback",
        PCD_PAYER_AUTHTYPE: "sms",

        // Store user ID in USER_DEFINE for the callback to access
        PCD_USER_DEFINE1: request.auth.uid,

        // Add a fallback URL for when Payple redirects the user after payment
        PCD_SIMPLE_FNAME: "payment-result",

        // Store selected categories in define2 (define1 used for userId)
        PCD_USER_DEFINE2: JSON.stringify(selected_categories || {}),
      };

      // Store the order in Firestore for later verification - Log initial attempt
      await admin
        .firestore()
        .collection("payment_orders")
        .doc(orderNumber)
        .set({
          userId: request.auth.uid,
          orderNumber,
          amount: pcd_amount, // Use amount from frontend
          orderDate: Timestamp.fromDate(orderDate),
          status: "pending_auth", // Indicate waiting for Payple auth/callback
          type: "subscription_init",
          paypleParamsAttempted: paymentParams, // Log the params we tried to use
          selectedCategories: selected_categories || {},
          createdAt: Timestamp.now(),
        });

      logger.info(
        `Payment window parameters prepared for user ${request.auth.uid}`
      );

      // Return data needed for frontend to open payment window
      return {
        success: true,
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
  {
    ...onCallFunctionConfig,
    secrets: [
      "PAYPLE_CST_ID",
      "PAYPLE_CUST_KEY",
      "PAYPLE_CLIENT_KEY",
      "PAYPLE_REFUND_KEY",
    ],
  },
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

      // Check if this is a CERT (billing key) response
      const isBillingKeyResponse =
        paymentParams.PCD_PAY_WORK === "CERT" ||
        (paymentParams.PCD_PAY_TYPE === "card" &&
          paymentParams.PCD_CARD_VER === "01" &&
          !paymentParams.PCD_PAY_GOODS);

      logger.info("Verification request type:", {
        isBillingKeyResponse,
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

      // Extract other important fields from the response
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

      // --- Fetch the original order to get dynamic amount and categories ---
      let originalAmount = SUBSCRIPTION_PRICE; // Default fallback
      let selectedCategories: { [key: string]: boolean } = {};
      let productName = "One Cup English 멤버십 (정기결제)"; // Default fallback

      if (paymentOrderId) {
        try {
          const originalOrderRef = admin
            .firestore()
            .collection("payment_orders")
            .doc(paymentOrderId);
          const originalOrderDoc = await originalOrderRef.get();

          if (!originalOrderDoc.exists) {
            logger.error(
              `Original payment order ${paymentOrderId} not found! Falling back to default amount/name.`
            );
            // Potentially throw an error here if this is critical
          } else {
            const orderData = originalOrderDoc.data();
            if (orderData?.amount && orderData.amount > 0) {
              originalAmount = orderData.amount;
              logger.info(
                `Retrieved dynamic amount ${originalAmount} from original order ${paymentOrderId}`
              );
            } else {
              logger.warn(
                `Original order ${paymentOrderId} has invalid amount: ${orderData?.amount}. Falling back to default.`
              );
            }
            if (orderData?.selectedCategories) {
              selectedCategories = orderData.selectedCategories;
              // Construct product name from categories
              let nameParts: string[] = [];
              if (selectedCategories.tech) nameParts.push("Tech");
              if (selectedCategories.business) nameParts.push("Business");
              if (selectedCategories.meetup) nameParts.push("Meetup");
              if (nameParts.length > 0) {
                productName = `One Cup English (${nameParts.join(
                  " + "
                )}) 멤버십`;
              }
              logger.info(`Constructed product name: ${productName}`);
            } else {
              logger.warn(
                `Original order ${paymentOrderId} missing selectedCategories.`
              );
            }
          }
        } catch (fetchError) {
          logger.error(
            `Error fetching original order ${paymentOrderId}:`,
            fetchError
          );
          // Fallback to defaults if fetch fails
        }
      }
      // --- End Fetch original order ---

      logger.info("Successfully stored billing key for user:", userId);

      // Now we need to make the actual first payment using the billing key
      // This follows the Payple documentation for the proper flow
      try {
        // Get a fresh auth token - this is the partner authentication step
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
          // Payple credentials (required) - use values from auth response
          PCD_CST_ID: authResponse.cst_id, // 가맹점 ID from auth response
          PCD_CUST_KEY: authResponse.custKey, // 가맹점 키 from auth response
          PCD_AUTH_KEY: authResponse.AuthKey, // 인증 키 from auth response

          // Payment details (required)
          PCD_PAY_TYPE: "card", // 결제 방법 (card)
          PCD_PAYER_ID: billingKey, // 빌링키 (callback response의 PCD_PAYER_ID)
          PCD_PAY_GOODS: productName, // << USE DYNAMIC NAME
          PCD_SIMPLE_FLAG: "Y", // 간편결제 여부 (빌링키는 Y로 설정)
          PCD_PAY_TOTAL: originalAmount, // << USE DYNAMIC AMOUNT
          PCD_PAY_OID: orderNumber, // 주문번호

          // Optional parameters for better tracking
          PCD_PAYER_NO:
            paymentParams.PCD_PAYER_NO || Date.now().toString().slice(-8), // Use same payer number or generate
          PCD_PAY_YEAR: new Date().getFullYear().toString(), // 결제 년도
          PCD_PAY_MONTH: (new Date().getMonth() + 1)
            .toString()
            .padStart(2, "0"), // 결제 월
          PCD_PAY_ISTAX: "Y", // 과세여부 (Y: 과세, N: 비과세)
          PCD_PAY_TAXTOTAL: Math.floor(originalAmount / 11).toString(), // 부가세 (자동계산)
        };

        logger.info("Making initial payment with billing key:", {
          billingKey,
          orderNumber,
          amount: originalAmount, // << Log dynamic amount
        });

        // Build the payment URL from the auth response
        let paymentURL = "";

        if (authResponse.PCD_PAY_HOST && authResponse.PCD_PAY_URL) {
          // If host is provided, use it with the URL path
          paymentURL = `${authResponse.PCD_PAY_HOST}${authResponse.PCD_PAY_URL}`;
          logger.info(`Using payment URL from auth response: ${paymentURL}`);
        } else {
          // Fallback to default URL - this is the actual payment endpoint
          paymentURL =
            "https://cpay.payple.kr/php/SimplePayCardAct.php?ACT_=PAYM";
          logger.info(`Using default payment URL: ${paymentURL}`);
        }

        // Log the payment URL for debugging
        logger.info("Making payment request to URL:", paymentURL);

        // Make the actual payment request to Payple using the billing key
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
          // --- Log SUCCESSFUL initial payment in payment_orders ---
          await admin
            .firestore()
            .collection("payment_orders")
            .doc(orderNumber) // Use the NEW orderNumber for this payment action
            .set({
              userId,
              orderNumber,
              amount: paymentResponse.data.PCD_PAY_TOTAL || originalAmount, // Log actual amount paid
              status: "completed",
              type: "subscription_initial_payment",
              paymentResult: paymentResponse.data, // Full Payple response
              billingKeyUsed: billingKey,
              paymentMethod: "card",
              completedAt: Timestamp.now(),
              relatedAuthOrder: paymentOrderId || null, // Link to the initial CERT order
              createdAt: Timestamp.now(), // Add creation timestamp
            });

          // --- Update user subscription status in Firestore ---
          const subscriptionStartDate = new Date();
          // Calculate end date (handle potential month rollover correctly)
          const subscriptionEndDate = new Date(subscriptionStartDate);
          subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

          await admin
            .firestore()
            .doc(`users/${userId}`)
            .update({
              hasActiveSubscription: true,
              subscriptionStartDate: Timestamp.fromDate(subscriptionStartDate),
              subscriptionEndDate: Timestamp.fromDate(subscriptionEndDate),
              billingKey: billingKey, // Store/confirm the billing key
              paymentMethod: "card", // Store/confirm payment method
              billingUpdatedAt: Timestamp.now(), // Timestamp for this billing key update
              cat_tech: selectedCategories.tech ?? false, // Set based on fetched categories
              cat_business: selectedCategories.business ?? false, // Set based on fetched categories
              // meetup status can also be stored if needed: cat_meetup: selectedCategories.meetup ?? false
            });

          logger.info("User subscription activated:", { userId });

          // Send Kakao message
          try {
            const authUser = await admin.auth().getUser(userId);
            let recipientNo = "";
            if (authUser.phoneNumber) {
              recipientNo = authUser.phoneNumber
                .replace(/^\+82/, "0") // Convert +8210... to 010...
                .replace(/\D/g, ""); // Remove non-digits
              logger.info(
                `Formatted phone number for Kakao: ${recipientNo} for user ${userId}`
              );

              if (recipientNo.startsWith("010") && recipientNo.length >= 10) {
                const kakaoRecipientList = [
                  {
                    recipientNo: recipientNo,
                    templateParameter: {
                      "customer-name": "고객",
                      link: "https://1cupenglish.com/guide",
                    },
                  },
                ];
                await sendKakaoMessages(kakaoRecipientList, "order-received");
                logger.info(
                  `Kakao message 'order-received' sent to user ${userId} at ${recipientNo}`
                );
              } else {
                logger.warn(
                  `User ${userId} has an invalid phone number for Kakao: ${recipientNo}. Skipping Kakao message.`
                );
              }
            } else {
              logger.warn(
                `User ${userId} does not have a phone number in Auth. Skipping Kakao message.`
              );
            }
          } catch (kakaoError) {
            logger.error(
              `Failed to send Kakao message to user ${userId}:`,
              kakaoError
            );
            // Do not let Kakao error fail the entire payment verification
          }

          return {
            success: true,
            message: "결제가 성공적으로 완료되었습니다.",
            data: paymentResponse.data,
          };
        } else {
          // --- Log FAILED initial payment in payment_orders ---
          await admin
            .firestore()
            .collection("payment_orders")
            .doc(orderNumber) // Use the NEW orderNumber for this payment action
            .set(
              {
                userId,
                orderNumber,
                amount: originalAmount, // << Use dynamic amount attempted
                status: "failed",
                type: "subscription_initial_payment",
                errorCode: paymentResponse.data.PCD_PAY_CODE || "unknown",
                errorMessage:
                  paymentResponse.data.PCD_PAY_MSG || "알 수 없는 오류",
                paymentResult: paymentResponse.data, // Full Payple response
                billingKeyUsed: billingKey,
                failedAt: Timestamp.now(),
                relatedAuthOrder: paymentOrderId || null, // Link to the initial CERT order
                createdAt: Timestamp.now(), // Add creation timestamp
              }
              // No merge needed as this is a new document for the payment attempt
            );

          throw new HttpsError(
            "aborted",
            `결제 실패: ${
              paymentResponse.data.PCD_PAY_MSG || "알 수 없는 오류"
            } (코드: ${paymentResponse.data.PCD_PAY_CODE || "unknown"})`
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
    schedule: "0 * * * *",
    timeZone: "Asia/Seoul",
    secrets: [
      "PAYPLE_CST_ID",
      "PAYPLE_CUST_KEY",
      "PAYPLE_CLIENT_KEY",
      "PAYPLE_REFUND_KEY",
    ],
    region: "asia-northeast3",
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
          logger.warn(
            `User ${userId} has no billing key, expiring subscription`
          );

          // Set hasActiveSubscription to false since billing cannot continue
          await db.doc(`users/${userId}`).update({
            hasActiveSubscription: false,
            subscriptionExpiredAt: Timestamp.now(),
          });

          logger.info(
            `Set hasActiveSubscription to false for user ${userId} (no billing key)`
          );
          continue;
        }

        // Skip if billing is cancelled by user
        if (userData.billingCancelled) {
          logger.warn(
            `User ${userId} has billing cancelled, expiring subscription but keeping billing key`
          );

          // Set hasActiveSubscription to false but keep billing key for easy reactivation
          await db.doc(`users/${userId}`).update({
            hasActiveSubscription: false,
            subscriptionExpiredAt: Timestamp.now(),
          });

          logger.info(
            `Set hasActiveSubscription to false for user ${userId} (billing cancelled)`
          );
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

          // --- Calculate user-specific price and product name ---
          let userSpecificPrice = 0;
          let nameParts: string[] = [];
          const techPrice = 4700;
          const businessPrice = 4700;

          if (userData.cat_tech) {
            userSpecificPrice += techPrice;
            nameParts.push("Tech");
          }
          if (userData.cat_business) {
            userSpecificPrice += businessPrice;
            nameParts.push("Business");
          }

          // Apply 20% discount if both are selected
          if (userData.cat_tech && userData.cat_business) {
            userSpecificPrice = Math.round(userSpecificPrice * 0.8);
            logger.info(
              `Applying 20% discount for user ${userId}, price: ${userSpecificPrice}`
            );
          }

          // Fallback if price calculation fails (shouldn't happen for active sub)
          if (userSpecificPrice <= 0) {
            logger.warn(
              `Calculated price for user ${userId} is ${userSpecificPrice}. Falling back to default price ${SUBSCRIPTION_PRICE}. Check cat_tech/cat_business flags.`
            );
            userSpecificPrice = SUBSCRIPTION_PRICE; // Fallback to default
            nameParts = ["프리미엄 멤버십"]; // Default name part
          }

          const productName = `One Cup English (${nameParts.join(
            " + "
          )}) 멤버십 (정기결제)`;
          logger.info(
            `Calculated recurring payment for user ${userId}: Price=${userSpecificPrice}, Name=${productName}`
          );
          // --- End Calculation ---

          // Create payment request for recurring payment - according to Payple documentation
          const paymentRequest = {
            // Payple credentials (required) - use values from auth response
            PCD_CST_ID: authResponse.cst_id, // 가맹점 ID from auth response
            PCD_CUST_KEY: authResponse.custKey, // 가맹점 키 from auth response
            PCD_AUTH_KEY: authResponse.AuthKey, // 인증 키 from auth response

            // Payment details (required)
            PCD_PAY_TYPE: "card", // 결제 방법 (card)
            PCD_PAYER_ID: userData.billingKey, // 빌링키 (이전 응답의 PCD_PAYER_ID)
            PCD_PAY_GOODS: productName, // << USE DYNAMIC NAME
            PCD_SIMPLE_FLAG: "Y", // 간편결제 여부 (빌링키는 Y로 설정)
            PCD_PAY_TOTAL: userSpecificPrice, // << USE DYNAMIC PRICE
            PCD_PAY_OID: orderNumber, // 주문번호

            // Optional parameters for better tracking - use consistent user ID
            PCD_PAYER_NO: userId, // Use consistent user ID
            PCD_PAY_YEAR: new Date().getFullYear().toString(), // 결제 년도
            PCD_PAY_MONTH: (new Date().getMonth() + 1)
              .toString()
              .padStart(2, "0"), // 결제 월
            PCD_PAY_ISTAX: "Y", // 과세여부 (Y: 과세, N: 비과세)
            PCD_PAY_TAXTOTAL: Math.floor(userSpecificPrice / 11).toString(), // << USE DYNAMIC PRICE for tax
          };

          // Call Payple API to process the recurring payment
          let paymentURL = "";

          // Build the payment URL from the auth response
          if (authResponse.PCD_PAY_HOST && authResponse.PCD_PAY_URL) {
            // If host is provided, use it with the URL path
            paymentURL = `${authResponse.PCD_PAY_HOST}${authResponse.PCD_PAY_URL}`;
            logger.info(`Using payment URL from auth response: ${paymentURL}`);
          } else {
            // Fallback to default URL
            paymentURL =
              "https://cpay.payple.kr/php/SimplePayCardAct.php?ACT_=PAYM";
            logger.info(`Using default payment URL: ${paymentURL}`);
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

            // --- Log SUCCESSFUL recurring payment in payment_orders ---
            await db
              .collection("payment_orders")
              .doc(orderNumber)
              .set({
                userId,
                orderNumber,
                amount: paymentResponse.data.PCD_PAY_TOTAL || userSpecificPrice, // << Log actual amount paid or attempted dynamic price
                orderDate: Timestamp.fromDate(orderDate),
                status: "completed",
                type: "subscription_recurring",
                paymentResult: paymentResponse.data,
                billingKeyUsed: userData.billingKey,
                paymentMethod: "card",
                completedAt: Timestamp.now(), // Use consistent field name
                createdAt: Timestamp.now(), // Add creation timestamp
              });

            // --- Update user subscription dates ---
            await db.doc(`users/${userId}`).update({
              subscriptionStartDate: Timestamp.fromDate(new Date()), // Set start to today
              subscriptionEndDate: Timestamp.fromDate(newEndDate), // Set end to one month from today
              lastBillingDate: Timestamp.now(), // Timestamp of this successful billing
              billingUpdatedAt: Timestamp.now(), // Billing key was just used successfully
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

            // --- Log FAILED recurring payment in payment_orders ---
            await db
              .collection("payment_orders")
              .doc(orderNumber)
              .set({
                userId,
                orderNumber,
                amount: userSpecificPrice, // << Log attempted dynamic amount
                orderDate: Timestamp.fromDate(orderDate),
                status: "failed",
                type: "subscription_recurring",
                paymentResult: paymentResponse.data, // Full Payple response
                billingKeyUsed: userData.billingKey,
                errorCode: errorCode,
                errorMessage: errorMsg,
                failedAt: Timestamp.now(), // Use consistent field name
                createdAt: Timestamp.now(), // Add creation timestamp
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

// Interface for stopping next billing without refund
interface StopNextBillingData {
  reason?: string;
}

// Function to cancel subscription
export const cancelSubscription = onCall<CancelSubscriptionData>(
  {
    ...onCallFunctionConfig,
    secrets: [
      "PAYPLE_CST_ID",
      "PAYPLE_CUST_KEY",
      "PAYPLE_CLIENT_KEY",
      "PAYPLE_REFUND_KEY",
    ],
  },
  async (request) => {
    const db = admin.firestore();
    try {
      // Ensure the user is authenticated
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required");
      }

      const userId = request.auth.uid;
      const cancellationReason = request.data?.reason || "User requested";

      // Get user data
      const userDocRef = db.doc(`users/${userId}`);
      const userDoc = await userDocRef.get();
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

      // --- Find the last successful payment to refund ---
      const lastPaymentQuery = await db
        .collection("payment_orders")
        .where("userId", "==", userId)
        .where("status", "==", "completed") // Only successful payments
        .orderBy("completedAt", "desc") // Get the most recent
        .limit(1)
        .get();

      if (lastPaymentQuery.empty) {
        logger.error(
          `No successful payment found for user ${userId} to refund.`
        );
        // If no payment found, maybe just deactivate locally?
        // For now, let's throw an error, as refund is expected.
        throw new HttpsError(
          "not-found",
          "취소할 결제 내역을 찾을 수 없습니다."
        );
      }

      const lastPaymentDoc = lastPaymentQuery.docs[0];
      const lastPaymentData = lastPaymentDoc.data();
      const originalOrderId = lastPaymentData.orderNumber; // PCD_PAY_OID for refund
      const originalPaymentAmount = lastPaymentData.amount; // PCD_REFUND_TOTAL basis

      if (!originalOrderId || !originalPaymentAmount) {
        logger.error(
          `Missing critical data from last payment order ${lastPaymentDoc.id} for user ${userId}.`
        );
        throw new HttpsError(
          "internal",
          "마지막 결제 정보가 불완전하여 환불을 진행할 수 없습니다."
        );
      }
      logger.info(
        `Found last payment for refund: OrderID=${originalOrderId}, Amount=${originalPaymentAmount}`
      );

      // --- Calculate Refund Amount ---
      const today = new Date();
      const timeDiff =
        today.getTime() - lastPaymentData.completedAt.toDate().getTime();
      const daysPassed = Math.ceil(timeDiff / (1000 * 3600 * 24)); // Calculate days passed

      let refundAmount = 0;
      if (daysPassed < 7) {
        refundAmount = originalPaymentAmount; // Full refund
        logger.info(
          `User ${userId}: ${daysPassed} days passed. Processing full refund: ${refundAmount}`
        );
      } else {
        // Assuming a 30-day month for proration as per policy
        const proratedAmount = Math.round(
          (originalPaymentAmount * (30 - daysPassed)) / 30
        );
        refundAmount = Math.max(0, proratedAmount); // Ensure refund is not negative
        logger.info(
          `User ${userId}: ${daysPassed} days passed. Processing prorated refund: ${refundAmount}`
        );
      }

      // --- Call Payple Refund API ---
      if (refundAmount > 0) {
        try {
          // 1. Get Auth Token for Cancellation
          const authResponse = await getPaypleAuthToken(true); // Pass true for cancel flag
          logger.info(
            `Auth token obtained for cancellation for user ${userId}`
          );

          // --- Extract date from Payple's PCD_PAY_TIME ---
          let payDateFromPaypleTime = "";
          const payplePaymentResult = lastPaymentData.paymentResult; // Get the map
          const pcdPayTime = payplePaymentResult?.PCD_PAY_TIME; // Get the timestamp string

          if (
            pcdPayTime &&
            typeof pcdPayTime === "string" &&
            pcdPayTime.length >= 8
          ) {
            payDateFromPaypleTime = pcdPayTime.substring(0, 8); // Extract YYYYMMDD
            logger.info(
              `Extracted date ${payDateFromPaypleTime} from PCD_PAY_TIME (${pcdPayTime}) in paymentResult for Order ID ${originalOrderId}`
            );
          } else {
            // Fallback or error if PCD_PAY_TIME is missing or invalid
            logger.error(
              `Could not extract YYYYMMDD date from PCD_PAY_TIME in paymentResult for Order ID: ${originalOrderId}. Falling back to using completedAt date.`
            );
            // Fallback to formatting completedAt, though likely incorrect
            const originalPaymentDate = lastPaymentData.completedAt.toDate();
            payDateFromPaypleTime = format(originalPaymentDate, "yyyyMMdd");
          }
          // --- End Extract date ---

          // 2. Prepare Cancellation Request
          const refundApiUrl =
            "https://cpay.payple.kr/php/account/api/cPayCAct.php"; // Use production URL
          const cancellationRequest = {
            PCD_CST_ID: authResponse.cst_id,
            PCD_CUST_KEY: authResponse.custKey,
            PCD_AUTH_KEY: authResponse.AuthKey,
            PCD_REFUND_KEY: PAYPLE_REFUND_KEY, // The specific key for refunds
            PCD_PAYCANCEL_FLAG: "Y",
            PCD_PAY_OID: originalOrderId, // Original Order ID (Your ID)
            PCD_PAY_DATE: payDateFromPaypleTime, // << USE DATE EXTRACTED FROM PCD_PAY_TIME
            PCD_REFUND_TOTAL: refundAmount.toString(), // Amount to refund
            // Optional: PCD_REFUND_REASON: cancellationReason
          };

          // Log the exact parameters being sent for cancellation
          logger.info(
            `Sending Payple cancellation request with: OID=${cancellationRequest.PCD_PAY_OID}, Date=${cancellationRequest.PCD_PAY_DATE}, Amount=${cancellationRequest.PCD_REFUND_TOTAL}`
          );

          logger.info(
            `Attempting Payple refund for user ${userId}, OrderID: ${originalOrderId}, Amount: ${refundAmount}`,
            { request: cancellationRequest }
          );

          // 3. Make Cancellation Request
          const cancelResponse = await axios.post(
            refundApiUrl,
            cancellationRequest,
            {
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
                referer: PAYPLE_HOSTNAME,
              },
            }
          );

          logger.info(
            `Payple refund response for user ${userId}:`,
            JSON.stringify(cancelResponse.data)
          );

          // 4. Check Response
          if (cancelResponse.data?.PCD_PAY_RST !== "success") {
            const errorCode = cancelResponse.data?.PCD_PAY_CODE || "unknown";
            const errorMsg =
              cancelResponse.data?.PCD_PAY_MSG ||
              "환불 처리 중 페이플 오류 발생";
            logger.error(
              `Payple refund failed for user ${userId}, OrderID: ${originalOrderId}: ${errorMsg} (Code: ${errorCode})`
            );
            // Log this failed refund attempt
            await db.collection("payment_cancellations").add({
              userId,
              originalOrderId,
              requestedAt: Timestamp.now(),
              status: "failed",
              refundAmountAttempted: refundAmount,
              reason: cancellationReason,
              paypleErrorCode: errorCode,
              paypleErrorMessage: errorMsg,
              paypleResponse: cancelResponse.data,
            });
            throw new HttpsError(
              "aborted",
              `환불 실패: ${errorMsg} (코드: ${errorCode})`
            );
          }

          // --- Log Successful Refund ---
          await db.collection("payment_cancellations").add({
            userId,
            originalOrderId,
            requestedAt: Timestamp.now(),
            status: "completed",
            refundAmountProcessed: refundAmount,
            reason: cancellationReason,
            paypleResponse: cancelResponse.data,
          });
          logger.info(
            `Successfully processed Payple refund for user ${userId}, OrderID: ${originalOrderId}, Amount: ${refundAmount}`
          );
        } catch (refundError: any) {
          logger.error(
            `Error during Payple refund process for user ${userId}:`,
            refundError
          );
          if (axios.isAxiosError(refundError)) {
            logger.error("Axios error details:", {
              status: refundError.response?.status,
              data: refundError.response?.data,
            });
          }
          // Throw error to prevent Firestore update if refund fails
          throw new HttpsError(
            "internal",
            "페이플 환불 요청 중 오류 발생: " +
              (refundError.message || refundError)
          );
        }
      } else {
        logger.info(
          `User ${userId}: Refund amount calculated is 0. Skipping Payple refund call.`
        );
        logger.info(
          `Attempting to log 'completed_no_refund' to payment_cancellations for order ${originalOrderId}`
        );
        try {
          await db.collection("payment_cancellations").add({
            userId,
            originalOrderId,
            requestedAt: Timestamp.now(),
            status: "completed_no_refund",
            refundAmountProcessed: 0,
            reason: cancellationReason,
          });
          logger.info(
            `Successfully logged 'completed_no_refund' to payment_cancellations for order ${originalOrderId}`
          );
        } catch (logError) {
          logger.error(
            `!!! Failed to log 'completed_no_refund' to payment_cancellations for order ${originalOrderId}`,
            logError
          );
          // Decide if we should still proceed or throw here?
          // For now, let's log the error but allow the user update to proceed,
          // as the core logic (no refund needed) is sound.
          // Consider throwing if this logging is critical: throw new HttpsError('internal', 'Failed to log cancellation record');
        }
      }

      // --- Update user subscription status in Firestore (ONLY AFTER SUCCESSFUL REFUND or if refundAmount is 0) ---
      await userDocRef.update({
        hasActiveSubscription: false,
        subscriptionEndDate: Timestamp.now(), // Mark end date as now
        billingKey: admin.firestore.FieldValue.delete(), // Remove billing key
        paymentMethod: null,
        billingUpdatedAt: Timestamp.now(),
        // Keep cat_tech/cat_business as they are? Or clear them?
        // Clearing them makes sense if subscription is truly ended.
        cat_tech: false,
        cat_business: false,
        cancellationTimestamp: Timestamp.now(), // Add cancellation timestamp
      });

      logger.info(
        "Subscription cancelled and Firestore updated for user:",
        userId
      );

      // Send Kakao message for cancellation
      try {
        const authUser = await admin.auth().getUser(userId);
        let recipientNo = "";
        if (authUser.phoneNumber) {
          recipientNo = authUser.phoneNumber
            .replace(/^\+82/, "0") // Convert +8210... to 010...
            .replace(/\D/g, ""); // Remove non-digits
          logger.info(
            `Formatted phone number for Kakao (cancel): ${recipientNo} for user ${userId}`
          );

          if (recipientNo.startsWith("010") && recipientNo.length >= 10) {
            const kakaoRecipientList = [
              {
                recipientNo: recipientNo,
                templateParameter: {},
              },
            ];
            await sendKakaoMessages(kakaoRecipientList, "membership-cancelled");
            logger.info(
              `Kakao message 'membership-cancelled' sent to user ${userId} at ${recipientNo}`
            );
          } else {
            logger.warn(
              `User ${userId} has an invalid phone number for Kakao (cancel): ${recipientNo}. Skipping Kakao message.`
            );
          }
        } else {
          logger.warn(
            `User ${userId} does not have a phone number in Auth (cancel). Skipping Kakao message.`
          );
        }
      } catch (kakaoError) {
        logger.error(
          `Failed to send 'membership-cancelled' Kakao message to user ${userId}:`,
          kakaoError
        );
        // Do not let Kakao error fail the entire cancellation process
      }

      return {
        success: true,
        message: `구독이 성공적으로 취소되었습니다. ${
          refundAmount > 0
            ? `환불 처리된 금액: ${refundAmount.toLocaleString()}원.`
            : "환불 대상 금액이 없습니다."
        }`,
        refundAmount: refundAmount,
      };
    } catch (error: any) {
      logger.error(
        `Error cancelling subscription for user ${request.auth?.uid}:`,
        error
      );
      // Ensure HttpsError is thrown for frontend handling
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        error.message || "구독 취소 중 서버 오류가 발생했습니다."
      );
    }
  }
);

// Function to log credentials (for debugging only)
export const logCredentials = onCall(
  {
    ...onCallFunctionConfig,
    enforceAppCheck: false,
    invoker: "public",
  },
  async (request) => {
    // This function just logs credential info for debugging
    return {
      success: true,
      cst_id_exists: !!PAYPLE_CST_ID,
      cst_id_length: PAYPLE_CST_ID?.length || 0,
      cust_key_exists: !!PAYPLE_CUST_KEY,
      cust_key_length: PAYPLE_CUST_KEY?.length || 0,
      client_key_exists: !!PAYPLE_CLIENT_KEY,
      client_key_length: PAYPLE_CLIENT_KEY?.length || 0,
    };
  }
);

// HTTP function to handle the Payple POST callback
export const paymentCallback = onRequest(
  {
    cors: true,
    region: "asia-northeast3",
    secrets: [
      "PAYPLE_CST_ID",
      "PAYPLE_CUST_KEY",
      "PAYPLE_CLIENT_KEY",
      "PAYPLE_REFUND_KEY",
    ],
  },
  async (req, res) => {
    // Log the entire request for debugging
    logger.info("Received payment callback", {
      method: req.method,
      path: req.path,
      headers: req.headers,
      query: req.query,
      body: req.body,
    });

    try {
      // Extract payment data from POST body or query parameters
      const paymentData = req.method === "POST" ? req.body : req.query;

      if (!paymentData || Object.keys(paymentData).length === 0) {
        logger.error("No payment data received in callback");
        res.status(400).send("No payment data received");
        return;
      }

      logger.info("Payment data received:", paymentData);

      // Get the user ID from the user define field
      const userId = paymentData.PCD_USER_DEFINE1 || "unknown_user";

      // Store the payment data in Firestore
      const paymentId = paymentData.PCD_PAY_OID || `payment_${Date.now()}`;

      // Process the payment result if this is a successful payment
      if (paymentData.PCD_PAY_RST === "success") {
        try {
          // Update user with billing key if available
          const billingKey = paymentData.PCD_PAYER_ID;

          if (billingKey && userId !== "unknown_user") {
            // Update user record with billing key
            await admin.firestore().doc(`users/${userId}`).update({
              billingKey: billingKey,
              paymentMethod: "card",
              billingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            logger.info(
              `Updated user ${userId} with billing key ${billingKey}`
            );

            // Make initial payment if this is a billing key registration (AUTH/CERT)
            if (paymentData.PCD_PAY_WORK === "CERT") {
              // For now, just log that we would make a payment
              // This avoids unused variable errors while we're debugging
              logger.info(
                `Would make initial payment for user ${userId} with billing key ${billingKey}`
              );

              // TODO: Implement actual payment using getPaypleAuthToken() and
              // making a request to Payple's payment endpoint
            }
          }
        } catch (processError) {
          logger.error("Error processing payment:", processError);
          // Continue with redirection even if processing fails
        }
      }
      // <<< START REVERT COMMENT OUT
      /* <<< REMOVE
      await admin.firestore().collection("payment_callbacks").doc(paymentId).set({
        userId,
        paymentData,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        method: req.method
      });
      logger.info(`Stored payment callback data with ID: ${paymentId} for user: ${userId}`);
      */ // <<< REMOVE
      // <<< END REVERT COMMENT OUT

      // Create URL parameters to pass to the frontend
      const redirectParams = new URLSearchParams();
      Object.keys(paymentData).forEach((key) => {
        redirectParams.append(key, String(paymentData[key]));
      });

      // Add payment ID for tracking
      redirectParams.append("payment_id", paymentId);

      // Redirect to the frontend result page with the payment data as query parameters
      const frontendUrl = `https://1cupenglish.com/payment/result?${redirectParams.toString()}`;

      logger.info(`Redirecting to: ${frontendUrl}`);
      res.redirect(303, frontendUrl);
      return;
    } catch (error) {
      logger.error("Error processing payment callback:", error);
      res.status(500).send("Error processing payment callback");
      return;
    }
  }
);

// Function to stop next billing without refund
export const stopNextBilling = onCall<StopNextBillingData>(
  {
    ...onCallFunctionConfig,
    secrets: [
      "PAYPLE_CST_ID",
      "PAYPLE_CUST_KEY",
      "PAYPLE_CLIENT_KEY",
      "PAYPLE_REFUND_KEY",
    ],
  },
  async (request) => {
    const db = admin.firestore();
    try {
      // Ensure the user is authenticated
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required");
      }

      const userId = request.auth.uid;
      const cancellationReason =
        request.data?.reason || "User requested stop billing";

      // Get user data
      const userDocRef = db.doc(`users/${userId}`);
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();

      // Check if user has an active subscription
      if (!userData?.hasActiveSubscription) {
        throw new HttpsError(
          "failed-precondition",
          "No active subscription to stop"
        );
      }

      // Calculate the subscription end date (current period end)
      const nextBillingDate =
        userData.subscriptionEndDate?.toDate() || new Date();

      // Update user subscription status in Firestore
      await userDocRef.update({
        // Keep billingKey intact so user can easily reactivate
        cancellationTimestamp: Timestamp.now(),
        cancellationType: "stop_billing",
        cancellationReason: cancellationReason,
        billingCancelled: true, // Flag to indicate billing was cancelled but subscription is still active
        // Keep cat_tech/cat_business active until subscription ends
        // Keep subscriptionEndDate unchanged - user continues until this date
      });

      // Log the billing stop action
      await db.collection("billing_stops").add({
        userId,
        requestedAt: Timestamp.now(),
        originalEndDate: nextBillingDate,
        reason: cancellationReason,
        status: "completed",
      });

      logger.info(
        `Billing stopped for user ${userId}. Service will continue until ${nextBillingDate.toISOString()}`
      );

      // Send Kakao message for billing stop
      try {
        const authUser = await admin.auth().getUser(userId);
        let recipientNo = "";
        if (authUser.phoneNumber) {
          recipientNo = authUser.phoneNumber
            .replace(/^\+82/, "0") // Convert +8210... to 010...
            .replace(/\D/g, ""); // Remove non-digits

          if (recipientNo.startsWith("010") && recipientNo.length >= 10) {
            const kakaoRecipientList = [
              {
                recipientNo: recipientNo,
                templateParameter: {
                  endDate: format(nextBillingDate, "yyyy년 MM월 dd일"),
                },
              },
            ];
            await sendKakaoMessages(kakaoRecipientList, "billing-stopped");
            logger.info(
              `Kakao message 'billing-stopped' sent to user ${userId} at ${recipientNo}`
            );
          } else {
            logger.warn(
              `User ${userId} has an invalid phone number for Kakao: ${recipientNo}. Skipping Kakao message.`
            );
          }
        } else {
          logger.warn(
            `User ${userId} does not have a phone number in Auth. Skipping Kakao message.`
          );
        }
      } catch (kakaoError) {
        logger.error(
          `Failed to send 'billing-stopped' Kakao message to user ${userId}:`,
          kakaoError
        );
        // Do not let Kakao error fail the entire process
      }

      return {
        success: true,
        message:
          "다음 결제가 성공적으로 중단되었습니다. 현재 구독 기간까지는 서비스를 계속 이용하실 수 있습니다.",
        subscriptionEndDate: nextBillingDate.toISOString(),
      };
    } catch (error: any) {
      logger.error(
        `Error stopping billing for user ${request.auth?.uid}:`,
        error
      );
      // Ensure HttpsError is thrown for frontend handling
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        error.message || "결제 중단 중 서버 오류가 발생했습니다."
      );
    }
  }
);
