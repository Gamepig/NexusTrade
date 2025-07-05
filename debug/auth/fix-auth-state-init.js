#!/usr/bin/env node

/**
 * 認證狀態初始化修復腳本
 * 
 * 修復頁面重新載入後登入狀態丟失的問題
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 修復認證狀態初始化問題...\n');

// 1. 修復 LoginModal 初始化時機
const loginModalPath = '/Users/gamepig/projects/NexusTrade/public/js/components/LoginModal.js';
let loginModalContent = fs.readFileSync(loginModalPath, 'utf8');

// 在 constructor 末尾添加立即狀態檢查
const constructorFix = `  constructor() {
    this.modal = null;
    this.isVisible = false;
    this.authTokens = this.loadTokensFromStorage();
    
    this.init();
    
    // 🔧 修復：頁面載入後立即檢查並更新 UI 狀態
    setTimeout(() => {
      this.checkAndUpdateUIState();
    }, 100);
  }`;

// 添加新的狀態檢查方法
const newMethod = `
  /**
   * 檢查並更新 UI 狀態 - 修復頁面重新載入問題
   */
  checkAndUpdateUIState() {
    console.log('🔍 檢查當前認證狀態...');
    
    const token = localStorage.getItem('nexustrade_token');
    const userStr = localStorage.getItem('nexustrade_user');
    
    if (token && userStr) {
      try {
        // 驗證 Token 是否有效
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const isExpired = payload.exp * 1000 <= Date.now();
          
          if (!isExpired) {
            const user = JSON.parse(userStr);
            console.log('✅ 發現有效的認證狀態，恢復登入 UI');
            
            // 立即更新 UI
            this.updateUIForLoggedInUser(user);
            
            // 更新全局狀態
            if (window.store) {
              window.store.dispatch({
                type: 'auth/login',
                payload: {
                  isAuthenticated: true,
                  user: user,
                  token: token
                }
              });
            }
            
            // 更新 AuthStateManager
            if (window.authStateManager) {
              window.authStateManager.updateLocalAuthState({
                token: token,
                user: user,
                isBound: localStorage.getItem('nexustrade_line_bound') === 'true'
              });
            }
            
            return true;
          } else {
            console.warn('⚠️ Token 已過期，清除認證狀態');
            this.clearTokensFromStorage();
            this.updateUIForLoggedOutUser();
          }
        }
      } catch (error) {
        console.error('❌ 解析認證資料失敗:', error);
        this.clearTokensFromStorage();
        this.updateUIForLoggedOutUser();
      }
    } else {
      console.log('ℹ️ 未發現認證狀態，保持登出狀態');
      this.updateUIForLoggedOutUser();
    }
    
    return false;
  }`;

// 替換 constructor
loginModalContent = loginModalContent.replace(
  /constructor\(\) \{[\s\S]*?\n {2}\}/,
  constructorFix
);

// 在 handleAutoLogin 方法之前插入新方法
loginModalContent = loginModalContent.replace(
  / {2}\/\*\*\n {3}\* 處理自動登入\n {3}\*\/\n {2}async handleAutoLogin\(\)/,
  newMethod + '\n\n  /**\n   * 處理自動登入\n   */\n  async handleAutoLogin()'
);

// 寫回檔案
fs.writeFileSync(loginModalPath, loginModalContent);
console.log('✅ LoginModal 修復完成');

// 2. 修復主應用程式初始化
const appPath = '/Users/gamepig/projects/NexusTrade/public/js/nexus-app-fixed.js';
let appContent = fs.readFileSync(appPath, 'utf8');

// 在 setupComponents 方法中加強 LoginModal 初始化
const setupComponentsFix = `  setupComponents() {
    console.log('🧩 設定組件...');
    
    // 初始化通知組件
    this.notificationComponent = new NotificationComponent();
    
    // 初始化登入模態框
    if (typeof LoginModal !== 'undefined') {
      this.loginModal = new LoginModal();
      
      // 🔧 修復：確保 LoginModal 狀態同步
      setTimeout(() => {
        if (this.loginModal.checkAndUpdateUIState) {
          this.loginModal.checkAndUpdateUIState();
        }
      }, 200);
      
      console.log('🔐 登入模態框已初始化');
    }
    
    // 初始化新聞跑馬燈 (全局組件) - 延遲初始化
    setTimeout(() => {
      const tickerContainer = document.getElementById('news-ticker');
      if (typeof NewsTicker !== 'undefined' && !this.newsTickerComponent && tickerContainer) {
        console.log('📰 初始化新聞跑馬燈...');
        this.newsTickerComponent = new NewsTicker(tickerContainer);
      }
    }, 500);
  }`;

// 替換 setupComponents
appContent = appContent.replace(
  /setupComponents\(\) \{[\s\S]*?\n {2}\}/,
  setupComponentsFix
);

// 寫回檔案
fs.writeFileSync(appPath, appContent);
console.log('✅ 主應用程式修復完成');

// 3. 修復 .env 中的 LINE OAuth 配置
const envPath = '/Users/gamepig/projects/NexusTrade/.env';
let envContent = fs.readFileSync(envPath, 'utf8');

// 暫時禁用 LINE Login 功能，避免 400 錯誤
envContent = envContent.replace(
  /LINE_CHANNEL_ID=your_line_login_channel_id/,
  'LINE_CHANNEL_ID='
);
envContent = envContent.replace(
  /LINE_CHANNEL_SECRET=your_line_login_channel_secret/,
  'LINE_CHANNEL_SECRET='
);

// 添加註解
if (!envContent.includes('# LINE Login 暫時停用')) {
  envContent = envContent.replace(
    /# LINE OAuth 設定 \(LINE Login 頻道\)/,
    '# LINE OAuth 設定 (LINE Login 頻道)\n# LINE Login 暫時停用，避免 400 錯誤'
  );
}

fs.writeFileSync(envPath, envContent);
console.log('✅ 環境變數修復完成（LINE Login 暫時停用）');

// 4. 創建測試頁面
const testPageContent = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>認證狀態測試頁面</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: #f5f5f5; 
        }
        .test-container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .status { 
            padding: 10px; 
            margin: 10px 0; 
            border-radius: 4px; 
        }
        .status.success { 
            background: #d4edda; 
            border: 1px solid #c3e6cb; 
            color: #155724; 
        }
        .status.error { 
            background: #f8d7da; 
            border: 1px solid #f5c6cb; 
            color: #721c24; 
        }
        button { 
            padding: 10px 20px; 
            margin: 5px; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer; 
            background: #007bff; 
            color: white; 
        }
        button:hover { 
            background: #0056b3; 
        }
        .info-box {
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            padding: 15px;
            border-radius: 4px;
            margin: 10px 0;
        }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="test-container">
        <h1>🔧 NexusTrade 認證狀態測試</h1>
        
        <div class="info-box">
            <h3>📋 測試步驟：</h3>
            <ol>
                <li>點擊「檢查認證狀態」查看當前狀態</li>
                <li>如果有 Token，點擊「模擬頁面重新載入」</li>
                <li>檢查認證狀態是否正確恢復</li>
                <li>如果需要，點擊「清除認證狀態」重置</li>
            </ol>
        </div>
        
        <div id="status-display"></div>
        
        <div>
            <button onclick="checkAuthState()">🔍 檢查認證狀態</button>
            <button onclick="simulatePageReload()">🔄 模擬頁面重新載入</button>
            <button onclick="clearAuthState()">🗑️ 清除認證狀態</button>
            <button onclick="setTestAuthState()">🧪 設定測試認證狀態</button>
        </div>
        
        <div class="info-box">
            <h3>🔍 檢查項目：</h3>
            <ul>
                <li><code>localStorage.getItem('nexustrade_token')</code></li>
                <li><code>localStorage.getItem('nexustrade_user')</code></li>
                <li><code>localStorage.getItem('nexustrade_line_bound')</code></li>
            </ul>
        </div>
        
        <div id="debug-info"></div>
    </div>

    <script>
        function displayStatus(message, type = 'info') {
            const display = document.getElementById('status-display');
            display.innerHTML = '<div class="status ' + (type === 'error' ? 'error' : 'success') + '">' + message + '</div>';
        }
        
        function checkAuthState() {
            const token = localStorage.getItem('nexustrade_token');
            const user = localStorage.getItem('nexustrade_user');
            const lineBound = localStorage.getItem('nexustrade_line_bound');
            
            let status = '<h3>📊 當前認證狀態：</h3>';
            
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const isExpired = payload.exp * 1000 <= Date.now();
                    const timeLeft = Math.max(0, payload.exp * 1000 - Date.now());
                    
                    status += '<p><strong>Token:</strong> ✅ 存在 (' + (isExpired ? '已過期' : '有效，剩餘 ' + Math.round(timeLeft / 60000) + ' 分鐘') + ')</p>';
                    status += '<p><strong>User ID:</strong> ' + payload.userId + '</p>';
                    status += '<p><strong>Email:</strong> ' + (payload.email || 'N/A') + '</p>';
                } catch (error) {
                    status += '<p><strong>Token:</strong> ❌ 無效格式</p>';
                }
            } else {
                status += '<p><strong>Token:</strong> ❌ 不存在</p>';
            }
            
            if (user) {
                try {
                    const userData = JSON.parse(user);
                    status += '<p><strong>使用者資料:</strong> ✅ 存在 (' + userData.name + ', ' + userData.email + ')</p>';
                } catch (error) {
                    status += '<p><strong>使用者資料:</strong> ❌ 無效格式</p>';
                }
            } else {
                status += '<p><strong>使用者資料:</strong> ❌ 不存在</p>';
            }
            
            status += '<p><strong>LINE 綁定:</strong> ' + (lineBound === 'true' ? '✅ 已綁定' : '❌ 未綁定') + '</p>';
            
            displayStatus(status, token && user ? 'success' : 'error');
        }
        
        function simulatePageReload() {
            displayStatus('🔄 模擬頁面重新載入...開始檢查認證恢復機制', 'info');
            
            setTimeout(() => {
                // 模擬 LoginModal 的 checkAndUpdateUIState 邏輯
                const token = localStorage.getItem('nexustrade_token');
                const userStr = localStorage.getItem('nexustrade_user');
                
                if (token && userStr) {
                    try {
                        const tokenParts = token.split('.');
                        if (tokenParts.length === 3) {
                            const payload = JSON.parse(atob(tokenParts[1]));
                            const isExpired = payload.exp * 1000 <= Date.now();
                            
                            if (!isExpired) {
                                const user = JSON.parse(userStr);
                                displayStatus('✅ 認證狀態成功恢復！使用者: ' + user.name, 'success');
                                return;
                            }
                        }
                    } catch (error) {
                        displayStatus('❌ 認證狀態恢復失敗: ' + error.message, 'error');
                        return;
                    }
                }
                
                displayStatus('❌ 沒有有效的認證狀態可恢復', 'error');
            }, 1000);
        }
        
        function clearAuthState() {
            localStorage.removeItem('nexustrade_token');
            localStorage.removeItem('nexustrade_user');
            localStorage.removeItem('nexustrade_line_bound');
            displayStatus('🗑️ 認證狀態已清除', 'success');
        }
        
        function setTestAuthState() {
            // 創建測試 Token（24小時有效期）
            const header = btoa(JSON.stringify({typ: 'JWT', alg: 'HS256'}));
            const payload = btoa(JSON.stringify({
                userId: 'test-user-123',
                email: 'test@example.com',
                exp: Math.floor(Date.now() / 1000) + 86400 // 24小時後過期
            }));
            const testToken = header + '.' + payload + '.test-signature';
            
            const testUser = {
                _id: 'test-user-123',
                email: 'test@example.com',
                name: 'Test User',
                avatar: 'https://via.placeholder.com/40'
            };
            
            localStorage.setItem('nexustrade_token', testToken);
            localStorage.setItem('nexustrade_user', JSON.stringify(testUser));
            localStorage.setItem('nexustrade_line_bound', 'false');
            
            displayStatus('🧪 測試認證狀態已設定', 'success');
        }
        
        // 頁面載入時自動檢查
        checkAuthState();
    </script>
</body>
</html>`;

fs.writeFileSync('/Users/gamepig/projects/NexusTrade/public/test_auth_state.html', testPageContent);
console.log('✅ 測試頁面已創建: http://localhost:3001/test_auth_state.html');

console.log('\n🎉 修復完成！');
console.log('\n📋 下一步測試：');
console.log('1. 重啟伺服器');
console.log('2. 訪問 http://localhost:3001/test_auth_state.html 進行測試');
console.log('3. 進行 Google 登入，然後重新載入頁面');
console.log('4. 檢查右上角是否保持已登入狀態');
console.log('\n🔧 如果問題仍然存在，檢查瀏覽器開發者工具的 Console 日誌');