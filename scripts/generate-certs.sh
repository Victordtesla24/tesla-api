#!/bin/bash
# Generate self-signed certificates for testing Tesla Fleet API integration

# Create certs directory if it doesn't exist
mkdir -p certs

# Source environment variables if possible to get TELEMETRY_HOST
if [ -f .env ]; then
  source .env
fi

# Use environment value or default
SERVER_NAME=${TELEMETRY_HOST:-"tesla-telemetry-server-2.fly.dev"}
echo "Using server name: $SERVER_NAME for certificates"

cd certs

# Create CA key and certificate
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt \
  -subj "/CN=Tesla API Demo CA/O=Tesla API Demo/C=US"

# Create server key and CSR
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr \
  -subj "/CN=$SERVER_NAME/O=Tesla API Demo/C=US"

# Sign server CSR with CA
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 3650 -sha256

# Clean up CSR and serial files
rm server.csr ca.srl

cd ..

echo "Generated certificates in ./certs/ directory:"
ls -la certs/

echo "Remember to set these in your .env file:"
echo "TLS_KEY_PATH=./certs/server.key"
echo "TLS_CERT_PATH=./certs/server.crt"
echo "TLS_CA_PATH=./certs/ca.crt" 