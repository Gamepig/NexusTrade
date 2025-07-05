# LINE Webhook Timeout 故障排除

## 🚨 當前問題
LINE Developers Console 顯示：
```
Error: A timeout occurred when sending a webhook event object
```

## 🔧 解決方案

### 方案 1: 使用 ngrok 免費版本規避 (推薦)

1. **停止當前 ngrok**：
   ```bash
   pkill ngrok
   ```

2. **重新啟動 ngrok 並添加 bypass 參數**：
   ```bash
   ngrok http 3000 --host-header=localhost:3000
   ```

3. **使用新的 URL**：
   - 複製新產生的 ngrok URL
   - 在 LINE Developers Console 中更新 Webhook URL

### 方案 2: 使用替代隧道服務

如果 ngrok 繼續有問題，可以使用 localtunnel：

```bash
# 安裝 localtunnel
npm install -g localtunnel

# 啟動隧道
lt --port 3000 --subdomain nexustrade-line
```

然後使用：`https://nexustrade-line.loca.lt/api/line/webhook`

### 方案 3: 暫時關閉簽名驗證 (僅開發環境)

修改 `/src/routes/line.js`：

```javascript
router.post('/webhook', 
  // 暫時關閉簽名驗證進行測試
  ...createLineWebhookMiddleware({
    enableSignatureValidation: false, // 改為 false
    enableEventValidation: true,
    enableErrorHandling: true
  }),
```

### 方案 4: 增加 Webhook 響應時間

修改 LINE 路由添加更快的響應：

```javascript
router.post('/webhook', async (req, res) => {
  // 立即回應 LINE Platform
  res.status(200).json({ success: true });
  
  // 異步處理事件
  setImmediate(async () => {
    const { events } = req.body;
    // ... 處理邏輯
  });
});
```

## 🧪 測試步驟

1. **驗證 ngrok 連接**：
   ```bash
   curl https://your-ngrok-url.ngrok-free.app/api/line/webhook
   ```

2. **檢查響應時間**：
   ```bash
   time curl https://your-ngrok-url.ngrok-free.app/api/line/webhook
   ```

3. **監控 ngrok 流量**：
   - 訪問：http://localhost:4040
   - 查看 ngrok web 界面

## 🎯 目前最佳解決方案

基於您的情況，建議：

1. **重啟 ngrok** 使用不同參數
2. **簡化 Webhook 處理** 立即回應
3. **測試新 URL** 確保連接正常

執行以下指令：

```bash
# 停止當前 ngrok
pkill ngrok

# 重新啟動
ngrok http 3000 --log=stdout
```

然後使用新的 URL 更新 LINE Developers Console。