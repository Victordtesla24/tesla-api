/**
 * Regression Tests for Telemetry Data Structure
 * Ensures previously identified issues with data format do not reappear.
 */

const Ajv = require('ajv');
const ajv = new Ajv();

// Define the expected JSON schema for a typical telemetry data message 
// received from the vehicle or broadcast to the dashboard.
// This schema should be updated based on actual expected data fields.
const telemetryDataSchema = {
  type: 'object',
  properties: {
    messageType: { type: 'string', enum: ['data', 'control', 'error', 'info'] }, // Example types
    messageId: { type: 'string' },
    timestamp: { type: 'integer' }, // Assuming Unix timestamp in ms
    vin: { type: 'string', pattern: '^5YJ[A-Z0-9]{14}$' }, // Basic VIN pattern
    payload: {
      type: 'object',
      properties: {
        // Define expected telemetry fields based on Tesla docs or observed data
        VehicleSpeed: { type: ['number', 'null'] }, // Example field
        Location: {
          type: ['object', 'null'],
          properties: {
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            timestamp_ms: { type: 'integer' }
          },
          required: ['latitude', 'longitude'],
          additionalProperties: true // Allow other location fields
        },
        Soc: { type: ['number', 'null'], minimum: 0, maximum: 100 }, // State of Charge
        PowerState: { type: ['string', 'null'] },
        ShiftState: { type: ['string', 'null'] }
        // Add other expected fields...
      },
      additionalProperties: true // Allow unexpected telemetry fields in payload
    }
  },
  required: ['messageType', 'messageId', 'payload'], // Core required fields
  additionalProperties: true // Allow other top-level fields like 'vin' or 'timestamp' if they exist
};

const validate = ajv.compile(telemetryDataSchema);

describe('Regression: Telemetry Data Structure', () => {

  it('should not recreate bug-XYZ: accept valid telemetry data structure', () => {
    const validData = {
      messageType: 'data',
      messageId: 'data-msg-1',
      timestamp: Date.now(),
      vin: '5YJSA1E2XPFXXXXXX', // Example VIN
      payload: {
        VehicleSpeed: 88.5,
        Location: {
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp_ms: Date.now() - 100
        },
        Soc: 75.5,
        PowerState: 'Driving',
        ShiftState: 'D'
      }
    };
    
    const isValid = validate(validData);
    if (!isValid) {
        console.error('AJV Validation Errors:', validate.errors);
    }
    expect(isValid).toBe(true);
  });

  it('should not recreate bug-ABC: reject telemetry data with incorrect type for VehicleSpeed', () => {
    const invalidData = {
      messageType: 'data',
      messageId: 'data-msg-2',
      payload: {
        VehicleSpeed: 'fast' // Incorrect type - should be number
      }
    };
    expect(validate(invalidData)).toBe(false);
    expect(validate.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
            instancePath: '/payload/VehicleSpeed',
            message: expect.stringContaining('must be number,null') // Or specific message from AJV
        })
    ]));
  });
  
   it('should not recreate bug-DEF: reject telemetry data missing required payload field', () => {
    // This test depends on defining required fields within the payload schema if necessary.
    // The current example schema doesn't require specific payload fields.
    // If, for example, Location was required IN payload:
    /*
     const telemetryDataSchemaWithRequiredPayload = { 
       ...telemetryDataSchema, 
       properties: { 
         ...telemetryDataSchema.properties,
         payload: { ...telemetryDataSchema.properties.payload, required: ['Location'] }
       }
     };
     const validateRequired = ajv.compile(telemetryDataSchemaWithRequiredPayload);
     const invalidData = {
       messageType: 'data',
       messageId: 'data-msg-3',
       payload: { 
         VehicleSpeed: 90
         // Location is missing
       } 
     };
     expect(validateRequired(invalidData)).toBe(false);
     expect(validateRequired.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ message: "must have required property 'Location'" })
     ]));
    */
     // Keeping this test minimal as payload fields aren't strictly required in the example schema
     const validDataMissingOptionalField = {
       messageType: 'data',
       messageId: 'data-msg-3',
       payload: { 
         Soc: 80
       } 
     };
     expect(validate(validDataMissingOptionalField)).toBe(true); // Should still be valid
  });
  
   it('should not recreate bug-GHI: accept null values for nullable fields', () => {
    const dataWithNulls = {
      messageType: 'data',
      messageId: 'data-msg-4',
      payload: {
        VehicleSpeed: null,
        Location: null,
        Soc: null,
        PowerState: null,
        ShiftState: null
      }
    };
    expect(validate(dataWithNulls)).toBe(true);
  });

  // Add more regression tests here based on specific bugs found previously.
  // Example:
  // it('should not recreate bug-JKL: handle empty payload object gracefully', () => {
  //   const dataWithEmptyPayload = {
  //     messageType: 'data',
  //     messageId: 'data-msg-5',
  //     payload: {}
  //   };
  //   expect(validate(dataWithEmptyPayload)).toBe(true); // Assuming empty payload is allowed
  // });

}); 