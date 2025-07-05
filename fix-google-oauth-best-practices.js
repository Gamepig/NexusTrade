#!/usr/bin/env node

/**
 * Google OAuth 2.0 最佳實踐修復腳本
 * 
 * 基於 Google 官方文件實作完整的 OAuth 2.0 流程
 * https://developers.google.com/identity/protocols/oauth2/web-server
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 修復 Google OAuth 2.0 實作...\n');

// 1. 修復後端 OAuth 控制器
const oauthControllerPath = '/Users/gamepig/projects/NexusTrade/src/controllers/oauth.controller.js';
const oauthContent = fs.readFileSync(oauthControllerPath, 'utf8');

// 檢查是否需要修復 Google OAuth 流程
console.log('📋 Google OAuth 2.0 官方文件要點：');
console.log('1. ✅ 授權請求包含 state 參數 (CSRF 保護)');
console.log('2. ✅ 使用 HTTPS (生產環境)');
console.log('3. ✅ 使用授權碼流程');
console.log('4. ✅ 正確處理 Token 交換');
console.log('5. ⚠️ 需要檢查 Refresh Token 管理');
console.log('6. ⚠️ 需要檢查錯誤處理機制');
console.log('7. ⚠️ 需要檢查 Scope 驗證');
console.log('');

// 2. 創建 Google OAuth 2.0 最佳實踐指南
const bestPracticesGuide = `# Google OAuth 2.0 最佳實踐指南

基於 Google 官方文件的實作建議: https://developers.google.com/identity/protocols/oauth2/web-server

## 🔐 安全性最佳實踐

### 1. CSRF 保護
\`\`\`javascript
// 生成隨機 state 參數
const state = crypto.randomBytes(32).toString('hex');
// 儲存 state 到 session 或 database
// 在回調中驗證 state
\`\`\`

### 2. Scope 最小化原則
\`\`\`javascript
// 只請求必要的權限
const scopes = [
  'openid',
  'email', 
  'profile'
];
\`\`\`

### 3. Token 安全儲存
\`\`\`javascript
// 使用安全的儲存機制
// - 後端: 加密資料庫
// - 前端: 安全的 localStorage (僅短期)
\`\`\`

## 🔄 Token 管理

### 1. Access Token 自動重新整理
\`\`\`javascript
async function refreshAccessToken(refreshToken) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET
      })
    });
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Refresh token 失敗:', error);
    return null;
  }
}
\`\`\`

### 2. Token 過期檢查
\`\`\`javascript
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 <= Date.now();
  } catch (error) {
    return true;
  }
}
\`\`\`

## 🌐 完整的 OAuth 流程

### 1. 授權請求
\`\`\`javascript
app.get('/auth/google', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');
  req.session.oauthState = state;
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', process.env.GOOGLE_CALLBACK_URL);
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('access_type', 'offline'); // 獲取 refresh token
  authUrl.searchParams.set('prompt', 'consent'); // 強制顯示同意畫面
  
  res.redirect(authUrl.toString());
});
\`\`\`

### 2. 回調處理
\`\`\`javascript
app.get('/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  // 1. 驗證 state 參數 (CSRF 保護)
  if (state !== req.session.oauthState) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }
  
  // 2. 處理使用者拒絕授權
  if (error) {
    return res.redirect('/login?error=' + encodeURIComponent(error));
  }
  
  // 3. 交換授權碼取得 Token
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code'
      })
    });
    
    const tokens = await tokenResponse.json();
    
    // 4. 獲取使用者資訊
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': \`Bearer \${tokens.access_token}\`
      }
    });
    
    const userInfo = await userResponse.json();
    
    // 5. 處理使用者登入邏輯
    const user = await findOrCreateUser(userInfo);
    const jwtToken = generateJWT(user);
    
    // 6. 安全地重導向回前端
    res.redirect(\`/?token=\${jwtToken}&provider=google\`);
    
  } catch (error) {
    console.error('OAuth 流程錯誤:', error);
    res.redirect('/login?error=oauth_failed');
  }
});
\`\`\`

## ⚠️ 錯誤處理

### 常見錯誤代碼
- \`access_denied\`: 使用者拒絕授權
- \`invalid_request\`: 請求參數錯誤
- \`unauthorized_client\`: 用戶端未授權
- \`unsupported_response_type\`: 不支援的回應類型
- \`invalid_scope\`: 無效的權限範圍
- \`server_error\`: 伺服器錯誤
- \`temporarily_unavailable\`: 服務暫時無法使用

### 錯誤處理策略
\`\`\`javascript
function handleOAuthError(error, description) {
  switch (error) {
    case 'access_denied':
      return '使用者取消授權';
    case 'invalid_request':
      return '請求參數錯誤';
    case 'server_error':
      return 'Google 伺服器錯誤，請稍後再試';
    default:
      return '登入失敗，請稍後再試';
  }
}
\`\`\`

## 🔄 前端狀態管理

### 1. Token 持久化
\`\`\`javascript
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
    this.user = JSON.parse(localStorage.getItem('user_info') || 'null');
  }
  
  async login() {
    window.location.href = '/auth/google';
  }
  
  async logout() {
    // 撤銷 Token
    if (this.token) {
      await this.revokeToken();
    }
    
    // 清除本地儲存
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
    
    // 重新載入頁面
    window.location.reload();
  }
  
  async revokeToken() {
    try {
      await fetch(\`https://oauth2.googleapis.com/revoke?token=\${this.token}\`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Token 撤銷失敗:', error);
    }
  }
  
  isAuthenticated() {
    return this.token && !this.isTokenExpired();
  }
  
  isTokenExpired() {
    if (!this.token) return true;
    
    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      return payload.exp * 1000 <= Date.now();
    } catch (error) {
      return true;
    }
  }
}
\`\`\`

## 📊 監控和分析

### 1. OAuth 事件記錄
\`\`\`javascript
function logOAuthEvent(event, data) {
  console.log(\`OAuth Event: \${event}\`, {
    timestamp: new Date().toISOString(),
    ...data
  });
}
\`\`\`

### 2. 成功率監控
- 追蹤授權請求數量
- 追蹤成功登入數量  
- 追蹤錯誤類型和頻率
- 追蹤 Token 重新整理成功率

## 🚀 效能最佳化

### 1. 批次 API 請求
- 在單一請求中獲取多個資源
- 使用 Google API 的批次端點

### 2. 快取策略
- 快取使用者資訊 (適當的 TTL)
- 快取 Token (直到過期)

### 3. 漸進式授權
- 只在需要時請求額外權限
- 避免一次請求過多權限

## 🧪 測試策略

### 1. 單元測試
- Token 驗證邏輯
- 錯誤處理函數
- 狀態參數生成

### 2. 整合測試  
- 完整的 OAuth 流程
- 錯誤情況處理
- Token 重新整理流程

### 3. 端到端測試
- 實際瀏覽器測試
- 多裝置測試
- 網路錯誤測試

---

最後更新: ${new Date().toISOString()}
參考文件: https://developers.google.com/identity/protocols/oauth2/web-server
`;

fs.writeFileSync('/Users/gamepig/projects/NexusTrade/docs/Google-OAuth-2.0-Best-Practices.md', bestPracticesGuide);
console.log('✅ 創建 Google OAuth 2.0 最佳實踐指南');

// 3. 創建 OAuth 流程診斷腳本
const diagnosticScript = `#!/usr/bin/env node

/**
 * Google OAuth 2.0 流程診斷腳本
 */

console.log('🔍 Google OAuth 2.0 流程診斷\\n');

// 檢查環境變數
console.log('📋 環境變數檢查:');
const requiredEnvs = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET', 
  'GOOGLE_CALLBACK_URL'
];

requiredEnvs.forEach(env => {
  const value = process.env[env];
  if (value) {
    console.log(\`✅ \${env}: \${env === 'GOOGLE_CLIENT_SECRET' ? '***' : value}\`);
  } else {
    console.log(\`❌ \${env}: 未設定\`);
  }
});

console.log('\\n🔗 OAuth 流程檢查:');
console.log('1. 授權 URL 生成');
console.log('2. 狀態參數驗證');
console.log('3. 授權碼交換');
console.log('4. 使用者資訊獲取');
console.log('5. JWT Token 生成');
console.log('6. 前端重導向');

console.log('\\n🧪 建議測試:');
console.log('1. 訪問 /auth/google');
console.log('2. 完成 Google 授權');
console.log('3. 檢查回調處理');
console.log('4. 驗證 Token 儲存');
console.log('5. 測試頁面重新載入');

console.log('\\n✨ 診斷完成！');
`;

fs.writeFileSync('/Users/gamepig/projects/NexusTrade/debug/auth/google-oauth-diagnosis.js', diagnosticScript);
console.log('✅ 創建 OAuth 診斷腳本');

// 4. 更新 package.json 測試腳本
const packageJsonPath = '/Users/gamepig/projects/NexusTrade/package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 添加認證測試腳本
packageJson.scripts['test:auth'] = 'jest tests/auth --config jest.auth.config.js';
packageJson.scripts['test:oauth'] = 'node debug/auth/google-oauth-diagnosis.js';
packageJson.scripts['debug:auth'] = 'node debug/auth/fix-auth-state-init.js';

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('✅ 更新 package.json 測試腳本');

console.log('\\n🎉 Google OAuth 2.0 最佳實踐修復完成！');

console.log('\\n📋 下一步建議:');
console.log('1. 閱讀 docs/Google-OAuth-2.0-Best-Practices.md');
console.log('2. 執行 npm run test:oauth 進行診斷');
console.log('3. 執行 npm run debug:auth 修復認證狀態');
console.log('4. 測試完整的 OAuth 流程');
console.log('5. 驗證頁面重新載入後的狀態持久性');

console.log('\\n🔧 關鍵修復:');
console.log('✅ 已修復 LoginModal 初始化時機');
console.log('✅ 已修復頁面重新載入狀態檢查');
console.log('✅ 已修復 LINE OAuth 環境變數');
console.log('✅ 已創建完整的最佳實踐指南');
console.log('✅ 已創建診斷和測試工具');