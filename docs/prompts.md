## Prompt 1

🔧 ROLE: Act as a 10×-engineer / senior developer.

🎯 OBJECTIVE: Implement or modify the Public Key Server component based *only* on the requirements specified in `docs/01_public_key_server.md`.

MANDATORY INSTRUCTIONS:
*   **Task**: Your primary goal is to refine the existing implementation or create new implementation *only* for the Public Key Server as described in `docs/01_public_key_server.md`. Keep the code minimal, avoid duplication, and ensure 100% compliance with the Tesla Fleet-API docs referenced within that file and listed below. Absolutely no mock code, credential leaks, or file duplication. Enforce *fail-fast* principles.
*   **1️⃣ Audit & Gap List**:
    *   Compare the current Public Key Server code against the requirements in `docs/01_public_key_server.md`.
    *   List all discrepancies (e.g., PEM file path/serving, content-type, required partner registration steps, fail-fast mechanisms).
    *   Prioritize fixes based on the risk they pose to Tesla pairing/validation according to `docs/01_public_key_server.md`.
*   **Code Fixes**:
    *   Modify code *only* within the directories relevant to the Public Key Server (e.g., `src/publicKeyServer.js`, `src/routes/`, potentially `src/index.js` if relevant for startup). Create new directories *only* if they align with the Vercel/Tesla proposed structure mentioned in the document.
    *   Maintain the existing project tree; add or edit only essential elements for the Public Key Server functionality.
*   **✔ Quality & Standards**:
    *   Ensure code passes linting and type-checking cleanly.
    *   Enforce *fail-fast*: If essential elements like the PEM file specified in `PUBLIC_KEY_PATH`, environment variables (e.g., `TESLA_PARTNER_TOKEN` for registration script), or required paths are missing or invalid, the relevant process (server startup, registration script) must exit with a non-zero status code (exit ≠0).
*   **Developer Mindset**:
    *   Think and operate like a focused senior developer: aim for minimal code churn and maximum reliability for the Public Key Server component.
    *   Do not add extra features or leave unused code related to this component.
    *   Use inline code comments quoting Tesla docs verbatim where it aids clarity for the Public Key Server logic.
    *   Do not modify files or folders outside the scope of the Public Key Server as defined in `docs/01_public_key_server.md`.

**Tesla Fleet API Documentation Reference:**
1.  AUTHENTICATION OVERVIEW: @https://developer.tesla.com/docs/fleet-api/authentication/overview
2.  PARTNER AUTHENTICATION: @https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens
3.  THIRD PARTY TOKENS: @https://developer.tesla.com/docs/fleet-api/authentication/third-party-tokens
4.  PARTNER API ENDPOINT CONFIGURATIONS: @https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints
5.  USER API ENDPOINT CONFIGURATIONS: @https://developer.tesla.com/docs/fleet-api/endpoints/user-endpoints
6.  FLEET TELEMETRY SERVER OVERVIEW: @https://developer.tesla.com/docs/fleet-api/fleet-telemetry
7.  AVAILABLE TELEMETRY DATA: @https://developer.tesla.com/docs/fleet-api/fleet-telemetry/available-data
8.  VIRTUAL KEY CONFIGURATIONS: @https://developer.tesla.com/docs/fleet-api/virtual-keys/overview
9.  DEVELOPER GUIDE: @https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide
10. VEHICLE ENDPOINTS: @https://developer.tesla.com/docs/fleet-api/endpoints/vehicle-endpoints
11. BEST PRACTICES: @https://developer.tesla.com/docs/fleet-api/getting-started/best-practices
12. CONVENTIONS: @https://developer.tesla.com/docs/fleet-api/getting-started/conventions
13. PAIRING PUBLIC KEY TO A VEHICLE: @https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide#adding-to-a-vehicle
14. OAuth SERVER METADATA: @https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/thirdparty/.well-known/openid-configuration

----

## Prompt 2

🔧 ROLE: Act as a 10×-engineer / senior developer.

🎯 OBJECTIVE: Implement or modify the Telemetry Server component based *only* on the requirements specified in `docs/02_telemetry_server.md`.

MANDATORY INSTRUCTIONS:
*   **Task**: Your primary goal is to refine the existing implementation or create new implementation *only* for the Telemetry Server as described in `docs/02_telemetry_server.md`. Keep the code minimal, avoid duplication, and ensure 100% compliance with the Tesla Fleet-API docs referenced within that file and listed below. Absolutely no mock code, credential leaks, or file duplication. Enforce *fail-fast* principles.
*   **1️⃣ Audit & Gap List**:
    *   Compare the current Telemetry Server code (`src/telemetryServer.js`, `src/vehicleServer.js`, `src/dashboardServer.js`, `src/auth.js`, `src/teslaApi.js`, `src/config.js`) against the requirements in `docs/02_telemetry_server.md`.
    *   List all discrepancies (e.g., mTLS options `requestCert`/`rejectUnauthorized`, WebSocket paths, dashboard auth method, telemetry ACK protocol, use of full CA chain in config API call, fail-fast on missing certs/env vars).
    *   Prioritize fixes based on the risk they pose to Tesla telemetry streaming and validation according to `docs/02_telemetry_server.md`.
*   **Code Fixes**:
    *   Modify code *only* within the directories relevant to the Telemetry Server (`src/` directory, potentially `Dockerfile` if build steps are affected). Use the project structure outlined in `docs/02_telemetry_server.md` as a reference.
    *   Maintain the existing project tree; add or edit only essential elements for the Telemetry Server functionality.
*   **✔ Quality & Standards**:
    *   Ensure code passes linting and type-checking cleanly.
    *   Enforce *fail-fast*: If essential elements like TLS certificates (`TLS_*_PATH`), environment variables (e.g., `TESLA_VIN`, `TELEMETRY_HOST`), or required paths are missing or invalid, the server startup process must exit with a non-zero status code (exit ≠0).
*   **Developer Mindset**:
    *   Think and operate like a focused senior developer: aim for minimal code churn and maximum reliability for the Telemetry Server component.
    *   Do not add extra features or leave unused code related to this component.
    *   Use inline code comments quoting Tesla docs verbatim where it aids clarity for the Telemetry Server logic (e.g., mTLS requirements, ACK format).
    *   Do not modify files or folders outside the scope of the Telemetry Server as defined in `docs/02_telemetry_server.md`.

**Tesla Fleet API Documentation Reference:**
1.  AUTHENTICATION OVERVIEW: @https://developer.tesla.com/docs/fleet-api/authentication/overview
2.  PARTNER AUTHENTICATION: @https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens
3.  THIRD PARTY TOKENS: @https://developer.tesla.com/docs/fleet-api/authentication/third-party-tokens
4.  PARTNER API ENDPOINT CONFIGURATIONS: @https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints
5.  USER API ENDPOINT CONFIGURATIONS: @https://developer.tesla.com/docs/fleet-api/endpoints/user-endpoints
6.  FLEET TELEMETRY SERVER OVERVIEW: @https://developer.tesla.com/docs/fleet-api/fleet-telemetry
7.  AVAILABLE TELEMETRY DATA: @https://developer.tesla.com/docs/fleet-api/fleet-telemetry/available-data
8.  VIRTUAL KEY CONFIGURATIONS: @https://developer.tesla.com/docs/fleet-api/virtual-keys/overview
9.  DEVELOPER GUIDE: @https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide
10. VEHICLE ENDPOINTS: @https://developer.tesla.com/docs/fleet-api/endpoints/vehicle-endpoints
11. BEST PRACTICES: @https://developer.tesla.com/docs/fleet-api/getting-started/best-practices
12. CONVENTIONS: @https://developer.tesla.com/docs/fleet-api/getting-started/conventions
13. PAIRING PUBLIC KEY TO A VEHICLE: @https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide#adding-to-a-vehicle
14. OAuth SERVER METADATA: @https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/thirdparty/.well-known/openid-configuration

----

## Prompt 3

🔧 ROLE: Act as a 10×-engineer / senior developer.

🎯 OBJECTIVE: Ensure the application's configuration handling (`src/config.js`) correctly loads, validates, and utilizes *all* variables defined in `env.txt`.

MANDATORY INSTRUCTIONS:
*   **Task**: Your primary goal is to refine the existing configuration loading and validation logic (`src/config.js`) to strictly adhere to the variables present in `env.txt`. Ensure all listed variables are expected and checked, and that default values are applied only where explicitly appropriate or documented (e.g., PORT 443). Enforce *fail-fast* principles for missing required variables or files specified by path variables. Absolutely no mock code or hardcoded credentials.
*   **1️⃣ Audit & Gap List**:
    *   Compare the variables checked and loaded in `src/config.js` against the complete list provided in `env.txt`.
    *   List all discrepancies: missing variable checks, incorrect default values, unnecessary loaded variables, missing file existence checks for path variables (`PUBLIC_KEY_PATH`, `TLS_*_PATH`).
    *   Prioritize fixes ensuring all *required* variables from `env.txt` for both Public Key and Telemetry server operation are validated at startup.
*   **Code Fixes**:
    *   Modify code *only* within `src/config.js`.
    *   Ensure the fail-fast logic checks for the existence of every variable listed in `env.txt` that is critical for server operation (excluding perhaps purely informational ones like `TESLA_USERNAME` if not used directly by the server code).
    *   Verify that path variables like `TLS_KEY_PATH`, `TLS_CERT_PATH`, `TLS_CA_PATH`, `PUBLIC_KEY_PATH` are checked for file existence using `fs.existsSync`.
*   **✔ Quality & Standards**:
    *   Ensure `src/config.js` passes linting and type-checking cleanly.
    *   Enforce *fail-fast*: If any critical variable from `env.txt` is missing, or if a file path variable points to a non-existent file, the server startup process must exit with a non-zero status code (exit ≠0).
*   **Developer Mindset**:
    *   Think and operate like a focused senior developer: ensure the configuration is robust and strictly reflects the expected environment defined by `env.txt`.
    *   Do not add extra features or leave unused configuration logic.
    *   Do not modify files or folders outside `src/config.js`.

**Tesla Fleet API Documentation Reference:**
(Included for context, although primary focus is `env.txt`)
1.  AUTHENTICATION OVERVIEW: @https://developer.tesla.com/docs/fleet-api/authentication/overview
... (rest of the list) ...
14. OAuth SERVER METADATA: @https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/thirdparty/.well-known/openid-configuration

----

## Prompt 4

🔧 ROLE: Act as a 10×-engineer / senior developer.

🎯 OBJECTIVE: Refine the `scripts/fly_secrets_setup.sh` script to reliably and correctly set *all* necessary Fly.io secrets based on the variables present in `env.txt`, ensuring compatibility with Fly.io's secret handling and application restart behavior.

MANDATORY INSTRUCTIONS:
*   **Task**: Your primary goal is to refine the existing `scripts/fly_secrets_setup.sh` script. Ensure it accurately sources variables from `env.txt` (respecting the `.env` symlink), handles values with special characters correctly, sets both file-based (certs, public key) and environment variable secrets, and minimizes application restarts during the process (e.g., using `--stage` followed by a single deploy). The script must be robust and fail clearly if prerequisites (like `env.txt` or `flyctl`) are missing.
*   **1️⃣ Audit & Gap List**:
    *   Compare the script's logic against the variables in `env.txt` and best practices for `flyctl secrets set`.
    *   List all discrepancies: incorrect sourcing/parsing of `env.txt`, mishandling of special characters (like in tokens), missing secrets, inefficient setting causing multiple restarts, inadequate error checking (missing files, `flyctl` not logged in).
    *   Prioritize fixes ensuring all variables needed for the deployed application (as defined by `env.txt` and used in `src/config.js`) are set correctly and the process is reliable.
*   **Code Fixes**:
    *   Modify code *only* within `scripts/fly_secrets_setup.sh`.
    *   Implement robust parsing for `env.txt` that handles various value types and potential special characters.
    *   Use `flyctl secrets set --stage ...` for multiple secrets and follow up with a single `flyctl deploy` or appropriate command to apply staged secrets, minimizing restarts.
    *   Handle file-based secrets (e.g., `TLS_KEY`, `TLS_CERT`, `TLS_CA`, `PUBLIC_KEY`) correctly using file input redirection (`<file:stdin>`).
*   **✔ Quality & Standards**:
    *   Ensure the script is well-commented and follows bash best practices.
    *   Enforce *fail-fast*: The script must exit with a non-zero status code (exit ≠0) if `env.txt` is missing, `flyctl` is not installed or not logged in (when not in dry run), or if any `flyctl` command fails.
*   **Developer Mindset**:
    *   Think and operate like a focused senior developer: aim for a reliable, idempotent (as much as possible) secrets management script.
    *   Do not add extra features beyond setting the required secrets based on `env.txt`.
    *   Use comments to explain complex bash logic or `flyctl` flags.
    *   Do not modify files or folders outside `scripts/fly_secrets_setup.sh`.

**Tesla Fleet API Documentation Reference:**
(Included for context regarding the *purpose* of the secrets being set)
1.  AUTHENTICATION OVERVIEW: @https://developer.tesla.com/docs/fleet-api/authentication/overview
... (rest of the list) ...
14. OAuth SERVER METADATA: @https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/thirdparty/.well-known/openid-configuration


----

## Prompt 5

🔧 ROLE: Act as a 10×-engineer / senior developer.

🎯 OBJECTIVE: Refine the `deploy_fly.sh` script to provide a complete, robust, and reliable deployment pipeline for the Fly.io Telemetry Server, including pre-flight checks, build, secrets update, deployment, and post-deployment verification.

MANDATORY INSTRUCTIONS:
*   **Task**: Your primary goal is to refine the existing `deploy_fly.sh` script. Ensure it executes the following steps in order: Verify local TLS cert validity (`openssl`), build the Docker image remotely (`flyctl ... --build-only`), run the secrets setup script (`scripts/fly_secrets_setup.sh`), deploy the application (`flyctl deploy ...`), and perform post-deploy checks (mTLS handshake via `openssl s_client`, telemetry config sync via `scripts/verify_config.js`). The script must handle errors gracefully at each step and provide clear progress indicators.
*   **1️⃣ Audit & Gap List**:
    *   Compare the script's current steps and commands against the desired deployment workflow.
    *   List all discrepancies: missing steps, incorrect `flyctl` flags (e.g., not using `--remote-only` where appropriate, incorrect deployment strategy), insufficient certificate validation, missing post-deployment checks, inadequate error handling (`set -e` might be too blunt, consider trapping errors), unclear progress/output.
    *   Prioritize fixes ensuring a smooth, verifiable deployment process.
*   **Code Fixes**:
    *   Modify code *only* within `deploy_fly.sh`.
    *   Ensure the certificate validation steps use appropriate `openssl` commands (`pkey -check`, `x509 -noout`).
    *   Use correct `flyctl deploy` flags: `--remote-only --build-only` for the build step, `--remote-only` (with appropriate strategy like `immediate` or `rolling`) for the deployment step.
    *   Call the `scripts/fly_secrets_setup.sh` script correctly.
    *   Implement the post-deployment checks using `openssl s_client` (ensure correct flags for mTLS check if possible, or at least basic TLS check) and the `scripts/verify_config.js` node script.
    *   Improve error handling beyond just `set -e` if needed, provide informative messages on failure.
*   **✔ Quality & Standards**:
    *   Ensure the script is well-commented, readable, and uses clear variable names.
    *   Enforce *fail-fast*: Each step must check for success, and the script must exit with a non-zero status code (exit ≠0) immediately upon failure, printing relevant logs or error messages.
    *   Provide user feedback (e.g., using `echo` or the existing spinner) for each major step.
*   **Developer Mindset**:
    *   Think and operate like a focused senior developer: build a reliable deployment script that minimizes manual intervention and provides clear feedback.
    *   Do not add unnecessary complexity.
    *   Ensure all external script dependencies (`fly_secrets_setup.sh`, `verify_config.js`) are correctly invoked.
    *   Do not modify files or folders outside `deploy_fly.sh`.

**Tesla Fleet API Documentation Reference:**
(Included for context regarding the *purpose* of the application being deployed)
1.  AUTHENTICATION OVERVIEW: @https://developer.tesla.com/docs/fleet-api/authentication/overview
... (rest of the list) ...
14. OAuth SERVER METADATA: @https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/thirdparty/.well-known/openid-configuration

----

## Prompt 6

🔧 ROLE: Act as a 10×-engineer / senior QA engineer.

🎯 OBJECTIVE: Refine the `smoke.sh` script to perform quick, essential post-deployment checks on the live Public Key Server and Telemetry Server endpoints.

MANDATORY INSTRUCTIONS:
*   **Task**: Your primary goal is to refine the existing `smoke.sh` script. Ensure it correctly sources necessary URLs/tokens from `.env`, performs the specified checks (Public Key URL via `curl`, Telemetry Server TLS via `openssl s_client`, Dashboard WebSocket via `wscat`), and provides clear pass/fail output for each check. The script must fail immediately if any check fails.
*   **1️⃣ Audit & Gap List**:
    *   Compare the script's current checks and commands against the objective.
    *   List all discrepancies: incorrect URL/hostname parsing from `.env` variables, incorrect `curl` flags (e.g., not checking for HTTP 200 properly), incorrect `openssl s_client` flags (e.g., missing `-servername`, not checking verify code), incorrect `wscat` command (e.g., wrong URL structure, insufficient timeout, incorrect check for welcome message, issues with token variable).
    *   Prioritize fixes ensuring each smoke check accurately targets the intended service and validates the core expected behavior.
*   **Code Fixes**:
    *   Modify code *only* within `smoke.sh`.
    *   Implement robust sourcing and parsing of required variables (`PUBLIC_KEY_SERVER_URL`, `PUBLIC_KEY_PATH`, `TELEMETRY_HOST`, `PORT`, `TELEMETRY_SERVER_URL`, `TESLA_PARTNER_TOKEN` or a dedicated test user token) from `.env`.
    *   Use correct `curl` flags (e.g., `-I --fail` or check `http_code`) to validate the Public Key URL status.
    *   Use correct `openssl s_client` flags (e.g., `-connect <host>:<port> -servername <host>`) and check the output for `Verify return code: 0 (ok)`. Consider using `-CAfile` if testing against a known CA.
    *   Use correct `wscat` flags (e.g., `-c <url>`, timeout flags `-w`, `--connect-timeout`, potentially `-x` to send a ping if needed to keep connection open for welcome message) and reliably `grep` for the expected welcome message structure. Handle the dashboard token correctly.
*   **✔ Quality & Standards**:
    *   Ensure the script is well-commented and uses clear variable names.
    *   Enforce *fail-fast*: The script must exit with a non-zero status code (exit ≠0) immediately upon the failure of any check, printing relevant logs or error messages.
    *   Provide clear `echo` output indicating which test is running and whether it passed or failed.
*   **Developer Mindset**:
    *   Think and operate like a focused senior QA engineer: create fast, reliable checks for the most critical service functionalities.
    *   Do not add complex logic beyond the basic checks.
    *   Ensure dependencies like `curl`, `openssl`, and `wscat` are checked for existence.
    *   Do not modify files or folders outside `smoke.sh`.

**Tesla Fleet API Documentation Reference:**
(Included for context regarding the services being smoke tested)
1.  AUTHENTICATION OVERVIEW: @https://developer.tesla.com/docs/fleet-api/authentication/overview
... (rest of the list) ...
14. OAuth SERVER METADATA: @https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/thirdparty/.well-known/openid-configuration

----

## Prompt 7

🔧 ROLE: Act as a **Senior QA Engineer / Automation Engineer**.

🎯 OBJECTIVE: Create a comprehensive test suite for the Tesla Fleet API integration project (Public Key Server & Telemetry Server), ensuring **exact** implementation adherence to the requirements outlined in `docs/01_public_key_server.md`, `docs/02_telemetry_server.md`, and the referenced Tesla Fleet API documentation.

MANDATORY INSTRUCTIONS:
*   **Task**: Build a multi-layered test suite using Jest. The suite must verify the functionality, integration, and robustness of the system. Use mocks (`nock`, `ws`, `fs`, module mocks) judiciously, primarily for isolating components or simulating external dependencies (Tesla API, WebSocket clients), but prioritize integration tests that exercise real code paths where feasible. Ensure tests cover fail-fast mechanisms, error handling, and adherence to specified protocols (mTLS, WebSocket ACK, API request/response formats).
*   **Scope**: Tests should validate the behavior described in `docs/01_public_key_server.md` and `docs/02_telemetry_server.md`.
*   **✔ Quality & Standards**:
    *   All test code must pass linting and type-checking cleanly.
    *   Tests must be placed in the appropriate directories (`/test/unit`, `/test/integration`, `/test/component`, `/test/regression`).
    *   Tests should have descriptive names (`describe`, `it`).
    *   Fail-fast expectation checks: Tests must explicitly verify that the application exits/throws errors when required prerequisites (env vars, files) are missing.
*   **Developer Mindset**:
    *   Think and operate like a focused senior QA engineer: aim for high coverage of critical paths and requirements, ensure tests are reliable and maintainable.
    *   Use helper functions or fixtures to reduce test code duplication where appropriate.

**SPECIFIC TEST TYPE IMPLEMENTATIONS:**

**(Create files under `/test/unit/`)**
*   **Unit Tests**:
    *   **Objective**: Test individual functions/modules in isolation.
    *   **Target Files**: `src/config.js`, `src/auth.js`, `src/teslaApi.js`, potentially helper functions within `src/vehicleServer.js` or `src/dashboardServer.js` if refactored for testability.
    *   **Methodology**: Use Jest mocks (`jest.mock`, `jest.fn`, `jest.spyOn`) to isolate the unit under test. For `teslaApi.js`, use `nock` to mock HTTP requests to Tesla endpoints. For `config.js`, mock `fs` and `process.env`.
    *   **Coverage**: Verify logic for environment variable loading/validation, default values, token validation logic (mocking API calls), partner token fetching/caching logic (mocking API calls), telemetry config API call construction (mocking API calls), message ID generation, ACK message formatting. Ensure all fail-fast conditions (missing env vars) are tested.

**(Create files under `/test/component/`)**
*   **Component Tests**:
    *   **Objective**: Test modules or logical components slightly above unit level, focusing on interactions within a limited scope.
    *   **Target Components**:
        1.  TLS Bootstrap (Certificate loading logic within `telemetryServer.js` startup).
        2.  VehicleServer Message Handling (WebSocket message parsing -> ACK + callback logic).
        3.  DashboardServer Authentication (WebSocket connection -> token extraction -> auth call -> accept/reject logic).
    *   **Methodology**: Use Jest mocks (`jest.mock`, `jest.fn`) to simulate dependencies *outside* the component being tested. For TLS, mock `fs`. For WebSocket servers, mock the `ws` library's `Server` and `client` objects or use dependency injection if the handlers are refactored. For Dashboard auth, mock the `auth.js` module.
    *   **Coverage**: Verify certificate files are checked and read correctly (TLS). Verify correct parsing of valid/invalid JSON, correct ACK generation, and callback invocation (VehicleServer). Verify token extraction from URL/header, correct call to the (mocked) auth validator, and appropriate connection closing or welcome message sending (DashboardServer).

**(Create files under `/test/integration/`)**
*   **Integration Tests**:
    *   **Objective**: Test the interaction between different parts of the Telemetry Server and its interaction with mocked external services (Tesla API).
    *   **Target Flow**: Start the actual Node.js Telemetry Server on an ephemeral port. Test the full vehicle -> server -> dashboard data flow. Test server endpoints that trigger Tesla API calls.
    *   **Methodology**: Use `jest`. Start the server (`require('../../src/telemetryServer')` after setting up mocks). Use `nock` to mock *all* required Tesla API endpoints (OAuth token, telemetry config POST, telemetry errors GET, vehicles GET for auth). Use the real `ws` library to create actual WebSocket clients for simulating vehicle and dashboard connections. Use `https` requests for the `/health` check.
    *   **Coverage**: Verify the `/health` endpoint responds correctly. Simulate a vehicle WS connection (mTLS might need `rejectUnauthorized: false` for testing simplicity unless test certs are properly set up), send a message, simulate a dashboard WS connection (with a valid token mocked via `nock` for the `/vehicles` endpoint), verify the dashboard client receives the vehicle message, and verify the vehicle client receives the ACK. Verify that the necessary API calls (mocked by `nock`) were made during server startup (token fetch, telemetry config). Test sad paths for API calls (e.g., telemetry config fails).

**(Create/Update files under `/test/regression/`)**
*   **Regression Tests**:
    *   **Objective**: Ensure previously fixed bugs do not reappear.
    *   **Methodology**: Add a test case for each significant past bug. Use `Jest`. For data structure bugs, use `Ajv` with a JSON schema snapshot (`telemetryDataSchema`) to validate incoming/outgoing data formats. For behavioral bugs, replicate the specific conditions using unit, component, or integration testing techniques (mocks, specific inputs) as appropriate for the original bug.
    *   **Coverage**: Focus on specific bug scenarios. Examples: incorrect data type handling, missing required fields (update schema accordingly), null value handling, specific authentication failures, race conditions (if applicable), error handling paths. Use descriptive names `it('should not recreate bug-XYZ: description')`.

**(Create/Update `smoke.sh`)**
*   **Smoke Tests**:
    *   **Objective**: Perform quick, basic checks after deployment to verify core functionality is available.
    *   **Methodology**: Use a bash script (`smoke.sh`) with standard command-line tools (`curl`, `openssl`, `wscat`). Source configuration from `.env`.
    *   **Coverage**: Check Public Key Server URL returns HTTP 200. Check Telemetry Server basic TLS handshake (`openssl s_client`). Check Dashboard WebSocket connection using `wscat` with a (potentially placeholder) token and verify the initial "Connected" message. The script must exit non-zero on any failure.

**Tesla Fleet API Documentation Reference:**
1.  AUTHENTICATION OVERVIEW: @https://developer.tesla.com/docs/fleet-api/authentication/overview
2.  PARTNER AUTHENTICATION: @https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens
3.  THIRD PARTY TOKENS: @https://developer.tesla.com/docs/fleet-api/authentication/third-party-tokens
4.  PARTNER API ENDPOINT CONFIGURATIONS: @https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints
5.  USER API ENDPOINT CONFIGURATIONS: @https://developer.tesla.com/docs/fleet-api/endpoints/user-endpoints
6.  FLEET TELEMETRY SERVER OVERVIEW: @https://developer.tesla.com/docs/fleet-api/fleet-telemetry
7.  AVAILABLE TELEMETRY DATA: @https://developer.tesla.com/docs/fleet-api/fleet-telemetry/available-data
8.  VIRTUAL KEY CONFIGURATIONS: @https://developer.tesla.com/docs/fleet-api/virtual-keys/overview
9.  DEVELOPER GUIDE: @https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide
10. VEHICLE ENDPOINTS: @https://developer.tesla.com/docs/fleet-api/endpoints/vehicle-endpoints
11. BEST PRACTICES: @https://developer.tesla.com/docs/fleet-api/getting-started/best-practices
12. CONVENTIONS: @https://developer.tesla.com/docs/fleet-api/getting-started/conventions
13. PAIRING PUBLIC KEY TO A VEHICLE: @https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide#adding-to-a-vehicle
14. OAuth SERVER METADATA: @https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/thirdparty/.well-known/openid-configuration

----

# Execution Prompts

## Prompt 1

🔧 ROLE: Act as a 10×-engineer / senior developer.

🎯 OBJECTIVE: Review, analyze, and validate the project's environment configuration based on `env.txt` against the requirements in `docs/01_public_key_server.md`, `docs/02_telemetry_server.md`, and `docs/00_integration_plan.md`. Identify discrepancies, ensure all prerequisites for deployment are met, and provide necessary instructions for manual configuration (like Tesla Portal updates).

MANDATORY INSTRUCTIONS:
*   **Task**: Your primary goal is to meticulously audit the `env.txt` file (and its `.env` symlink). Compare the variables present and their values against the requirements derived from the codebase (`src/config.js`, `scripts/*`) and the attached documentation (`docs/*.md`). Identify any missing, incorrect, or potentially problematic (e.g., placeholder) environment variables needed for *both* the Vercel (Public Key) and Fly.io (Telemetry) deployments, as well as any referenced web app deployment. Suggest updates to scripts in the `@scripts` directory *only if* they are designed to fetch or derive environment variables (this is unlikely for core secrets). Enforce *fail-fast* principles by ensuring checks for these variables exist in configuration loading (`src/config.js`).
*   **1️⃣ Audit & Gap List**:
    *   Compare variables in `env.txt` against those explicitly required or referenced in `docs/01_public_key_server.md`, `docs/02_telemetry_server.md`, `docs/00_integration_plan.md`, `src/config.js`, and relevant scripts (`fly_secrets_setup.sh`, `deploy_fly.sh`, `smoke.sh`).
    *   List all missing required variables.
    *   List all variables with placeholder values (like `YOUR_..._HERE`) that need real values.
    *   List any inconsistencies found (e.g., `TELEMETRY_HOST` in `env.txt` vs. hostname used in `fly.toml` app name if different).
    *   Verify file paths specified in env vars (e.g., `PUBLIC_KEY_PATH`, `TLS_*_PATH`) point to existing files within the project structure (relative to the project root).
*   **Tesla Portal Configuration**:
    *   Based *only* on the requirements found in the attached documentation (especially `docs/01_public_key_server.md` and `docs/00_integration_plan.md`), generate a clear, specific, and accurate list of configurations that the user *must* ensure are set correctly in their Tesla API Developer Portal for the application (`RIDE-WITH-VIC`, Client ID `0bd6ccd5-9d71-49f9-a45d-8a261192c7df`) to function in production. This includes:
        *   Allowed Origin(s) (Referencing `PUBLIC_KEY_SERVER_URL`)
        *   Allowed Redirect URI(s) (Referencing relevant OAuth URIs like `NEXT_PUBLIC_TESLA_REDIRECT_URI`)
        *   Correct OAuth Grant Types (`client_credentials`, `authorization_code`)
        *   Correctly registered domain for the Public Key (`PUBLIC_KEY_SERVER_URL`'s domain).
*   **Code Fixes**:
    *   If `src/config.js` is missing checks for critical environment variables identified during the audit, update it to include these checks and ensure it fails fast (exits non-zero) if they are missing at runtime.
    *   If any script in `@scripts` is designed to *derive* an environment variable (e.g., constructing a URL) and does so incorrectly based on `env.txt`, propose fixes for that script. Do *not* add code to fetch secrets.
*   **✔ Quality & Standards**:
    *   Ensure any modifications to `src/config.js` pass linting and type-checking.
    *   Strictly enforce *fail-fast*: The primary goal is to ensure the configuration loading is robust and will prevent the application from starting with missing critical environment variables or files.
*   **Developer Mindset**:
    *   Think and operate like a focused senior developer verifying a deployment checklist. Be precise and thorough in the audit.
    *   Do not add extra features or configuration options not specified.
    *   Use inline code comments quoting Tesla docs or specific requirements where it aids clarity in `src/config.js` changes.
    *   Do not modify files outside `src/config.js` or potentially relevant scripts in `@scripts`. Do not create new files unless updating a script requires it.

**Tesla Fleet API Documentation Reference:**
1.  AUTHENTICATION OVERVIEW: @https://developer.tesla.com/docs/fleet-api/authentication/overview
2.  PARTNER AUTHENTICATION: @https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens
... (rest of the list) ...
14. OAuth SERVER METADATA: @https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/thirdparty/.well-known/openid-configuration

---

## Prompt 2

🔧 ROLE: Act as a 10×-engineer / senior QA engineer.

🎯 OBJECTIVE: Run, Execute the project's test suites (unit, integration, component, regression) using the production environment variables validated in the previous step (sourced from `env.txt`). Report the results clearly.

MANDATORY INSTRUCTIONS:
*   **Task**: Run, Execute all available test suites defined in `package.json` (`test`, `test:unit`, `test:integration`, `test:regression`, `test:component` if defined) and potentially `smoke.sh`. Ensure the tests are executed in an environment where they can correctly access the production variables defined in `.env` (which is symlinked to `env.txt`). Do *not* modify test files to use mock/dummy credentials; the goal is to test against the *real* configuration setup (though external API calls will still be mocked by `nock` where applicable in unit/integration tests, and `smoke.sh` hits live endpoints).
*   **Execution**:
    *   Run `npm run test:unit`.
    *   Run `npm run test:component` (if script exists).
    *   Run `npm run test:integration`.
    *   Run `npm run test:regression`.
    *   Run `bash smoke.sh` (if appropriate at this stage - requires live endpoints).
*   **Reporting**:
    *   Clearly report the pass/fail status of each test suite executed.
    *   Include the summary output from Jest (number of tests passed/failed).
    *   If any tests fail, provide the detailed error output for those specific failures.
*   **✔ Quality & Standards**:
    *   Execute the tests exactly as configured in `package.json`.
    *   Ensure the environment is correctly configured so tests use the intended variables from `.env`.
*   **Developer Mindset**:
    *   Operate like a QA engineer running a test pass. Focus on accurate execution and clear reporting of results.
    *   Do not attempt to fix errors in this step; simply report them.

**Tesla Fleet API Documentation Reference:**
(Provided for context on the features being tested)
1.  AUTHENTICATION OVERVIEW: @https://developer.tesla.com/docs/fleet-api/authentication/overview
... (rest of the list) ...
14. OAuth SERVER METADATA: @https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/thirdparty/.well-known/openid-configuration

---

## Prompt 3

🔧 ROLE: Act as a 10×-engineer / senior developer.

🎯 OBJECTIVE: Analyze the test failures and any remaining errors/warnings (including Linter/TypeScript issues) reported in the previous steps. Apply and Implement fixes by strictly following the provided protocols (`my-error-fixing-protocols.mdc`, `my-directory-management-protocols.mdc`) until all tests pass and no errors or warnings remain.

MANDATORY INSTRUCTIONS:
*   **Task**: Your primary goal is to achieve a clean state with zero errors, warnings, or unmet requirements. Analyze the root cause of each reported test failure, linter warning, or TypeScript error. Use runtime logs (`fly logs -a <app_name>`, `vercel logs <deployment_url>`) if the error originates from deployed instances during testing (like smoke tests or post-deploy checks). Adhere *strictly* to the algorithms and constraints defined in `my-error-fixing-protocols.mdc` and `my-directory-management-protocols.mdc`. Apply minimal, targeted code modifications to fix the identified root causes. Iterate (apply fix, re-test using Prompt 2) until all issues are resolved. Do *not* use mock/test credentials or variables; rely solely on the production values in `env.txt`. Avoid file/code duplication.
*   **Input**: Assume the user will provide the specific error messages, test failure outputs, linter/TS warnings, or relevant runtime logs.
*   **Error Analysis & Fixing**:
    *   For each issue, perform Root Cause Analysis (RCA) as per `my-error-fixing-protocols.mdc`.
    *   Consult relevant documentation (`docs/*.md`, Tesla API docs) to ensure the fix aligns with requirements.
    *   Apply the **minimal** code change necessary. If related to imports or file structure, apply the **Directory Management Protocol** rules.
    *   Use the **Recursive Error Resolution Algorithm**: Attempt a fix (Attempt 1), verify. If it fails, refine (Attempt 2), verify. If it still fails, use web search (@web) *only* as a last resort for alternative solutions, compare, and implement the *most optimal* fix (Attempt 3).
    *   Strictly adhere to the **Code Modifications & Replacement Protocol** constraints (no placeholders, atomic changes, max 2 direct attempts before web search).
*   **✔ Quality & Standards**:
    *   All fixes must pass linting and type-checking.
    *   Ensure fixes do not introduce regressions (re-run relevant tests).
    *   The final state must have zero errors or warnings from tests, linters, and TypeScript.
*   **Developer Mindset**:
    *   Operate with a "Fail Fast" and iterative mindset as described in the protocols. Be methodical in debugging and fixing.
    *   Prioritize stability and compliance with the specifications.
    *   Document non-trivial fixes with comments explaining the rationale.

**Tesla Fleet API Documentation Reference:**
1.  AUTHENTICATION OVERVIEW: @https://developer.tesla.com/docs/fleet-api/authentication/overview
... (rest of the list) ...
14. OAuth SERVER METADATA: @https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/thirdparty/.well-known/openid-configuration

---

## Prompt 4

🔧 ROLE: Act as a 10×-engineer / senior developer.

🎯 OBJECTIVE: Deploy the Telemetry Server to Fly.io and the Public Key Server component to Vercel using the validated production configuration and codebase.

MANDATORY INSTRUCTIONS:
*   **Task**: Execute the deployment process for the backend services. For Fly.io, use the refined `deploy_fly.sh` script which includes build, secrets, deploy, and verification steps. For Vercel, use the `vercel CLI` commands appropriate for deploying the Public Key server component (likely deploying the project root but leveraging `vercel.json` to configure the public key serving). Ensure the correct production environment variables (sourced from `env.txt`) are used by the deployment tools.
*   **Deployment Steps**:
    *   **Fly.io (Telemetry Server)**:
        *   Execute `bash deploy_fly.sh -a tesla-telemetry-server-2` (assuming the script takes the app name as an argument, otherwise adjust).
        *   Monitor the script's output for successful completion of all its internal steps (cert check, build, secrets, deploy, post-deploy checks).
    *   **Vercel (Public Key Server)**:
        *   Determine the correct `vercel deploy` command. Based on `vercel.json`, it seems deploying the project root might be correct: `vercel deploy --prod --env NODE_ENV=production --build-env SERVER_TYPE=publickey --yes`. Confirm this targets the intended setup.
        *   Ensure necessary Vercel environment variables (like `PUBLIC_KEY_PATH`, `PUBLIC_KEY_SERVER_URL`) are set in the Vercel project settings (this should have been covered by Prompt 1 audit, but confirm command usage).
        *   Execute the `vercel deploy --prod ...` command.
        *   Monitor the deployment output for success and verify the deployment URL.
*   **✔ Quality & Standards**:
    *   Deploy only the code that has passed all tests and checks from the previous steps.
    *   Use the production environment settings defined in `env.txt` via the respective deployment tools/scripts.
    *   Handle any deployment errors by analyzing logs (`fly logs`, `vercel logs`) and referring back to the Error Fixing prompt/protocol if necessary.
*   **Developer Mindset**:
    *   Operate like a DevOps engineer executing a production deployment. Focus on clean execution and verification.
    *   Do not introduce any changes during the deployment process itself.

**Tesla Fleet API Documentation Reference:**
(Provided for context on the services being deployed)
1.  AUTHENTICATION OVERVIEW: @https://developer.tesla.com/docs/fleet-api/authentication/overview
... (rest of the list) ...
14. OAuth SERVER METADATA: @https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/thirdparty/.well-known/openid-configuration

---

## Prompt 5

🔧 ROLE: Act as a 10×-engineer / senior developer.

🎯 OBJECTIVE: Deploy the main web application (presumably the Next.js frontend) to Vercel production using the validated production configuration.

MANDATORY INSTRUCTIONS:
*   **Task**: Execute the Vercel deployment for the primary web application. This assumes the web app code exists (likely at the project root or a sub-directory like `/webapp` or `/frontend` - clarify if needed) and is configured for Vercel deployment. Use the `vercel CLI` with the `--prod` flag.
*   **Deployment Steps**:
    *   Identify the correct directory containing the web application if it's not the project root.
    *   Ensure all necessary environment variables for the web app (e.g., `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_*` variables from `env.txt`) are configured in the Vercel project settings.
    *   Execute `vercel deploy --prod --yes` (potentially from the web app's subdirectory if applicable).
    *   Monitor the deployment output for success and note the final production URL.
*   **✔ Quality & Standards**:
    *   Deploy only the code intended for the web application frontend.
    *   Ensure the deployment uses the correct production environment variables set within the Vercel platform.
    *   Verify the deployment URL is accessible after completion.
*   **Developer Mindset**:
    *   Focus on deploying the frontend application component cleanly to production.
    *   Address any Vercel-specific build or deployment errors by analyzing logs and potentially iterating with the Error Fixing prompt if code changes are required.

**Tesla Fleet API Documentation Reference:**
(Provided for context on the APIs the web app will interact with)
1.  AUTHENTICATION OVERVIEW: @https://developer.tesla.com/docs/fleet-api/authentication/overview
... (rest of the list) ...
14. OAuth SERVER METADATA: @https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/thirdparty/.well-known/openid-configuration

---

## Prompt 6

🔧 ROLE: Act as a 10×-engineer / senior QA engineer.

🎯 OBJECTIVE: Perform final end-to-end verification and smoke tests now that all components (Public Key Server, Telemetry Server, Web App) are deployed to their respective production environments.

MANDATORY INSTRUCTIONS:
*   **Task**: Your primary goal is to confirm the entire system is functioning as expected in production. Execute the `smoke.sh` script again, ensuring it targets the *production* URLs defined in `env.txt`. Manually perform a basic end-to-end test if feasible: attempt to log in via the deployed web app's Tesla OAuth flow, verify if the dashboard connects to the telemetry WebSocket, and check if basic telemetry data appears (if a vehicle is paired and streaming).
*   **Verification Steps**:
    *   Run `bash smoke.sh`. Ensure all checks pass against the live production endpoints.
    *   (Manual Check Recommended) Access the deployed web application URL. Attempt the Tesla login/authorization flow. If successful, navigate to the vehicle dashboard page. Observe if the WebSocket connection to the telemetry server is established and if any data appears (even if it's just a "waiting for data" message initially).
*   **Reporting**:
    *   Report the results of `smoke.sh`.
    *   Report the outcome of the manual end-to-end check (Login successful? Dashboard connected? Data appearing?).
    *   Declare the process "FULLY & COMPLETELY" finished only if all checks pass. If any step fails, report the failure clearly and revert to the Error Fixing Cycle (Prompt 3).
*   **✔ Quality & Standards**:
    *   All checks must use the final production URLs and configuration.
    *   Verification should confirm basic connectivity and data flow between the deployed components.
*   **Developer Mindset**:
    *   Think like QA performing final sign-off. Be thorough in checking the integration points.

**Tesla Fleet API Documentation Reference:**
1.  AUTHENTICATION OVERVIEW: @https://developer.tesla.com/docs/fleet-api/authentication/overview
... (rest of the list) ...
14. OAuth SERVER METADATA: @https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/thirdparty/.well-known/openid-configuration

---

# **Deployment Prompts:** ***00_integration_plan.md***

## **Prompt 1**
 **Role:** You are a Senior Software Engineer specializing in cloud application development, API integration, and Tesla Fleet API solutions.

 **Context:**
    *   **Working Directory:** `/Users/Shared/cursor/tesla-api/frontend`
    *   **Goal:** Finalize the implementation and verification of the Tesla OAuth authentication flow within the Next.js frontend application. This builds upon previous attempts to fix redirect issues.
    *   **Current State:** The frontend application (`@frontend`) needs to correctly handle the entire Tesla OAuth flow, from initiating login to obtaining and managing session tokens via NextAuth, using the live Tesla authentication service. Previous fixes have been applied to `middleware.js`, `login/page.js`, `setup-env.js`, and `api/auth/callback/tesla/route.js`.
    *   **Live Backend Services:**
        *   Telemetry Server: `wss://tesla-telemetry-server.fly.dev/ws`
        *   Public Key Server: `https://public-key-server-tesla.vercel.app/`
    *   **Documentation:** `docs/00_integration_plan.md` outlines the overall architecture.

 **Requirements:**
    *   Use **only** the production environment variables defined in `/Users/Shared/cursor/tesla-api/env.txt`. Ensure `setup-env.js` correctly copies and potentially transforms necessary variables (like `TESLA_AUTH_URL`, `TESLA_TOKEN_URL`, `TESLA_CLIENT_ID`, `TESLA_CLIENT_SECRET`, `TESLA_REDIRECT_URI`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`) into `.env.local`. Pay special attention to `NEXT_PUBLIC_*` variables needed client-side.
    *   Adhere strictly to `my-error-fixing-protocols.mdc` and `my-directory-management-protocols.mdc`.

 **Tasks:**
    1.  **Analyze Current Implementation:** Review the existing authentication-related files:
        *   `frontend/setup-env.js`: Verify it correctly copies all necessary auth variables from `env.txt` to `.env.local`, including `NEXT_PUBLIC_TESLA_AUTH_URL`, `NEXT_PUBLIC_TESLA_CLIENT_ID`, `NEXT_PUBLIC_TESLA_REDIRECT_URI`. Ensure `NEXTAUTH_URL` is set to `http://localhost:3000` for local development runs initiated by `npm run dev`.
        *   `frontend/app/login/page.js`: Ensure it correctly constructs the Tesla authorization URL using `NEXT_PUBLIC_*` variables and redirects the user. Verify state parameter handling for CSRF protection.
        *   `frontend/app/api/auth/callback/tesla/route.js`: Confirm it correctly receives the callback from Tesla, extracts the `code` and `state`, and redirects to the NextAuth provider (`/api/auth/callback/tesla`).
        *   `frontend/app/api/auth/[...nextauth]/route.js`: Critically review the `tesla` `CredentialsProvider`. Ensure the `authorize` function correctly handles the code exchange with `TESLA_TOKEN_URL` using `TESLA_CLIENT_ID`, `TESLA_CLIENT_SECRET`, and `TESLA_REDIRECT_URI`. Verify it fetches user/vehicle data (handling potential errors) and returns the correct user object structure. Confirm the `jwt` callback handles token refresh correctly using the `refresh_token` grant type. Ensure the `session` callback exposes necessary data (like `accessToken`, `vehicle`) to the frontend session object.
        *   `frontend/middleware.js`: Verify the logic correctly protects routes (`/dashboard`) and handles redirects between `/login` and `/` or `/dashboard` based on authentication status, avoiding loops. Ensure the `matcher` config is appropriate.
        *   `frontend/app/providers.js`: Ensure the NextAuth `SessionProvider` wraps the application layout.
    2.  **Implement Necessary Fixes:** Based on the analysis and Tesla documentation, apply required code modifications to the files listed above to ensure the OAuth flow functions correctly with the production configuration. Focus on:
        *   Correct environment variable usage (`process.env.VAR_NAME`).
        *   Accurate Tesla API endpoint calls (token exchange, user info, vehicle info).
        *   Proper error handling throughout the flow (e.g., failed token exchange, API errors).
        *   Secure handling of tokens and session state via NextAuth callbacks.
    3.  **Consider Task Finished ONLY WHEN:** The entire authentication flow is implemented correctly, tested, and verified against the live Tesla service using production credentials, and all errors are resolved.

 **Deliverables:**
    *   Modified source code files within the `@frontend` directory reflecting the fixes.
    *   A single Test Summary report detailing the verification steps and outcomes.

 **Testing/Error Fixing:**
    1.  Run the frontend locally (`npm run dev`).
    2.  Attempt to access `http://localhost:3000/dashboard`. Verify you are redirected to `/login`.
    3.  Click the "Sign in with Tesla" button. Verify you are redirected to the live Tesla OAuth page.
    4.  Log in with valid Tesla credentials (provided in `env.txt` if needed for testing, or use your own).
    5.  Verify you are redirected back to the application (specifically `/api/auth/callback/tesla`, then to NextAuth, and finally likely to `/dashboard`).
    6.  Verify that you are successfully logged in and viewing the `/dashboard` page (even if it's currently empty or basic).
    7.  Check the browser's developer console and the `npm run dev` terminal output for any errors during the process.
    8.  **Error Fixing:** If any errors (redirect loops, failed API calls, NextAuth errors, console errors) occur, identify the root cause by analyzing logs and code, apply fixes following `my-error-fixing-protocols.mdc`, and **re-run all tests** to validate the fix. Document the error, root cause, fix, and verification in the Test Summary.

 **QA:**
    *   **NO MOCKUPS:** All interactions must be with the live Tesla OAuth service.
    *   **NO DUPLICATION:** Modify existing files; do not create duplicate components or logic. Follow `my-directory-management-protocols.mdc`.
    *   **PRODUCTION ENV:** Use only variables from `env.txt`.

 **Tesla Fleet API Documentation References:**
    *   [Authentication Overview](https://developer.tesla.com/docs/fleet-api/authentication/overview)
    *   [Third Party Tokens (relevant for Auth Code Flow)](https://developer.tesla.com/docs/fleet-api/authentication/third-party-tokens)
    *   [User API Endpoints (`/user/me`, `/vehicles`)](https://developer.tesla.com/docs/fleet-api/endpoints/user-endpoints)
    *   [Conventions (State Parameter)](https://developer.tesla.com/docs/fleet-api/getting-started/conventions)
    *   [OAuth Server Metadata (Endpoints like authorize, token)](https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/thirdparty/.well-known/openid-configuration)

----

## **Prompt 2**
 **Role:** You are a Senior Software Engineer specializing in cloud application development, API integration, and Tesla Fleet API solutions.

 **Context:**
    *   **Working Directory:** `/Users/Shared/cursor/tesla-api/frontend`
    *   **Goal:** Implement the functionality to generate the correct Tesla virtual key pairing deep link within the frontend application, allowing users to initiate the pairing process.
    *   **Current State:** The frontend application (`@frontend`) has a placeholder pairing page (`frontend/app/pair/page.js`). Authentication via Tesla OAuth (Prompt 1) should be functional. The Public Key Server is live and registered.
    *   **Live Backend Services:**
        *   Public Key Server: `https://public-key-server-tesla.vercel.app/` (Registered domain: `public-key-server-tesla.vercel.app`)
    *   **Documentation:** `docs/00_integration_plan.md`, `docs/01_public_key_server.md`.

 **Requirements:**
    *   Use **only** the production environment variables defined in `/Users/Shared/cursor/tesla-api/env.txt`. Specifically, `PUBLIC_KEY_DOMAIN` is needed to construct the pairing link. Ensure `setup-env.js` makes this available to the frontend, likely as `NEXT_PUBLIC_PUBLIC_KEY_DOMAIN`.
    *   Adhere strictly to `my-error-fixing-protocols.mdc` and `my-directory-management-protocols.mdc`.

 **Tasks:**
    1.  **Analyze Current Implementation:**
        *   Review `frontend/setup-env.js`: Confirm it correctly copies `PUBLIC_KEY_DOMAIN` from `env.txt` to `.env.local` and prefixes it as `NEXT_PUBLIC_PUBLIC_KEY_DOMAIN` for client-side access.
        *   Review `frontend/app/pair/page.js`: Examine the existing structure. It needs to dynamically generate the pairing link.
    2.  **Implement Pairing Link Generation:**
        *   Modify `frontend/app/pair/page.js` to:
            *   Read the `NEXT_PUBLIC_PUBLIC_KEY_DOMAIN` environment variable.
            *   Construct the Tesla pairing deep link URL: `https://tesla.com/_ak/<your-domain>`, replacing `<your-domain>` with the value from the environment variable.
            *   Display this link clearly to the user, perhaps as a clickable button or link that opens in a new tab.
            *   Include instructions for the user (e.g., "Click this link on your mobile device with the Tesla app installed to pair your vehicle.").
            *   Ensure this page is accessible only to authenticated users (potentially add checks using `useSession` or rely on middleware protection if `/pair` is added to protected routes).
    3.  **Consider Task Finished ONLY WHEN:** The pairing link is correctly generated using the production domain, displayed to the user on the `/pair` page, and basic verification confirms the link format is correct.

 **Deliverables:**
    *   Modified `frontend/app/pair/page.js` and potentially `frontend/setup-env.js`.
    *   A single Test Summary report detailing the verification steps and outcomes.

 **Testing/Error Fixing:**
    1.  Run the frontend locally (`npm run dev`).
    2.  Log in using the Tesla OAuth flow implemented in Prompt 1.
    3.  Navigate to `http://localhost:3000/pair`.
    4.  Verify that the pairing link is displayed correctly, using the domain `public-key-server-tesla.vercel.app` (based on `env.txt`). The expected link is `https://tesla.com/_ak/public-key-server-tesla.vercel.app`.
    5.  Verify the page includes instructions for the user.
    6.  Check the browser's developer console and terminal output for errors.
    7.  **Error Fixing:** If the link is incorrect, the environment variable is missing, or other errors occur, identify the root cause, apply fixes following `my-error-fixing-protocols.mdc`, and **re-run all tests**. Document the error, root cause, fix, and verification in the Test Summary.

 **QA:**
    *   **NO MOCKUPS:** The domain used must be the actual production domain from `env.txt`.
    *   **NO DUPLICATION:** Modify the existing `/pair` page. Follow `my-directory-management-protocols.mdc`.
    *   **PRODUCTION ENV:** Use only variables from `env.txt`.

 **Tesla Fleet API Documentation References:**
    *   [Virtual Key Developer Guide (Pairing Link Section)](https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide#adding-to-a-vehicle): Provides the format `https://tesla.com/_ak/<your-domain>`.
    *   [Partner Endpoints (Domain Registration Requirement)](https://developer.tesla.com/docs/fleet-api/endpoints/partner-endpoints): Confirms the domain used in the link must be the one registered with Tesla.

----

## **Prompt 3**
 **Role:** You are a Senior Software Engineer specializing in cloud application development, API integration, and Tesla Fleet API solutions.

 **Context:**
    *   **Working Directory:** `/Users/Shared/cursor/tesla-api/frontend`
    *   **Goal:** Implement the dashboard page to connect to the live Fleet Telemetry Server via WebSockets, authenticate, receive real-time vehicle data, and display it.
    *   **Current State:** The frontend application (`@frontend`) has authentication (Prompt 1) and pairing link generation (Prompt 2) implemented. A placeholder dashboard page exists at `frontend/app/dashboard/page.js`. The Telemetry Server is live.
    *   **Live Backend Services:**
        *   Telemetry Server: `wss://tesla-telemetry-server.fly.dev/ws` (Expects connection at `/dashboard?token=XYZ` path as per `03_nodejs_server_requirements.md`). The token expected here is likely the Tesla *Access Token* obtained during OAuth.
    *   **Documentation:** `docs/00_integration_plan.md`, `docs/02_telemetry_server.md`, `docs/03_nodejs_server_requirements.md`.

 **Requirements:**
    *   Use **only** the production environment variables defined in `/Users/Shared/cursor/tesla-api/env.txt`. Ensure `NEXT_PUBLIC_TELEMETRY_SERVER_URL` is correctly set in `.env.local` by `setup-env.js`.
    *   The dashboard must connect to the `/dashboard` path of the WebSocket server, appending the user's Tesla `accessToken` (obtained via `useSession`) as the `token` query parameter.
    *   Adhere strictly to `my-error-fixing-protocols.mdc` and `my-directory-management-protocols.mdc`.

 **Tasks:**
    1.  **Analyze Current Implementation:**
        *   Review `frontend/setup-env.js`: Confirm it correctly copies `TELEMETRY_SERVER_URL` or provides `NEXT_PUBLIC_TELEMETRY_SERVER_URL` (e.g., `wss://tesla-telemetry-server.fly.dev/ws`) to `.env.local`.
        *   Review `frontend/app/dashboard/page.js`: Examine the existing structure. It needs logic to establish and manage a WebSocket connection and display incoming data.
        *   Review `frontend/app/api/auth/[...nextauth]/route.js`: Confirm the `session` callback makes the `accessToken` available in the `useSession` hook.
    2.  **Implement WebSocket Connection and Data Handling:**
        *   Modify `frontend/app/dashboard/page.js` to:
            *   Use the `useSession` hook to get the user's session data, specifically the `accessToken`. Ensure it handles loading and unauthenticated states gracefully.
            *   On component mount (using `useEffect`), establish a WebSocket connection to the URL specified by `NEXT_PUBLIC_TELEMETRY_SERVER_URL`. **Crucially, append the path `/dashboard` and the query parameter `token`** with the user's `accessToken` (e.g., `wss://tesla-telemetry-server.fly.dev/ws/dashboard?token=${session.accessToken}`).
            *   Handle WebSocket events:
                *   `onopen`: Log successful connection.
                *   `onmessage`: Parse the incoming JSON message (containing telemetry data). Update component state to store and display the received data (e.g., Vehicle Speed, Location, SoC).
                *   `onerror`: Log connection errors. Implement retry logic if appropriate.
                *   `onclose`: Log disconnection. Handle cleanup.
            *   Implement a clean disconnect when the component unmounts.
            *   Render the received telemetry data in a user-friendly format on the dashboard. Start with displaying a few key fields like Speed, SoC, Latitude/Longitude.
    3.  **Consider Task Finished ONLY WHEN:** The dashboard successfully connects to the live telemetry server using the correct URL and access token, receives real-time data, displays it, and handles connection lifecycle events, verified against the live server.

 **Deliverables:**
    *   Modified `frontend/app/dashboard/page.js` and potentially `frontend/setup-env.js`.
    *   A single Test Summary report detailing the verification steps and outcomes.

 **Testing/Error Fixing:**
    1.  Run the frontend locally (`npm run dev`).
    2.  Log in using the Tesla OAuth flow. Verify you are redirected to `/dashboard`.
    3.  Observe the dashboard page. Verify that it attempts to connect to the WebSocket server (`wss://tesla-telemetry-server.fly.dev/ws/dashboard?token=...`).
    4.  Check the browser's developer console Network tab (WS filter) to confirm the WebSocket connection is established successfully (HTTP 101 Switching Protocols). Verify the correct `accessToken` is sent in the `token` query parameter.
    5.  Verify that telemetry data messages are received over the WebSocket connection.
    6.  Verify that key telemetry data points (e.g., Speed, SoC, Location) are displayed and update on the dashboard page. (Note: Data flow depends on the vehicle being online and configured correctly by the backend Telemetry server process).
    7.  Check the browser console and terminal output for WebSocket connection errors, authentication issues, or data parsing errors.
    8.  **Error Fixing:** If the connection fails, data isn't received/displayed, or other errors occur, investigate the root cause (check WebSocket URL, token validity, server logs if accessible, frontend parsing logic). Apply fixes following `my-error-fixing-protocols.mdc`, and **re-run all tests**. Document errors, causes, fixes, and verification in the Test Summary.

 **QA:**
    *   **NO MOCKUPS:** Connection must be to the live Telemetry Server (`wss://tesla-telemetry-server.fly.dev/ws`). Data displayed must be actual data received.
    *   **NO DUPLICATION:** Modify the existing `/dashboard` page. Follow `my-directory-management-protocols.mdc`.
    *   **PRODUCTION ENV:** Use only variables from `env.txt` (specifically `NEXT_PUBLIC_TELEMETRY_SERVER_URL` and the `accessToken` from the NextAuth session).

 **Tesla Fleet API Documentation References:**
    *   [Fleet Telemetry Overview](https://developer.tesla.com/docs/fleet-api/fleet-telemetry): Describes the concept of the telemetry server and data streaming.
    *   [Available Telemetry Data](https://developer.tesla.com/docs/fleet-api/fleet-telemetry/available-data): Lists potential data fields that might be received.
    *   (Refer to `docs/02_telemetry_server.md` and `docs/03_nodejs_server_requirements.md` for specific implementation details of the *existing* telemetry server, such as the `/dashboard?token=XYZ` endpoint requirement).

----
