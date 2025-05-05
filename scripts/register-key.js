/**
 * Tesla Fleet API Integration - Register Public Key
 * 
 * This script registers the public key with Tesla's partner account endpoint.
 * It should be run after the public key server is deployed and accessible.
 * 
 * As per Tesla's documentation: 
 * "Before the application can be added to a vehicle, it first needs to be registered with Tesla."
 * https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide
 */

// Path to the project root to access the .env file
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const axios = require('axios');
const fs = require('fs');
const { URL } = require('url');
const teslaApi = require('../teslaApi'); // Use the shared API client

// Execute registration process
async function main() {
  try {
    console.log('Starting Tesla Partner Account Registration Process');
    
    // Step 1: Validate environment variables
    const requiredEnvVars = [
      'TESLA_CLIENT_ID',
      'TESLA_CLIENT_SECRET', 
      'TESLA_TOKEN_URL', 
      'TESLA_API_BASE_URL', 
      'PUBLIC_KEY_SERVER_URL',
      'PUBLIC_KEY_PATH'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Required environment variable ${envVar} is not set`);
      }
    }
    
    // Step 2: Verify the public key exists and is accessible
    const publicKeyPath = process.env.PUBLIC_KEY_PATH;
    if (!fs.existsSync(publicKeyPath)) {
      throw new Error(`Public key file not found at ${publicKeyPath}`);
    }
    
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    console.log(`Public key loaded from ${publicKeyPath}`);
    
    // Step 3: Verify the public key is available at the well-known URL
    const wellKnownUrl = `${process.env.PUBLIC_KEY_SERVER_URL}/.well-known/appspecific/com.tesla.3p.public-key.pem`;
    console.log(`Verifying public key is accessible at ${wellKnownUrl}`);
    
    try {
      const response = await axios.get(wellKnownUrl);
      
      if (response.status !== 200) {
        throw new Error(`Public key endpoint returned status ${response.status}`);
      }
      
      // Normalize both keys (remove whitespace) for comparison
      const normalizedLocalKey = publicKey.replace(/\s+/g, '');
      const normalizedRemoteKey = response.data.replace(/\s+/g, '');
      
      if (normalizedLocalKey !== normalizedRemoteKey) {
        throw new Error('Public key from server does not match local public key');
      }
      
      console.log('Public key verified and accessible at the well-known URL');
    } catch (error) {
      console.error('Error accessing the public key URL:', error.message);
      throw new Error(`Failed to access the public key at ${wellKnownUrl}: ${error.message}`);
    }
    
    // Step 4: Register the partner account with Tesla
    console.log('Registering partner account with Tesla...');
    await teslaApi.registerPartnerAccount();
    
    // Step 5: Verify the registration
    console.log('Verifying partner account registration...');
    await teslaApi.verifyPartnerRegistration();
    
    // Success! Provide next steps
    console.log('\nPartner registration completed successfully!');
    
    // Extract the domain for the deep link
    const domain = new URL(process.env.PUBLIC_KEY_SERVER_URL).hostname;
    console.log(`\nUsers can now pair their Tesla vehicles using this deep link:`);
    console.log(`https://tesla.com/_ak/${domain}`);
    console.log(`\nThis link initiates the pairing process as described in:`);
    console.log('https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide#adding-to-a-vehicle');
  } catch (error) {
    console.error('\nERROR: Registration process failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run the script
main(); 