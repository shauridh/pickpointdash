#!/bin/bash

# Test all possible GetSender payload variants
ENDPOINT="https://seen.getsender.id/send-message"
API_KEY="yBMXcDk5iWz9MdEmyu8eBH2uhcytui"
SENDER="6285777875132"
NUMBER="6285777875132"
MESSAGE="Test message"

echo "=== Testing GetSender API Variants ==="
echo "Endpoint: $ENDPOINT"
echo "API Key: $API_KEY"
echo "Sender: $SENDER"
echo "Number: $NUMBER"
echo ""

# Variant 1: JSON with api_key, sender, number, message
echo "1. JSON: api_key, sender, number, message"
curl -sS -m 10 -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"api_key\":\"$API_KEY\",\"sender\":\"$SENDER\",\"number\":\"$NUMBER\",\"message\":\"$MESSAGE\"}" \
  | jq -r '.msg // .error // .' 2>/dev/null || echo "Failed"
echo ""

# Variant 2: JSON with api_key as Bearer header
echo "2. JSON + Bearer header"
curl -sS -m 10 -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{\"sender\":\"$SENDER\",\"number\":\"$NUMBER\",\"message\":\"$MESSAGE\"}" \
  | jq -r '.msg // .error // .' 2>/dev/null || echo "Failed"
echo ""

# Variant 3: JSON with x-api-key header
echo "3. JSON + x-api-key header"
curl -sS -m 10 -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{\"sender\":\"$SENDER\",\"number\":\"$NUMBER\",\"message\":\"$MESSAGE\"}" \
  | jq -r '.msg // .error // .' 2>/dev/null || echo "Failed"
echo ""

# Variant 4: Form-urlencoded
echo "4. Form-urlencoded: api_key, sender, number, message"
curl -sS -m 10 -X POST "$ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "api_key=$API_KEY&sender=$SENDER&number=$NUMBER&message=$MESSAGE" \
  | jq -r '.msg // .error // .' 2>/dev/null || echo "Failed"
echo ""

# Variant 5: Query string
echo "5. Query string: api_key, sender, number, message"
curl -sS -m 10 -X POST "$ENDPOINT?api_key=$API_KEY&sender=$SENDER&number=$NUMBER&message=$MESSAGE" \
  -H "Content-Type: application/json" \
  | jq -r '.msg // .error // .' 2>/dev/null || echo "Failed"
echo ""

# Variant 6: JSON with phone instead of number
echo "6. JSON: api_key, sender, phone, message"
curl -sS -m 10 -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"api_key\":\"$API_KEY\",\"sender\":\"$SENDER\",\"phone\":\"$NUMBER\",\"message\":\"$MESSAGE\"}" \
  | jq -r '.msg // .error // .' 2>/dev/null || echo "Failed"
echo ""

# Variant 7: JSON with recipient instead of number
echo "7. JSON: api_key, sender, recipient, message"
curl -sS -m 10 -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"api_key\":\"$API_KEY\",\"sender\":\"$SENDER\",\"recipient\":\"$NUMBER\",\"message\":\"$MESSAGE\"}" \
  | jq -r '.msg // .error // .' 2>/dev/null || echo "Failed"
echo ""

# Variant 8: JSON with to instead of number
echo "8. JSON: api_key, sender, to, message"
curl -sS -m 10 -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"api_key\":\"$API_KEY\",\"sender\":\"$SENDER\",\"to\":\"$NUMBER\",\"message\":\"$MESSAGE\"}" \
  | jq -r '.msg // .error // .' 2>/dev/null || echo "Failed"
echo ""

# Variant 9: JSON with text instead of message
echo "9. JSON: api_key, sender, number, text"
curl -sS -m 10 -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"api_key\":\"$API_KEY\",\"sender\":\"$SENDER\",\"number\":\"$NUMBER\",\"text\":\"$MESSAGE\"}" \
  | jq -r '.msg // .error // .' 2>/dev/null || echo "Failed"
echo ""

# Variant 10: Only key in header, rest in JSON body
echo "10. x-api-key header + JSON body"
curl -sS -m 10 -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{\"sender\":\"$SENDER\",\"number\":\"$NUMBER\",\"message\":\"$MESSAGE\"}" \
  | jq -r '.msg // .error // .' 2>/dev/null || echo "Failed"
echo ""

# Variant 11: Sender as account_id
echo "11. JSON: api_key, account_id, number, message"
curl -sS -m 10 -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"api_key\":\"$API_KEY\",\"account_id\":\"$SENDER\",\"number\":\"$NUMBER\",\"message\":\"$MESSAGE\"}" \
  | jq -r '.msg // .error // .' 2>/dev/null || echo "Failed"
echo ""

# Variant 12: Sender as device_id
echo "12. JSON: api_key, device_id, number, message"
curl -sS -m 10 -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"api_key\":\"$API_KEY\",\"device_id\":\"$SENDER\",\"number\":\"$NUMBER\",\"message\":\"$MESSAGE\"}" \
  | jq -r '.msg // .error // .' 2>/dev/null || echo "Failed"
echo ""

# Variant 13: Sender as from
echo "13. JSON: api_key, from, number, message"
curl -sS -m 10 -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"api_key\":\"$API_KEY\",\"from\":\"$SENDER\",\"number\":\"$NUMBER\",\"message\":\"$MESSAGE\"}" \
  | jq -r '.msg // .error // .' 2>/dev/null || echo "Failed"
echo ""

# Variant 14: Try without api_key in body - only in header
echo "14. Only header auth (Authorization: Bearer)"
curl -sS -m 10 -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{\"sender\":\"$SENDER\",\"number\":\"$NUMBER\",\"message\":\"$MESSAGE\"}" \
  | jq -r '.msg // .error // .' 2>/dev/null || echo "Failed"
echo ""

echo "=== Test Complete ==="
