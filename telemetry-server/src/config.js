const path = require('path');
const fs = require('fs'); // Import fs for file system checks

// Load .env relative to the telemetry-server directory
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const config = {
    nodeEnv: process.env.NODE_ENV || 'production', // Added NODE_ENV
    port: process.env.PORT || 443,
    telemetryHost: process.env.TELEMETRY_HOST, // Domain name for telemetry server, MUST match TLS cert SAN
    // Paths to TLS cert/key/CA in certs/ folder relative to telemetry-server/
    tlsKeyPath: process.env.TLS_KEY_PATH, // Path check below
    tlsCertPath: process.env.TLS_CERT_PATH, // Path check below. MUST contain the full chain for the 'ca' field in API call
    tlsCaPath: process.env.TLS_CA_PATH, // Path check below. CA used to verify client (vehicle) certificates
    // Tesla API credentials for partner token (client_credentials flow)
    teslaClientId: process.env.TESLA_CLIENT_ID,
    teslaClientSecret: process.env.TESLA_CLIENT_SECRET,
    // TESLA_AUDIENCE is the correct parameter for the OAuth token request
    // env.txt has TESLA_API_BASE_URL, which is typically the same value needed for audience.
    // We prioritize TESLA_AUDIENCE if set, otherwise fall back to TESLA_API_BASE_URL for compatibility.
    teslaAudience: process.env.TESLA_AUDIENCE || process.env.TESLA_API_BASE_URL,
    teslaAuthUrl: process.env.TESLA_AUTH_URL, // Separate Auth URL
    // Vehicle IDs to configure (comma-separated VINs in .env)
    vehicleIds: process.env.VEHICLE_IDS ? process.env.VEHICLE_IDS.split(',').map(vin => vin.trim()).filter(vin => vin) : [],
    // Token for authorizing dashboard WebSocket clients (Static token for this implementation)
    dashboardToken: process.env.DASHBOARD_TOKEN,
    // Telemetry fields and intervals (as JSON string in .env or defaults)
    // Reference: https://developer.tesla.com/docs/fleet-api/fleet-telemetry/available-data
    telemetryFields: process.env.TELEMETRY_FIELDS
        ? JSON.parse(process.env.TELEMETRY_FIELDS)
        : {
            "ShiftState": { "interval_seconds": 0 }, // Example: On change
            "VehicleSpeed": { "interval_seconds": 5 }, // Example: Every 5 seconds
            "DriveBearing": { "interval_seconds": 10 },
            "Location":    { "interval_seconds": 10 },
            "Elevation":   { "interval_seconds": 60 },
            "EstBatteryRange": { "interval_seconds": 60 },
            "Heading":     { "interval_seconds": 10 },
            "Power":       { "interval_seconds": 5 },
            "Soc":         { "interval_seconds": 60 }
            // Add other desired fields from Tesla docs
        }
};

// --- Fail Fast Validation --- 
// Ensures critical configuration is present and valid on startup.

// 1. Check for missing required environment variables
const requiredEnvVarKeys = [
    // Names from config object (camelCase)
    'telemetryHost',
    'tlsKeyPath', 
    'tlsCertPath',
    'tlsCaPath',
    'teslaClientId',
    'teslaClientSecret',
    'teslaAudience', // Check the derived value (prioritizes TESLA_AUDIENCE)
    'teslaAuthUrl',
    'dashboardToken' 
];

let missingVars = [];
for (const key of requiredEnvVarKeys) {
    if (!config[key]) {
        // Convert camelCase back to ENV_VAR_UPPER for user-friendly message
        const envVarName = key.replace(/[A-Z]/g, letter => `_${letter}`).toUpperCase();
        // Special case for audience fallback
        if (key === 'teslaAudience' && !process.env.TESLA_AUDIENCE && !process.env.TESLA_API_BASE_URL) {
             missingVars.push('TESLA_AUDIENCE or TESLA_API_BASE_URL');
        } else if (key === 'teslaAudience' && (process.env.TESLA_AUDIENCE || process.env.TESLA_API_BASE_URL)){
            // If one was provided, it's not missing, continue
            continue;
        } else {
            missingVars.push(envVarName);
        }
    }
}

if (missingVars.length > 0) {
    console.error('FATAL ERROR: Missing required environment variables:', [...new Set(missingVars)].join(', ')); // Use Set to remove potential duplicates
    console.error('Please check your .env file in the telemetry-server/ directory.');
    process.exit(1); // Exit immediately
}

// 2. Check for file existence for path variables
const pathVariablesToCheck = {
    'TLS_KEY_PATH': config.tlsKeyPath,
    'TLS_CERT_PATH': config.tlsCertPath,
    'TLS_CA_PATH': config.tlsCaPath
};

let missingFiles = [];
for (const [envVar, filePath] of Object.entries(pathVariablesToCheck)) {
    // filePath is guaranteed to be non-empty here due to checks above
    if (!fs.existsSync(filePath)) {
        missingFiles.push(`${envVar} (Path: ${filePath})`);
    }
}

if (missingFiles.length > 0) {
    console.error('FATAL ERROR: Required certificate/key file(s) not found:', missingFiles.join(', '));
    console.error('Please ensure the files exist at the paths specified in .env and relative to the telemetry-server directory.');
    process.exit(1); // Exit immediately
}

// 3. Validate VEHICLE_IDS format if provided (Warn only)
if (process.env.VEHICLE_IDS && config.vehicleIds.length === 0 && process.env.VEHICLE_IDS.trim() !== '') {
    console.warn('Warning: VEHICLE_IDS environment variable provided but could not parse any valid VINs. Check comma separation.');
}

// 4. Validate TELEMETRY_FIELDS JSON if provided (Fail fast)
if (process.env.TELEMETRY_FIELDS) {
    try {
        // Re-parse here to ensure the JSON is valid before proceeding
        JSON.parse(process.env.TELEMETRY_FIELDS); 
    } catch (e) {
        console.error(`FATAL ERROR: Invalid JSON format for TELEMETRY_FIELDS environment variable. ${e.message}`);
        process.exit(1);
    }
}

console.log('Configuration loaded and validated successfully.');

module.exports = config; 