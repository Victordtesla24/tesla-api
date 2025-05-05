/**
 * Tesla Fleet API Integration - Configure Vehicle Telemetry
 * 
 * This script configures a Tesla vehicle to stream telemetry data
 * to our telemetry server. It must be run after the telemetry server
 * is deployed and accessible.
 */

require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Function to get a partner token
async function getPartnerToken() {
  try {
    const tokenUrl = process.env.TESLA_TOKEN_URL;
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.TESLA_CLIENT_ID);
    params.append('client_secret', process.env.TESLA_CLIENT_SECRET);
    
    console.log('Requesting partner token...');
    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting partner token:', error.response?.data || error.message);
    throw new Error('Failed to obtain partner token');
  }
}

// Function to configure vehicle telemetry
async function configureVehicleTelemetry(vin) {
  try {
    const token = await getPartnerToken();
    const apiBaseUrl = process.env.TESLA_API_BASE_URL;
    
    // Get the server certificate for the telemetry server
    const certPath = process.env.TLS_CERT_PATH;
    let certContent = '';
    
    if (fs.existsSync(certPath)) {
      console.log(`Reading certificate from ${certPath}`);
      certContent = fs.readFileSync(certPath, 'utf8');
    } else {
      throw new Error(`Server certificate not found at ${certPath}`);
    }
    
    // Parse the hostname from the TELEMETRY_HOST URL
    const telemetryUrl = new URL(process.env.TELEMETRY_HOST);
    const hostname = telemetryUrl.hostname;
    
    // Default telemetry field configuration
    const telemetryFields = {
      VehicleSpeed: { interval_seconds: 10 },
      Location: { interval_seconds: 10 },
      Soc: { interval_seconds: 60 },
      PowerState: { interval_seconds: 60 },
      ShiftState: { interval_seconds: 10 }
    };
    
    const payload = {
      vins: [vin],
      config: {
        hostname,
        port: 443, // Always use 443 for production
        ca: certContent,
        fields: telemetryFields
      }
    };
    
    console.log(`Configuring telemetry for vehicle ${vin} to stream to ${hostname}:443`);
    const response = await axios.post(
      `${apiBaseUrl}/api/1/vehicles/fleet_telemetry_config`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Telemetry configuration successful!');
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error('Error configuring vehicle telemetry:', error.response?.data || error.message);
    throw new Error('Failed to configure vehicle telemetry');
  }
}

// Function to verify telemetry configuration
async function verifyTelemetryConfiguration(vin) {
  try {
    const token = await getPartnerToken();
    const apiBaseUrl = process.env.TESLA_API_BASE_URL;
    
    console.log(`Verifying telemetry configuration for vehicle: ${vin}`);
    const response = await axios.get(
      `${apiBaseUrl}/api/1/vehicles/${vin}/fleet_telemetry_config`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (response.data.synced) {
      console.log('Vehicle telemetry configuration is synced successfully!');
    } else {
      console.log('Vehicle telemetry configuration is not yet synced. This may take some time.');
    }
    
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error('Error verifying telemetry configuration:', error.response?.data || error.message);
    throw new Error('Failed to verify telemetry configuration');
  }
}

// Execute configuration process
async function main() {
  try {
    const vin = process.env.TESLA_VIN;
    
    if (!vin) {
      throw new Error('TESLA_VIN environment variable not found');
    }
    
    console.log('Starting Tesla vehicle telemetry configuration process...');
    await configureVehicleTelemetry(vin);
    await verifyTelemetryConfiguration(vin);
    console.log('Configuration process completed!');
    console.log(`Vehicle ${vin} is now configured to stream telemetry data to ${process.env.TELEMETRY_HOST}`);
  } catch (error) {
    console.error('Configuration process failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main(); 