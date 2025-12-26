#!/bin/bash

JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTIxZjc0NDBhZTZiNjBiZTM2Zjk4NTgiLCJ0ZW5hbnRfaWQiOiJkZW1vIiwidW5pdF9pZCI6InNhbGVzIiwicm9sZXMiOlsiYWRtaW4iXSwic2NvcGVzIjpbImNybTpyZWFkIiwiY3JtOndyaXRlIiwiY3JtOmRlbGV0ZSIsIndvcmtmbG93czptYW5hZ2UiLCJ3b3JrZmxvd3M6ZXhlY3V0ZSJdLCJpYXQiOjE3NjQyMzUyNjUsImV4cCI6MTc2NDMyMTY2NX0.nG99eCDZy1FK3whMNSEhrKurtJFfn1Okm0VSj-EwynI"

echo "🔍 Cercando data_servizi in demo/sales..."
echo ""

# Lista tutti i data_servizi
curl -s "http://localhost:3000/api/demo/sales/data_servizi?limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.'

echo ""
echo "📋 Cercando il record specifico: 692834e154c78309ef506191"
echo ""

# Cerca il record specifico
curl -s "http://localhost:3000/api/demo/sales/data_servizi/692834e154c78309ef506191" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.'







