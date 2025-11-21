#!/bin/bash

# MCP Tools Test Script
# This script runs the TypeScript test suite for MCP tools

API_BASE="${1:-http://localhost:3000/api}"
TENANT="${2:-demo}"
UNIT="${3:-sales}"
EMAIL="${4:-admin@demo.local}"
PASSWORD="${5:-changeme}"

echo "=========================================="
echo "MCP Tools Test Suite"
echo "=========================================="
echo "API Base: $API_BASE"
echo "Tenant: $TENANT"
echo "Unit: $UNIT"
echo "Email: $EMAIL"
echo "=========================================="
echo ""

# Check if tsx is available
if ! command -v tsx &> /dev/null; then
  echo "Error: tsx is not installed. Please install it with: pnpm add -D tsx"
  exit 1
fi

# Run the test script
tsx scripts/test-mcp-tools.ts "$API_BASE" "$TENANT" "$UNIT" "$EMAIL" "$PASSWORD"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ All tests passed!"
else
  echo ""
  echo "❌ Some tests failed. Check the output above for details."
fi

exit $EXIT_CODE


