#!/usr/bin/env node

/**
 * 簡化版認證診斷腳本
 */

const fs = require('fs');

console.log('🔍 開始診斷認證問題...\n');

// 1. 檢查環境變數
console.log('1. 檢查 .env 檔案:');
try {
  require('dotenv').config();
  
  const envContent = fs.readFileSync('/Users/gamepig/projects/NexusTrade/.env', 'utf8');
  
  // 檢查是否有問題的 LINE 配置
  if (envContent.includes('your_line_login_channel_id')) {
    console.log('❌ 發現問題：.env 中仍有預設的 LINE 配置');
    console.log('   修復中...');
    
    // 移除問題配置
    const fixedContent = envContent
      .replace(/LINE_CHANNEL_ID=your_line_login_channel_id/g, '')
      .replace(/LINE_CHANNEL_SECRET=your_line_login_channel_secret/g, '');
    
    fs.writeFileSync('/Users/gamepig/projects/NexusTrade/.env', fixedContent);
    console.log('✅ .env 檔案已修復');
  } else {
    console.log('✅ .env 檔案看起來正常');
  }
  
  // 檢查必要的環境變數
  const requiredVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'JWT_SECRET'];
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: 已設定`);
    } else {
      console.log(`❌ ${varName}: 未設定`);
    }
  });
  
} catch (error) {
  console.log('❌ 讀取 .env 檔案失敗:', error.message);
}

// 2. 測試 JWT 生成
console.log('\n2. 測試 JWT 功能:');
try {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'dev_super_secret_jwt_key_for_nexustrade_2025';
  
  const testToken = jwt.sign({
    userId: 'test-123',
    email: 'test@example.com'
  }, secret, { expiresIn: '1d' });
  
  console.log('✅ JWT 生成成功');
  
  const decoded = jwt.verify(testToken, secret);
  console.log('✅ JWT 驗證成功');
  console.log('   User ID:', decoded.userId);
  
} catch (error) {
  console.log('❌ JWT 測試失敗:', error.message);
}

// 3. 檢查關鍵檔案
console.log('\n3. 檢查關鍵檔案:');
const keyFiles = [
  'src/controllers/oauth.controller.js',
  'public/js/components/LoginModal.js',
  'src/utils/jwt.js'
];

keyFiles.forEach(file => {
  const fullPath = `/Users/gamepig/projects/NexusTrade/${file}`;
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}: 存在`);
  } else {
    console.log(`❌ ${file}: 不存在`);
  }
});

// 4. 創建簡單的測試 HTML
console.log('\n4. 創建簡單測試頁面...');

const simpleTestHTML = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>簡單認證測試</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        .section { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .warning { background: #fff3cd; color: #856404; }
        button { padding: 12px 24px; margin: 8px; border: none; border-radius: 4px; cursor: pointer; background: #007bff; color: white; }
        button:hover { background: #0056b3; }
        pre { background: #e9ecef; padding: 15px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🔧 簡單認證測試</h1>
    
    <div class="section">
        <h2>📋 說明</h2>
        <p>這個頁面用來診斷 Google 登入和 Token 保存問題。</p>
        <ol>
            <li>點擊「Google 登入測試」進行登入</li>
            <li>登入成功後，檢查是否有 Token</li>
            <li>重新整理頁面，檢查 Token 是否仍然存在</li>
        </ol>
    </div>
    
    <div class="section">
        <h2>🔐 認證測試</h2>
        <button onclick="testGoogleLogin()">🔐 Google 登入測試</button>
        <button onclick="checkStatus()">🔍 檢查狀態</button>
        <button onclick="clearAll()">🗑️ 清除所有</button>
        <div id="status"></div>
    </div>
    
    <div class="section">
        <h2>📊 當前狀態</h2>
        <div id="current-info"></div>
    </div>

    <script>
        function log(message, type = 'info') {
            console.log(message);
            const statusDiv = document.getElementById('status');
            const className = type === 'error' ? 'error' : type === 'success' ? 'success' : 'warning';
            statusDiv.innerHTML = '<div class="status ' + className + '">' + message + '</div>';
        }
        
        function testGoogleLogin() {
            log('🔐 正在重定向到 Google 登入...', 'info');
            window.location.href = '/auth/google';
        }
        
        function checkStatus() {
            const token = localStorage.getItem('nexustrade_token');
            const user = localStorage.getItem('nexustrade_user');
            const urlParams = new URLSearchParams(window.location.search);
            
            let info = '<h3>📊 狀態報告</h3>';
            
            // URL 檢查
            if (urlParams.toString()) {
                info += '<h4>🔗 URL 參數:</h4><pre>';
                urlParams.forEach((value, key) => {
                    info += key + ': ' + (key === 'token' ? value.substring(0, 50) + '...' : value) + '\\n';
                });
                info += '</pre>';
                
                // 如果有 token 參數，自動保存
                const urlToken = urlParams.get('token');
                if (urlToken) {
                    localStorage.setItem('nexustrade_token', urlToken);
                    
                    // 嘗試從 URL 構建使用者資料
                    const userEmail = urlParams.get('userEmail');
                    const userName = urlParams.get('userName');
                    if (userEmail || userName) {
                        const userData = {
                            email: userEmail || 'unknown@example.com',
                            name: userName || userEmail || 'Unknown User'
                        };
                        localStorage.setItem('nexustrade_user', JSON.stringify(userData));
                    }
                    
                    log('✅ Token 已從 URL 保存到 localStorage', 'success');
                    
                    // 清除 URL 參數
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            } else {
                info += '<p>🔗 無 URL 參數</p>';
            }
            
            // localStorage 檢查
            info += '<h4>💾 本地儲存:</h4><pre>';
            info += 'Token: ' + (token ? token.substring(0, 50) + '... (長度: ' + token.length + ')' : '無') + '\\n';
            info += 'User: ' + (user || '無') + '\\n';
            
            if (token) {
                try {
                    const parts = token.split('.');
                    if (parts.length === 3) {
                        const payload = JSON.parse(atob(parts[1]));
                        const isExpired = payload.exp * 1000 <= Date.now();
                        info += '\\nToken 詳情:\\n';
                        info += 'User ID: ' + payload.userId + '\\n';
                        info += 'Email: ' + payload.email + '\\n';
                        info += '過期狀態: ' + (isExpired ? '已過期' : '有效') + '\\n';
                        info += '過期時間: ' + new Date(payload.exp * 1000).toLocaleString() + '\\n';
                        
                        if (!isExpired) {
                            log('✅ 發現有效的認證 Token', 'success');
                        } else {
                            log('⚠️ Token 已過期', 'warning');
                        }
                    } else {
                        info += 'Token 格式錯誤\\n';
                        log('❌ Token 格式錯誤', 'error');
                    }
                } catch (error) {
                    info += 'Token 解析錯誤: ' + error.message + '\\n';
                    log('❌ Token 解析錯誤: ' + error.message, 'error');
                }
            } else {
                log('⚠️ 沒有找到 Token', 'warning');
            }
            
            info += '</pre>';
            document.getElementById('current-info').innerHTML = info;
        }
        
        function clearAll() {
            localStorage.removeItem('nexustrade_token');
            localStorage.removeItem('nexustrade_user');
            localStorage.removeItem('nexustrade_refresh_token');
            localStorage.removeItem('nexustrade_line_bound');
            
            log('🗑️ 所有認證資料已清除', 'success');
            setTimeout(checkStatus, 100);
        }
        
        // 頁面載入時自動檢查
        window.onload = function() {
            checkStatus();
        };
    </script>
</body>
</html>`;

fs.writeFileSync('/Users/gamepig/projects/NexusTrade/public/simple-auth-test.html', simpleTestHTML);
console.log('✅ 簡單測試頁面已創建: http://localhost:3001/simple-auth-test.html');

console.log('\n🎉 診斷完成！');
console.log('\n📋 立即測試步驟:');
console.log('1. 確保伺服器運行: pm2 status');
console.log('2. 訪問: http://localhost:3001/simple-auth-test.html');
console.log('3. 點擊「Google 登入測試」');
console.log('4. 完成登入後點擊「檢查狀態」');
console.log('5. 重新整理頁面，再次檢查狀態');

console.log('\n🔧 如果問題仍然存在:');
console.log('1. 檢查瀏覽器開發者工具 Console');
console.log('2. 檢查 Network 標籤看 OAuth 回調請求');
console.log('3. 檢查伺服器日誌: pm2 logs');