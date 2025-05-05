const axios = require('axios');
const fs = require('fs');
const config = require('./config'); // config already validated required vars

let cachedToken = null;
let tokenExpiry = null;

/**
 * Fetches a Tesla Partner OAuth token using the client_credentials grant type.
 * Caches the token until it's close to expiring.
 * Reference: https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens
 * @returns {Promise<string>} The access token.
 * @throws {Error} If fetching the token fails.
 */
async function getPartnerToken() {
    // Reuse token if not expired
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    // Credentials and audience are validated by config.js
    const tokenUrl = `${config.teslaAuthUrl}/token`;
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', config.teslaClientId);
    params.append('client_secret', config.teslaClientSecret);
    params.append('audience', config.teslaAudience);
    // Required scopes for telemetry configuration
    params.append('scope', 'vehicle_device_data vehicle_cmds');

    console.log(`Requesting Partner Token from ${tokenUrl}...`);
    try {
        const response = await axios.post(tokenUrl, params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const data = response.data;
        if (!data.access_token) {
            throw new Error('No access_token found in Tesla API response.');
        }

        cachedToken = data.access_token;
        // Expire token 60 seconds early to prevent issues with clock skew
        tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
        console.log('Successfully obtained Partner Token.');
        return cachedToken;
    } catch (error) {
        console.error('FATAL ERROR: Failed to obtain Partner Token from Tesla.');
        if (axios.isAxiosError(error)) {
            console.error(`Status: ${error.response?.status}`);
            console.error(`Data: ${JSON.stringify(error.response?.data)}`);
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.error('Reason: Check TESLA_CLIENT_ID, TESLA_CLIENT_SECRET, or permissions in Tesla Developer portal.');
            }
        } else {
            console.error('Error details:', error.message);
        }
        throw new Error('Could not get Partner Token.'); // Re-throw to signal failure upstream
    }
}

/**
 * Configures specified vehicles for fleet telemetry streaming.
 * Sends the server's hostname, port, and full TLS certificate chain to Tesla.
 * Reference: https://developer.tesla.com/docs/fleet-api/endpoints/vehicle-endpoints#fleet_telemetry_config-create
 * @throws {Error} If configuration fails.
 */
async function configureVehicles() {
    const vins = config.vehicleIds;
    if (!vins || vins.length === 0) {
        console.warn('No VEHICLE_IDS provided in .env; skipping Tesla fleet_telemetry_config call.');
        return;
    }

    let token;
    try {
        token = await getPartnerToken();
    } catch (tokenError) {
        console.error('Cannot configure vehicles without a Partner Token. Please resolve token issue.');
        return; // Don't proceed without a token
    }

    // Load the server certificate (full chain) to be included in the API call.
    // Tesla requires this so the vehicle can trust the server's TLS certificate.
    let caChainPem;
    try {
        // config.tlsCertPath validated by config.js
        caChainPem = fs.readFileSync(config.tlsCertPath, 'utf8');
        if (!caChainPem.includes('BEGIN CERTIFICATE')) {
             throw new Error(`File at TLS_CERT_PATH (${config.tlsCertPath}) does not appear to be a valid PEM certificate chain.`);
        }
        console.log(`Loaded server certificate chain from ${config.tlsCertPath} for API call.`);
    } catch (err) {
        console.error(`FATAL ERROR: Failed to read server certificate chain from ${config.tlsCertPath}.`);
        console.error('This file (server.crt or equivalent) is required for the `ca` field in the fleet_telemetry_config API call.');
        console.error('Error details:', err.message);
        // Exiting because without the cert chain, configuration will fail.
        process.exit(1); 
    }

    // Build the configuration payload for the Tesla API
    const body = {
        vins: vins,
        config: {
            hostname: config.telemetryHost,
            port: parseInt(config.port, 10), // Ensure port is a number
            ca: caChainPem,                 // The full certificate chain PEM
            fields: config.telemetryFields
        }
    };

    const apiUrl = `${config.teslaAudience}/api/1/vehicles/fleet_telemetry_config`;
    console.log(`Sending fleet_telemetry_config for VINs: ${vins.join(', ')} to ${apiUrl}...`);

    try {
        const response = await axios.post(apiUrl, body, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('Successfully sent fleet_telemetry_config request.');
        console.log('Tesla API Response:', JSON.stringify(response.data, null, 2));

        // Handle potential partial failures reported in the response
        if (response.data && response.data.results) {
            response.data.results.forEach(result => {
                if (result.success === false) {
                    console.warn(`Configuration failed for VIN ${result.vin}: ${result.reason}`);
                    if (result.reason === 'missing_key') {
                        console.warn(` -> Ensure virtual key is paired for VIN ${result.vin}. Pairing link: https://tesla.com/_ak/${process.env.PUBLIC_KEY_DOMAIN || '<YOUR_DOMAIN>'}`);
                    }
                }
            });
        }

    } catch (error) {
        console.error('ERROR: Failed to send fleet_telemetry_config request to Tesla.');
        if (axios.isAxiosError(error)) {
            console.error(`Status: ${error.response?.status}`);
            console.error(`Data: ${JSON.stringify(error.response?.data)}`);
            if (error.response?.status === 422) {
                 console.error('Reason: Unprocessable Entity. Check VINs, hostname, or certificate chain format.');
            }
            // Other errors (401, 403, 500) handled by getPartnerToken or general catch
        } else {
            console.error('Error details:', error.message);
        }
        // Don't exit here, server might still run, but configuration failed.
    }
}

module.exports = { configureVehicles, getPartnerToken }; 