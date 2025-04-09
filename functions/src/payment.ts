import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";
import axios from "axios";

// Payple API URLs
const PAYPLE_URLS = {
  AUTH: {
    test: "https://democpay.payple.kr/php/auth.php",
    prod: "https://cpay.payple.kr/php/auth.php",
  },
  BILLING: {
    test: "https://democpay.payple.kr/php/SimplePayCardAct.php?ACT_=PAYM",
    prod: "https://cpay.payple.kr/php/SimplePayCardAct.php?ACT_=PAYM",
  },
  CANCEL: {
    test: "https://democpay.payple.kr/php/SimplePayCardAct.php?ACT_=PUSERDEL",
    prod: "https://cpay.payple.kr/php/SimplePayCardAct.php?ACT_=PUSERDEL",
  },
};

// Payple credentials - Updated based on documentation
const PAYPLE_CONFIG = {
  test: {
    cst_id: "test",
    custKey: "abcd1234567890",
    referer: "1cupenglish.com",
  },
  prod: {
    cst_id: "eklass", 
    custKey: "152ca21974f01290cb85d75279313e9fc7f7846d90f92af3ac2fd9a552d3cc06",
    referer: "1cupenglish.com",
  },
};

// Interface for payment result details
interface PaymentResultDetail {
  userId: string;
  status: string;
  message: string;
  orderId?: string;
}

// Interface for payment results
interface PaymentResults {
  total: number;
  success: number;
  failed: number;
  details: PaymentResultDetail[];
}

// Create Express app for payment service
const app = express();
app.use(cors({ 
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Utility function to get environment config
function getConfig(isProd = false) {
  return isProd ? PAYPLE_CONFIG.prod : PAYPLE_CONFIG.test;
}

// Utility function to get API URL
function getApiUrl(type: 'AUTH' | 'BILLING' | 'CANCEL', isProd = false) {
  return isProd ? PAYPLE_URLS[type].prod : PAYPLE_URLS[type].test;
}

// Authenticate with Payple
async function authenticateWithPayple(isProd = false) {
  const config = getConfig(isProd);
  const url = getApiUrl('AUTH', isProd);
  
  try {
    logger.info('Authenticating with Payple', { isProd });
    
    const response = await axios.post(
      url,
      {
        cst_id: config.cst_id,
        custKey: config.custKey,
        PCD_PAY_TYPE: "card",
        PCD_SIMPLE_FLAG: "Y",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Referer": `https://${config.referer}`,
        },
      }
    );
    
    logger.info('Payple authentication successful');
    return response.data;
  } catch (error) {
    logger.error('Payple authentication failed', error);
    throw error;
  }
}

// Process billing payment with billing key
async function processBillingPayment(billingKey: string, amount: number, orderId: string, goodsName: string, isProd = false) {
  try {
    // First authenticate with Payple
    const authData = await authenticateWithPayple(isProd);
    
    // Use authentication response to make billing payment
    const config = getConfig(isProd);
    const url = getApiUrl('BILLING', isProd);
    
    logger.info('Processing billing payment', { billingKey, amount, orderId, isProd });
    
    const response = await axios.post(
      url,
      {
        PCD_CST_ID: authData.cst_id,
        PCD_CUST_KEY: authData.custKey,
        PCD_AUTH_KEY: authData.AuthKey,
        PCD_PAY_TYPE: "card",
        PCD_PAYER_ID: billingKey,
        PCD_PAY_GOODS: goodsName,
        PCD_PAY_TOTAL: amount.toString(),
        PCD_PAY_OID: orderId,
        PCD_SIMPLE_FLAG: "Y",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Referer": `https://${config.referer}`,
        },
      }
    );
    
    logger.info('Billing payment successful', response.data);
    return response.data;
  } catch (error) {
    logger.error('Billing payment failed', error);
    throw error;
  }
}

// Revoke billing key
async function revokeBillingKey(billingKey: string, isProd = false) {
  try {
    // First authenticate with Payple
    const authData = await authenticateWithPayple(isProd);
    
    // Use authentication response to revoke billing key
    const config = getConfig(isProd);
    const url = getApiUrl('CANCEL', isProd);
    
    logger.info('Revoking billing key', { billingKey, isProd });
    
    const response = await axios.post(
      url,
      {
        PCD_CST_ID: authData.cst_id,
        PCD_CUST_KEY: authData.custKey,
        PCD_AUTH_KEY: authData.AuthKey,
        PCD_PAYER_ID: billingKey,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Referer": `https://${config.referer}`,
        },
      }
    );
    
    logger.info('Billing key revoked successfully', response.data);
    return response.data;
  } catch (error) {
    logger.error('Billing key revocation failed', error);
    throw error;
  }
}

// API route to receive payment result from client
app.post('/api/payment/result', async (req, res) => {
  try {
    // Log the entire request for debugging
    logger.info('Payment result received', {
      body: req.body,
      headers: req.headers
    });
    
    // Important: Just return a plain text 'success' exactly as shown in the sample
    // Payple expects this specific format without JSON
    res.status(200).send('success');
    
    // Process the payment data in the background after responding
    setTimeout(async () => {
      try {
        await processPaymentData(req.body);
      } catch (err) {
        logger.error('Background payment processing error', err);
      }
    }, 0);
  } catch (error) {
    logger.error('Error in payment result handler', error);
    // Even on error, return success to prevent Payple from retrying
    res.status(200).send('success');
  }
});

// Process payment data in the background
async function processPaymentData(paymentData: any) {
  try {
    const db = admin.firestore();
    
    // Extract key fields with fallbacks
    const payResult = paymentData.PCD_PAY_RST || 'unknown';
    const payMsg = paymentData.PCD_PAY_MSG || 'No message provided';
    const payOrderId = paymentData.PCD_PAY_OID || '';
    const payerId = paymentData.PCD_PAYER_ID || '';
    const payerNo = paymentData.PCD_PAYER_NO || '';
    
    logger.info('Processing payment data', { 
      result: payResult,
      message: payMsg,
      orderId: payOrderId,
      payerId: payerId,
      payerNo: payerNo
    });
    
    // Save raw payment data for debugging
    await db.collection('paymentLogs').add({
      rawData: paymentData,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      processedResult: payResult
    });
    
    // Only proceed if we have the necessary data
    if (payerNo && payerId && payOrderId) {
      // Check if user exists
      const userRef = db.collection('users').doc(payerNo);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        // Store payment info
        await db.collection('payments').doc(payOrderId).set({
          userId: payerNo,
          billingKey: payerId,
          orderId: payOrderId,
          status: payResult === 'success' ? 'registered' : 'failed',
          amount: 1,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          rawResponse: paymentData
        });
        
        // Update user subscription if payment was successful
        if (payResult === 'success') {
          await userRef.update({
            hasActiveSubscription: true,
            billingKey: payerId,
            subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
            paymentMethod: 'card',
          });
          
          logger.info('User subscription updated', { userId: payerNo });
        }
      } else {
        logger.warn(`User ${payerNo} not found`);
      }
    } else {
      logger.warn('Incomplete payment data', paymentData);
    }
  } catch (error) {
    logger.error('Payment processing error', error);
  }
}

// API route to process monthly subscription payments
app.post('/api/subscription/process', async (req, res) => {
  try {
    // Verify request is authenticated
    // This should be replaced with proper authentication
    const { apiKey } = req.body;
    if (apiKey !== process.env.SUBSCRIPTION_API_KEY) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    logger.info('Starting subscription processing');
    
    const db = admin.firestore();
    const isProd = process.env.NODE_ENV === 'production';
    
    // Get all users with active subscriptions and billing keys
    const usersSnapshot = await db.collection('users')
      .where('hasActiveSubscription', '==', true)
      .where('billingKey', '!=', null)
      .get();
    
    logger.info(`Found ${usersSnapshot.size} users with active subscriptions`);
    
    const results: PaymentResults = {
      total: usersSnapshot.size,
      success: 0,
      failed: 0,
      details: [],
    };
    
    // Process each subscription
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const billingKey = userData.billingKey;
      
      try {
        // Generate order ID for this subscription payment
        const orderId = `subscription_${Date.now()}_${userId.substring(0, 8)}`;
        
        // Process subscription payment
        const paymentResult = await processBillingPayment(
          billingKey,
          1, // Changed from 9900 to 1 KRW
          orderId,
          '영어 한잔 정기구독',
          isProd
        );
        
        // Save payment record
        await db.collection('payments').doc(orderId).set({
          userId: userId,
          billingKey: billingKey,
          orderId: orderId,
          amount: 1, // Changed from 9900 to 1 KRW
          status: paymentResult.PCD_PAY_RST === 'success' ? 'success' : 'failed',
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          paymentDetails: paymentResult,
        });
        
        if (paymentResult.PCD_PAY_RST === 'success') {
          results.success++;
          results.details.push({
            userId,
            status: 'success',
            message: 'Payment successful',
            orderId,
          });
          
          // Update user's document with new payment date
          await db.collection('users').doc(userId).update({
            lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
            subscriptionActive: true,
          });
          
          logger.info(`Subscription payment successful for user ${userId}`);
        } else {
          results.failed++;
          results.details.push({
            userId,
            status: 'failed',
            message: paymentResult.PCD_PAY_MSG || 'Unknown error',
            orderId,
          });
          
          logger.error(`Subscription payment failed for user ${userId}`, paymentResult);
        }
      } catch (error: any) {
        results.failed++;
        results.details.push({
          userId,
          status: 'error',
          message: error.message || 'Unknown error',
        });
        
        logger.error(`Error processing subscription for user ${userId}`, error);
      }
    }
    
    logger.info('Subscription processing completed', results);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Subscription processing completed',
      results,
    });
  } catch (error) {
    logger.error('Error processing subscriptions', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error processing subscriptions',
    });
  }
});

// API route to cancel subscription
app.post('/api/subscription/cancel', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    
    logger.info(`Cancelling subscription for user ${userId}`);
    
    const db = admin.firestore();
    const isProd = process.env.NODE_ENV === 'production';
    
    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    if (!userData || !userData.billingKey) {
      return res.status(400).json({ success: false, message: 'No billing key found for user' });
    }
    
    // Revoke billing key
    const revokeResult = await revokeBillingKey(userData.billingKey, isProd);
    
    // Update user's subscription status
    await db.collection('users').doc(userId).update({
      hasActiveSubscription: false,
      subscriptionEndDate: admin.firestore.FieldValue.serverTimestamp(),
      billingKey: admin.firestore.FieldValue.delete(),
    });
    
    // Record cancellation
    await db.collection('subscriptionCancellations').add({
      userId: userId,
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      billingKey: userData.billingKey,
      revokeResult: revokeResult,
    });
    
    logger.info(`Subscription cancelled successfully for user ${userId}`);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    logger.error('Error cancelling subscription', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error cancelling subscription',
    });
  }
});

// API route to check payment status
app.post('/api/payment/check-status', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    logger.info(`Checking payment status for order: ${orderId}`);
    
    const db = admin.firestore();
    const paymentDoc = await db.collection('payments').doc(orderId).get();
    
    if (!paymentDoc.exists) {
      logger.info(`No payment record found for order: ${orderId}`);
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }
    
    const paymentData = paymentDoc.data();
    logger.info(`Payment status for order ${orderId}:`, paymentData);
    
    return res.status(200).json({
      success: true,
      status: paymentData?.status || 'unknown',
      userId: paymentData?.userId,
      billingKey: paymentData?.billingKey,
      createdAt: paymentData?.createdAt?.toDate()
    });
  } catch (error: any) {
    logger.error(`Error checking payment status: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: 'Error checking payment status',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// API route to handle payment authorization for Payple
app.post('/api/auth', async (req, res) => {
  try {
    logger.info('Auth request received', req.body);
    
    const isProd = process.env.NODE_ENV === 'production';
    const config = getConfig(isProd);
    
    // This is similar to the sample React app's auth handler
    const authResponse = {
      cst_id: config.cst_id,
      custKey: config.custKey,
      AuthKey: 'yymmddHHmmss' + Math.random().toString(36).substring(2, 8), // Generate a random auth key
      return_url: isProd ? 'https://cpay.payple.kr/php/auth.php' : 'https://democpay.payple.kr/php/auth.php'
    };
    
    logger.info('Auth response', authResponse);
    res.status(200).json(authResponse);
  } catch (error) {
    logger.error('Error in auth handler', error);
    res.status(500).json({ success: false, message: 'Auth error' });
  }
});

// Add a simple health check endpoint
app.get('/api/payment/status', (req, res) => {
  logger.info('Status check received');
  return res.status(200).json({
    success: true,
    message: 'Payment service is running',
    timestamp: new Date().toISOString()
  });
});

// Export Express app as a Firebase Function
export const paymentService = onRequest({ timeoutSeconds: 300 }, app); 