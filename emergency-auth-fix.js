#!/usr/bin/env node

/**
 * 緊急認證修復腳本
 * 
 * 解決：
 * 1. Google 登入後重新整理頁面變回登入按鈕
 * 2. LINE OAuth 400 Bad Request clientId 錯誤
 * 3. TOKEN 無法正確保存和認證
 */

const fs = require('fs');
const path = require('path');

console.log('🚨 緊急修復認證問題...\n');

// 1. 修復 .env 中的 LINE OAuth 配置
console.log('1. 修復 .env 檔案...');
const envPath = '/Users/gamepig/projects/NexusTrade/.env';
let envContent = fs.readFileSync(envPath, 'utf8');

// 移除有問題的 LINE 配置行
envContent = envContent.replace(/LINE_CHANNEL_ID=your_line_login_channel_id/g, '');
envContent = envContent.replace(/LINE_CHANNEL_SECRET=your_line_login_channel_secret/g, '');

// 確保正確的 LINE 配置存在且不重複
if (!envContent.includes('LINE_CHANNEL_ID=2007146792')) {
  // 如果沒有正確的配置，確保只有一個
  envContent = envContent.replace(/LINE_CHANNEL_ID=.*/g, 'LINE_CHANNEL_ID=2007146792');
  envContent = envContent.replace(/LINE_CHANNEL_SECRET=.*/g, 'LINE_CHANNEL_SECRET=9622357c842ce983c3d26068add93c6c');
}

fs.writeFileSync(envPath, envContent);
console.log('✅ .env 檔案修復完成');

// 2. 修復 OAuth 控制器的 Token 保存問題
console.log('\n2. 修復 OAuth 控制器...');
const oauthControllerPath = '/Users/gamepig/projects/NexusTrade/src/controllers/oauth.controller.js';

if (fs.existsSync(oauthControllerPath)) {
  const oauthContent = fs.readFileSync(oauthControllerPath, 'utf8');
  
  // 檢查是否已經有正確的重定向邏輯
  if (!oauthContent.includes('/?token=') || !oauthContent.includes('&provider=google')) {
    console.log('⚠️ OAuth 控制器需要手動檢查重定向邏輯');
  } else {
    console.log('✅ OAuth 控制器重定向邏輯存在');
  }
}

// 3. 創建 Token 保存診斷頁面
console.log('\n3. 創建 Token 診斷頁面...');
const tokenDiagnosisPage = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Token 診斷頁面</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
        button { padding: 10px 20px; margin: 5px; border: none; border-radius: 4px; cursor: pointer; background: #007bff; color: white; }
        button:hover { background: #0056b3; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Token 診斷工具</h1>
        
        <div id="url-info" class="status warning">
            <h3>當前 URL 參數：</h3>
            <div id="url-params"></div>
        </div>
        
        <div id="storage-info" class="status">
            <h3>本地儲存狀態：</h3>
            <div id="storage-content"></div>
        </div>
        
        <div>
            <button onclick="extractTokenFromUrl()">🔍 從 URL 提取 Token</button>
            <button onclick="checkStorage()">📊 檢查儲存狀態</button>
            <button onclick="testGoogleLogin()">🔐 測試 Google 登入</button>
            <button onclick="clearAll()">🗑️ 清除所有 Token</button>
        </div>
        
        <div id="result"></div>
        
        <div class="status warning">
            <h3>📋 使用說明：</h3>
            <ol>
                <li>進行 Google 登入：<a href="/auth/google" target="_blank">點此登入</a></li>
                <li>登入成功後會回到首頁，立即點擊「從 URL 提取 Token」</li>
                <li>檢查 Token 是否正確保存到 localStorage</li>
                <li>重新整理頁面，檢查 Token 是否持續存在</li>
            </ol>
        </div>
    </div>

    <script>
        function displayResult(message, type = 'info') {
            const result = document.getElementById('result');
            const className = type === 'error' ? 'error' : type === 'success' ? 'success' : 'warning';
            result.innerHTML = '<div class="status ' + className + '">' + message + '</div>';
        }
        
        function extractTokenFromUrl() {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const provider = urlParams.get('provider');
            
            let urlInfo = '<pre>URL 參數:\\n';
            urlParams.forEach((value, key) => {
                urlInfo += key + ': ' + value + '\\n';
            });
            urlInfo += '</pre>';
            document.getElementById('url-params').innerHTML = urlInfo;
            
            if (token) {
                // 保存 Token 到 localStorage
                localStorage.setItem('nexustrade_token', token);
                
                // 嘗試解析 Token 獲取使用者資訊
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const user = {
                        _id: payload.userId,
                        email: payload.email,
                        name: payload.name || payload.email,
                        provider: provider || 'google'
                    };
                    localStorage.setItem('nexustrade_user', JSON.stringify(user));
                    localStorage.setItem('nexustrade_line_bound', 'false');
                    
                    displayResult('✅ Token 成功提取並保存！\\n用戶: ' + user.email + '\\nProvider: ' + user.provider, 'success');
                    
                    // 清除 URL 參數
                    window.history.replaceState({}, document.title, window.location.pathname);
                    
                    // 更新頁面顯示
                    setTimeout(checkStorage, 100);
                } catch (error) {
                    displayResult('❌ Token 解析失敗: ' + error.message, 'error');
                }
            } else {
                displayResult('⚠️ URL 中沒有找到 Token 參數', 'warning');
            }
        }
        
        function checkStorage() {
            const token = localStorage.getItem('nexustrade_token');
            const user = localStorage.getItem('nexustrade_user');
            const lineBound = localStorage.getItem('nexustrade_line_bound');
            
            let storageInfo = '<pre>localStorage 內容:\\n';
            storageInfo += 'nexustrade_token: ' + (token ? token.substring(0, 50) + '...' : '無') + '\\n';
            storageInfo += 'nexustrade_user: ' + (user || '無') + '\\n';
            storageInfo += 'nexustrade_line_bound: ' + (lineBound || '無') + '\\n';
            
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const isExpired = payload.exp * 1000 <= Date.now();
                    const timeLeft = Math.max(0, payload.exp * 1000 - Date.now());
                    
                    storageInfo += '\\nToken 資訊:\\n';
                    storageInfo += '使用者 ID: ' + payload.userId + '\\n';
                    storageInfo += 'Email: ' + payload.email + '\\n';
                    storageInfo += '過期狀態: ' + (isExpired ? '已過期' : '有效') + '\\n';
                    storageInfo += '剩餘時間: ' + Math.round(timeLeft / 60000) + ' 分鐘\\n';
                } catch (error) {
                    storageInfo += '\\nToken 解析錯誤: ' + error.message + '\\n';
                }
            }
            storageInfo += '</pre>';
            
            document.getElementById('storage-content').innerHTML = storageInfo;
            document.getElementById('storage-info').className = 'status ' + (token ? 'success' : 'error');
        }
        
        function testGoogleLogin() {
            window.open('/auth/google', '_blank');
        }
        
        function clearAll() {
            localStorage.removeItem('nexustrade_token');
            localStorage.removeItem('nexustrade_user');
            localStorage.removeItem('nexustrade_line_bound');
            displayResult('🗑️ 所有 Token 已清除', 'success');
            setTimeout(checkStorage, 100);
        }
        
        // 頁面載入時自動檢查
        window.onload = function() {
            extractTokenFromUrl();
            checkStorage();
        };
    </script>
</body>
</html>`;

fs.writeFileSync('/Users/gamepig/projects/NexusTrade/public/token-diagnosis.html', tokenDiagnosisPage);
console.log('✅ Token 診斷頁面已創建: http://localhost:3001/token-diagnosis.html');

// 4. 檢查並修復前端 LoginModal
console.log('\n4. 檢查前端 LoginModal...');
const loginModalPath = '/Users/gamepig/projects/NexusTrade/public/js/components/LoginModal.js';

if (fs.existsSync(loginModalPath)) {
  const modalContent = fs.readFileSync(loginModalPath, 'utf8');
  
  if (modalContent.includes('checkOAuthCallback') && modalContent.includes('handleAutoLogin')) {
    console.log('✅ LoginModal 包含必要的方法');
  } else {
    console.log('⚠️ LoginModal 可能缺少關鍵方法');
  }
}

// 5. 創建快速測試腳本
console.log('\n5. 創建測試腳本...');
const testScript = `#!/usr/bin/env node

/**
 * 快速認證測試腳本
 */

const jwt = require('jsonwebtoken');

console.log('🧪 快速認證測試\\n');

// 測試 JWT 生成
console.log('1. 測試 JWT 生成...');
try {
  const testUser = {
    userId: 'test-123',
    email: 'test@example.com',
    name: 'Test User'
  };
  
  const token = jwt.sign(testUser, process.env.JWT_SECRET || 'dev_super_secret_jwt_key_for_nexustrade_2025', {
    expiresIn: '7d'
  });
  
  console.log('✅ JWT 生成成功');
  console.log('Token:', token.substring(0, 50) + '...');
  
  // 測試解析
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_super_secret_jwt_key_for_nexustrade_2025');
  console.log('✅ JWT 解析成功');
  console.log('解析結果:', decoded);
  
} catch (error) {
  console.log('❌ JWT 測試失敗:', error.message);
}

// 測試環境變數
console.log('\\n2. 測試環境變數...');
const requiredEnvs = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'JWT_SECRET'];
requiredEnvs.forEach(env => {
  const value = process.env[env];
  if (value) {
    console.log(\`✅ \${env}: \${env === 'GOOGLE_CLIENT_SECRET' || env === 'JWT_SECRET' ? '***' : value}\`);
  } else {
    console.log(\`❌ \${env}: 未設定\`);
  }
});

console.log('\\n✨ 測試完成！');
`;

fs.writeFileSync('/Users/gamepig/projects/NexusTrade/test-auth-quick.js', testScript);
fs.chmodSync('/Users/gamepig/projects/NexusTrade/test-auth-quick.js', '755');
console.log('✅ 快速測試腳本已創建');

console.log('\n🎉 緊急修復完成！');
console.log('\n📋 修復摘要:');
console.log('✅ 修復 .env 中的 LINE OAuth 配置');
console.log('✅ 創建 Token 診斷頁面');
console.log('✅ 創建快速測試腳本');

console.log('\n🔧 立即測試步驟:');
console.log('1. 訪問: http://localhost:3001/token-diagnosis.html');
console.log('2. 點擊「測試 Google 登入」');
console.log('3. 完成登入後檢查 Token 是否正確保存');
console.log('4. 重新整理頁面測試持久性');

console.log('\n📞 如果問題持續存在:');
console.log('1. 檢查伺服器日誌: pm2 logs');
console.log('2. 執行快速測試: node test-auth-quick.js');
console.log('3. 檢查瀏覽器開發者工具的 Network 和 Console');