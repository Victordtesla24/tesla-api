const Ajv = require("ajv");
const ajv = new Ajv();

// Define a basic schema for expected telemetry data structure (example)
// This should be refined based on actual expected data or specific bug fixes
const telemetryDataSchema = {
  type: "object",
  properties: {
    // Example properties based on default config.js fields
    ShiftState: { type: ["string", "null"] }, // Allow null if applicable
    VehicleSpeed: { type: "number" },
    DriveBearing: { type: "number" },
    Location: { type: ["object", "null"], properties: { latitude: {type: "number"}, longitude: {type: "number"}}, required: ["latitude", "longitude"] },
    Elevation: { type: "number" },
    EstBatteryRange: { type: "number" },
    Heading: { type: "number" },
    Power: { type: "number" },
    Soc: { type: "number" },
    // Add rawData for buffer fallback test
    rawData: { type: "string", pattern: "^[0-9a-fA-F]+$" }, // Hex string
    timestamp: {type: "number" },
    // Add fields related to past bugs
    // bugXYZ_field: { type: "string", minLength: 1 }
  },
  // Adjust required fields based on actual expectations
  // required: ["VehicleSpeed", "Location", "Soc"]
};

const validate = ajv.compile(telemetryDataSchema);

describe("Regression Test: Data Validation", () => {
    it('BUG-123: should validate a typical telemetry data object', () => {
        const goodData = {
            VehicleSpeed: 55.5,
            Location: { latitude: 34.05, longitude: -118.24 },
            Soc: 80.1,
            // other optional fields...
        };
        const valid = validate(goodData);
        expect(valid).toBe(true);
        if (!valid) console.log(validate.errors); // Log errors if validation fails
    });

     it('BUG-456: should handle null values correctly where allowed', () => {
         const dataWithNull = {
            ShiftState: null, // Allowed by schema
            VehicleSpeed: 0,
            Location: null, // Allowed by schema
            Soc: 10,
         };
         const valid = validate(dataWithNull);
         expect(valid).toBe(true);
          if (!valid) console.log(validate.errors);
     });

     it('BUG-789: should fail validation for incorrect data types', () => {
         const badData = {
             VehicleSpeed: "not-a-number", // Incorrect type
             Location: { latitude: 34.05, longitude: -118.24 },
             Soc: 80,
         };
         const valid = validate(badData);
         expect(valid).toBe(false);
         expect(validate.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ instancePath: '/VehicleSpeed', keyword: 'type' })
            ])
         );
     });

      it('BUG-101: should validate the placeholder structure for unparsed buffer data', () => {
         const bufferPlaceholder = {
             rawData: 'abcdef0123456789',
             timestamp: Date.now()
         };
         const valid = validate(bufferPlaceholder);
         expect(valid).toBe(true);
         if (!valid) console.log(validate.errors);
     });

     it('BUG-101: should fail validation for invalid rawData format', () => {
         const badBufferPlaceholder = {
             rawData: 'not-hex', // Invalid format
             timestamp: Date.now()
         };
         const valid = validate(badBufferPlaceholder);
         expect(valid).toBe(false);
         expect(validate.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ instancePath: '/rawData', keyword: 'pattern' })
            ])
         );
     });

    // Add more specific tests for regressions based on bug IDs/descriptions
    // it('BUG-XYZ: should handle scenario Z correctly', () => { ... });
});
