# API 參考文件

## 📋 總覽

NexusTrade 提供完整的 RESTful API 和 WebSocket 服務，支援加密貨幣市場數據、用戶認證、價格警報、觀察清單管理等核心功能。

## 🌐 基礎資訊

### 基礎 URL
```
開發環境: http://localhost:3000
生產環境: https://api.nexustrade.com
```

### 認證方式
- **JWT Bearer Token**: 用於需要認證的 API
- **OAuth 2.0**: 第三方登入 (Google, LINE)

### 請求格式
- **Content-Type**: `application/json`
- **Accept**: `application/json`
- **Authorization**: `Bearer <jwt-token>` (需要認證的端點)

### 響應格式
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "timestamp": "2025-07-05T10:30:00.000Z"
}
```

### 錯誤響應格式
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "錯誤描述",
    "details": "詳細錯誤資訊"
  },
  "timestamp": "2025-07-05T10:30:00.000Z"
}
```

## 📚 API 分類

### 🔐 認證相關 API
- **[認證 API](./auth.md)** - 使用者認證與授權
- **[OAuth API](./oauth.md)** - 第三方登入整合

### 📊 市場數據 API
- **[市場數據 API](./market.md)** - 即時價格、K線、交易對資訊

### 🔔 通知系統 API
- **[價格警報 API](./price-alerts.md)** - 價格警報管理
- **[通知設定 API](./notifications.md)** - 通知系統配置

### ⭐ 用戶功能 API
- **[觀察清單 API](./watchlist.md)** - 個人化資產追蹤
- **[用戶管理 API](./users.md)** - 用戶資料管理

### 🤖 AI 分析 API
- **[AI 分析 API](./ai-analysis.md)** - 智能市場分析

### 📡 即時數據 API
- **[WebSocket API](./websocket.md)** - 即時數據推送

## 🔄 HTTP 狀態碼

### 成功響應
- `200 OK` - 請求成功
- `201 Created` - 資源創建成功
- `204 No Content` - 請求成功但無內容返回

### 用戶端錯誤
- `400 Bad Request` - 請求參數錯誤
- `401 Unauthorized` - 未認證或認證失效
- `403 Forbidden` - 無權限訪問
- `404 Not Found` - 資源不存在
- `422 Unprocessable Entity` - 請求格式正確但語義錯誤
- `429 Too Many Requests` - 請求頻率超限

### 伺服器錯誤
- `500 Internal Server Error` - 伺服器內部錯誤
- `502 Bad Gateway` - 網關錯誤
- `503 Service Unavailable` - 服務不可用
- `504 Gateway Timeout` - 網關超時

## 🛡️ 安全機制

### Rate Limiting
```
標準限制: 100 requests/minute/IP
認證用戶: 500 requests/minute/user
批量 API: 10 requests/minute/user
```

### CORS 設定
```
允許來源: https://nexustrade.com, https://*.nexustrade.com
允許方法: GET, POST, PUT, DELETE, OPTIONS
允許標頭: Content-Type, Authorization, X-Requested-With
```

### 安全標頭
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## 📈 監控端點

### 健康檢查
```http
GET /health
```

**響應:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-05T10:30:00.000Z",
  "services": {
    "database": "connected",
    "binanceApi": "available",
    "lineMessaging": "available"
  },
  "version": "2.0.0"
}
```

### 系統狀態
```http
GET /api/status
```

**響應:**
```json
{
  "success": true,
  "data": {
    "uptime": 86400,
    "memoryUsage": {
      "used": 256,
      "total": 512,
      "percentage": 50
    },
    "connections": {
      "websocket": 1250,
      "database": 8
    }
  }
}
```

## 🔧 SDK 與範例

### JavaScript SDK
```javascript
// 安裝
npm install nexustrade-sdk

// 使用
import { NexusTradeAPI } from 'nexustrade-sdk';

const client = new NexusTradeAPI({
  baseURL: 'https://api.nexustrade.com',
  apiKey: 'your-api-key'
});

// 取得市場數據
const trendingPairs = await client.market.getTrendingPairs({ limit: 10 });

// 設定價格警報
const alert = await client.alerts.create({
  symbol: 'BTCUSDT',
  type: 'price_above',
  targetPrice: 50000
});
```

### cURL 範例
```bash
# 取得熱門交易對
curl -X GET "https://api.nexustrade.com/api/market/trending?limit=10" \
  -H "Accept: application/json"

# 創建價格警報 (需要認證)
curl -X POST "https://api.nexustrade.com/api/notifications/alerts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "symbol": "BTCUSDT",
    "alertType": "price_above",
    "targetPrice": 50000
  }'
```

### Python 範例
```python
import requests

# 基礎設定
BASE_URL = "https://api.nexustrade.com"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_JWT_TOKEN"
}

# 取得市場數據
response = requests.get(f"{BASE_URL}/api/market/trending", 
                       params={"limit": 10})
trending_pairs = response.json()

# 創建價格警報
alert_data = {
    "symbol": "BTCUSDT",
    "alertType": "price_above",
    "targetPrice": 50000
}

response = requests.post(f"{BASE_URL}/api/notifications/alerts",
                        json=alert_data,
                        headers=headers)
alert = response.json()
```

## 📊 API 使用統計

### 熱門端點
1. `GET /api/market/trending` - 25% 流量
2. `WebSocket /ws` - 20% 流量  
3. `GET /api/market/price/:symbol` - 15% 流量
4. `POST /api/notifications/alerts` - 10% 流量
5. `GET /api/watchlist` - 8% 流量

### 效能指標
- **平均響應時間**: 150ms
- **95th 百分位**: 450ms
- **99th 百分位**: 800ms
- **可用性**: 99.9%

## 🔄 版本控制

### 當前版本
- **API 版本**: v2.0
- **最新更新**: 2025-07-05
- **支援的版本**: v2.0 (current), v1.0 (deprecated)

### 版本遷移
```
v1.0 → v2.0 遷移指南: /docs/migration/v1-to-v2.md
```

### Changelog
```
v2.0.0 (2025-07-05)
+ 新增 AI 分析 API
+ 新增技術指標警報支援
+ 改進會員制度 API
* 優化市場數據響應格式
- 移除 deprecated LINE Notify 端點

v1.5.0 (2025-06-01)
+ 新增觀察清單 API
+ 新增批量價格查詢
* 改進錯誤處理
```

## 📝 開發指南

### 最佳實務
1. **使用 JWT Token**: 在 Authorization 標頭中包含有效的 JWT
2. **錯誤處理**: 檢查 `success` 欄位和 HTTP 狀態碼
3. **Rate Limiting**: 實作指數退避重試機制
4. **快取策略**: 快取不變的數據 (交易對清單等)
5. **WebSocket 連線**: 實作重連機制

### 測試環境
```
測試 API: https://test-api.nexustrade.com
測試用戶: test@nexustrade.com / password123
測試 JWT: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### 問題回報
- **GitHub Issues**: https://github.com/nexustrade/api/issues
- **技術支援**: dev@nexustrade.com
- **文件更新**: docs@nexustrade.com

---

*本文件提供了 NexusTrade API 的完整概覽，詳細的端點說明請參考各個分類文件。*