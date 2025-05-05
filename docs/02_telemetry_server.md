<!--
Organization: Telemetry Server Requirements
Description: Outlines specifications for the Telemetry Server responsible for real-time data ingestion and persistent WebSocket support for Tesla fleet telemetry.
Deployment Order: Must be deployed AFTER the Public Key Server is live.
References:
  • Tesla Fleet Telemetry Documentation
Note: Ensure that production configurations enforce persistent connections and are aligned with the provided environment variables.
-->

<!-- ****************************************** -->
<!-- **DEPLOYMENT ORDER: 2 (Deploy AFTER Public Key Server)** -->
<!-- ****************************************** -->

## **Tesla Fleet API Telemetry Server Implementation Plan**

**Prerequisites:**

*   **Public Key Server Live & Registered:** The Public Key Server (detailed in `docs/01_public_key_server.md`) must be deployed, serving the key at the correct `.well-known` URL, and the domain **must be registered** with Tesla via the `POST /partner_accounts` API.
*   **Virtual Key Paired:** The user's vehicle must have the application's virtual key paired via the Tesla mobile app (`https://tesla.com/_ak/<your-domain>`). This requires the Public Key server to be live and registered.
*   **Valid Tesla API Token:** A Partner or Third-Party token with required scopes (`vehicle_device_data`, `vehicle_cmds`, `vehicle_location`) must be available (e.g., in `.env.local`).
*   **Vehicle Eligibility:** Target vehicle meets firmware requirements.

<!-- ****************************************** -->

1. Telemetry Server (Deploy After Public Key Server)

  1.1. **Telemetry Server Overview**
    * **Objective:** Tesla's official Telemetry documentation envisions a single telemetry server that handles both vehicle streams and downstream clients. Vehicles establish a secure WebSocket to the configured telemetry server (running on a public domain) and push data continuously. The documentation and reference implementation focus on one server handling "device connectivity" and streaming data, without any suggestion of splitting this into two separate services. In practice, you can implement one Node.js service that accepts Tesla vehicle connections and also forwards data to any dashboard clients; Tesla does not require separate socket servers for vehicles vs. dashboards.

  1.2. **Dashboard Authentication Model**
    * Tesla relies on OAuth-based access control for telemetry. Only registered applications with paired virtual keys can receive vehicle data. In other words, a dashboard client must authenticate via Tesla's OAuth flow (using a Tesla-issued access token with the proper scopes, e.g. vehicle_device_data) before subscribing. The telemetry server should verify these tokens on connection (for example, by checking a JWT or bearer token) to ensure the client has permission for that vehicle's data. This follows Tesla's standard model: the front-end dashboard authenticates the user via Tesla OAuth, obtains a valid token, and presents it when connecting to receive telemetry.

  1.3. **TLS and mTLS Requirements**
    * Tesla mandates mutually authenticated TLS for the vehicle↔server link. The telemetry server must use HTTPS/WSS (typically on port 443) and present a certificate chain that the vehicle can verify. In fact, Tesla's documentation (and reference tools) explicitly require providing the full TLS certificate chain in the telemetry config payload so that the vehicle trusts the server's identity. In practice this means your server's configuration JSON (sent via `POST fleet_telemetry_config`) includes a ca field containing the certificate chain. Additionally, Tesla recommends (and its reference implementation enforces) mTLS: the vehicle will also present a client certificate, and the server should terminate that TLS connection with requestCert: true and verify the vehicle's cert. In short, use TLS with client certificate verification, include your full cert chain in the payload, and enforce mTLS at the telemetry server.

    * Next, based on these principles and Tesla's docs, we will design and implement the Node.js telemetry server. Below is an outline of the server architecture and setup.

  1.4. **Project Structure (Telemetry Server)**
    ```markdown
    telemetry-server/
    ├── .env                    # With TESLA_ACCESS_TOKEN, TESLA_VIN, JWT_SECRET, etc.
    ├── package.json
    ├── README.md
    ├── certs/                  # TLS certificates and keys
    │   ├── server.key
    │   ├── server.crt
    │   └── ca-chain.crt        # CA chain referenced in config payload
    ├── src/
    │   ├── index.js            # Main entry point, loads .env, HTTPS & WebSocket servers
    │   ├── vehicleServer.js    # Handles vehicle-facing WebSocket
    │   ├── dashboardServer.js  # Handles dashboard WebSocket
    │   ├── teslaApi.js         # Utility for Tesla REST API calls
    │   ├── auth.js             # JWT/token verification for dashboard clients
    │   └── config.js           # Reads and validates required .env variables
    └── test/                   # Test suite files
        └── ...                 # Tests for configuration, WebSockets, etc.
    ```

  1.5. **TLS/mTLS Setup**
    * **HTTPS Server:** Use Node's https.createServer({ key, cert, ca, requestCert: true, rejectUnauthorized: true }, app). Load the server's private key and full certificate chain from the certs/ directory. Setting requestCert: true enforces that vehicles present a valid client cert (mTLS).
    * **Certificate Chain:** The ca option should include the intermediate and root certificates in the chain that you sent to Tesla in the config payload. This matches Tesla's requirement to verify the server's identity.
    * **Port:** Listen on port 443 (default TLS) so vehicles can connect via `wss://`.

  1.6. **Real-Time Telemetry Handling**
    * **Vehicle WebSocket:** On the `/vehicle path`, accept incoming JSON frames from Tesla vehicles. Each frame contains telemetry data points. Decode and validate messages, then immediately broadcast to any connected dashboard clients. After processing each batch, send back an acknowledgment frame (`{ messageType: "ack", ... }`) over the socket to Tesla per their protocol for reliable delivery.
    * **Dashboard WebSocket:** On the `/dashboard path`, accept dashboard browser clients. When they connect, verify their auth token (e.g. verify JWT with JWT_SECRET). Maintain a set of these WebSocket connections. Whenever new telemetry data arrives from a vehicle, loop through connected dashboards and ws.send(`JSON.stringify(data)`). Use server-initiated push – dashboards just listen for messages (no polling).

  1.7. **Tesla API Integration**
    * **fleet_telemetry_config Call:** After server is running, use teslaApi.js to call Tesla's `POST /api/1/vehicles/{vehicle_id}/fleet_telemetry_config` endpoint. This must include our server hostname, port (443), and the CA certificate chain. The request must be signed with our private key (via the Tesla vehicle-command proxy) and use Authorization: Bearer `$TESLA_ACCESS_TOKEN`. This tells the vehicle to start streaming to our server.
    * **Error Monitoring:** Optionally poll `GET /api/1/vehicles/{id}/fleet_telemetry_errors` to catch any config or streaming errors.
    * **Other REST Calls:** Use Tesla OAuth token in headers for any required calls (e.g. to get vehicle VIN or status).

  1.8. **.env Variables Usage**
    ```ini
    TESLA_ACCESS_TOKEN=<YOUR_OAUTH_TOKEN>  # OAuth bearer token for API calls
    TESLA_VIN=<VEHICLE_VIN>               # Vehicle identifier to configure
    JWT_SECRET=<YOUR_SECRET>              # Secret for signing/verifying dashboard JWTs
    DOMAIN=your.telemetry.domain          # Telemetry server's public domain (matches cert)
    PORT=443                              # Default TLS port
    ```
    * **No secrets are hardcoded** – all TLS keys, tokens, etc. are loaded from .env or secure files.

  1.9. **Fail-Fast Logic & Testing**
    * **Config Validation:** On startup (`index.js`), immediately load and validate all required `.env` settings (token, VIN, JWT secret, paths to certs). If any are missing or invalid, log an error and exit (`process.exit`).
    * **Connection Checks:** Immediately after starting the server, attempt to run the provided `check_server_cert.sh` tool (or equivalent logic) to verify our TLS setup. If it fails, log and exit.
    * **Watchdog:** If the vehicle disconnects or streams no data for some time, emit an error or attempt reconfigure.
    * **Automated Tests:** Write unit tests for: config loader (`invalid .env`), JWT auth (accepts valid token, rejects invalid), message parser (handles telemetry JSON properly), and the WebSocket servers (mock a client to ensure data routing).

At this point the telemetry server is designed. Upon confirmation, we will proceed to implement these components in `Node.js`, strictly following Tesla's documentation and the plan above.

**References:** Tesla's Fleet Telemetry documentation and reference code indicate using one TLS-enabled telemetry server (vehicles connect via WSS) and leveraging OAuth tokens for access. The above architecture adheres to those verified practices.
