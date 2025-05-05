#!/usr/bin/env node

/**
 * Tesla OAuth Configuration Verification Tool
 * 
 * This script verifies that the Tesla OAuth redirect URLs are correctly configured
 * and that the OAuth flow should work as expected.
 * 
 * Run with: NODE_ENV=development node scripts/verify-oauth-config.js
 */

const path = require('path');
const fs = require('fs');

// Check if we're in development mode
const isDevEnvironment = process.env.NODE_ENV === 'development';
console.log(`Running in ${isDevEnvironment ? 'development' : 'production'} mode`);

// Load environment variables from env.txt (simulate setup-env.js)
const loadEnvVarsFromEnvTxt = () => {
  try {
    const envTxtPath = path.resolve(process.cwd(), 'env.txt');
    if (!fs.existsSync(envTxtPath)) {
      console.error('❌ ERROR: env.txt file not found at', envTxtPath);
      return false;
    }

    const envFileContent = fs.readFileSync(envTxtPath, 'utf8');
    const lines = envFileContent.split('\n');
    
    // Process each line
    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || line.trim() === '') continue;
      
      // Extract variable name and value
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const name = match[1].trim();
        let value = match[2].trim();
        
        // Remove quotes if present
        if ((value.startsWith("'") && value.endsWith("'")) || 
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.substring(1, value.length - 1);
        }
        
        // Set the environment variable
        process.env[name] = value;
      }
    }

    // For development, set environment-specific variables
    if (isDevEnvironment) {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      
      const localRedirectUri = 'http://localhost:3000/api/auth/callback/tesla';
      process.env.TESLA_REDIRECT_URI = localRedirectUri;
      process.env.NEXT_PUBLIC_TESLA_REDIRECT_URI = localRedirectUri;
      process.env.TESLA_REDIRECT_URI_LOCAL = localRedirectUri;
      process.env.NEXT_PUBLIC_TESLA_REDIRECT_URI_LOCAL = localRedirectUri;
    } else {
      if (process.env.TESLA_REDIRECT_URI_PROD) {
        process.env.TESLA_REDIRECT_URI = process.env.TESLA_REDIRECT_URI_PROD;
      } else {
        process.env.TESLA_REDIRECT_URI = 'https://front-end-one-jet.vercel.app/api/auth/callback/tesla';
      }
      
      if (process.env.NEXT_PUBLIC_TESLA_REDIRECT_URI_PROD) {
        process.env.NEXT_PUBLIC_TESLA_REDIRECT_URI = process.env.NEXT_PUBLIC_TESLA_REDIRECT_URI_PROD;
      } else {
        process.env.NEXT_PUBLIC_TESLA_REDIRECT_URI = 'https://front-end-one-jet.vercel.app/api/auth/callback/tesla';
      }
    }

    return true;
  } catch (error) {
    console.error('❌ ERROR loading environment variables:', error.message);
    return false;
  }
};

// Helper function to determine the correct redirect URI based on environment
const getAppropriateRedirectUri = () => {
  // Use the environment variable that's been explicitly set
  const configuredRedirectUri = process.env.TESLA_REDIRECT_URI;
  return configuredRedirectUri;
};

// Helper function to check if required environment variables are set
const checkRequiredEnvVars = () => {
  const requiredVars = [
    'TESLA_CLIENT_ID',
    'TESLA_CLIENT_SECRET',
    'TESLA_REDIRECT_URI',
    'TESLA_TOKEN_URL',
    'TESLA_AUTH_URL',
    'NEXT_PUBLIC_TESLA_CLIENT_ID',
    'NEXT_PUBLIC_TESLA_REDIRECT_URI',
    'NEXT_PUBLIC_TESLA_AUTH_URL'
  ];
  
  const missingVars = [];
  const presentVars = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    } else {
      presentVars.push(varName);
    }
  }
  
  return { missingVars, presentVars };
};

// Verify the redirect URIs match between server and client
const verifyRedirectUris = () => {
  const serverRedirectUri = process.env.TESLA_REDIRECT_URI;
  const clientRedirectUri = process.env.NEXT_PUBLIC_TESLA_REDIRECT_URI;
  
  if (serverRedirectUri !== clientRedirectUri) {
    console.error('❌ ERROR: Redirect URIs do not match between server and client');
    console.error(`  Server: ${serverRedirectUri}`);
    console.error(`  Client: ${clientRedirectUri}`);
    return false;
  }
  
  console.log('✅ Redirect URIs match between server and client');
  return true;
};

// Verify that credentials are present
const verifyCredentials = () => {
  if (!process.env.TESLA_CLIENT_ID || !process.env.TESLA_CLIENT_SECRET) {
    console.error('❌ ERROR: Missing Tesla API credentials');
    if (!process.env.TESLA_CLIENT_ID) console.error('  TESLA_CLIENT_ID is missing');
    if (!process.env.TESLA_CLIENT_SECRET) console.error('  TESLA_CLIENT_SECRET is missing');
    return false;
  }
  
  console.log('✅ Tesla API credentials are present');
  return true;
};

// Verify the environment-specific redirect URI is correct
const verifyEnvironmentRedirectUri = () => {
  const redirectUri = getAppropriateRedirectUri();
  const expectedUri = isDevEnvironment 
    ? 'http://localhost:4040/api/auth/callback/tesla'
    : 'https://front-end-one-jet.vercel.app/api/auth/callback/tesla';
  
  if (redirectUri !== expectedUri) {
    console.error(`❌ ERROR: Redirect URI is not set correctly for ${isDevEnvironment ? 'development' : 'production'}`);
    console.error(`  Expected: ${expectedUri}`);
    console.error(`  Actual: ${redirectUri}`);
    return false;
  }
  
  console.log(`✅ Redirect URI is correct for ${isDevEnvironment ? 'development' : 'production'}: ${redirectUri}`);
  return true;
};

// Verify Tesla OAuth callback endpoint is correctly implemented
const verifyCallbackEndpointImplementation = () => {
  // Check if the callback route file exists
  const callbackPath = path.resolve(process.cwd(), 'frontend/app/api/auth/callback/tesla/route.js');
  if (!fs.existsSync(callbackPath)) {
    console.error('❌ ERROR: Tesla callback route file not found at', callbackPath);
    return false;
  }
  
  // Read the file content to check implementation
  try {
    const fileContent = fs.readFileSync(callbackPath, 'utf8');
    
    // Check for POST handler with correct implementation
    if (!fileContent.includes('export async function POST') || 
        !fileContent.includes('return new Response(null, { status: 404')) {
      console.error('❌ ERROR: POST handler in Tesla callback route is missing or incorrect');
      console.error('  The handler should return a 404 response to allow NextAuth to handle the request');
      return false;
    }
    
    // Check for correct GET implementation
    if (!fileContent.includes('export async function GET') || 
        !fileContent.includes('loginUrl.searchParams.set(\'auth_source\', \'tesla\')')) {
      console.error('❌ ERROR: GET handler in Tesla callback route is missing or incorrect');
      console.error('  The handler should redirect to /login with auth_source=tesla');
      return false;
    }
    
    console.log('✅ Tesla callback route implementation is correct');
    return true;
  } catch (error) {
    console.error('❌ ERROR reading callback route file:', error.message);
    return false;
  }
};

// Verify NextAuth configuration
const verifyNextAuthConfiguration = () => {
  // Check if the NextAuth config file exists
  const nextAuthPath = path.resolve(process.cwd(), 'frontend/app/api/auth/[...nextauth]/route.js');
  if (!fs.existsSync(nextAuthPath)) {
    console.error('❌ ERROR: NextAuth configuration file not found at', nextAuthPath);
    return false;
  }
  
  // Read the file content to check implementation
  try {
    const fileContent = fs.readFileSync(nextAuthPath, 'utf8');
    
    // Check for tesla provider
    if (!fileContent.includes('id: \'tesla\'')) {
      console.error('❌ ERROR: Tesla provider not found in NextAuth configuration');
      return false;
    }
    
    // Check for redirect URI usage
    if (!fileContent.includes('getAppropriateRedirectUri')) {
      console.error('❌ ERROR: getAppropriateRedirectUri function not found in NextAuth configuration');
      return false;
    }
    
    console.log('✅ NextAuth configuration is correct');
    return true;
  } catch (error) {
    console.error('❌ ERROR reading NextAuth configuration file:', error.message);
    return false;
  }
};

// Main function to run the verification
const main = () => {
  console.log('=== Tesla OAuth Configuration Verification Tool ===');
  console.log('Verifying Tesla OAuth configuration...\n');
  
  // Load environment variables
  console.log('Loading environment variables...');
  const envLoaded = loadEnvVarsFromEnvTxt();
  if (!envLoaded) {
    console.error('❌ Failed to load environment variables. Cannot continue.');
    process.exit(1);
  }
  
  // Check required environment variables
  const { missingVars, presentVars } = checkRequiredEnvVars();
  
  if (missingVars.length > 0) {
    console.error('❌ ERROR: Missing required environment variables:');
    missingVars.forEach(varName => console.error(`  - ${varName}`));
  } else {
    console.log('✅ All required environment variables are present');
  }
  
  console.log('\nPresent environment variables:');
  presentVars.forEach(varName => {
    // Mask sensitive values
    let value = process.env[varName];
    if (value && (varName.includes('SECRET') || varName.includes('KEY'))) {
      value = value.substring(0, 4) + '...' + value.substring(value.length - 4);
    } else if (value && varName.includes('TOKEN')) {
      value = value.substring(0, 10) + '...';
    }
    console.log(`  - ${varName}: ${value}`);
  });
  
  console.log('\nVerifying redirect URIs:');
  const redirectUrisMatch = verifyRedirectUris();
  
  console.log('\nVerifying credentials:');
  const credentialsPresent = verifyCredentials();
  
  console.log('\nVerifying environment-specific redirect URI:');
  const environmentUriCorrect = verifyEnvironmentRedirectUri();
  
  console.log('\nVerifying Tesla callback endpoint implementation:');
  const callbackImplementationCorrect = verifyCallbackEndpointImplementation();
  
  console.log('\nVerifying NextAuth configuration:');
  const nextAuthConfigurationCorrect = verifyNextAuthConfiguration();
  
  console.log('\nVerification summary:');
  const allChecksPass = missingVars.length === 0 && 
                        redirectUrisMatch && 
                        credentialsPresent && 
                        environmentUriCorrect && 
                        callbackImplementationCorrect && 
                        nextAuthConfigurationCorrect;
  
  if (allChecksPass) {
    console.log('✅ All checks passed! Tesla OAuth configuration is correct.');
    console.log('✅ Redirect URI:', getAppropriateRedirectUri());
    
    // Provide test commands
    console.log('\nNext steps:');
    console.log('1. Run your application: NODE_ENV=development npm run dev --prefix frontend');
    console.log('2. Test login flow by visiting: http://localhost:3000/login');
  } else {
    console.error('❌ Some checks failed. Please fix the issues above.');
  }
};

// Run the main function
main(); 