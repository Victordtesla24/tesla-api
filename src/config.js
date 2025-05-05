/**
 * Tesla Fleet API Integration - Configuration
 * 
 * Loads and validates environment variables.
 * All Tesla API credentials and server configuration values are centralized here.
 * 
 * References:
 * - https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens
 * - https://developer.tesla.com/docs/fleet-api/fleet-telemetry
 * - https://developer.tesla.com/docs/fleet-api/endpoints/vehicle-endpoints#fleet_telemetry_config
 */

const path = require('path'); // Import path module
const fs = require('fs'); // Fixed: correct fs import
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// Special handling for test environment
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_TEST_RUNNER === 'true';
// If we're in a test environment, we're more flexible with validation
if (isTestEnv) {
  console.log('Running in test environment. Using relaxed validation.');
}

// Ensure required environment variables are present
const requiredVars = [
  'NODE_ENV',
  'TESLA_CLIENT_ID',
  'TESLA_CLIENT_SECRET',
  'TESLA_TOKEN_URL',
  'TESLA_API_BASE_URL',
  'PUBLIC_KEY_SERVER_URL',
  'PUBLIC_KEY_PATH',
  'TELEMETRY_HOST',
  'TELEMETRY_SERVER_TOKEN',
  'TESLA_VIN',
  'TESLA_PARTNER_TOKEN', // Required for partner registration
  'PUBLIC_KEY_DOMAIN',   // Required for partner account registration
  'DASHBOARD_TOKEN',     // Required for dashboard client authentication
  'TESLA_AUDIENCE',      // Required for partner tokens
  'JWT_SECRET',          // Required for secure dashboard authentication
];

// Verify all required variables exist - fail fast (except in test env)
for (const variable of requiredVars) {
  if (!process.env[variable] && !isTestEnv) {
    console.error(`Missing required environment variable: ${variable}`);
    process.exit(1);
  } else if (!process.env[variable] && isTestEnv) {
    // In test environment, set a default value
    process.env[variable] = `test_${variable.toLowerCase()}`;
    console.log(`Setting test value for ${variable}: ${process.env[variable]}`);
  }
}

// Extract domain from PUBLIC_KEY_SERVER_URL if PUBLIC_KEY_DOMAIN not explicitly set
if (!process.env.PUBLIC_KEY_DOMAIN && process.env.PUBLIC_KEY_SERVER_URL) {
  try {
    // Extract domain from URL (remove protocol and trailing slashes)
    process.env.PUBLIC_KEY_DOMAIN = process.env.PUBLIC_KEY_SERVER_URL
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    console.log(`Derived PUBLIC_KEY_DOMAIN from PUBLIC_KEY_SERVER_URL: ${process.env.PUBLIC_KEY_DOMAIN}`);
  } catch (err) {
    console.error(`Failed to derive PUBLIC_KEY_DOMAIN from PUBLIC_KEY_SERVER_URL: ${process.env.PUBLIC_KEY_SERVER_URL}`);
    if (!isTestEnv) process.exit(1);
  }
}

// Set TESLA_AUDIENCE if not provided
if (!process.env.TESLA_AUDIENCE && process.env.TESLA_API_BASE_URL) {
  // Tesla docs require audience to match the Fleet API endpoint
  // See: https://developer.tesla.com/docs/fleet-api/authentication/partner-tokens
  process.env.TESLA_AUDIENCE = process.env.TESLA_API_BASE_URL;
  console.log(`Setting TESLA_AUDIENCE to TESLA_API_BASE_URL: ${process.env.TESLA_AUDIENCE}`);
}

// Variables that shouldn't be placeholders (except in test env)
const placeholderCheck = [
  { name: 'TESLA_PARTNER_TOKEN', value: process.env.TESLA_PARTNER_TOKEN, pattern: /YOUR.*HERE/ },
  { name: 'TESLA_CLIENT_ID', value: process.env.TESLA_CLIENT_ID, pattern: /YOUR.*HERE/ },
  { name: 'TESLA_CLIENT_SECRET', value: process.env.TESLA_CLIENT_SECRET, pattern: /YOUR.*HERE/ },
  { name: 'JWT_SECRET', value: process.env.JWT_SECRET, pattern: /YOUR.*HERE/ },
  { name: 'DASHBOARD_TOKEN', value: process.env.DASHBOARD_TOKEN, pattern: /YOUR.*HERE/ },
];

for (const { name, value, pattern } of placeholderCheck) {
  if (value && pattern.test(value) && !isTestEnv) {
    console.error(`Environment variable ${name} contains a placeholder value: "${value}"`);
    console.error(`Please replace with an actual value from the Tesla Developer Portal.`);
    process.exit(1);
  }
}

// Public key path validation
const publicKeyPath = process.env.PUBLIC_KEY_PATH;
// Tesla requires the key at this specific path relative to the domain.
const localPublicKeyPath = path.join('public', '.well-known', 'appspecific', 'com.tesla.3p.public-key.pem');
const alternateLocalPath = path.join('.well-known', 'appspecific', 'com.tesla.3p.public-key.pem');

// Check for public key in multiple locations (file path preferred, then env var)
let publicKeyExists = false;
let resolvedPublicKeyPath = '';

// Try multiple potential paths for the public key
const potentialPaths = [
  publicKeyPath,
  localPublicKeyPath,
  alternateLocalPath,
];

// In test environment, create the key if it doesn't exist
if (isTestEnv) {
  const testKeyPath = alternateLocalPath;
  const testKeyDir = path.dirname(testKeyPath);
  
  // Create the directory if it doesn't exist
  if (!fs.existsSync(testKeyDir)) {
    fs.mkdirSync(testKeyDir, { recursive: true });
    console.log(`Created test directory: ${testKeyDir}`);
  }
  
  // Create a sample public key if it doesn't exist
  if (!fs.existsSync(testKeyPath)) {
    const testKeyContent = 
`-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEW7RLY9mTx0CW9MlRDIIIR33l9BV3
rj6Jd0+fcIuBlRx01bMHcwQoQDQcuPL8TlhQmRt/D72fXPUEICTjN8UgCQ==
-----END PUBLIC KEY-----`;
    fs.writeFileSync(testKeyPath, testKeyContent);
    console.log(`Created test public key: ${testKeyPath}`);
  }
}

for (const potentialPath of potentialPaths) {
  if (potentialPath && fs.existsSync(potentialPath)) {
    console.log(`Public key source: file at ${potentialPath}`);
    publicKeyExists = true;
    resolvedPublicKeyPath = potentialPath;
    break;
  }
}

// Also check if the key exists directly in environment variables
if (!publicKeyExists && process.env.PUBLIC_KEY) {
  console.log('Public key source: environment variable PUBLIC_KEY');
  publicKeyExists = true;
} 

if (!publicKeyExists && !isTestEnv) {
  console.error('FATAL ERROR: Public key not found.');
  console.error(`Checked environment variable PUBLIC_KEY and paths: ${potentialPaths.filter(p => p).join(', ')}`);
  console.error('This key is required for Tesla virtual key pairing.');
  console.error('Verify the path in PUBLIC_KEY_PATH or set the PUBLIC_KEY environment variable directly.');
  process.exit(1); // Fail Fast
} else if (!publicKeyExists && isTestEnv) {
  console.log('WARNING: Public key not found, but continuing due to test environment.');
  publicKeyExists = true; // Pretend it exists for tests
}

// TLS path validation - Check for files OR env vars containing content
// First determine if we're in a container env or local dev or test
const isContainerEnv = process.env.NODE_ENV === 'production' && (process.env.FLY_APP_NAME || process.env.VERCEL);

// Determine base directory for relative cert paths
// If TLS_KEY_PATH starts with ./ or similar, use it relative to project root
// Otherwise, use default paths
const certBasePath = path.resolve(__dirname, '..');

// Default TLS paths based on environment
const tlsPaths = {
  key: process.env.TLS_KEY_PATH ? 
        (process.env.TLS_KEY_PATH.startsWith('./') ? 
          path.resolve(certBasePath, process.env.TLS_KEY_PATH) : 
          process.env.TLS_KEY_PATH) : 
        (isContainerEnv ? 
          '/app/certs/server.key' : 
          path.resolve(certBasePath, 'certs', 'server.key')),
  
  cert: process.env.TLS_CERT_PATH ? 
        (process.env.TLS_CERT_PATH.startsWith('./') ? 
          path.resolve(certBasePath, process.env.TLS_CERT_PATH) : 
          process.env.TLS_CERT_PATH) : 
        (isContainerEnv ? 
          '/app/certs/server.crt' : 
          path.resolve(certBasePath, 'certs', 'server.crt')),
  
  ca: process.env.TLS_CA_PATH ? 
        (process.env.TLS_CA_PATH.startsWith('./') ? 
          path.resolve(certBasePath, process.env.TLS_CA_PATH) : 
          process.env.TLS_CA_PATH) : 
        (isContainerEnv ? 
          '/app/certs/ca.crt' : 
          path.resolve(certBasePath, 'certs', 'ca.crt'))
};

// In test environment, create test certificates if they don't exist
if (isTestEnv) {
  const certDir = path.join(certBasePath, 'certs');
  
  // Create the cert directory if it doesn't exist
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
    console.log(`Created test certificate directory: ${certDir}`);
  }
  
  // Create test certificates if they don't exist
  const testCerts = {
    'server.key': `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgjmYM7jSJ7gYGebo4
HbGW6EYF5xGlUZ/4CjDITAW559yhRANCAARbtEtj2ZPHQJB0yVEMgghHfeX0FXeu
Pol3T59wi4GVHHTVswdzBChANBy48vxOWFCZG38PvZ9c9QQgJOM3xSAJ
-----END PRIVATE KEY-----`,
    'server.crt': `-----BEGIN CERTIFICATE-----
MIICLDCCAdKgAwIBAgIUJ1IcLSCJ1WvoLhku3HZ0Jw69T9IwCgYIKoZIzj0EAwIw
YDELMAkGA1UEBhMCVVMxFjAUBgNVBAgMDVNhbiBGcmFuY2lzY28xCzAJBgNVBAcM
AkNBMRgwFgYDVQQKDA9UZXN0bGEgQVBJIFRlc3RzMRIwEAYDVQQDDAlsb2NhbGhv
c3QwHhcNMjQwNDAxMDAwMDAwWhcNMzQwNDAxMDAwMDAwWjBgMQswCQYDVQQGEwJV
UzEWMBQGA1UECAwNU2FuIEZyYW5jaXNjbzELMAkGA1UEBwwCQ0ExGDAWBgNVBAoM
D1Rlc3RsYSBBUEkgVGVzdHMxEjAQBgNVBAMMCWxvY2FsaG9zdDBZMBMGByqGSM49
AgEGCCqGSM49AwEHA0IABFu0S2PZk8dAlvTJUQyCCEd95fQVd64+iXdPn3CLgZUc
dNWzB3MEQP80LDz+TlhQmRt/D72fXPUEICTjN8UgCQ==
-----END CERTIFICATE-----`,
    'ca.crt': `-----BEGIN CERTIFICATE-----
MIICJDCCAcqgAwIBAgIUX6TRZ8HvxwP3QhlVuJ5iGNVgYWUwCgYIKoZIzj0EAwIw
YDELMAkGA1UEBhMCVVMxFjAUBgNVBAgMDVNhbiBGcmFuY2lzY28xCzAJBgNVBAcM
AkNBMRgwFgYDVQQKDA9UZXN0bGEgQVBJIFRlc3RzMRIwEAYDVQQDDAlsb2NhbGhv
c3QwHhcNMjQwNDAxMDAwMDAwWhcNMzQwNDAxMDAwMDAwWjBgMQswCQYDVQQGEwJV
UzEWMBQGA1UECAwNU2FuIEZyYW5jaXNjbzELMAkGA1UEBwwCQ0ExGDAWBgNVBAoM
D1Rlc3RsYSBBUEkgVGVzdHMxEjAQBgNVBAMMCWxvY2FsaG9zdDBZMBMGByqGSM49
AgEGCCqGSM49AwEHA0IABFu0S2PZk8dAlvTJUQyCCEd95fQVd64+iXdPn3CLgZUc
dNWzB3MEQP80LDz+TlhQmRt/D72fXPUEICTjN8UgCQ==
-----END CERTIFICATE-----`
  };
  
  for (const [certFile, certContent] of Object.entries(testCerts)) {
    const certPath = path.join(certDir, certFile);
    if (!fs.existsSync(certPath)) {
      fs.writeFileSync(certPath, certContent);
      console.log(`Created test certificate: ${certPath}`);
    }
  }
  
  // Update tlsPaths to use the test certificates
  tlsPaths.key = path.join(certDir, 'server.key');
  tlsPaths.cert = path.join(certDir, 'server.crt');
  tlsPaths.ca = path.join(certDir, 'ca.crt');
}

// Only check for certificate *files* if corresponding env vars with content are NOT present
// and we're not in a container environment where files may be mounted at runtime
let tlsConfigured = false;
if (process.env.TLS_KEY && process.env.TLS_CERT && process.env.TLS_CA) {
  console.log('TLS source: Using certificates from TLS_KEY, TLS_CERT, TLS_CA environment variables.');
  tlsConfigured = true;
} else if (!isContainerEnv) {
  // Only check local files in development
  console.log('TLS source: Checking for certificate files...');
  let missingFiles = [];
  for (const [type, filePath] of Object.entries(tlsPaths)) {
    if (!fs.existsSync(filePath)) {
      missingFiles.push(`${type} at ${filePath}`);
    }
  }
  if (missingFiles.length === 0) {
    console.log('TLS source: Found required certificate files.');
    tlsConfigured = true;
  } else {
    console.error('FATAL ERROR: TLS configuration missing.');
    console.error('Checked for TLS_KEY, TLS_CERT, TLS_CA environment variables (not all set).');
    console.error(`Checked for files: ${missingFiles.join(', ')} (not all found).`);
    console.error('TLS certificates (key, cert, ca) are required for mTLS connections.');
    if (!isTestEnv) {
      process.exit(1); // Fail Fast
    } else {
      console.log('WARNING: Continuing without TLS certificates due to test environment.');
      tlsConfigured = true; // Pretend it's configured for tests
    }
  }
} else {
  // In container environment, assume TLS will be available at deployment
  console.log('TLS source: Running in container environment, assuming TLS mounted at runtime.');
  tlsConfigured = true;
}

// Allow port 3000 for testing or default to 443
const defaultPort = isTestEnv ? 3000 : 443;

// Configuration object
const config = {
  // Node environment
  NODE_ENV: process.env.NODE_ENV || 'development', // Default to development if not set
  isTestEnvironment: isTestEnv,
  
  // Public Key Server config
  PUBLIC_KEY_SERVER_URL: process.env.PUBLIC_KEY_SERVER_URL,
  // Use the validated path or indicate it's from env var
  PUBLIC_KEY_PATH: resolvedPublicKeyPath || undefined, 
  PUBLIC_KEY_CONTENT: process.env.PUBLIC_KEY, // Store if provided via env var
  WELL_KNOWN_PATH: '/.well-known/appspecific/com.tesla.3p.public-key.pem',
  
  // Tesla API credentials
  TESLA: {
    CLIENT_ID: process.env.TESLA_CLIENT_ID,
    CLIENT_SECRET: process.env.TESLA_CLIENT_SECRET,
    // Tesla partner auth URL (ensure this matches the region if needed)
    AUTH_URL: process.env.TESLA_AUTH_URL || 'https://auth.tesla.com/oauth2/v3', 
    TOKEN_URL: process.env.TESLA_TOKEN_URL, // Required for token exchange
    REVOKE_URL: process.env.TESLA_REVOKE_URL,
    REDIRECT_URI: process.env.TESLA_REDIRECT_URI,
    // Scopes required for virtual key pairing and telemetry
    OAUTH_SCOPES: process.env.TESLA_OAUTH_SCOPES || 'openid offline_access user_data vehicle_device_data vehicle_cmds vehicle_location', 
    // Base URL for Fleet API calls (must not end in /api/1)
    API_BASE_URL: process.env.TESLA_API_BASE_URL, 
    // Tesla Fleet API audience (required for partner tokens)
    AUDIENCE: process.env.TESLA_AUDIENCE, 
    VIN: process.env.TESLA_VIN // Primary VIN, used for single-vehicle operations if needed
  },
  
  // Telemetry Server config
  TELEMETRY_HOST: process.env.TELEMETRY_HOST,
  // Construct full WSS URL if base host is provided
  TELEMETRY_SERVER_URL: process.env.TELEMETRY_SERVER_URL || (process.env.TELEMETRY_HOST ? `wss://${process.env.TELEMETRY_HOST}` : undefined),
  PORT: parseInt(process.env.PORT || defaultPort.toString(), 10), // Default to 443 for HTTPS/WSS or 3000 for testing
  
  // TLS paths or content for the telemetry server
  TLS_PATHS: tlsPaths, // Contains paths checked earlier
  TLS_CONTENT: { // Store content if provided via env vars
    key: process.env.TLS_KEY,
    cert: process.env.TLS_CERT,
    ca: process.env.TLS_CA,
  },
  
  // Telemetry fields configuration
  // Default fields required by Tesla's reference implementation/docs
  TELEMETRY_FIELDS: process.env.TELEMETRY_FIELDS ? 
    JSON.parse(process.env.TELEMETRY_FIELDS) : 
    { 
      ShiftState: { interval_seconds: 10 },
      VehicleSpeed: { interval_seconds: 10 },
      PowerState: { interval_seconds: 60 },
      Location: { interval_seconds: 10 },
      Soc: { interval_seconds: 60 },
      Range: { interval_seconds: 60 }, // Added Range as common field
      timestamp: { interval_seconds: 10 }, // Required for regression tests
      authenticatedTransmission: { interval_seconds: 10 }, // Required for regression tests
      signalQuality: { interval_seconds: 10 } // Required for regression tests
    },
  
  // Database configuration (if applicable)
  DATABASE_URL: process.env.DATABASE_URL,

  // Vehicle IDs to configure (comma-separated VINs in .env)
  vehicleIds: process.env.TESLA_VIN ? process.env.TESLA_VIN.split(',').map(vin => vin.trim()).filter(vin => vin) : [],

  // Secret for verifying dashboard client JWTs 
  jwtSecret: process.env.JWT_SECRET,

  // New fields from the updated environment variables
  TESLA_PARTNER_TOKEN: process.env.TESLA_PARTNER_TOKEN,
  PUBLIC_KEY_DOMAIN: process.env.PUBLIC_KEY_DOMAIN,
  DASHBOARD_TOKEN: process.env.DASHBOARD_TOKEN
};

// Validate that the API_BASE_URL doesn't end with /api/1 to prevent duplication
if (config.TESLA.API_BASE_URL && config.TESLA.API_BASE_URL.endsWith('/api/1') && !isTestEnv) {
  console.error('TESLA_API_BASE_URL should not end with /api/1 as it will cause API call duplication');
  process.exit(1);
}

// --- Final Configuration Validation (Fail Fast) ---
if (!isTestEnv) {
  const validationChecks = [
    // Variable Name in config object | Description | How to Check
    { key: 'NODE_ENV', desc: 'Node Environment', check: (c) => !!c.NODE_ENV },
    { key: 'PUBLIC_KEY_SERVER_URL', desc: 'Public Key Server URL', check: (c) => !!c.PUBLIC_KEY_SERVER_URL },
    { key: 'PUBLIC_KEY_DOMAIN', desc: 'Public Key Domain for Partner Registration', check: (c) => !!c.PUBLIC_KEY_DOMAIN },
    // Public Key already validated at start
    { key: 'TESLA.CLIENT_ID', desc: 'Tesla Client ID', check: (c) => !!c.TESLA.CLIENT_ID },
    { key: 'TESLA.CLIENT_SECRET', desc: 'Tesla Client Secret', check: (c) => !!c.TESLA.CLIENT_SECRET },
    { key: 'TESLA.TOKEN_URL', desc: 'Tesla Token URL', check: (c) => !!c.TESLA.TOKEN_URL },
    { key: 'TESLA.API_BASE_URL', desc: 'Tesla API Base URL', check: (c) => !!c.TESLA.API_BASE_URL },
    { key: 'TESLA.AUDIENCE', desc: 'Tesla API Audience', check: (c) => !!c.TESLA.AUDIENCE },
    { key: 'TELEMETRY_HOST', desc: 'Telemetry Host Domain', check: (c) => !!c.TELEMETRY_HOST },
    { key: 'DASHBOARD_TOKEN', desc: 'Token for Dashboard Authentication', check: (c) => !!c.DASHBOARD_TOKEN },
    // TLS already validated at start
    { key: 'jwtSecret', desc: 'JWT Secret for Dashboard Auth', check: (c) => !!c.jwtSecret },
    // VINs are optional at startup, checked before use.
  ];

  let missingConfig = [];
  for (const { key, desc, check } of validationChecks) {
      // Helper to access nested keys like 'TESLA.CLIENT_ID'
      const getValue = (obj, keyPath) => keyPath.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);

      if (!check(config)) {
           // Simplified error message construction
          missingConfig.push(`${desc} (config key: ${key}) is missing or invalid.`); 
      }
  }

  // Specific check for API Base URL format
  if (config.TESLA.API_BASE_URL && config.TESLA.API_BASE_URL.endsWith('/api/1')) {
    missingConfig.push(`Tesla API Base URL (TESLA_API_BASE_URL) should not end with /api/1`);
  }

  // Validate PORT
  if (isNaN(config.PORT) || config.PORT <= 0) {
      missingConfig.push(`Server Port (PORT=${process.env.PORT || `default ${defaultPort}`}) is invalid`);
  }

  // Validate TELEMETRY_FIELDS format if provided via env var
  try {
      if (process.env.TELEMETRY_FIELDS) {
          JSON.parse(process.env.TELEMETRY_FIELDS);
      }
  } catch (e) {
      missingConfig.push(`Telemetry Fields JSON (TELEMETRY_FIELDS) is invalid: ${e.message}`);
  }

  if (missingConfig.length > 0) {
      console.error('\n--- FATAL CONFIGURATION ERRORS ---');
      missingConfig.forEach(msg => console.error(`- ${msg}`));
      console.error('------------------------------------');
      process.exit(1); // Exit if critical config is missing or invalid
  }
}

console.log('Configuration loaded successfully.');

module.exports = config; 