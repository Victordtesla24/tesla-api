/**
 * Tesla Fleet API Integration - Public Key Server Validation
 * 
 * This script validates that the public key server is correctly configured
 * and that the public key is properly accessible at the required path.
 * 
 * As per Tesla's documentation:
 * "A PEM-encoded EC public key using the secp256r1 curve (prime256v1) must be hosted at
 * https://<app domain>/.well-known/appspecific/com.tesla.3p.public-key.pem"
 * https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');

async function validatePublicKeyServer() {
  console.log('Starting Public Key Server validation...');
  
  try {
    // Step 1: Validate environment variables
    const requiredEnvVars = [
      'PUBLIC_KEY_SERVER_URL',
      'PUBLIC_KEY_PATH'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Required environment variable ${envVar} is not set`);
      }
    }
    
    // Step 2: Check if local public key exists
    const publicKeyPath = process.env.PUBLIC_KEY_PATH;
    if (!fs.existsSync(publicKeyPath)) {
      throw new Error(`Public key file not found at ${publicKeyPath}`);
    }
    
    // Step 3: Validate the public key format
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    if (!publicKey.includes('-----BEGIN PUBLIC KEY-----') || 
        !publicKey.includes('-----END PUBLIC KEY-----')) {
      throw new Error('Invalid public key format. Must be a PEM-encoded EC public key');
    }
    
    console.log('Local public key exists and has the correct format');
    const localKeyHash = calculateSHA256(publicKey).substring(0, 16);
    console.log(`Local key hash: ${localKeyHash}`);
    
    // Step 4: Check if public key is accessible at the well-known URL
    const wellKnownUrl = `${process.env.PUBLIC_KEY_SERVER_URL}/.well-known/appspecific/com.tesla.3p.public-key.pem`;
    console.log(`\nChecking public key accessibility at ${wellKnownUrl}`);
    
    try {
      const response = await axios.get(wellKnownUrl);
      
      if (response.status !== 200) {
        throw new Error(`Public key endpoint returned status ${response.status}`);
      }
      
      // Verify the content type
      const contentType = response.headers['content-type'];
      if (!contentType || !contentType.includes('application/x-pem-file')) {
        console.warn(`Warning: Content-Type is "${contentType}" but should be "application/x-pem-file"`);
      } else {
        console.log('Content-Type header is correct: application/x-pem-file');
      }
      
      // Verify the content
      const remoteKey = response.data;
      if (!remoteKey.includes('-----BEGIN PUBLIC KEY-----') || 
          !remoteKey.includes('-----END PUBLIC KEY-----')) {
        throw new Error('Invalid public key format returned from server');
      }
      
      const remoteKeyHash = calculateSHA256(remoteKey).substring(0, 16);
      console.log(`Remote key hash: ${remoteKeyHash}`);
      
      // Normalize both keys (remove whitespace) for comparison
      const normalizedLocalKey = publicKey.replace(/\s+/g, '');
      const normalizedRemoteKey = remoteKey.replace(/\s+/g, '');
      
      if (normalizedLocalKey !== normalizedRemoteKey) {
        throw new Error('Public key from server does not match local public key');
      }
      
      console.log('✅ SUCCESS: Public key is correctly served at the well-known URL');
      
      // Step 5: Health check endpoint
      try {
        const healthUrl = `${process.env.PUBLIC_KEY_SERVER_URL}/health`;
        console.log(`\nChecking health endpoint at ${healthUrl}`);
        
        const healthResponse = await axios.get(healthUrl);
        if (healthResponse.status === 200) {
          console.log('✅ SUCCESS: Health endpoint is responding correctly');
          console.log('Health check data:', healthResponse.data);
        } else {
          console.warn(`Warning: Health endpoint returned status ${healthResponse.status}`);
        }
      } catch (healthError) {
        console.warn(`Warning: Health endpoint check failed: ${healthError.message}`);
      }
      
      console.log('\n===== PUBLIC KEY SERVER VALIDATION PASSED =====');
      console.log('The public key server appears to be correctly configured.');
      console.log('Users can now pair their Tesla vehicles using this deep link:');
      console.log(`https://tesla.com/_ak/${new URL(process.env.PUBLIC_KEY_SERVER_URL).hostname}`);
      
      return true;
    } catch (error) {
      console.error('Error accessing the public key URL:', error.message);
      throw new Error(`Failed to access the public key at ${wellKnownUrl}: ${error.message}`);
    }
  } catch (error) {
    console.error('\n❌ VALIDATION FAILED:');
    console.error(error.message);
    console.error('\nPlease fix these issues before proceeding to partner registration.');
    return false;
  }
}

// Helper function to calculate a SHA-256 hash
function calculateSHA256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Run validation if this script is executed directly
if (require.main === module) {
  validatePublicKeyServer().then(success => {
    if (!success) {
      process.exit(1);
    }
  });
}

module.exports = validatePublicKeyServer; 