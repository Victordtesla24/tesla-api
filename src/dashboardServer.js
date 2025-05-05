/**
 * Tesla Fleet API Integration - Dashboard WebSocket Server
 * 
 * Creates a WebSocket server on /dashboard for frontend dashboards.
 * It requires each client to authenticate with a valid Tesla OAuth token with vehicle_device_data scope.
 * Unauthorized clients are immediately disconnected.
 * 
 * Reference: https://developer.tesla.com/docs/fleet-api/fleet-telemetry
 */

const WebSocket = require('ws');
const { URL } = require('url');
const { verifyDashboardToken } = require('./auth'); // Import the JWT verification function

/**
 * Create a WebSocket server for dashboard clients
 * 
 * @param {Server} server - HTTPS server
 * @returns {WebSocket.Server} The WebSocket server
 */
module.exports = function(server) {
  const wss = new WebSocket.Server({ 
    server: server, 
    path: '/dashboard' 
  });
  console.log('Dashboard WebSocket server initialized on path /dashboard');

  wss.on('connection', (ws, req) => {
    let isAuthorized = false;
    let clientIdentifier = 'UnknownClient'; // Identifier from token payload

    try {
      // Expect token in query string, e.g., /dashboard?token=eyJ...
      const requestUrl = new URL(req.url, `wss://${req.headers.host}`);
      const token = requestUrl.searchParams.get('token');

      const decodedPayload = verifyDashboardToken(token);

      if (decodedPayload) {
        isAuthorized = true;
        clientIdentifier = decodedPayload.sub || `User_${Date.now()}`;
        console.log(`Dashboard client connected and authorized: ${clientIdentifier}`);
        // Add the WebSocket client to a managed list/set associated with the identifier if needed
        // e.g., addClient(clientIdentifier, ws);
        ws.send(JSON.stringify({ type: 'auth_success', message: 'Connection established and authorized.' }));
      } else {
        console.warn('Dashboard client connection refused: Invalid or missing token.');
        ws.close(1008, 'Unauthorized - Invalid Token'); // Policy Violation
        return; // Stop processing for this connection
      }
    } catch (error) {
      console.error('Error during dashboard connection authorization:', error);
      ws.close(1011, 'Internal Server Error'); // Unexpected condition
      return;
    }

    // Handle messages from authorized dashboard clients (if needed)
    ws.on('message', (message) => {
      console.log(`Received message from dashboard ${clientIdentifier}: ${message}`);
      // Process commands or requests from the dashboard if necessary
    });

    ws.on('close', (code, reason) => {
      console.log(`Dashboard client ${clientIdentifier} disconnected. Code: ${code}, Reason: ${reason}`);
      // Remove the client from any managed list
      // e.g., removeClient(clientIdentifier, ws);
    });

    ws.on('error', (error) => {
      console.error(`Dashboard client ${clientIdentifier} WebSocket error:`, error);
      // Ensure cleanup if an error occurs
      // e.g., removeClient(clientIdentifier, ws);
    });
  });

  return wss;
}; 