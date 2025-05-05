#!/usr/bin/env node

/**
 * Tesla Fleet API Integration - Register Partner Account
 * 
 * This script registers our domain and public key with Tesla's partner account system.
 * It's a one-time operation that must be performed after the public key server is deployed.
 * 
 * As per Tesla's documentation:
 * "A PEM-encoded EC public key using the secp256r1 curve (prime256v1) must be hosted 
 * at https://<app domain>/.well-known/appspecific/com.tesla.3p.public-key.pem.
 * The domain used in the request must match where the public key is hosted.
 * The domain's public key must be accessible when this API is called."
 * 
 * Reference: https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints#register
 */

// Path to the project root to access the .env file
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
const { URL } = require('url');

// Function to get a partner token
async function getPartnerToken() {
  try {
    const tokenUrl = process.env.TESLA_TOKEN_URL;
    if (!tokenUrl) {
      throw new Error('TESLA_TOKEN_URL environment variable not set');
    }
    
    const clientId = process.env.TESLA_CLIENT_ID;
    const clientSecret = process.env.TESLA_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('TESLA_CLIENT_ID or TESLA_CLIENT_SECRET environment variables not set');
    }
    
    console.log('Requesting partner token...');
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    
    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.data.access_token) {
      throw new Error('No access_token returned from Tesla API');
    }

    console.log('Partner token obtained successfully');
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting partner token:', error.response?.data || error.message);
    throw new Error('Failed to obtain partner token');
  }
}

// Function to register the partner account
async function registerPartnerAccount() {
  try {
    // Step 1: Validate environment variables
    const requiredEnvVars = [
      'TESLA_API_BASE_URL',
      'PUBLIC_KEY_SERVER_URL',
      'PUBLIC_KEY_PATH'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Required environment variable ${envVar} is not set`);
      }
    }
    
    // Step 2: Verify the public key exists
    const publicKeyPath = process.env.PUBLIC_KEY_PATH;
    if (!fs.existsSync(publicKeyPath)) {
      throw new Error(`Public key file not found at ${publicKeyPath}`);
    }
    
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    console.log(`Public key loaded from ${publicKeyPath}`);
    
    // Step 3: Validate the key is a valid EC key
    try {
      const publicKeyObject = crypto.createPublicKey(publicKey);
      const keyDetails = publicKeyObject.export({ format: 'jwk' });
      
      if (keyDetails.kty !== 'EC' || keyDetails.crv !== 'P-256') {
        throw new Error('Invalid key format: Tesla requires an EC key on the prime256v1 (P-256) curve');
      }
      
      console.log('Public key verified as EC key on P-256 curve (prime256v1) ✓');
    } catch (error) {
      throw new Error(`Invalid public key: ${error.message}`);
    }
    
    // Step 4: Extract the domain from the PUBLIC_KEY_SERVER_URL
    const publicKeyServerUrl = process.env.PUBLIC_KEY_SERVER_URL;
    let domain;
    
    try {
      domain = new URL(publicKeyServerUrl).hostname;
      if (domain.startsWith('www.')) {
        domain = domain.substring(4);
      }
      console.log(`Using domain for registration: ${domain}`);
    } catch (error) {
      throw new Error(`Invalid PUBLIC_KEY_SERVER_URL: ${publicKeyServerUrl}`);
    }
    
    // Step 5: Verify the public key is accessible at the well-known URL
    const wellKnownUrl = `${publicKeyServerUrl}/.well-known/appspecific/com.tesla.3p.public-key.pem`;
    console.log(`Verifying public key is accessible at: ${wellKnownUrl}`);
    
    try {
      const response = await axios.get(wellKnownUrl);
      
      if (response.status !== 200) {
        throw new Error(`Public key endpoint returned status ${response.status}`);
      }
      
      if (!response.data.includes('BEGIN PUBLIC KEY')) {
        throw new Error('The response does not contain a valid public key');
      }
      
      // Normalize both keys (remove whitespace) for comparison
      const normalizedLocalKey = publicKey.replace(/\s+/g, '');
      const normalizedRemoteKey = response.data.replace(/\s+/g, '');
      
      if (normalizedLocalKey !== normalizedRemoteKey) {
        throw new Error('The public key on the server does not match the local public key');
      }
      
      console.log('Public key is accessible at the well-known URL and matches local key ✓');
    } catch (error) {
      console.error('Error accessing public key URL:', error.message);
      throw new Error(`Public key must be accessible at the well-known URL before registration.
      Tesla's servers will attempt to fetch your public key during registration.
      Please ensure the key is properly hosted before proceeding.`);
    }
    
    // Step 6: Get partner token
    const token = await getPartnerToken();
    
    // Step 7: Register with Tesla
    const apiBaseUrl = process.env.TESLA_API_BASE_URL;
    const baseUrl = apiBaseUrl.endsWith('/api/1') 
      ? apiBaseUrl 
      : `${apiBaseUrl}/api/1`;
      
    const url = `${baseUrl}/partner_accounts`;
    console.log(`Registering partner account at ${url}`);
    
    // Tesla expects a simple JSON object with the "domain" property
    const response = await axios.post(
      url,
      { domain },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\nPartner account registration successful! ✓');
    console.log('Response from Tesla API:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Step 8: Verify the registration
    console.log('\nVerifying registration by fetching public key from Tesla...');
    
    const verifyUrl = `${baseUrl}/partner_accounts/public_key?domain=${encodeURIComponent(domain)}`;
    const verifyResponse = await axios.get(verifyUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (verifyResponse.status !== 200) {
      throw new Error(`Verification failed with status ${verifyResponse.status}`);
    }
    
    // Normalize keys for comparison
    const normalizedLocalKey = publicKey.replace(/\s+/g, '');
    const normalizedResponseKey = verifyResponse.data.replace(/\s+/g, '');
    
    if (normalizedLocalKey !== normalizedResponseKey) {
      throw new Error('The public key registered with Tesla does not match the local public key');
    }
    
    console.log('Registration successfully verified! ✓');
    console.log(`\nUsers can now pair vehicles using this URL: https://tesla.com/_ak/${domain}`);
    console.log('Reference: https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide#adding-to-a-vehicle');
    
    return response.data;
  } catch (error) {
    console.error('\nERROR: Partner registration failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run the registration process
registerPartnerAccount().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 