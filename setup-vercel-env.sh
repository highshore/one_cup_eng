#!/bin/bash

# Script to extract Firebase credentials for Vercel environment variables
# Run this and copy the output to your Vercel project settings

echo "========================================"
echo "Vercel Environment Variables Setup"
echo "========================================"
echo ""
echo "Add these environment variables in Vercel:"
echo "Dashboard → Your Project → Settings → Environment Variables"
echo ""
echo "========================================"
echo ""

if [ -f "firebase_service_account.json" ]; then
    PROJECT_ID=$(jq -r '.project_id' firebase_service_account.json)
    CLIENT_EMAIL=$(jq -r '.client_email' firebase_service_account.json)
    PRIVATE_KEY=$(jq -r '.private_key' firebase_service_account.json)
    
    echo "Variable Name: FIREBASE_PROJECT_ID"
    echo "Value: $PROJECT_ID"
    echo ""
    
    echo "Variable Name: FIREBASE_CLIENT_EMAIL"
    echo "Value: $CLIENT_EMAIL"
    echo ""
    
    echo "Variable Name: FIREBASE_PRIVATE_KEY"
    echo "Value: (The private key - copy from below, including quotes and newlines)"
    echo "---"
    echo "$PRIVATE_KEY"
    echo "---"
    echo ""
    
    echo "========================================"
    echo "✅ All values extracted successfully!"
    echo ""
    echo "⚠️  IMPORTANT:"
    echo "   1. Set these for ALL environments (Production, Preview, Development)"
    echo "   2. For FIREBASE_PRIVATE_KEY, copy the ENTIRE key including -----BEGIN/END-----"
    echo "   3. After adding these, redeploy your site"
    echo "========================================"
else
    echo "❌ Error: firebase_service_account.json not found"
    echo "   Please make sure you're in the project root directory"
fi

