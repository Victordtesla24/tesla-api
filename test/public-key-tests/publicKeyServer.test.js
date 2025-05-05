/**
 * Test for the Public Key Server
 * This test verifies the Public Key Server is correctly deployed and the public key is accessible
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configurations from .env file
const PUBLIC_KEY_SERVER_URL = process.env.PUBLIC_KEY_SERVER_URL || 'https://public-key-server-tesla.vercel.app';
const WELL_KNOWN_PATH = process.env.WELL_KNOWN_PATH || '/.well-known/appspecific/com.tesla.3p.public-key.pem';

describe('Public Key Server', () => {
    // Read the local public key file for comparison
    let localPublicKey;
    beforeAll(() => {
        try {
            const publicKeyPath = path.resolve(process.cwd(), '.well-known/appspecific/com.tesla.3p.public-key.pem');
            localPublicKey = fs.readFileSync(publicKeyPath, 'utf8').trim();
        } catch (error) {
            console.error('Failed to read local public key:', error);
        }
    });

    test('Public Key Server is accessible', async () => {
        const healthUrl = `${PUBLIC_KEY_SERVER_URL}/health`;
        
        try {
            const response = await axios.get(healthUrl);
            expect(response.status).toBe(200);
            expect(response.data.status).toBe('ok');
            expect(response.data.publicKeyServer.running).toBe(true);
        } catch (error) {
            // Enhance error message with details
            const errorDetails = error.response ? 
                `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : 
                error.message;
            
            throw new Error(`Failed to access Public Key Server health endpoint: ${errorDetails}`);
        }
    });

    test('Public key is accessible at the correct path', async () => {
        const publicKeyUrl = `${PUBLIC_KEY_SERVER_URL}${WELL_KNOWN_PATH}`;
        
        try {
            const response = await axios.get(publicKeyUrl);
            expect(response.status).toBe(200);
            
            // Verify content type
            expect(response.headers['content-type']).toMatch(/application\/x-pem-file/);
            
            // Verify key content format
            const remoteKey = response.data.trim();
            expect(remoteKey).toMatch(/^-----BEGIN PUBLIC KEY-----/);
            expect(remoteKey).toMatch(/-----END PUBLIC KEY-----$/);
            
            // Compare with local key if available
            if (localPublicKey) {
                expect(remoteKey).toBe(localPublicKey);
            }
        } catch (error) {
            const errorDetails = error.response ? 
                `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : 
                error.message;
                
            throw new Error(`Failed to access public key at ${publicKeyUrl}: ${errorDetails}`);
        }
    });
}); 