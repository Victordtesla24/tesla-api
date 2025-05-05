/**
 * Tesla API client for interacting with the Tesla Fleet API
 * 
 * References:
 * - https://developer.tesla.com/docs/fleet-api
 * - https://developer.tesla.com/docs/fleet-api/fleet-telemetry
 * - https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens
 */

const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Create axios instance with base config
const teslaApiClient = axios.create({
  baseURL: config.TESLA.API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Tesla Fleet API Integration/1.0'
  }
});

// Configure TLS certificates if available
if (
  config.TLS_PATHS && 
  fs.existsSync(config.TLS_PATHS.key) && 
  fs.existsSync(config.TLS_PATHS.cert) && 
  fs.existsSync(config.TLS_PATHS.ca)
) {
  const httpsAgent = new https.Agent({
    cert: fs.readFileSync(config.TLS_PATHS.cert),
    key: fs.readFileSync(config.TLS_PATHS.key),
    ca: fs.existsSync(config.TLS_PATHS.ca) ? fs.readFileSync(config.TLS_PATHS.ca) : undefined,
    rejectUnauthorized: true  // Validate server certificate
  });
  
  teslaApiClient.defaults.httpsAgent = httpsAgent;
}

// Partner token cache
let cachedPartnerToken = null;
let partnerTokenExpiry = null;

/**
 * Get a partner token using client credentials flow
 * Will cache the token and refresh 60 seconds before expiry
 * 
 * @returns {Promise<string>} Partner token
 */
async function getPartnerToken() {
  // If token exists and is not close to expiration, reuse it
  const now = Date.now();
  if (cachedPartnerToken && partnerTokenExpiry && now < partnerTokenExpiry) {
    console.log('Using cached partner token.');
    return cachedPartnerToken;
  }

  // Required parameters check - fail fast
  if (!config.TESLA.CLIENT_ID || !config.TESLA.CLIENT_SECRET) {
    throw new Error('Missing required TESLA_CLIENT_ID or TESLA_CLIENT_SECRET');
  }
  
  if (!config.TESLA.TOKEN_URL) {
    throw new Error('Missing required TESLA_TOKEN_URL');
  }

  // Prepare the request for client credentials flow
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', config.TESLA.CLIENT_ID);
  params.append('client_secret', config.TESLA.CLIENT_SECRET);
  
  // Add audience if configured (required for Fleet API)
  if (config.TESLA.API_BASE_URL) {
    params.append('audience', config.TESLA.API_BASE_URL);
  }
  
  // Add scopes for vehicle data and commands
  const scopes = 'vehicle_device_data vehicle_cmds vehicle_location';
  params.append('scope', scopes);

  try {
    const response = await axios.post(config.TESLA.TOKEN_URL, params, {
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.data.access_token) {
      throw new Error('No access token in response');
    }

    cachedPartnerToken = response.data.access_token;
    
    // Set expiry 60 seconds before actual expiry for safety
    const expiresIn = response.data.expires_in || 3600; // default 1 hour
    partnerTokenExpiry = now + (expiresIn - 60) * 1000;
    
    console.log('Successfully fetched and cached partner token.');
    return cachedPartnerToken;
  } catch (error) {
    console.error('FATAL ERROR: Failed to fetch partner token from Tesla.');
    if (axios.isAxiosError(error)) {
      console.error(`Status: ${error.response?.status}`);
      console.error(`Data: ${JSON.stringify(error.response?.data)}`);
    } else {
      console.error(error.message);
    }
    throw new Error('Could not obtain Tesla Partner Token.'); // Re-throw for configureVehicles to catch
  }
}

/**
 * Get a list of vehicles linked to the account
 * @returns {Promise<Array>} A list of vehicles
 */
async function getVehicles() {
  try {
    const accessToken = await getPartnerToken();
    
    const response = await teslaApiClient.get('/api/1/vehicles', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return response.data.response;
  } catch (error) {
    console.error('Error fetching vehicles:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get vehicle data for a specific vehicle
 * @param {string} vin - Vehicle VIN
 * @returns {Promise<Object>} Vehicle data
 */
async function getVehicleData(vin) {
  try {
    const accessToken = await getPartnerToken();
    
    // First, get the id for the VIN
    const vehicles = await getVehicles();
    const vehicle = vehicles.find(v => v.vin === vin);
    
    if (!vehicle) {
      throw new Error(`Vehicle with VIN ${vin} not found`);
    }
    
    const vehicleId = vehicle.id;
    
    // Then get the data using the id
    const response = await teslaApiClient.get(`/api/1/vehicles/${vehicleId}/vehicle_data`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return response.data.response;
  } catch (error) {
    console.error(`Error fetching data for vehicle ${vin}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Configure a vehicle to stream telemetry to the telemetry server
 * 
 * @param {string} vin - Vehicle VIN
 * @returns {Promise<Object>} Configuration result
 * 
 * Reference: https://developer.tesla.com/docs/fleet-api/fleet-telemetry#configuring-a-vehicle
 * Reference: https://developer.tesla.com/docs/fleet-api/endpoints/vehicle-endpoints#fleet_telemetry_config
 */
async function configureVehicleTelemetry(vin) {
  try {
    // Verify we have the required configuration
    if (!config.TELEMETRY_HOST) {
      throw new Error('TELEMETRY_HOST is required to configure vehicle telemetry');
    }
    
    // Get an access token with the required vehicle_device_data scope
    const accessToken = await getPartnerToken();
    
    // Load the CA certificate chain for the "ca" field
    let caChain;
    try {
      // Check if certificate is provided in environment variable
      if (process.env.TLS_CA) {
        console.log('Using CA certificate from environment variable');
        caChain = process.env.TLS_CA;
      } else {
        // We need to use the full CA certificate chain, not just the server cert
        if (!fs.existsSync(config.TLS_PATHS.ca)) {
          throw new Error(`CA certificate not found at ${config.TLS_PATHS.ca}`);
        }
        caChain = fs.readFileSync(config.TLS_PATHS.ca, 'utf8');
        console.log(`Loaded CA certificate chain from ${config.TLS_PATHS.ca}`);
      }
    } catch (err) {
      console.error('Error reading CA certificate chain:', err);
      throw err;
    }
    
    // Extract hostname from TELEMETRY_HOST to ensure it's just the hostname part
    const hostname = new URL(config.TELEMETRY_HOST).hostname;
    
    // Prepare the configuration request per Tesla docs
    // https://developer.tesla.com/docs/fleet-api/endpoints/vehicle-endpoints#fleet_telemetry_config
    const telemetryConfig = {
      vins: [vin],
      config: {
        hostname: hostname,
        port: config.PORT || 443,
        ca: caChain,
        fields: config.TELEMETRY_FIELDS || {
          VehicleSpeed: { interval_seconds: 10 },
          Location: { interval_seconds: 10 },
          Soc: { interval_seconds: 60 },
          PowerState: { interval_seconds: 60 },
          ShiftState: { interval_seconds: 10 }
        }
      }
    };
    
    console.log(`Configuring vehicle ${vin} to stream telemetry to ${hostname}:${config.PORT || 443}`);
    console.log(`Using telemetry fields:`, JSON.stringify(telemetryConfig.config.fields, null, 2));
    
    // Send the configuration request
    const response = await teslaApiClient.post('/api/1/vehicles/fleet_telemetry_config', telemetryConfig, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error configuring telemetry for vehicle ${vin}:`, 
      error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get telemetry errors for a vehicle
 * 
 * @param {string} vin - Vehicle VIN
 * @returns {Promise<Array>} List of telemetry errors
 * 
 * Reference: https://developer.tesla.com/docs/fleet-api/fleet-telemetry#telemetry-errors
 */
async function getVehicleTelemetryErrors(vin) {
  try {
    const accessToken = await getPartnerToken();
    
    const response = await teslaApiClient.get(`/api/1/vehicles/${vin}/fleet_telemetry_errors`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return response.data.response;
  } catch (error) {
    console.error(`Error fetching telemetry errors for vehicle ${vin}:`, 
      error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get the current telemetry configuration status for a vehicle
 * 
 * @param {string} vin - Vehicle VIN
 * @returns {Promise<Object>} Telemetry configuration status
 * 
 * Reference: https://developer.tesla.com/docs/fleet-api/endpoints/vehicle-endpoints#get_fleet_telemetry_config
 */
async function getVehicleTelemetryConfigStatus(vin) {
  try {
    const accessToken = await getPartnerToken();
    
    // Construct the correct URL based on Tesla documentation for GET requests with VIN
    const response = await teslaApiClient.get(`/api/1/vehicles/${vin}/fleet_telemetry_config`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return response.data.response; // Assuming the relevant data is in response.data.response
  } catch (error) {
    console.error(`Error fetching telemetry config status for vehicle ${vin}:`, 
      error.response?.data || error.message);
    throw error;
  }
}

/**
 * Register partner account
 * 
 * @returns {Promise<Object>} Registration result
 * 
 * Reference: https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints#partner_accounts
 */
async function registerPartnerAccount() {
  try {
    const accessToken = await getPartnerToken();
    
    if (!config.PUBLIC_KEY_SERVER_URL) {
      throw new Error('PUBLIC_KEY_SERVER_URL is required to register partner account');
    }
    
    // Parse the domain from the server URL
    const url = new URL(config.PUBLIC_KEY_SERVER_URL);
    const domain = url.hostname;
    
    const response = await teslaApiClient.post('/api/1/partner_accounts', {
      domain: domain
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error registering partner account:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Check the health of the Tesla API connection
 * 
 * @returns {Promise<Object>} Health check result
 */
async function checkApiHealth() {
  try {
    // Try to get a token to check if auth is working
    await getPartnerToken();
    
    // Try to get vehicles list to check basic API access
    await getVehicles();
    
    return {
      status: 'ok',
      message: 'Tesla API connection is healthy',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Tesla API connection error: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  getPartnerToken,
  getVehicles,
  getVehicleData,
  configureVehicleTelemetry,
  getVehicleTelemetryErrors,
  getVehicleTelemetryConfigStatus,
  registerPartnerAccount,
  checkApiHealth
}; 