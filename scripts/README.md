# Tesla Fleet API - Scripts Documentation

This directory contains utility scripts for the Tesla Fleet API telemetry server.

## fly_secrets_setup.sh

This script automatically sets up all required environment variables as secrets in Fly.io for the telemetry server. It ensures consistency between the local `.env` file and the Fly.io deployment environment.

### Features

- Loads environment variables from either the `.env` file or `env.txt`
- Creates a symbolic link between `.env` and `env.txt` for consistency
- Sets all required secrets in Fly.io for the telemetry server
- Creates the necessary volume for certificate storage
- Supports dry-run mode for testing without setting actual secrets
- CI/CD friendly with automatic detection of CI environments

### Usage

**Standard Usage:**
```bash
bash scripts/fly_secrets_setup.sh
```

**Dry Run Mode (for testing):**
```bash
bash scripts/fly_secrets_setup.sh --dry-run
```

### Environment Variables

The script sets the following categories of secrets:

1. **Node Environment**
   - `NODE_ENV`

2. **Tesla API Credentials**
   - `TESLA_CLIENT_ID`
   - `TESLA_CLIENT_SECRET`
   - `TESLA_TOKEN_URL`
   - `TESLA_API_BASE_URL`
   - `TESLA_VIN`
   - `TESLA_AUTH_URL`
   - `TESLA_REVOKE_URL`
   - `TESLA_REDIRECT_URI`
   - `TESLA_OAUTH_SCOPES`

3. **Telemetry Server Configuration**
   - `TELEMETRY_HOST`
   - `TELEMETRY_SERVER_TOKEN`
   - `TELEMETRY_SERVER_URL`

4. **Public Key Server Configuration**
   - `PUBLIC_KEY_SERVER_URL`
   - `PUBLIC_KEY_PATH`

5. **TLS Certificate Paths**
   - `TLS_KEY_PATH`
   - `TLS_CERT_PATH`
   - `TLS_CA_PATH`

### CI/CD Integration

The script automatically detects if it's running in a CI environment by checking the `CI` environment variable. In CI environments, it can set additional outputs or environment variables as needed for your CI/CD pipeline.

To use with GitHub Actions, ensure the following secrets are set in your repository:
- `FLY_API_TOKEN`
- All Tesla API credentials
- Telemetry server configuration

See the `.github/workflows/fly-deploy.yml` file for a complete GitHub Actions workflow example.

## generate-certs.sh

This script generates self-signed TLS certificates for the telemetry server's mTLS authentication.

### Usage

```bash
bash scripts/generate-certs.sh
```

The script generates:
- CA certificate and key
- Server certificate and key signed by the CA

Remember to mount these certificates in your Fly.io deployment using volumes. 