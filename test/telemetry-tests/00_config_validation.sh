#!/bin/bash
# Test 00: Configuration Validation
# Verifies all required environment variables are set correctly before deployment

echo "=========================================="
echo "TEST 00: CONFIGURATION VALIDATION"
echo "=========================================="

# Source the environment variables from env.txt
if [ -f env.txt ]; then
  source env.txt
else
  echo "❌ FAILED: env.txt file not found"
  exit 1
fi

# Define required environment variables
REQUIRED_VARS=(
  "TLS_KEY_PATH"
  "TLS_CERT_PATH"
  "TLS_CA_PATH"
  "TELEMETRY_HOST"
  "TELEMETRY_SERVER_TOKEN"
  "TESLA_VIN"
  "TESLA_PARTNER_TOKEN"
  "TESLA_CLIENT_ID"
  "TESLA_CLIENT_SECRET"
  "JWT_SECRET"
  "DASHBOARD_TOKEN"
)

# Check each required variable
MISSING_VARS=()
for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    MISSING_VARS+=("$VAR")
  else
    echo "✅ $VAR is set"
  fi
done

# Report missing variables
if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo ""
  echo "❌ FAILED: The following required variables are missing:"
  for VAR in "${MISSING_VARS[@]}"; do
    echo "   - $VAR"
  done
  exit 1
fi

# Validate certificate paths
echo ""
echo "Validating certificate paths..."
for CERT_PATH in "$TLS_KEY_PATH" "$TLS_CERT_PATH" "$TLS_CA_PATH"; do
  if [ ! -f "$CERT_PATH" ]; then
    echo "❌ FAILED: Certificate file not found at $CERT_PATH"
    exit 1
  else
    echo "✅ Certificate file exists at $CERT_PATH"
  fi
done

# Check Fly.io app configuration
echo ""
echo "Checking Fly.io app configuration..."
if ! command -v flyctl &>/dev/null; then
  echo "⚠️ WARNING: flyctl not found, skipping Fly.io checks"
else
  # Check if app exists
  if ! flyctl app list 2>/dev/null | grep -q "tesla-telemetry-server"; then
    echo "ℹ️ INFO: App 'tesla-telemetry-server' not found in Fly.io, it will be created during deployment"
  else
    echo "✅ App 'tesla-telemetry-server' exists in Fly.io"
  fi
  
  # Check if token is valid
  if flyctl auth whoami &>/dev/null; then
    echo "✅ Fly.io authentication is valid"
  else
    echo "⚠️ WARNING: Not logged in to Fly.io, you will need to log in before deployment"
  fi
fi

# Validate Tesla Partner Token
echo ""
echo "Validating Tesla Partner Token..."
if [[ "$TESLA_PARTNER_TOKEN" == *eyJ* ]]; then
  echo "✅ TESLA_PARTNER_TOKEN appears to be a valid JWT format"
else
  echo "❌ FAILED: TESLA_PARTNER_TOKEN does not appear to be a valid JWT format"
  exit 1
fi

echo ""
echo "✅ TEST 00 PASSED: All required environment variables are properly set"
exit 0 