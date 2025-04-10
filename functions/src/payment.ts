import * as functions from 'firebase-functions';
import express from 'express';
import axios from 'axios';

// Initialize express
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Main payment endpoint
app.post('/', (req: express.Request, res: express.Response) => {
  // Collect payment data from request body
  const data = {
    PCD_PAY_RST: req.body.PCD_PAY_RST,
    PCD_PAY_MSG: req.body.PCD_PAY_MSG,
    PCD_PAY_OID: req.body.PCD_PAY_OID,
    PCD_PAY_TYPE: req.body.PCD_PAY_TYPE,
    PCD_PAY_WORK: req.body.PCD_PAY_WORK,
    PCD_PAYER_ID: req.body.PCD_PAYER_ID,
    PCD_PAYER_NO: req.body.PCD_PAYER_NO,
    PCD_PAYER_NAME: req.body.PCD_PAYER_NAME,
    PCD_PAYER_EMAIL: req.body.PCD_PAYER_EMAIL,
    PCD_REGULER_FLAG: req.body.PCD_REGULER_FLAG,
    PCD_PAY_YEAR: req.body.PCD_PAY_YEAR,
    PCD_PAY_MONTH: req.body.PCD_PAY_MONTH,
    PCD_PAY_GOODS: req.body.PCD_PAY_GOODS,
    PCD_PAY_TOTAL: req.body.PCD_PAY_TOTAL,
    PCD_PAY_TAXTOTAL: req.body.PCD_PAY_TAXTOTAL,
    PCD_PAY_ISTAX: req.body.PCD_PAY_ISTAX,
    PCD_PAY_CARDNAME: req.body.PCD_PAY_CARDNAME,
    PCD_PAY_CARDNUM: req.body.PCD_PAY_CARDNUM,
    PCD_PAY_CARDTRADENUM: req.body.PCD_PAY_CARDTRADENUM,
    PCD_PAY_CARDAUTHNO: req.body.PCD_PAY_CARDAUTHNO,
    PCD_PAY_CARDRECEIPT: req.body.PCD_PAY_CARDRECEIPT,
    PCD_PAY_TIME: req.body.PCD_PAY_TIME,
    PCD_TAXSAVE_RST: req.body.PCD_TAXSAVE_RST,
    PCD_AUTH_KEY: req.body.PCD_AUTH_KEY,
    PCD_PAY_REQKEY: req.body.PCD_PAY_REQKEY,
    PCD_PAY_COFURL: req.body.PCD_PAY_COFURL
  };
  
  // Redirect to the payment result page with data as URL parameters
  const redirectUrl = `${process.env.REACT_APP_HOSTNAME}/payment-result?${encodeURIComponent(JSON.stringify(data))}`;
  res.redirect(redirectUrl);
});

// Partner authentication endpoint
app.post('/auth', async (req: express.Request, res: express.Response) => {
  try {
    // Get authentication parameters
    const caseParams = req.body;
    const params = {
      cst_id: process.env.REACT_APP_CST_ID,
      custKey: process.env.REACT_APP_CUST_KEY,
      ...caseParams
    };
    
    // Set authentication URL and referrer
    const authUrl = process.env.REACT_APP_AUTH_URL || '';
    const referer = process.env.REACT_APP_HOSTNAME || '';
    
    // Send authentication request
    const response = await axios.post(authUrl, params, {
      headers: {
        'content-type': 'application/json',
        'referer': referer
      }
    });
    
    // Return authentication data
    res.status(200).json(response.data);
  } catch (error) {
    // Log error and return generic error message
    console.error('Payment authentication error:', error);
    res.status(500).send('An error occurred during payment processing');
  }
});

// Export the Firebase function
export const payment = functions.https.onRequest(app);
