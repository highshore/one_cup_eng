import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

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
      logger.info(`Running in TEST MODE for specific recipients: ${TEST_PHONE_NUMBERS.join(', ')}`);
    } else {
      logger.info("Running in PRODUCTION MODE for all eligible users");
    }
    
    logger.debug('Starting to process and send links');
    
    // Get the current date (reset time to 00:00:00)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    logger.debug(`Current date for comparison: ${today.toISOString().split('T')[0]}`);
    
    // 1. Load URLs from tech and business links - fixing collection paths
    logger.debug('Fetching tech and business link documents from Firestore...');
    const techLinkDoc = await db.doc(`links/tech`).get();
    const businessLinkDoc = await db.doc(`links/business`).get();
    
    logger.debug(`Tech link document exists: ${techLinkDoc.exists}`);
    logger.debug(`Business link document exists: ${businessLinkDoc.exists}`);
    
    // Process tech link
    const techLinks: LinkData[] = [];
    if (techLinkDoc.exists) {
      const data = techLinkDoc.data()
      logger.debug(`Tech link data: ${JSON.stringify(data)}`);
      
      // Check if the link was updated today
      let shouldProcessTechLink = false;
      if (data?.updated_at) {
        const updatedDate = data.updated_at.toDate();
        const linkDate = new Date(updatedDate.getFullYear(), updatedDate.getMonth(), updatedDate.getDate());
        shouldProcessTechLink = linkDate.getTime() === today.getTime();
        logger.debug(`Tech link updated_at: ${linkDate.toISOString().split('T')[0]}, should process: ${shouldProcessTechLink}`);
      } else {
        logger.warn('Tech link has no updated_at field');
        shouldProcessTechLink = false;
      }
      
      if (shouldProcessTechLink && data?.url) {
        // Extract article ID from URL (assuming it's in a format that can be parsed)
        const urlParts = data.url.split('/');
        const articleId = urlParts[urlParts.length - 1];
        logger.debug(`Extracted articleId for tech: ${articleId}`);
        
        // Get Korean title for this article
        logger.debug(`Fetching Korean title for tech article: ${articleId}...`);
        const articleTitleDoc = await db.doc(`articles/${articleId}`).get();
        logger.debug(`Article title document exists: ${articleTitleDoc.exists}`);
        const koreanTitle = articleTitleDoc.exists ? articleTitleDoc.data()?.title?.korean : "기술 기사";
        logger.debug(`Korean title for tech article: ${koreanTitle}`);
        
        techLinks.push({
          url: data.url,
          articleId,
          koreanTitle,
          updated_at: data.updated_at
        });
      } else if (!shouldProcessTechLink) {
        logger.info('Tech link not processed because updated_at date does not match current date');
      } else {
        logger.warn('Tech link document exists but has no URL field');
      }
    } else {
      logger.warn('Tech link document does not exist in Firestore');
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
        const linkDate = new Date(updatedDate.getFullYear(), updatedDate.getMonth(), updatedDate.getDate());
        shouldProcessBusinessLink = linkDate.getTime() === today.getTime();
        logger.debug(`Business link updated_at: ${linkDate.toISOString().split('T')[0]}, should process: ${shouldProcessBusinessLink}`);
      } else {
        logger.warn('Business link has no updated_at field');
        shouldProcessBusinessLink = false;
      }
      
      if (shouldProcessBusinessLink && data?.url) {
        // Extract article ID from URL
        const urlParts = data.url.split('/');
        const articleId = urlParts[urlParts.length - 1];
        logger.debug(`Extracted articleId for business: ${articleId}`);
        
        // Get Korean title for this article
        logger.debug(`Fetching Korean title for business article: ${articleId}...`);
        const articleTitleDoc = await db.doc(`articles/${articleId}`).get();
        logger.debug(`Article title document exists: ${articleTitleDoc.exists}`);
        const koreanTitle = articleTitleDoc.exists ? articleTitleDoc.data()?.title?.korean : "비즈니스 기사";
        logger.debug(`Korean title for business article: ${koreanTitle}`);
        
        businessLinks.push({
          url: data.url,
          articleId,
          koreanTitle,
          updated_at: data.updated_at
        });
      } else if (!shouldProcessBusinessLink) {
        logger.info('Business link not processed because updated_at date does not match current date');
      } else {
        logger.warn('Business link document exists but has no URL field');
      }
    } else {
      logger.warn('Business link document does not exist in Firestore');
    }
    
    // If no links are available, exit
    if (techLinks.length === 0 && businessLinks.length === 0) {
      logger.warn('No links available to send - exiting function early');
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
      
      logger.debug(`Test mode: Fetching users with test phone numbers: ${TEST_PHONE_NUMBERS.join(', ')}`);
      
      // First approach: direct ID match
      const usersByIdSnapshot = await db.collection('users')
        .where(admin.firestore.FieldPath.documentId(), 'in', TEST_PHONE_NUMBERS)
        .get();
      
      logger.debug(`Found ${usersByIdSnapshot.docs.length} test users by direct ID match`);
      
      // Second approach: Get all users and filter by phone number
      const allUsersSnapshot = await db.collection('users').get();
      
      // Filter users by formatting their phone field and checking if it matches test numbers
      const usersByPhoneField = allUsersSnapshot.docs.filter(doc => {
        const userData = doc.data();
        if (!userData.phone) return false;
        
        // Format the phone number from user data to match our test format
        const formattedPhone = userData.phone.replace(/^\+82/, "0").replace(/\D/g, "");
        return TEST_PHONE_NUMBERS.includes(formattedPhone);
      });
      
      logger.debug(`Found ${usersByPhoneField.length} additional test users by phone field match`);
      
      // Also get users whose auth phone number matches test numbers
      const matchedUserIds: string[] = [];
      
      // This would be more efficient if we had a way to query Auth directly by phone
      // Instead, we'll check if any of the users we haven't already matched have
      // phone numbers in Auth that match our test numbers
      for (const doc of allUsersSnapshot.docs) {
        // Skip if we already found this user by phone field
        if (usersByPhoneField.some(d => d.id === doc.id)) continue;
        // Skip if we already found this user by ID
        if (usersByIdSnapshot.docs.some(d => d.id === doc.id)) continue;
        
        try {
          const authUser = await admin.auth().getUser(doc.id);
          if (authUser.phoneNumber) {
            const formattedAuthPhone = authUser.phoneNumber.replace(/^\+82/, "0").replace(/\D/g, "");
            if (TEST_PHONE_NUMBERS.includes(formattedAuthPhone)) {
              matchedUserIds.push(doc.id);
            }
          }
        } catch (error) {
          // Ignore errors fetching auth user
        }
      }
      
      let usersByAuthPhone: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[] = [];
      if (matchedUserIds.length > 0) {
        // Firebase only allows up to 10 values in an 'in' query, so we may need to chunk
        const chunks = [];
        for (let i = 0; i < matchedUserIds.length; i += 10) {
          chunks.push(matchedUserIds.slice(i, i + 10));
        }
        
        for (const chunk of chunks) {
          const chunkSnapshot = await db.collection('users')
            .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
            .get();
          usersByAuthPhone = [...usersByAuthPhone, ...chunkSnapshot.docs];
        }
      }
      
      logger.debug(`Found ${usersByAuthPhone.length} additional test users by Auth phone match`);
      
      // Combine all the users we found, ensuring no duplicates
      const combinedDocs = [
        ...usersByIdSnapshot.docs,
        ...usersByPhoneField,
        ...usersByAuthPhone
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
        forEach: (callback: (doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) => void) => {
          Array.from(uniqueDocsMap.values()).forEach(callback);
        }
      };
      
      logger.debug(`Found a total of ${usersSnapshot.docs.length} unique test users`);
    } else {
      // In production mode, get all users
      logger.debug('Production mode: Fetching all users from Firestore...');
      usersSnapshot = await db.collection('users').get();
    }
    
    logger.debug(`Found ${usersSnapshot.docs.length} user documents`);
    
    const techRecipients: any[] = [];
    const businessRecipients: any[] = [];
    const expiryNotifications: any[] = [];
    
    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data() as UserData;
      logger.debug(`Processing user ${userDoc.id}: left_count=${userData.left_count}, cat_tech=${userData.cat_tech}, cat_business=${userData.cat_business}`);
      
      // Skip users with zero left_count in production mode (in test mode, we process regardless of left_count)
      if (!TEST_MODE_ENABLED && userData.left_count <= 0) {
        logger.debug(`Skipping user ${userDoc.id} because left_count is ${userData.left_count}`);
        continue;
      }
      
      // Add to tech recipients if cat_tech is true
      if (userData.cat_tech && techLink) {
        logger.debug(`Adding user ${userDoc.id} to tech recipients`);
        
        // Get customer name from Firebase Auth first, then fallback to Firestore
        let customerName = "고객님"; // Default fallback
        try {
          logger.debug(`Fetching customer name from Auth for user ${userDoc.id}`);
          const authUser = await admin.auth().getUser(userDoc.id);
          
          if (authUser.displayName && authUser.displayName.trim() !== '') {
            customerName = authUser.displayName;
            logger.debug(`Using displayName from Auth as customer name: ${customerName}`);
          } else if (userData.name && userData.name.trim() !== '') {
            customerName = userData.name;
            logger.debug(`Using name from Firestore as fallback: ${customerName}`);
          }
        } catch (authError) {
          logger.error(`Error fetching user from Auth for ${userDoc.id}:`, authError);
          if (userData.name && userData.name.trim() !== '') {
            customerName = userData.name;
            logger.debug(`Using name from Firestore after Auth error: ${customerName}`);
          }
        }
        
        const templateParameter = {
          "korean-title": techLink.koreanTitle,
          "customer-name": customerName,
          "article-link": techLink.url
        };
        
        // Get phone number only from Firebase Auth
        let recipientNo = "";
        try {
          logger.debug(`Fetching phone number from Auth for user ${userDoc.id}`);
          const authUser = await admin.auth().getUser(userDoc.id);
          
          if (authUser.phoneNumber) {
            // Format phone number from auth (remove country code and any non-digits)
            recipientNo = authUser.phoneNumber.replace(/^\+82/, "0").replace(/\D/g, "");
            logger.debug(`Found phone from Auth: ${authUser.phoneNumber}, formatted: ${recipientNo}`);
          } else {
            logger.warn(`No phone number found in Auth for user ${userDoc.id}`);
            // Fallback to phone field in Firestore as last resort
            if (userData.phone) {
              recipientNo = userData.phone.replace(/^\+82/, "0").replace(/\D/g, "");
              logger.debug(`Using phone field from Firestore as fallback: ${recipientNo}`);
            }
          }
        } catch (authError) {
          logger.error(`Error fetching user from Auth for ${userDoc.id}:`, authError);
          // Fallback to phone field in Firestore as last resort
          if (userData.phone) {
            recipientNo = userData.phone.replace(/^\+82/, "0").replace(/\D/g, "");
            logger.debug(`Using phone field from Firestore as fallback after Auth error: ${recipientNo}`);
          }
        }
        
        // Skip if we couldn't find a valid phone number
        if (!recipientNo || !recipientNo.startsWith("010") || recipientNo.length < 10) {
          logger.warn(`Could not find valid phone number for user ${userDoc.id}, skipping`);
          continue;
        }
        
        // Add the articleId to the user's received_articles array
        try {
          logger.debug(`Adding tech article ${techLink.articleId} to received_articles for user ${userDoc.id}`);
          await userDoc.ref.update({
            received_articles: admin.firestore.FieldValue.arrayUnion(techLink.articleId)
          });
          logger.debug(`Successfully added article to received_articles for user ${userDoc.id}`);
        } catch (updateError) {
          logger.error(`Failed to update received_articles for user ${userDoc.id}:`, updateError);
        }
        
        techRecipients.push({
          "recipientNo": recipientNo,
          "templateParameter": templateParameter
        });

        // Only decrement left_count in production mode
        if (!TEST_MODE_ENABLED) {
          // Update left_count code here
          // ...
        } else {
          logger.debug(`Test mode: Not decrementing left_count for user ${userDoc.id}`);
        }
      }

      
      
      // Add to business recipients if cat_business is true
      if (userData.cat_business && businessLink) {
        logger.debug(`Adding user ${userDoc.id} to business recipients`);
        
        // Get customer name from Firebase Auth first, then fallback to Firestore
        let customerName = "고객님"; // Default fallback
        try {
          logger.debug(`Fetching customer name from Auth for user ${userDoc.id}`);
          const authUser = await admin.auth().getUser(userDoc.id);
          
          if (authUser.displayName && authUser.displayName.trim() !== '') {
            customerName = authUser.displayName;
            logger.debug(`Using displayName from Auth as customer name: ${customerName}`);
          } else if (userData.name && userData.name.trim() !== '') {
            customerName = userData.name;
            logger.debug(`Using name from Firestore as fallback: ${customerName}`);
          }
        } catch (authError) {
          logger.error(`Error fetching user from Auth for ${userDoc.id}:`, authError);
          if (userData.name && userData.name.trim() !== '') {
            customerName = userData.name;
            logger.debug(`Using name from Firestore after Auth error: ${customerName}`);
          }
        }
        
        const templateParameter = {
          "korean-title": businessLink.koreanTitle,
          "customer-name": customerName,
          "article-link": businessLink.url
        };
        
        // Get phone number only from Firebase Auth
        let recipientNo = "";
        try {
          logger.debug(`Fetching phone number from Auth for user ${userDoc.id}`);
          const authUser = await admin.auth().getUser(userDoc.id);
          
          if (authUser.phoneNumber) {
            // Format phone number from auth (remove country code and any non-digits)
            recipientNo = authUser.phoneNumber.replace(/^\+82/, "0").replace(/\D/g, "");
            logger.debug(`Found phone from Auth: ${authUser.phoneNumber}, formatted: ${recipientNo}`);
          } else {
            logger.warn(`No phone number found in Auth for user ${userDoc.id}`);
            // Fallback to phone field in Firestore as last resort
            if (userData.phone) {
              recipientNo = userData.phone.replace(/^\+82/, "0").replace(/\D/g, "");
              logger.debug(`Using phone field from Firestore as fallback: ${recipientNo}`);
            }
          }
        } catch (authError) {
          logger.error(`Error fetching user from Auth for ${userDoc.id}:`, authError);
          // Fallback to phone field in Firestore as last resort
          if (userData.phone) {
            recipientNo = userData.phone.replace(/^\+82/, "0").replace(/\D/g, "");
            logger.debug(`Using phone field from Firestore as fallback after Auth error: ${recipientNo}`);
          }
        }
        
        // Skip if we couldn't find a valid phone number
        if (!recipientNo || !recipientNo.startsWith("010") || recipientNo.length < 10) {
          logger.warn(`Could not find valid phone number for user ${userDoc.id}, skipping`);
          continue;
        }
        
        // Add the articleId to the user's received_articles array
        try {
          logger.debug(`Adding business article ${businessLink.articleId} to received_articles for user ${userDoc.id}`);
          await userDoc.ref.update({
            received_articles: admin.firestore.FieldValue.arrayUnion(businessLink.articleId)
          });
          logger.debug(`Successfully added article to received_articles for user ${userDoc.id}`);
        } catch (updateError) {
          logger.error(`Failed to update received_articles for user ${userDoc.id}:`, updateError);
        }
        
        businessRecipients.push({
          "recipientNo": recipientNo,
          "templateParameter": templateParameter
        });
      }
      
      // Check if user should receive expiry notification
      if (userData.left_count === 1) {
        logger.debug(`Adding user ${userDoc.id} to expiry notifications as their left_count is 1`);
        
        // Get customer name from Firebase Auth first, then fallback to Firestore
        let customerName = "고객님"; // Default fallback
        try {
          logger.debug(`Fetching customer name from Auth for user ${userDoc.id}`);
          const authUser = await admin.auth().getUser(userDoc.id);
          
          if (authUser.displayName && authUser.displayName.trim() !== '') {
            customerName = authUser.displayName;
            logger.debug(`Using displayName from Auth as customer name: ${customerName}`);
          } else if (userData.name && userData.name.trim() !== '') {
            customerName = userData.name;
            logger.debug(`Using name from Firestore as fallback: ${customerName}`);
          }
        } catch (authError) {
          logger.error(`Error fetching user from Auth for ${userDoc.id}:`, authError);
          if (userData.name && userData.name.trim() !== '') {
            customerName = userData.name;
            logger.debug(`Using name from Firestore after Auth error: ${customerName}`);
          }
        }
        
        // Get phone number only from Firebase Auth
        let recipientNo = "";
        try {
          logger.debug(`Fetching phone number from Auth for user ${userDoc.id}`);
          const authUser = await admin.auth().getUser(userDoc.id);
          
          if (authUser.phoneNumber) {
            // Format phone number from auth (remove country code and any non-digits)
            recipientNo = authUser.phoneNumber.replace(/^\+82/, "0").replace(/\D/g, "");
            logger.debug(`Found phone from Auth: ${authUser.phoneNumber}, formatted: ${recipientNo}`);
          } else {
            logger.warn(`No phone number found in Auth for user ${userDoc.id}`);
            // Fallback to phone field in Firestore as last resort
            if (userData.phone) {
              recipientNo = userData.phone.replace(/^\+82/, "0").replace(/\D/g, "");
              logger.debug(`Using phone field from Firestore as fallback: ${recipientNo}`);
            }
          }
        } catch (authError) {
          logger.error(`Error fetching user from Auth for ${userDoc.id}:`, authError);
          // Fallback to phone field in Firestore as last resort
          if (userData.phone) {
            recipientNo = userData.phone.replace(/^\+82/, "0").replace(/\D/g, "");
            logger.debug(`Using phone field from Firestore as fallback after Auth error: ${recipientNo}`);
          }
        }
        
        // Skip if we couldn't find a valid phone number
        if (!recipientNo || !recipientNo.startsWith("010") || recipientNo.length < 10) {
          logger.warn(`Could not find valid phone number for user ${userDoc.id}, skipping`);
          continue;
        }
        
        expiryNotifications.push({
          "recipientNo": recipientNo,
          "templateParameter": {
            "customer-name": customerName,
            "store-link": "https://smartstore.naver.com/one-cup-english/products/10974832954"
          }
        });
      }
      
      // Update the user's left_count
      logger.debug(`Updating left_count for user ${userDoc.id} from ${userData.left_count} to ${userData.left_count - 1}`);
      try {
        // Create an update object
        const updates: any = {
          left_count: admin.firestore.FieldValue.increment(-1)
        };
        
        // Add last_received timestamp if user received any article
        if ((userData.cat_tech && techLink) || (userData.cat_business && businessLink) || userData.left_count === 1) {
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
      logger.debug(`Sending Kakao messages to ${techRecipients.length} tech recipients...`);
      try {
        const techResult = await sendKakaoMessages(techRecipients, "send-article");
        logger.debug(`Tech Kakao result: ${JSON.stringify(techResult)}`);
      } catch (kakaoError) {
        logger.error('Error sending tech Kakao messages:', kakaoError);
      }
    } else {
      logger.debug('No tech recipients to send messages to');
    }
    
    // Send to business recipients
    if (businessRecipients.length > 0) {
      logger.debug(`Sending Kakao messages to ${businessRecipients.length} business recipients...`);
      try {
        const businessResult = await sendKakaoMessages(businessRecipients, "send-article");
        logger.debug(`Business Kakao result: ${JSON.stringify(businessResult)}`);
      } catch (kakaoError) {
        logger.error('Error sending business Kakao messages:', kakaoError);
      }
    } else {
      logger.debug('No business recipients to send messages to');
    }
    
    // Send expiry notifications
    if (expiryNotifications.length > 0) {
      logger.debug(`Sending expiry notifications to ${expiryNotifications.length} users...`);
      try {
        const expiryResult = await sendKakaoMessages(expiryNotifications, "subscription-expired");
        logger.debug(`Expiry notification Kakao result: ${JSON.stringify(expiryResult)}`);
      } catch (kakaoError) {
        logger.error('Error sending expiry Kakao messages:', kakaoError);
      }
    } else {
      logger.debug('No expiry notifications to send');
    }
    
    logger.info(`Sent messages to: ${techRecipients.length} tech users, ${businessRecipients.length} business users`);
    logger.info(`Sent expiry notifications to: ${expiryNotifications.length} users`);
    
    return {
      techCount: techRecipients.length,
      businessCount: businessRecipients.length,
      expiryCount: expiryNotifications.length
    };
  } catch (error) {
    logger.error('Error in processAndSendLinks:', error);
    throw error;
  }
}

// Scheduled function that runs automatically (in production mode)
export const sendLinksToUsers = onSchedule({
  schedule: '0 8 * * *',
  timeZone: 'Asia/Seoul'
}, async (event: ScheduledEvent): Promise<void> => {
  try {
    await processAndSendLinks(false); // false = production mode
    return;
  } catch (error) {
    logger.error('Error in scheduled function:', error);
    return;
  }
});

// HTTP callable function for manual testing with specific recipients
export const testSendLinksToUsers = onCall({
  enforceAppCheck: false, // Set to true in production
}, async (request) => {
  try {
    const result = await processAndSendLinks(true); // true = test mode
    return {
      success: true,
      message: "Test links sent successfully to specified recipients",
      stats: result
    };
  } catch (error: any) {
    logger.error('Error in test function:', error);
    return {
      success: false,
      error: error.message || "Unknown error occurred"
    };
  }
});

async function sendKakaoMessages(recipientList: any[], templateCode: string) {
  logger.debug(`Preparing to send Kakao messages with template: ${templateCode}`);
  logger.debug(`Recipient list sample (first recipient): ${JSON.stringify(recipientList[0])}`);
  
  const data = {
    "senderKey": "1763d8030dde5f5f369ea0a088598c2fb4c792ab",
    "templateCode": templateCode,
    "recipientList": recipientList
  };
  
  const headers = {
    "X-Secret-Key": "PuyyHGNZ"
  };
  
  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      ...headers
    },
    body: JSON.stringify(data)
  };
  
  logger.debug(`Kakao API request body: ${options.body}`);
  logger.debug(`Sending Kakao API request to: https://api-alimtalk.cloud.toast.com/alimtalk/v2.2/appkeys/LROcHEW7abBbFhzc/messages`);
  
  try {
    // Using fetch instead of UrlFetchApp (which is for Google Apps Script)
    const response = await fetch('https://api-alimtalk.cloud.toast.com/alimtalk/v2.2/appkeys/LROcHEW7abBbFhzc/messages', options);
    
    logger.debug(`Kakao API response status: ${response.status} ${response.statusText}`);
    const responseText = await response.text();
    logger.debug(`Kakao API response body: ${responseText}`);
    
    if (!response.ok) {
      throw new Error(`Failed to send Kakao messages: ${response.status} ${response.statusText}, Response: ${responseText}`);
    }
    
    return JSON.parse(responseText);
  } catch (error) {
    logger.error('Error sending Kakao messages:', error);
    throw error;
  }
}

// New function to retrieve display names from Firebase Auth
export const getUserDisplayNames = onCall(async (request) => {
  try {
    const { userIds } = request.data;
    
    if (!userIds || !Array.isArray(userIds)) {
      throw new Error('Invalid or missing userIds parameter');
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
          displayNames[userId] = userRecord.displayName || '';
          phoneNumbers[userId] = userRecord.phoneNumber || '';
        } catch (error) {
          logger.error(`Error retrieving user ${userId}: ${error}`);
          displayNames[userId] = '';
          phoneNumbers[userId] = '';
        }
      });
      
      await Promise.all(promises);
    }
    
    logger.info(`Successfully retrieved ${Object.keys(displayNames).length} user records`);
    return { displayNames, phoneNumbers };
  } catch (error) {
    logger.error(`Error in getUserDisplayNames: ${error}`);
    throw new Error(`Failed to retrieve user data: ${error}`);
  }
});
