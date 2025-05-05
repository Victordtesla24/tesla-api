<!--
Organization: Public Key Server Requirements
Description: Outlines the implementation details for the server that exposes the application's public key for Tesla virtual key pairing.
Deployment Order: Must be deployed FIRST with proper HTTPS/TLS as required by Tesla's virtual key pairing process.
References:
  • Tesla Virtual Keys Documentation and Pairing Public Key Guide
Note: Do not modify the key content; use the production credentials exactly as provided.

[INTEGRATION AND DEPLOYMENT PLAN]
Project Component: Public Key Server
  - Purpose: Serve the PEM-formatted public key for Tesla virtual key pairing exactly as provided.
  - Deployment: Deploy this microservice FIRST on a secure hosting platform (e.g., Vercel). Ensure the key is available at the exact `.well-known` path required by Tesla.
  - Integration: The Front-End Dashboard will not directly call this, but the Tesla backend will fetch the key during pairing.
  - Credential Usage: Ensure that the public key content from the production environment is used as-is, matching Tesla's official documentation. Requires successful partner registration via API.

Additional Note: No modifications to the actual key content are allowed; any startup or integration errors must fail fast.
-->

<!-- ****************************************** -->
<!-- **DEPLOYMENT ORDER: 1 (Deploy FIRST)**     -->
<!-- ****************************************** -->

## **Tesla Fleet API Web App Implementation Plan**
  
  Below is a step-by-step implementation guide for Phase 1: Public Key Server Deployment and Partner Registration (the first component to implement). It uses Tesla’s official Fleet API documentation for all details and code structure. We will:
      * Verify the PEM-formatted public key at the exact ***`https://public-key-server-tesla.vercel.app/.well-known/appspecific/com.tesla.3p.public-key.pem`*** path is correct and is verify-able by Tesla.
      * Register our domain with Tesla via `POST /api/1/partner_accounts` using a Partner Token.
      * Define environment variables (from the provided `env.txt`) and the project structure.
      * Provide code snippets (`Node.js/Express`) and error handling.
      * Describe testing (including a sample test-report table).

1. **Public Key Server (Deploy First)**

  1.1. **Requirements & Environment**
    * **Objective:** Host the application’s public key `https://public-key-server-tesla.vercel.app/.well-known/appspecific/com.tesla.3p.public-key.pem`. Tesla vehicles will fetch this key during the virtual-key pairing process.
    * **Tesla Doc References:** The public key must be an EC (`prime256v1`) PEM file at the exact path above. After hosting, we must call `POST /api/1/partner_accounts` to register the domain and key with Tesla.
    * **Pre-Requisites:**
      * A Tesla Partner Token (`TESLA_PARTNER_TOKEN`) from developer portal (for partner endpoints) `https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints`.
      * A public/private key pair (`prime256v1`). Tesla has provided the public key PEM in production credentials and it must not be altered.
      * ***The application’s root domain (`https://public-key-server-tesla.vercel.app/`) has already been added in the Tesla’s developer portal as an allowed origin.***

    - Environment Variables (sample from provided `env.txt`):
    ```ini
      NODE_ENV=production
      PUBLIC_KEY_PATH=./keys/public_key.pem               # Path to Tesla public key file (provided).
      WELL_KNOWN_PATH=/.well-known/appspecific/com.tesla.3p.public-key.pem
      TESLA_API_BASE_URL=https://fleet-api.prd.na.vn.cloud.tesla.com/api/1
      TESLA_PARTNER_TOKEN=<YOUR_PARTNER_TOKEN>            # from Tesla Developer
      PUBLIC_KEY_DOMAIN=your.domain.com                  # Your app’s domain (for registration)
    ```
    - These must match the values registered on Tesla’s side (don’t alter the actual key content).

  1.2. **Project Setup**
  - Create a new `Node.js/TypeScript project` for the Public Key Server (even static hosting can be used, `Node/Express` is consistent):

    ```bash
      mkdir public-key-server && cd public-key-server
      npm init -y
      npm install express dotenv
      npm install --save-dev typescript @types/node @types/express
      npx tsc --init
        ```markdown
        **Directory structure:**
        public-key-server/
        ├── env.txt                    # Production env vars (above, without actual secrets)
        ├── package.json
        ├── tsconfig.json
        ├── keys/
        │   └── public_key.pem         # The provided Tesla public key
        └── src/
            ├── index.ts               # Server entry point
            ├── routes/
            │   └── wellKnownRoute.ts  # Handler for GET /.well-known/.../public-key.pem
            ├── services/
            │   └── keyService.ts      # Loads/validates the public key
            └── utils/
                └── logger.ts          # Basic logging
        ```
    ```
    **Note:** If using static hosting (e.g. Vercel), simply place `public_key.pem` at `public/.well-known/appspecific/com.tesla.3p.public-key.pem`.

  1.3. **Serve Public Key at `Well-Known` Path**

    - Implement an Express server that immediately fails if the key is missing or invalid. Use `WELL_KNOWN_PATH` from `env.txt`. For example, in `src/index.ts`:

    ```typescript
      import express from 'express';
      import fs from 'fs';
      import path from 'path';
      import dotenv from 'dotenv';
      import { getPublicKey } from './services/keyService';

      dotenv.config();
      const app = express();
      const PORT = processenv.txt.PORT || 443;

      // Ensure public key loads at startup
        const publicKey = getPublicKey(processenv.txt.PUBLIC_KEY_PATH!);
      if (!publicKey) {
      console.error('Failed to load public key. Exiting.');
      process.exit(1);
      }

      // Route serving the public key exactly at the required path
      app.get(processenv.txt.WELL_KNOWN_PATH!, (_req, res) => {
        res.type('application/x-pem-file').send(publicKey);
      });

      app.listen(PORT, () => {
        console.log(`Public Key Server listening on port ${PORT}`);
      });
    ```

    - In `src/services/keyService.ts`, load the `PEM`:
    
      ```typescript
        import fs from 'fs';

        export function getPublicKey(filePath: string): string | null {
          try {
            const key = fs.readFileSync(filePath, 'utf8');
            // Optionally, validate format (must begin with "-----BEGIN PUBLIC KEY-----")
            if (!key.includes('BEGIN PUBLIC KEY')) throw new Error('Invalid key format');
            return key;
          } catch (err) {
           console.error('Error reading public key:', err);
            return null;
          }
        }
      ```
    * **Error Handling:** On startup, the server should fail fast if the key cannot be read or if critical variables (e.g. `PUBLIC_KEY_PATH`, `WELL_KNOWN_PATH`) are missing `file-vjdr1ggqfgysf7t6lmhiya`
    * **Certificate:** Since we use a hosting provider (like Vercel), TLS is usually handled by the platform. If self-hosting, ensure HTTPS is configured.

    - This setup ensures that a GET request to `https://public-key-server-tesla.vercel.app/.well-known/appspecific/com.tesla.3p.public-key.pem` returns the exact PEM key with content-type `application/x-pem-file file-vjdr1ggqfgysf7t6lmhiya`

  1.4. **Partner Account Registration (`POST /partner_accounts`)**
    
    - After the Public Key Server is live (and the key is accessible at the `well-known URL`), we must register the application’s domain and key with Tesla. This is done by calling the `POST /api/1/partner_accounts` endpoint with a Tesla Partner Token

      1. **Prepare request data:** The body typically includes the domain and (optionally) additional contact info. For example:
        ```json
        {
        "domain": "your.domain.com"
        }
        ```
        (Check if Tesla requires other fields in the body — Tesla’s docs emphasize that the domain must match an allowed origin on `https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens`)

      2. **Authorization: Use Authorization:** Bearer <TESLA_PARTNER_TOKEN> in the header.
    
      3. **Make the API call:** For instance, using axios or node-fetch in a setup script (run after deployment):
        ```typescript
          import axios from 'axios';
          import dotenv from 'dotenv';
          dotenv.config();

          async function registerPartner() {
            try {
              const url = `${processenv.txt.TESLA_API_BASE_URL}/partner_accounts`;
              const resp = await axios.post(
                url,
                { domain: processenv.txt.PUBLIC_KEY_DOMAIN },
                { headers: { Authorization: `Bearer ${processenv.txt.TESLA_PARTNER_TOKEN}` } }
              );
              console.log('Registered domain with Tesla:', resp.data);
            } catch (err: any) {
              console.error('Failed to register partner:', err.response?.data || err.message);
              process.exit(1);
            }
          }

          registerPartner();
        ```

      * **Must be done once after deployment:** Tesla requires this `POST /partner_accounts` call before any virtual key pairing or telemetry configuration. Tesla’s docs warn that failure to register causes an “application not registered” error
      * **Verify registration**:** Tesla also provides a `GET /api/1/partner_accounts/public_key?domain=front-end-one-jet.vercel.app/` endpoint to confirm the key is registered.

  1.5. **Testing & Verification**

    - After deployment, verify the Public Key Server and registration:

    * **Public Key Access Test:** Use curl (or a browser) to `GET` the key URL:
      ```bash
        curl -i https://your.domain.com/.well-known/appspecific/com.tesla.3p.public-key.pem
      ```
    * Expect `HTTP 200` with the PEM contents (should match provided key).
  
     * **Partner Registration Test:** After running the registration script, Tesla should return a success (e.g. `200 OK`). Check Tesla’s portal or use the `GET public_key` partner endpoint to confirm registration.
  
    * **Automated Tests:** You can write tests (e.g. with `Jest/Supertest`) for the server. Example test summary (illustrative):
      +----------------------+---------------------------------+--------------------------------+--------------------------------+------------------+
      | Test Case            | Expected Implementation         | Current Implementation         | Expected Results               | Actual Results   |
      +----------------------+---------------------------------+--------------------------------+--------------------------------+------------------+
      | Serve public key at  | `GET /.well-known/.../`         | Express route at WELL_KNOWN_   | `Status 200`, correct key      |                  |
      | well-known path      | `public-key.pem` returns `PEM`  | PATH sends `public_key.pem`    | content, `content-type`        |                  |
      |                      |                                 |                                | `text/plain`                   |                  |
      +----------------------+---------------------------------+--------------------------------+--------------------------------+------------------+
      | Register domain via  | POST /api/1/partner_accounts    | `Axios POST to ${TESLA_API_`   | `Status 200`, Tesla            |                  |
      | partner API          | with domain in body             | `BASE_URL}/partner_accounts`   | acknowledges domain            |                  |
      |                      |                                 | with partner token             |                                |                  |
      +----------------------+---------------------------------+--------------------------------+--------------------------------+------------------+
      | Fail if key missing  | Server should exit if           | `getPublicKey()` throws error  | Server startup fails with      |                  |
      |                      | `public_key.pem` is unreadable, | if file missing                | error                          |                  |
      |                      | `file-vjdr1ggqfgysf7t6lmhiya`   |                                |                                |                  |
      +----------------------+---------------------------------+--------------------------------+--------------------------------+------------------+
      ***(Actual results would be filled in after running tests.)***