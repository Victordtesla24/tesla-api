/**
 * Tesla Fleet API Integration - Main Entry Point
 * 
 * This file initializes the appropriate server based on the SERVER_TYPE environment variable:
 * - telemetry: WebSocket server for vehicle telemetry
 * - publickey: Public key server for Tesla virtual key pairing
 * 
 * Reference: https://developer.tesla.com/docs/fleet-api
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const https = require('https');
const WebSocket = require('ws'); // Added for broadcastTelemetry
const config = require('./config'); // Loads and validates config
const VehicleServer = require('./vehicleServer');
const DashboardServer = require('./dashboardServer');
const teslaApi = require('./teslaApi');

// Determine which server to start based on environment or arguments
const serverType = process.env.SERVER_TYPE || 'publickey';

// Print environment variables for debugging
if (serverType.toLowerCase() === 'telemetry') {
  console.log('Environment variables for telemetry server:');
  console.log('TLS_KEY is set:', !!process.env.TLS_KEY);
  console.log('TLS_CERT is set:', !!process.env.TLS_CERT);
  console.log('TLS_CA is set:', !!process.env.TLS_CA);
  console.log('PUBLIC_KEY is set:', !!process.env.PUBLIC_KEY);
  console.log('TLS_KEY_PATH:', process.env.TLS_KEY_PATH);
  console.log('TLS_CERT_PATH:', process.env.TLS_CERT_PATH);
  console.log('TLS_CA_PATH:', process.env.TLS_CA_PATH);
}

// Load server based on type
try {
  switch (serverType.toLowerCase()) {
    case 'telemetry':
      initializeTelemetryServer();
      break;
    case 'publickey':
      initializePublicKeyServer();
      break;
    default:
      console.error(`[index.js] Unknown server type: ${serverType}`);
      console.error('[index.js] Valid types are: telemetry, publickey');
      process.exit(1);
  }
} catch (error) {
  console.error(`[index.js] Critical error during server initialization for type ${serverType}:`, error);
  process.exit(1);
}

/**
 * Initialize the telemetry server with WebSocket endpoints
 * This server handles real-time telemetry data from Tesla vehicles
 */
function initializeTelemetryServer() {
  console.log('Starting Tesla Fleet Telemetry Server...');

  // --- Load TLS Certificates (Fail Fast) ---
  let serverKey, serverCert, caCert;
  try {
    console.log(`Loading TLS Key from: ${config.tlsKeyPath}`);
    serverKey = fs.readFileSync(config.tlsKeyPath);
    console.log(`Loading TLS Cert from: ${config.tlsCertPath}`);
    serverCert = fs.readFileSync(config.tlsCertPath);
    console.log(`Loading TLS CA from: ${config.tlsCaPath}`);
    caCert = fs.readFileSync(config.tlsCaPath);
    console.log('TLS certificates loaded successfully.');
  } catch (err) {
    console.error('FATAL ERROR: Failed to load one or more TLS certificate files.');
    console.error(`Please check paths in .env (TLS_KEY_PATH, TLS_CERT_PATH, TLS_CA_PATH) and file permissions.`);
    console.error(err.message);
    process.exit(1); // Cannot start server without certs
  }

  // --- Create HTTPS Server with mTLS --- 
  // "Tesla mandates mutually authenticated TLS for the vehicle<->server link."
  // "the server should terminate that TLS connection with requestCert: true and verify the vehicle's cert."
  // Reference: docs/02_telemetry_server.md based on Tesla requirements
  const httpsServerOptions = {
    key: serverKey,
    cert: serverCert,
    ca: caCert, // CA bundle to verify client certificates from vehicles
    requestCert: true, // Request a certificate from the connecting client (vehicle)
    rejectUnauthorized: true // Reject clients whose certs are not signed by a CA in `caCert` or are otherwise invalid
  };
  const httpsServer = https.createServer(httpsServerOptions);

  // --- WebSocket Server Setup ---
  const wssDashboard = DashboardServer(httpsServer);
  const wssVehicle = VehicleServer(httpsServer, (telemetryData, vehicleIdentifier) => {
    // Broadcast incoming telemetry to all connected and authorized dashboard clients
    console.log(`Broadcasting telemetry from ${vehicleIdentifier} to ${wssDashboard.clients.size} dashboard clients.`);
    const messageString = JSON.stringify({
      type: 'telemetry',
      vin: vehicleIdentifier, // Or extract VIN from cert/data if possible
      timestamp: Date.now(),
      data: telemetryData
    });

    wssDashboard.clients.forEach(client => {
      // Ensure client is open and authorized (authorization happens on connect)
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageString);
        } catch (error) {
          console.error(`Error sending message to a dashboard client:`, error);
        }
      }
    });
  });

  // --- Start Server & Configure Vehicles --- 
  httpsServer.listen(config.port, async () => {
    console.log(`HTTPS Telemetry Server with mTLS listening securely on port ${config.port}`);
    console.log(`Vehicle Endpoint: wss://${config.telemetryHost}:${config.port}/vehicle`);
    console.log(`Dashboard Endpoint: wss://${config.telemetryHost}:${config.port}/dashboard`);

    // After server starts listening, attempt to configure vehicles via Tesla API
    try {
      await teslaApi.configureVehicles();
      // Success is logged within configureVehicles
    } catch (err) {
      // Error is logged within configureVehicles
      // Decide if server should exit on config failure - currently it continues.
      console.error('Telemetry Server continuing despite vehicle configuration error.');
    }
  });

  // --- Graceful Shutdown Handling ---
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    httpsServer.close(() => {
      console.log('HTTP server closed');
      // Close WebSocket connections if necessary
      wssVehicle.close();
      wssDashboard.close();
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    httpsServer.close(() => {
      console.log('HTTP server closed');
      wssVehicle.close();
      wssDashboard.close();
      process.exit(0);
    });
  });
}

/**
 * Initialize the public key server
 * This server makes the public key available at the standard Tesla path
 */
function initializePublicKeyServer() {
  console.log('[PublicKey] Initializing Public Key Server...');
  try {
    // --- Strict Environment Variable Verification --- 
    console.log('[PublicKey] Verifying required environment variables...');
    if (!process.env.PUBLIC_KEY_PATH) {
      console.error('[PublicKey] FATAL: Missing required environment variable: PUBLIC_KEY_PATH');
      process.exit(1);
    }
    const publicKeyPath = process.env.PUBLIC_KEY_PATH;
    if (!fs.existsSync(publicKeyPath)) {
       console.error(`[PublicKey] FATAL: Public key file not found at specified path: ${publicKeyPath}`);
       process.exit(1);
    }
    console.log('[PublicKey] Environment variables verified.');

    // --- Create Express App --- 
    const app = express();

    // --- Configure Well-Known Endpoint --- 
    const wellKnownPath = '/.well-known/appspecific/com.tesla.3p.public-key.pem';
    app.get(wellKnownPath, (req, res) => {
      try {
        // Serve the public key with the correct content type
        console.log(`[PublicKey] Serving public key from: ${publicKeyPath}`);
        res.setHeader('Content-Type', 'application/x-pem-file');
        // Use path.resolve to ensure absolute path
        res.sendFile(path.resolve(publicKeyPath)); 
      } catch (fileError) {
         console.error(`[PublicKey] Error serving public key file ${publicKeyPath}:`, fileError);
         res.status(500).send('Error serving public key');
      }
    });
    console.log(`[PublicKey] Endpoint ${wellKnownPath} configured.`);

    // --- Health Check Endpoint --- 
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        mode: 'publickey',
        wellKnownPath: wellKnownPath,
        publicKeyPath: process.env.PUBLIC_KEY_PATH,
        publicKeyAvailable: fs.existsSync(process.env.PUBLIC_KEY_PATH) // Re-check here
      });
    });
    console.log('[PublicKey] Health check endpoint /health configured.');

    // --- Start HTTP Server --- 
    const PORT = process.env.PORT || 3000; // Default to 3000 for public key server
    console.log(`[PublicKey] Attempting to start server listening on port ${PORT}...`);
    try {
      app.listen(PORT, '0.0.0.0', () => { // Listen on all interfaces
        console.log(`[PublicKey] ✅ Public key server running on port ${PORT}`);
        console.log(`[PublicKey] Public key available locally at: http://localhost:${PORT}${wellKnownPath}`);
      });
    } catch (listenError) {
      console.error(`[PublicKey] FATAL: Error starting server listener on port ${PORT}:`, listenError);
      process.exit(1);
    }
  } catch (error) {
    console.error('[PublicKey] FATAL: Uncaught error during public key server initialization:', error);
    process.exit(1);
  }
}

// Export primarily for type checking or potential programmatic use (not typically needed for startup)
module.exports = { serverType }; 