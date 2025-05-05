#!/bin/bash
# Simple Test: Public Key Verification
# Verifies that the public key is available and in the correct format

echo "=========================================="
echo "SIMPLE TEST: PUBLIC KEY VERIFICATION"
echo "=========================================="

PUBLIC_KEY_URL="https://public-key-server-tesla.vercel.app/.well-known/appspecific/com.tesla.3p.public-key.pem"
echo "Public key URL: $PUBLIC_KEY_URL"

# Check if the public key is accessible
echo -n "Checking if public key is accessible... "
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PUBLIC_KEY_URL")

if [[ $HTTP_STATUS -eq 200 ]]; then
  echo "✅ SUCCESS: Public key is accessible (HTTP 200)"
else
  echo "❌ FAILED: Public key is not accessible (HTTP $HTTP_STATUS)"
  echo "EXPECTED: Public key should be accessible at $PUBLIC_KEY_URL"
  echo "ACTUAL: Public key is not accessible (HTTP $HTTP_STATUS)"
  exit 1
fi

# Check if the content type is correct
echo -n "Checking if content type is correct... "
CONTENT_TYPE=$(curl -s -I "$PUBLIC_KEY_URL" | grep -i "content-type:")

if [[ $CONTENT_TYPE == *"application/x-pem-file"* ]] || [[ $CONTENT_TYPE == *"application/x-x509-ca-cert"* ]]; then
  echo "✅ SUCCESS: Content type is valid ($(echo $CONTENT_TYPE | cut -d ' ' -f 2))"
else
  echo "❌ FAILED: Content type is not valid for a public key file"
  echo "Content type: $CONTENT_TYPE"
  echo "EXPECTED: Content type should be application/x-pem-file or application/x-x509-ca-cert"
  echo "ACTUAL: Content type is $CONTENT_TYPE"
  exit 1
fi

# Download the public key
echo -n "Downloading public key... "
PUBLIC_KEY=$(curl -s "$PUBLIC_KEY_URL")

if [[ $PUBLIC_KEY == *"BEGIN PUBLIC KEY"* && $PUBLIC_KEY == *"END PUBLIC KEY"* ]]; then
  echo "✅ SUCCESS: Public key has valid PEM format"
else
  echo "❌ FAILED: Public key does not have valid PEM format"
  echo "Public key content: $PUBLIC_KEY"
  echo "EXPECTED: Public key should have BEGIN PUBLIC KEY and END PUBLIC KEY markers"
  echo "ACTUAL: Public key does not have proper PEM format"
  exit 1
fi

# Final assessment based on Tesla's requirements
echo -n "Verifying compliance with Tesla's public key requirements... "

# Tesla requires the public key to be available at a specific URL path
if [[ $HTTP_STATUS -eq 200 ]]; then
  echo "✅ SUCCESS: Public key configuration meets Tesla's requirements"
  echo "EXPECTED: Public key accessible at standard path"
  echo "ACTUAL: Public key is accessible at the required path"
  echo -e "\n✅ TEST PASSED: Public key is available and valid according to Tesla's specifications"
  
  exit 0
else
  echo "❌ FAILED: Public key configuration does not meet Tesla's requirements"
  echo "EXPECTED: Public key accessible at standard path"
  echo "ACTUAL: Issues found with public key accessibility"
  echo -e "\n❌ TEST FAILED: Public key is not properly configured according to Tesla's specifications"
  exit 1
fi 