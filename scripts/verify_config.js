#!/usr/bin/env node

/**
 * Tesla Fleet API Integration - Verify Telemetry Configuration Sync Status
 * 
 * This script checks if the telemetry configuration for the specified vehicle
 * has been successfully synced by Tesla.
 */

// Load .env variables relative to project root
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const teslaApi = require('../src/teslaApi');
const config = require('../src/config');

async function verifySync() {
  const vin = config.TESLA.VIN;
  if (!vin) {
    console.error('Error: TESLA_VIN environment variable not set.');
    process.exit(1);
  }

  console.log(`Verifying telemetry config sync status for VIN: ${vin}...`);

  try {
    const status = await teslaApi.getVehicleTelemetryConfigStatus(vin);

    if (status && status.synced === true) {
      console.log('✅ Success: Telemetry configuration is synced!');
      process.exit(0);
    } else if (status && status.synced === false) {
      console.error('❌ Error: Telemetry configuration is NOT synced yet.');
      console.error('   Response:', JSON.stringify(status, null, 2));
      process.exit(1);
    } else {
      console.error('❌ Error: Unexpected response format or missing 'synced' field.');
      console.error('   Response:', JSON.stringify(status, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error fetching telemetry config status:', error.message);
    process.exit(1);
  }
}

verifySync().catch(err => {
  console.error("Verification script failed unexpectedly:", err);
  process.exit(1);
}); 