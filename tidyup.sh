#!/usr/bin/env bash
# tidyup.sh — root-level housekeeping for Tesla Fleet Web-App
# Ref: Tesla .well-known key path / Vercel public-dir rules
set -euo pipefail
# Note: inherit_errexit removed as it requires Bash 4.4+ (Mac default is Bash 3.2)

########################################
# ☑️  CONFIG (edit paths here if needed)
########################################
SRC_DIR="src"
SCRIPT_DIR="scripts"
DOC_DIR="docs"
CERT_DIR="certs"
TELEMETRY_SERVER_DIR="telemetry-server"
PUBLIC_DIR="public"
# Files to keep in the root directory
KEEP_ROOT=( ".env" ".env.local" "package.json" "README.md" )
# Script's own name to exclude it from processing
SELF_NAME="$(basename "$0")"
# Tesla's required well-known path for the public key
WELL_KNOWN_PATH="/.well-known/appspecific/com.tesla.3p.public-key.pem"
# Required environment variables to check
REQUIRED_ENV_VARS=( "TESLA_CLIENT_ID" "TESLA_CLIENT_SECRET" )
# Temporary files for Bash 3.2 compatibility (instead of associative arrays)
TEMP_DIR=$(mktemp -d)
HASH_FILE="${TEMP_DIR}/hashes.txt"
TARGET_FILE="${TEMP_DIR}/targets.txt"
# Create an additional trap for cleaning up the temp directory
trap 'rm -rf "${TEMP_DIR}"' EXIT

# Verify required directories
verify_dirs() {
  local missing_dirs=()
  for dir in "$SRC_DIR" "$SCRIPT_DIR" "$DOC_DIR" "$CERT_DIR" "$TELEMETRY_SERVER_DIR" "$PUBLIC_DIR" "test"; do
    if [[ ! -d "$dir" ]]; then
      printf "Creating directory: %s\n" "$dir"
      missing_dirs+=("$dir")
    fi
    if ! mkdir -p "$dir"; then
      printf "❌ ERROR: Failed to create or verify directory: %s\n" "$dir" >&2
      exit 1
    fi
  done
  
  # Return list of newly created directories for reference
  if [[ ${#missing_dirs[@]} -gt 0 ]]; then
    echo "${missing_dirs[*]}"
  fi
}

# Verify required env vars if .env exists
verify_env() {
  if [[ ! -f .env ]]; then
    printf "⚠️  WARNING: No .env file found. Tesla integration requires credentials.\n" >&2
    return 0
  fi
  
  local missing=false
  for var in "${REQUIRED_ENV_VARS[@]}"; do
    if ! grep -q "^${var}=" .env; then
      printf "⚠️  WARNING: Missing required environment variable in .env: %s\n" "$var" >&2
      missing=true
    fi
  done
  
  if [[ "$missing" == "true" ]]; then
    printf "⚠️  WARNING: Some required Tesla credentials are missing. See Tesla docs.\n" >&2
  fi
}

########################################
# 🔄  Utility – single-line spinner
########################################
spin() {
  local -r msg="$1"; shift
  local pid=$!
  local spin='|/-\'
  local i=0
  
  # Create a clean line for spinner
  printf '\n⏳  %s [ %c ]' "$msg" "${spin:0:1}"
  
  while kill -0 $pid 2>/dev/null; do
    sleep 0.1
    printf '\r⏳  %s [ %c ]' "$msg" "${spin:i++%${#spin}:1}"
  done
  
  # Clear the spinner line and print completion
  printf '\r%*s\r' "$(tput cols)" "" # Clear the line
  printf '✅  %s\n' "$msg"
}

########################################
# ⚙️  Utility – portable hash command
########################################
hash_cmd() {
  local file_to_hash="$1"
  local hash_val=""

  if ! [[ -f "$file_to_hash" ]]; then
     # File not found is not necessarily an error for this script's logic,
     # as 'find' might race against other processes. Print info and return empty.
     printf "ℹ️  Cannot hash non-existent file (might have been moved/deleted): %s\n" "$file_to_hash" >&2
     echo "" # Return empty string, signifies skippable file
     return 0
  fi

  if command -v sha1sum &> /dev/null; then
    hash_val=$(sha1sum "$file_to_hash" | cut -d' ' -f1)
  elif command -v shasum &> /dev/null; then
    hash_val=$(shasum -a 1 "$file_to_hash" | cut -d' ' -f1)
  else
    printf "❌ ERROR: Neither sha1sum nor shasum found. Cannot check duplicates.\n" >&2
    exit 1 # Critical error, cannot proceed reliably
  fi

  # Check if hashing command succeeded (should produce a non-empty hash)
  if [[ -z "$hash_val" ]]; then
      printf "❌ ERROR: Failed to compute hash for existing file: %s\n" "$file_to_hash" >&2
      exit 1 # Hashing failed for an existing file, critical error
  fi

  echo "$hash_val"
}

########################################
# 🔑 Validate EC public key format
########################################
validate_ec_key() {
  local key_file="$1"
  # Fail-fast if key doesn't exist
  if [[ ! -f "$key_file" ]]; then
    printf "❌ ERROR: Public key not found: %s\n" "$key_file" >&2
    return 1
  fi
  
  # Check file content for EC key indicators
  if ! grep -q "BEGIN PUBLIC KEY" "$key_file"; then
    printf "❌ ERROR: File %s is not a PEM public key\n" "$key_file" >&2
    return 1
  fi
  
  # If openssl available, verify EC key with prime256v1/secp256r1 curve (Tesla requirement)
  if command -v openssl &> /dev/null; then
    local key_info
    key_info=$(openssl ec -pubin -in "$key_file" -text -noout 2>/dev/null || echo "Not an EC key")
    if echo "$key_info" | grep -q "ASN1 ERROR"; then
      printf "❌ ERROR: Invalid EC key format in %s\n" "$key_file" >&2
      return 1
    fi
    # Check for correct curve (prime256v1/secp256r1) - required by Tesla
    if ! echo "$key_info" | grep -q -E "prime256v1|secp256r1|NIST P-256"; then
      printf "❌ ERROR: Public key not using Tesla-required prime256v1/secp256r1 curve in %s\n" "$key_file" >&2
      printf "   See: https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide#hosting-the-public-key\n" >&2
      return 1
    fi
  else
    printf "⚠️  WARNING: OpenSSL not available, cannot verify EC key curve (Tesla requires prime256v1)\n" >&2
  fi
  
  return 0
}

########################################
# 📂  Work-out where a file belongs
########################################
target_dir() {
  local f="$1"
  case "$f" in
    # Docs first
    *.md|env.txt|*.example) echo "$DOC_DIR" ;;
    # Source files (adjust patterns as needed)
    auth.js|config.js|dashboardClient.js|index.js|publicKeyServer.js|telemetryServer.js|teslaApi.js) echo "$SRC_DIR" ;;
    # Other JS files likely also source, unless specifically tests etc.
    *.js) echo "$SRC_DIR" ;;
    # Scripts
    *.sh) echo "$SCRIPT_DIR" ;;
    # Certs
    *.crt|*.key|*.pem) echo "$CERT_DIR" ;;
    # Delete common clutter
    ".DS_Store"|*~) echo "DELETE" ;;
    # Test files (assuming a 'test' dir - adjust if needed)
    *.test.js|test_*) echo "test" ;;
    # Default: leave unknown files
    *) echo "" ;;
  esac
}

########################################
# 🔎 Check Well-Known Structure
########################################
ensure_well_known_structure() {
  # Tesla requires the .well-known directory at the root, but also support in public/ for Vercel compatibility
  local root_well_known_dir=".well-known/appspecific"
  local public_well_known_dir="$PUBLIC_DIR/.well-known/appspecific"
  
  # Create both paths to ensure compatibility
  for dir in "$root_well_known_dir" "$public_well_known_dir"; do
    if ! mkdir -p "$dir"; then
      printf "❌ ERROR: Failed to create required well-known directory: %s\n" "$dir" >&2
      exit 1
    fi
  done
  
  # Check if we have a public key PEM file to copy to the well-known location
  local public_key_found=false
  
  # First check if the certs directory exists and contains any files
  if [[ ! -d "$CERT_DIR" || -z "$(ls -A "$CERT_DIR" 2>/dev/null)" ]]; then
    printf "ℹ️  Note: %s directory is empty. No public keys to process.\n" "$CERT_DIR" >&2
  else
    # Now look for public key files
    for key_file in "$CERT_DIR"/*.pem; do
      # Skip if the glob doesn't match any files
      [[ -e "$key_file" ]] || continue
      
      if [[ -f "$key_file" && "$(basename "$key_file")" =~ public[-_]key.pem ]]; then
        # Validate key format according to Tesla requirements
        if ! validate_ec_key "$key_file"; then
          printf "❌ ERROR: Public key %s failed validation\n" "$key_file" >&2
          continue
        fi
        
        printf "🔑 Found public key: %s - copying to well-known paths\n" "$key_file"
        
        # Copy to root .well-known (Tesla requirement)
        if ! cp "$key_file" "$root_well_known_dir/com.tesla.3p.public-key.pem"; then
          printf "❌ ERROR: Failed to copy public key to root well-known path\n" >&2
          exit 1
        fi
        
        # Also copy to public/.well-known for Vercel compatibility
        if ! cp "$key_file" "$public_well_known_dir/com.tesla.3p.public-key.pem"; then
          printf "❌ ERROR: Failed to copy public key to public well-known path\n" >&2
          exit 1
        fi
        
        public_key_found=true
        break
      fi
    done
  fi
  
  if ! $public_key_found; then
    printf "⚠️  No public key PEM file found in %s directory. Tesla integration requires a public key at %s\n" \
           "$CERT_DIR" "$WELL_KNOWN_PATH" >&2
    printf "   See: https://developer.tesla.com/docs/fleet-api/virtual-keys/developer-guide#hosting-the-public-key\n" >&2
  fi
}

########################################
# 🔧 Update JS/TS imports after moving
########################################
update_imports() {
  local file="$1"
  local original_path="$2"
  local new_path="$3"
  
  # Only process JS/TS files
  if [[ ! "$file" =~ \.(js|ts|jsx|tsx)$ ]]; then
    return 0
  fi
  
  local original_dir
  local new_dir
  original_dir=$(dirname "$original_path")
  new_dir=$(dirname "$new_path")
  
  # Calculate relative path difference for import adjustments
  # This is a simplified approach - a more robust solution would parse the AST
  if [[ "$original_dir" != "$new_dir" ]]; then
    printf "ℹ️  Note: %s moved from %s to %s - imports may need updating\n" "$(basename "$file")" "$original_dir" "$new_dir" >&2
  fi
}

########################################
# 🔍  Scan, move & dedupe
########################################
main() {
  local f hash dest fname
  
  # Verify required directories exist
  verify_dirs
  
  # Verify environment variables if .env exists
  verify_env
  
  printf "🔍 Starting cleanup in directory: %s\n" "$(pwd)"

  ####################################
  # 1. Detect duplicates (size+hash) #
  ####################################
  printf "🔎 Checking for duplicate files in root...\n"
  # Use find robustly with -print0 and read -d ''
  # Process files in root only, excluding known root files and self.
  while IFS= read -r -d '' f; do
    # Skip directories
    [[ -d "$f" ]] && continue

    # Skip explicitly kept root files
    local keep=false
    for k in "${KEEP_ROOT[@]}"; do [[ "./$k" == "$f" ]] && keep=true && break; done
    "$keep" && continue

    # Skip self
    [[ "$(basename "$f")" == "$SELF_NAME" ]] && continue

    hash=$(hash_cmd "$f")
    # Skip if hashing failed (e.g., file disappeared) - hash_cmd returns empty string
    [[ -z "$hash" ]] && continue

    # Check if we've seen this hash before (using file as storage instead of associative array)
    if grep -q "^${hash} " "${HASH_FILE}" 2>/dev/null; then
      local original_file
      original_file=$(grep "^${hash} " "${HASH_FILE}" | cut -d' ' -f2)
      printf "🗑️  Marking duplicate %s (same as %s) for removal\n" "$f" "$original_file"
      # Mark for deletion instead of immediate rm, process in next phase
      echo "$f DELETE" >> "${TARGET_FILE}"
    else
      echo "${hash} $f" >> "${HASH_FILE}"
      # Get target directory for non-duplicate files
      fname=$(basename "$f")
      dest=$(target_dir "$fname")
      if [[ -n "$dest" ]]; then
        echo "$f $dest" >> "${TARGET_FILE}"
      else
        printf "ℹ️  Skipping unknown file type: %s\n" "$f"
      fi
    fi
  done < <(find . -maxdepth 1 -mindepth 1 ! -path './.*' -print0) # Process top-level non-hidden files/dirs only, using null delimiter

  ####################################
  # 2. Relocate/Delete artefacts     #
  ####################################
  printf "🚚 Processing files for move/delete...\n"
  if [[ -f "${TARGET_FILE}" && -s "${TARGET_FILE}" ]]; then
    while IFS=' ' read -r f dest; do
      fname=$(basename "$f") # Recalculate basename just in case

      # Skip if file somehow disappeared between find and now
      [[ ! -e "$f" ]] && printf "⚠️  File %s disappeared before processing.\n" "$f" && continue

      if [[ "$dest" == "DELETE" ]]; then
        printf "🗑️  Removing %s\n" "$f"
        if ! rm "$f"; then
          printf "❌ ERROR: Failed to remove %s\n" "$f" >&2
          exit 1
        fi
        continue
      fi

      # Ensure destination exists (should be safe due to -p)
      if ! mkdir -p "$dest"; then
        printf "❌ ERROR: Failed to create directory %s\n" "$dest" >&2
        exit 1
      fi

      printf "📦  Moving %s → %s/\n" "$f" "$dest"
      # Store original path for import updates
      local original_path="$f"
      local new_path="$dest/$fname"
      
      if ! mv "$f" "$dest/"; then
        printf "❌ ERROR: Failed to move %s to %s\n" "$f" "$dest" >&2
        exit 1
      fi
      
      # Update imports for JS/TS files
      update_imports "$new_path" "$original_path" "$new_path"
    done < "${TARGET_FILE}"
  else
    printf "ℹ️  No files to process\n"
  fi

  ####################################
  # 3. Ensure Tesla-specific paths   #
  ####################################
  ensure_well_known_structure

  printf "\n🏁  tidyup.sh complete.\n"
  # Check if script is already in the correct directory
  if [[ "$(dirname "$0")" != "$SCRIPT_DIR" && "$SCRIPT_DIR" != "." && -f "$0" ]]; then
      local script_path
      script_path=$(readlink -f "$0" 2>/dev/null || echo "$0")
      printf "ℹ️  Consider moving '%s' to the '%s/' directory for better organization.\n" "$SELF_NAME" "$SCRIPT_DIR"
  fi
}

# Trap for cleanup on script exit
trap 'printf "\n❌ Script execution interrupted or failed.\n" >&2; exit 1' ERR INT TERM

# Initialize the temporary files
: > "${HASH_FILE}"
: > "${TARGET_FILE}"

# Run main function in background and display spinner
main & spin "Re-organising project structure"

exit 0
