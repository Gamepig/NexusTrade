# OAuth 2.0 測試與部署指南
*NexusTrade 專案測試和部署完整指南*

## 目錄
1. [環境設定檢查清單](#環境設定檢查清單)
2. [本地開發測試](#本地開發測試)
3. [自動化測試](#自動化測試)
4. [正式環境部署](#正式環境部署)
5. [監控和日誌](#監控和日誌)
6. [故障排除快速指南](#故障排除快速指南)

---

## 環境設定檢查清單

### 1. Google OAuth 設定檢查

#### Google Cloud Console 確認項目
- [ ] 專案已建立並啟用
- [ ] Google+ API 或 People API 已啟用
- [ ] OAuth 同意畫面已設定
- [ ] 憑證已建立（Web 應用程式類型）
- [ ] 授權重導向 URI 已正確設定
- [ ] Client ID 和 Client Secret 已記錄

#### 環境變數檢查
```bash
# 檢查必要的環境變數
echo "GOOGLE_CLIENT_ID: $GOOGLE_CLIENT_ID"
echo "GOOGLE_CLIENT_SECRET: $GOOGLE_CLIENT_SECRET" 
echo "GOOGLE_CALLBACK_URL: $GOOGLE_CALLBACK_URL"
```

### 2. LINE OAuth 設定檢查

#### LINE Developers Console 確認項目
- [ ] Provider 和 Channel 已建立
- [ ] Channel 類型為「LINE Login」
- [ ] 回調 URL 已設定
- [ ] Email 權限已申請（如需要）
- [ ] Channel ID 和 Channel Secret 已記錄

#### 環境變數檢查
```bash
# 檢查 LINE OAuth 環境變數
echo "LINE_CHANNEL_ID: $LINE_CHANNEL_ID"
echo "LINE_CHANNEL_SECRET: $LINE_CHANNEL_SECRET"
echo "LINE_CALLBACK_URL: $LINE_CALLBACK_URL"
```

### 3. 應用程式設定檢查

#### 必要環境變數
```bash
# .env 檔案應包含以下變數
SESSION_SECRET=your_session_secret_here
JWT_SECRET=your_jwt_secret_here
MONGODB_URI=mongodb://localhost:27017/nexustrade
NODE_ENV=development
```

---

## 本地開發測試

### 1. 快速測試腳本

```bash
#!/bin/bash
# scripts/test-oauth-system.sh

echo "🔍 OAuth 系統測試開始..."

# 檢查伺服器狀態
echo "1. 檢查伺服器狀態..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health

# 檢查 OAuth 端點
echo "2. 檢查 OAuth 端點..."
echo "Google OAuth:" 
curl -I -s http://localhost:3000/auth/google | head -n 1

echo "LINE OAuth:"
curl -I -s http://localhost:3000/auth/line | head -n 1

# 檢查認證狀態 API
echo "3. 檢查認證狀態 API..."
curl -s http://localhost:3000/api/auth/status

echo "✅ OAuth 系統測試完成"
```

### 2. 手動測試步驟

#### Google OAuth 測試
1. 開啟瀏覽器訪問 `http://localhost:3000`
2. 點擊「登入」按鈕
3. 選擇「使用 Google 登入」
4. 確認重導向到 Google 授權頁面
5. 使用 Google 帳號登入並授權
6. 確認重導向回應用程式
7. 檢查使用者資訊是否正確顯示

#### LINE OAuth 測試
1. 重複上述步驟，但選擇「使用 LINE 登入」
2. 確認重導向到 LINE 授權頁面
3. 使用 LINE 帳號登入並授權
4. 確認重導向回應用程式
5. 檢查使用者資訊是否正確顯示

### 3. 前端除錯工具

```javascript
// 在瀏覽器開發者工具中執行
// 檢查認證狀態
await fetch('/api/auth/status').then(r => r.json()).then(console.log);

// 測試 Google 登入
window.location.href = '/auth/google';

// 測試 LINE 登入
window.location.href = '/auth/line';

// 登出測試
await fetch('/api/auth/logout', { method: 'POST' });
```

---

## 自動化測試

### 1. 單元測試

```javascript
// tests/oauth.test.js
const request = require('supertest');
const app = require('../src/server');

describe('OAuth 路由測試', () => {
  describe('Google OAuth', () => {
    test('GET /auth/google 應該重導向到 Google', async () => {
      const response = await request(app)
        .get('/auth/google')
        .expect(302);
      
      expect(response.header.location).toContain('accounts.google.com');
      expect(response.header.location).toContain('oauth2');
    });
  });
  
  describe('LINE OAuth', () => {
    test('GET /auth/line 應該重導向到 LINE', async () => {
      const response = await request(app)
        .get('/auth/line')
        .expect(302);
      
      expect(response.header.location).toContain('access.line.me');
      expect(response.header.location).toContain('oauth2');
    });
    
    test('重導向 URL 應該包含必要參數', async () => {
      const response = await request(app)
        .get('/auth/line')
        .expect(302);
      
      const url = new URL(response.header.location);
      expect(url.searchParams.get('client_id')).toBeTruthy();
      expect(url.searchParams.get('redirect_uri')).toBeTruthy();
      expect(url.searchParams.get('state')).toBeTruthy();
      expect(url.searchParams.get('scope')).toContain('profile');
    });
  });
  
  describe('認證 API', () => {
    test('未認證時 /api/auth/status 應該回傳 401', async () => {
      await request(app)
        .get('/api/auth/status')
        .expect(401);
    });
    
    test('登出 API 應該清除 cookie', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);
      
      expect(response.header['set-cookie']).toContain('authToken=;');
    });
  });
});
```

### 2. 整合測試

```javascript
// tests/oauth-integration.test.js
const mongoose = require('mongoose');
const User = require('../src/models/User.model');

describe('OAuth 整合測試', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });
  
  describe('使用者建立', () => {
    test('應該建立新的 Google 使用者', async () => {
      const userData = {
        googleId: 'test_google_id',
        email: 'test@gmail.com',
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
        provider: 'google'
      };
      
      const user = new User(userData);
      await user.save();
      
      const savedUser = await User.findOne({ googleId: 'test_google_id' });
      expect(savedUser).toBeTruthy();
      expect(savedUser.email).toBe('test@gmail.com');
    });
    
    test('應該建立新的 LINE 使用者', async () => {
      const userData = {
        lineId: 'test_line_id',
        name: 'Test LINE User',
        avatar: 'https://example.com/line_avatar.jpg',
        provider: 'line'
      };
      
      const user = new User(userData);
      await user.save();
      
      const savedUser = await User.findOne({ lineId: 'test_line_id' });
      expect(savedUser).toBeTruthy();
      expect(savedUser.provider).toBe('line');
    });
  });
});
```

### 3. 端對端測試

```javascript
// tests/e2e/oauth.e2e.test.js
const puppeteer = require('puppeteer');

describe('OAuth E2E 測試', () => {
  let browser;
  let page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox']
    });
    page = await browser.newPage();
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  test('Google OAuth 完整流程', async () => {
    // 訪問首頁
    await page.goto('http://localhost:3000');
    
    // 點擊登入按鈕
    await page.click('#login-btn');
    
    // 等待登入 modal 出現
    await page.waitForSelector('.login-modal');
    
    // 點擊 Google 登入
    await page.click('.google-btn');
    
    // 等待重導向到 Google（這裡實際測試中需要 mock）
    await page.waitForNavigation();
    
    // 檢查是否重導向到 Google OAuth 頁面
    expect(page.url()).toContain('accounts.google.com');
  });
});
```

---

## 正式環境部署

### 1. 環境變數設定

```bash
# production.env
NODE_ENV=production
GOOGLE_CLIENT_ID=your_production_google_client_id
GOOGLE_CLIENT_SECRET=your_production_google_client_secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
LINE_CHANNEL_ID=your_production_line_channel_id
LINE_CHANNEL_SECRET=your_production_line_channel_secret
LINE_CALLBACK_URL=https://yourdomain.com/auth/line/callback
SESSION_SECRET=your_secure_session_secret
JWT_SECRET=your_secure_jwt_secret
MONGODB_URI=mongodb://your_production_mongo_url
```

### 2. HTTPS 設定

#### Nginx 設定
```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # 安全標頭
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Docker 部署設定

```dockerfile
# Dockerfile.production
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# 建立非 root 使用者
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.production.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - production.env
    depends_on:
      - mongodb
      
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      
volumes:
  mongodb_data:
```

### 4. 部署檢查清單

#### 部署前檢查
- [ ] 所有環境變數已設定
- [ ] HTTPS 憑證已安裝
- [ ] 資料庫連線正常
- [ ] OAuth 回調 URL 已更新為正式域名
- [ ] 安全性標頭已設定

#### 部署後檢查
- [ ] OAuth 流程正常運作
- [ ] 使用者可以成功登入
- [ ] 認證狀態正確保持
- [ ] 日誌記錄正常
- [ ] 錯誤處理正確

---

## 監控和日誌

### 1. 日誌設定

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
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/oauth.log',
      level: 'info'
    })
  ]
});

// 在 OAuth 控制器中使用
logger.info('OAuth 登入嘗試', { 
  provider: 'google', 
  userId: user.id 
});
```

### 2. 效能監控

```javascript
// src/middleware/monitoring.middleware.js
const monitorOAuth = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    if (req.path.includes('/auth/')) {
      console.log(`OAuth 請求: ${req.method} ${req.path} - ${duration}ms`);
      
      // 記錄到監控系統
      if (process.env.NODE_ENV === 'production') {
        // 發送到 monitoring service
      }
    }
  });
  
  next();
};
```

### 3. 健康檢查端點

```javascript
// src/routes/health.js
const express = require('express');
const router = express.Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {}
  };
  
  try {
    // 檢查資料庫連線
    await mongoose.connection.db.admin().ping();
    health.services.database = 'healthy';
  } catch (error) {
    health.services.database = 'unhealthy';
    health.status = 'unhealthy';
  }
  
  // 檢查 OAuth 服務
  health.services.oauth = {
    google: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'not configured',
    line: process.env.LINE_CHANNEL_ID ? 'configured' : 'not configured'
  };
  
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

module.exports = router;
```

---

## 故障排除快速指南

### 1. 常見錯誤快速診斷

#### Google OAuth 錯誤
```bash
# 檢查 Google OAuth 設定
curl -v "https://accounts.google.com/o/oauth2/auth?client_id=${GOOGLE_CLIENT_ID}&response_type=code&scope=profile%20email&redirect_uri=${GOOGLE_CALLBACK_URL}"
```

**錯誤診斷表**
| 錯誤代碼 | 可能原因 | 解決方案 |
|---------|---------|----------|
| invalid_client | Client ID 錯誤 | 檢查環境變數和 Google Console |
| redirect_uri_mismatch | 回調 URL 不匹配 | 更新 Google Console 設定 |
| access_denied | 使用者拒絕授權 | 檢查 OAuth 同意畫面設定 |

#### LINE OAuth 錯誤
```bash
# 檢查 LINE OAuth 設定
curl -v "https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${LINE_CHANNEL_ID}&redirect_uri=${LINE_CALLBACK_URL}&state=test&scope=profile"
```

**錯誤診斷表**
| 錯誤代碼 | 可能原因 | 解決方案 |
|---------|---------|----------|
| invalid_request | 參數錯誤 | 檢查請求格式和參數 |
| unauthorized_client | Channel 設定問題 | 檢查 LINE Developers Console |
| invalid_scope | Scope 錯誤 | 確認申請的權限 |

### 2. 除錯腳本

```bash
#!/bin/bash
# scripts/debug-oauth.sh

echo "🔧 OAuth 除錯開始..."

# 檢查環境變數
echo "1. 環境變數檢查:"
env | grep -E "(GOOGLE|LINE)_"

# 檢查服務狀態
echo "2. 服務狀態檢查:"
pm2 list

# 檢查日誌
echo "3. 錯誤日誌:"
tail -n 10 logs/error.log

# 檢查資料庫連線
echo "4. 資料庫連線:"
mongosh --eval "db.adminCommand('ping')"

# 測試 OAuth 端點
echo "5. OAuth 端點測試:"
curl -I http://localhost:3000/auth/google
curl -I http://localhost:3000/auth/line

echo "✅ 除錯完成"
```

### 3. 緊急復原程序

```bash
#!/bin/bash
# scripts/emergency-recovery.sh

echo "🚨 緊急復原程序啟動..."

# 停止服務
pm2 stop all

# 恢復備份設定
cp backup/.env.backup .env

# 重新啟動服務
pm2 restart all

# 檢查服務狀態
pm2 list

# 驗證基本功能
curl http://localhost:3000/api/health

echo "✅ 緊急復原完成"
```

---

## 總結

本指南提供了完整的 OAuth 2.0 測試和部署流程，包括：

1. **完整的檢查清單**確保設定正確
2. **自動化測試**驗證功能正常
3. **正式環境部署**安全可靠的部署流程
4. **監控和日誌**追蹤系統狀態
5. **故障排除**快速診斷和修復問題

請按照這份指南逐步進行測試和部署，確保 NexusTrade 專案的 OAuth 認證系統穩定可靠。

---

*最後更新：2025-01-26*
*版本：1.0* 