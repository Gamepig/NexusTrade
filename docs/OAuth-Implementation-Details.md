# OAuth 2.0 實作細節
*NexusTrade 專案程式碼實作指南*

## Node.js + Express 實作

### 1. Google OAuth 實作

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
```

#### Google OAuth 路由
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

### 2. LINE OAuth 實作

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
      
      // 尋找或建立使用者
      let user = await User.findOne({ lineId: profile.userId });
      
      if (!user) {
        user = new User({
          lineId: profile.userId,
          name: profile.displayName,
          avatar: profile.pictureUrl,
          provider: 'line'
        });
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

### 3. 使用者模型

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

module.exports = mongoose.model('User', userSchema);
```

### 4. 認證中介軟體

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

---

## 前端整合

### 1. LoginModal 組件更新

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

### 2. 主應用程式整合

```javascript
// public/js/nexus-app-fixed.js 中的認證部分
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
      location.reload();
    } catch (error) {
      console.error('登出失敗:', error);
    }
  }
}
```

---

## 安全性最佳實務

### 1. CSRF 防護
```javascript
// 使用 state 參數防止 CSRF 攻擊
const crypto = require('crypto');

const generateState = () => {
  return crypto.randomBytes(32).toString('hex');
};
```

### 2. HTTPS 設定
```javascript
// 正式環境的 cookie 設定
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000
};
```

### 3. 錯誤處理
```javascript
const handleOAuthError = (error, req, res) => {
  console.error('OAuth 錯誤:', error);
  
  const errorMappings = {
    'access_denied': '使用者拒絕授權',
    'invalid_request': '無效的請求參數',
    'invalid_client': '無效的客戶端憑證'
  };
  
  const errorMessage = errorMappings[error.error] || '登入失敗，請稍後再試';
  res.redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
};
```

---

## 常見問題排除

### Google OAuth 問題
- **invalid_client**: 檢查 Client ID 和 Secret
- **redirect_uri_mismatch**: 確認回調 URL 設定正確
- **access_denied**: 檢查 OAuth 同意畫面設定

### LINE OAuth 問題
- **invalid_request**: 檢查 Channel ID 和參數格式
- **unauthorized_client**: 確認 LINE Login 頻道已啟用
- **無法取得 email**: 申請並等待 email 權限審核

### 除錯工具
```javascript
// 前端除錯工具
window.oauthDebug = {
  checkAuth: async () => {
    const response = await fetch('/api/auth/status');
    console.log('Auth Status:', await response.json());
  },
  testGoogleLogin: () => window.location.href = '/auth/google',
  testLineLogin: () => window.location.href = '/auth/line'
};
```

---

*最後更新：2025-01-26* 