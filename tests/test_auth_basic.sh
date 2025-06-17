#\!/bin/bash

BASE_URL="http://localhost:3000"
API_BASE="$BASE_URL/auth"

echo "🔐 NexusTrade 認證系統測試"
echo "==========================="

echo
echo "1. 測試使用者註冊"
echo "----------------"
REGISTER_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "username": "testuser",
    "firstName": "Test",
    "lastName": "User"
  }' \
  "$API_BASE/register")

echo "註冊回應: $REGISTER_RESPONSE"

# 提取 token
TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "提取的 Token: ${TOKEN:0:50}..."

echo
echo "2. 測試使用者登入"
echo "----------------"
LOGIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }' \
  "$API_BASE/login")

echo "登入回應: $LOGIN_RESPONSE"

# 更新 token (使用登入的 token)
NEW_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ \! -z "$NEW_TOKEN" ]; then
  TOKEN="$NEW_TOKEN"
fi

echo
echo "3. 測試 Token 驗證"
echo "----------------"
VERIFY_RESPONSE=$(curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/verify")

echo "驗證回應: $VERIFY_RESPONSE"

echo
echo "4. 測試取得使用者資訊"
echo "------------------"
Me_RESPONSE=$(curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/me")

echo "使用者資訊: $Me_RESPONSE"

echo
echo "5. 測試 OAuth 狀態檢查"
echo "--------------------"
OAUTH_STATUS_RESPONSE=$(curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "$API_BASE/oauth/status")

echo "OAuth 狀態: $OAUTH_STATUS_RESPONSE"

echo
echo "測試完成！"
