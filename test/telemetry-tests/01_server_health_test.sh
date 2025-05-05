#!/bin/bash
# Test 01: Server Health and Availability
# Verifies that the telemetry server is up and running with proper configuration

echo "=========================================="
echo "TEST 01: TELEMETRY SERVER HEALTH CHECK"
echo "=========================================="

SERVER_URL="https://tesla-telemetry-server-2.fly.dev"
echo "Target server: $SERVER_URL"

# Check if the server is reachable
echo -n "Checking if server is reachable... "
if curl -s -k --head --fail "$SERVER_URL" > /dev/null; then
  echo "✅ SUCCESS: Server is reachable"
else
  echo "❌ FAILED: Server is not reachable"
  exit 1
fi

# Check the health endpoint
echo -n "Checking health endpoint... "
HEALTH_RESPONSE=$(curl -s -k "$SERVER_URL/health")

if [[ $HEALTH_RESPONSE == *"\"status\":\"ok\""* ]]; then
  echo "✅ SUCCESS: Health endpoint returned OK"
  echo "Response: $HEALTH_RESPONSE"
else
  echo "❌ FAILED: Health endpoint did not return OK"
  echo "Response: $HEALTH_RESPONSE"
  exit 1
fi

# Check if public key is available on the server
echo -n "Checking if the server can access the public key... "
if [[ $HEALTH_RESPONSE == *"\"publicKeyAvailable\":true"* ]]; then
  echo "✅ SUCCESS: Public key is available to the server"
else
  echo "❌ FAILED: Public key is not available to the server"
  echo "Response: $HEALTH_RESPONSE"
  exit 1
fi

echo -e "\n✅ TEST 01 PASSED: Telemetry server is healthy and accessible"
exit 0 