#!/bin/bash
# Script di test rapido per CRM Atlas API

API_URL="http://localhost:3000/api"
TENANT="demo"
UNIT="sales"

echo "🧪 Testing CRM Atlas API..."
echo ""

# 1. Health Check
echo "1️⃣ Health Check..."
curl -s "$API_URL/health" | jq '.' || echo "❌ Health check failed"
echo ""

# 2. Login
echo "2️⃣ Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenant_id\": \"$TENANT\",
    \"email\": \"admin@demo.local\",
    \"password\": \"changeme\"
  }")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo $LOGIN_RESPONSE | jq '.'
  exit 1
fi
echo "✅ Login successful"
echo "Token: ${TOKEN:0:50}..."
echo ""

# 3. Create Lead
echo "3️⃣ Create Lead..."
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/$TENANT/$UNIT/lead" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "company": "Test Corp",
    "status": "new",
    "notes": "Test lead created via script"
  }')

LEAD_ID=$(echo $CREATE_RESPONSE | jq -r '._id')
if [ "$LEAD_ID" = "null" ] || [ -z "$LEAD_ID" ]; then
  echo "❌ Create lead failed"
  echo $CREATE_RESPONSE | jq '.'
  exit 1
fi
echo "✅ Lead created: $LEAD_ID"
echo ""

# 4. Get Lead
echo "4️⃣ Get Lead..."
curl -s "$API_URL/$TENANT/$UNIT/lead/$LEAD_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.' || echo "❌ Get lead failed"
echo ""

# 5. List Leads
echo "5️⃣ List Leads..."
curl -s "$API_URL/$TENANT/$UNIT/lead" \
  -H "Authorization: Bearer $TOKEN" | jq 'length' && echo " leads found" || echo "❌ List leads failed"
echo ""

# 6. Update Lead
echo "6️⃣ Update Lead..."
curl -s -X PUT "$API_URL/$TENANT/$UNIT/lead/$LEAD_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "contacted"}' | jq '.status' && echo "✅ Lead updated" || echo "❌ Update failed"
echo ""

echo "✅ All tests completed!"
