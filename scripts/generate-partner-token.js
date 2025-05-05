/**
 * Tesla Fleet API - Generate Partner Token
 * 
 * This script requests a Tesla Partner Token using the client credentials flow.
 * The token is used for configuring telemetry and registering the public key.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../env.txt') });
const axios = require('axios');

async function generatePartnerToken() {
  try {
    // Check if required environment variables are present
    const clientId = process.env.TESLA_CLIENT_ID;
    const clientSecret = process.env.TESLA_CLIENT_SECRET;
    const tokenUrl = process.env.TESLA_TOKEN_URL;
    const audience = process.env.TESLA_AUDIENCE;

    if (!clientId || !clientSecret || !tokenUrl || !audience) {
      console.error('Missing required environment variables:');
      if (!clientId) console.error('- TESLA_CLIENT_ID');
      if (!clientSecret) console.error('- TESLA_CLIENT_SECRET');
      if (!tokenUrl) console.error('- TESLA_TOKEN_URL');
      if (!audience) console.error('- TESLA_AUDIENCE');
      process.exit(1);
    }

    // Prepare request payload
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('audience', audience);

    console.log('Requesting Tesla Partner Token...');
    
    // Make the request
    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Extract and display the token
    const { access_token, token_type, expires_in } = response.data;
    console.log('\nToken successfully generated!');
    console.log('----------------------------');
    console.log(`Token Type: ${token_type}`);
    console.log(`Expires In: ${expires_in} seconds`);
    console.log('\nTESLA_PARTNER_TOKEN:');
    console.log(access_token);
    console.log('\nAdd this to your .env file as:');
    console.log(`TESLA_PARTNER_TOKEN="${access_token}"`);

    return access_token;
  } catch (error) {
    console.error('Error generating partner token:');
    if (error.response) {
      console.error('Server responded with error:');
      console.error(`Status: ${error.response.status}`);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received from server');
    } else {
      console.error('Error configuring request:', error.message);
    }
    process.exit(1);
  }
}

// Run the token generation
generatePartnerToken(); 