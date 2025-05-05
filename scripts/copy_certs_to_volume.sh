#!/bin/bash
# Script to copy certificate files to Fly.io volume

set -e

echo "Starting machine to access volume..."
flyctl machine start 683d51dc690618

echo "Waiting for machine to be ready..."
sleep 10

echo "Copying certificate files to volume..."
flyctl ssh sftp put certs/server.key /app/certs/server.key
flyctl ssh sftp put certs/server.crt /app/certs/server.crt
flyctl ssh sftp put certs/ca.crt /app/certs/ca.crt

echo "Verifying files were copied..."
flyctl ssh console -C "ls -la /app/certs"

echo "Certificate files copied successfully." 