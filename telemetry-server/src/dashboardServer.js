// telemetry-server/src/dashboardServer.js
const WebSocket = require('ws');
const { URL } = require('url');
const auth = require('./auth');

/**
 * Sets up the WebSocket server endpoint for dashboard client connections.
 * Authenticates clients based on a token provided in the query string.
 * @param {https.Server} server - The HTTPS server instance.
 * @returns {WebSocket.Server} The WebSocket server instance used for broadcasting.
 */
module.exports = function(server) {
    const wssDashboard = new WebSocket.Server({ 
        server: server, 
        path: '/dashboard' 
    });

    console.log('Dashboard WebSocket server listening on /dashboard');

    wssDashboard.on('connection', (ws, req) => {
        const clientIp = req.socket.remoteAddress || req.headers['x-forwarded-for'];
        let authorized = false;

        try {
            // Expect token in query string, e.g., wss://<domain>/dashboard?token=SECRET_TOKEN
            const requestUrl = new URL(req.url, `https://${req.headers.host}`);
            const token = requestUrl.searchParams.get('token');

            if (auth.verifyDashboardToken(token)) {
                authorized = true;
                console.log(`Dashboard client connected and authorized: ${clientIp}`);
                // Optional: Send a confirmation message to the client
                ws.send(JSON.stringify({ status: 'authorized', message: 'Connection established. Awaiting telemetry data...' }));
            } else {
                console.warn(`Dashboard connection attempt rejected (invalid token): ${clientIp}`);
                ws.close(1008, 'Unauthorized'); // 1008: Policy Violation
                return;
            }
        } catch (error) {
            console.error(`Error parsing dashboard connection URL for ${clientIp}:`, error.message);
            ws.close(1003, 'Invalid request'); // 1003: Unsupported Data
            return;
        }

        ws.on('message', (message) => {
            // Dashboards typically only listen, but handle incoming messages if needed (e.g., settings)
            console.log(`Received message from dashboard ${clientIp}:`, message.toString());
            // Example: ws.send(JSON.stringify({ status: 'info', message: 'Messages from dashboard not processed.' }));
        });

        ws.on('close', (code, reason) => {
            console.log(`Dashboard connection closed: ${clientIp} - Code: ${code}, Reason: ${reason || 'N/A'}`);
        });

        ws.on('error', (error) => {
            console.error(`Dashboard WebSocket error for ${clientIp}:`, error.message);
        });
    });

     wssDashboard.on('error', (error) => {
        console.error('Dashboard WebSocket Server Error:', error.message);
    });

    // Return the server instance so index.js can access its clients for broadcasting
 