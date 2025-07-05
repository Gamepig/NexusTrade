# Google 與 LINE OAuth 2.0 教學指南

> 針對 NexusTrade 專案登入功能的完整實作教學

## 目錄

1. [概述](#概述)
2. [Google OAuth 2.0 實作](#google-oauth-20-實作)
3. [LINE Login OAuth 2.0 實作](#line-login-oauth-20-實作)
4. [Node.js + Express 整合](#nodejs--express-整合)
5. [NexusTrade 專案整合指南](#nexustrade-專案整合指南)
6. [最佳實務與安全性](#最佳實務與安全性)
7. [故障排除](#故障排除)

---

## 概述

### OAuth 2.0 是什麼？

OAuth 2.0 是一個授權框架，允許第三方應用程式在不獲取用戶密碼的情況下，獲得對用戶資源的有限存取權限。它的核心概念是將認證和授權分離：

- **認證 (Authentication)**: 驗證"你是誰"
- **授權 (Authorization)**: 決定"你能做什麼"

### 為什麼使用 OAuth 2.0？

1. **安全性**: 用戶密碼不會暴露給第三方應用
2. **用戶體驗**: 使用現有的 Google/LINE 帳號，無需註冊新帳號
3. **簡化開發**: 利用成熟的身份提供者，減少自行處理密碼的風險
4. **靈活的權限控制**: 用戶可以控制授予應用的權限範圍

### OAuth 2.0 核心角色

- **客戶端 (Client)**: 你的 NexusTrade 應用
- **授權伺服器 (Authorization Server)**: Google/LINE 的認證服務
- **資源伺服器 (Resource Server)**: 存放用戶資料的伺服器
- **資源擁有者 (Resource Owner)**: 用戶

---

## Google OAuth 2.0 實作

### 1. Google Cloud Console 設定

#### 步驟 1: 建立專案
```bash
1. 前往 Google Cloud Console (https://console.cloud.google.com/)
2. 點擊"選擇專案" → "新增專案"
3. 輸入專案名稱："NexusTrade OAuth"
4. 點擊"建立"
```

#### 步驟 2: 啟用 APIs
```bash
1. 在專案中，前往"APIs 和服務" → "程式庫"
2. 搜尋並啟用以下 APIs：
   - Google+ API
   - Gmail API (如需要)
   - Google People API
```

#### 步驟 3: 設定 OAuth 同意畫面
```bash
1. 前往"APIs 和服務" → "OAuth 同意畫面"
2. 選擇"外部"類型
3. 填寫必要資訊：
   - 應用程式名稱: "NexusTrade"
   - 使用者支援電子郵件: 你的 Gmail
   - 開發人員聯絡資訊: 你的 Gmail
4. 新增測試使用者（開發階段）
```

#### 步驟 4: 建立 OAuth 2.0 憑證
```bash
1. 前往"APIs 和服務" → "憑證"
2. 點擊"建立憑證" → "OAuth 2.0 用戶端 ID"
3. 選擇"網路應用程式"
4. 設定：
   - 名稱: "NexusTrade Web Client"
   - 已授權的 JavaScript 來源:
     * http://localhost:3000 (開發)
     * https://yourdomain.com (正式)
   - 已授權的重新導向 URI:
     * http://localhost:3000/auth/google/callback
     * https://yourdomain.com/auth/google/callback
```

### 2. Google OAuth 2.0 流程

#### 授權 URL 建構
```javascript
const googleAuthURL = 'https://accounts.google.com/o/oauth2/v2/auth?' + 
  new URLSearchParams({
    client_id: 'YOUR_GOOGLE_CLIENT_ID',
    redirect_uri: 'http://localhost:3000/auth/google/callback',
    response_type: 'code',
    scope: 'openid profile email',
    state: 'random_state_string', // CSRF 防護
    access_type: 'offline', // 如需要 refresh token
    prompt: 'consent' // 強制顯示同意畫面
  });
```

#### Node.js 實作範例
```javascript
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();

// 設定
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// 步驟 1: 重導向到 Google
app.get('/auth/google', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');
  req.session.oauthState = state; // 存儲 state 以便驗證
  
  const authURL = 'https://accounts.google.com/o/oauth2/v2/auth?' + 
    new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid profile email',
      state: state,
      access_type: 'offline',
      prompt: 'consent'
    });
  
  res.redirect(authURL);
});

// 步驟 2: 處理回調
app.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // 驗證 state 參數 (CSRF 防護)
  if (state !== req.session.oauthState) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }
  
  try {
    // 交換授權碼取得 access token
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI
    });
    
    const { access_token, id_token, refresh_token } = tokenResponse.data;
    
    // 使用 access token 取得用戶資訊
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    const userInfo = userResponse.data;
    
    // 驗證 ID token (建議)
    const idTokenPayload = JSON.parse(
      Buffer.from(id_token.split('.')[1], 'base64').toString()
    );
    
    // 在此處理用戶登入邏輯
    // 例如：檢查用戶是否存在，建立 session 等
    
    res.json({
      success: true,
      user: userInfo,
      tokens: {
        access_token,
        refresh_token: refresh_token || null
      }
    });
    
  } catch (error) {
    console.error('Google OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'OAuth authentication failed' });
  }
});
```

### 3. Google OAuth 進階功能

#### ID Token 驗證
```javascript
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs'
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

function verifyGoogleIdToken(idToken) {
  return new Promise((resolve, reject) => {
    jwt.verify(idToken, getKey, {
      audience: GOOGLE_CLIENT_ID,
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
}
```

#### Refresh Token 使用
```javascript
async function refreshGoogleToken(refreshToken) {
  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });
    
    return response.data.access_token;
  } catch (error) {
    throw new Error('Failed to refresh token');
  }
}
```

---

## LINE Login OAuth 2.0 實作

### 1. LINE Developers Console 設定

#### 步驟 1: 建立 Provider
```bash
1. 前往 LINE Developers Console (https://developers.line.biz/)
2. 使用 LINE 帳號登入
3. 點擊"建立 Provider"
4. 輸入 Provider 名稱："NexusTrade"
```

#### 步驟 2: 建立 Channel
```bash
1. 在 Provider 中點擊"建立頻道"
2. 選擇"LINE Login"
3. 填寫頻道資訊：
   - 頻道名稱: "NexusTrade Login"
   - 頻道說明: "NexusTrade 用戶登入"
   - App types: Web app
4. 同意條款並建立
```

#### 步驟 3: 設定 Channel
```bash
1. 在頻道設定中找到：
   - Channel ID
   - Channel Secret
2. 設定回調 URL：
   - http://localhost:3000/auth/line/callback (開發)
   - https://yourdomain.com/auth/line/callback (正式)
3. 申請 Email 權限（如需要）：
   - 前往"OpenID Connect"
   - 點擊"Apply"
   - 提交申請表單
```

### 2. LINE Login OAuth 2.0 流程

#### 授權 URL 建構
```javascript
const lineAuthURL = 'https://access.line.me/oauth2/v2.1/authorize?' + 
  new URLSearchParams({
    response_type: 'code',
    client_id: 'YOUR_LINE_CHANNEL_ID',
    redirect_uri: 'http://localhost:3000/auth/line/callback',
    state: 'random_state_string',
    scope: 'profile openid email', // 根據需要調整
    nonce: 'random_nonce_string' // 可選，用於防重播攻擊
  });
```

#### Node.js 實作範例
```javascript
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();

// 設定
const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_REDIRECT_URI = process.env.LINE_REDIRECT_URI;

// 步驟 1: 重導向到 LINE
app.get('/auth/line', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');
  const nonce = crypto.randomBytes(32).toString('hex');
  
  req.session.oauthState = state;
  req.session.oauthNonce = nonce;
  
  const authURL = 'https://access.line.me/oauth2/v2.1/authorize?' + 
    new URLSearchParams({
      response_type: 'code',
      client_id: LINE_CHANNEL_ID,
      redirect_uri: LINE_REDIRECT_URI,
      state: state,
      scope: 'profile openid email',
      nonce: nonce
    });
  
  res.redirect(authURL);
});

// 步驟 2: 處理回調
app.get('/auth/line/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  // 檢查錯誤
  if (error) {
    return res.status(400).json({ error: error });
  }
  
  // 驗證 state 參數
  if (state !== req.session.oauthState) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }
  
  try {
    // 交換授權碼取得 token
    const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: LINE_REDIRECT_URI,
        client_id: LINE_CHANNEL_ID,
        client_secret: LINE_CHANNEL_SECRET
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const { access_token, id_token, refresh_token } = tokenResponse.data;
    
    // 驗證 ID Token
    const idTokenPayload = JSON.parse(
      Buffer.from(id_token.split('.')[1], 'base64').toString()
    );
    
    // 驗證 nonce
    if (idTokenPayload.nonce !== req.session.oauthNonce) {
      return res.status(400).json({ error: 'Invalid nonce' });
    }
    
    // 使用 access token 取得詳細的用戶資訊
    const profileResponse = await axios.get('https://api.line.me/v2/profile', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    const userProfile = profileResponse.data;
    
    // 合併 ID token 和 profile 資訊
    const userInfo = {
      ...idTokenPayload,
      ...userProfile
    };
    
    res.json({
      success: true,
      user: userInfo,
      tokens: {
        access_token,
        refresh_token: refresh_token || null
      }
    });
    
  } catch (error) {
    console.error('LINE OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'OAuth authentication failed' });
  }
});
```

### 3. LINE Login 進階功能

#### Email 取得
```javascript
// 如果申請了 email 權限
async function getLineUserEmail(accessToken) {
  try {
    const response = await axios.get('https://api.line.me/oauth2/v2.1/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return response.data.email;
  } catch (error) {
    console.error('Failed to get email:', error);
    return null;
  }
}
```

#### Token 驗證和刷新
```javascript
// 驗證 access token
async function verifyLineToken(accessToken) {
  try {
    const response = await axios.get('https://api.line.me/oauth2/v2.1/verify', {
      params: { access_token: accessToken }
    });
    
    return response.data;
  } catch (error) {
    return null;
  }
}

// 刷新 access token
async function refreshLineToken(refreshToken) {
  try {
    const response = await axios.post('https://api.line.me/oauth2/v2.1/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: LINE_CHANNEL_ID,
        client_secret: LINE_CHANNEL_SECRET
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    throw new Error('Failed to refresh token');
  }
}
```

---

## Node.js + Express 整合

### 1. 完整的 OAuth 中介軟體

```javascript
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const crypto = require('crypto');

const app = express();

// Session 設定
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 小時
  }
}));

// Passport 初始化
app.use(passport.initialize());
app.use(passport.session());

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // 檢查用戶是否已存在
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      return done(null, user);
    }
    
    // 建立新用戶
    user = new User({
      googleId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      avatar: profile.photos[0].value,
      provider: 'google'
    });
    
    await user.save();
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// 序列化用戶
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
```

### 2. 統一的 OAuth 路由

```javascript
// 路由設定
const authRoutes = express.Router();

// Google OAuth
authRoutes.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

authRoutes.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

// LINE OAuth (自定義實作)
authRoutes.get('/line', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');
  req.session.oauthState = state;
  
  const authURL = 'https://access.line.me/oauth2/v2.1/authorize?' + 
    new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINE_CHANNEL_ID,
      redirect_uri: process.env.LINE_REDIRECT_URI,
      state: state,
      scope: 'profile openid'
    });
  
  res.redirect(authURL);
});

authRoutes.get('/line/callback', async (req, res) => {
  // LINE OAuth 處理邏輯（如前所述）
});

// 登出
authRoutes.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.redirect('/');
  });
});

app.use('/auth', authRoutes);
```

### 3. 認證中介軟體

```javascript
// 檢查用戶是否已認證
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

// 檢查用戶角色
function requireRole(role) {
  return (req, res, next) => {
    if (req.user && req.user.role === role) {
      return next();
    }
    res.status(403).json({ error: 'Insufficient permissions' });
  };
}

// 使用範例
app.get('/api/profile', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/admin', requireAuth, requireRole('admin'), (req, res) => {
  res.json({ message: 'Admin access granted' });
});
```

---

## NexusTrade 專案整合指南

### 1. 環境變數設定

在 `.env` 檔案中新增：

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# LINE OAuth
LINE_CHANNEL_ID=your_line_channel_id
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_REDIRECT_URI=http://localhost:3000/auth/line/callback

# Session
SESSION_SECRET=your_random_session_secret

# Database
MONGODB_URI=mongodb://localhost:27017/nexustrade
```

### 2. 用戶模型更新

```javascript
// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // 原有欄位
  email: { type: String, required: true, unique: true },
  username: { type: String },
  
  // OAuth 相關欄位
  googleId: String,
  lineId: String,
  provider: { 
    type: String, 
    enum: ['local', 'google', 'line'],
    default: 'local'
  },
  
  // 個人資訊
  name: String,
  avatar: String,
  
  // OAuth tokens (加密存儲)
  tokens: {
    google: {
      accessToken: String,
      refreshToken: String,
      expiresAt: Date
    },
    line: {
      accessToken: String,
      refreshToken: String,
      expiresAt: Date
    }
  },
  
  // 其他現有欄位...
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

module.exports = mongoose.model('User', userSchema);
```

### 3. 前端登入按鈕

```html
<!-- public/index.html 或登入頁面 -->
<div class="oauth-login">
  <h2>選擇登入方式</h2>
  
  <a href="/auth/google" class="oauth-btn google-btn">
    <img src="/images/google-icon.png" alt="Google">
    使用 Google 帳號登入
  </a>
  
  <a href="/auth/line" class="oauth-btn line-btn">
    <img src="/images/line-icon.png" alt="LINE">
    使用 LINE 帳號登入
  </a>
  
  <div class="divider">或</div>
  
  <form id="localLogin">
    <!-- 原有的本地登入表單 -->
  </form>
</div>
```

### 4. CSS 樣式

```css
/* public/css/main.css */
.oauth-login {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
}

.oauth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 12px 24px;
  margin: 8px 0;
  border: 2px solid #ddd;
  border-radius: 8px;
  text-decoration: none;
  color: #333;
  font-weight: 500;
  transition: all 0.3s ease;
}

.oauth-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.google-btn {
  background: #fff;
  border-color: #db4437;
}

.google-btn:hover {
  background: #f8f9fa;
  border-color: #c23321;
}

.line-btn {
  background: #00B900;
  border-color: #00B900;
  color: white;
}

.line-btn:hover {
  background: #009900;
  border-color: #009900;
}

.oauth-btn img {
  width: 20px;
  height: 20px;
}

.divider {
  text-align: center;
  margin: 24px 0;
  position: relative;
  color: #666;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #ddd;
  z-index: 1;
}

.divider::after {
  content: '或';
  background: white;
  padding: 0 16px;
  position: relative;
  z-index: 2;
}
```

### 5. 前端 JavaScript 整合

```javascript
// public/js/auth.js
class AuthManager {
  constructor() {
    this.checkAuthStatus();
  }
  
  async checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      
      if (data.authenticated) {
        this.handleAuthenticatedUser(data.user);
      } else {
        this.handleUnauthenticatedUser();
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
    }
  }
  
  handleAuthenticatedUser(user) {
    // 更新 UI 顯示用戶資訊
    document.getElementById('userInfo').style.display = 'block';
    document.getElementById('loginSection').style.display = 'none';
    
    document.getElementById('userName').textContent = user.name || user.email;
    if (user.avatar) {
      document.getElementById('userAvatar').src = user.avatar;
    }
    
    // 根據提供者顯示不同的圖示
    const providerIcon = document.getElementById('providerIcon');
    if (user.provider === 'google') {
      providerIcon.className = 'provider-icon google';
    } else if (user.provider === 'line') {
      providerIcon.className = 'provider-icon line';
    }
  }
  
  handleUnauthenticatedUser() {
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
  }
  
  async logout() {
    try {
      await fetch('/auth/logout');
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
}

// 初始化
const authManager = new AuthManager();
```

### 6. API 路由保護

```javascript
// routes/api.js 更新
const express = require('express');
const router = express.Router();

// 認證狀態檢查
router.get('/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        avatar: req.user.avatar,
        provider: req.user.provider
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// 保護的 API 路由
router.use('/protected', requireAuth);

router.get('/protected/profile', (req, res) => {
  res.json({ user: req.user });
});

router.get('/protected/watchlist', async (req, res) => {
  // 取得用戶的監視清單
});

module.exports = router;
```

---

## 最佳實務與安全性

### 1. 安全性檢查清單

#### CSRF 防護
```javascript
// 使用 state 參數防止 CSRF 攻擊
const state = crypto.randomBytes(32).toString('hex');
req.session.oauthState = state;

// 在回調中驗證
if (state !== req.session.oauthState) {
  return res.status(400).json({ error: 'CSRF attack detected' });
}
```

#### HTTPS 強制
```javascript
// 在生產環境強制使用 HTTPS
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

#### Token 安全存儲
```javascript
const crypto = require('crypto');

// 加密 token
function encryptToken(token) {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// 解密 token
function decryptToken(encryptedToken) {
  const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### 2. 錯誤處理

```javascript
// 統一的 OAuth 錯誤處理
function handleOAuthError(error, provider, res) {
  console.error(`${provider} OAuth error:`, error);
  
  // 記錄錯誤但不暴露詳細資訊給客戶端
  const errorMessages = {
    'access_denied': '用戶拒絕授權',
    'invalid_request': '請求參數錯誤',
    'invalid_grant': '授權碼無效',
    'unauthorized_client': '客戶端未授權'
  };
  
  const message = errorMessages[error.error] || '登入失敗，請稍後再試';
  res.redirect(`/login?error=${encodeURIComponent(message)}`);
}
```

### 3. 監控和日誌

```javascript
const winston = require('winston');

// 設定日誌
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/oauth-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/oauth-combined.log' })
  ]
});

// OAuth 事件記錄
function logOAuthEvent(event, provider, userId = null, details = {}) {
  logger.info('OAuth Event', {
    event,
    provider,
    userId,
    timestamp: new Date().toISOString(),
    ip: details.ip,
    userAgent: details.userAgent
  });
}

// 使用範例
app.get('/auth/google/callback', (req, res, next) => {
  logOAuthEvent('google_callback_started', 'google', null, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // OAuth 處理邏輯...
});
```

### 4. 速率限制

```javascript
const rateLimit = require('express-rate-limit');

// OAuth 路由的速率限制
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 10, // 每個 IP 最多 10 次請求
  message: '請求過於頻繁，請稍後再試',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/auth', oauthLimiter);
```

---

## 故障排除

### 1. 常見問題與解決方案

#### Google OAuth 問題

**問題**: `redirect_uri_mismatch`
```
解決方案:
1. 檢查 Google Cloud Console 中的重導向 URI 設定
2. 確保 URI 完全匹配（包括協議、域名、路徑）
3. 檢查是否有多餘的斜線或參數
```

**問題**: `invalid_client`
```
解決方案:
1. 檢查 Client ID 和 Client Secret 是否正確
2. 確認 OAuth 同意畫面已發布
3. 檢查 JavaScript 來源是否正確設定
```

**問題**: `access_denied`
```
解決方案:
1. 用戶拒絕了授權請求
2. 檢查請求的 scope 是否合理
3. 確認應用未被 Google 標記為不安全
```

#### LINE OAuth 問題

**問題**: `invalid_request`
```
解決方案:
1. 檢查 Channel ID 和 Channel Secret
2. 確認回調 URL 設定正確
3. 檢查請求參數格式
```

**問題**: `unauthorized_client`
```
解決方案:
1. 確認 Channel 狀態是"已發布"
2. 檢查 scope 權限是否已申請
3. 確認應用類型設定正確
```

**問題**: Email 權限無法取得
```
解決方案:
1. 確認已在 LINE Console 申請 email 權限
2. 檢查申請狀態是否為"已核准"
3. 在 scope 中包含 "email"
```

### 2. 除錯技巧

#### 啟用詳細日誌
```javascript
// 開發環境下啟用詳細日誌
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`, {
      headers: req.headers,
      query: req.query,
      body: req.body
    });
    next();
  });
}
```

#### Token 檢查工具
```javascript
// 檢查 JWT token 內容
function inspectJWT(token) {
  const parts = token.split('.');
  const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
  
  console.log('JWT Header:', header);
  console.log('JWT Payload:', payload);
  console.log('Expires at:', new Date(payload.exp * 1000));
}
```

#### 網路請求檢查
```javascript
// 攔截並記錄所有 OAuth 相關的 HTTP 請求
const originalFetch = global.fetch;
global.fetch = function(url, options) {
  if (url.includes('oauth') || url.includes('google') || url.includes('line')) {
    console.log('OAuth Request:', { url, options });
  }
  return originalFetch.apply(this, arguments);
};
```

### 3. 測試環境設定

#### 測試用戶設定
```javascript
// 建立測試用戶
const testUsers = {
  google: {
    email: 'test@gmail.com',
    password: 'test123',
    // Google Test Account 設定
  },
  line: {
    lineId: 'test_line_id',
    // LINE 測試帳號設定
  }
};
```

#### 模擬 OAuth 回調
```javascript
// 開發環境下的模擬 OAuth 回調
if (process.env.NODE_ENV === 'development') {
  app.get('/test/auth/:provider', (req, res) => {
    const { provider } = req.params;
    
    // 模擬成功的 OAuth 回調
    req.session.user = testUsers[provider];
    res.redirect('/dashboard');
  });
}
```

---

## 結論

透過本教學，你應該能夠：

1. **理解 OAuth 2.0 的核心概念**和運作流程
2. **成功設定 Google 和 LINE 的 OAuth 服務**
3. **在 Node.js + Express 中實作完整的 OAuth 流程**
4. **整合到 NexusTrade 專案中**
5. **確保安全性和最佳實務**
6. **解決常見問題**

記住：
- 永遠驗證 state 參數以防止 CSRF 攻擊
- 在生產環境中使用 HTTPS
- 妥善保管 Client Secret
- 定期更新和輪換 tokens
- 監控異常登入活動

OAuth 2.0 是一個強大的工具，正確實作後可以大幅提升用戶體驗和安全性。繼續深入學習和實踐，你將能夠構建更加安全和用戶友好的應用程式！

---

## 參考資源

- [Google OAuth 2.0 官方文檔](https://developers.google.com/identity/protocols/oauth2)
- [LINE Login 官方文檔](https://developers.line.biz/en/docs/line-login/)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [OpenID Connect 規範](https://openid.net/connect/)
- [Express.js 官方文檔](https://expressjs.com/)
- [Passport.js 策略文檔](http://www.passportjs.org/packages/)

*最後更新：2025年1月* 