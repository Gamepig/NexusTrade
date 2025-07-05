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

### 3. Node.js 實作

#### 安裝相依套件
```bash
npm install passport passport-google-oauth20 express-session
```

#### Passport 設定
```javascript
// src/config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User.model');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // 檢查使用者是否已存在
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      return done(null, user);
    }
    
    // 建立新使用者
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

#### 路由設定
```javascript
// src/routes/auth.js
const express = require('express');
const passport = require('passport');
const router = express.Router();

// Google OAuth 啟動路由
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth 回調路由
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // 成功認證，重導向至主頁
    res.redirect('/dashboard');
  }
);

module.exports = router;
```

### 4. 前端整合

#### HTML 登入按鈕
```html
<!-- 在 LoginModal 或登入頁面中 -->
<button onclick="window.location.href='/auth/google'" class="google-login-btn">
  <img src="/images/google-icon.png" alt="Google">
  使用 Google 登入
</button>
```

#### JavaScript 處理
```javascript
// public/js/components/LoginModal.js
class LoginModal {
  handleGoogleLogin() {
    window.location.href = '/auth/google';
  }
  
  // 檢查登入狀態
  async checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      
      if (data.isAuthenticated) {
        this.onLoginSuccess(data.user);
      }
    } catch (error) {
      console.error('檢查認證狀態失敗:', error);
    }
  }
}
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

### 3. Node.js 實作

#### 安裝相依套件
```bash
npm install axios uuid
```

#### LINE OAuth 控制器
```javascript
// src/controllers/oauth.controller.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User.model');
const jwt = require('../utils/jwt');

class OAuthController {
  // LINE OAuth 啟動
  static lineAuth(req, res) {
    const state = uuidv4();
    req.session.oauthState = state;
    
    const lineAuthURL = 'https://access.line.me/oauth2/v2.1/authorize?' +
      `response_type=code&` +
      `client_id=${process.env.LINE_CHANNEL_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.LINE_CALLBACK_URL)}&` +
      `state=${state}&` +
      `scope=profile%20openid%20email`;
    
    res.redirect(lineAuthURL);
  }
  
  // LINE OAuth 回調處理
  static async lineCallback(req, res) {
    try {
      const { code, state } = req.query;
      
      // 驗證 state 參數
      if (state !== req.session.oauthState) {
        return res.status(400).json({ error: 'Invalid state parameter' });
      }
      
      // 交換 access token
      const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token', {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.LINE_CALLBACK_URL,
        client_id: process.env.LINE_CHANNEL_ID,
        client_secret: process.env.LINE_CHANNEL_SECRET
      }, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const { access_token, id_token } = tokenResponse.data;
      
      // 取得使用者資訊
      const profileResponse = await axios.get('https://api.line.me/v2/profile', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      
      const profile = profileResponse.data;
      
      // 取得 email（如果有權限）
      let email = null;
      if (id_token) {
        try {
          const emailResponse = await axios.post('https://api.line.me/oauth2/v2.1/verify', {
            id_token: id_token,
            client_id: process.env.LINE_CHANNEL_ID
          });
          email = emailResponse.data.email;
        } catch (emailError) {
          console.log('無法取得 email:', emailError.message);
        }
      }
      
      // 尋找或建立使用者
      let user = await User.findOne({ lineId: profile.userId });
      
      if (!user) {
        user = new User({
          lineId: profile.userId,
          email: email,
          name: profile.displayName,
          avatar: profile.pictureUrl,
          provider: 'line'
        });
        await user.save();
      } else if (email && !user.email) {
        // 更新 email 如果之前沒有
        user.email = email;
        await user.save();
      }
      
      // 產生 JWT token
      const token = jwt.generateToken(user._id);
      
      // 設定 cookie 並重導向
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 小時
      });
      
      res.redirect('/dashboard?login=success');
      
    } catch (error) {
      console.error('LINE OAuth 錯誤:', error);
      res.redirect('/login?error=oauth_failed');
    }
  }
}

module.exports = OAuthController;
```

#### 路由設定
```javascript
// src/routes/auth.js
const OAuthController = require('../controllers/oauth.controller');

// LINE OAuth 路由
router.get('/line', OAuthController.lineAuth);
router.get('/line/callback', OAuthController.lineCallback);
```

### 4. 前端整合

#### HTML 登入按鈕
```html
<button onclick="window.location.href='/auth/line'" class="line-login-btn">
  <img src="/images/line-icon.png" alt="LINE">
  使用 LINE 登入
</button>
```

#### 樣式設定
```css
/* public/css/main.css */
.google-login-btn, .line-login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  color: #333;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  margin: 8px 0;
}

.google-login-btn:hover {
  background: #f8f9fa;
  border-color: #4285f4;
}

.line-login-btn:hover {
  background: #f8f9fa;
  border-color: #00B900;
}

.google-login-btn img, .line-login-btn img {
  width: 20px;
  height: 20px;
}
```

---

## Node.js + Express 整合

### 1. 中介軟體設定

#### Session 中介軟體
```javascript
// src/server.js
const session = require('express-session');
const MongoStore = require('connect-mongo');

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
```

#### 認證中介軟體
```javascript
// src/middleware/auth.middleware.js
const jwt = require('../utils/jwt');
const User = require('../models/User.model');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.authToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: '未提供認證 token' });
    }
    
    const decoded = jwt.verifyToken(token);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: '使用者不存在' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: '無效的認證 token' });
  }
};

module.exports = authMiddleware;
```

### 2. 使用者模型

```javascript
// src/models/User.model.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, sparse: true },
  name: { type: String, required: true },
  avatar: { type: String },
  provider: { type: String, enum: ['google', 'line'], required: true },
  
  // OAuth 提供者特定欄位
  googleId: { type: String, sparse: true },
  lineId: { type: String, sparse: true },
  
  // 應用程式特定欄位
  watchlist: [{ type: String }], // 加密貨幣代碼
  priceAlerts: [{
    symbol: String,
    targetPrice: Number,
    condition: { type: String, enum: ['above', 'below'] },
    isActive: { type: Boolean, default: true }
  }],
  notificationSettings: {
    email: { type: Boolean, default: true },
    line: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// 建立唯一索引
userSchema.index({ googleId: 1 }, { sparse: true, unique: true });
userSchema.index({ lineId: 1 }, { sparse: true, unique: true });
userSchema.index({ email: 1 }, { sparse: true });

module.exports = mongoose.model('User', userSchema);
```

### 3. API 端點

```javascript
// src/routes/auth.js
const authMiddleware = require('../middleware/auth.middleware');

// 取得當前使用者資訊
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar,
      provider: req.user.provider
    }
  });
});

// 登出
router.post('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.json({ message: '已成功登出' });
});

// 檢查認證狀態
router.get('/status', authMiddleware, (req, res) => {
  res.json({
    isAuthenticated: true,
    user: req.user
  });
});
```

---

## NexusTrade 專案整合指南

### 1. 現有程式碼整合

#### 更新 LoginModal 組件
```javascript
// public/js/components/LoginModal.js
class LoginModal {
  constructor() {
    this.modal = null;
    this.isVisible = false;
    this.init();
  }
  
  init() {
    this.createModal();
    this.bindEvents();
    this.checkAuthStatus();
  }
  
  createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'login-modal-overlay';
    this.modal.innerHTML = `
      <div class="login-modal">
        <div class="login-modal-header">
          <h2>登入 NexusTrade</h2>
          <button class="close-btn">&times;</button>
        </div>
        <div class="login-modal-content">
          <p class="login-description">選擇您偏好的登入方式：</p>
          
          <div class="oauth-buttons">
            <button class="oauth-btn google-btn" data-provider="google">
              <img src="/images/google-icon.png" alt="Google">
              使用 Google 登入
            </button>
            
            <button class="oauth-btn line-btn" data-provider="line">
              <img src="/images/line-icon.png" alt="LINE">
              使用 LINE 登入
            </button>
          </div>
          
          <div class="login-benefits">
            <h3>登入後您可以：</h3>
            <ul>
              <li>設定個人化的價格提醒</li>
              <li>建立自訂觀察清單</li>
              <li>取得 AI 市場分析</li>
              <li>接收重要市場通知</li>
            </ul>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.modal);
  }
  
  bindEvents() {
    // OAuth 登入按鈕
    this.modal.querySelectorAll('.oauth-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const provider = e.currentTarget.dataset.provider;
        this.handleOAuthLogin(provider);
      });
    });
    
    // 關閉按鈕
    this.modal.querySelector('.close-btn').addEventListener('click', () => {
      this.hide();
    });
    
    // 點擊背景關閉
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });
  }
  
  handleOAuthLogin(provider) {
    window.location.href = `/auth/${provider}`;
  }
  
  async checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/status');
      if (response.ok) {
        const data = await response.json();
        if (data.isAuthenticated) {
          this.onLoginSuccess(data.user);
        }
      }
    } catch (error) {
      console.error('檢查認證狀態失敗:', error);
    }
  }
  
  onLoginSuccess(user) {
    // 更新全域狀態
    window.NexusApp.setUser(user);
    
    // 顯示成功訊息
    const notification = new Notification('歡迎回來！', 'success');
    notification.show();
    
    // 隱藏登入視窗
    this.hide();
    
    // 重新載入需要認證的組件
    window.NexusApp.refreshAuthComponents();
  }
  
  show() {
    this.modal.style.display = 'flex';
    this.isVisible = true;
    document.body.style.overflow = 'hidden';
  }
  
  hide() {
    this.modal.style.display = 'none';
    this.isVisible = false;
    document.body.style.overflow = '';
  }
}
```

#### 更新主應用程式
```javascript
// public/js/nexus-app-fixed.js
class NexusApp {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.components = {};
    this.init();
  }
  
  async init() {
    await this.checkAuthStatus();
    this.initComponents();
    this.bindEvents();
  }
  
  async checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/status');
      if (response.ok) {
        const data = await response.json();
        this.setUser(data.user);
      }
    } catch (error) {
      console.log('使用者未登入');
    }
  }
  
  setUser(user) {
    this.user = user;
    this.isAuthenticated = !!user;
    this.updateAuthUI();
  }
  
  updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const userMenu = document.getElementById('user-menu');
    
    if (this.isAuthenticated) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (userMenu) {
        userMenu.style.display = 'block';
        userMenu.querySelector('.user-name').textContent = this.user.name;
        userMenu.querySelector('.user-avatar').src = this.user.avatar;
      }
    } else {
      if (loginBtn) loginBtn.style.display = 'block';
      if (userMenu) userMenu.style.display = 'none';
    }
  }
  
  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      this.user = null;
      this.isAuthenticated = false;
      this.updateAuthUI();
      location.reload(); // 重新載入頁面
    } catch (error) {
      console.error('登出失敗:', error);
    }
  }
  
  refreshAuthComponents() {
    // 重新載入需要認證的組件
    if (this.components.watchlist) {
      this.components.watchlist.refresh();
    }
    if (this.components.priceAlerts) {
      this.components.priceAlerts.refresh();
    }
  }
}
```

### 2. 前端認證檢查

```javascript
// public/js/lib/api.js
class ApiClient {
  constructor() {
    this.baseURL = '/api';
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };
    
    try {
      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // 認證失效，顯示登入視窗
        window.NexusApp.components.loginModal.show();
        throw new Error('請先登入');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API 請求失敗:', error);
      throw error;
    }
  }
  
  async get(endpoint) {
    return this.request(endpoint);
  }
  
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }
}
```

---

## 最佳實務與安全性

### 1. 安全檢查清單

#### 環境變數保護
- ✅ 使用 `.env` 檔案儲存敏感資訊
- ✅ 將 `.env` 加入 `.gitignore`
- ✅ 在正式環境使用環境變數而非檔案
- ✅ 定期輪換 client secrets

#### HTTPS 與 Cookie 安全
```javascript
// 正式環境的 cookie 設定
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000
};

res.cookie('authToken', token, cookieOptions);
```

#### CSRF 防護
```javascript
// 使用 state 參數防止 CSRF 攻擊
const crypto = require('crypto');

const generateState = () => {
  return crypto.randomBytes(32).toString('hex');
};

// 在 OAuth 啟動時設定 state
req.session.oauthState = generateState();

// 在回調中驗證 state
if (req.query.state !== req.session.oauthState) {
  throw new Error('Invalid state parameter');
}
```

#### Token 驗證
```javascript
// JWT token 驗證中介軟體
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token 已過期');
    }
    throw new Error('無效的 token');
  }
};
```

### 2. 錯誤處理

#### OAuth 錯誤處理
```javascript
// src/controllers/oauth.controller.js
const handleOAuthError = (error, req, res) => {
  console.error('OAuth 錯誤:', error);
  
  const errorMappings = {
    'access_denied': '使用者拒絕授權',
    'invalid_request': '無效的請求參數',
    'invalid_client': '無效的客戶端憑證',
    'invalid_grant': '無效的授權碼',
    'unsupported_response_type': '不支援的回應類型'
  };
  
  const errorMessage = errorMappings[error.error] || '登入失敗，請稍後再試';
  const redirectURL = `/login?error=${encodeURIComponent(errorMessage)}`;
  
  res.redirect(redirectURL);
};
```

#### 前端錯誤處理
```javascript
// public/js/components/LoginModal.js
class LoginModal {
  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'login-error';
    errorDiv.textContent = message;
    
    const content = this.modal.querySelector('.login-modal-content');
    content.insertBefore(errorDiv, content.firstChild);
    
    // 3 秒後自動移除錯誤訊息
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }
  
  handleLoginError() {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
      this.showError(decodeURIComponent(error));
      // 清除 URL 中的錯誤參數
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
}
```

### 3. 效能優化

#### 懶載入策略
```javascript
// 只在需要時載入 OAuth 相關程式碼
const loadOAuthComponents = async () => {
  if (!window.oauthLoaded) {
    await import('./components/LoginModal.js');
    window.oauthLoaded = true;
  }
};

// 當使用者點擊登入時才載入
document.getElementById('login-btn').addEventListener('click', async () => {
  await loadOAuthComponents();
  window.NexusApp.components.loginModal.show();
});
```

#### 快取策略
```javascript
// 使用者資訊快取
class UserCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5 分鐘
  }
  
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
}
```

---

## 故障排除

### 1. 常見問題

#### Google OAuth 問題

**錯誤：`invalid_client`**
- **原因**：Client ID 或 Secret 不正確
- **解決方案**：
  1. 檢查 `.env` 檔案中的憑證
  2. 確認 Google Cloud Console 中的憑證是否正確
  3. 檢查回調 URL 是否匹配

**錯誤：`redirect_uri_mismatch`**
- **原因**：回調 URL 不匹配
- **解決方案**：
  1. 檢查 Google Cloud Console 中設定的回調 URL
  2. 確認開發和正式環境的 URL 都有設定
  3. 注意 HTTP vs HTTPS 的差異

**錯誤：`access_denied`**
- **原因**：使用者拒絕授權或 OAuth 同意畫面設定問題
- **解決方案**：
  1. 檢查 OAuth 同意畫面的設定
  2. 確認應用程式已通過 Google 審核（如需要）
  3. 檢查請求的權限範圍是否合理

#### LINE Login 問題

**錯誤：`invalid_request`**
- **原因**：請求參數不正確
- **解決方案**：
  1. 檢查 Channel ID 和 Secret
  2. 確認回調 URL 格式正確
  3. 檢查 scope 參數（應為 `profile openid email`）

**錯誤：`unauthorized_client`**
- **原因**：頻道設定問題
- **解決方案**：
  1. 確認 LINE Login 頻道已啟用
  2. 檢查頻道類型是否為「LINE Login」
  3. 確認回調 URL 已正確設定

**錯誤：無法取得 email**
- **原因**：Email 權限未申請或未通過審核
- **解決方案**：
  1. 在 LINE Developers Console 申請 email 權限
  2. 等待審核通過
  3. 在程式碼中妥善處理沒有 email 的情況

### 2. 除錯技巧

#### 啟用詳細日誌
```javascript
// src/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

#### OAuth 流程除錯
```javascript
// 在 OAuth 回調中新增詳細日誌
static async lineCallback(req, res) {
  const logger = require('../utils/logger');
  
  try {
    logger.info('LINE OAuth 回調開始', { 
      query: req.query,
      session: req.session.oauthState 
    });
    
    const { code, state } = req.query;
    
    // 驗證 state
    if (state !== req.session.oauthState) {
      logger.error('State 參數不匹配', { 
        received: state, 
        expected: req.session.oauthState 
      });
      throw new Error('Invalid state parameter');
    }
    
    logger.info('開始交換 access token');
    
    // ... 其他程式碼
    
  } catch (error) {
    logger.error('LINE OAuth 錯誤', { 
      error: error.message,
      stack: error.stack 
    });
    res.redirect('/login?error=oauth_failed');
  }
}
```

#### 前端除錯工具
```javascript
// public/js/debug/oauth-debug.js
class OAuthDebugger {
  static enable() {
    if (process.env.NODE_ENV !== 'production') {
      window.oauthDebug = {
        checkAuth: async () => {
          const response = await fetch('/api/auth/status');
          console.log('Auth Status:', await response.json());
        },
        
        testGoogleLogin: () => {
          console.log('Testing Google OAuth...');
          window.location.href = '/auth/google';
        },
        
        testLineLogin: () => {
          console.log('Testing LINE OAuth...');
          window.location.href = '/auth/line';
        },
        
        clearAuth: async () => {
          await fetch('/api/auth/logout', { method: 'POST' });
          location.reload();
        }
      };
      
      console.log('OAuth Debug tools available at window.oauthDebug');
    }
  }
}

// 在開發環境中啟用
if (window.location.hostname === 'localhost') {
  OAuthDebugger.enable();
}
```

### 3. 測試環境設定

#### 本地測試腳本
```bash
#!/bin/bash
# scripts/test-oauth-system.sh

echo "測試 OAuth 系統..."

echo "1. 檢查環境變數..."
if [ -z "$GOOGLE_CLIENT_ID" ]; then
  echo "❌ GOOGLE_CLIENT_ID 未設定"
else
  echo "✅ GOOGLE_CLIENT_ID 已設定"
fi

if [ -z "$LINE_CHANNEL_ID" ]; then
  echo "❌ LINE_CHANNEL_ID 未設定"
else
  echo "✅ LINE_CHANNEL_ID 已設定"
fi

echo "2. 測試 OAuth 端點..."
curl -I http://localhost:3000/auth/google
curl -I http://localhost:3000/auth/line

echo "3. 測試認證狀態 API..."
curl -X GET http://localhost:3000/api/auth/status

echo "OAuth 系統測試完成"
```

#### 自動化測試
```javascript
// tests/oauth.test.js
const request = require('supertest');
const app = require('../src/server');

describe('OAuth 系統測試', () => {
  describe('Google OAuth', () => {
    test('應該重導向到 Google 授權頁面', async () => {
      const response = await request(app)
        .get('/auth/google')
        .expect(302);
      
      expect(response.header.location).toContain('accounts.google.com');
    });
  });
  
  describe('LINE OAuth', () => {
    test('應該重導向到 LINE 授權頁面', async () => {
      const response = await request(app)
        .get('/auth/line')
        .expect(302);
      
      expect(response.header.location).toContain('access.line.me');
    });
  });
  
  describe('認證 API', () => {
    test('未認證時應該回傳 401', async () => {
      await request(app)
        .get('/api/auth/status')
        .expect(401);
    });
  });
});
```

---

## 結論

這份指南涵蓋了在 NexusTrade 專案中實作 Google 與 LINE OAuth 2.0 的完整流程，包括：

1. **設定階段**：Console 設定、憑證建立、環境變數配置
2. **後端實作**：路由、控制器、中介軟體、使用者模型
3. **前端整合**：登入介面、狀態管理、API 呼叫
4. **安全性**：最佳實務、錯誤處理、效能優化
5. **除錯**：常見問題解決、測試工具、監控日誌

透過遵循這份指南，您可以在 NexusTrade 專案中成功整合雙重 OAuth 認證系統，提供使用者便利且安全的登入體驗。

### 下一步
1. 完成 Console 設定
2. 更新環境變數
3. 部署並測試 OAuth 流程
4. 監控使用者登入行為
5. 持續優化使用者體驗

---

*最後更新日期：2025-01-26* 