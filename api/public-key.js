/**
 * Tesla Fleet API Integration - Public Key Serverless Function
 * 
 * This serverless function serves the Tesla ECDSA public key (prime256v1) required for Tesla vehicle pairing.
 * The key must be accessible at /.well-known/appspecific/com.tesla.3p.public-key.pem
 * 
 * As per Tesla Fleet API docs: "A PEM-encoded EC public key using the secp256r1 curve 
 * (prime256v1) must be hosted at https://<app domain>/.well-known/appspecific/com.tesla.3p.public-key.pem"
 * 
 * Reference: https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide#hosting-the-public-key
 */

// The public key for Tesla virtual key pairing
const publicKey = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEP7OMEmv2mz/2Dfq0NUYwiylsZ9MO
wIxRRfiz2nhiCtnkZgdDq6Ghdpy4y422/UcsdcggNF9IOAvxJLs7CSxg1Q==
-----END PUBLIC KEY-----`;

module.exports = (req, res) => {
  // Set the Content-Type header for PEM file
  res.setHeader('Content-Type', 'application/x-pem-file');
  // Return the public key
  res.status(200).send(publicKey);
}; 