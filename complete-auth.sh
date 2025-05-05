#!/bin/bash

# Complete Tesla Authentication Script
# 
# This script guides you through the Tesla OAuth authentication flow, saves the token,
# and then tests access to vehicle data.

echo "===== Tesla Fleet API Authentication ====="
echo "This script will:"
echo "1. Guide you through the OAuth flow to get a Tesla access token"
echo "2. Save the token to env.txt"
echo "3. Test the token by fetching vehicle data"
echo ""

# Install required packages if needed
echo "Checking for required packages..."
cd frontend
if [ ! -d "node_modules/ws" ] || [ ! -d "node_modules/axios" ]; then
  echo "Installing required packages..."
  npm install ws axios --save
fi

# Generate the Tesla OAuth URL for manual opening
echo ""
echo "===== Tesla OAuth Authorization URL ====="
TESLA_CLIENT_ID=$(grep TESLA_CLIENT_ID ../env.txt | head -n 1 | cut -d "=" -f 2 | tr -d "'\"")
TESLA_AUTH_URL=$(grep TESLA_AUTH_URL ../env.txt | grep -v NEXT_PUBLIC | head -n 1 | cut -d "=" -f 2 | tr -d "'\"")
TESLA_REDIRECT_URI="http://localhost:3000/api/auth/callback/tesla"

if [ -z "$TESLA_CLIENT_ID" ] || [ -z "$TESLA_AUTH_URL" ]; then
  echo "Error: Missing required environment variables in env.txt"
  echo "Please ensure TESLA_CLIENT_ID and TESLA_AUTH_URL are set."
  exit 1
fi

# Generate a random state parameter for security
STATE=$(openssl rand -hex 8)
AUTH_URL="$TESLA_AUTH_URL?client_id=$TESLA_CLIENT_ID&redirect_uri=$TESLA_REDIRECT_URI&response_type=code&scope=openid%20vehicle_device_data&state=$STATE"

echo "Please open the following URL in your browser:"
echo ""
echo "$AUTH_URL"
echo ""
echo "After authorizing, you will be redirected to a URL containing the authorization code."
echo "Copy the entire URL from your browser's address bar."
echo ""

# Ask for the authorization code from the user
read -p "Paste the full redirect URL here: " REDIRECT_URL

# Extract the authorization code from the URL
CODE=$(echo "$REDIRECT_URL" | grep -Eo 'code=[^&]+' | cut -d "=" -f 2)

if [ -z "$CODE" ]; then
  echo "Error: Could not extract authorization code from the URL."
  echo "Make sure you copied the entire URL after being redirected."
  exit 1
fi

echo "Authorization code extracted: ${CODE:0:10}..."

# Exchange the code for a token
echo ""
echo "===== Exchanging Code for Token ====="
node scripts/direct-token-exchange.js "$CODE"

# Check if the token exchange was successful
if [ $? -ne 0 ]; then
  echo "Token exchange failed. Please try again."
  exit 1
fi

echo ""
echo "===== Testing Vehicle Data Access ====="
node scripts/test-vehicle-data.js

# Check if the vehicle data test was successful
if [ $? -ne 0 ]; then
  echo "Vehicle data test failed. The token may not have sufficient permissions."
  echo "Please check your Tesla account permissions and try again."
  exit 1
fi

echo ""
echo "===== Authentication Complete ====="
echo "The access token has been saved to env.txt and tested successfully."
echo "You can now start the frontend with: cd frontend && npm run dev"
echo ""

read -p "Would you like to start the frontend now? (y/n): " START_FRONTEND

if [ "$START_FRONTEND" = "y" ] || [ "$START_FRONTEND" = "Y" ]; then
  echo "Starting the frontend with the saved token..."
  NODE_ENV=development npm run dev
else
  echo "Exiting without starting the frontend."
fi 