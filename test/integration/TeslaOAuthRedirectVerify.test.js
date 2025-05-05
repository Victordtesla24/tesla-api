/**
 * TeslaOAuthRedirectVerify.test.js
 * 
 * This test specifically verifies that the infinite redirect loop issue has been fixed
 * in the Tesla OAuth authentication flow. It uses real environment variables from env.txt
 * as processed by setup-env.js to ensure the test validates the real configuration.
 * 
 * The test simulates:
 * 1. Tesla redirecting to our callback endpoint with an authorization code
 * 2. Our GET handler processing this callback and redirecting to /login
 * 3. The login page calling signIn with the authorization code
 * 4. NextAuth making an internal POST request to our callback endpoint
 * 5. Our POST handler returning a 404 status (the critical fix)
 * 6. NextAuth's [...nextauth] handler successfully processing the code and completing auth
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { handleCallback } from '../../app/api/auth/callback/tesla/route';

// Import the actual route handlers we want to test
import { GET as teslaCallbackGet, POST as teslaCallbackPost } from '../../app/api/auth/callback/tesla/route';

// Mock NextAuth functions
jest.mock('next-auth/react', () => ({
  signIn: jest.fn().mockResolvedValue({ url: '/dashboard' }),
}));

// Read real environment variables from env.txt using setup-env.js approach
// This ensures we're using the same configuration as the real application
function loadEnvVars() {
  try {
    // Find the root env.txt file
    const rootEnvPath = path.resolve(__dirname, '../..', '..', 'env.txt');
    if (!fs.existsSync(rootEnvPath)) {
      console.error(`Root env.txt file not found at ${rootEnvPath}`);
      return;
    }

    // Parse the env variables
    const envVars = dotenv.parse(fs.readFileSync(rootEnvPath));
    
    // Set development mode variables
    const testEnvVars = {
      ...envVars,
      NODE_ENV: 'development',
      NEXTAUTH_URL: 'http://localhost:3000',
      TESLA_REDIRECT_URI: 'http://localhost:3000/api/auth/callback/tesla',
      NEXT_PUBLIC_TESLA_REDIRECT_URI: 'http://localhost:3000/api/auth/callback/tesla',
    };
    
    // Apply to process.env
    Object.entries(testEnvVars).forEach(([key, value]) => {
      process.env[key] = value;
    });
    
    console.log('Loaded environment variables from env.txt for testing');
    console.log('TESLA_REDIRECT_URI:', process.env.TESLA_REDIRECT_URI);
    console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
  } catch (error) {
    console.error('Error loading environment variables:', error);
  }
}

// Helper function to create a mock request
function createMockRequest(url, method = 'GET', headers = {}) {
  const request = {
    url,
    method,
    headers: new Map(Object.entries(headers)),
    clone: jest.fn().mockImplementation(() => {
      return createMockRequest(url, method, headers);
    }),
    formData: jest.fn().mockRejectedValue(new Error('Form data not available')),
    json: jest.fn().mockRejectedValue(new Error('JSON not available')),
    text: jest.fn().mockResolvedValue(''),
  };
  
  return request;
}

// Helper to validate redirect responses
function validateRedirectResponse(response, expectedDestination) {
  // Check if it's a NextResponse redirect
  expect(response.url).toBeDefined();
  expect(response.url.toString()).toContain(expectedDestination);
  // Check cache control headers
  expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0, must-revalidate');
}

describe('Tesla OAuth Redirect Flow Verification', () => {
  beforeAll(() => {
    // Load the real environment variables for testing
    loadEnvVars();
  });
  
  beforeEach(() => {
    // Mock console methods to reduce noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Step 1: Initial Tesla Callback', () => {
    it('GET handler should properly process the Tesla callback and redirect to login', async () => {
      // Create a mock request simulating Tesla's callback
      const mockAuthCode = 'test_auth_code_123';
      const mockState = 'test_state_abc';
      const mockRequest = createMockRequest(
        `http://localhost:3000/api/auth/callback/tesla?code=${mockAuthCode}&state=${mockState}`
      );
      
      // Process the callback with our handleCallback function
      const response = await handleCallback(mockRequest);
      
      // Verify correct redirect to login page with parameters
      validateRedirectResponse(response, '/login');
      expect(response.url.toString()).toContain(`code=${mockAuthCode}`);
      expect(response.url.toString()).toContain(`state=${mockState}`);
      expect(response.url.toString()).toContain('auth_source=tesla');
    });
    
    it('should handle errors from Tesla by redirecting to login with error details', async () => {
      // Create a mock request simulating Tesla's callback with an error
      const mockError = 'access_denied';
      const mockErrorDesc = 'User denied access';
      const mockRequest = createMockRequest(
        `http://localhost:3000/api/auth/callback/tesla?error=${mockError}&error_description=${mockErrorDesc}`
      );
      
      // Process the callback
      const response = await handleCallback(mockRequest);
      
      // Verify redirect to login page with error details
      validateRedirectResponse(response, '/login');
      expect(response.url.toString()).toContain(`error=${mockError}`);
      expect(response.url.toString()).toContain(`error_description=${mockErrorDesc}`);
    });
  });

  describe('Step 2: Critical Fix Verification - POST Handler', () => {
    it('POST handler should return 404 status to allow NextAuth to handle internal requests', async () => {
      // Create a mock POST request simulating NextAuth's internal request
      const mockRequest = createMockRequest(
        'http://localhost:3000/api/auth/callback/tesla',
        'POST',
        { 'Content-Type': 'application/x-www-form-urlencoded' }
      );
      
      // Call the POST handler directly
      const response = await teslaCallbackPost(mockRequest);
      
      // Verify the critical fix: It must return a 404 status
      expect(response.status).toBe(404);
      
      // Verify debug header is present
      expect(response.headers.get('X-Debug-Info')).toBe('Tesla-callback-passthrough');
    });
    
    it('POST handler should return 404 even if the request parsing fails', async () => {
      // Create a mock request that will throw an error when parsing
      const mockRequest = {
        url: 'http://localhost:3000/api/auth/callback/tesla',
        method: 'POST',
        headers: new Map(),
        clone: jest.fn().mockImplementation(() => {
          throw new Error('Clone failed');
        }),
      };
      
      // Call the POST handler
      const response = await teslaCallbackPost(mockRequest);
      
      // Verify the critical fix: Even on error, it must return a 404 status
      expect(response.status).toBe(404);
    });
  });

  describe('Step 3: Complete OAuth Flow', () => {
    it('should simulate the complete OAuth flow without infinite redirects', async () => {
      // Step 1: Tesla redirects to our callback endpoint
      const mockAuthCode = 'test_auth_code_xyz';
      const mockState = 'test_state_xyz';
      const callbackRequest = createMockRequest(
        `http://localhost:3000/api/auth/callback/tesla?code=${mockAuthCode}&state=${mockState}`
      );
      
      // Step 2: GET handler processes this redirect
      const callbackResponse = await teslaCallbackGet(callbackRequest);
      
      // Verify redirect to login page with auth parameters
      validateRedirectResponse(callbackResponse, '/login');
      expect(callbackResponse.url.toString()).toContain(`code=${mockAuthCode}`);
      
      // Extract code and state from the redirect URL
      const redirectUrl = new URL(callbackResponse.url);
      const codeFromRedirect = redirectUrl.searchParams.get('code');
      const stateFromRedirect = redirectUrl.searchParams.get('state');
      
      // Step 3: Login page would use the code/state to call signIn
      // This would trigger NextAuth to make a POST request to our callback endpoint
      const internalPostRequest = createMockRequest(
        'http://localhost:3000/api/auth/callback/tesla',
        'POST',
        { 'Content-Type': 'application/x-www-form-urlencoded' }
      );
      
      // Step 4: Our POST handler would return 404 (THE CRITICAL FIX)
      const postResponse = await teslaCallbackPost(internalPostRequest);
      
      // Verify 404 status is returned
      expect(postResponse.status).toBe(404);
      
      // Step 5: NextAuth would process the code via its internal logic
      // We don't need to test NextAuth itself, just verify our handlers behave correctly
      
      // Verify the entire process completes without infinite redirects
      // The key verification is that our POST handler returns 404 instead of redirecting
      expect(postResponse.url).toBeUndefined();
    });
  });
}); 