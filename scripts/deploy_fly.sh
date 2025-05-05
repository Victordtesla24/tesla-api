#!/usr/bin/env bash

# Robust Bash settings
set -euo pipefail

# --- Configuration & Constants ---
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/env.txt"
SECRETS_SCRIPT="$SCRIPT_DIR/fly_secrets_setup.sh"
VERIFY_CONFIG_SCRIPT="$SCRIPT_DIR/verify_config.js" # Assumed to exist

# Spinner function for visual feedback (optional)
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# --- Argument Parsing ---
FLY_APP_NAME=""
DEPLOY_STRATEGY="immediate" # Default deployment strategy

usage() {
  echo "Usage: $0 -a <fly_app_name> [-s <strategy>]"
  echo "  -a <fly_app_name> : Target Fly.io application name (required)."
  echo "  -s <strategy>     : Deployment strategy (e.g., immediate, rolling, canary). Default: $DEPLOY_STRATEGY."
  exit 1
}

while getopts ":a:s:" opt; do
  case ${opt} in
    a )
      FLY_APP_NAME=$OPTARG
      ;;
    s )
      DEPLOY_STRATEGY=$OPTARG
      ;;
    \? )
      echo "Invalid option: $OPTARG" 1>&2
      usage
      ;;
    : )
      echo "Invalid option: $OPTARG requires an argument" 1>&2
      usage
      ;;
  esac
done
shift $((OPTIND -1))

if [ -z "$FLY_APP_NAME" ]; then
    echo "Error: Fly App Name (-a) is required."
    usage
fi

echo "🚀 Starting Fly.io Deployment Pipeline 🚀"
echo "========================================"
echo "Target App:   $FLY_APP_NAME"
echo "Env File:     $ENV_FILE"
echo "Strategy:     $DEPLOY_STRATEGY"
echo "========================================"

# --- Helper Functions ---
step_start() {
    echo -n "➡️  $1..."
}

step_done() {
    echo " ✅ Done."
}

step_fail() {
    echo " ❌ Failed!"
    echo "Error: $1" >&2
    exit 1
}

# --- Pre-flight Checks ---
step_start "Running pre-flight checks"

# Check if env.txt exists
if [ ! -f "$ENV_FILE" ]; then
    step_fail "Environment file '$ENV_FILE' not found."
fi

# Check if secrets script exists and is executable
if [ ! -x "$SECRETS_SCRIPT" ]; then
    step_fail "Secrets setup script '$SECRETS_SCRIPT' not found or not executable."
fi

# Check if verify config script exists
if [ ! -f "$VERIFY_CONFIG_SCRIPT" ]; then
    step_fail "Verification script '$VERIFY_CONFIG_SCRIPT' not found. Cannot perform post-deploy check."
fi

# Check required commands
for cmd in flyctl openssl node; do
    if ! command -v $cmd &> /dev/null; then
        step_fail "'$cmd' command not found. Please ensure it is installed and in your PATH."
    fi
done

# Check flyctl login status
if ! flyctl auth whoami &> /dev/null; then
    step_fail "Not logged into flyctl. Please run 'flyctl auth login'."
fi

# Source env vars to get paths (use a subshell to avoid polluting main env)
# Warning: Simple sourcing is less safe than the parser in fly_secrets_setup.sh,
# but needed here to get file paths easily. Assumes simple key=value format.
TELEMETRY_HOST=""
TLS_KEY_PATH_REL=""
TLS_CERT_PATH_REL=""
# Use grep/sed for slightly safer sourcing of specific needed vars
if grep -q '^TLS_KEY_PATH=' "$ENV_FILE"; then
    TLS_KEY_PATH_REL=$(grep '^TLS_KEY_PATH=' "$ENV_FILE" | head -n 1 | cut -d '=' -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/^\"//;s/\"$//')
fi
if grep -q '^TLS_CERT_PATH=' "$ENV_FILE"; then
    TLS_CERT_PATH_REL=$(grep '^TLS_CERT_PATH=' "$ENV_FILE" | head -n 1 | cut -d '=' -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/^\"//;s/\"$//')
fi
if grep -q '^TELEMETRY_HOST=' "$ENV_FILE"; then
    TELEMETRY_HOST=$(grep '^TELEMETRY_HOST=' "$ENV_FILE" | head -n 1 | cut -d '=' -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//;s/^\"//;s/\"$//')
fi

if [ -z "$TLS_KEY_PATH_REL" ] || [ -z "$TLS_CERT_PATH_REL" ] || [ -z "$TELEMETRY_HOST" ]; then
    step_fail "Required variables (TLS_KEY_PATH, TLS_CERT_PATH, TELEMETRY_HOST) not found or empty in $ENV_FILE."
fi

TLS_KEY_PATH_ABS="$PROJECT_ROOT/$TLS_KEY_PATH_REL"
TLS_CERT_PATH_ABS="$PROJECT_ROOT/$TLS_CERT_PATH_REL"

if [ ! -f "$TLS_KEY_PATH_ABS" ] || [ ! -f "$TLS_CERT_PATH_ABS" ]; then
     step_fail "TLS key or certificate file not found at paths specified in $ENV_FILE ($TLS_KEY_PATH_ABS, $TLS_CERT_PATH_ABS)."
fi

step_done

# --- 1. Local Certificate Validation ---
step_start "Validating local TLS certificates"
(
    # Check if private key is valid
    if ! openssl pkey -in "$TLS_KEY_PATH_ABS" -check -noout > /dev/null 2>&1; then
        step_fail "Private key validation failed ($TLS_KEY_PATH_ABS)."
    fi

    # Check if certificate is valid
    if ! openssl x509 -in "$TLS_CERT_PATH_ABS" -noout > /dev/null 2>&1; then
        step_fail "Certificate syntax validation failed ($TLS_CERT_PATH_ABS)."
    fi

    # Check if key and certificate match
    KEY_MOD=$(openssl pkey -in "$TLS_KEY_PATH_ABS" -noout -modulus 2>/dev/null || echo "key_error")
    CERT_MOD=$(openssl x509 -in "$TLS_CERT_PATH_ABS" -noout -modulus 2>/dev/null || echo "cert_error")

    if [ "$KEY_MOD" != "$CERT_MOD" ] || [ "$KEY_MOD" == "key_error" ] || [ "$CERT_MOD" == "cert_error" ]; then
        step_fail "Private key and certificate modulus do not match."
    fi

    # Check expiration (warn if expiring within 30 days)
    if ! openssl x509 -checkend $((30*24*60*60)) -noout -in "$TLS_CERT_PATH_ABS" > /dev/null 2>&1; then
         EXP_DATE=$(openssl x509 -enddate -noout -in "$TLS_CERT_PATH_ABS" | cut -d '=' -f2-)
         echo # Newline
         echo "⚠️  Warning: Certificate ($TLS_CERT_PATH_ABS) expires on $EXP_DATE (within 30 days or already expired)."
         # Continue deployment despite warning
    fi
) || exit 1 # Ensure failure in subshell exits main script if step_fail is called
step_done

# --- 2. Remote Docker Build ---
step_start "Building Docker image remotely on Fly.io builders"
if ! flyctl deploy -a "$FLY_APP_NAME" --remote-only --build-only; then
    step_fail "Remote Docker build failed. Check build logs."
fi
step_done

# --- 3. Update Secrets ---
step_start "Setting/Updating Fly secrets using $SECRETS_SCRIPT"
# The secrets script already handles staging and has its own checks/output
if ! "$SECRETS_SCRIPT" -a "$FLY_APP_NAME"; then
     # Secrets script should output specific errors, but catch failure here too
    step_fail "Secrets setup script failed."
fi
# Note: Secrets script will perform the deploy command to apply staged secrets.
# We comment out the separate deploy step below if secrets script handles it.
# If secrets script ONLY stages, uncomment the deploy step below.
# Assuming secrets script now handles deploy after staging...
# step_done # Done is implicit if the script includes deploy and succeeds

# --- 4. Deploy Application (if not handled by secrets script) ---
# Uncomment this block if fly_secrets_setup.sh ONLY stages secrets
# step_start "Deploying application '$FLY_APP_NAME' with strategy '$DEPLOY_STRATEGY'"
# if ! flyctl deploy -a "$FLY_APP_NAME" --remote-only --strategy "$DEPLOY_STRATEGY"; then
#     step_fail "Application deployment failed. Check deployment logs."
# fi
# step_done

echo "Deployment initiated by secrets script (or previous step). Waiting briefly for app to stabilize..."
sleep 15 # Give the app a moment to start/restart

# --- 5. Post-Deployment Verification ---

# 5.1 TLS Handshake Check
step_start "Verifying TLS handshake with $TELEMETRY_HOST:443"
# Use openssl s_client to check basic TLS connection.
# -connect: target host and port
# -servername: crucial for SNI
# Use echo | ... to immediately close connection after handshake info
# Redirect stderr to /dev/null to hide verbose output, check exit status only
if ! echo | openssl s_client -connect "$TELEMETRY_HOST:443" -servername "$TELEMETRY_HOST" -brief > /dev/null 2>&1; then
    # Retry once after a short delay
    echo " (Retrying TLS check...)"
    sleep 5
    if ! echo | openssl s_client -connect "$TELEMETRY_HOST:443" -servername "$TELEMETRY_HOST" -brief > /dev/null 2>&1; then
        step_fail "Failed to establish TLS connection to $TELEMETRY_HOST:443 after deployment. Check server logs and firewall rules."
    fi
fi
step_done

# 5.2 Telemetry Config Sync Check (using verify_config.js)
step_start "Verifying Tesla telemetry configuration sync"
# Assuming verify_config.js reads necessary info (like VIN, host) from $ENV_FILE or takes args
# It should exit 0 on success, non-zero on failure/timeout
if ! node "$VERIFY_CONFIG_SCRIPT" --host "$TELEMETRY_HOST"; then
     # Retry once after a delay
    echo " (Retrying config sync check...)"
    sleep 10
    if ! node "$VERIFY_CONFIG_SCRIPT" --host "$TELEMETRY_HOST"; then
        step_fail "Telemetry configuration sync check failed using $VERIFY_CONFIG_SCRIPT. Check server logs and Tesla API status."
    fi
fi
step_done

# --- Completion ---
echo "========================================"
echo "✅ Fly.io Deployment Pipeline Completed Successfully! ✅"
echo "App '$FLY_APP_NAME' should be updated and running."
echo "========================================"

exit 0