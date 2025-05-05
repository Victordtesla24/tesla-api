<!--
Organization: Node.js Test Suite for Tesla Telemetry Server
Description: Outlines the test cases and methodologies for verifying that the Node.js telemetry server conforms to Tesla's Fleet Telemetry specifications.
Deployment Order: Test suite to be executed after implementation of the telemetry server component.
References:
  • Tesla Fleet Telemetry GitHub Repository
  • Tesla Fleet API Documentation for Vehicle and Partner Endpoints
Note: All tests must validate against the actual Tesla API behavior as specified in official documentation.

[TESTING INTEGRATION PLAN]
Project Component: Node.js Test Suite
  - Purpose: Verify that the Tesla Telemetry Server implementation correctly handles WebSocket connections, mutual TLS authentication, and telemetry data forwarding.
  - Test Coverage: Unit tests for configuration and authentication, integration tests for API interactions, and runtime tests for WebSocket behavior.
  - Integration: Tests validate that the telemetry server correctly interfaces with Tesla's Fleet API and can properly relay telemetry data from vehicles to dashboards.
  - Approach: Use Jest/Mocha with minimal mocks (nock for HTTP, ws for WebSockets) to simulate Tesla's APIs and vehicle connections.

Additional Note: Tests must fail fast if Tesla's API requirements are not met, particularly regarding mutual TLS authentication and the WebSocket protocol.
-->

<!-- ****************************************** -->
<!-- **TEST SUITE: Node.js Telemetry Server**   -->
<!-- ****************************************** -->

## **Test Suite for Node.js Tesla Telemetry Server**
  
  This test suite covers unit, integration, and runtime tests to ensure the Node.js telemetry server conforms to Tesla's Fleet Telemetry specifications. We use a Node testing framework (e.g. Jest or Mocha/Chai) with minimal mocks (e.g. **nock** for HTTP, **ws** for WebSocket) as hinted by Tesla's examples. All expected behaviors are drawn from Tesla's official docs and reference implementation ([GitHub - teslamotors/fleet-telemetry](https://github.com/teslamotors/fleet-telemetry#:~:text=The%20service%20handles%20device%20connectivity,used%20as%20a%20proxy%20for)) ([GitHub - teslamotors/fleet-telemetry](https://github.com/teslamotors/fleet-telemetry#:~:text=,that%20a%20vehicle%27s%20TLS%20private)) ([Vehicle Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/vehicle-endpoints#:~:text=fleet_telemetry_config%20create)) ([Partner Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens#:~:text=Name%20Required%20Example%20Description%20grant_type,openid%20user_data%20vehicle_device_data%20vehicle_cmds%20vehicle_charging_cmds)).

1. **Unit Tests**

  1.1. **config.js (Environment validation)**
    * **Objective:** Verify that required environment variables (e.g. TLS certificate paths, Tesla client ID/secret, Fleet API base URL, etc.) are validated.
    * **Tests include:**
      * Missing or empty required vars: expect `config.js` to throw an error or exit (fail fast) ([GitHub - teslamotors/fleet-telemetry](https://github.com/teslamotors/fleet-telemetry#:~:text=,that%20a%20vehicle%27s%20TLS%20private)).
      * Invalid values (e.g. non-numeric port): expect validation error.
      * All vars present: expect a valid config object returned.

    - Example (using Jest):
    ```js
      // config.test.js
      describe('Config Validation', () => {
        const OLD_ENV = process.env;
        afterEach(() => { process.env = { ...OLD_ENV }; jest.resetModules(); });

        test('throws if TESLA_CLIENT_ID missing', () => {
          delete process.env.TESLA_CLIENT_ID;
          expect(() => require('../config')).toThrow(/TESLA_CLIENT_ID/);
        });

        test('returns valid config when all env present', () => {
          process.env.TESLA_CLIENT_ID = 'id';
          process.env.TESLA_CLIENT_SECRET = 'secret';
          process.env.FLEET_API_BASE_URL = 'https://fleet-api...';
          process.env.PORT = '443';
          const config = require('../config');
          expect(config.port).toBe(443);
          expect(config.auth.clientId).toBe('id');
        });
      });
    ```

  1.2. **auth.js (Token verification)**
    * **Objective:** Verify that the server correctly verifies Tesla tokens or client credentials.
    * **Tests include:**
      * Valid JWT/bearer: expect request to succeed (no error).
      * Invalid token (wrong signature or missing): expect an authentication error or HTTP 401 response.
      * Expired token: expect specific error handling.

    - Example:
    ```js
      // auth.test.js
      describe('Auth Middleware', () => {
        const req = { headers: {} };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        test('rejects missing token', () => {
          const auth = require('../auth');
          auth(req, res, next);
          expect(res.status).toHaveBeenCalledWith(401);
          expect(res.json).toHaveBeenCalled();
        });

        test('accepts valid token', () => {
          const jwt = require('jsonwebtoken');
          // Sign a token with test secret matching auth.js config
          const token = jwt.sign({ sub: 'test' }, 'test-secret', { algorithm: 'HS256' });
          req.headers.authorization = `Bearer ${token}`;
          auth(req, res, next);
          expect(next).toHaveBeenCalled();
        });
      });
    ```

  1.3. **teslaApi.js (Partner token and config endpoint)**
    * **Objective:** Test interactions with Tesla's Fleet API.
    * **Tests include:**
      * **Partner token generation**: Expect an HTTP POST to Tesla's `/oauth2/v3/token` endpoint with form data including `grant_type=client_credentials`, `client_id`, `client_secret`, and `audience` ([Partner Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens#:~:text=Name%20Required%20Example%20Description%20grant_type,openid%20user_data%20vehicle_device_data%20vehicle_cmds%20vehicle_charging_cmds)). Use **nock** to mock this endpoint:
        * On success (HTTP 200, valid JSON with `access_token`), verify `teslaApi.getPartnerToken()` returns the token.
        * On failure (HTTP 400 or network error), verify the error is propagated or handled.
      * **POST /fleet_telemetry_config**: Expect an HTTP POST to Tesla's `/api/1/vehicles/fleet_telemetry_config` endpoint (usually via vehicle-command proxy) ([Vehicle Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/vehicle-endpoints#:~:text=fleet_telemetry_config%20create)). Use nock to simulate:
        * Success case (HTTP 200, JSON with config status), ensure `teslaApi.configureTelemetry()` resolves correctly.
        * Failure case (e.g. 401/403 or 422 response), ensure errors are caught and appropriate message returned.

    - Example:
    ```js
      // teslaApi.test.js
      const nock = require('nock');
      const api = require('../teslaApi');

      describe('Tesla API', () => {
        afterEach(() => { nock.cleanAll(); });

        test('getPartnerToken() calls correct endpoint', async () => {
          const tokenResp = { access_token: 'abc' };
          nock('https://fleet-auth.prd.vn.cloud.tesla.com')
            .post('/oauth2/v3/token', body => body.includes('client_credentials'))
            .reply(200, tokenResp);
          const token = await api.getPartnerToken('id','secret','https://fleet-api.prd.na.vn.cloud.tesla.com');
          expect(token).toBe('abc');
        });

        test('configureTelemetry() handles error', async () => {
          nock('https://fleet-api.prd.na.vn.cloud.tesla.com')
            .post('/api/1/vehicles/fleet_telemetry_config')
            .reply(400, { error: 'bad_request' });
          await expect(api.configureTelemetry({ vin: 'XXX' })).rejects.toThrow('bad_request');
        });
      });
    ```

2. **Integration Tests**

  2.1. **End-to-end Telemetry Broadcast**
    * **Objective:** Simulate a vehicle WebSocket client and a dashboard client to test the full data flow.
    * **Tests include:**
      * Start the telemetry server in a test environment (with a test certificate or self-signed CA).
      * Use the **ws** library to connect a mock vehicle client (with a valid client certificate) to the server's WebSocket endpoint ([GitHub - teslamotors/fleet-telemetry](https://github.com/teslamotors/fleet-telemetry#:~:text=,that%20a%20vehicle%27s%20TLS%20private)) ([GitHub - teslamotors/fleet-telemetry](https://github.com/teslamotors/fleet-telemetry#:~:text=The%20service%20handles%20device%20connectivity,used%20as%20a%20proxy%20for)).
      * Use **ws** to connect a mock dashboard client (as a normal WebSocket client) to subscribe to telemetry data.
      * Send a sample telemetry payload from the vehicle client. Verify that the server broadcasts the message to the dashboard client unchanged.
      * Test error cases (e.g. sending malformed data should result in an error message/close).

    * **Key Expectation:** After `fleet_telemetry_config`, the vehicle "establishes a WebSocket connection to push telemetry records" ([GitHub - teslamotors/fleet-telemetry](https://github.com/teslamotors/fleet-telemetry#:~:text=The%20service%20handles%20device%20connectivity,used%20as%20a%20proxy%20for)). The server should forward data to connected dashboards.

  2.2. **Tesla API Call Behavior (Integration)**
    * **Objective:** Emulate the server's actual HTTP endpoints that trigger Tesla API calls.
    * **Tests include:**
      * Use **supertest** (or similar) to hit the server's `/configure` endpoint with a VIN and config payload.
      * Mock Tesla's API endpoints with **nock**:
        * **Success scenario**: partner token endpoint returns token, `/fleet_telemetry_config` returns 200. Expect the server's API to respond with success (200 and correct body).
        * **Error scenario**: simulate Tesla returning 500 or 422. Expect the server to respond with an error code and message.

    - Example:
    ```js
      const request = require('supertest');
      const nock = require('nock');
      const app = require('../app'); // Express app

      test('POST /configure sends config to Tesla', async () => {
        nock('https://fleet-auth.prd.vn.cloud.tesla.com')
          .post('/oauth2/v3/token').reply(200, { access_token: 'tkn' });
        nock('https://fleet-api.prd.na.vn.cloud.tesla.com')
          .post('/api/1/vehicles/fleet_telemetry_config')
          .reply(200, { synced: true });
        const res = await request(app).post('/configure').send({ vin: '5YJ...', config: {/*...*/} });
        expect(res.status).toBe(200);
        expect(res.body.synced).toBe(true);
      });
    ```

3. **Runtime Tests**

  3.1. **TLS and Mutual TLS Validation**
    * **Objective:** Ensure the server enforces mTLS.
    * **Tests include:**
      * Attempt a WebSocket/TLS connection **without** a client certificate: expect a handshake failure or rejection.
      * Attempt with an invalid or untrusted client cert: expect rejection.
      * Connect with a valid client certificate: expect handshake success.
      * (Optional) Use Node's `tls` or `https` client in tests to attempt these connections and catch errors.

    * **Expected:** "Vehicles authenticate to the telemetry server with TLS client certificates" ([GitHub - teslamotors/fleet-telemetry](https://github.com/teslamotors/fleet-telemetry#:~:text=,that%20a%20vehicle%27s%20TLS%20private)). The server should reject any connection lacking a valid client cert.

  3.2. **WebSocket Connection and Protocol**
    * **Objective:** Test WebSocket specifics.
    * **Tests include:**
      * **Endpoint/path**: If the server expects a specific path or subprotocol, test both valid and invalid WebSocket URLs. For example, if the telemetry server's path is `/telemetry/ws`, ensure connecting to `/wrong/path` is refused.
      * **Subprotocol**: If a subprotocol (e.g. "tesla.telemetry") is required, test connections with/without it.
      * **Messaging protocol**: If binary (protobuf) is expected, test that sending invalid JSON or wrong format yields an error.
      * Verify the server sends any required WebSocket handshake headers (e.g. `Sec-WebSocket-Protocol`) per spec.

    * **Expected:** After configuration, vehicles should stream data via WebSocket to the server ([GitHub - teslamotors/fleet-telemetry](https://github.com/teslamotors/fleet-telemetry#:~:text=The%20service%20handles%20device%20connectivity,used%20as%20a%20proxy%20for)). The connection should adhere to standard WebSocket handshakes (including any Tesla-specific subprotocol if used).

4. **Test Summary Report**

  - Each test case is summarized below. The **Expected Implementation** is based on Tesla's official docs or reference code; **Actual Result** and **Root Cause/Resolution** are hypothetical examples.

  +------------------------------------------------------------+------------------------------------------------+--------------------------------------------------------+------------------------------+--------------------------------+---------------------------------------+
  | Expected Implementation (Tesla Docs)                        | Current Implementation (file/snippet)          | Expected Result                                         | Actual Result                 | Root Cause (if any)             | Resolution                            |
  +------------------------------------------------------------+------------------------------------------------+--------------------------------------------------------+------------------------------+--------------------------------+---------------------------------------+
  | POST `/oauth2/v3/token` with `client_id`, `client_secret`,  | `teslaApi.getPartnerToken()` calls auth        | HTTP 200 with access_token returned and parsed.         | 200 OK, token received.       | –                              | –                                     |
  | `audience` form data ([Partner Tokens | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens#:~:text=Name%20Required%20Example%20Description%20grant_type,openid%20user_data%20vehicle_device_data%20vehicle_cmds%20vehicle_charging_cmds)) | endpoint with correct params.        |                                                        |                              |                                |                                       |
  +------------------------------------------------------------+------------------------------------------------+--------------------------------------------------------+------------------------------+--------------------------------+---------------------------------------+
  | **(Negative case)** Same token request returns error        | `teslaApi.getPartnerToken()`                  | Throws an error or returns rejected promise.            | (Simulated) 401 error thrown. | Expected error handling path.  | Ensure error is caught and propagated.|
  | (e.g. 401).                                                |                                                |                                                        |                              |                                |                                       |
  +------------------------------------------------------------+------------------------------------------------+--------------------------------------------------------+------------------------------+--------------------------------+---------------------------------------+
  | POST `/api/1/vehicles/fleet_telemetry_config` via proxy    | `teslaApi.configureTelemetry()`               | HTTP 200 with `{synced: true}` (config applied).        | 200 OK, synced true.          | –                              | –                                     |
  | ([Vehicle Endpoints | Tesla Fleet API](https://developer.tesla.com/docs/fleet-api/endpoints/vehicle-endpoints#:~:text=fleet_telemetry_config%20create)) |                                      |                                                        |                              |                                |                                       |
  +------------------------------------------------------------+------------------------------------------------+--------------------------------------------------------+------------------------------+--------------------------------+---------------------------------------+
  | **(Negative)** Config call fails (e.g. missing_key)         | `teslaApi.configureTelemetry()`               | Error response handled, returned to caller.             | (Simulated) 422 error.        | Missing key = bad input        | Validate inputs or report upstream.   |
  +------------------------------------------------------------+------------------------------------------------+--------------------------------------------------------+------------------------------+--------------------------------+---------------------------------------+
  | Environment vars validation: missing required var           | `config.js`                                    | Process exits or throws, preventing start.              | (Test) Error thrown.          | Missing config                 | Add validation and error messaging.   |
  | (e.g. TESLA_CLIENT_ID).                                    |                                                |                                                        |                              |                                |                                       |
  +------------------------------------------------------------+------------------------------------------------+--------------------------------------------------------+------------------------------+--------------------------------+---------------------------------------+
  | **Auth middleware**: missing/invalid token                  | `auth.js`                                      | HTTP 401 Unauthorized.                                  | 401 returned.                 | –                              | –                                     |
  +------------------------------------------------------------+------------------------------------------------+--------------------------------------------------------+------------------------------+--------------------------------+---------------------------------------+
  | **WebSocket**: valid mTLS connection (as client)           | TLS setup in `server.js`                       | Successful WebSocket handshake.                         | Connected OK.                 | –                              | –                                     |
  | ([GitHub - teslamotors/fleet-telemetry](https://github.com/teslamotors/fleet-telemetry#:~:text=,that%20a%20vehicle%27s%20TLS%20private)) |                                     |                                                        |                              |                                |                                       |
  +------------------------------------------------------------+------------------------------------------------+--------------------------------------------------------+------------------------------+--------------------------------+---------------------------------------+
  | **WebSocket**: missing client cert                          | TLS setup                                      | Handshake rejected.                                     | (Test) Connection error.      | –                              | –                                     |
  +------------------------------------------------------------+------------------------------------------------+--------------------------------------------------------+------------------------------+--------------------------------+---------------------------------------+
  | **WebSocket**: vehicle streams telemetry after              | Combined server                                | Dashboard receives same data frame.                     | Data forwarded OK.            | –                              | –                                     |
  | `/fleet_telemetry_config` ([GitHub - teslamotors/fleet-telemetry](https://github.com/teslamotors/fleet-telemetry#:~:text=The%20service%20handles%20device%20connectivity,used%20as%20a%20proxy%20for)) |                            |                                                        |                              |                                |                                       |
  +------------------------------------------------------------+------------------------------------------------+--------------------------------------------------------+------------------------------+--------------------------------+---------------------------------------+
  | **WebSocket**: wrong path/protocol handshake                | WebSocket server config                        | Connection refused or closed.                           | (Test) 400 response.         | –                              | –                                     |
  +------------------------------------------------------------+------------------------------------------------+--------------------------------------------------------+------------------------------+--------------------------------+---------------------------------------+
  
  ***(Actual results would be filled in after running tests.)***

