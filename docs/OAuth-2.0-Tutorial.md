# Google 與 LINE OAuth 2.0 完整教學指南
*NexusTrade 專案專用*

## 目錄
1. [OAuth 2.0 基礎概念](#oauth-20-基礎概念)
2. [Google OAuth 2.0 實作](#google-oauth-20-實作)
3. [LINE Login OAuth 2.0 實作](#line-login-oauth-20-實作)
4. [Node.js + Express 整合](#nodejs--express-整合)
5. [NexusTrade 專案整合指南](#nexustrade-專案整合指南)
6. [最佳實務與安全性](#最佳實務與安全性)
7. [故障排除](#故障排除)

---

## OAuth 2.0 基礎概念

### 什麼是 OAuth 2.0？
OAuth 2.0 是一個開放標準的授權框架，允許第三方應用程式代表使用者存取受保護的資源，而無需暴露使用者的密碼。

### 核心角色
- **Resource Owner（資源擁有者）**：通常是終端使用者
- **Client（客戶端）**：請求存取資源的應用程式（NexusTrade）
- **Authorization Server（授權伺服器）**：Google/LINE 的認證伺服器
- **Resource Server（資源伺服器）**：存放受保護資源的伺服器

### 授權流程（Authorization Code Flow）
1. 使用者點擊「登入」按鈕
2. 重導向至授權伺服器
3. 使用者輸入帳號密碼並授權
4. 授權伺服器重導向回應用程式，帶有 authorization code
5. 應用程式使用 authorization code 換取 access token
6. 使用 access token 存取使用者資源

---

## Google OAuth 2.0 實作

### 1. Google Cloud Console 設定

#### 步驟 1：建立專案
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 點擊「選取專案」→「新增專案」
3. 輸入專案名稱：`NexusTrade`
4. 點擊「建立」

#### 步驟 2：啟用 Google+ API
1. 在導航選單中選擇「API 和服務」→「程式庫」
2. 搜尋「Google+ API」或「People API」
3. 點擊啟用

#### 步驟 3：設定 OAuth 同意畫面
1. 選擇「API 和服務」→「OAuth 同意畫面」
2. 選擇「外部」用戶類型
3. 填寫必要資訊：
   - 應用程式名稱：`NexusTrade`
   - 使用者支援電子郵件
   - 開發人員聯絡資訊
4. 新增範圍：
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
5. 儲存並繼續

#### 步驟 4：建立 OAuth 憑證
1. 選擇「API 和服務」→「憑證」
2. 點擊「建立憑證」→「OAuth 客戶端 ID」
3. 選擇應用程式類型：「網路應用程式」
4. 設定授權重導向 URI：
   ```
   開發環境：http://localhost:3000/auth/google/callback
   正式環境：https://yourdomain.com/auth/google/callback
   ```
5. 下載 JSON 憑證檔案

### 2. 環境變數設定

```bash
# .env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

---

## LINE Login OAuth 2.0 實作

### 1. LINE Developers Console 設定

#### 步驟 1：建立 LINE Login 頻道
1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 登入 LINE 帳號
3. 點擊「建立新的 Provider」或選擇現有 Provider
4. 點擊「建立頻道」→「LINE Login」
5. 填寫頻道資訊：
   - 頻道名稱：`NexusTrade`
   - 頻道說明：`加密貨幣市場分析平台`
   - 應用程式類型：`Web app`

#### 步驟 2：設定回調 URL
1. 在頻道設定中找到「LINE Login 設定」
2. 新增回調 URL：
   ```
   開發環境：http://localhost:3000/auth/line/callback
   正式環境：https://yourdomain.com/auth/line/callback
   ```

#### 步驟 3：申請 Email 權限
1. 在頻道設定中找到「權限」標籤
2. 申請「email」權限（需要審核）
3. 等待 LINE 審核通過

#### 步驟 4：取得憑證
1. 在「基本設定」標籤中找到：
   - Channel ID
   - Channel Secret
2. 記錄這些資訊用於環境變數

### 2. 環境變數設定

```bash
# .env
LINE_CHANNEL_ID=your_line_channel_id
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_CALLBACK_URL=http://localhost:3000/auth/line/callback
```

---

*文件持續更新中...* 