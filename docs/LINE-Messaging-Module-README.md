# LINE Messaging 模組使用指南

## 📋 目錄

1. [概述](#概述)
2. [快速開始](#快速開始)
3. [環境設定](#環境設定)
4. [API 使用](#api-使用)
5. [模板系統](#模板系統)
6. [錯誤處理](#錯誤處理)
7. [測試指南](#測試指南)
8. [故障排除](#故障排除)

---

## 概述

LINE Messaging 模組是專門負責 LINE 訊息傳送的獨立模組，提供簡潔的 API 介面，支援文字訊息、Flex Message 和批量傳送功能。

### ✨ 核心功能

- **單一訊息傳送** - 發送文字或 Flex Message
- **批量訊息傳送** - 支援群發功能
- **豐富模板系統** - 12 個文字模板 + 5 個 Flex 模板
- **輸入驗證** - 完整的參數驗證機制
- **錯誤處理** - 統一的錯誤處理和重試機制
- **Webhook 簽名驗證** - 安全的 Webhook 處理

### 🎯 模組特色

- 獨立模組設計，易於維護和擴展
- 支援 TypeScript 類型定義
- 完整的日誌記錄機制
- 生產環境就緒的錯誤處理

---

## 快速開始

### 1. 環境需求

- Node.js 14+
- LINE Messaging API 頻道憑證
- MongoDB（可選，用於狀態持久化）

### 2. 基本使用

```javascript
// 載入模組
const lineMessagingModule = require('./src/services/line-messaging');

// 發送文字訊息
const result = await lineMessagingModule.sendMessage(
  'LINE_USER_ID',
  'Hello from NexusTrade!'
);

// 使用模板發送訊息
const templateResult = await lineMessagingModule.sendTemplateMessage(
  'LINE_USER_ID',
  'welcome',
  { username: 'John', platform: 'NexusTrade' }
);
```

### 3. API 端點使用

```bash
# 檢查服務狀態
curl http://localhost:3000/api/line-messaging/status

# 發送文字訊息
curl -X POST http://localhost:3000/api/line-messaging/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "LINE_USER_ID",
    "message": "Hello World!"
  }'

# 使用模板發送訊息
curl -X POST http://localhost:3000/api/line-messaging/template \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "LINE_USER_ID",
    "templateName": "priceAlert",
    "templateData": {
      "symbol": "BTCUSDT",
      "currentPrice": "102500.50",
      "targetPrice": "100000.00",
      "alertType": "above",
      "changePercent": 2.5
    }
  }'
```

---

## 環境設定

### 環境變數配置

在 `.env` 檔案中設定以下變數：

```bash
# LINE Messaging API (Messaging API 頻道)
LINE_ACCESS_TOKEN=your_line_messaging_access_token
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=your_line_messaging_access_token
LINE_MESSAGING_CHANNEL_ID=your_messaging_channel_id
LINE_MESSAGING_CHANNEL_SECRET=your_messaging_channel_secret
LINE_MESSAGING_WEBHOOK_URL=http://localhost:3000/api/line/webhook

# LINE Bot 設定
LINE_BOT_NAME=NexusTrade Bot
LINE_BOT_DESCRIPTION=NexusTrade 加密貨幣交易通知機器人
```

### LINE Developers Console 設定

1. **建立 Messaging API 頻道**
   ```
   頻道類型: Messaging API
   頻道名稱: NexusTrade Bot
   頻道描述: 加密貨幣交易通知機器人
   ```

2. **取得憑證**
   - Channel ID
   - Channel Secret
   - Channel Access Token

3. **設定 Webhook**
   ```
   Webhook URL: https://your-domain.com/api/line/webhook
   ```

---

## API 使用

### 核心 API 端點

| 端點 | 方法 | 描述 |
|------|------|------|
| `/api/line-messaging/status` | GET | 檢查服務狀態 |
| `/api/line-messaging/send` | POST | 發送單一訊息 |
| `/api/line-messaging/batch` | POST | 批量發送訊息 |
| `/api/line-messaging/template` | POST | 使用模板發送訊息 |
| `/api/line-messaging/templates` | GET | 取得可用模板列表 |

### 1. 發送單一訊息

**端點:** `POST /api/line-messaging/send`

**請求格式:**
```json
{
  \"userId\": \"LINE_USER_ID\",
  \"message\": \"訊息內容或 Flex Message 物件\",
  \"messageType\": \"text\" | \"flex\",
  \"options\": {
    \"altText\": \"替代文字\",
    \"quickReply\": {...}
  }
}
```

**回應格式:**
```json
{
  \"success\": true,
  \"data\": {
    \"messageId\": \"msg_id_123\",
    \"timestamp\": \"2025-06-29T12:00:00.000Z\",
    \"userId\": \"user***123\",
    \"messageType\": \"text\"
  },
  \"message\": \"訊息發送成功\"
}
```

### 2. 批量發送訊息

**端點:** `POST /api/line-messaging/batch`

**請求格式:**
```json
{
  \"userIds\": [\"USER_ID_1\", \"USER_ID_2\"],
  \"message\": \"批量訊息內容\",
  \"options\": {
    \"batchSize\": 500,
    \"batchDelay\": 100
  }
}
```

**回應格式:**
```json
{
  \"success\": true,
  \"data\": {
    \"totalUsers\": 2,
    \"totalBatches\": 1,
    \"successfulBatches\": 1,
    \"failedBatches\": 0,
    \"results\": [...],
    \"errors\": []
  }
}
```

### 3. 使用模板發送訊息

**端點:** `POST /api/line-messaging/template`

**請求格式:**
```json
{
  \"userId\": \"LINE_USER_ID\",
  \"templateName\": \"priceAlert\",
  \"templateData\": {
    \"symbol\": \"BTCUSDT\",
    \"currentPrice\": \"102500.50\",
    \"targetPrice\": \"100000.00\",
    \"alertType\": \"above\",
    \"changePercent\": 2.5
  }
}
```

---

## 模板系統

### 文字訊息模板 (12 個)

| 模板名稱 | 描述 | 必要參數 |
|---------|------|----------|
| `welcome` | 歡迎新使用者 | `username`, `platform` |
| `help` | 功能說明 | `commands` (可選) |
| `priceAlert` | 價格警報通知 | `symbol`, `currentPrice`, `targetPrice`, `alertType`, `changePercent` |
| `marketUpdate` | 市場更新摘要 | `trending`, `summary` |
| `aiAnalysis` | AI 分析結果 | `symbol`, `sentiment`, `recommendation`, `confidence` |
| `error` | 錯誤訊息通知 | `type`, `message`, `suggestion` |
| `success` | 操作成功確認 | `action`, `details` |
| `systemNotification` | 系統通知 | `title`, `message`, `level` |
| `priceQuery` | 價格查詢結果 | `symbol`, `price`, `change24h` |
| `subscriptionConfirm` | 訂閱設定確認 | `type`, `symbol`, `condition` |

### Flex Message 模板 (5 個)

| 模板名稱 | 描述 | 必要參數 |
|---------|------|----------|
| `priceAlert` | 價格警報卡片 | `symbol`, `currentPrice`, `targetPrice`, `alertType`, `changePercent` |
| `marketSummary` | 市場摘要卡片 | `trending`, `totalMarketCap`, `btcDominance`, `fearGreedIndex` |
| `aiAnalysisReport` | AI 分析報告卡片 | `symbol`, `sentiment`, `recommendation`, `confidence`, `price` |
| `welcome` | 歡迎新使用者卡片 | `username`, `platform` |

### 模板使用範例

```javascript
// 文字模板
const textMessage = await lineMessagingModule.sendTemplateMessage(
  'LINE_USER_ID',
  'priceAlert',
  {
    symbol: 'BTCUSDT',
    currentPrice: '102500.50',
    targetPrice: '100000.00',
    alertType: 'above',
    changePercent: 2.5,
    timestamp: new Date().toLocaleString('zh-TW')
  }
);

// Flex Message 模板
const flexMessage = await lineMessagingModule.sendTemplateMessage(
  'LINE_USER_ID',
  'marketSummary',
  {
    trending: [
      { symbol: 'BTC', price: '102500.50', change: 2.5 },
      { symbol: 'ETH', price: '3850.25', change: -1.2 }
    ],
    totalMarketCap: '2.5T',
    btcDominance: '42.3',
    fearGreedIndex: 65
  }
);
```

---

## 錯誤處理

### 錯誤類型

| 錯誤類型 | 代碼 | 描述 |
|---------|------|------|
| 驗證錯誤 | `VALIDATION_ERROR` | 輸入參數不正確 |
| API 錯誤 | `API_ERROR` | LINE API 服務錯誤 |
| 網路錯誤 | `NETWORK_ERROR` | 網路連線問題 |
| 認證錯誤 | `AUTHENTICATION_ERROR` | LINE API 認證失敗 |
| 頻率限制 | `RATE_LIMIT_ERROR` | 發送頻率過高 |
| 設定錯誤 | `CONFIGURATION_ERROR` | LINE API 設定不完整 |

### 錯誤回應格式

```json
{
  \"success\": false,
  \"error\": {
    \"type\": \"VALIDATION_ERROR\",
    \"code\": \"VALIDATION_FAILED\",
    \"message\": \"使用者 ID 不可為空\",
    \"friendlyMessage\": \"輸入資料格式錯誤\",
    \"operation\": \"sendMessage\",
    \"timestamp\": \"2025-06-29T12:00:00.000Z\",
    \"isRetryable\": false,
    \"suggestedAction\": \"請檢查輸入資料格式\"
  }
}
```

### 重試機制

模組內建智慧重試機制：

```javascript
// 使用重試機制
const errorHandler = require('./src/services/line-messaging/core/error-handler');

const result = await errorHandler.withRetry(
  () => lineMessagingModule.sendMessage(userId, message),
  {
    maxAttempts: 3,
    onRetry: (retryInfo, error) => {
      console.log(`重試第 ${retryInfo.attempt} 次，延遲 ${retryInfo.delay}ms`);
    }
  }
);
```

---

## 測試指南

### 1. 獨立模組測試

```bash
# 執行完整的模組功能測試
node test-line-messaging-standalone.js

# 預期輸出：
# ✅ LINE Messaging 模組載入成功
# ✅ 模組已正確配置
# ✅ 12 個文字模板可用
# ✅ 5 個 Flex 模板可用
# ✅ 所有核心功能正常
```

### 2. API 端點測試

```bash
# 測試服務狀態
curl http://localhost:3000/api/line-messaging/status

# 測試模板列表
curl http://localhost:3000/api/line-messaging/templates

# 測試連線（需要測試使用者 ID）
curl "http://localhost:3000/api/line-messaging/test?testUserId=YOUR_LINE_USER_ID"
```

### 3. 實際訊息發送測試

**重要：需要有效的 LINE 使用者 ID**

```bash
# 發送測試文字訊息
curl -X POST http://localhost:3000/api/line-messaging/send \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "YOUR_REAL_LINE_USER_ID",
    "message": "Hello from NexusTrade LINE Messaging 模組！"
  }'

# 發送測試模板訊息
curl -X POST http://localhost:3000/api/line-messaging/template \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "YOUR_REAL_LINE_USER_ID",
    "templateName": "welcome",
    "templateData": {
      "username": "測試用戶",
      "platform": "NexusTrade"
    }
  }'
```

### 4. 取得 LINE 使用者 ID

有幾種方式可以取得 LINE 使用者 ID：

1. **從 Webhook 事件中取得**
   ```javascript
   // 當使用者發送訊息或加為好友時
   const userId = event.source.userId;
   ```

2. **使用 LINE Login 取得**
   ```javascript
   // 透過 LINE Login 授權後取得
   const profile = await lineLogin.getProfile(accessToken);
   const userId = profile.userId;
   ```

3. **測試用戶 ID（僅限開發）**
   - 使用 LINE Developers Console 的 "Send test message" 功能
   - 使用 LINE Bot Designer 測試

---

## 故障排除

### 常見問題

#### 1. 模組載入失敗

**問題:** `Cannot read properties of undefined`

**解決方案:**
```bash
# 檢查環境變數
node -e "require('dotenv').config(); console.log('LINE_ACCESS_TOKEN:', process.env.LINE_ACCESS_TOKEN ? '已設定' : '未設定');"

# 檢查模組載入
node -e "const module = require('./src/services/line-messaging'); console.log('模組載入:', typeof module);"
```

#### 2. 訊息發送失敗

**問題:** `LINE 訊息發送失敗: invalid access token`

**檢查清單:**
- [ ] LINE_ACCESS_TOKEN 是否正確
- [ ] Channel Access Token 是否已過期
- [ ] 使用者 ID 是否有效
- [ ] 使用者是否已封鎖機器人

**解決方案:**
```bash
# 測試 LINE API 連線
curl -X GET https://api.line.me/v2/bot/info \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 檢查使用者是否存在
curl -X GET https://api.line.me/v2/bot/profile/YOUR_USER_ID \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 3. Webhook 簽名驗證失敗

**問題:** `LINE Webhook 簽名驗證失敗`

**解決方案:**
- 確認 Channel Secret 設定正確
- 檢查 Webhook URL 設定
- 確認請求內容未被修改

#### 4. 服務狀態顯示未配置

**問題:** `isConfigured: false`

**檢查順序:**
1. 檢查 .env 檔案是否存在
2. 確認環境變數載入
3. 驗證憑證格式正確

```bash
# 檢查設定
node -e "
require('dotenv').config();
console.log('Channel ID:', process.env.LINE_MESSAGING_CHANNEL_ID);
console.log('Channel Secret:', process.env.LINE_MESSAGING_CHANNEL_SECRET ? '已設定' : '未設定');
console.log('Access Token:', process.env.LINE_ACCESS_TOKEN ? '已設定' : '未設定');
"
```

### 日誌監控

模組提供詳細的日誌記錄：

```bash
# 監控模組運作
tail -f logs/app.log | grep "LINE Messaging"

# 過濾特定類型的日誌
tail -f logs/app.log | grep -E "(LINE Messaging|LINE API)"
```

### 效能監控

```javascript
// 監控 API 回應時間
const start = Date.now();
const result = await lineMessagingModule.sendMessage(userId, message);
const duration = Date.now() - start;
console.log(`訊息發送耗時: ${duration}ms`);
```

---

## 📚 進階使用

### 自訂模板

建立自訂模板：

```javascript
// 在 text-templates.js 中新增
customTemplate(data = {}) {
  const { title, content, footer } = data;
  return `📢 ${title}\\n\\n${content}\\n\\n${footer}`;
}

// 註冊到匯出對象
module.exports = {
  // ... 現有模板
  customTemplate: textTemplates.customTemplate.bind(textTemplates)
};
```

### 批量處理最佳化

```javascript
// 大量使用者批量發送
const userIds = [...]; // 大量使用者 ID
const result = await lineMessagingModule.sendBatchMessage(
  userIds,
  message,
  {
    batchSize: 100,    // 每批處理 100 個使用者
    batchDelay: 200    // 批次間延遲 200ms
  }
);
```

### 錯誤監控整合

```javascript
// 整合到監控系統
const { withRetry } = require('./src/services/line-messaging/core/error-handler');

const result = await withRetry(
  () => lineMessagingModule.sendMessage(userId, message),
  {
    maxAttempts: 3,
    onRetry: (retryInfo, error) => {
      // 發送到監控系統
      monitoringService.recordRetry({
        operation: 'line_message_send',
        attempt: retryInfo.attempt,
        error: error.message
      });
    }
  }
);
```

---

## 🚀 部署指南

### 生產環境設定

1. **環境變數**
   ```bash
   NODE_ENV=production
   LINE_ACCESS_TOKEN=production_access_token
   LINE_MESSAGING_WEBHOOK_URL=https://your-domain.com/api/line/webhook
   ```

2. **HTTPS 設定**
   - LINE Webhook 要求 HTTPS
   - 設定 SSL 憑證
   - 配置反向代理

3. **監控設定**
   ```javascript
   // 生產環境監控
   const lineMessaging = require('./src/services/line-messaging');
   
   // 定期健康檢查
   setInterval(async () => {
     const status = lineMessaging.getStatus();
     if (!status.data.isConfigured) {
       // 發送警報
       alertingService.send('LINE Messaging 服務異常');
     }
   }, 300000); // 每 5 分鐘檢查
   ```

---

## 🔗 相關資源

- [LINE Messaging API 官方文件](https://developers.line.biz/en/docs/messaging-api/)
- [LINE Developers Console](https://developers.line.biz/console/)
- [Flex Message Simulator](https://developers.line.biz/flex-simulator/)
- [NexusTrade 專案文件](./CLAUDE.md)

---

**最後更新：2025-06-29**  
**文件版本：v1.0.0**  
**作者：NexusTrade 開發團隊**