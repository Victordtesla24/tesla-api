#!/usr/bin/env node

/**
 * Tesla Fleet API Integration - Verify Public Key
 * 
 * This script verifies that the public key is correctly hosted at the required Tesla well-known path.
 * It checks that the public key is accessible, has the correct format, and matches the local copy.
 * 
 * Reference: https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide#hosting-the-public-key
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
const { URL } = require('url');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Main verification function
async function verifyPublicKey() {
  console.log(`${colors.blue}Tesla Fleet API Public Key Verification${colors.reset}`);
  console.log('----------------------------------------');
  
  try {
    // Step 1: Validate environment variables
    checkEnvVariables();
    
    // Step 2: Check if public key file exists
    const publicKeyPath = process.env.PUBLIC_KEY_PATH;
    if (!fs.existsSync(publicKeyPath)) {
      throw new Error(`Public key file not found at ${publicKeyPath}`);
    }
    
    console.log(`${colors.green}✓${colors.reset} Public key file exists at ${publicKeyPath}`);
    
    // Step 3: Load and validate public key format
    const localKey = fs.readFileSync(publicKeyPath, 'utf8');
    validateKeyFormat(localKey);
    
    // Step 4: Validate the well-known URL is accessible
    const wellKnownUrl = `${process.env.PUBLIC_KEY_SERVER_URL}/.well-known/appspecific/com.tesla.3p.public-key.pem`;
    
    console.log(`\nAttempting to fetch public key from: ${wellKnownUrl}`);
    const response = await axios.get(wellKnownUrl);
    
    if (response.status !== 200) {
      throw new Error(`Server returned status code ${response.status}, expected 200`);
    }
    
    console.log(`${colors.green}✓${colors.reset} Server returned status code ${response.status}`);
    
    // Step 5: Check the Content-Type header
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.includes('application/x-pem-file')) {
      console.log(`${colors.yellow}⚠️ Warning:${colors.reset} Content-Type is "${contentType}", expected "application/x-pem-file"`);
    } else {
      console.log(`${colors.green}✓${colors.reset} Content-Type correctly set to "${contentType}"`);
    }
    
    // Step 6: Validate the returned key format
    const remoteKey = response.data;
    validateKeyFormat(remoteKey);
    
    // Step 7: Compare the local and remote keys
    compareKeys(localKey, remoteKey);
    
    console.log(`\n${colors.green}✓ All checks passed!${colors.reset}`);
    console.log(`\nThe public key is correctly hosted and accessible at the required Tesla well-known path.`);
    console.log(`Once registered, users can pair vehicles using: ${colors.cyan}https://tesla.com/_ak/${getHostname()}${colors.reset}`);
    
    return true;
  } catch (error) {
    console.error(`\n${colors.red}✗ Verification failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Check if required environment variables are set
function checkEnvVariables() {
  const requiredVars = [
    'PUBLIC_KEY_SERVER_URL',
    'PUBLIC_KEY_PATH'
  ];
  
  const missingVars = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  console.log(`${colors.green}✓${colors.reset} All required environment variables are set`);
}

// Validate that the key is in the correct format
function validateKeyFormat(key) {
  // Check for PEM format
  if (!key.includes('-----BEGIN PUBLIC KEY-----') || 
      !key.includes('-----END PUBLIC KEY-----')) {
    throw new Error('Key is not in PEM format');
  }
  
  try {
    // Validate that it's an EC key on the P-256 curve
    const publicKeyObject = crypto.createPublicKey(key);
    const keyDetails = publicKeyObject.export({ format: 'jwk' });
    
    // Check if it's an EC key
    if (keyDetails.kty !== 'EC') {
      throw new Error('Key is not an EC key');
    }
    
    // Check if it's on the P-256 curve (prime256v1)
    if (keyDetails.crv !== 'P-256') {
      throw new Error('Key is not on the P-256 curve (prime256v1)');
    }
    
    // Calculate SHA-256 hash for verification
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const shortHash = keyHash.substring(0, 8);
    
    console.log(`${colors.green}✓${colors.reset} Valid EC key on P-256 curve (prime256v1), SHA-256: ${shortHash}...`);
  } catch (error) {
    throw new Error(`Invalid key format: ${error.message}`);
  }
}

// Compare the local and remote keys
function compareKeys(localKey, remoteKey) {
  // Normalize both keys (remove whitespace) for comparison
  const normalizedLocalKey = localKey.replace(/\s+/g, '');
  const normalizedRemoteKey = remoteKey.replace(/\s+/g, '');
  
  // Calculate SHA-256 hashes for verification
  const localHash = crypto.createHash('sha256').update(normalizedLocalKey).digest('hex');
  const remoteHash = crypto.createHash('sha256').update(normalizedRemoteKey).digest('hex');
  
  if (localHash !== remoteHash) {
    console.log(`${colors.red}✗${colors.reset} Key mismatch:`);
    console.log(`  Local key SHA-256:  ${localHash.substring(0, 16)}...`);
    console.log(`  Remote key SHA-256: ${remoteHash.substring(0, 16)}...`);
    throw new Error('The public key on the server does not match the local public key');
  }
  
  console.log(`${colors.green}✓${colors.reset} Local key matches remote key`);
}

// Extract hostname from the PUBLIC_KEY_SERVER_URL
function getHostname() {
  try {
    const hostname = new URL(process.env.PUBLIC_KEY_SERVER_URL).hostname;
    if (hostname.startsWith('www.')) {
      return hostname.substring(4);
    }
    return hostname;
  } catch (error) {
    throw new Error(`Invalid PUBLIC_KEY_SERVER_URL: ${process.env.PUBLIC_KEY_SERVER_URL}`);
  }
}

// Run the verification script
verifyPublicKey().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
}); 