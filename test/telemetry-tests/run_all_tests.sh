#!/bin/bash
# Master script to run all telemetry server tests
# Executes all test scripts and summarizes the results

echo "=========================================="
echo "TESLA TELEMETRY SERVER TEST SUITE"
echo "=========================================="
echo "Target: tesla-telemetry-server-2.fly.dev"
echo "Time: $(date)"
echo "=========================================="

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
echo "Script directory: $SCRIPT_DIR"

# Make sure all test scripts are executable
find "$SCRIPT_DIR" -name "[0-9]*.sh" -exec chmod +x {} \;

# Initialize counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test and track its success/failure
run_test() {
  local test_script=$1
  local test_name=$(basename "$test_script")
  
  echo -e "\n\n=========================================="
  echo "RUNNING TEST: $test_name"
  echo "=========================================="
  
  # Run the test
  "$test_script"
  local exit_code=$?
  
  # Increment counters
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  if [ $exit_code -eq 0 ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    TEST_RESULTS+=("✅ PASSED: $test_name")
  else
    FAILED_TESTS=$((FAILED_TESTS + 1))
    TEST_RESULTS+=("❌ FAILED: $test_name (Exit code: $exit_code)")
  fi
  
  return $exit_code
}

# Array to store test results
TEST_RESULTS=()

# Check if there are any test files
TEST_FILES=("$SCRIPT_DIR"/0*_*.sh)
if [ ${#TEST_FILES[@]} -eq 0 ] || [ ! -f "${TEST_FILES[0]}" ]; then
  echo "⚠️ WARNING: No test scripts found matching pattern 0*_*.sh in $SCRIPT_DIR"
  # Try to find test files with any numeric prefix
  TEST_FILES=("$SCRIPT_DIR"/[0-9]*_*.sh)
  if [ ${#TEST_FILES[@]} -eq 0 ] || [ ! -f "${TEST_FILES[0]}" ]; then
    echo "❌ ERROR: No test scripts found in $SCRIPT_DIR"
    exit 1
  fi
fi

# Run each test
for test_script in "$SCRIPT_DIR"/[0-9]*_*.sh; do
  if [ -f "$test_script" ]; then
    run_test "$test_script"
  fi
done

# Print summary
echo -e "\n\n=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo "Total tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo "=========================================="

# Print detailed results
echo -e "\nDetailed Results:"
for result in "${TEST_RESULTS[@]}"; do
  echo "$result"
done

# Set exit code based on whether all tests passed
if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "\n✅ ALL TESTS PASSED!"
  exit 0
else
  echo -e "\n❌ SOME TESTS FAILED!"
  exit 1
fi 