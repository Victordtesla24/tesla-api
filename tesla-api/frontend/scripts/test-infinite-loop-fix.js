#!/usr/bin/env node

/**
 * Test script for verifying the infinite loop fix in the Tesla OAuth callback
 * 
 * This script tests whether the Tesla callback route correctly handles POST requests
 * by simulating NextAuth's behavior during the authentication flow.
 */

const http = require('http');
const https = require('https');
const querystring = require('querystring');

// Configuration
const CONFIG = {
  // Test both local and remote environments if needed
  baseUrls: [
    'http://localhost:3000',
  ],
  // Test paths
  paths: {
    teslaCallback: '/api/auth/callback/tesla',
    nextauthCallback: '/api/auth/callback/tesla'
  },
  // Test with various HTTP methods
  methods: ['GET', 'POST'],
  // Number of requests to make to each endpoint
  requestsPerEndpoint: 5
};

/**
 * Make an HTTP request with specified parameters
 */
const makeRequest = (url, method, data = null) => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'User-Agent': 'Tesla-OAuth-Test/1.0',
        'Accept': 'application/json'
      }
    };
    
    // Add content-type header if sending data
    if (data) {
      options.headers['Content-Type'] = 'application/json';
    }
    
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData,
          url: url,
          method: method
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
};

/**
 * Run the test suite
 */
const runTests = async () => {
  console.log('🧪 Starting Tesla OAuth Callback Infinite Loop Fix Test');
  console.log('------------------------------------------------------');
  
  for (const baseUrl of CONFIG.baseUrls) {
    console.log(`\n🔍 Testing environment: ${baseUrl}`);
    
    // Test the Tesla callback route with GET and POST
    for (const method of CONFIG.methods) {
      const url = `${baseUrl}${CONFIG.paths.teslaCallback}?code=test_code&state=test_state`;
      console.log(`\n🔹 Testing ${method} ${url}`);
      
      // Make multiple requests to verify consistent behavior
      for (let i = 0; i < CONFIG.requestsPerEndpoint; i++) {
        try {
          console.log(`  Request #${i+1}...`);
          const response = await makeRequest(url, method);
          
          console.log(`  Response: ${response.statusCode} ${method === 'POST' ? '(should be 404 for POST)' : ''}`);
          
          // For POST, we expect a 404 to let NextAuth handle it
          if (method === 'POST' && response.statusCode !== 404) {
            console.error(`  ❌ ERROR: Expected 404 for POST, got ${response.statusCode}`);
          } else if (method === 'POST' && response.statusCode === 404) {
            console.log('  ✅ PASS: Received correct 404 status for POST');
          }
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`  ❌ Request failed: ${error.message}`);
        }
      }
    }
  }
  
  console.log('\n------------------------------------------------------');
  console.log('🏁 Test completed!');
};

// Run the tests
runTests().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
}); 