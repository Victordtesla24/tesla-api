# Tesla API Integration Project

This project integrates with the Tesla Fleet API to access vehicle data, including telemetry information.

## Features

- Mutual TLS (mTLS) authentication for vehicle connections
- Real-time telemetry data streaming from Tesla vehicles
- Dashboard WebSocket endpoint for frontend clients
- Authentication via Tesla OAuth tokens
- Automatic vehicle telemetry configuration

## Architecture

The telemetry server is designed according to Tesla's Fleet API documentation:

- **One unified server** handles both vehicle streams and dashboard clients
- **Mutual TLS (mTLS)** enforced for vehicle connections with `requestCert: true` and `rejectUnauthorized: true`
- After startup, server calls Tesla API to configure vehicles for telemetry streaming
- Dashboard authentication uses Tesla OAuth tokens with `vehicle_device_data` scope

## Prerequisites

- Node.js 18 or later
- Valid TLS certificates (CA, server cert, and key)
- Environment variables configured (see `.env.example`)
- Tesla Developer Portal account with Fleet API access
- Vehicle with virtual key paired via Tesla mobile app

## Setup

1. Clone the repository
2. Install dependencies:

```bash
cd frontend
npm install
```

3. Configure environment variables in `env.txt` at the root of the project:

```
# Tesla API Credentials
TESLA_CLIENT_ID='your-client-id'
TESLA_CLIENT_SECRET='your-client-secret'
TESLA_REDIRECT_URI='http://localhost:3000/api/auth/callback/tesla'
TESLA_TOKEN_URL='https://auth.tesla.com/oauth2/v3/token'
TESLA_AUTH_URL='https://auth.tesla.com/oauth2/v3/authorize'
TESLA_API_BASE_URL='https://fleet-api.prd.na.vn.cloud.tesla.com'

# Public variables for frontend
NEXT_PUBLIC_TESLA_CLIENT_ID='your-client-id'
NEXT_PUBLIC_TESLA_AUTH_URL='https://auth.tesla.com/oauth2/v3/authorize'
NEXT_PUBLIC_TESLA_REDIRECT_URI='http://localhost:3000/api/auth/callback/tesla'

# NextAuth configuration
NEXTAUTH_URL='http://localhost:3000'
NEXTAUTH_SECRET='your-nextauth-secret'
```

## Testing the OAuth Flow

You can test the Tesla OAuth flow using the provided scripts:

### Complete Authentication Flow

The easiest way to test the entire flow is with:

```bash
./complete-auth.sh
```

This script will:
1. Guide you through the OAuth process
2. Save the access token
3. Test vehicle data access

### Manual Steps

#### 1. Test OAuth Flow

```bash
cd frontend
node scripts/test-tesla-oauth.js
```

This script will:
- Generate a Tesla OAuth URL for you to open in your browser
- Prompt you to enter the redirect URL after authorization
- Extract the authorization code and exchange it for tokens
- Save the tokens for later use

#### 2. Test Vehicle Data

```bash
node scripts/test-vehicle-data.js
```

This script will:
- Use the saved token to fetch information about your vehicles
- Display detailed vehicle information

#### 3. Test Telemetry

```bash
node scripts/test-telemetry.js
```

This script will:
- Connect to the Tesla streaming API
- Display real-time telemetry data from your vehicle

## Running the Application

Start the development server:

```bash
cd frontend
npm run dev
```

Visit http://localhost:3000 to view the application.

### Authentication

1. Navigate to the login page at http://localhost:3000/login
2. Click "Login with Tesla" to start the OAuth flow
3. Authorize the application with your Tesla account
4. You'll be redirected back to the dashboard

## Troubleshooting

### OAuth Issues

If you encounter OAuth authentication issues:

1. Check that your Tesla Developer credentials are correct
2. Ensure your redirect URI matches exactly what's configured in the Tesla Developer Portal
3. Try the test scripts individually to isolate the issue
4. Check the browser console and server logs for detailed error messages

### Authentication Reset

If you're stuck in an authentication loop or have invalid tokens:

1. Clear your browser cookies and local storage
2. Visit http://localhost:3000/login?reset=true to reset the authentication state
3. Try the login process again

## Project Structure

- `frontend/app/api/auth/[...nextauth]/route.js`: NextAuth.js configuration
- `frontend/app/api/auth/callback/tesla/route.js`: Tesla OAuth callback handler
- `frontend/app/login/page.js`: Login page with Tesla OAuth integration
- `frontend/app/dashboard/page.js`: Dashboard for displaying vehicle data
- `frontend/scripts/`: Test scripts for the Tesla API integration

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TLS_KEY_PATH` | Path to server private key |
| `TLS_CERT_PATH` | Path to server certificate |
| `TLS_CA_PATH` | Path to CA certificate |
| `TELEMETRY_HOST` | Telemetry server hostname |
| `TESLA_VIN` | Vehicle VIN for telemetry |
| `TESLA_CLIENT_ID` | Tesla Fleet API client ID |
| `TESLA_CLIENT_SECRET` | Tesla Fleet API client secret |
| `TESLA_TOKEN_URL` | Tesla OAuth token URL |
| `TELEMETRY_SERVER_TOKEN` | Token for server authentication |

## API Endpoints

### WebSocket Endpoints

- `/vehicle` - For Tesla vehicles to stream telemetry data (mTLS required)
- `/dashboard` - For frontend clients to receive telemetry (Tesla OAuth token required)

### HTTP Endpoints

- `/health` - Health check endpoint

## Dashboard Connection

Connect to the dashboard WebSocket with a valid Tesla OAuth token:

```javascript
const socket = new WebSocket('wss://your-domain.fly.dev/dashboard?token=YOUR_TESLA_OAUTH_TOKEN');
```

## References

- [Tesla Fleet API Documentation](https://developer.tesla.com/docs/fleet-api)
- [Tesla Fleet Telemetry Guide](https://developer.tesla.com/docs/fleet-api/fleet-telemetry)
- [Virtual Keys Overview](https://developer.tesla.com/docs/fleet-api/virtual-keys/overview) 


