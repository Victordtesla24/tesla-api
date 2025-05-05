/**
 * Unit tests for Public Key Server
 * Tests that the public key server at PUBLIC_KEY_SERVER_URL is:
 * 1. Accessible
 * 2. Serving a PEM-formatted public key at the correct path
 * 3. Returning the correct content type
 */

const axios = require('axios');
const { promisify } = require('util');
const crypto = require('crypto');
const fs = require('fs');
const readFileAsync = promisify(fs.readFile);
const path = require('path');
const config = require('../../src/config');

describe('Public Key Server', () => {
  const publicKeyServerUrl = config.PUBLIC_KEY_SERVER_URL.replace(/\/$/, ''); // Remove trailing slash if present
  const wellKnownPath = config.WELL_KNOWN_PATH || '/.well-known/appspecific/com.tesla.3p.public-key.pem';
  const fullPublicKeyUrl = `${publicKeyServerUrl}${wellKnownPath}`;
  
  // Helper function to validate PEM format
  const isValidPemFormat = (pemString) => {
    return (
      pemString &&
      pemString.includes('-----BEGIN PUBLIC KEY-----') &&
      pemString.includes('-----END PUBLIC KEY-----')
    );
  };

  test('Public Key Server is accessible', async () => {
    // Skip test if running in CI environment without access to external servers
    if (process.env.CI) {
      return;
    }
    
    const response = await axios.get(`${publicKeyServerUrl}/health`, {
      validateStatus: () => true // Accept any status code
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status', 'ok');
  });

  test('Public Key endpoint returns PEM-formatted EC public key', async () => {
    // Skip test if running in CI environment without access to external servers
    if (process.env.CI) {
      return;
    }
    
    const response = await axios.get(fullPublicKeyUrl, {
      validateStatus: () => true // Accept any status code
    });
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/x-pem-file|text\/plain/);
    expect(isValidPemFormat(response.data)).toBe(true);
  });

  test('Public Key Server URL and paths are correctly configured in environment', () => {
    expect(publicKeyServerUrl).toBeTruthy();
    expect(publicKeyServerUrl).toContain('https://');
    expect(wellKnownPath).toBe('/.well-known/appspecific/com.tesla.3p.public-key.pem');
  });
}); 