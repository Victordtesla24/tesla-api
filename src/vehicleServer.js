/**
 * Tesla Fleet API Integration - Vehicle WebSocket Server
 * 
 * Sets up a WebSocket server on /vehicle endpoint for Tesla vehicles.
 * The HTTPS server is created with requestCert: true and rejectUnauthorized: true,
 * so only vehicles with valid client certificates can connect.
 * 
 * Reference: https://developer.tesla.com/docs/fleet-api/fleet-telemetry
 */

const WebSocket = require('ws');

/**
 * Create a WebSocket server for vehicle telemetry
 * 
 * @param {Server} server - HTTPS server with mTLS configured
 * @param {Function} onTelemetry - Callback for telemetry data to broadcast
 * @returns {WebSocket.Server} The WebSocket server
 */
module.exports = function(server, onTelemetry) {
  const wss = new WebSocket.Server({ 
    server: server, 
    path: '/vehicle'
  });

  console.log('Vehicle WebSocket server initialized on path /vehicle');

  wss.on('connection', (ws, req) => {
    // Identify client by certificate if needed (available on req.socket.getPeerCertificate())
    const clientCert = req.socket.getPeerCertificate();
    const clientIdentifier = clientCert?.subject?.CN || req.socket.remoteAddress || 'UnknownVehicle';
    console.log(`Vehicle client connected: ${clientIdentifier}`);
    
    // Verify client certificate (should already be verified by TLS layer)
    if (clientCert && !Object.keys(clientCert).length) {
      console.error('Client did not provide a certificate');
      return ws.close(1008, 'Client certificate required');
    }
    
    if (clientCert) {
      console.log(`Vehicle certificate subject: ${clientCert.subject?.CN || 'unknown'}`);
    }
    
    // Handle messages from vehicle
    ws.on('message', (message) => {
      console.log(`Received message from vehicle ${clientIdentifier}`);
      let dataObj;
      try {
        // Placeholder: Actual implementation requires protobuf decoding based on Tesla's spec
        // For now, treat as JSON or raw buffer
        if (Buffer.isBuffer(message)) {
          // Assume binary protobuf for now - just log size
          console.log(`Received binary message (protobuf?) of size: ${message.length} bytes`);
          // TODO: Implement protobuf decoding here
          dataObj = { rawData: message.toString('base64'), format: 'protobuf_placeholder' };
        } else {
          // Try parsing as JSON as a fallback or if text format is used
          dataObj = JSON.parse(message.toString());
        }

        // Send structured acknowledgement back to the vehicle
        // Per docs/02_telemetry_server.md: "send back an acknowledgment frame ({ messageType: \"ack\", ... })"
        const ackMessage = {
          messageType: "ack", // Type indicating acknowledgment
          receivedTimestamp: Date.now(), // Timestamp when server received it
          // You might include a message ID or other correlation info if the incoming message had one
        };
        ws.send(JSON.stringify(ackMessage));
        console.log(`Sent ACK to vehicle ${clientIdentifier}`);

        // Process telemetry and pass to callback for broadcasting to dashboards
        if (onTelemetry && typeof onTelemetry === 'function') {
          onTelemetry(dataObj, clientIdentifier); // Pass identifier too
        }
      } catch (err) {
        console.error(`Error processing message from vehicle ${clientIdentifier}:`, err);
        // Send error acknowledgment (optional, adjust format as needed)
        try {
          ws.send(JSON.stringify({ messageType: "error_ack", error: err.message || 'processing_error' }));
        } catch (sendErr) {
          console.error(`Failed to send error ACK to ${clientIdentifier}:`, sendErr);
        }
      }
    });
    
    // Handle vehicle disconnection
    ws.on('close', (code, reason) => {
      console.log(`Vehicle client ${clientIdentifier} disconnected. Code: ${code}, Reason: ${reason}`);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error(`Vehicle client ${clientIdentifier} WebSocket error:`, error);
    });
  });

  return wss;
}; 