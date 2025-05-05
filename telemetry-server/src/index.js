const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const config = require('./config'); // Loads and validates config
const setupVehicleServer = require('./vehicleServer');
const setupDashboardServer = require('./dashboardServer');
const teslaApi = require('./teslaApi');

// --- Load TLS Certificates (Fail Fast) ---
// Paths are validated by config.js, but file reading can still fail.
let serverKey, serverCert, caCert;
try {
    console.log(`Loading TLS key from: ${config.tlsKeyPath}`);
    serverKey = fs.readFileSync(config.tlsKeyPath);
    console.log(`Loading TLS certificate chain from: ${config.tlsCertPath}`);
    serverCert = fs.readFileSync(config.tlsCertPath); // Should contain the full chain
    console.log(`Loading TLS CA certificate from: ${config.tlsCaPath}`);
    caCert = fs.readFileSync(config.tlsCaPath); // CA for verifying client certs
    console.log('TLS certificates loaded successfully.');
} catch (err) {
    console.error('FATAL ERROR: Failed to load one or more TLS certificate files.');
    console.error(`Please ensure the files exist at the paths specified in .env (TLS_KEY_PATH, TLS_CERT_PATH, TLS_CA_PATH) and have correct permissions.`);
    console.error('Error details:', err.message);
    process.exit(1); // Fail fast
}

// --- Create HTTPS Server with Mutual TLS (mTLS) ---
// "Tesla mandates mutually authenticated TLS for the vehicle↔server link."
// "the server should terminate that TLS connection with requestCert: true and verify the vehicle's cert"
// Reference: docs/02_telemetry_server.md
const httpsServerOptions = {
    key: serverKey,
    cert: serverCert,
    ca: caCert,           // Specify the CA certificate(s) for verifying client certificates
    requestCert: true,    // Request a certificate from connecting clients (vehicles)
    rejectUnauthorized: true // Reject connections where the client cert is not signed by a trusted CA (provided in `ca` option)
};

const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
    // Simple health check endpoint
    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
        return;
    }
    // Optional: Default response for other HTTP requests if needed
    // res.writeHead(404);
    // res.end();
});

// --- Setup WebSocket Servers --- 
// Dashboard server must be created first to get the instance for broadcasting
const wssDashboard = setupDashboardServer(httpsServer);

// Vehicle server setup, passing the broadcast function
setupVehicleServer(httpsServer, (telemetryData) => {
    // Broadcast incoming telemetry from vehicles to all authorized dashboard clients
    if (wssDashboard && wssDashboard.clients) {
        wssDashboard.clients.forEach(client => {
            // Ensure the client is still connected and ready
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(JSON.stringify(telemetryData));
                } catch (sendError) {
                    console.error('Error sending telemetry data to dashboard client:', sendError.message);
                }
            }
        });
    } else {
        console.warn('No dashboard WebSocket server or clients available to broadcast telemetry.');
    }
});

// --- Start Server and Configure Vehicles ---
httpsServer.listen(config.port, async () => {
    console.log(`Secure Telemetry Server listening on port ${config.port}`);
    console.log(`Telemetry Hostname: ${config.telemetryHost}`);
    console.log('Waiting for vehicle and dashboard connections...');

    // After the server starts listening, attempt to configure vehicles via Tesla API.
    // This call uses the Partner Token and sends the server config (host, port, cert chain).
    try {
        await teslaApi.configureVehicles();
    } catch (err) {
        // Errors are logged within configureVehicles(), but log here too if needed.
        console.error('An error occurred during the initial vehicle configuration attempt.');
    }
});

// Optional: Handle server errors
httpsServer.on('error', (error) => {
    console.error('HTTPS Server Error:', error.message);
    // Consider more specific error handling (e.g., EADDRINUSE)
}); 