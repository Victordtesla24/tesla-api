#!/bin/bash
# Verify Public Key Server functionality
# Tests that:
# 1. The public key server is accessible
# 2. The public key is served at the correct URL
# 3. The public key has the correct format
# 4. The content type is correct

# Exit on error, treat unset variables as error, pipelines fail on first error
set -euo pipefail

# Read environment variables
if [ -f .env ]; then
  source .env
elif [ -f env.txt ]; then
  source env.txt
fi

# Set default values if environment variables are not set
PUBLIC_KEY_SERVER_URL=${PUBLIC_KEY_SERVER_URL:-https://public-key-server-tesla.vercel.app}
WELL_KNOWN_PATH=${WELL_KNOWN_PATH:-/.well-known/appspecific/com.tesla.3p.public-key.pem}

# Remove trailing slash from PUBLIC_KEY_SERVER_URL if present
PUBLIC_KEY_SERVER_URL=${PUBLIC_KEY_SERVER_URL%/}

# Construct full URL
FULL_PUBLIC_KEY_URL="${PUBLIC_KEY_SERVER_URL}${WELL_KNOWN_PATH}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Verifying Public Key Server...${NC}"
echo "Public Key URL: ${FULL_PUBLIC_KEY_URL}"

# Test 1: Check that the server is accessible
echo -n "1. Testing server accessibility... "
if curl -s -f -o /dev/null "${PUBLIC_KEY_SERVER_URL}/health"; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC}"
  echo "  Server health check failed"
  exit 1
fi

# Test 2: Check that the public key URL returns a 200 status code
echo -n "2. Testing public key URL... "
if STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${FULL_PUBLIC_KEY_URL}") && [ "$STATUS_CODE" -eq 200 ]; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC}"
  echo "  Public key URL returned status code: ${STATUS_CODE}"
  exit 1
fi

# Test 3: Check that the content type is correct
echo -n "3. Testing content type... "
CONTENT_TYPE=$(curl -s -I "${FULL_PUBLIC_KEY_URL}" | grep -i "content-type" | awk '{print $2}' | tr -d '\r')
if [[ "${CONTENT_TYPE}" == "application/x-pem-file" ]] || [[ "${CONTENT_TYPE}" == "text/plain" ]]; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC}"
  echo "  Content-Type is: ${CONTENT_TYPE} (expected: application/x-pem-file or text/plain)"
  exit 1
fi

# Test 4: Check that the public key has the correct format
echo -n "4. Testing public key format... "
PUBLIC_KEY=$(curl -s "${FULL_PUBLIC_KEY_URL}")
if [[ "${PUBLIC_KEY}" == *"-----BEGIN PUBLIC KEY-----"* ]] && [[ "${PUBLIC_KEY}" == *"-----END PUBLIC KEY-----"* ]]; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC}"
  echo "  Public key does not have the correct format:"
  echo "${PUBLIC_KEY}"
  exit 1
fi

# Test 5: Verify that the key is a valid EC public key
echo -n "5. Testing if it's a valid EC public key... "
TEMP_KEY=$(mktemp)
curl -s "${FULL_PUBLIC_KEY_URL}" > "$TEMP_KEY"
KEY_INFO=$(openssl ec -pubin -in "$TEMP_KEY" -text -noout 2>/dev/null || echo "Invalid")
rm "$TEMP_KEY"
if [[ "$KEY_INFO" != "Invalid" ]] && [[ "$KEY_INFO" == *"prime256v1"* ]]; then
  echo -e "${GREEN}PASS${NC}"
else
  echo -e "${RED}FAIL${NC}"
  echo "  Public key is not a valid EC key with prime256v1 curve"
  exit 1
fi

echo -e "${GREEN}All tests passed. Public Key Server is correctly deployed and serving the public key.${NC}"
exit 0 