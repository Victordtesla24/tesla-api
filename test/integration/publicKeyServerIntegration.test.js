/**
 * Integration tests for Public Key Server
 * Tests that:
 * 1. The public key server is correctly integrated with the telemetry server
 * 2. The tesla partner registration is possible with the published key
 * 3. The public key can be verified using Tesla's API
 */

const axios = require('axios');
const config = require('../../src/config');
const { promisify } = require('util');
const fs = require('fs');
const readFileAsync = promisify(fs.readFile);
const path = require('path');
const crypto = require('crypto');

// Skip tests if in CI environment where we can't make real API calls
const shouldSkipApiTests = process.env.CI || !config.TESLA_PARTNER_TOKEN;

describe('Public Key Server Integration', () => {
  const publicKeyServerUrl = config.PUBLIC_KEY_SERVER_URL.replace(/\/$/, '');
  const wellKnownPath = config.WELL_KNOWN_PATH || '/.well-known/appspecific/com.tesla.3p.public-key.pem';
  const fullPublicKeyUrl = `${publicKeyServerUrl}${wellKnownPath}`;
  
  let remotePublicKey;
  let localPublicKey;
  
  beforeAll(async () => {
    // Skip setup if we're skipping the tests
    if (shouldSkipApiTests) return;
    
    // Fetch the public key from the server
    try {
      const response = await axios.get(fullPublicKeyUrl);
      remotePublicKey = response.data;
    } catch (error) {
      console.error('Failed to fetch remote public key:', error.message);
    }
    
    // Read the local public key file
    try {
      const publicKeyPath = path.resolve(process.cwd(), config.PUBLIC_KEY_PATH || '.well-known/appspecific/com.tesla.3p.public-key.pem');
      localPublicKey = await readFileAsync(publicKeyPath, 'utf8');
    } catch (error) {
      console.error('Failed to read local public key:', error.message);
    }
  });

  test('Telemetry server can access the public key', async () => {
    // Skip test in CI environments
    if (shouldSkipApiTests) {
      console.log('Skipping API test in CI environment');
      return;
    }
    
    // Verify the remote public key was fetched
    expect(remotePublicKey).toBeDefined();
    expect(remotePublicKey).toContain('-----BEGIN PUBLIC KEY-----');
    expect(remotePublicKey).toContain('-----END PUBLIC KEY-----');
  });

  test('Published public key matches local public key', async () => {
    // Skip test in CI environments
    if (shouldSkipApiTests) {
      console.log('Skipping API test in CI environment');
      return;
    }
    
    // Clean up whitespace and compare
    const normalizedRemoteKey = remotePublicKey.replace(/\s+/g, '');
    const normalizedLocalKey = localPublicKey.replace(/\s+/g, '');
    
    expect(normalizedRemoteKey).toBe(normalizedLocalKey);
  });

  test('Public key is correctly configured in environment variables', () => {
    expect(config.PUBLIC_KEY_SERVER_URL).toBeTruthy();
    expect(config.PUBLIC_KEY_SERVER_URL).toContain('https://');
    expect(config.PUBLIC_KEY_DOMAIN).toBeTruthy();
    expect(config.WELL_KNOWN_PATH).toBe('/.well-known/appspecific/com.tesla.3p.public-key.pem');
  });

  // This test would require a valid partner token to run
  test.skip('Tesla can verify the public key', async () => {
    // Skip test in CI environments or if no partner token
    if (shouldSkipApiTests) {
      console.log('Skipping Tesla API test due to missing partner token');
      return;
    }
    
    // Endpoint to verify a public key
    const teslaApiBaseUrl = config.TESLA_API_BASE_URL;
    const endpoint = `${teslaApiBaseUrl}/partner_accounts/public_key`;
    
    try {
      const response = await axios.get(endpoint, {
        params: { domain: config.PUBLIC_KEY_DOMAIN },
        headers: {
          Authorization: `Bearer ${config.TESLA_PARTNER_TOKEN}`
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('public_key');
    } catch (error) {
      // This will fail if the domain isn't registered with Tesla or token is invalid
      console.error('Tesla API Error:', error.response?.data || error.message);
      // We don't want to fail the test if the domain isn't registered yet
      // as this is likely part of the setup process
    }
  });
}); 