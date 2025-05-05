#!/usr/bin/env bash
set -euo pipefail

# This script sets up all the necessary certificates for the Tesla telemetry server
# It generates certificates using mkcert and configures them to match the expected paths

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CERTS_DIR="${PROJECT_ROOT}/certs"

# Logging helpers
log_info()  { echo "[INFO] $*"; }
log_error() { echo "[ERROR] $*"; }
log_ok()    { echo "[OK] $*"; }

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    log_error "mkcert is not installed. Please install it first with 'brew install mkcert'"
    exit 1
fi

# Create certificates directory if it doesn't exist
mkdir -p "${CERTS_DIR}"
log_info "Created certificates directory at ${CERTS_DIR}"

# Install mkcert root CA
log_info "Installing mkcert root CA"
mkcert -install

# Generate certificates for telemetry server
log_info "Generating certificates for telemetry server"
mkcert -key-file "${CERTS_DIR}/telemetry_server.key" \
       -cert-file "${CERTS_DIR}/telemetry_server.crt" \
       localhost 127.0.0.1 ::1 tesla-telemetry-server.fly.dev

# Copy the root CA certificate
CAROOT=$(mkcert -CAROOT)
if [[ ! -d "$CAROOT" ]]; then
    log_error "mkcert CA root directory not found at $CAROOT"
    exit 1
fi

log_info "Found mkcert CA root at: $CAROOT"

if [[ -f "${CAROOT}/rootCA.pem" ]]; then
    cp "${CAROOT}/rootCA.pem" "${CERTS_DIR}/ca.crt"
    log_ok "Copied rootCA.pem to ${CERTS_DIR}/ca.crt"
else
    log_error "rootCA.pem not found in ${CAROOT}"
    exit 1
fi

# Rename files to match expected paths in env.txt
log_info "Renaming certificate files to match expected paths"
cp "${CERTS_DIR}/telemetry_server.key" "${CERTS_DIR}/server.key"
cp "${CERTS_DIR}/telemetry_server.crt" "${CERTS_DIR}/server.crt"
log_ok "Renamed certificate files"

# Create a .env file from env.txt if it doesn't exist
if [[ ! -f "${PROJECT_ROOT}/.env" && -f "${PROJECT_ROOT}/env.txt" ]]; then
    log_info "Creating .env file from env.txt"
    cp "${PROJECT_ROOT}/env.txt" "${PROJECT_ROOT}/.env"
    log_ok "Created .env file"
fi

# Verify certificate files
log_info "Verifying certificate files"
if [[ -f "${CERTS_DIR}/server.key" && -f "${CERTS_DIR}/server.crt" && -f "${CERTS_DIR}/ca.crt" ]]; then
    log_ok "All certificate files have been created successfully"
    ls -la "${CERTS_DIR}"
else
    log_error "Some certificate files are missing"
    ls -la "${CERTS_DIR}"
    exit 1
fi

log_ok "Certificate setup completed. You can now run telemetry_server.sh" 