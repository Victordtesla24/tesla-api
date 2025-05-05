#!/bin/bash
# Test 05: Environment Configuration
# Verifies that the telemetry server environment is properly configured

echo "=========================================="
echo "TEST 05: ENVIRONMENT CONFIGURATION"
echo "=========================================="

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# Get the project root directory (one level up from script directory)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." &> /dev/null && pwd )"
FLY_APP_NAME="tesla-telemetry-server-2" # Define Fly app name

echo "Checking configurations for Fly app: $FLY_APP_NAME"
echo "Project root directory: $PROJECT_ROOT"

# Check for required environment variables using flyctl secrets list
echo "Checking for required environment variables in fly.io app:"
REQUIRED_SECRETS=(
  "TESLA_CLIENT_ID"
  "TESLA_CLIENT_SECRET"
  "TESLA_TOKEN_URL"
  "TESLA_API_BASE_URL"
  "TESLA_VIN"
  "TELEMETRY_HOST"
  "TELEMETRY_SERVER_TOKEN"
  "TLS_KEY_PATH"
  "TLS_CERT_PATH"
  "TLS_CA_PATH"
  "PUBLIC_KEY_SERVER_URL"
  "PUBLIC_KEY_PATH"
)

# Check for Fly Variables (usually set in fly.toml [env] or via flyctl config)
REQUIRED_ENV=(
  "SERVER_TYPE"
  "PORT"
)

secrets_ok=1
if command -v flyctl &> /dev/null; then
  SECRET_LIST=$(flyctl secrets list --app "$FLY_APP_NAME" 2>/dev/null)
  FLYCTL_EXIT_CODE=$?

  if [ $FLYCTL_EXIT_CODE -eq 0 ]; then
    for secret in "${REQUIRED_SECRETS[@]}"; do
      echo -n "Checking if $secret is configured... "
      if echo "$SECRET_LIST" | grep -q "^${secret} "; then
        echo "✅ SUCCESS: $secret is configured"
      else
        echo "❌ FAILED: $secret is not configured"
        echo "EXPECTED: Secret '$secret' should be set in Fly.io"
        echo "ACTUAL: Secret not found in 'flyctl secrets list'"
        secrets_ok=0
      fi
    done
  else
    echo "⚠️ WARNING: 'flyctl secrets list' command failed. Cannot verify secrets."
    secrets_ok=0
  fi
else
  echo "ℹ️ INFO: flyctl command not found. Skipping Fly.io secrets check."
  secrets_ok=0 # Mark as failed if we can't check
fi

# Check fly.toml for required [env] variables
env_ok=1
FLY_TOML_PATH="$PROJECT_ROOT/../fly.toml"
echo "Checking fly.toml at: $FLY_TOML_PATH"
if [ -f "$FLY_TOML_PATH" ]; then
  echo "Checking fly.toml [env] section..."
  for env_var in "${REQUIRED_ENV[@]}"; do
    echo -n "Checking if $env_var is configured in fly.toml [env]... "
    # Check if the variable exists under the [env] block
    if awk '/^\[env\]/{f=1;next} /^\[/{f=0} f' "$FLY_TOML_PATH" | grep -q "^${env_var} "; then
       echo "✅ SUCCESS: $env_var found in fly.toml [env]"
    else
       echo "⚠️ WARNING: $env_var not found in fly.toml [env] section."
       # Could also be set via flyctl config set - check health endpoint as fallback
       env_ok=0
    fi
  done
else
  echo "⚠️ WARNING: fly.toml not found at $FLY_TOML_PATH. Cannot verify [env] variables."
  env_ok=0
fi

# Check fly.toml for correct internal_port (443)
echo -n "Checking if fly.toml has correct internal_port (443)... "
if [ -f "$FLY_TOML_PATH" ]; then
  if grep -q "internal_port = 443" "$FLY_TOML_PATH"; then
    echo "✅ SUCCESS: fly.toml has internal_port = 443"
  else
    echo "❌ FAILED: fly.toml does not have internal_port = 443"
    echo "EXPECTED: fly.toml should contain 'internal_port = 443'"
    echo "ACTUAL: Setting not found"
    env_ok=0
  fi
else
  echo "⚠️ WARNING: fly.toml not found at $FLY_TOML_PATH."
  # Cannot verify port without fly.toml
fi

# Check if Dockerfile is configured correctly
DOCKERFILE_PATH="$PROJECT_ROOT/../Dockerfile"
echo "Checking Dockerfile at: $DOCKERFILE_PATH"
echo -n "Checking if Dockerfile is configured correctly... "
dockerfile_ok=1
if [ -f "$DOCKERFILE_PATH" ]; then
  # Check if it exposes the correct port
  if grep -q "EXPOSE 443" "$DOCKERFILE_PATH"; then
    echo -n "✅ Port 443 exposed. "
  else
    echo -n "❌ Port 443 not exposed. "
    dockerfile_ok=0
  fi

  # Check if it sets the correct SERVER_TYPE and PORT env vars (optional, fly.toml takes precedence)
  if grep -q "ENV SERVER_TYPE=telemetry" "$DOCKERFILE_PATH" && grep -q "ENV PORT=443" "$DOCKERFILE_PATH"; then
     echo -n "✅ Default ENV vars set. "
  else
     echo -n "⚠️ Default ENV vars not set (may be overridden by fly.toml). "
  fi
  
  # Check if it runs the correct start command (node src/index.js)
  # This checks for variations like CMD ["node", "src/index.js"] or CMD node src/index.js
  if grep -Eq '^[[:space:]]*CMD[[:space:]]+\[?[[:space:]]*\"?node\"?,[[:space:]]*\"?src/index.js\"?[[:space:]]*\]?$' "$DOCKERFILE_PATH"; then
    echo "✅ Correct CMD (node src/index.js) found."
  else
    echo "❌ Incorrect or missing CMD found."
    echo "EXPECTED: CMD [\"node\", \"src/index.js\"] (or similar format)"
    dockerfile_ok=0
  fi
else
  echo "⚠️ WARNING: Dockerfile not found at $DOCKERFILE_PATH."
  dockerfile_ok=0
fi

# Check telemetry server is running with correct configuration via health endpoint
echo -n "Checking telemetry server health endpoint for configuration confirmation... "
SERVER_URL="https://tesla-telemetry-server-2.fly.dev"
health_ok=1
HEALTH_RESPONSE=$(curl -s -k "$SERVER_URL/health")
if [[ $? -eq 0 && "$HEALTH_RESPONSE" == *"\"status\":\"ok\""* ]]; then
  echo "✅ SUCCESS: Telemetry server health endpoint returned OK"
  # Optionally check specific config values from health if needed
  if [[ "$HEALTH_RESPONSE" != *"\"requestCert\":true"* || "$HEALTH_RESPONSE" != *"\"rejectUnauthorized\":true"* ]]; then
     echo "⚠️ WARNING: Health endpoint doesn't explicitly confirm mTLS settings (requestCert/rejectUnauthorized)."
  fi
  if [[ "$HEALTH_RESPONSE" != *"\"vehicle\":\"/vehicle\""* || "$HEALTH_RESPONSE" != *"\"dashboard\":\"/dashboard\""* ]]; then
     echo "⚠️ WARNING: Health endpoint doesn't explicitly confirm WebSocket endpoint paths."
  fi
else
  echo "❌ FAILED: Telemetry server health endpoint did not return OK"
  echo "Response: $HEALTH_RESPONSE"
  health_ok=0
fi

# Final assessment
if [ $secrets_ok -eq 1 ] && [ $env_ok -eq 1 ] && [ $dockerfile_ok -eq 1 ] && [ $health_ok -eq 1 ]; then
  echo -e "\n✅ TEST 05 PASSED: Environment configuration appears correct based on checks."
  exit 0
else
  echo -e "\n❌ TEST 05 FAILED: Issues found with environment configuration."
  if [ $secrets_ok -eq 0 ]; then echo "  - Secrets check failed or skipped."; fi
  if [ $env_ok -eq 0 ]; then echo "  - fly.toml check failed or skipped."; fi
  if [ $dockerfile_ok -eq 0 ]; then echo "  - Dockerfile check failed or skipped."; fi
  if [ $health_ok -eq 0 ]; then echo "  - Health endpoint check failed."; fi
  exit 1
fi 