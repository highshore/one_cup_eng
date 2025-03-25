import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

admin.initializeApp();

interface LinkData {
  url: string;
  articleId: string;
  koreanTitle?: string;
}

interface UserData {
  name: string;
  left_count: number;
  cat_business: boolean;
  cat_tech: boolean;
  phone: string;
}

// Extracted core logic into a reusable function
async function processAndSendLinks(): Promise<{
  techCount: number;
  businessCount: number;
  expiryCount: number;
}> {
  try {
    const db = admin.firestore();
    logger.debug('Starting to process and send links');
    
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
      if (data?.url) {
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
          koreanTitle
        });
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
      if (data?.url) {
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
          koreanTitle
        });
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
    
    // 2. Process users
    logger.debug('Fetching users from Firestore...');
    const usersSnapshot = await db.collection('users').get();
    logger.debug(`Found ${usersSnapshot.docs.length} user documents`);
    
    const techRecipients: any[] = [];
    const businessRecipients: any[] = [];
    const expiryNotifications: any[] = [];
    
    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data() as UserData;
      logger.debug(`Processing user ${userDoc.id}: left_count=${userData.left_count}, cat_tech=${userData.cat_tech}, cat_business=${userData.cat_business}`);
      
      // Skip users with zero left_count
      if (userData.left_count <= 0) {
        logger.debug(`Skipping user ${userDoc.id} because left_count is ${userData.left_count}`);
        continue;
      }
      
      // Add to tech recipients if cat_tech is true
      if (userData.cat_tech && techLink) {
        logger.debug(`Adding user ${userDoc.id} to tech recipients`);
        const templateParameter = {
          "korean-title": techLink.koreanTitle,
          "customer-name": userData.name,
          "article-link": techLink.url
        };
        
        techRecipients.push({
          "recipientNo": userDoc.id,
          "templateParameter": templateParameter
        });
      }
      
      // Add to business recipients if cat_business is true
      if (userData.cat_business && businessLink) {
        logger.debug(`Adding user ${userDoc.id} to business recipients`);
        const templateParameter = {
          "korean-title": businessLink.koreanTitle,
          "customer-name": userData.name,
          "article-link": businessLink.url
        };
        
        businessRecipients.push({
          "recipientNo": userDoc.id,
          "templateParameter": templateParameter
        });
      }
      
      // Check if user should receive expiry notification
      if (userData.left_count === 1) {
        logger.debug(`Adding user ${userDoc.id} to expiry notifications as their left_count is 1`);
        expiryNotifications.push({
          "recipientNo": userDoc.id,
          "templateParameter": {
            "customer-name": userData.name,
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

// Scheduled function that runs automatically
export const sendLinksToUsers = onSchedule({
  schedule: '0 8 * * *',
  timeZone: 'Asia/Seoul'
}, async (event: ScheduledEvent): Promise<void> => {
  try {
    await processAndSendLinks();
    return;
  } catch (error) {
    logger.error('Error in scheduled function:', error);
    return;
  }
});

// HTTP callable function for manual testing
export const testSendLinksToUsers = onCall({
  enforceAppCheck: false, // Set to true in production
}, async (request) => {
  try {
    const result = await processAndSendLinks();
    return {
      success: true,
      message: "Links sent successfully",
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
