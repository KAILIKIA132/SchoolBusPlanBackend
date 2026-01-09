#!/bin/bash

echo "🧪 Testing School Transport API Endpoints"
echo "=========================================="
echo ""

BASE_URL="http://localhost:3001"

echo "1. Testing root endpoint..."
curl -s "$BASE_URL/" | jq '.' 2>/dev/null || curl -s "$BASE_URL/"
echo ""
echo ""

echo "2. Testing health check..."
curl -s "$BASE_URL/health" | jq '.' 2>/dev/null || curl -s "$BASE_URL/health"
echo ""
echo ""

echo "3. Testing login endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.com","password":"admin123"}')
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

# Extract token if login successful
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ -n "$TOKEN" ]; then
  echo "✅ Login successful! Token extracted."
  echo ""
  echo "4. Testing authenticated endpoint (GET /api/users)..."
  curl -s "$BASE_URL/api/users" \
    -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/users" -H "Authorization: Bearer $TOKEN"
  echo ""
  echo ""
else
  echo "❌ Login failed. Check credentials."
  echo ""
fi

echo "5. Testing non-existent endpoint (should return 404)..."
curl -s "$BASE_URL/api/nonexistent" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/nonexistent"
echo ""
echo ""

echo "✅ API Test Complete!"
echo ""
echo "If you see 404 errors, check:"
echo "  - Is the endpoint URL correct? (must include /api prefix)"
echo "  - Is the HTTP method correct? (GET, POST, etc.)"
echo "  - Is authentication required? (add Authorization header)"
echo ""
echo "See TROUBLESHOOTING.md for more help."



