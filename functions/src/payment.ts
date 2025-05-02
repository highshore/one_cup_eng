import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import axios from "axios";
import { Timestamp } from "firebase-admin/firestore";

// Payple configuration from environment variables
// For v2 functions, config values are available as process.env.PAYPLE_CST_ID etc.
const PAYPLE_CST_ID = process.env.PAYPLE_CST_ID || "eklass";
const PAYPLE_CUST_KEY = process.env.PAYPLE_CUST_KEY || "152ca21974f01290cb85d75279313e9fc7f7846d90f92af3ac2fd9a552d3cc06";
const PAYPLE_CLIENT_KEY = process.env.PAYPLE_CLIENT_KEY || "87D77596FABD4476364691DCE189C90B";
const PAYPLE_AUTH_URL = process.env.PAYPLE_AUTH_URL || "https://cpay.payple.kr/php/auth.php";
const PAYPLE_HOSTNAME = process.env.PAYPLE_HOSTNAME || "https://1cupenglish.com";
const PAYPLE_REMOTE_HOSTNAME = process.env.PAYPLE_REMOTE_HOSTNAME || "https://1cupenglish.com";
const PAYPLE_REFUND_KEY = process.env.PAYPLE_REFUND_KEY || "196dddada23664e2d7f8d29dec674fc17c2f7d430213659bccf8f1b2940ae95f";

// Log config for debugging
logger.info("Payple configuration:", {
  cst_id_exists: !!PAYPLE_CST_ID,
  cust_key_exists: !!PAYPLE_CUST_KEY,
  client_key_exists: !!PAYPLE_CLIENT_KEY,
  auth_url: PAYPLE_AUTH_URL,
  hostname: PAYPLE_HOSTNAME,
  remote_hostname: PAYPLE_REMOTE_HOSTNAME,
  refund_key_exists: !!PAYPLE_REFUND_KEY
});

// Check if required credentials are available
if (!PAYPLE_CST_ID || !PAYPLE_CUST_KEY || !PAYPLE_CLIENT_KEY) {
  logger.warn("Missing Payple credentials in environment. This will cause issues in production but may be expected during local testing.");
}

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
      PCD_PAY_WORK: "CERT",
      PCD_PAYCANCEL_FLAG: "N",
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
        "referer": PAYPLE_HOSTNAME
      }
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
    ...functionConfig,
    secrets: [
      "PAYPLE_CST_ID",
      "PAYPLE_CUST_KEY",
      "PAYPLE_CLIENT_KEY",
      "PAYPLE_REFUND_KEY"
    ]
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
          selected_categories 
      } = request.data || {};

      // Log each field individually for debugging
      logger.info(`userId: ${userId || "missing"}`);
      logger.info(`userEmail: ${userEmail || "missing"}`);
      logger.info(`userName: ${userName || "missing"}`);
      logger.info(`userPhone: ${userPhone || "missing"}`);
      logger.info(`pcd_amount: ${pcd_amount || "missing"}`);
      logger.info(`pcd_good_name: ${pcd_good_name || "missing"}`);
      logger.info(`selected_categories: ${JSON.stringify(selected_categories || {})}`);

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
            
            // Get just the last 8 digits
            payerPhoneNumber = payerPhoneNumber.slice(-8).padStart(8, "0");
            logger.debug(`Using phone from Auth (last 8 digits): ${payerPhoneNumber}`);
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
            payerPhoneNumber = userData.phone.replace(/^\+82/, "0").replace(/\D/g, "");
            payerPhoneNumber = payerPhoneNumber.slice(-8).padStart(8, "0");
            logger.debug(`Using phone from Firestore as fallback (last 8 digits): ${payerPhoneNumber}`);
          }

          if (userData?.name) {
            displayName = userData.name;
            logger.debug(`Using name from Firestore as fallback: ${displayName}`);
          }
        }
      } else {
        // Format the provided phone number and take last 8 digits
        payerPhoneNumber = payerPhoneNumber.replace(/\D/g, "");
        payerPhoneNumber = payerPhoneNumber.slice(-8).padStart(8, "0");
        logger.debug(`Using phone from request data (last 8 digits): ${payerPhoneNumber}`);
      }

      // Last resort fallback for phone number - generate a numeric value based on timestamp
      if (!payerPhoneNumber) {
        payerPhoneNumber = Date.now().toString().slice(-8);
        logger.warn(`No phone number found, using timestamp-based number: ${payerPhoneNumber}`);
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
        
        // Customer details
        PCD_PAYER_NO: payerPhoneNumber,
        PCD_PAYER_NAME: displayName,
        PCD_PAYER_EMAIL: email,
        PCD_PAYER_HP: payerPhoneNumber,
        
        // Use our server-side Firebase Function endpoint to handle the POST
        PCD_RST_URL: "https://us-central1-one-cup-eng.cloudfunctions.net/paymentCallback",
        PCD_PAYER_AUTHTYPE: "sms",
        
        // Store user ID in USER_DEFINE for the callback to access
        PCD_USER_DEFINE1: request.auth.uid,
        
        // Add a fallback URL for when Payple redirects the user after payment
        PCD_SIMPLE_FNAME: "payment-result",

        // Store selected categories in define2 (define1 used for userId)
        PCD_USER_DEFINE2: JSON.stringify(selected_categories || {})
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
    ...functionConfig,
    secrets: [
      "PAYPLE_CST_ID",
      "PAYPLE_CUST_KEY",
      "PAYPLE_CLIENT_KEY",
      "PAYPLE_REFUND_KEY"
    ]
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
          const originalOrderRef = admin.firestore().collection("payment_orders").doc(paymentOrderId);
          const originalOrderDoc = await originalOrderRef.get();
          
          if (!originalOrderDoc.exists) {
            logger.error(`Original payment order ${paymentOrderId} not found! Falling back to default amount/name.`);
            // Potentially throw an error here if this is critical
          } else {
            const orderData = originalOrderDoc.data();
            if (orderData?.amount && orderData.amount > 0) {
              originalAmount = orderData.amount;
              logger.info(`Retrieved dynamic amount ${originalAmount} from original order ${paymentOrderId}`);
            } else {
               logger.warn(`Original order ${paymentOrderId} has invalid amount: ${orderData?.amount}. Falling back to default.`);
            }
            if (orderData?.selectedCategories) {
               selectedCategories = orderData.selectedCategories;
               // Construct product name from categories
               let nameParts: string[] = [];
               if (selectedCategories.tech) nameParts.push("Tech");
               if (selectedCategories.business) nameParts.push("Business");
               if (selectedCategories.meetup) nameParts.push("Meetup");
               if (nameParts.length > 0) {
                   productName = `One Cup English (${nameParts.join(' + ')}) 멤버십`;
               }
               logger.info(`Constructed product name: ${productName}`);
            } else {
                logger.warn(`Original order ${paymentOrderId} missing selectedCategories.`);
            }
          }
        } catch (fetchError) {
          logger.error(`Error fetching original order ${paymentOrderId}:`, fetchError);
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
          PCD_PAYER_NO: paymentParams.PCD_PAYER_NO || Date.now().toString().slice(-8), // Use same payer number or generate
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
          paymentURL = "https://cpay.payple.kr/php/SimplePayCardAct.php?ACT_=PAYM";
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
            .set({
                userId,
                orderNumber,
                amount: originalAmount, // << Use dynamic amount attempted
                status: "failed",
                type: "subscription_initial_payment",
                errorCode: paymentResponse.data.PCD_PAY_CODE || "unknown",
                errorMessage: paymentResponse.data.PCD_PAY_MSG || "알 수 없는 오류",
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
            `결제 실패: ${paymentResponse.data.PCD_PAY_MSG || "알 수 없는 오류"} (코드: ${paymentResponse.data.PCD_PAY_CODE || "unknown"})`
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
    schedule: "every day 00:05",
    timeZone: "Asia/Seoul",
    secrets: [
      "PAYPLE_CST_ID",
      "PAYPLE_CUST_KEY",
      "PAYPLE_CLIENT_KEY",
      "PAYPLE_REFUND_KEY"
    ]
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
            // Payple credentials (required) - use values from auth response
            PCD_CST_ID: authResponse.cst_id, // 가맹점 ID from auth response
            PCD_CUST_KEY: authResponse.custKey, // 가맹점 키 from auth response
            PCD_AUTH_KEY: authResponse.AuthKey, // 인증 키 from auth response

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

          // Build the payment URL from the auth response
          if (authResponse.PCD_PAY_HOST && authResponse.PCD_PAY_URL) {
            // If host is provided, use it with the URL path
            paymentURL = `${authResponse.PCD_PAY_HOST}${authResponse.PCD_PAY_URL}`;
            logger.info(`Using payment URL from auth response: ${paymentURL}`);
          } else {
            // Fallback to default URL
            paymentURL = "https://cpay.payple.kr/php/SimplePayCardAct.php?ACT_=PAYM";
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
            await db.collection("payment_orders").doc(orderNumber).set({
              userId,
              orderNumber,
              amount: paymentResponse.data.PCD_PAY_TOTAL || SUBSCRIPTION_PRICE, // Log actual amount paid
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
            await db.collection("payment_orders").doc(orderNumber).set({
              userId,
              orderNumber,
              amount: SUBSCRIPTION_PRICE, // Log attempted amount
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

// Function to cancel subscription
export const cancelSubscription = onCall<CancelSubscriptionData>(
  {
    ...functionConfig,
    secrets: [
      "PAYPLE_CST_ID",
      "PAYPLE_CUST_KEY",
      "PAYPLE_CLIENT_KEY",
      "PAYPLE_REFUND_KEY"
    ]
  },
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
          subscriptionEndDate: Timestamp.fromDate(new Date()),
          billingKey: null,
          paymentMethod: null,
          billingUpdatedAt: Timestamp.now(),
          cat_tech: false,
          cat_business: false,
        });

      logger.info("Subscription cancelled for user:", userId);

      return {
        success: true,
        message: "구독이 성공적으로 취소되었습니다.",
      };
    } catch (error: any) {
      logger.error("Error cancelling subscription:", error);
      throw new HttpsError(
        "internal",
        error.message || "Failed to cancel subscription"
      );
    }
  }
);

// Function to log credentials (for debugging only)
export const logCredentials = onCall(
  {
    ...functionConfig,
    enforceAppCheck: false,
    invoker: "public"
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
      client_key_length: PAYPLE_CLIENT_KEY?.length || 0
    };
  }
);

// HTTP function to handle the Payple POST callback
export const paymentCallback = onRequest(
  {
    cors: true,
    region: "us-central1",
    secrets: [
      "PAYPLE_CST_ID",
      "PAYPLE_CUST_KEY",
      "PAYPLE_CLIENT_KEY",
      "PAYPLE_REFUND_KEY"
    ]
  },
  async (req, res) => {
    // Log the entire request for debugging
    logger.info("Received payment callback", {
      method: req.method,
      path: req.path,
      headers: req.headers,
      query: req.query,
      body: req.body
    });

    try {
      // Extract payment data from POST body or query parameters
      const paymentData = req.method === 'POST' ? req.body : req.query;
      
      if (!paymentData || Object.keys(paymentData).length === 0) {
        logger.error("No payment data received in callback");
        res.status(400).send("No payment data received");
        return;
      }

      logger.info("Payment data received:", paymentData);

      // Get the user ID from the user define field
      const userId = paymentData.PCD_USER_DEFINE1 || 'unknown_user';
      
      // Store the payment data in Firestore
      const paymentId = paymentData.PCD_PAY_OID || `payment_${Date.now()}`;
      
      // Process the payment result if this is a successful payment
      if (paymentData.PCD_PAY_RST === 'success') {
        try {
          // Update user with billing key if available
          const billingKey = paymentData.PCD_PAYER_ID;
          
          if (billingKey && userId !== 'unknown_user') {
            // Update user record with billing key
            await admin.firestore().doc(`users/${userId}`).update({
              billingKey: billingKey,
              paymentMethod: "card",
              billingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            logger.info(`Updated user ${userId} with billing key ${billingKey}`);
            
            // Make initial payment if this is a billing key registration (AUTH/CERT)
            if (paymentData.PCD_PAY_WORK === 'CERT') {
              // For now, just log that we would make a payment
              // This avoids unused variable errors while we're debugging
              logger.info(`Would make initial payment for user ${userId} with billing key ${billingKey}`);
              
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
      Object.keys(paymentData).forEach(key => {
        redirectParams.append(key, String(paymentData[key]));
      });
      
      // Add payment ID for tracking
      redirectParams.append('payment_id', paymentId);
      
      // Redirect to the frontend result page with the payment data as query parameters
      const frontendUrl = `https://1cupenglish.com/payment-result?${redirectParams.toString()}`;
      
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