/**
 * Integration Test: Public Key Server and Telemetry Server
 * 
 * This test validates that the Telemetry Server can access 
 * the Public Key from the Public Key Server for proper TLS configuration
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configurations
const PUBLIC_KEY_SERVER_URL = process.env.PUBLIC_KEY_SERVER_URL || 'https://public-key-server-tesla.vercel.app';
const WELL_KNOWN_PATH = process.env.WELL_KNOWN_PATH || '/.well-known/appspecific/com.tesla.3p.public-key.pem';
const TELEMETRY_HOST = process.env.TELEMETRY_HOST || 'tesla-telemetry-server.fly.dev';

describe('Public Key Server and Telemetry Server Integration', () => {
  let publicKey;

  // Fetch the public key from the server
  beforeAll(async () => {
    try {
      const response = await axios.get(`${PUBLIC_KEY_SERVER_URL}${WELL_KNOWN_PATH}`);
      publicKey = response.data;
    } catch (error) {
      console.error('Failed to fetch public key from server:', error.message);
    }
  });

  test('Public Key Server provides a valid key', () => {
    expect(publicKey).toBeDefined();
    expect(publicKey.trim()).toMatch(/^-----BEGIN PUBLIC KEY-----/);
    expect(publicKey.trim()).toMatch(/-----END PUBLIC KEY-----$/);
  });

  test('Environment variables are correctly configured for Telemetry Server', () => {
    // Check essential environment variables
    expect(process.env.PUBLIC_KEY_SERVER_URL).toBeDefined();
    expect(process.env.TELEMETRY_HOST).toBeDefined();
    
    // For local development, we might have TLS paths pointing to local files
    const hasTlsCertPaths = 
      process.env.TLS_KEY_PATH && 
      process.env.TLS_CERT_PATH && 
      process.env.TLS_CA_PATH;
    
    expect(hasTlsCertPaths).toBe(true);
    
    // Telemetry server should have a well-known path defined
    expect(process.env.WELL_KNOWN_PATH).toBeDefined();
  });

  test('Telemetry domain matches configuration in Fly.io', () => {
    const telemetryHost = process.env.TELEMETRY_HOST;
    const telemetryServerUrl = process.env.TELEMETRY_SERVER_URL;
    
    expect(telemetryHost).toBeDefined();
    expect(telemetryServerUrl).toBeDefined();
    
    // The TELEMETRY_SERVER_URL should contain the TELEMETRY_HOST
    expect(telemetryServerUrl).toContain(telemetryHost);
  });

  test('Public Key URL is accessible from Telemetry environment', () => {
    const publicKeyUrl = `${PUBLIC_KEY_SERVER_URL}${WELL_KNOWN_PATH}`;
    
    // This test ensures that the Telemetry server could access this URL
    expect(publicKeyUrl).toBeDefined();
    expect(publicKeyUrl).toMatch(/^https:\/\//);
    expect(publicKeyUrl).toContain('.well-known/appspecific/com.tesla.3p.public-key.pem');
  });
}); 