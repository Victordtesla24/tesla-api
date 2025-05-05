<!--
Organization: Tesla Fleet Telemetry Node.js Server
Description: Provides a production-ready Node.js server for Tesla fleet telemetry, following Tesla's official architecture.
Deployment Order: Must be deployed AFTER the Public Key Server to receive telemetry data from Tesla vehicles.
References:
  • Tesla Fleet API Documentation for Telemetry Configuration
Note: Requires proper mTLS setup with certificates in the certs/ directory.

[INTEGRATION AND DEPLOYMENT PLAN]
Project Component: Fleet Telemetry Node.js Server
  - Purpose: Secure server using mTLS for vehicle connections and WebSockets for dashboard clients.
  - Deployment: Deploy AFTER the Public Key Server on a secure hosting platform.
  - Integration: Vehicles connect on /vehicle path, dashboards on /dashboard path with token auth.
  - Credential Usage: Loads environment variables from .env file and TLS certificates from certs/ directory.

Additional Note: Server must fail fast if critical configuration or certificates are missing.
-->

<!-- ****************************************** -->
<!-- **DEPLOYMENT ORDER: 2 (Deploy AFTER Public Key Server)** -->
<!-- ****************************************** -->

## **Tesla Fleet Telemetry Node.js Server**
  
  This implementation provides a **production-ready** Node.js server for Tesla fleet telemetry, following Tesla's official architecture. It uses **mutual TLS (mTLS)** for secure vehicle connections and WebSockets to route data to dashboard clients. The server loads **environment variables** from a `.env` file (using `dotenv`) and TLS certificates from a `certs/` directory. After startup, it calls Tesla's Fleet API to configure each vehicle for telemetry streaming (including the CA certificate chain). Key features:

  - **TLS/mTLS:** HTTPS server with `requestCert: true` and a trusted CA for vehicles.  
  - **WebSocket Routing:** Vehicles connect on `/vehicle` (authenticating via client cert), dashboards on `/dashboard` (authorized by a token).  
  - **Configuration:** All paths and credentials from `.env` (see config comments).  
  - **Tesla API Integration:** Partner token (client_credentials) is fetched, then `/api/1/vehicles/fleet_telemetry_config` is called with the server's hostname, port, and CA.  

1. **Fleet Telemetry Node.js Server**

  1.1. **config.js**
    * **Description:** Loads environment variables and defines configuration parameters.
    * **Important ENV vars:** `PORT`, `TELEMETRY_HOST`, `TLS_*_PATH`, `TESLA_CLIENT_ID`, `TESLA_CLIENT_SECRET`, `TESLA_AUDIENCE`, `VEHICLE_IDS`, `DASHBOARD_TOKEN`, `TELEMETRY_FIELDS`.  

    ```js
    // config.js
    const path = require('path');
    require('dotenv').config();

    const config = {
        port: process.env.PORT || 443,
        telemetryHost: process.env.TELEMETRY_HOST,  // Domain name for telemetry server
        // Paths to TLS cert/key/CA in certs/ folder
        tlsKeyPath: process.env.TLS_KEY_PATH || path.join(__dirname, 'certs', 'server.key'),
        tlsCertPath: process.env.TLS_CERT_PATH || path.join(__dirname, 'certs', 'server.crt'),
        tlsCaPath: process.env.TLS_CA_PATH || path.join(__dirname, 'certs', 'ca.crt'),
        // Tesla API credentials for partner token (client_credentials flow)
        teslaClientId: process.env.TESLA_CLIENT_ID,
        teslaClientSecret: process.env.TESLA_CLIENT_SECRET,
        teslaAudience: process.env.TESLA_AUDIENCE, // e.g. "https://fleet-api.prd.na.vn.cloud.tesla.com"
        teslaAuthUrl: process.env.TESLA_AUTH_URL || 'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3',
        // Vehicle IDs to configure (comma-separated VINs in .env)
        vehicleIds: process.env.VEHICLE_IDS ? process.env.VEHICLE_IDS.split(',') : [],
        // Token for authorizing dashboard WebSocket clients
        dashboardToken: process.env.DASHBOARD_TOKEN,
        // Telemetry fields and intervals (as JSON string in .env or defaults)
        telemetryFields: process.env.TELEMETRY_FIELDS
            ? JSON.parse(process.env.TELEMETRY_FIELDS)
            : {
                VehicleSpeed: { interval_seconds: 10 },
                Location:    { interval_seconds: 10 },
                Soc:         { interval_seconds: 60 }
            }
    };

    module.exports = config;
    ```

  1.2. **auth.js**
    * **Description:** Provides a simple authentication check for dashboard clients. It verifies a static token (from `config.dashboardToken`). In a real deployment, you might replace this with JWT or other auth.

    ```js
    // auth.js
    const config = require('./config');

    function verifyDashboardToken(token) {
        // Check if the provided token matches the configured dashboard token
        return token && token === config.dashboardToken;
    }

    module.exports = { verifyDashboardToken };
    ```

  1.3. **teslaApi.js**
    * **Description:** Handles communication with Tesla's Fleet API. It fetches a **partner OAuth token** (using client credentials) and then calls the `/api/1/vehicles/fleet_telemetry_config` endpoint to set up each vehicle. The server's certificate chain (`ca`) is read from `certs/server.crt`.

    ```js
    // teslaApi.js
    const axios = require('axios');
    const fs = require('fs');
    const config = require('./config');

    let cachedToken = null;
    let tokenExpiry = null;

    // Obtain a Partner token (client_credentials grant)
    async function getPartnerToken() {
        // Reuse token if not expired
        if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
            return cachedToken;
        }
        if (!config.teslaClientId || !config.teslaClientSecret || !config.teslaAudience) {
            throw new Error('Missing Tesla API credentials or audience.');
        }
        const tokenUrl = `${config.teslaAuthUrl}/token`;
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', config.teslaClientId);
        params.append('client_secret', config.teslaClientSecret);
        params.append('audience', config.teslaAudience);
        // Scopes required for device data and commands
        params.append('scope', 'vehicle_device_data vehicle_cmds');

        const response = await axios.post(tokenUrl, params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const data = response.data;
        cachedToken = data.access_token;
        // Expire a minute early to be safe
        tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
        return cachedToken;
    }

    // Configure vehicles for telemetry by calling Tesla API
    async function configureVehicles() {
        const vins = config.vehicleIds;
        if (!vins || vins.length === 0) {
            console.warn('No VEHICLE_IDS provided; skipping Tesla configuration.');
            return;
        }
        const token = await getPartnerToken();

        // Load the server certificate (full chain) for the "ca" field
        let caChain;
        try {
            caChain = fs.readFileSync(config.tlsCertPath, 'utf8');
        } catch (err) {
            console.error('Error reading server certificate for CA:', err);
            throw err;
        }

        // Build the configuration payload
        const body = {
            vins: vins,
            config: {
                hostname: config.telemetryHost,
                port: config.port,
                ca: caChain,
                fields: config.telemetryFields
            }
        };

        // POST to /fleet_telemetry_config
        const url = `${config.teslaAudience}/api/1/vehicles/fleet_telemetry_config`;
        const response = await axios.post(url, body, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('Fleet telemetry config response:', response.data);
    }

    module.exports = { configureVehicles };
    ```

  1.4. **vehicleServer.js**
    * **Description:** Sets up a WebSocket server on `/vehicle` (for Tesla vehicles). The HTTPS server (in **index.js**) is created with `requestCert: true` and `rejectUnauthorized: true`, so only vehicles with valid client certificates can connect. Each incoming WebSocket message is **parsed** (the placeholder here just logs raw data) and then **acknowledged** back to the vehicle. Parsed data is passed to the `onTelemetry` callback for dispatching to dashboards.

    ```js
    // vehicleServer.js
    const WebSocket = require('ws');

    module.exports = function(server, onTelemetry) {
        const wss = new WebSocket.Server({ server: server, path: '/vehicle' });

        wss.on('connection', (ws, req) => {
            ws.on('message', (message) => {
                // TODO: Replace this stub with actual protobuf parsing
                // For now, we convert the binary to a hex string placeholder
                let dataObj;
                try {
                    dataObj = { rawHex: message.toString('hex') };
                } catch (err) {
                    console.error('Telemetry parse error:', err);
                    // Send error ack to vehicle
                    ws.send(JSON.stringify({ error: 'parse_error' }));
                    return;
                }

                // Send acknowledgement to the vehicle
                ws.send(JSON.stringify({ ack: true }));

                // Callback to broadcast to dashboard clients
                onTelemetry(dataObj);
            });
        });

        return wss;
    };
    ```

  1.5. **dashboardServer.js**
    * **Description:** Creates a WebSocket server on `/dashboard` for frontend dashboards. It requires each client to include a valid token (e.g. in the URL: `wss://domain/dashboard?token=XYZ`). The token is verified by `auth.verifyDashboardToken`. Unauthorized clients are immediately disconnected.

    ```js
    // dashboardServer.js
    const WebSocket = require('ws');
    const auth = require('./auth');

    module.exports = function(server) {
        const wss = new WebSocket.Server({ server: server, path: '/dashboard' });

        wss.on('connection', (ws, req) => {
            // Expect token in query string, e.g. /dashboard?token=abcdef
            const url = new URL(req.url, `https://${req.headers.host}`);
            const token = url.searchParams.get('token');

            if (!auth.verifyDashboardToken(token)) {
                ws.close(1008, 'Unauthorized');  // Policy Violation
                return;
            }

            // Optional: send a welcome message
            ws.send(JSON.stringify({ message: 'Dashboard connection established.' }));
        });

        return wss;
    };
    ```

  1.6. **index.js**
    * **Description:** The main entry point. It:
      1. Loads TLS certificates from `certs/` and fails fast if missing.
      2. Creates an HTTPS server with **mTLS** (`requestCert: true`, `rejectUnauthorized: true`).
      3. Starts listening on `config.port`. After the server is up, it calls `configureVehicles()` to register each vehicle.
      4. Attaches the WebSocket servers (`/vehicle` and `/dashboard`) to the HTTPS server.
      5. Broadcasts incoming telemetry to all connected dashboard clients.

    ```js
    // index.js
    const fs = require('fs');
    const https = require('https');
    const WebSocket = require('ws');
    const config = require('./config');
    const VehicleServer = require('./vehicleServer');
    const DashboardServer = require('./dashboardServer');
    const teslaApi = require('./teslaApi');

    // Validate critical configuration
    if (!config.telemetryHost) {
        console.error('Error: TELEMETRY_HOST must be set in environment.');
        process.exit(1);
    }
    if (!config.dashboardToken) {
        console.error('Error: DASHBOARD_TOKEN must be set for dashboard auth.');
        process.exit(1);
    }

    // Load TLS certificates (server key/cert and CA for client cert validation)
    let serverKey, serverCert, caCert;
    try {
        serverKey  = fs.readFileSync(config.tlsKeyPath);
        serverCert = fs.readFileSync(config.tlsCertPath);
        caCert     = fs.readFileSync(config.tlsCaPath);
    } catch (err) {
        console.error('Failed to load TLS certificate files:', err);
        process.exit(1);
    }

    // Create HTTPS server with mutual TLS
    const httpsServer = https.createServer({
        key: serverKey,
        cert: serverCert,
        ca: caCert,
        requestCert: true,
        rejectUnauthorized: true
    });

    httpsServer.listen(config.port, async () => {
        console.log(`Server is listening on port ${config.port}`);

        // After server starts, configure vehicles via Tesla API
        try {
            await teslaApi.configureVehicles();
            console.log('Successfully configured vehicles for telemetry.');
        } catch (err) {
            console.error('Error configuring vehicles:', err);
        }
    });

    // Attach WebSocket servers
    const wssDashboard = DashboardServer(httpsServer);
    VehicleServer(httpsServer, (telemetryData) => {
        // Broadcast incoming telemetry to all open dashboard connections
        wssDashboard.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(telemetryData));
            }
        });
    });
    ```

  1.7. **Project Structure & Deployment**
    * **Directory Structure:**
      ```
      ├── index.js  
      ├── vehicleServer.js  
      ├── dashboardServer.js  
      ├── teslaApi.js  
      ├── auth.js  
      └── config.js  
      ```
    * **Deployment Notes:** Each module is modular and ready for deployment. The WebSocket servers run over HTTPS (port 443), requiring valid certificates from `certs/`. Vehicles will connect to `wss://<TELEMETRY_HOST>/vehicle` (TLS + client cert), and dashboards to `wss://<TELEMETRY_HOST>/dashboard?token=<token>`. Upon startup, `index.js` calls the Tesla fleet_telemetry_config API (via `teslaApi.js`) to push the server's configuration to each vehicle, including the full certificate chain in the `ca` field.
    * **Testing:** No test code is included; testing and further integration can be implemented in the next phase after confirmation.