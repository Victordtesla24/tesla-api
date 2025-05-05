#!/usr/bin/env bash
set -euo pipefail

# Load environment variables from .env
if [[ ! -f .env ]]; then
    echo "[ERROR] .env file not found in current directory."
    exit 1
fi
set -o allexport
. ./.env
set +o allexport

# Required environment variables (ensure & verify they are set correctly from 'env.txt' or .env file whichever is accessible)
TELEMETRY_HOST="${TELEMETRY_HOST:-https://tesla-telemetry-server.fly.dev}"
PORT="${PORT:-443}"
TLS_KEY_PATH="${TLS_KEY_PATH:?Must set TLS_KEY_PATH (path to server.key)}" 
TLS_CERT_PATH="${TLS_CERT_PATH:?Must set TLS_CERT_PATH (path to server.crt)}"
TLS_CA_PATH="${TLS_CA_PATH:?Must set TLS_CA_PATH (path to ca.crt)}"
TESLA_CLIENT_ID="${TESLA_CLIENT_ID:-0bd6ccd5-9d71-49f9-a45d-8a261192c7df}"
TESLA_CLIENT_SECRET="${TESLA_CLIENT_SECRET:-"ta-secret.W4IfQ&A!lJ-8J2ZL"}"
TESLA_AUDIENCE="${TESLA_AUDIENCE:-https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3}"

# TESLA_AUTH_URL is optional (token endpoint base); default to Tesla's prod OAuth URL
TESLA_AUTH_URL="${TESLA_AUTH_URL:-https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3}"
VEHICLE_IDS="${VEHICLE_IDS:-LRWYHCEK9PC055558}"  # Comma-separated VINs (no spaces)

# Extract hostname from TELEMETRY_HOST for OpenSSL commands
TELEMETRY_HOSTNAME=$(echo "$TELEMETRY_HOST" | sed -E 's|^https?://||' | sed -E 's|/.*$||')

# Spinner function for progress indication
spinner() {
    local message="$1"
    shift
    "$@" &                 # Run the command in background
    local pid=$!
    local delay=0.1
    local spinstr='|/-\'
    printf "%s " "$message"
    while kill -0 "$pid" 2>/dev/null; do
        for (( i=0; i<${#spinstr}; i++ )); do
            printf "\b%c" "${spinstr:i:1}"
            sleep $delay
        done
    done
    wait "$pid"
    local status=$?
    printf "\b"  # erase spinner char
    return $status
}

# Logging helpers
log_info()  { echo "[INFO] $*"; }
log_error() { echo "[ERROR] $*"; }
log_ok()    { echo "[OK] $*"; }

failures=()

# Step 1: Set environment secrets on Fly.io
secrets=()
while IFS='=' read -r key value; do
    # Skip blank lines or comments
    [[ -z "$key" || "$key" =~ ^# ]] && continue
    secrets+=("$key=$value")
done < <(sed '/^\s*#/d;s/=\s*/=/g' .env)

if [ ${#secrets[@]} -eq 0 ]; then
    log_error "No key=value pairs found in .env"
    failures+=("No environment vars in .env")
else
    if spinner "Setting Fly.io secrets..." flyctl secrets set "${secrets[@]}" -a tesla-telemetry-server; then
        log_ok "Environment secrets set on Fly.io"
    else
        log_error "Failed to set Fly.io secrets"
        failures+=("flyctl secrets set")
    fi
fi

# Step 2: Build and deploy with flyctl
if spinner "Deploying telemetry server to Fly.io..." flyctl deploy -a tesla-telemetry-server; then
    log_ok "flyctl deploy succeeded"
else
    log_error "flyctl deploy failed"
    failures+=("flyctl deploy")
fi

# Step 3: Verify TLS certificate and full chain
log_info "Verifying TLS certificate and full chain on server..."
# Check local certificate files exist
[[ -f "$TLS_KEY_PATH" ]] || { log_error "Missing TLS key at $TLS_KEY_PATH"; failures+=("Local TLS key"); }
[[ -f "$TLS_CERT_PATH" ]] || { log_error "Missing TLS cert at $TLS_CERT_PATH"; failures+=("Local TLS cert"); }
[[ -f "$TLS_CA_PATH" ]] || { log_error "Missing TLS CA at $TLS_CA_PATH"; failures+=("Local TLS CA"); }

# Fetch server's leaf certificate
server_cert=$(mktemp)
if openssl s_client -connect "${TELEMETRY_HOSTNAME}:${PORT}" -servername "${TELEMETRY_HOSTNAME}" -showcerts < /dev/null \
   | sed -n '1,/-----END CERTIFICATE-----/p' > "$server_cert"; then
    # Verify chain against provided CA bundle
    verify_out=$(openssl verify -CAfile "$TLS_CA_PATH" "$server_cert" 2>&1 || true)
    if echo "$verify_out" | grep -q "OK$"; then
        log_ok "Server TLS certificate chain is valid"
    else
        log_error "TLS chain verification error: $verify_out"
        failures+=("TLS chain verification")
    fi
else
    log_error "Unable to retrieve server certificate from $TELEMETRY_HOST"
    failures+=("Retrieve server cert")
fi
rm -f "$server_cert"

# Step 4: Test mutual TLS (mTLS) enforcement
log_info "Testing mTLS enforcement (no client cert handshake)..."
mtls_test=$(echo | openssl s_client -connect "${TELEMETRY_HOSTNAME}:${PORT}" -servername "${TELEMETRY_HOSTNAME}" 2>&1 || true)
if echo "$mtls_test" | grep -qi "handshake failure"; then
    log_ok "mTLS enforced: server refused connection without client certificate"
else
    log_error "mTLS NOT enforced: server accepted handshake without client cert"
    failures+=("mTLS enforcement")
fi

# Step 5: Configure Tesla vehicles for telemetry
log_info "Configuring vehicles via Tesla Fleet API..."
# Obtain a partner (client_credentials) token
TOKEN_URL="${TESLA_AUTH_URL%/}/token"
token_response=$(curl -s -X POST "$TOKEN_URL" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=client_credentials" \
    --data-urlencode "client_id=$TESLA_CLIENT_ID" \
    --data-urlencode "client_secret=$TESLA_CLIENT_SECRET" \
    --data-urlencode "audience=$TESLA_AUDIENCE")
ACCESS_TOKEN=$(echo "$token_response" | sed -n 's/.*"access_token"[ ]*:[ ]*"\([^"]*\)".*/\1/p')
if [[ -z "$ACCESS_TOKEN" ]]; then
    log_error "Failed to get Tesla token: $token_response"
    failures+=("Tesla OAuth token")
else
    log_ok "Obtained Tesla OAuth partner token"
    # Prepare CA chain string (escape newlines) for JSON payload
    ca_content=$(awk '{printf "%s\\n", $0}' "$TLS_CA_PATH")
    # Iterate VINs from VEHICLE_IDS (comma-separated in .env)
    IFS=',' read -ra VIN_LIST <<< "$VEHICLE_IDS"
    for vin in "${VIN_LIST[@]}"; do
        vin="${vin//[[:space:]]/}"  # trim whitespace
        [[ -z "$vin" ]] && continue
        payload=$(jq -n \
            --arg vin "$vin" \
            --arg host "$TELEMETRY_HOSTNAME" \
            --arg port "$PORT" \
            --arg ca "$ca_content" \
            '{ vins: [$vin], config: { hostname: $host, port: ($port|tonumber), ca: $ca } }')
        response=$(curl -s -w "%{http_code}" -X POST "$TESLA_AUDIENCE/api/1/vehicles/fleet_telemetry_config" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$payload")
        http_code="${response: -3}"
        body="${response:0:-3}"
        if [[ "$http_code" != "200" ]]; then
            log_error "fleet_telemetry_config HTTP $http_code for VIN $vin"
            failures+=("fleet_telemetry_config ($vin)")
        elif echo "$body" | grep -q "\"skipped_vehicles\""; then
            log_error "Vehicle $vin skipped configuration: $body"
            failures+=("fleet_telemetry_config skipped ($vin)")
        else
            log_ok "Telemetry configured for VIN $vin"
        fi
    done
fi

# Final summary
echo
if [ ${#failures[@]} -ne 0 ]; then
    log_error "Deployment checks completed with errors in: ${failures[*]}"
    exit 1
else
    log_ok "All checks passed. Telemetry server is deployed and configured."
    exit 0
fi
