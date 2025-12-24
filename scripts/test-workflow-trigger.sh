#!/bin/bash

# Script per testare il trigger manuale del workflow
# Usage: ./scripts/test-workflow-trigger.sh [contact_id] [email]

# Configurazione
TENANT="demo"
UNIT="sales"
WORKFLOW_ID="dd071a43-858b-4749-b8db-66c443b24c7b"
API_URL="http://localhost:3000"

# Parametri (usa valori di default se non forniti)
CONTACT_ID="${1:-67474c6e6e5d70ea8b7c0881}"
EMAIL="${2:-test@example.com}"

# Token JWT (dovrai sostituirlo con uno valido)
# Puoi ottenerlo dal browser (Developer Tools > Application > Local Storage)
JWT_TOKEN="${JWT_TOKEN:-YOUR_JWT_TOKEN_HERE}"

echo "🚀 Triggering workflow manually..."
echo "📋 Workflow ID: $WORKFLOW_ID"
echo "👤 Contact ID: $CONTACT_ID"
echo "📧 Email: $EMAIL"
echo ""

# Esegui la chiamata API
curl -X POST "$API_URL/$TENANT/$UNIT/workflows/$WORKFLOW_ID/run" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"context\": {
      \"entity_id\": \"$CONTACT_ID\",
      \"entity\": \"contact\",
      \"data\": {
        \"email\": \"$EMAIL\",
        \"name\": \"Test Contact\"
      }
    },
    \"actor\": \"manual_test\"
  }" | jq '.'

echo ""
echo "✅ Workflow triggered!"
echo "📊 Check execution logs at: $API_URL/$TENANT/$UNIT/workflows/$WORKFLOW_ID/executions"






