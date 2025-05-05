#!/usr/bin/env node

/**
 * Tesla Fleet API Integration - Register Partner Account
 * 
 * This script registers our domain with Tesla's partner account system.
 * It's a one-time operation that must be performed after the public key server is deployed.
 * 
 * As per Tesla documentation:
 * "A PEM-encoded EC public key using the secp256r1 curve (prime256v1) must be hosted 
 * at https://<app domain>/.well-known/appspecific/com.tesla.3p.public-key.pem.
 * The domain used in the request must match where the public key is hosted.
 * The domain's public key must be accessible when this API is called."
 * 
 * Reference: https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints#partner_accounts
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const { URL } = require('url');
const path = require('path');

// Load .env file from the project root
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// --- Configuration Validation & Fail Fast ---
const teslaApiBaseUrl = process.env.TESLA_API_BASE_URL;
const publicKeyDomain = process.env.PUBLIC_KEY_DOMAIN;
const partnerToken = process.env.TESLA_PARTNER_TOKEN;

if (!teslaApiBaseUrl) {
    console.error('FATAL ERROR: TESLA_API_BASE_URL environment variable is not set.');
    process.exit(1); // Fail fast
}
if (!publicKeyDomain) {
    console.error('FATAL ERROR: PUBLIC_KEY_DOMAIN environment variable is not set (e.g., your.domain.com).');
    process.exit(1); // Fail fast
}
if (!partnerToken) {
    console.error('FATAL ERROR: TESLA_PARTNER_TOKEN environment variable is not set.');
    console.error('Please obtain a Partner Token from your Tesla Developer account.');
    process.exit(1); // Fail fast
}

// Function to register the partner account with Tesla
async function registerPartnerAccount() {
  try {
    // Step 1: Validate required environment variables
    const requiredVars = [
      'PUBLIC_KEY_SERVER_URL',
      'TESLA_API_BASE_URL',
      'TESLA_PARTNER_TOKEN',
      'PUBLIC_KEY_PATH'
    ];
    
    for (const variable of requiredVars) {
      if (!process.env[variable]) {
        console.error(`Missing required environment variable: ${variable}`);
        process.exit(1);
      }
    }
    
    // Step 2: Extract the domain from PUBLIC_KEY_SERVER_URL or use PUBLIC_KEY_DOMAIN if provided
    const publicKeyServerUrl = process.env.PUBLIC_KEY_SERVER_URL;
    let domain;
    
    if (process.env.PUBLIC_KEY_DOMAIN) {
      domain = process.env.PUBLIC_KEY_DOMAIN;
      console.log(`Using provided PUBLIC_KEY_DOMAIN: ${domain}`);
    } else {
      try {
        const urlObj = new URL(publicKeyServerUrl);
        domain = urlObj.hostname;
        console.log(`Extracted domain from PUBLIC_KEY_SERVER_URL: ${domain}`);
      } catch (error) {
        console.error(`Invalid PUBLIC_KEY_SERVER_URL: ${publicKeyServerUrl}`);
        process.exit(1);
      }
    }
    
    // Step 3: Verify the public key is accessible at the well-known URL
    const wellKnownUrl = `${publicKeyServerUrl.replace(/\/+$/, '')}/.well-known/appspecific/com.tesla.3p.public-key.pem`;
    console.log(`Verifying public key is accessible at: ${wellKnownUrl}`);
    
    try {
      const response = await axios.get(wellKnownUrl, { timeout: 10000 });
      
      if (response.status !== 200) {
        throw new Error(`Public key endpoint returned status ${response.status}`);
      }
      
      if (!response.data.includes('BEGIN PUBLIC KEY')) {
        throw new Error('The response does not contain a valid public key');
      }
      
      console.log('Public key is accessible at the well-known URL ✓');
    } catch (error) {
      console.error('Error accessing public key URL:', error.message);
      console.error(`
      Public key must be accessible at the well-known URL before registration.
      Tesla's servers will attempt to fetch your public key during registration.
      Please ensure the key is properly hosted before proceeding.
      `);
      process.exit(1);
    }
    
    // Step 4: Register with Tesla using partner token
    let apiBaseUrl = process.env.TESLA_API_BASE_URL;
    // Adjust the base URL if needed
    if (!apiBaseUrl.endsWith('/api/1')) {
      apiBaseUrl = `${apiBaseUrl}/api/1`;
    }
    
    const url = `${apiBaseUrl}/partner_accounts`;
    console.log(`Registering partner account at ${url}`);
    
    // Tesla expects a simple JSON object with the "domain" property
    const response = await axios.post(
      url,
      { domain },
      {
        headers: {
          'Authorization': `Bearer ${process.env.TESLA_PARTNER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\nPartner account registration successful! ✓');
    console.log('Response from Tesla API:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Step 5: Verify the registration
    console.log('\nVerifying registration by fetching public key from Tesla...');
    
    const verifyUrl = `${apiBaseUrl}/partner_accounts/public_key?domain=${encodeURIComponent(domain)}`;
    try {
      const verifyResponse = await axios.get(verifyUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.TESLA_PARTNER_TOKEN}`
        }
      });
      
      if (verifyResponse.status === 200) {
        console.log('Registration successfully verified! ✓');
        console.log(`\nUsers can now pair vehicles using this URL: https://tesla.com/_ak/${domain}`);
        console.log('Reference: https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide#adding-to-a-vehicle');
      } else {
        console.warn(`Verification returned status ${verifyResponse.status}`);
      }
    } catch (verifyError) {
      console.warn('Could not verify registration:', verifyError.message);
      console.warn('This may be expected for newly registered domains, please try again in a few minutes.');
    }
    
    return response.data;
  } catch (error) {
    console.error('\nERROR: Partner registration failed:');
    console.error(error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the registration process
registerPartnerAccount().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 