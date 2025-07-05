# LINE Webhook 設定指南

## 📋 完成 LINE Messaging 測試的步驟

### 1. 設定 LINE Developers Console Webhook URL

#### 🌐 訪問 LINE Developers Console
1. 前往：https://developers.line.biz/console/
2. 登入您的 LINE 帳號
3. 選擇您的 Messaging API 頻道 (Channel ID: 2007240732)

#### ⚙️ 設定 Webhook URL
1. 在頻道設定中找到 "Messaging API" 標籤
2. 找到 "Webhook settings" 區域
3. 設定 Webhook URL：
   ```
   http://localhost:3000/api/line/webhook
   ```
   
   **⚠️ 注意**：
   - 如果您使用 ngrok 或其他隧道工具：
     ```
     https://your-ngrok-subdomain.ngrok.io/api/line/webhook
     ```
   - 生產環境請使用實際的域名

4. 啟用 "Use webhook" 選項
5. 點擊 "Verify" 驗證 Webhook URL
6. 儲存設定

### 2. 設定機器人基本功能

#### 📱 機器人設定
1. 在 "Messaging API" 標籤中：
   - ✅ 啟用 "Allow bot to join group chats"
   - ✅ 啟用 "Auto-reply messages" (可選)
   - ❌ 停用 "Greeting messages" (避免衝突)

2. 在 "LINE Official Account features" 中：
   - ✅ 啟用 "Chat"
   - ❌ 停用 "Greeting messages"

### 3. 取得您的 LINE 使用者 ID

#### 📲 將機器人加為好友
1. 在 LINE 應用程式中搜尋：`@769tzgjc`
2. 將機器人加為好友
3. 發送一條測試訊息，例如："測試"

#### 🔍 監控 Webhook 事件
執行以下指令來監控 LINE 事件：

```bash
# 監控服務器日誌
tail -f server.log | grep -E "(LINE|userId)"

# 或者使用我們的監控腳本
node monitor-line-webhook.js
```

#### 📋 從日誌中提取使用者 ID
當您發送訊息後，在日誌中尋找類似以下的內容：
```
處理 LINE 事件 { type: 'message', userId: 'U4af4980629ba4a8...', timestamp: '...' }
```

### 4. 進行實際測試

當您取得真實的使用者 ID 後，執行：

```bash
node test-line-messaging-real.js YOUR_REAL_LINE_USER_ID
```

預期結果：
- ✅ 文字訊息發送成功
- ✅ 歡迎模板訊息發送成功  
- ✅ 價格警報 Flex Message 發送成功
- ✅ 市場摘要 Flex Message 發送成功
- ✅ 核心 Messenger 測試成功
- ✅ LINE API 連線測試成功

## 🛠️ 故障排除

### 問題 1: Webhook URL 驗證失敗

**可能原因：**
- 服務器未運行在 port 3000
- 防火牆阻擋連線
- localhost 無法從外部訪問

**解決方案：**
```bash
# 確認服務器運行
curl http://localhost:3000/api/line/status

# 使用 ngrok 建立隧道
ngrok http 3000
# 然後使用 ngrok 提供的 URL
```

### 問題 2: 沒有收到 Webhook 事件

**檢查清單：**
- [ ] Webhook URL 設定正確
- [ ] "Use webhook" 已啟用
- [ ] 機器人設定正確
- [ ] 已將機器人加為好友
- [ ] 發送了測試訊息

### 問題 3: 400 錯誤持續出現

**可能原因：**
- 使用者 ID 格式錯誤
- ACCESS_TOKEN 無效
- 使用者已封鎖機器人

**驗證步驟：**
```bash
# 測試 ACCESS_TOKEN
curl -X GET https://api.line.me/v2/bot/info \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 測試使用者是否存在
curl -X GET https://api.line.me/v2/bot/profile/USER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🎯 替代方案：使用 LINE Simulator

如果無法設定 Webhook，您可以使用 LINE 官方的模擬器：

1. 訪問：https://developers.line.biz/flex-simulator/
2. 測試 Flex Message 模板
3. 使用 LINE Bot Designer 進行測試

## 📞 需要協助？

如果遇到任何問題，請提供：
1. 錯誤訊息的完整內容
2. LINE Developers Console 的設定截圖
3. 服務器日誌相關片段

---

**最後更新：2025-06-29**
**版本：v1.0.0**