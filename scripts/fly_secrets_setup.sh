#!/bin/bash
# Tesla Fleet API - Fly.io Secrets Setup Script
# This script sets up all environment variables as secrets in Fly.io for the telemetry server

# Exit on any error
set -e

# App name
APP_NAME="tesla-telemetry-server"

# Check for dry run mode
DRY_RUN=false
if [ "$1" = "--dry-run" ]; then
  DRY_RUN=true
  echo "Running in dry-run mode. No secrets will be set."
fi

# Ensure env.txt exists
if [ ! -f "env.txt" ]; then
  echo "Error: env.txt file not found. Please ensure it exists in the project root."
  exit 1
fi

# Create .env from env.txt if it doesn't exist
if [ ! -f ".env" ]; then
  echo "Creating .env file from env.txt..."
  cp env.txt .env
fi

# Create symbolic link for consistency between environments
if [ ! -L ".env" ] && [ -f ".env" ] && [ -f "env.txt" ]; then
  echo "Creating symbolic link between env.txt and .env for environment consistency..."
  mv .env .env.bak
  ln -s env.txt .env
  echo "Symbolic link created. Original .env saved as .env.bak"
fi

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
  echo "flyctl not found, installing..."
  curl -L https://fly.io/install.sh | sh
  export PATH="$HOME/.fly/bin:$PATH"
fi

# Check if logged in to flyctl (skip in dry run mode)
if [ "$DRY_RUN" = "false" ]; then
  if ! flyctl auth whoami &> /dev/null; then
    echo "Please log in to Fly.io:"
    flyctl auth login
  fi
fi

echo "Setting up secrets for $APP_NAME..."

# --- Set File-Based Secrets Individually --- 

if [ "$DRY_RUN" = "false" ]; then
  if [ -f "certs/server.key" ]; then
    echo "Setting TLS_KEY from file..."
    cat certs/server.key | flyctl secrets set -a "$APP_NAME" TLS_KEY='<file:stdin>' --stage
  else
    echo "Warning: certs/server.key not found"
  fi

  if [ -f "certs/server.crt" ]; then
    echo "Setting TLS_CERT from file..."
    cat certs/server.crt | flyctl secrets set -a "$APP_NAME" TLS_CERT='<file:stdin>' --stage
  else
    echo "Warning: certs/server.crt not found"
  fi

  if [ -f "certs/ca.crt" ]; then
    echo "Setting TLS_CA from file..."
    cat certs/ca.crt | flyctl secrets set -a "$APP_NAME" TLS_CA='<file:stdin>' --stage
  else
    echo "Warning: certs/ca.crt not found"
  fi

  # Set public key from file
  if [ -f ".well-known/appspecific/com.tesla.3p.public-key.pem" ]; then
    echo "Setting PUBLIC_KEY from file..."
    cat .well-known/appspecific/com.tesla.3p.public-key.pem | flyctl secrets set -a "$APP_NAME" PUBLIC_KEY='<file:stdin>' --stage
  else
    echo "Warning: .well-known/appspecific/com.tesla.3p.public-key.pem not found"
  fi
elif [ "$DRY_RUN" = "true" ]; then
  echo "[Dry Run] Skipping file-based secret setting."
fi

# --- Set Environment Variable Secrets --- 

# Build the secrets string
SECRETS_ARGS=()

echo "Preparing environment variable secrets from env.txt..."

while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip comments and empty lines
  [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
  
  # Extract variable name and value, handling potential lack of value
  if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
    name="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    
    # Remove surrounding quotes if present (handle both single and double)
    value=$(echo "$value" | sed -e "s/^'//" -e "s/'$//" -e 's/^"//' -e 's/"$//')

    # Add to arguments array for flyctl
    if [ -n "$name" ]; then # Ensure name is not empty
        SECRETS_ARGS+=("$name=$value")
    else
        echo "Warning: Skipping line with potentially invalid format: $line"
    fi
  elif [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)$ ]]; then
    # Handle case where variable has no value (e.g., VAR=)
    name="${BASH_REMATCH[1]}"
    SECRETS_ARGS+=("$name=") # Set empty value
  else
      echo "Warning: Skipping line with unrecognized format: $line"
  fi
done < env.txt

# Set all env var secrets at once if any were found
if [ ${#SECRETS_ARGS[@]} -gt 0 ]; then
  if [ "$DRY_RUN" = "false" ]; then
    echo "Setting environment variable secrets..."
    flyctl secrets set -a "$APP_NAME" --stage "${SECRETS_ARGS[@]}"
  else
    echo "[Dry Run] Would set the following secrets:"
    # Properly quote arguments for dry run display
    printf 'flyctl secrets set -a %q --stage' "$APP_NAME"
    for arg in "${SECRETS_ARGS[@]}"; do printf ' %q' "$arg"; done
    echo
  fi
else
  echo "No environment variable secrets to set from env.txt."
fi

# Deploy staged changes
if [ "$DRY_RUN" = "false" ]; then
  echo "Deploying staged secret changes..."
  if flyctl secrets list -a "$APP_NAME" --stage &> /dev/null; then # Check if there are staged changes
    flyctl deploy --app "$APP_NAME" --strategy rolling --wait-timeout 120 --detach
  else 
    echo "No staged secret changes to deploy."
  fi 
else
  echo "[Dry Run] Skipping deployment of staged changes."
fi

# Check if the app exists and is running
if [ "$DRY_RUN" = "false" ]; then
  if ! flyctl status -a "$APP_NAME" &> /dev/null; then
    echo "Warning: $APP_NAME app not found or failed to start after secret update."
    echo "Please check the app status and logs: flyctl status -a $APP_NAME && flyctl logs -a $APP_NAME"
  else
    echo "App $APP_NAME is running."
  fi
fi

# List all secrets that have been set
echo "Current secrets (values hidden):"
flyctl secrets list -a "$APP_NAME" | grep -v "VALUE" | sed 's/NAME//' | sed 's/\s\+//g' | sort

echo "Secrets setup completed for $APP_NAME."

# If CI/CD environment, set environment variables needed for GitHub Actions or other CI systems
if [ "${CI}" = "true" ]; then
  echo "CI environment detected, setting up CI/CD environment variables..."
  
  # For GitHub Actions
  if [ ! -z "${GITHUB_ENV}" ]; then
    echo "SECRETS_UPDATED=true" >> $GITHUB_ENV
    echo "TELEMETRY_SERVER_CONFIGURED=true" >> $GITHUB_ENV
  fi
  
  # For other CI systems, add appropriate environment variable exports
fi

# Final verification list
if [ "$DRY_RUN" = "false" ]; then
  echo "Final verification of secrets list:"
  flyctl secrets list -a "$APP_NAME"
fi