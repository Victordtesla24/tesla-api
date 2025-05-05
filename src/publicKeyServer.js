/**
 * Tesla Fleet API Integration - Public Key Server
 * 
 * This server hosts the ECDSA public key (prime256v1) required for Tesla vehicle pairing.
 * The key must be served at /.well-known/appspecific/com.tesla.3p.public-key.pem
 * 
 * As per Tesla Fleet API docs: "A PEM-encoded EC public key using the secp256r1 curve 
 * (prime256v1) must be hosted at https://<app domain>/.well-known/appspecific/com.tesla.3p.public-key.pem"
 * 
 * Reference: https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide#hosting-the-public-key
 */

require('dotenv').config();

const express = require('express');
const crypto = require('crypto');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Constants for well-known path - Tesla requires exactly this path
const WELL_KNOWN_PATH = '/.well-known/appspecific/com.tesla.3p.public-key.pem';

// Hard-code the public key for Vercel deployment
const publicKey = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEP7OMEmv2mz/2Dfq0NUYwiylsZ9MO
wIxRRfiz2nhiCtnkZgdDq6Ghdpy4y422/UcsdcggNF9IOAvxJLs7CSxg1Q==
-----END PUBLIC KEY-----`;

// Calculate and log the SHA-256 hash of the key for verification
const keyHash = crypto.createHash('sha256').update(publicKey).digest('hex');
console.log(`Public key SHA-256: ${keyHash.substring(0, 8)}...${keyHash.substring(keyHash.length - 8)}`);

// Middleware for logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve the public key at the required Tesla well-known path
app.get(WELL_KNOWN_PATH, (req, res) => {
  res.set('Content-Type', 'application/x-pem-file');
  res.send(publicKey);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    wellKnownPath: WELL_KNOWN_PATH,
    publicKeyAvailable: !!publicKey,
    keyHash: keyHash.substring(0, 8)
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'Tesla Fleet API Public Key Server',
    status: 'Running',
    publicKeyPath: WELL_KNOWN_PATH,
    healthCheck: '/health'
  });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Public Key Server running on port ${PORT}`);
  console.log(`Public key available at: http://localhost:${PORT}${WELL_KNOWN_PATH}`);
  if (process.env.PUBLIC_KEY_SERVER_URL) {
    console.log(`Production URL: ${process.env.PUBLIC_KEY_SERVER_URL}${WELL_KNOWN_PATH}`);
  }
});

module.exports = server; 