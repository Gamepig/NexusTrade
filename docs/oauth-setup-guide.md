# NexusTrade OAuth 整合設定指南

## 概述

NexusTrade 已完成 Google OAuth 2.0 和 LINE Login 的完整整合，現在需要真實的 API 金鑰來啟用 OAuth 功能。

## 系統狀態

✅ **已完成**:
- Passport.js 策略配置 (Google OAuth 2.0 + LINE Login)
- JWT 認證系統完整實作
- OAuth 回調處理和使用者建立/連結邏輯
- 前端 LoginModal 組件 (官方樣式按鈕)
- Mock 使用者系統運行正常
- 完整的 API 端點 (`/api/auth/*`)

⏳ **待設定**:
- Google OAuth 2.0 真實憑證
- LINE Login 真實憑證

## OAuth 路由配置

所有 OAuth 路由已正確設定：

### 直接 OAuth 路由 (根路徑)
- `GET /auth/google` - Google OAuth 登入
- `GET /auth/google/callback` - Google OAuth 回調
- `GET /auth/line` - LINE Login
- `GET /auth/line/callback` - LINE Login 回調

### API 路由 (需要認證)
- `GET /api/auth/oauth/status` - 查看 OAuth 連結狀態
- `POST /api/auth/link/:provider` - 連結 OAuth 帳戶
- `DELETE /api/auth/link/:provider` - 取消連結 OAuth 帳戶

## 需要的 OAuth 憑證

### 1. Google OAuth 2.0 設定

**Google Cloud Console**: https://console.developers.google.com/

1. **建立專案** (如未建立)
2. **啟用 Google+ API**
3. **建立 OAuth 2.0 憑證**:
   - 應用程式類型: Web 應用程式
   - 名稱: NexusTrade
   - 已授權的重新導向 URI:
     - `http://localhost:3000/auth/google/callback` (開發)
     - `https://yourdomain.com/auth/google/callback` (生產)

4. **環境變數設定**:
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### 2. LINE Login 設定

**LINE Developers Console**: https://developers.line.biz/

1. **建立 Provider** (如未建立)
2. **建立 LINE Login Channel**:
   - Channel Type: LINE Login
   - App Name: NexusTrade
   - App Description: 加密貨幣市場分析平台

3. **設定 Callback URL**:
   - `http://localhost:3000/auth/line/callback` (開發)
   - `https://yourdomain.com/auth/line/callback` (生產)

4. **權限設定**:
   - profile (必要)
   - openid (必要)
   - email (可選，但推薦)

5. **環境變數設定**:
```bash
LINE_CHANNEL_ID=your_line_channel_id
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_CALLBACK_URL=http://localhost:3000/auth/line/callback
```

## 測試方式

### 1. Mock 系統測試 (目前可用)

訪問: http://localhost:3001/test_oauth_login.html

可測試：
- ✅ 健康檢查 API
- ✅ 認證 API 狀態
- ✅ Mock 使用者登入
- ✅ OAuth 狀態查詢

### 2. 真實 OAuth 測試 (需要 API 金鑰)

設定 API 金鑰後：
- 點擊 "Continue with Google" 按鈕
- 點擊 "Log in with LINE" 按鈕
- 完成 OAuth 流程並自動建立帳戶

## 技術實作詳情

### OAuth 流程

1. **使用者點擊 OAuth 按鈕** → 重定向到 OAuth 提供者
2. **使用者授權** → OAuth 提供者重定向回 callback URL
3. **Passport 處理回調** → 建立或連結使用者帳戶
4. **生成 JWT Token** → 重定向到前端並傳遞 token
5. **前端保存 token** → 更新使用者介面狀態

### 安全性特色

- **BCrypt 密碼雜湊**
- **JWT Token 有效期限管理**
- **Refresh Token 機制**
- **HTTPS 強制 (生產環境)**
- **Session 安全配置**
- **帳戶連結防重複機制**

### 使用者管理

- **自動帳戶建立**: 首次 OAuth 登入自動建立帳戶
- **帳戶連結**: 相同 email 自動連結到現有帳戶
- **多重登入方式**: 支援 email/密碼 + Google + LINE
- **帳戶安全**: 防止取消連結唯一登入方式

## 準備就緒清單

✅ **技術架構**: 完整實作  
✅ **Mock 系統**: 運行正常  
✅ **API 端點**: 全部可用  
✅ **前端整合**: 完整實作  
✅ **測試工具**: 可用  
⏳ **OAuth 憑證**: 待提供  

## 下一步

1. **提供 Google OAuth 2.0 憑證**
2. **提供 LINE Login 憑證**
3. **更新 .env 檔案**
4. **重啟服務** (`pm2 restart nexustrade-api`)
5. **測試真實 OAuth 流程**

---

**系統已準備就緒，等待真實 OAuth 憑證即可啟用完整功能！**