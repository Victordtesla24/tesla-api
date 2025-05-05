#!/usr/bin/env bash
set -euo pipefail

# This script copies the root CA certificate from mkcert's directory to the local certs directory
# and updates the TLS_CA_PATH in the .env file

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CERTS_DIR="${PROJECT_ROOT}/certs"

# Ensure certs directory exists
mkdir -p "${CERTS_DIR}"

# Logging helpers
log_info()  { echo "[INFO] $*"; }
log_error() { echo "[ERROR] $*"; }
log_ok()    { echo "[OK] $*"; }

# Find mkcert's root CA path
CAROOT=$(mkcert -CAROOT)
if [[ ! -d "$CAROOT" ]]; then
    log_error "mkcert CA root directory not found. Have you installed mkcert and run 'mkcert -install'?"
    exit 1
fi

log_info "Found mkcert CA root at: $CAROOT"

# Copy the root CA certificate to certs directory
if [[ -f "${CAROOT}/rootCA.pem" ]]; then
    cp "${CAROOT}/rootCA.pem" "${CERTS_DIR}/ca.crt"
    log_ok "Copied rootCA.pem to ${CERTS_DIR}/ca.crt"
else
    log_error "rootCA.pem not found in ${CAROOT}. Is mkcert properly installed?"
    exit 1
fi

# Update .env file
if [[ -f "${PROJECT_ROOT}/.env" ]]; then
    # Create backup
    cp "${PROJECT_ROOT}/.env" "${PROJECT_ROOT}/.env.bak"
    log_info "Created backup of .env at .env.bak"
    
    # Update TLS_CA_PATH
    sed -i.tmp "s|TLS_CA_PATH=.*|TLS_CA_PATH=./certs/ca.crt|g" "${PROJECT_ROOT}/.env"
    rm "${PROJECT_ROOT}/.env.tmp"
    log_ok "Updated TLS_CA_PATH in .env to use local ca.crt"
else
    log_error ".env file not found in project root"
    exit 1
fi

log_info "Checking certificate paths in .env..."
grep "TLS_.*_PATH" "${PROJECT_ROOT}/.env"

log_ok "Certificate setup completed. You can now run telemetry_server.sh" 