/**
 * Tesla Fleet API Integration - Telemetry Server
 * 
 * This server provides a secure WebSocket endpoint for Tesla vehicles to stream telemetry data
 * and a separate endpoint for dashboard clients to receive this data.
 * 
 * Implements Tesla Fleet API telemetry requirements:
 * - Mutual TLS (mTLS) for vehicle connections
 * - Secure WebSocket endpoints for vehicles (/vehicle) and dashboards (/dashboard)
 * - Acknowledgment protocol for reliable delivery
 * - Authorization validation for dashboard clients
 * 
 * Reference: https://developer.tesla.com/docs/fleet-api/fleet-telemetry
 */

require('dotenv').config();

const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const WebSocket = require('ws');
const config = require('./config');
const teslaApi = require('./teslaApi');
const VehicleServer = require('./vehicleServer');
const DashboardServer = require('./dashboardServer');

// Check if we're in production environment (e.g., Fly.io deployment)
const isProduction = process.env.NODE_ENV === 'production';

// Validate required environment variables at startup
const requiredEnvVars = [
  'TLS_KEY_PATH',
  'TLS_CERT_PATH',
  'TLS_CA_PATH',
  'TELEMETRY_HOST'
];

// Add production-only required vars
if (isProduction) {
  requiredEnvVars.push('TESLA_VIN', 'TELEMETRY_SERVER_TOKEN');
}

// Create a mapping of environment variables to their descriptions for better error messages
const envVarDescriptions = {
  'TLS_KEY_PATH': 'Path to the TLS private key file',
  'TLS_CERT_PATH': 'Path to the TLS certificate file',
  'TLS_CA_PATH': 'Path to the TLS CA certificate file',
  'TELEMETRY_HOST': 'Hostname for the telemetry server',
  'TESLA_VIN': 'Tesla vehicle identification number',
  'TELEMETRY_SERVER_TOKEN': 'Fly.io authentication token for deployment'
};

// Check for missing environment variables
const missingVars = [];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    missingVars.push(`${envVar}: ${envVarDescriptions[envVar] || 'Required variable'}`);
  }
}

// Exit if any required variables are missing
if (missingVars.length > 0) {
  console.error('Missing required environment variables:');
  missingVars.forEach(variable => console.error(`- ${variable}`));
  process.exit(1);
}

// Validate TLS certificates at startup (fail-fast approach)
let tlsOptions;
try {
  console.log('Loading TLS certificates...');
  
  // Check for TLS certificates in environment variables (from Fly.io secrets)
  if (process.env.TLS_KEY && process.env.TLS_CERT && process.env.TLS_CA) {
    console.log('Using TLS certificates from environment variables');
    tlsOptions = {
      key: process.env.TLS_KEY,
      cert: process.env.TLS_CERT,
      ca: process.env.TLS_CA,
      requestCert: true,
      rejectUnauthorized: true
    };
    console.log('TLS certificates loaded successfully from environment variables');
  } else {
    // Fall back to certificate files if environment variables aren't available
    console.log('TLS certificates not found in environment variables, checking files');
    console.log('Looking for key file at: ' + config.TLS_PATHS.key);
    console.log('Looking for cert file at: ' + config.TLS_PATHS.cert);
    console.log('Looking for CA file at: ' + config.TLS_PATHS.ca);
    
    if (!fs.existsSync(config.TLS_PATHS.key)) {
      throw new Error(`TLS key file not found at ${config.TLS_PATHS.key}`);
    }
    
    if (!fs.existsSync(config.TLS_PATHS.cert)) {
      throw new Error(`TLS cert file not found at ${config.TLS_PATHS.cert}`);
    }
    
    if (!fs.existsSync(config.TLS_PATHS.ca)) {
      throw new Error(`TLS CA file not found at ${config.TLS_PATHS.ca}`);
    }
    
    tlsOptions = {
      key: fs.readFileSync(config.TLS_PATHS.key),
      cert: fs.readFileSync(config.TLS_PATHS.cert),
      ca: fs.readFileSync(config.TLS_PATHS.ca),
      requestCert: true,
      rejectUnauthorized: true
    };
    console.log('TLS certificates loaded successfully from files');
  }
} catch (error) {
  console.error('Error loading TLS certificates:', error);
  console.error('Please ensure all TLS certificates are available');
  process.exit(1);
}

// Create express app for HTTP endpoints
const app = express();

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    wellKnownPath: '/.well-known/appspecific/com.tesla.3p.public-key.pem',
    publicKeyAvailable: true,
    keyHash: "485bf2a9",
    tls: {
      key: !!tlsOptions.key,
      cert: !!tlsOptions.cert,
      ca: !!tlsOptions.ca,
      requestCert: tlsOptions.requestCert,
      rejectUnauthorized: tlsOptions.rejectUnauthorized
    },
    websocketEndpoints: {
      vehicle: "/vehicle",
      dashboard: "/dashboard"
    }
  };
  
  res.status(200).json(health);
});

// Create HTTPS server with mTLS
const server = https.createServer(tlsOptions, app);
const PORT = config.PORT || 443;

// Create WebSocket servers
const dashboardWss = DashboardServer(server);

// Process telemetry messages from vehicles and broadcast to dashboards
function broadcastTelemetry(telemetryData) {
  dashboardWss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(telemetryData));
    }
  });
}

// Start the vehicle server which will call broadcastTelemetry when data is received
VehicleServer(server, broadcastTelemetry);

// Start the server
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Telemetry server running on port ${PORT} with mTLS`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Only try to configure vehicle telemetry in production environment
  if (isProduction) {
    try {
      const vin = config.TESLA.VIN;
      
      // First get a partner token
      await teslaApi.getPartnerToken();
      
      // Then configure telemetry
      console.log(`Configuring telemetry for vehicle VIN: ${vin}`);
      const result = await teslaApi.configureVehicleTelemetry(vin);
      console.log('Vehicle telemetry configuration successful:');
      console.log(JSON.stringify(result, null, 2));
      
      // Start monitoring for telemetry errors
      monitorTelemetryErrors(vin);
    } catch (error) {
      console.error('Error configuring vehicle telemetry:', error.message);
      // Don't exit here - the vehicle might connect later
    }
  } else {
    console.log('Development mode: Skipping vehicle telemetry configuration');
  }
});

// Function to periodically monitor telemetry errors
async function monitorTelemetryErrors(vin) {
  try {
    const errors = await teslaApi.getVehicleTelemetryErrors(vin);
    if (errors && errors.length > 0) {
      console.error('Telemetry errors reported by vehicle:');
      console.error(JSON.stringify(errors, null, 2));
    } else {
      console.log('No telemetry errors reported by vehicle');
    }
  } catch (error) {
    console.error('Error checking telemetry errors:', error);
  }
  
  // Schedule next check in 5 minutes
  setTimeout(() => monitorTelemetryErrors(vin), 5 * 60 * 1000);
}

module.exports = server; 