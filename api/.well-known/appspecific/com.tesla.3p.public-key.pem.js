/**
 * Tesla Fleet API Public Key
 * 
 * This endpoint serves the Tesla public key at the well-known path required
 * by Tesla for virtual key pairing.
 * 
 * Reference: https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide#hosting-the-public-key
 */

// The public key for Tesla virtual key pairing
const publicKey = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEaRTbtrk0U7KxWXXU0RQS6QYOVYLu
YtD9maVJ3CPFqK/3krF2WMHMDf+yXU9xyJKkf8mWBXuTBJFQCgP0+ul9Dg==
-----END PUBLIC KEY-----`;

module.exports = (req, res) => {
  // Set the Content-Type header for PEM file
  res.setHeader('Content-Type', 'application/x-pem-file');
  
  // Set cache control headers
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  
  // Return the public key
  res.status(200).send(publicKey);
}; 