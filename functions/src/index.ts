import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";
import cors from "cors";
import express from "express";
import axios from "axios";

// Export payment service directly from the payment module
export * from './payment';

admin.initializeApp();

interface LinkData {
  url: string;
  articleId: string;
  koreanTitle?: string;
  updated_at?: admin.firestore.Timestamp;
}

interface UserData {
  name: string;
  left_count: number;
  cat_business: boolean;
  cat_tech: boolean;
  phone: string;
}

// Extracted core logic into a reusable function that can run in normal or test mode
async function processAndSendLinks(testMode: boolean = false): Promise<{
  techCount: number;
  businessCount: number;
  expiryCount: number;
}> {
  try {
    const db = admin.firestore();

    // Test mode configuration - easily toggle these values
    const TEST_MODE_ENABLED = testMode;
    const TEST_PHONE_NUMBERS = ["01068584123", "01045430406"];

    if (TEST_MODE_ENABLED) {
      logger.info(
        `Running in TEST MODE for specific recipients: ${TEST_PHONE_NUMBERS.join(
          ", "
        )}`
      );
    } else {
      logger.info("Running in PRODUCTION MODE for all eligible users");
    }

    logger.debug("Starting to process and send links");

    // Get the current date (reset time to 00:00:00)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    logger.debug(
      `Current date for comparison: ${today.toISOString().split("T")[0]}`
    );

    // 1. Load URLs from tech and business links - fixing collection paths
    logger.debug("Fetching tech and business link documents from Firestore...");
    const techLinkDoc = await db.doc(`links/tech`).get();
    const businessLinkDoc = await db.doc(`links/business`).get();

    logger.debug(`Tech link document exists: ${techLinkDoc.exists}`);
    logger.debug(`Business link document exists: ${businessLinkDoc.exists}`);

    // Process tech link
    const techLinks: LinkData[] = [];
    if (techLinkDoc.exists) {
      const data = techLinkDoc.data();
      logger.debug(`Tech link data: ${JSON.stringify(data)}`);

      // Check if the link was updated today
      let shouldProcessTechLink = false;
      if (data?.updated_at) {
        const updatedDate = data.updated_at.toDate();
        const linkDate = new Date(
          updatedDate.getFullYear(),
          updatedDate.getMonth(),
          updatedDate.getDate()
        );
        shouldProcessTechLink = linkDate.getTime() === today.getTime();
        logger.debug(
          `Tech link updated_at: ${
            linkDate.toISOString().split("T")[0]
          }, should process: ${shouldProcessTechLink}`
        );
      } else {
        logger.warn("Tech link has no updated_at field");
        shouldProcessTechLink = false;
      }

      if (shouldProcessTechLink && data?.url) {
        // Extract article ID from URL (assuming it's in a format that can be parsed)
        const urlParts = data.url.split("/");
        const articleId = urlParts[urlParts.length - 1];
        logger.debug(`Extracted articleId for tech: ${articleId}`);

        // Get Korean title for this article
        logger.debug(`Fetching Korean title for tech article: ${articleId}...`);
        const articleTitleDoc = await db.doc(`articles/${articleId}`).get();
        logger.debug(
          `Article title document exists: ${articleTitleDoc.exists}`
        );
        const koreanTitle = articleTitleDoc.exists
          ? articleTitleDoc.data()?.title?.korean
          : "기술 기사";
        logger.debug(`Korean title for tech article: ${koreanTitle}`);

        techLinks.push({
          url: data.url,
          articleId,
          koreanTitle,
          updated_at: data.updated_at,
        });
      } else if (!shouldProcessTechLink) {
        logger.info(
          "Tech link not processed because updated_at date does not match current date"
        );
      } else {
        logger.warn("Tech link document exists but has no URL field");
      }
    } else {
      logger.warn("Tech link document does not exist in Firestore");
    }

    // Process business link
    const businessLinks: LinkData[] = [];
    if (businessLinkDoc.exists) {
      const data = businessLinkDoc.data();
      logger.debug(`Business link data: ${JSON.stringify(data)}`);

      // Check if the link was updated today
      let shouldProcessBusinessLink = false;
      if (data?.updated_at) {
        const updatedDate = data.updated_at.toDate();
        const linkDate = new Date(
          updatedDate.getFullYear(),
          updatedDate.getMonth(),
          updatedDate.getDate()
        );
        shouldProcessBusinessLink = linkDate.getTime() === today.getTime();
        logger.debug(
          `Business link updated_at: ${
            linkDate.toISOString().split("T")[0]
          }, should process: ${shouldProcessBusinessLink}`
        );
      } else {
        logger.warn("Business link has no updated_at field");
        shouldProcessBusinessLink = false;
      }

      if (shouldProcessBusinessLink && data?.url) {
        // Extract article ID from URL
        const urlParts = data.url.split("/");
        const articleId = urlParts[urlParts.length - 1];
        logger.debug(`Extracted articleId for business: ${articleId}`);

        // Get Korean title for this article
        logger.debug(
          `Fetching Korean title for business article: ${articleId}...`
        );
        const articleTitleDoc = await db.doc(`articles/${articleId}`).get();
        logger.debug(
          `Article title document exists: ${articleTitleDoc.exists}`
        );
        const koreanTitle = articleTitleDoc.exists
          ? articleTitleDoc.data()?.title?.korean
          : "비즈니스 기사";
        logger.debug(`Korean title for business article: ${koreanTitle}`);

        businessLinks.push({
          url: data.url,
          articleId,
          koreanTitle,
          updated_at: data.updated_at,
        });
      } else if (!shouldProcessBusinessLink) {
        logger.info(
          "Business link not processed because updated_at date does not match current date"
        );
      } else {
        logger.warn("Business link document exists but has no URL field");
      }
    } else {
      logger.warn("Business link document does not exist in Firestore");
    }

    // If no links are available, exit
    if (techLinks.length === 0 && businessLinks.length === 0) {
      logger.warn("No links available to send - exiting function early");
      return { techCount: 0, businessCount: 0, expiryCount: 0 };
    }

    // Select one link from each category to send
    const techLink = techLinks.length > 0 ? techLinks[0] : null;
    const businessLink = businessLinks.length > 0 ? businessLinks[0] : null;

    // 2. Process users - different approach based on mode
    let usersSnapshot;

    if (TEST_MODE_ENABLED) {
      // In test mode, there are two ways to fetch the test users:
      // 1. Users whose document ID directly matches one of the test phone numbers
      // 2. Users who have a phone field that, when formatted, matches one of the test phone numbers

      logger.debug(
        `Test mode: Fetching users with test phone numbers: ${TEST_PHONE_NUMBERS.join(
          ", "
        )}`
      );

      // First approach: direct ID match
      const usersByIdSnapshot = await db
        .collection("users")
        .where(admin.firestore.FieldPath.documentId(), "in", TEST_PHONE_NUMBERS)
        .get();

      logger.debug(
        `Found ${usersByIdSnapshot.docs.length} test users by direct ID match`
      );

      // Second approach: Get all users and filter by phone number
      const allUsersSnapshot = await db.collection("users").get();

      // Filter users by formatting their phone field and checking if it matches test numbers
      const usersByPhoneField = allUsersSnapshot.docs.filter((doc) => {
        const userData = doc.data();
        if (!userData.phone) return false;

        // Format the phone number from user data to match our test format
        const formattedPhone = userData.phone
          .replace(/^\+82/, "0")
          .replace(/\D/g, "");
        return TEST_PHONE_NUMBERS.includes(formattedPhone);
      });

      logger.debug(
        `Found ${usersByPhoneField.length} additional test users by phone field match`
      );

      // Also get users whose auth phone number matches test numbers
      const matchedUserIds: string[] = [];

      // This would be more efficient if we had a way to query Auth directly by phone
      // Instead, we'll check if any of the users we haven't already matched have
      // phone numbers in Auth that match our test numbers
      for (const doc of allUsersSnapshot.docs) {
        // Skip if we already found this user by phone field
        if (usersByPhoneField.some((d) => d.id === doc.id)) continue;
        // Skip if we already found this user by ID
        if (usersByIdSnapshot.docs.some((d) => d.id === doc.id)) continue;

        try {
          const authUser = await admin.auth().getUser(doc.id);
          if (authUser.phoneNumber) {
            const formattedAuthPhone = authUser.phoneNumber
              .replace(/^\+82/, "0")
              .replace(/\D/g, "");
            if (TEST_PHONE_NUMBERS.includes(formattedAuthPhone)) {
              matchedUserIds.push(doc.id);
            }
          }
        } catch (error) {
          // Ignore errors fetching auth user
        }
      }

      let usersByAuthPhone: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[] =
        [];
      if (matchedUserIds.length > 0) {
        // Firebase only allows up to 10 values in an 'in' query, so we may need to chunk
        const chunks = [];
        for (let i = 0; i < matchedUserIds.length; i += 10) {
          chunks.push(matchedUserIds.slice(i, i + 10));
        }

        for (const chunk of chunks) {
          const chunkSnapshot = await db
            .collection("users")
            .where(admin.firestore.FieldPath.documentId(), "in", chunk)
            .get();
          usersByAuthPhone = [...usersByAuthPhone, ...chunkSnapshot.docs];
        }
      }

      logger.debug(
        `Found ${usersByAuthPhone.length} additional test users by Auth phone match`
      );

      // Combine all the users we found, ensuring no duplicates
      const combinedDocs = [
        ...usersByIdSnapshot.docs,
        ...usersByPhoneField,
        ...usersByAuthPhone,
      ];

      // Remove duplicates by user ID
      const uniqueDocsMap = new Map();
      for (const doc of combinedDocs) {
        if (!uniqueDocsMap.has(doc.id)) {
          uniqueDocsMap.set(doc.id, doc);
        }
      }

      // Create a custom snapshot-like object with the unique docs
      usersSnapshot = {
        docs: Array.from(uniqueDocsMap.values()),
        size: uniqueDocsMap.size,
        empty: uniqueDocsMap.size === 0,
        forEach: (
          callback: (
            doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
          ) => void
        ) => {
          Array.from(uniqueDocsMap.values()).forEach(callback);
        },
      };

      logger.debug(
        `Found a total of ${usersSnapshot.docs.length} unique test users`
      );
    } else {
      // In production mode, get all users
      logger.debug("Production mode: Fetching all users from Firestore...");
      usersSnapshot = await db.collection("users").get();
    }

    logger.debug(`Found ${usersSnapshot.docs.length} user documents`);

    const techRecipients: any[] = [];
    const businessRecipients: any[] = [];
    const expiryNotifications: any[] = [];

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data() as UserData;
      logger.debug(
        `Processing user ${userDoc.id}: left_count=${userData.left_count}, cat_tech=${userData.cat_tech}, cat_business=${userData.cat_business}`
      );

      // Skip users with zero left_count in production mode (in test mode, we process regardless of left_count)
      if (!TEST_MODE_ENABLED && userData.left_count <= 0) {
        logger.debug(
          `Skipping user ${userDoc.id} because left_count is ${userData.left_count}`
        );
        continue;
      }

      // Add to tech recipients if cat_tech is true
      if (userData.cat_tech && techLink) {
        logger.debug(`Adding user ${userDoc.id} to tech recipients`);

        // Get customer name from Firebase Auth first, then fallback to Firestore
        let customerName = "고객님"; // Default fallback
        try {
          logger.debug(
            `Fetching customer name from Auth for user ${userDoc.id}`
          );
          const authUser = await admin.auth().getUser(userDoc.id);

          if (authUser.displayName && authUser.displayName.trim() !== "") {
            customerName = authUser.displayName;
            logger.debug(
              `Using displayName from Auth as customer name: ${customerName}`
            );
          } else if (userData.name && userData.name.trim() !== "") {
            customerName = userData.name;
            logger.debug(
              `Using name from Firestore as fallback: ${customerName}`
            );
          }
        } catch (authError) {
          logger.error(
            `Error fetching user from Auth for ${userDoc.id}:`,
            authError
          );
          if (userData.name && userData.name.trim() !== "") {
            customerName = userData.name;
            logger.debug(
              `Using name from Firestore after Auth error: ${customerName}`
            );
          }
        }

        const templateParameter = {
          "korean-title": techLink.koreanTitle,
          "customer-name": customerName,
          "article-link": techLink.url,
        };

        // Get phone number only from Firebase Auth
        let recipientNo = "";
        try {
          logger.debug(
            `Fetching phone number from Auth for user ${userDoc.id}`
          );
          const authUser = await admin.auth().getUser(userDoc.id);

          if (authUser.phoneNumber) {
            // Format phone number from auth (remove country code and any non-digits)
            recipientNo = authUser.phoneNumber
              .replace(/^\+82/, "0")
              .replace(/\D/g, "");
            logger.debug(
              `Found phone from Auth: ${authUser.phoneNumber}, formatted: ${recipientNo}`
            );
          } else {
            logger.warn(`No phone number found in Auth for user ${userDoc.id}`);
            // Fallback to phone field in Firestore as last resort
            if (userData.phone) {
              recipientNo = userData.phone
                .replace(/^\+82/, "0")
                .replace(/\D/g, "");
              logger.debug(
                `Using phone field from Firestore as fallback: ${recipientNo}`
              );
            }
          }
        } catch (authError) {
          logger.error(
            `Error fetching user from Auth for ${userDoc.id}:`,
            authError
          );
          // Fallback to phone field in Firestore as last resort
          if (userData.phone) {
            recipientNo = userData.phone
              .replace(/^\+82/, "0")
              .replace(/\D/g, "");
            logger.debug(
              `Using phone field from Firestore as fallback after Auth error: ${recipientNo}`
            );
          }
        }

        // Skip if we couldn't find a valid phone number
        if (
          !recipientNo ||
          !recipientNo.startsWith("010") ||
          recipientNo.length < 10
        ) {
          logger.warn(
            `Could not find valid phone number for user ${userDoc.id}, skipping`
          );
          continue;
        }

        // Add the articleId to the user's received_articles array
        try {
          logger.debug(
            `Adding tech article ${techLink.articleId} to received_articles for user ${userDoc.id}`
          );
          await userDoc.ref.update({
            received_articles: admin.firestore.FieldValue.arrayUnion(
              techLink.articleId
            ),
          });
          logger.debug(
            `Successfully added article to received_articles for user ${userDoc.id}`
          );
        } catch (updateError) {
          logger.error(
            `Failed to update received_articles for user ${userDoc.id}:`,
            updateError
          );
        }

        techRecipients.push({
          recipientNo: recipientNo,
          templateParameter: templateParameter,
        });

        // Only decrement left_count in production mode
        if (!TEST_MODE_ENABLED) {
          // Update left_count code here
          // ...
        } else {
          logger.debug(
            `Test mode: Not decrementing left_count for user ${userDoc.id}`
          );
        }
      }

      // Add to business recipients if cat_business is true
      if (userData.cat_business && businessLink) {
        logger.debug(`Adding user ${userDoc.id} to business recipients`);

        // Get customer name from Firebase Auth first, then fallback to Firestore
        let customerName = "고객님"; // Default fallback
        try {
          logger.debug(
            `Fetching customer name from Auth for user ${userDoc.id}`
          );
          const authUser = await admin.auth().getUser(userDoc.id);

          if (authUser.displayName && authUser.displayName.trim() !== "") {
            customerName = authUser.displayName;
            logger.debug(
              `Using displayName from Auth as customer name: ${customerName}`
            );
          } else if (userData.name && userData.name.trim() !== "") {
            customerName = userData.name;
            logger.debug(
              `Using name from Firestore as fallback: ${customerName}`
            );
          }
        } catch (authError) {
          logger.error(
            `Error fetching user from Auth for ${userDoc.id}:`,
            authError
          );
          if (userData.name && userData.name.trim() !== "") {
            customerName = userData.name;
            logger.debug(
              `Using name from Firestore after Auth error: ${customerName}`
            );
          }
        }

        const templateParameter = {
          "korean-title": businessLink.koreanTitle,
          "customer-name": customerName,
          "article-link": businessLink.url,
        };

        // Get phone number only from Firebase Auth
        let recipientNo = "";
        try {
          logger.debug(
            `Fetching phone number from Auth for user ${userDoc.id}`
          );
          const authUser = await admin.auth().getUser(userDoc.id);

          if (authUser.phoneNumber) {
            // Format phone number from auth (remove country code and any non-digits)
            recipientNo = authUser.phoneNumber
              .replace(/^\+82/, "0")
              .replace(/\D/g, "");
            logger.debug(
              `Found phone from Auth: ${authUser.phoneNumber}, formatted: ${recipientNo}`
            );
          } else {
            logger.warn(`No phone number found in Auth for user ${userDoc.id}`);
            // Fallback to phone field in Firestore as last resort
            if (userData.phone) {
              recipientNo = userData.phone
                .replace(/^\+82/, "0")
                .replace(/\D/g, "");
              logger.debug(
                `Using phone field from Firestore as fallback: ${recipientNo}`
              );
            }
          }
        } catch (authError) {
          logger.error(
            `Error fetching user from Auth for ${userDoc.id}:`,
            authError
          );
          // Fallback to phone field in Firestore as last resort
          if (userData.phone) {
            recipientNo = userData.phone
              .replace(/^\+82/, "0")
              .replace(/\D/g, "");
            logger.debug(
              `Using phone field from Firestore as fallback after Auth error: ${recipientNo}`
            );
          }
        }

        // Skip if we couldn't find a valid phone number
        if (
          !recipientNo ||
          !recipientNo.startsWith("010") ||
          recipientNo.length < 10
        ) {
          logger.warn(
            `Could not find valid phone number for user ${userDoc.id}, skipping`
          );
          continue;
        }

        // Add the articleId to the user's received_articles array
        try {
          logger.debug(
            `Adding business article ${businessLink.articleId} to received_articles for user ${userDoc.id}`
          );
          await userDoc.ref.update({
            received_articles: admin.firestore.FieldValue.arrayUnion(
              businessLink.articleId
            ),
          });
          logger.debug(
            `Successfully added article to received_articles for user ${userDoc.id}`
          );
        } catch (updateError) {
          logger.error(
            `Failed to update received_articles for user ${userDoc.id}:`,
            updateError
          );
        }

        businessRecipients.push({
          recipientNo: recipientNo,
          templateParameter: templateParameter,
        });
      }

      // Check if user should receive expiry notification
      if (userData.left_count === 1) {
        logger.debug(
          `Adding user ${userDoc.id} to expiry notifications as their left_count is 1`
        );

        // Get customer name from Firebase Auth first, then fallback to Firestore
        let customerName = "고객님"; // Default fallback
        try {
          logger.debug(
            `Fetching customer name from Auth for user ${userDoc.id}`
          );
          const authUser = await admin.auth().getUser(userDoc.id);

          if (authUser.displayName && authUser.displayName.trim() !== "") {
            customerName = authUser.displayName;
            logger.debug(
              `Using displayName from Auth as customer name: ${customerName}`
            );
          } else if (userData.name && userData.name.trim() !== "") {
            customerName = userData.name;
            logger.debug(
              `Using name from Firestore as fallback: ${customerName}`
            );
          }
        } catch (authError) {
          logger.error(
            `Error fetching user from Auth for ${userDoc.id}:`,
            authError
          );
          if (userData.name && userData.name.trim() !== "") {
            customerName = userData.name;
            logger.debug(
              `Using name from Firestore after Auth error: ${customerName}`
            );
          }
        }

        // Get phone number only from Firebase Auth
        let recipientNo = "";
        try {
          logger.debug(
            `Fetching phone number from Auth for user ${userDoc.id}`
          );
          const authUser = await admin.auth().getUser(userDoc.id);

          if (authUser.phoneNumber) {
            // Format phone number from auth (remove country code and any non-digits)
            recipientNo = authUser.phoneNumber
              .replace(/^\+82/, "0")
              .replace(/\D/g, "");
            logger.debug(
              `Found phone from Auth: ${authUser.phoneNumber}, formatted: ${recipientNo}`
            );
          } else {
            logger.warn(`No phone number found in Auth for user ${userDoc.id}`);
            // Fallback to phone field in Firestore as last resort
            if (userData.phone) {
              recipientNo = userData.phone
                .replace(/^\+82/, "0")
                .replace(/\D/g, "");
              logger.debug(
                `Using phone field from Firestore as fallback: ${recipientNo}`
              );
            }
          }
        } catch (authError) {
          logger.error(
            `Error fetching user from Auth for ${userDoc.id}:`,
            authError
          );
          // Fallback to phone field in Firestore as last resort
          if (userData.phone) {
            recipientNo = userData.phone
              .replace(/^\+82/, "0")
              .replace(/\D/g, "");
            logger.debug(
              `Using phone field from Firestore as fallback after Auth error: ${recipientNo}`
            );
          }
        }

        // Skip if we couldn't find a valid phone number
        if (
          !recipientNo ||
          !recipientNo.startsWith("010") ||
          recipientNo.length < 10
        ) {
          logger.warn(
            `Could not find valid phone number for user ${userDoc.id}, skipping`
          );
          continue;
        }

        expiryNotifications.push({
          recipientNo: recipientNo,
          templateParameter: {
            "customer-name": customerName,
            "store-link":
              "https://smartstore.naver.com/one-cup-english/products/10974832954",
          },
        });
      }

      // Update the user's left_count
      logger.debug(
        `Updating left_count for user ${userDoc.id} from ${
          userData.left_count
        } to ${userData.left_count - 1}`
      );
      try {
        // Create an update object
        const updates: any = {
          left_count: admin.firestore.FieldValue.increment(-1),
        };

        // Add last_received timestamp if user received any article
        if (
          (userData.cat_tech && techLink) ||
          (userData.cat_business && businessLink) ||
          userData.left_count === 1
        ) {
          updates.last_received = admin.firestore.FieldValue.serverTimestamp();
          logger.debug(`Adding last_received timestamp for user ${userDoc.id}`);
        }

        // Apply the updates
        await userDoc.ref.update(updates);
        logger.debug(`Successfully updated user ${userDoc.id}`);
      } catch (updateError) {
        logger.error(`Failed to update user ${userDoc.id}:`, updateError);
      }
    }

    logger.debug(`Processing complete. Recipients summary:
      - Tech recipients: ${techRecipients.length}
      - Business recipients: ${businessRecipients.length}
      - Expiry notifications: ${expiryNotifications.length}`);

    // 3. Send Kakao messages
    // Send to tech recipients
    if (techRecipients.length > 0) {
      logger.debug(
        `Sending Kakao messages to ${techRecipients.length} tech recipients...`
      );
      try {
        const techResult = await sendKakaoMessages(
          techRecipients,
          "send-article"
        );
        logger.debug(`Tech Kakao result: ${JSON.stringify(techResult)}`);
      } catch (kakaoError) {
        logger.error("Error sending tech Kakao messages:", kakaoError);
      }
    } else {
      logger.debug("No tech recipients to send messages to");
    }

    // Send to business recipients
    if (businessRecipients.length > 0) {
      logger.debug(
        `Sending Kakao messages to ${businessRecipients.length} business recipients...`
      );
      try {
        const businessResult = await sendKakaoMessages(
          businessRecipients,
          "send-article"
        );
        logger.debug(
          `Business Kakao result: ${JSON.stringify(businessResult)}`
        );
      } catch (kakaoError) {
        logger.error("Error sending business Kakao messages:", kakaoError);
      }
    } else {
      logger.debug("No business recipients to send messages to");
    }

    // Send expiry notifications
    if (expiryNotifications.length > 0) {
      logger.debug(
        `Sending expiry notifications to ${expiryNotifications.length} users...`
      );
      try {
        const expiryResult = await sendKakaoMessages(
          expiryNotifications,
          "subscription-expired"
        );
        logger.debug(
          `Expiry notification Kakao result: ${JSON.stringify(expiryResult)}`
        );
      } catch (kakaoError) {
        logger.error("Error sending expiry Kakao messages:", kakaoError);
      }
    } else {
      logger.debug("No expiry notifications to send");
    }

    logger.info(
      `Sent messages to: ${techRecipients.length} tech users, ${businessRecipients.length} business users`
    );
    logger.info(
      `Sent expiry notifications to: ${expiryNotifications.length} users`
    );

    return {
      techCount: techRecipients.length,
      businessCount: businessRecipients.length,
      expiryCount: expiryNotifications.length,
    };
  } catch (error) {
    logger.error("Error in processAndSendLinks:", error);
    throw error;
  }
}

// Scheduled function that runs automatically (in production mode)
export const sendLinksToUsers = onSchedule(
  {
    schedule: "0 8 * * *",
    timeZone: "Asia/Seoul",
  },
  async (event: ScheduledEvent): Promise<void> => {
    try {
      await processAndSendLinks(false); // false = production mode
      return;
    } catch (error) {
      logger.error("Error in scheduled function:", error);
      return;
    }
  }
);

// HTTP callable function for manual testing with specific recipients
export const testSendLinksToUsers = onCall(
  {
    enforceAppCheck: false, // Set to true in production
  },
  async (request) => {
    try {
      const result = await processAndSendLinks(true); // true = test mode
      return {
        success: true,
        message: "Test links sent successfully to specified recipients",
        stats: result,
      };
    } catch (error: any) {
      logger.error("Error in test function:", error);
      return {
        success: false,
        error: error.message || "Unknown error occurred",
      };
    }
  }
);

// New function to send links to specific category users
export const sendLinksToCategory = onCall(
  {
    enforceAppCheck: false, // Set to true in production
  },
  async (request) => {
    try {
      const { category, testMode = true } = request.data;

      if (!category || (category !== "tech" && category !== "business")) {
        throw new Error("Invalid category. Must be 'tech' or 'business'.");
      }

      logger.info(
        `Manual sending to category: ${category}, test mode: ${testMode}`
      );

      // Use the core processing function but with category filter
      const result = await processCategoryLinks(category, testMode);

      return {
        success: true,
        message: `Links sent successfully to ${category} category subscribers${
          testMode ? " (test mode)" : ""
        }`,
        stats: result,
      };
    } catch (error: any) {
      logger.error("Error in category send function:", error);
      return {
        success: false,
        error: error.message || "Unknown error occurred",
      };
    }
  }
);

// Function to process and send links to a specific category
async function processCategoryLinks(
  category: "tech" | "business",
  testMode: boolean = true
): Promise<{
  recipientCount: number;
}> {
  try {
    const db = admin.firestore();

    // Test mode configuration
    const TEST_MODE_ENABLED = testMode;
    const TEST_PHONE_NUMBERS = ["01068584123", "01045430406"];

    if (TEST_MODE_ENABLED) {
      logger.info(
        `Running in TEST MODE for specific recipients: ${TEST_PHONE_NUMBERS.join(
          ", "
        )}`
      );
    } else {
      logger.info("Running in PRODUCTION MODE for all eligible users");
    }

    logger.debug(
      `Starting to process and send links to ${category} category subscribers`
    );

    // Get the current date
    // const now = new Date();

    // 1. Load URL for the specified category
    logger.debug(`Fetching ${category} link document from Firestore...`);
    const linkDoc = await db.doc(`links/${category}`).get();

    if (!linkDoc.exists) {
      logger.error(`${category} link document does not exist in Firestore`);
      throw new Error(`${category} link document does not exist`);
    }

    const data = linkDoc.data();
    logger.debug(`${category} link data: ${JSON.stringify(data)}`);

    // Check if we have a valid URL
    if (!data?.url) {
      logger.error(`${category} link document has no URL field`);
      throw new Error(`No URL found for ${category} category`);
    }

    // Extract article ID from URL
    const urlParts = data.url.split("/");
    const articleId = urlParts[urlParts.length - 1];
    logger.debug(`Extracted articleId for ${category}: ${articleId}`);

    // Get Korean title for this article
    logger.debug(
      `Fetching Korean title for ${category} article: ${articleId}...`
    );
    const articleTitleDoc = await db.doc(`articles/${articleId}`).get();
    logger.debug(`Article title document exists: ${articleTitleDoc.exists}`);
    const koreanTitle = articleTitleDoc.exists
      ? articleTitleDoc.data()?.title?.korean
      : `${category === "tech" ? "기술" : "비즈니스"} 기사`;
    logger.debug(`Korean title for ${category} article: ${koreanTitle}`);

    // Initialize usersSnapshot as an empty object with the expected properties
    let usersSnapshot: {
      docs: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[];
      size: number;
      empty: boolean;
      forEach: (
        callback: (
          doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
        ) => void
      ) => void;
    } = {
      docs: [],
      size: 0,
      empty: true,
      forEach: () => {},
    };

    if (TEST_MODE_ENABLED) {
      // In test mode, only get test users who subscribe to this category
      logger.debug(
        `Test mode: Fetching users with test phone numbers who subscribe to ${category}...`
      );

      // First approach: direct ID match - without left_count filter for test mode
      const usersByIdSnapshot = await db
        .collection("users")
        .where(admin.firestore.FieldPath.documentId(), "in", TEST_PHONE_NUMBERS)
        .where(category === "tech" ? "cat_tech" : "cat_business", "==", true)
        .get();

      logger.debug(
        `Found ${usersByIdSnapshot.docs.length} test users who subscribe to ${category} by direct ID match`
      );

      // Second approach: Get all users who subscribe to this category - without left_count filter for test mode
      const allUsersSnapshot = await db
        .collection("users")
        .where(category === "tech" ? "cat_tech" : "cat_business", "==", true)
        .get();

      // Filter users by formatting their phone field and checking if it matches test numbers
      const usersByPhoneField = allUsersSnapshot.docs.filter((doc) => {
        const userData = doc.data();
        if (!userData.phone) return false;

        // Format the phone number from user data to match our test format
        const formattedPhone = userData.phone
          .replace(/^\+82/, "0")
          .replace(/\D/g, "");
        return TEST_PHONE_NUMBERS.includes(formattedPhone);
      });

      logger.debug(
        `Found ${usersByPhoneField.length} additional test users who subscribe to ${category} by phone field match`
      );

      // Combine all the users we found, ensuring no duplicates
      const combinedDocs = [...usersByIdSnapshot.docs, ...usersByPhoneField];

      // Remove duplicates by user ID
      const uniqueDocsMap = new Map();
      for (const doc of combinedDocs) {
        if (!uniqueDocsMap.has(doc.id)) {
          uniqueDocsMap.set(doc.id, doc);
        }
      }

      // Create a custom snapshot-like object with the filtered docs
      usersSnapshot = {
        docs: Array.from(uniqueDocsMap.values()),
        size: uniqueDocsMap.size,
        empty: uniqueDocsMap.size === 0,
        forEach: (
          callback: (
            doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
          ) => void
        ) => {
          Array.from(uniqueDocsMap.values()).forEach(callback);
        },
      };

      logger.debug(
        `Found a total of ${usersSnapshot.docs.length} unique test users who subscribe to ${category}`
      );
    } else {
      // In production mode, get all users who subscribe to this category
      logger.debug(
        `Production mode: Fetching all users who subscribe to ${category}...`
      );

      // Try a different approach - first get all users who subscribe to this category
      const usersWithCategorySnapshot = await db
        .collection("users")
        .where(category === "tech" ? "cat_tech" : "cat_business", "==", true)
        .get();

      logger.debug(
        `Found ${usersWithCategorySnapshot.docs.length} ${category} subscribers`
      );

      // Then filter locally by left_count
      const filteredDocs = usersWithCategorySnapshot.docs.filter((doc) => {
        const userData = doc.data();
        return userData.left_count !== undefined && userData.left_count > 0;
      });

      logger.debug(
        `After filtering, found ${filteredDocs.length} ${category} subscribers with left_count > 0`
      );

      // Create a custom snapshot-like object with the filtered docs
      usersSnapshot = {
        docs: filteredDocs,
        size: filteredDocs.length,
        empty: filteredDocs.length === 0,
        forEach: (
          callback: (
            doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
          ) => void
        ) => {
          filteredDocs.forEach(callback);
        },
      };
    }

    if (usersSnapshot.empty) {
      logger.warn(`No eligible ${category} subscribers found`);
      return { recipientCount: 0 };
    }

    const recipients: any[] = [];

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data() as UserData;
      logger.debug(
        `Processing user ${userDoc.id}: left_count=${userData.left_count}`
      );

      // Skip users with zero left_count in production mode (in test mode, we process regardless of left_count)
      if (
        !TEST_MODE_ENABLED &&
        (userData.left_count === undefined || userData.left_count <= 0)
      ) {
        logger.debug(
          `Skipping user ${userDoc.id} because left_count is ${userData.left_count}`
        );
        continue;
      }

      // Get customer name from Firebase Auth first, then fallback to Firestore
      let customerName = "고객님"; // Default fallback
      try {
        logger.debug(`Fetching customer name from Auth for user ${userDoc.id}`);
        const authUser = await admin.auth().getUser(userDoc.id);

        if (authUser.displayName && authUser.displayName.trim() !== "") {
          customerName = authUser.displayName;
          logger.debug(
            `Using displayName from Auth as customer name: ${customerName}`
          );
        } else if (userData.name && userData.name.trim() !== "") {
          customerName = userData.name;
          logger.debug(
            `Using name from Firestore as fallback: ${customerName}`
          );
        }
      } catch (authError) {
        logger.error(
          `Error fetching user from Auth for ${userDoc.id}:`,
          authError
        );
        if (userData.name && userData.name.trim() !== "") {
          customerName = userData.name;
          logger.debug(
            `Using name from Firestore after Auth error: ${customerName}`
          );
        }
      }

      // Create template parameter for the message
      const templateParameter = {
        "korean-title": koreanTitle,
        "customer-name": customerName,
        "article-link": data.url,
      };

      // Get phone number only from Firebase Auth
      let recipientNo = "";
      try {
        logger.debug(`Fetching phone number from Auth for user ${userDoc.id}`);
        const authUser = await admin.auth().getUser(userDoc.id);

        if (authUser.phoneNumber) {
          // Format phone number from auth (remove country code and any non-digits)
          recipientNo = authUser.phoneNumber
            .replace(/^\+82/, "0")
            .replace(/\D/g, "");
          logger.debug(
            `Found phone from Auth: ${authUser.phoneNumber}, formatted: ${recipientNo}`
          );
        } else {
          logger.warn(`No phone number found in Auth for user ${userDoc.id}`);
          // Fallback to phone field in Firestore as last resort
          if (userData.phone) {
            recipientNo = userData.phone
              .replace(/^\+82/, "0")
              .replace(/\D/g, "");
            logger.debug(
              `Using phone field from Firestore as fallback: ${recipientNo}`
            );
          }
        }
      } catch (authError) {
        logger.error(
          `Error fetching user from Auth for ${userDoc.id}:`,
          authError
        );
        // Fallback to phone field in Firestore as last resort
        if (userData.phone) {
          recipientNo = userData.phone.replace(/^\+82/, "0").replace(/\D/g, "");
          logger.debug(
            `Using phone field from Firestore as fallback after Auth error: ${recipientNo}`
          );
        }
      }

      // Skip if we couldn't find a valid phone number
      if (
        !recipientNo ||
        !recipientNo.startsWith("010") ||
        recipientNo.length < 10
      ) {
        logger.warn(
          `Could not find valid phone number for user ${userDoc.id}, skipping`
        );
        continue;
      }

      // Add the articleId to the user's received_articles array and update left_count
      // Only in production mode we actually decrement the left_count
      try {
        logger.debug(
          `Adding article ${articleId} to received_articles for user ${userDoc.id}`
        );

        const updates: any = {
          received_articles: admin.firestore.FieldValue.arrayUnion(articleId),
          last_received: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Only decrement left_count in production mode
        if (!TEST_MODE_ENABLED) {
          updates.left_count = admin.firestore.FieldValue.increment(-1);
          logger.debug(`Decrementing left_count for user ${userDoc.id}`);
        } else {
          logger.debug(
            `Test mode: Not decrementing left_count for user ${userDoc.id}`
          );
        }

        await userDoc.ref.update(updates);
        logger.debug(`Successfully updated user ${userDoc.id}`);
      } catch (updateError) {
        logger.error(`Failed to update user ${userDoc.id}:`, updateError);
      }

      recipients.push({
        recipientNo: recipientNo,
        templateParameter: templateParameter,
      });
    }

    logger.debug(`Processing complete. Recipients count: ${recipients.length}`);

    // 3. Send Kakao messages
    if (recipients.length > 0) {
      logger.debug(
        `Sending Kakao messages to ${recipients.length} recipients...`
      );
      try {
        const result = await sendKakaoMessages(recipients, "send-article");
        logger.debug(`Kakao result: ${JSON.stringify(result)}`);
      } catch (kakaoError) {
        logger.error(`Error sending ${category} Kakao messages:`, kakaoError);
        throw kakaoError;
      }
    } else {
      logger.debug(`No ${category} recipients to send messages to`);
    }

    logger.info(`Sent messages to: ${recipients.length} ${category} users`);

    return { recipientCount: recipients.length };
  } catch (error) {
    logger.error(`Error in processCategoryLinks:`, error);
    throw error;
  }
}

async function sendKakaoMessages(recipientList: any[], templateCode: string) {
  logger.debug(
    `Preparing to send Kakao messages with template: ${templateCode}`
  );
  logger.debug(
    `Recipient list sample (first recipient): ${JSON.stringify(
      recipientList[0]
    )}`
  );

  const data = {
    senderKey: "1763d8030dde5f5f369ea0a088598c2fb4c792ab",
    templateCode: templateCode,
    recipientList: recipientList,
  };

  const headers = {
    "X-Secret-Key": "PuyyHGNZ",
  };

  const options = {
    method: "post",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      ...headers,
    },
    body: JSON.stringify(data),
  };

  logger.debug(`Kakao API request body: ${options.body}`);
  logger.debug(
    `Sending Kakao API request to: https://api-alimtalk.cloud.toast.com/alimtalk/v2.2/appkeys/LROcHEW7abBbFhzc/messages`
  );

  try {
    // Using fetch instead of UrlFetchApp (which is for Google Apps Script)
    const response = await fetch(
      "https://api-alimtalk.cloud.toast.com/alimtalk/v2.2/appkeys/LROcHEW7abBbFhzc/messages",
      options
    );

    logger.debug(
      `Kakao API response status: ${response.status} ${response.statusText}`
    );
    const responseText = await response.text();
    logger.debug(`Kakao API response body: ${responseText}`);

    if (!response.ok) {
      throw new Error(
        `Failed to send Kakao messages: ${response.status} ${response.statusText}, Response: ${responseText}`
      );
    }

    return JSON.parse(responseText);
  } catch (error) {
    logger.error("Error sending Kakao messages:", error);
    throw error;
  }
}

// New function to retrieve display names from Firebase Auth
export const getUserDisplayNames = onCall(async (request) => {
  try {
    const { userIds } = request.data;

    if (!userIds || !Array.isArray(userIds)) {
      throw new Error("Invalid or missing userIds parameter");
    }

    logger.info(`Retrieving display names for ${userIds.length} users`);

    const displayNames: Record<string, string> = {};
    const phoneNumbers: Record<string, string> = {};

    // Process users in batches of 10 to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const promises = batch.map(async (userId: string) => {
        try {
          const userRecord = await admin.auth().getUser(userId);
          displayNames[userId] = userRecord.displayName || "";
          phoneNumbers[userId] = userRecord.phoneNumber || "";
        } catch (error) {
          logger.error(`Error retrieving user ${userId}: ${error}`);
          displayNames[userId] = "";
          phoneNumbers[userId] = "";
        }
      });

      await Promise.all(promises);
    }

    logger.info(
      `Successfully retrieved ${Object.keys(displayNames).length} user records`
    );
    return { displayNames, phoneNumbers };
  } catch (error) {
    logger.error(`Error in getUserDisplayNames: ${error}`);
    throw new Error(`Failed to retrieve user data: ${error}`);
  }
});

// Payple Payment Integration
// Create express app with CORS
const app = express();
app.use(cors({ origin: true }));

// Middleware to verify Payple requests (can be enhanced with proper validation)
const verifyPaypleRequest = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  // In production, you'd validate the request using signatures or tokens
  // For now, we'll just proceed
  next();
};

// Handle payment result callback
app.post(
  "/api/payment/result",
  verifyPaypleRequest,
  async (req: express.Request, res: express.Response) => {
    const paymentData = req.body;
    logger.info("Received payment result:", paymentData);

    try {
      if (paymentData.PCD_PAY_RST === "success") {
        // Payment successful - store billing key and user info in Firestore
        const db = admin.firestore();

        // Extract user info - mainly we care about the user ID and billing key
        const { PCD_PAYER_ID, PCD_PAYER_NO, PCD_PAYER_HP, PCD_PAY_TOTAL } =
          paymentData;

        // Ensure we have a user ID
        if (!PCD_PAYER_NO) {
          logger.error("Missing user ID (PCD_PAYER_NO) in payment data");
          return res.status(400).json({
            success: false,
            message: "Missing user ID in payment data",
          });
        }

        // Log the amount for debugging
        logger.info(`Payment amount: ${PCD_PAY_TOTAL}`);

        // Try to look up user info from Firebase Auth if available
        let userName = "";
        let userEmail = "";

        try {
          const userRecord = await admin.auth().getUser(PCD_PAYER_NO);
          userName = userRecord.displayName || "";
          userEmail = userRecord.email || "";

          // Verify phone number matches
          const authPhone = userRecord.phoneNumber || "";
          const paymentPhone = PCD_PAYER_HP || "";

          // Format both phone numbers for comparison (remove country code, spaces, etc.)
          const formattedAuthPhone = authPhone
            .replace(/^\+82/, "0")
            .replace(/\D/g, "");
          const formattedPaymentPhone = paymentPhone
            .replace(/^\+82/, "0")
            .replace(/\D/g, "");

          if (
            formattedAuthPhone &&
            formattedPaymentPhone &&
            formattedAuthPhone !== formattedPaymentPhone
          ) {
            logger.warn(
              `Phone number mismatch for user ${PCD_PAYER_NO}. Auth: ${formattedAuthPhone}, Payment: ${formattedPaymentPhone}`
            );
          }
        } catch (error) {
          logger.warn(
            `Couldn't fetch user data from Auth for ${PCD_PAYER_NO}:`,
            error
          );
        }

        // Check if user already has an active subscription
        const existingSubscriptions = await db
          .collection("subscriptions")
          .where("userId", "==", PCD_PAYER_NO)
          .where("status", "==", "active")
          .get();

        if (!existingSubscriptions.empty) {
          // Update existing subscription with new billing key
          await existingSubscriptions.docs[0].ref.update({
            billingKey: PCD_PAYER_ID,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastPaymentAmount: PCD_PAY_TOTAL || 0,
            lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
          });

          logger.info(`Updated existing subscription for user ${PCD_PAYER_NO}`);
        } else {
          // Create a new subscription
          await db.collection("subscriptions").add({
            billingKey: PCD_PAYER_ID,
            userId: PCD_PAYER_NO,
            userName: userName,
            userEmail: userEmail,
            userPhone: PCD_PAYER_HP,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "active",
            lastPaymentAmount: PCD_PAY_TOTAL || 0,
            lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
          });

          logger.info(`Created new subscription for user ${PCD_PAYER_NO}`);
        }

        // Record the transaction
        await db.collection("transactions").add({
          userId: PCD_PAYER_NO,
          billingKey: PCD_PAYER_ID,
          amount: PCD_PAY_TOTAL || 0,
          productName: paymentData.PCD_PAY_GOODS || "영어 한잔 정기구독",
          paymentId: paymentData.PCD_PAY_OID,
          paymentDate: admin.firestore.FieldValue.serverTimestamp(),
          status: "completed",
          paymentDetails: paymentData,
        });

        // Update the user's account to reflect they have a subscription
        try {
          const userDocRef = db.collection("users").doc(PCD_PAYER_NO);
          await userDocRef.set(
            {
              has_subscription: true,
              subscription_updated_at:
                admin.firestore.FieldValue.serverTimestamp(),
              // Optionally add 30 days to left_count even for 0 amount test transactions
              left_count: admin.firestore.FieldValue.increment(30),
            },
            { merge: true }
          );
        } catch (error) {
          logger.error(
            `Error updating user document for ${PCD_PAYER_NO}:`,
            error
          );
        }

        return res.status(200).json({
          success: true,
          message: "Payment data processed successfully",
        });
      } else {
        // Payment failed
        logger.error("Payment failed:", paymentData.PCD_PAY_MSG);
        return res.status(400).json({
          success: false,
          message: paymentData.PCD_PAY_MSG,
        });
      }
    } catch (error) {
      logger.error("Error processing payment result:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Function to make recurring payments using stored billing keys
app.post(
  "/api/payment/charge",
  verifyPaypleRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { userId, amount, productName, orderId } = req.body;

      if (!userId || !amount || !productName) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameters",
        });
      }

      const db = admin.firestore();

      // Fetch the subscription document for this user
      const subscriptionsRef = db.collection("subscriptions");
      const snapshot = await subscriptionsRef
        .where("userId", "==", userId)
        .where("status", "==", "active")
        .get();

      if (snapshot.empty) {
        return res.status(404).json({
          success: false,
          message: "No active subscription found for this user",
        });
      }

      const subscription = snapshot.docs[0].data();

      // Get current user info from Firebase Auth
      let userName = "";
      let userEmail = "";
      let userPhone = "";

      try {
        const userRecord = await admin.auth().getUser(userId);
        userName = userRecord.displayName || "";
        userEmail = userRecord.email || "";
        userPhone = userRecord.phoneNumber || "";
      } catch (error) {
        logger.warn(`Couldn't fetch user data from Auth for ${userId}:`, error);
      }

      // Generate a unique order ID if not provided
      const paymentOrderId =
        orderId || `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // Perform partner authentication with Payple (step 3 in docs)
      const authResponse = await axios.post(
        "https://democpay.payple.kr/php/auth.php", // Test environment
        {
          cst_id: "test", // Replace with your actual ID in production
          custKey: "abcd1234567890", // Replace with your actual key in production
          PCD_PAY_TYPE: "card",
          PCD_SIMPLE_FLAG: "Y",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            Referer: "https://your-domain.com", // Replace with your actual domain
          },
        }
      );

      if (authResponse.data.result !== "success") {
        logger.error("Failed to authenticate with Payple:", authResponse.data);
        return res.status(500).json({
          success: false,
          message: "Authentication with payment provider failed",
        });
      }

      // Use the response data for the actual payment request
      const authData = authResponse.data;

      // Make the billing payment (step 4 in docs)
      const paymentResponse = await axios.post(
        "https://democpay.payple.kr/php/SimplePayCardAct.php?ACT_=PAYM", // Test environment
        {
          PCD_CST_ID: authData.cst_id,
          PCD_CUST_KEY: authData.custKey,
          PCD_AUTH_KEY: authData.AuthKey,
          PCD_PAY_TYPE: "card",
          PCD_PAYER_ID: subscription.billingKey,
          PCD_PAYER_NO: userId,
          PCD_PAYER_NAME: userName,
          PCD_PAYER_EMAIL: userEmail,
          PCD_PAYER_HP: userPhone.replace(/^\+82/, "0"),
          PCD_PAY_GOODS: productName,
          PCD_PAY_TOTAL: amount,
          PCD_PAY_OID: paymentOrderId,
          PCD_SIMPLE_FLAG: "Y",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            Referer: "https://your-domain.com", // Replace with your actual domain
          },
        }
      );

      if (paymentResponse.data.PCD_PAY_RST === "success") {
        // Payment successful - record transaction
        await db.collection("transactions").add({
          userId: userId,
          subscriptionId: snapshot.docs[0].id,
          amount: amount,
          productName: productName,
          paymentId: paymentResponse.data.PCD_PAY_OID || paymentOrderId,
          paymentDate: admin.firestore.FieldValue.serverTimestamp(),
          status: "completed",
          paymentDetails: paymentResponse.data,
        });

        // Update user's left_count for subscription items
        if (
          productName.includes("구독") ||
          productName.includes("subscription")
        ) {
          try {
            const userDocRef = db.collection("users").doc(userId);
            await userDocRef.set(
              {
                left_count: admin.firestore.FieldValue.increment(30), // Add 30 days of content
                subscription_last_payment:
                  admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            logger.info(`Updated user ${userId} with 30 more days of content`);
          } catch (updateError) {
            logger.error(
              `Error updating user ${userId} after payment:`,
              updateError
            );
          }
        }

        return res.status(200).json({
          success: true,
          message: "Payment processed successfully",
          paymentResult: paymentResponse.data,
        });
      } else {
        // Payment failed
        logger.error("Payment failed:", paymentResponse.data);

        // Record failed transaction
        await db.collection("transactions").add({
          userId: userId,
          subscriptionId: snapshot.docs[0].id,
          amount: amount,
          productName: productName,
          paymentId: paymentOrderId,
          paymentDate: admin.firestore.FieldValue.serverTimestamp(),
          status: "failed",
          errorDetails: paymentResponse.data,
        });

        return res.status(400).json({
          success: false,
          message: "Payment failed",
          error: paymentResponse.data.PCD_PAY_MSG,
        });
      }
    } catch (error) {
      logger.error("Error making recurring payment:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Export the express app as a Firebase Cloud Function
export const paymentService = onRequest({ cors: true }, app);
