#!/bin/bash
# Script di test per Document Management API

API_URL="http://localhost:3000/api"
TENANT="demo"
UNIT="sales"

echo "🧪 Testing Document Management API..."
echo ""

# 1. Health Check
echo "1️⃣ Health Check..."
HEALTH=$(curl -s "$API_URL/health")
if [ $? -eq 0 ]; then
  echo "✅ API is running"
  echo "$HEALTH" | jq '.' 2>/dev/null || echo "$HEALTH"
else
  echo "❌ API not responding"
  exit 1
fi
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

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token' 2>/dev/null)
if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo $LOGIN_RESPONSE
  exit 1
fi
echo "✅ Login successful"
echo "Token: ${TOKEN:0:50}..."
echo ""

# 3. List Documents (should be empty initially)
echo "3️⃣ List Documents..."
DOCUMENTS=$(curl -s "$API_URL/$TENANT/$UNIT/documents" \
  -H "Authorization: Bearer $TOKEN")
echo "$DOCUMENTS" | jq '.' 2>/dev/null || echo "$DOCUMENTS"
echo ""

# 4. Create a test document (upload)
echo "4️⃣ Upload Test Document..."
# Create a simple test file
echo "This is a test document content for testing the document management system." > /tmp/test-document.txt

UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/$TENANT/$UNIT/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test-document.txt" \
  -F "title=Test Document" \
  -F "document_type=technical_manual")

DOCUMENT_ID=$(echo $UPLOAD_RESPONSE | jq -r '._id' 2>/dev/null)
if [ "$DOCUMENT_ID" = "null" ] || [ -z "$DOCUMENT_ID" ]; then
  echo "❌ Upload failed"
  echo $UPLOAD_RESPONSE | jq '.' 2>/dev/null || echo $UPLOAD_RESPONSE
  exit 1
fi
echo "✅ Document uploaded: $DOCUMENT_ID"
echo "$UPLOAD_RESPONSE" | jq '.' 2>/dev/null || echo "$UPLOAD_RESPONSE"
echo ""

# 5. Get Document
echo "5️⃣ Get Document..."
GET_RESPONSE=$(curl -s "$API_URL/$TENANT/$UNIT/documents/$DOCUMENT_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "$GET_RESPONSE" | jq '.' 2>/dev/null || echo "$GET_RESPONSE"
echo ""

# 6. List Documents again
echo "6️⃣ List Documents (after upload)..."
DOCUMENTS=$(curl -s "$API_URL/$TENANT/$UNIT/documents" \
  -H "Authorization: Bearer $TOKEN")
DOC_COUNT=$(echo "$DOCUMENTS" | jq 'length' 2>/dev/null || echo "0")
echo "Found $DOC_COUNT documents"
echo ""

# 7. Update Document Metadata
echo "7️⃣ Update Document Metadata..."
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/$TENANT/$UNIT/documents/$DOCUMENT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Updated Test Document"}')
echo "$UPDATE_RESPONSE" | jq '.' 2>/dev/null || echo "$UPDATE_RESPONSE"
echo ""

# 8. Download Document
echo "8️⃣ Download Document..."
DOWNLOAD_RESPONSE=$(curl -s "$API_URL/$TENANT/$UNIT/documents/$DOCUMENT_ID/download" \
  -H "Authorization: Bearer $TOKEN" \
  -o /tmp/downloaded-document.txt)
if [ -f /tmp/downloaded-document.txt ]; then
  echo "✅ Document downloaded successfully"
  echo "Content: $(head -1 /tmp/downloaded-document.txt)"
else
  echo "❌ Download failed"
fi
echo ""

# 9. Cleanup - Delete Document
echo "9️⃣ Delete Document..."
DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/$TENANT/$UNIT/documents/$DOCUMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP Status: %{http_code}\n")
echo "$DELETE_RESPONSE"
echo ""

echo "✅ All document tests completed!"

