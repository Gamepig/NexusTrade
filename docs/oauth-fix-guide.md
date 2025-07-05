# OAuth 認證修復指南

## 🚨 當前問題狀態

### Google OAuth 錯誤: "invalid_client"
**錯誤訊息**: "The OAuth client was not found. 錯誤代碼 401： invalid_client"

**根本原因**: Google Cloud Console 中的重定向 URI 設定與應用程式不匹配

## 🛠️ 修復步驟

### 1. Google Cloud Console 設定

請按照以下步驟修復 Google OAuth：

1. **開啟 Google Cloud Console**
   - 前往: https://console.cloud.google.com/
   - 登入您的 Google 帳戶

2. **進入 OAuth 設定**
   - 選擇您的專案
   - 導航至: API 和服務 > 憑證
   - 找到您的 OAuth 2.0 客戶端 ID: `685361162-kfaaslvqca65i91d2pgdshbqhkl2uhj7.apps.googleusercontent.com`

3. **編輯 OAuth 客戶端**
   - 點擊 OAuth 客戶端名稱進入編輯
   - 在「已授權的重新導向 URI」部分
   - **確保包含以下 URI**:
     ```
     http://localhost:3000/auth/google/callback
     ```
   - **移除或更新任何 127.0.0.1 的 URI**
   - 點擊「儲存」

4. **等待設定生效**
   - Google 設定變更需要 5-10 分鐘生效
   - 可以先處理 LINE OAuth 設定

### 2. LINE Developers Console 設定

請檢查 LINE 設定：

1. **開啟 LINE Developers Console**
   - 前往: https://developers.line.biz/console/
   - 登入您的 LINE 帳戶

2. **檢查 Channel 設定**
   - 選擇您的 Channel: `2007146792`
   - 進入「LINE Login」設定頁面

3. **確認 Callback URL**
   - 在 Callback URL 設定中
   - **確保包含以下 URL**:
     ```
     http://localhost:3000/auth/line/callback
     ```

4. **驗證憑證**
   - Channel ID: `2007146792` ✅
   - Channel Secret: `9622f357d42ce983c36260b8ad959c6c` (請確認是否正確)

## 🧪 測試步驟

修復完成後請按順序測試：

### 1. 測試 Google OAuth
```bash
# 在瀏覽器中訪問
http://localhost:3000

# 點擊 Google 登入按鈕
# 應該會正常重定向到 Google 授權頁面
```

### 2. 測試 LINE OAuth
```bash
# 在瀏覽器中訪問
http://localhost:3000

# 點擊 LINE 登入按鈕
# 應該會正常重定向到 LINE 授權頁面
```

## 🔍 診斷工具

如果仍有問題，可使用我們的診斷工具：

```bash
# 執行憑證驗證
node debug_oauth_credentials.js

# 檢查實際的重定向 URL
curl -I "http://localhost:3000/auth/google"
curl -I "http://localhost:3000/auth/line"
```

## 📋 常見問題解決

### Q: Google OAuth 仍顯示 "invalid_client"
**A**: 確認 Google Cloud Console 設定已儲存並等待 5-10 分鐘生效

### Q: LINE OAuth 顯示 "invalid_client_secret"
**A**: 檢查 LINE Developers Console 中的 Channel Secret 是否與 .env 檔案一致

### Q: 重定向後頁面顯示錯誤
**A**: 檢查瀏覽器控制台和伺服器日誌獲取詳細錯誤訊息

## 🎯 完成後的下一步

OAuth 修復完成後，我們將實作：
1. 登入後 UI 更新 (移除註冊按鈕、顯示使用者頭像)
2. 使用者下拉選單 (觀察清單、通知設定、登出)
3. 登入狀態持久化

---

**修復完成指標**: 能夠正常完成 Google 和 LINE OAuth 登入流程，並在首頁看到登入成功狀態。