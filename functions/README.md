# One Cup English - Payment Service

This is the payment processing service for One Cup English, handling Payple payment integration.

## Payment Process Flow

1. **Frontend Payment Request**:
   - User fills payment information in `/payment` page
   - Payment form sends request to Payple API with auth token
   - Payple processes the payment request

2. **Payment Result Handling**:
   - Payple sends the payment result to our backend endpoint `/api/payment/result`
   - The backend stores the payment information in Firestore
   - User is redirected to the payment result page with payment data

3. **Payment Result Display**:
   - The `/payment-result` page displays payment status and details
   - For auth-only transactions (CERT), additional approval can be requested
   - On success, user billing information is stored for recurring payments

## API Endpoints

### POST /api/payment/result
Handles the payment result callback from Payple.
- Stores payment result in Firestore
- Updates user billing information if successful
- Redirects to frontend payment result page

### POST /api/payment/auth
Handles Payple partner authentication.
- Provides authentication tokens for payment processing
- Used for both initial payment and refund operations

### POST /api/payment/check-status
Allows checking the status of a payment by order ID.
- Returns payment status, amount, method, etc.

## Environment Variables

The following environment variables should be set:

```
# Production Payple credentials
PAYPLE_CST_ID=your_production_partner_id
PAYPLE_CUST_KEY=your_production_partner_key
PAYPLE_REFUND_KEY=your_production_refund_key

# Test Payple credentials
PAYPLE_TEST_CST_ID=test
PAYPLE_TEST_CUST_KEY=test_MzE0NDg1NDU4OTc1

# Frontend URL for redirects
REACT_APP_FRONTEND_URL=https://1cupenglish.com
```

## Local Development

1. Set up the Firebase emulator:
   ```
   npm run serve
   ```

2. The payment service will be available at:
   ```
   http://localhost:5001/one-cup-eng/us-central1/paymentService
   ```

3. Configure the frontend to use this local endpoint during development. 