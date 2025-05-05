/**
 * Tesla Fleet API Integration - Authentication Module
 * 
 * Handles authentication for dashboard connections.
 * Validates dashboard tokens using Tesla OAuth with vehicle_device_data scope.
 * 
 * Reference: https://developer.tesla.com/docs/fleet-api/fleet-telemetry
 */

const axios = require('axios');
const config = require('./config');
const jwt = require('jsonwebtoken');

/**
 * Validate a dashboard token by comparing it with TELEMETRY_SERVER_TOKEN
 * 
 * @param {string} token The token to validate
 * @returns {boolean} True if the token is valid, false otherwise
 */
function validateDashboardToken(token) {
  // No token provided
  if (!token) {
    return false;
  }
  
  // Check if it's a static token (direct comparison)
  return token === config.TELEMETRY_SERVER_TOKEN;
}

/**
 * Validate a Tesla OAuth token by making a vehicles API request
 * This endpoint requires the vehicle_device_data scope, so if the
 * request succeeds, the token has the required permissions.
 * 
 * @param {string} token The OAuth token to validate
 * @returns {Promise<boolean>} Promise that resolves to true if the token is valid
 */
async function validateTeslaOAuthToken(token) {
  if (!token) {
    console.error('No token provided for validation');
    return false;
  }

  try {
    // Make sure we have the API base URL
    if (!config.TESLA.API_BASE_URL) {
      throw new Error('TESLA_API_BASE_URL is required for token validation');
    }
    
    // Use the token to make a request to the vehicles endpoint
    // This endpoint requires the vehicle_device_data scope
    // If the request succeeds, the token is valid with the correct scope
    console.log('Validating Tesla OAuth token by making a vehicles request');
    const response = await axios.get(`${config.TESLA.API_BASE_URL}/api/1/vehicles`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // If we get here, the token is valid and has the required scope
    console.log('Tesla OAuth token validation successful');
    return response.status === 200;
  } catch (error) {
    console.error('Token validation error:', error.message);
    
    // Log specific error details if available
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', JSON.stringify(error.response.data, null, 2));
    }
    
    return false;
  }
}

/**
 * Verifies the JWT token provided by a dashboard client.
 * @param {string} token - The JWT token string.
 * @returns {object|null} The decoded payload if the token is valid, otherwise null.
 */
function verifyDashboardToken(token) {
    if (!token) {
        console.warn('Dashboard Auth: No token provided.');
        return null;
    }
    if (!config.jwtSecret) {
        // This should have been caught by config validation, but double-check
        console.error('FATAL INTERNAL ERROR: JWT_SECRET is not configured on the server.');
        return null;
    }

    try {
        // Verify the token using the secret from config
        const decoded = jwt.verify(token, config.jwtSecret);
        // Optional: Add further checks here, e.g., check issuer (iss), audience (aud)
        // if (decoded.iss !== 'expected_issuer') return null;
        console.log('Dashboard Auth: Token verified successfully for:', decoded.sub || 'N/A');
        return decoded; // Return payload on success
    } catch (err) {
        console.warn(`Dashboard Auth: Token verification failed. Reason: ${err.message}`);
        return null; // Indicate verification failure
    }
}

module.exports = {
  validateDashboardToken,
  validateTeslaOAuthToken,
  verifyDashboardToken
}; 