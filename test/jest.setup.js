// jest.setup.js
const path = require('path');
const fs = require('fs');

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';
// Set a flag to indicate this is running under Jest
process.env.JEST_TEST_RUNNER = 'true';

// Prevent process.exit from actually exiting in tests
const originalExit = process.exit;
process.exit = (code) => {
  throw new Error(`process.exit called with "${code}"`);
};

// Set up test environment variables if they don't exist
const requiredTestVars = [
  'TESLA_CLIENT_ID',
  'TESLA_CLIENT_SECRET',
  'TESLA_TOKEN_URL',
  'TESLA_API_BASE_URL',
  'PUBLIC_KEY_SERVER_URL',
  'PUBLIC_KEY_PATH',
  'TELEMETRY_HOST',
  'TELEMETRY_SERVER_TOKEN',
  'TESLA_VIN',
  'TESLA_PARTNER_TOKEN', 
  'PUBLIC_KEY_DOMAIN',
  'DASHBOARD_TOKEN',
  'TESLA_AUDIENCE',
  'JWT_SECRET',
];

// Add default test values for any missing required variables
for (const variable of requiredTestVars) {
  if (!process.env[variable]) {
    process.env[variable] = `test_${variable.toLowerCase()}`;
  }
}

// Set specific test values for critical environment variables
process.env.TLS_KEY_PATH = './certs/server.key';
process.env.TLS_CERT_PATH = './certs/server.crt';
process.env.TLS_CA_PATH = './certs/ca.crt';

// Mock the fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockImplementation((filePath) => {
    // Mock necessary files exist for tests
    const normalizedPath = path.normalize(filePath);
    return [
      path.normalize('.well-known/appspecific/com.tesla.3p.public-key.pem'),
      path.normalize('./certs/server.key'),
      path.normalize('./certs/server.crt'),
      path.normalize('./certs/ca.crt'),
      path.normalize('certs/server.key'),
      path.normalize('certs/server.crt'),
      path.normalize('certs/ca.crt'),
      // Add container paths too
      path.normalize('/app/certs/server.key'),
      path.normalize('/app/certs/server.crt'),
      path.normalize('/app/certs/ca.crt'),
    ].includes(normalizedPath) || normalizedPath.includes('node_modules');
  }),
  readFileSync: jest.fn().mockImplementation((filePath, encoding) => {
    // Return mock content for key files
    if (filePath.includes('public-key.pem')) {
      return '-----BEGIN PUBLIC KEY-----\nMOCK_PUBLIC_KEY_CONTENT\n-----END PUBLIC KEY-----';
    }
    if (filePath.includes('server.key')) {
      return '-----BEGIN PRIVATE KEY-----\nMOCK_PRIVATE_KEY_CONTENT\n-----END PRIVATE KEY-----';
    }
    if (filePath.includes('server.crt') || filePath.includes('ca.crt')) {
      return '-----BEGIN CERTIFICATE-----\nMOCK_CERTIFICATE_CONTENT\n-----END CERTIFICATE-----';
    }
    
    // For any other file, use the real implementation
    return jest.requireActual('fs').readFileSync(filePath, encoding);
  }),
  mkdirSync: jest.fn().mockImplementation(() => undefined),
  writeFileSync: jest.fn().mockImplementation(() => undefined),
}));

// Mock the WebSocket module
jest.mock('ws', () => {
  const MockWebSocket = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
  }));
  
  MockWebSocket.Server = jest.fn().mockImplementation((options) => {
    const mockServer = {
      on: jest.fn((event, callback) => {
        if (event === 'connection') {
          mockServer.connectionCallback = callback;
        }
      }),
      clients: new Set(),
      close: jest.fn(),
      path: options.path,
      connectionCallback: null
    };
    return mockServer;
  });
  
  return MockWebSocket;
});

// Mock the https module
jest.mock('https', () => {
  const mockHttpsServer = {
    listen: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
  };
  
  return {
    ...jest.requireActual('https'),
    createServer: jest.fn().mockReturnValue(mockHttpsServer),
  };
});

// Mock the axios module to prevent actual network calls
jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
    post: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
  }),
  get: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
  post: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
}));

// Create a date that will remain constant for all tests
const fixedTestDate = new Date('2025-04-28T12:00:00Z').getTime();
global.Date = class extends Date {
  constructor(...args) {
    if (args.length === 0) {
      super(fixedTestDate);
    } else {
      super(...args);
    }
  }
  static now() {
    return fixedTestDate;
  }
};

// Mock telemetry-server modules to prevent conflicts
jest.mock('telemetry-server/src/config', () => ({
  TESLA_API_BASE_URL: 'https://mock.tesla.api/test',
  TESLA_PARTNER_TOKEN: 'test_token',
  TELEMETRY_HOST: 'test.telemetry.host',
  vehicleIds: ['TEST_VIN'],
  TLS_PATHS: {
    key: './certs/server.key',
    cert: './certs/server.crt',
    ca: './certs/ca.crt',
  },
  dashboardToken: 'STATIC_SECRET_TOKEN',
  PUBLIC_KEY_PATH: './.well-known/appspecific/com.tesla.3p.public-key.pem',
  DASHBOARD_TOKEN: 'STATIC_SECRET_TOKEN',
  isTestEnvironment: true,
}), { virtual: true });

jest.mock('telemetry-server/src/teslaApi', () => ({
  getPartnerToken: jest.fn().mockResolvedValue('mock_token'),
  configureVehicleTelemetry: jest.fn().mockResolvedValue({ success: true }),
}), { virtual: true });

jest.mock('telemetry-server/src/auth', () => ({
  verifyDashboardToken: jest.fn().mockImplementation((token) => {
    return token === 'STATIC_SECRET_TOKEN';
  }),
  validateTeslaOAuthToken: jest.fn().mockResolvedValue(true),
}), { virtual: true });

// Tell Jest about the mock paths
global.__TLS_KEY_PATH = process.env.TLS_KEY_PATH;
global.__TLS_CERT_PATH = process.env.TLS_CERT_PATH;
global.__TLS_CA_PATH = process.env.TLS_CA_PATH;

console.log('Jest test environment setup complete'); 