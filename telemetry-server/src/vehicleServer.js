const WebSocket = require('ws');

/**
 * Sets up the WebSocket server endpoint for incoming vehicle connections.
 * Handles message parsing (placeholder), acknowledgment, and forwarding.
 * Assumes the underlying HTTPS server enforces mTLS.
 * @param {https.Server} server - The HTTPS server instance.
 * @param {function(object): void} onTelemetry - Callback function to invoke with parsed telemetry data.
 * @returns {WebSocket.Server} The WebSocket server instance.
 */
module.exports = function(server, onTelemetry) {
    const wssVehicle = new WebSocket.Server({ 
        server: server, 
        path: '/vehicle',
        // Client verification (mTLS) is handled by the HTTPS server options 
        // (requestCert: true, rejectUnauthorized: true)
    });

    console.log('Vehicle WebSocket server listening on /vehicle');

    wssVehicle.on('connection', (ws, req) => {
        // Extract client IP for logging (optional)
        const clientIp = req.socket.remoteAddress || req.headers['x-forwarded-for'];
        console.log(`Vehicle connected: ${clientIp}`);

        // Get client certificate details provided by mTLS (optional)
        const clientCert = req.socket.getPeerCertificate();
        if (clientCert && clientCert.subject) {
             console.log(` -> Client CN: ${clientCert.subject.CN}`); // Often contains VIN or device ID
        }

        ws.on('message', (message) => {
            let dataObj;
            let messageId = Date.now(); // Use timestamp as a fallback ID

            try {
                // TODO: Implement actual Protobuf parsing based on Tesla's schema.
                // Reference: https://developer.tesla.com/docs/fleet-api/fleet-telemetry/available-data
                // For now, treat as JSON if possible, otherwise log raw.
                if (Buffer.isBuffer(message)) {
                    // Assuming JSON for now, replace with protobuf decoder
                     try {
                         dataObj = JSON.parse(message.toString('utf8'));
                         // Attempt to get a message ID if present in the data
                         messageId = dataObj.messageId || dataObj.id || messageId;
                     } catch (jsonError) {
                         console.warn('Received non-JSON binary message from vehicle. Protobuf decoder needed.');
                         dataObj = { rawData: message.toString('hex'), timestamp: Date.now() }; // Placeholder
                     }
                } else if (typeof message === 'string') {
                    dataObj = JSON.parse(message);
                    messageId = dataObj.messageId || dataObj.id || messageId;
                } else {
                    throw new Error('Unexpected message format');
                }

                // Send acknowledgment back to the vehicle per Tesla protocol.
                // "send back an acknowledgment frame ({ messageType: "ack", ... })" - docs/02_telemetry_server.md
                // Include a unique identifier if available from the message.
                const ackMessage = {
                    messageType: "ack",
                    messageId: messageId, // Echo back an ID if found, or use fallback
                    receivedTimestamp: Date.now()
                };
                ws.send(JSON.stringify(ackMessage));

                // Callback to broadcast parsed data to dashboard clients
                onTelemetry(dataObj);

            } catch (err) {
                console.error('Error processing vehicle message:', err.message);
                // Send error acknowledgment if possible
                try {
                    ws.send(JSON.stringify({ messageType: "nack", error: 'parse_error', messageId: messageId }));
                } catch (sendError) {
                     console.error('Failed to send NACK to vehicle:', sendError.message);
                }
            }
        });

        ws.on('close', (code, reason) => {
            console.log(`Vehicle connection closed: ${clientIp} - Code: ${code}, Reason: ${reason || 'N/A'}`);
        });

        ws.on('error', (error) => {
            console.error(`Vehicle WebSocket error for ${clientIp}:`, error.message);
        });
    });

    wssVehicle.on('error', (error) => {
        console.error('Vehicle WebSocket Server Error:', error.message);
    });

    return wssVehicle;
}; 