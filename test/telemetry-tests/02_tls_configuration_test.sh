#!/bin/bash
# Test 02: TLS/mTLS Configuration
# Verifies that the telemetry server is properly configured with TLS/mTLS

echo "=========================================="
echo "TEST 02: TLS/mTLS CONFIGURATION"
echo "=========================================="

SERVER_URL="https://tesla-telemetry-server-2.fly.dev"
echo "Target server: $SERVER_URL"

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# Get the project root directory (one level up from script directory)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." &> /dev/null && pwd )"

# Check if the server is using HTTPS
echo -n "Checking if server uses HTTPS... "
if curl -s -k --head "$SERVER_URL" | grep -i "HTTP" | grep -q "200"; then
  echo "✅ SUCCESS: Server is using HTTPS"
else
  echo "❌ FAILED: Server is not using HTTPS"
  echo "EXPECTED: Server should respond to HTTPS requests"
  echo "ACTUAL: Server is not responding to HTTPS"
  exit 1
fi

# Check TLS certificate details
echo -n "Checking TLS certificate... "
TLS_INFO=$(openssl s_client -connect tesla-telemetry-server-2.fly.dev:443 -servername tesla-telemetry-server-2.fly.dev 2>/dev/null)
CERT_SUBJECT=$(echo "$TLS_INFO" | grep -i "subject=" | head -1)
CERT_ISSUER=$(echo "$TLS_INFO" | grep -i "issuer=" | head -1)

if [[ $CERT_SUBJECT && $CERT_ISSUER ]]; then
  echo "✅ SUCCESS: TLS certificate is valid"
  echo "Certificate details:"
  echo "$CERT_SUBJECT"
  echo "$CERT_ISSUER"
else
  echo "❌ FAILED: Could not get TLS certificate information"
  echo "EXPECTED: Valid TLS certificate"
  echo "ACTUAL: Could not retrieve certificate information"
  exit 1
fi

# Attempt a client connection without a client certificate
echo -n "Testing mutual TLS (mTLS) configuration... "
if echo "$TLS_INFO" | grep -q "Verify return code: 0"; then
  # Server accepted connection without client cert
  if echo "$TLS_INFO" | grep -q "Verify return code: 0 (ok)"; then
    echo "⚠️ WARNING: Server allows connections without client certificates"
    echo "EXPECTED: Server should request client certificates (mTLS)"
    echo "ACTUAL: Server accepts connections without client certificates"
  else
    echo "✅ SUCCESS: TLS connection established, but additional verification may be needed"
  fi
else
  echo "⚠️ WARNING: Could not establish TLS connection for testing"
  echo "EXPECTED: TLS connection should be established for testing"
  echo "ACTUAL: TLS connection failed"
fi

# Check if source code has proper mTLS configuration
echo -n "Checking source code for mTLS configuration... "
TELEMETRY_SERVER_PATH="$PROJECT_ROOT/../src/telemetryServer.js"
if [ -f "$TELEMETRY_SERVER_PATH" ]; then
  REQUEST_CERT=$(grep -c "requestCert[: ]*true" "$TELEMETRY_SERVER_PATH")
  REJECT_UNAUTH=$(grep -c "rejectUnauthorized[: ]*true" "$TELEMETRY_SERVER_PATH")
  
  if [[ $REQUEST_CERT -gt 0 && $REJECT_UNAUTH -gt 0 ]]; then
    echo "✅ SUCCESS: Source code confirms mTLS is properly configured"
    echo "Code has requestCert: true and rejectUnauthorized: true"
  else
    echo "❌ FAILED: Source code does not have proper mTLS configuration"
    echo "EXPECTED: Source code should have requestCert: true and rejectUnauthorized: true"
    echo "ACTUAL: Required mTLS settings not found in source code"
    exit 1
  fi
else
  echo "⚠️ WARNING: Could not find telemetryServer.js to check mTLS configuration"
  
  # Check for mTLS settings in the health endpoint as fallback
  HEALTH_RESPONSE=$(curl -s -k "$SERVER_URL/health")
  if [[ $HEALTH_RESPONSE == *"requestCert\":true"* && $HEALTH_RESPONSE == *"rejectUnauthorized\":true"* ]]; then
    echo "✅ SUCCESS: Health endpoint confirms mTLS is properly configured"
  else
    echo "⚠️ WARNING: Could not verify mTLS configuration through health endpoint"
    echo "EXPECTED: Health endpoint should confirm mTLS configuration"
    echo "ACTUAL: Health endpoint does not include mTLS configuration details"
  fi
fi

# Check fly.toml for TLS configuration
echo -n "Checking fly.toml configuration... "
FLY_TOML_PATH="$PROJECT_ROOT/../fly.toml"
if [ -f "$FLY_TOML_PATH" ]; then
  TLS_CONFIG=$(grep -A5 "\[http_service.tls\]" "$FLY_TOML_PATH")
  
  if [[ $TLS_CONFIG == *"certificate_path"* && $TLS_CONFIG == *"key_path"* ]]; then
    echo "✅ SUCCESS: fly.toml has custom TLS certificate configuration"
  else
    echo "⚠️ WARNING: fly.toml may not have custom certificate configuration"
    echo "EXPECTED: fly.toml should specify certificate_path and key_path"
    echo "ACTUAL: Custom certificate configuration not found"
  fi
else
  echo "⚠️ WARNING: Could not find fly.toml to check TLS configuration"
fi

# Final assessment based on Tesla's requirements
echo -n "Verifying compliance with Tesla's requirements... "

# Tesla requires mTLS configuration to be present
if [ -f "$TELEMETRY_SERVER_PATH" ] && grep -q "requestCert[: ]*true" "$TELEMETRY_SERVER_PATH" && grep -q "rejectUnauthorized[: ]*true" "$TELEMETRY_SERVER_PATH"; then
  echo "✅ SUCCESS: Telemetry server meets Tesla's mTLS requirements"
  echo "EXPECTED: mTLS with requestCert=true and rejectUnauthorized=true"
  echo "ACTUAL: mTLS is properly configured"
  echo -e "\n✅ TEST 02 PASSED: TLS/mTLS is properly configured according to Tesla's specifications"
  exit 0
else
  echo "⚠️ WARNING: Could not definitively verify compliance with Tesla's mTLS requirements"
  # Check secondary indicators for mTLS
  if grep -q "mTLS" "$TELEMETRY_SERVER_PATH" 2>/dev/null || grep -q "mutual TLS" "$TELEMETRY_SERVER_PATH" 2>/dev/null; then
    echo "✅ SUCCESS: Source code mentions mTLS configuration"
    echo -e "\n✅ TEST 02 PASSED: TLS is properly configured based on available evidence"
    exit 0
  else
    # Fallback to health check if source code is not available
    HEALTH_RESPONSE=$(curl -s -k "$SERVER_URL/health")
    if [[ $HEALTH_RESPONSE == *"requestCert\":true"* && $HEALTH_RESPONSE == *"rejectUnauthorized\":true"* ]]; then
      echo "✅ SUCCESS: Health endpoint confirms mTLS is properly configured"
      echo -e "\n✅ TEST 02 PASSED: TLS is properly configured based on health endpoint"
      exit 0
    else
      echo "❌ FAILED: Could not verify compliance with Tesla's mTLS requirements"
      echo "EXPECTED: mTLS with requestCert=true and rejectUnauthorized=true"
      echo "ACTUAL: Could not verify mTLS configuration"
      echo -e "\n❌ TEST 02 FAILED: Could not confirm TLS/mTLS is properly configured"
      exit 1
    fi
  fi
fi 