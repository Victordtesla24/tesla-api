/**
 * Root endpoint for the Tesla Public Key Server
 */

module.exports = (req, res) => {
  res.status(200).json({
    service: 'Tesla Fleet API Public Key Server',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      publicKey: '/.well-known/appspecific/com.tesla.3p.public-key.pem',
      health: '/health'
    }
  });
}; 