#!/usr/bin/env bash

# Robust Bash settings
# Exit on error, treat unset variables as error, pipelines fail on first error
set -euo pipefail 

# --- Configuration & Constants ---
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/env.txt" 

# Variables to be sourced/derived from .env
PUBLIC_KEY_SERVER_URL=""
WELL_KNOWN_PATH=""
TELEMETRY_HOST=""
PORT=""
DASHBOARD_TOKEN=""

# --- Helper Functions ---
step_start() {
    # Usage: step_start "Description"
    echo -n "🧪 Running Check: $1..."
}

step_pass() {
    # Usage: step_pass
    echo " ✅ PASS"
}

step_fail() {
    # Usage: step_fail "Error Message" [Command Output]
    local error_msg="$1"
    local cmd_output="${2:-}"
    echo " ❌ FAIL"
    echo "    Error: $error_msg" >&2
    if [ -n "$cmd_output" ]; then
        echo "    Output:" >&2
        echo "$cmd_output" | sed 's/^/    | /' >&2 # Indent output for clarity
    fi
    exit 1
}

# --- Pre-flight Checks ---
echo "--- Smoke Tests ---"
echo "Running pre-flight checks..."

# Check required commands
for cmd in curl openssl wscat node; do # Added node for potential future JS checks
    if ! command -v $cmd &> /dev/null; then
        step_fail "'$cmd' command not found. Please ensure it is installed and in your PATH. (wscat can be installed via 'npm install -g wscat')"
    fi
done
echo "- Required commands found."

# Check if env.txt exists
if [ ! -f "$ENV_FILE" ]; then
    step_fail "Environment file '$ENV_FILE' not found."
fi
echo "- Environment file found ($ENV_FILE)."

# --- Parse .env File ---
# Using grep/sed for slightly safer extraction of specific variables
# Handles basic comments and whitespace, removes quotes.
get_env_var() {
    local var_name="$1"
    local var_value=$(grep "^${var_name}=" "$ENV_FILE" | head -n 1 | cut -d '=' -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/^\"//;s/\"$//;s/^'//;s/'$//')
    if [ -z "$var_value" ]; then
        step_fail "Required environment variable '$var_name' not found or empty in '$ENV_FILE'."
    fi
    # Assign to the global variable named in $1
    printf -v "$var_name" '%s' "$var_value" 
}

echo "Parsing required variables from $ENV_FILE..."
get_env_var "PUBLIC_KEY_SERVER_URL"
get_env_var "WELL_KNOWN_PATH"
get_env_var "TELEMETRY_HOST"
# PORT might not be explicitly in env.txt if telemetry server uses default 443
# Check if PORT exists, otherwise default to 443 for checks
PORT_RAW=$(grep "^PORT=" "$ENV_FILE" | head -n 1 | cut -d '=' -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/^\"//;s/\"$//;s/^'//;s/'$//') || true # Allow grep to fail if not found
PORT=${PORT_RAW:-443} # Default to 443 if not set or empty
get_env_var "DASHBOARD_TOKEN"
echo "- Variables parsed."
echo "-------------------"

# Construct Full Public Key URL (remove potential trailing slash from URL first)
PUBLIC_KEY_URL_BASE=$(echo "$PUBLIC_KEY_SERVER_URL" | sed 's#/*$##')
PUBLIC_KEY_FULL_URL="${PUBLIC_KEY_URL_BASE}${WELL_KNOWN_PATH}"

# Construct Dashboard WebSocket URL
DASHBOARD_WSS_URL="wss://${TELEMETRY_HOST}/dashboard?token=${DASHBOARD_TOKEN}"

# --- Test Execution ---

# 1. Check Public Key Server Endpoint
step_start "Public Key Server URL ($PUBLIC_KEY_FULL_URL)"
# -f/--fail: Fail silently (no output) on HTTP errors (like 404) but return error code
# -s/--silent: Don't show progress meter or error messages.
# -S/--show-error: Show error even if -s is used.
# -L/--location: Follow redirects.
# -o /dev/null: Discard response body.
# -w "%{http_code}": Write out the HTTP status code.
http_code=$(curl -fsSL -o /dev/null -w "%{http_code}" "$PUBLIC_KEY_FULL_URL" || true) # Allow curl failure to be handled by code check
if [ "$http_code" = "200" ]; then
    # Optional: Check content type or basic content
    content_type=$(curl -fsSL -I "$PUBLIC_KEY_FULL_URL" | grep -i '^Content-Type:' | awk '{print $2}' | tr -d '\r')
    if [[ "$content_type" == *"application/x-pem-file"* || "$content_type" == *"text/plain"* ]]; then
        step_pass
    else
        step_fail "Public Key URL returned HTTP 200, but unexpected Content-Type: '$content_type'. Expected 'application/x-pem-file' or 'text/plain'."
    fi
else
    step_fail "Public Key URL check failed. Expected HTTP 200, got '$http_code'."
fi

# 2. Check Telemetry Server TLS Handshake
step_start "Telemetry Server TLS Handshake ($TELEMETRY_HOST:$PORT)"
# -connect: target host and port
# -servername: essential for SNI
# Use echo to send empty input and close connection after handshake
# Check the exit status of openssl and grep for Verify return code
# Redirect stderr to capture openssl errors if necessary
openssl_output=$(echo | openssl s_client -connect "$TELEMETRY_HOST:$PORT" -servername "$TELEMETRY_HOST" 2>&1)
openssl_exit_code=$?

if [ $openssl_exit_code -ne 0 ]; then
    step_fail "openssl s_client command failed with exit code $openssl_exit_code." "$openssl_output"
fi

# Check for "Verify return code: 0 (ok)"
if echo "$openssl_output" | grep -q "Verify return code: 0 (ok)"; then
    step_pass
else
    # Extract verify code if possible
    verify_code_line=$(echo "$openssl_output" | grep "Verify return code:")
    step_fail "TLS certificate verification failed. Expected 'Verify return code: 0 (ok)'. Found: '$verify_code_line'" "$openssl_output"
fi

# 3. Check Telemetry Dashboard WebSocket Connection
step_start "Telemetry Dashboard WebSocket ($DASHBOARD_WSS_URL)"
# -c: connect to URL
# -n: exit after first message
# -w 10: wait up to 10 seconds for connection and first message
# --connect-timeout 5: timeout for initial TCP connection (seconds)
# Use grep -q to check for the expected welcome message (case-insensitive)
if wscat -w 10 --connect-timeout 5 -c "$DASHBOARD_WSS_URL" -n 1 | grep -qi "Connection established"; then
    step_pass
else
    # Capture output for debugging if needed (might contain sensitive info)
    # wscat_output=$(wscat -w 10 --connect-timeout 5 -c "$DASHBOARD_WSS_URL" -n 1 2>&1 || true) 
    step_fail "Failed to connect to Dashboard WebSocket or did not receive expected welcome message within 10 seconds." #"Output:\n$wscat_output" # Be cautious uncommenting this
fi

# --- Completion ---
echo "-------------------"
echo "✅ All smoke tests passed!"
echo "-------------------"

exit 0