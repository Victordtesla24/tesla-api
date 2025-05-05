FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
# Ensure the ws module is installed (required for WebSockets)
RUN npm ci --production

# Copy source code
COPY src/ ./src/

# Create dist directory and copy compiled files
RUN mkdir -p dist
COPY src/ ./dist/

# Create required directories
RUN mkdir -p certs .well-known/appspecific

# Copy certificates
COPY certs/server.key ./certs/
COPY certs/server.crt ./certs/
COPY certs/ca.crt ./certs/

# Copy public key for Tesla virtual key pairing
COPY .well-known/appspecific/com.tesla.3p.public-key.pem ./.well-known/appspecific/

# Copy scripts for certificate generation
COPY scripts/ ./scripts/

# Expose port for telemetry server
EXPOSE 443

# Set environment variables
ENV SERVER_TYPE=telemetry
ENV PORT=443
ENV NODE_ENV=production

# TLS certificate paths for container
ENV TLS_KEY_PATH=/app/certs/server.key
ENV TLS_CERT_PATH=/app/certs/server.crt
ENV TLS_CA_PATH=/app/certs/ca.crt

# Verify files exist
RUN echo "Verifying required files..." && \
    if [ ! -f ./certs/server.key ]; then echo "Missing server.key"; exit 1; fi && \
    if [ ! -f ./certs/server.crt ]; then echo "Missing server.crt"; exit 1; fi && \
    if [ ! -f ./certs/ca.crt ]; then echo "Missing ca.crt"; exit 1; fi && \
    if [ ! -f ./.well-known/appspecific/com.tesla.3p.public-key.pem ]; then echo "Missing public key"; exit 1; fi && \
    echo "All required files are present"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f https://localhost:443/health || exit 1

# Start the telemetry server
CMD ["node", "dist/index.js"] 