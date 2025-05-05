/**
 * Health check endpoint for the Tesla Public Key Server
 */

module.exports = (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Tesla Public Key Server',
    wellKnownPath: '/.well-known/appspecific/com.tesla.3p.public-key.pem',
    publicKeyAvailable: true
  });
}; 