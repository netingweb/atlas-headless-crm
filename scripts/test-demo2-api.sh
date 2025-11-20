#!/bin/bash

# Test script for demo2 tenant API calls
# This script tests the global/local entity logic

API_BASE="http://localhost:3000/api"
TENANT="demo2"
UNIT_MILANO="milano_sales"
UNIT_ROMA="roma_sales"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Demo2 API Testing - Global/Local Logic${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 1. Login and get token
echo -e "${BLUE}1. Login as admin@demo2.local${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "demo2",
    "email": "admin@demo2.local",
    "password": "changeme"
  }')

TOKEN=$(printf '%s' "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  printf '%s' "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo -e "Token: ${TOKEN:0:50}...\n"

# 2. Test global entities (product) - should be visible from any unit
echo -e "${BLUE}2. Test Global Entity (product)${NC}"
echo -e "   Fetching products from ${UNIT_MILANO}..."

PRODUCTS_MILANO=$(curl -s -X GET "${API_BASE}/${TENANT}/${UNIT_MILANO}/product" \
  -H "Authorization: Bearer ${TOKEN}")

COUNT_MILANO=$(printf '%s' "$PRODUCTS_MILANO" | jq '. | length')
echo -e "${GREEN}   ✅ Found ${COUNT_MILANO} products from ${UNIT_MILANO}${NC}"

echo -e "   Fetching products from ${UNIT_ROMA}..."
PRODUCTS_ROMA=$(curl -s -X GET "${API_BASE}/${TENANT}/${UNIT_ROMA}/product" \
  -H "Authorization: Bearer ${TOKEN}")

COUNT_ROMA=$(printf '%s' "$PRODUCTS_ROMA" | jq '. | length')
echo -e "${GREEN}   ✅ Found ${COUNT_ROMA} products from ${UNIT_ROMA}${NC}"

if [ "$COUNT_MILANO" == "$COUNT_ROMA" ]; then
  echo -e "${GREEN}   ✅ PASS: Global entities (product) are visible from all units${NC}\n"
else
  echo -e "${RED}   ❌ FAIL: Product counts differ between units (should be the same for global entities)${NC}\n"
fi

# 3. Test local entities (task) - should be different per unit
echo -e "${BLUE}3. Test Local Entity (task)${NC}"
echo -e "   Fetching tasks from ${UNIT_MILANO}..."

TASKS_MILANO=$(curl -s -X GET "${API_BASE}/${TENANT}/${UNIT_MILANO}/task" \
  -H "Authorization: Bearer ${TOKEN}")

TASK_COUNT_MILANO=$(printf '%s' "$TASKS_MILANO" | jq '. | length')
echo -e "   Found ${TASK_COUNT_MILANO} tasks from ${UNIT_MILANO}"
if [ "$TASK_COUNT_MILANO" -gt 0 ]; then
  printf '%s' "$TASKS_MILANO" | jq -r '.[] | "- \(.title)"'
fi

echo -e "   Fetching tasks from ${UNIT_ROMA}..."
TASKS_ROMA=$(curl -s -X GET "${API_BASE}/${TENANT}/${UNIT_ROMA}/task" \
  -H "Authorization: Bearer ${TOKEN}")

TASK_COUNT_ROMA=$(printf '%s' "$TASKS_ROMA" | jq '. | length')
echo -e "   Found ${TASK_COUNT_ROMA} tasks from ${UNIT_ROMA}"
if [ "$TASK_COUNT_ROMA" -gt 0 ]; then
  printf '%s' "$TASKS_ROMA" | jq -r '.[] | "- \(.title)"'
fi

if [ "$TASK_COUNT_MILANO" != "$TASK_COUNT_ROMA" ]; then
  echo -e "${GREEN}   ✅ PASS: Local entities (task) are unit-specific${NC}\n"
else
  echo -e "${RED}   ⚠️  WARNING: Task counts are the same (could be OK if both units have same number of tasks)${NC}\n"
fi

# 4. Test global contact entity
echo -e "${BLUE}4. Test Global Entity (contact)${NC}"
echo -e "   Fetching contacts from ${UNIT_MILANO}..."

CONTACTS_MILANO=$(curl -s -X GET "${API_BASE}/${TENANT}/${UNIT_MILANO}/contact" \
  -H "Authorization: Bearer ${TOKEN}")

CONTACT_COUNT_MILANO=$(printf '%s' "$CONTACTS_MILANO" | jq '. | length')
echo -e "   Found ${CONTACT_COUNT_MILANO} contacts from ${UNIT_MILANO}"
if [ "$CONTACT_COUNT_MILANO" -gt 0 ]; then
  printf '%s' "$CONTACTS_MILANO" | jq -r '.[] | "- \(.first_name) \(.last_name)"'
fi

echo -e "   Fetching contacts from ${UNIT_ROMA}..."
CONTACTS_ROMA=$(curl -s -X GET "${API_BASE}/${TENANT}/${UNIT_ROMA}/contact" \
  -H "Authorization: Bearer ${TOKEN}")

CONTACT_COUNT_ROMA=$(printf '%s' "$CONTACTS_ROMA" | jq '. | length')
echo -e "   Found ${CONTACT_COUNT_ROMA} contacts from ${UNIT_ROMA}"
if [ "$CONTACT_COUNT_ROMA" -gt 0 ]; then
  printf '%s' "$CONTACTS_ROMA" | jq -r '.[] | "- \(.first_name) \(.last_name)"'
fi

if [ "$CONTACT_COUNT_MILANO" == "$CONTACT_COUNT_ROMA" ]; then
  echo -e "${GREEN}   ✅ PASS: Global entities (contact) are visible from all units${NC}\n"
else
  echo -e "${RED}   ❌ FAIL: Contact counts differ between units (should be the same for global entities)${NC}\n"
fi

# 5. Test search for global entities
echo -e "${BLUE}5. Test Search for Global Entities${NC}"
echo -e "   Searching for 'BMW' in products from ${UNIT_MILANO}..."

SEARCH_MILANO=$(curl -s -X POST "${API_BASE}/${TENANT}/${UNIT_MILANO}/search/text" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "bmw",
    "entity": "product",
    "per_page": 10
  }')

SEARCH_COUNT_MILANO=$(printf '%s' "$SEARCH_MILANO" | jq '.found // 0')
echo -e "   Found ${SEARCH_COUNT_MILANO} results from ${UNIT_MILANO}"

echo -e "   Searching for 'BMW' in products from ${UNIT_ROMA}..."
SEARCH_ROMA=$(curl -s -X POST "${API_BASE}/${TENANT}/${UNIT_ROMA}/search/text" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "bmw",
    "entity": "product",
    "per_page": 10
  }')

SEARCH_COUNT_ROMA=$(printf '%s' "$SEARCH_ROMA" | jq '.found // 0')
echo -e "   Found ${SEARCH_COUNT_ROMA} results from ${UNIT_ROMA}"

if [ "$SEARCH_COUNT_MILANO" == "$SEARCH_COUNT_ROMA" ]; then
  echo -e "${GREEN}   ✅ PASS: Search for global entities returns same results from all units${NC}\n"
else
  echo -e "${RED}   ❌ FAIL: Search results differ between units for global entities${NC}\n"
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Global Entities (should be visible from all units):"
echo -e "  - product: ${COUNT_MILANO} from milano_sales, ${COUNT_ROMA} from roma_sales"
echo -e "  - contact: ${CONTACT_COUNT_MILANO} from milano_sales, ${CONTACT_COUNT_ROMA} from roma_sales"
echo -e "Local Entities (should be unit-specific):"
echo -e "  - task: ${TASK_COUNT_MILANO} from milano_sales, ${TASK_COUNT_ROMA} from roma_sales"
echo -e "${BLUE}========================================${NC}\n"

