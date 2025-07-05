#!/usr/bin/env node

/**
 * 認證流程診斷腳本
 * 
 * 診斷整個 Google OAuth 流程的每個步驟
 */

import fs from 'fs';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

console.log('🔍 開始診斷認證流程...\n');

// 1. 檢查環境變數
console.log('1. 檢查環境變數:');
dotenv.config();

const requiredEnvs = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET', 
  'GOOGLE_CALLBACK_URL',
  'JWT_SECRET'
];

let envOK = true;
requiredEnvs.forEach(env => {
  const value = process.env[env];
  if (value) {
    console.log(`✅ ${env}: ${env.includes('SECRET') ? '***' : value}`);
  } else {
    console.log(`❌ ${env}: 未設定`);
    envOK = false;
  }
});

if (!envOK) {
  console.log('\n❌ 環境變數設定不完整，請檢查 .env 檔案');
  process.exit(1);
}

// 2. 測試 JWT 生成
console.log('\n2. 測試 JWT 生成:');
try {
  const testUser = {
    _id: 'test-user-123',
    email: 'test@example.com'
  };
  
  const token = jwt.sign({
    userId: testUser._id,
    email: testUser.email
  }, process.env.JWT_SECRET, { expiresIn: '7d' });
  
  console.log('✅ JWT 生成成功');
  console.log(`   Token: ${token.substring(0, 50)}...`);
  
  // 測試解析
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('✅ JWT 解析成功');
  console.log(`   User ID: ${decoded.userId}`);
  console.log(`   Email: ${decoded.email}`);
  console.log(`   過期時間: ${new Date(decoded.exp * 1000).toLocaleString()}`);
  
} catch (error) {
  console.log('❌ JWT 測試失敗:', error.message);
}

// 3. 檢查伺服器狀態
console.log('\n3. 檢查伺服器狀態:');

async function checkServerStatus() {
  try {
    // 檢查 API 伺服器
    const apiResponse = await fetch('http://localhost:3000/health', {
      timeout: 5000
    }).catch(() => null);
    
    if (apiResponse && apiResponse.ok) {
      console.log('✅ API 伺服器 (port 3000) 正常運行');
    } else {
      console.log('❌ API 伺服器 (port 3000) 無回應');
    }
    
    // 檢查靜態伺服器
    const staticResponse = await fetch('http://localhost:3001/', {
      timeout: 5000
    }).catch(() => null);
    
    if (staticResponse && staticResponse.ok) {
      console.log('✅ 靜態伺服器 (port 3001) 正常運行');
    } else {
      console.log('❌ 靜態伺服器 (port 3001) 無回應');
    }
    
  } catch (error) {
    console.log('❌ 伺服器檢查失敗:', error.message);
  }
}

// 4. 檢查關鍵檔案
console.log('\n4. 檢查關鍵檔案:');

const criticalFiles = [
  '/Users/gamepig/projects/NexusTrade/src/controllers/oauth.controller.js',
  '/Users/gamepig/projects/NexusTrade/public/js/components/LoginModal.js',
  '/Users/gamepig/projects/NexusTrade/src/utils/jwt.js',
  '/Users/gamepig/projects/NexusTrade/src/routes/auth.js'
];

criticalFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${filePath.split('/').pop()}: ${Math.round(stats.size / 1024)}KB`);
  } else {
    console.log(`❌ ${filePath.split('/').pop()}: 檔案不存在`);
  }
});

// 5. 創建測試頁面
console.log('\n5. 創建詳細測試頁面...');

const detailedTestPage = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>詳細認證流程測試</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f0f2f5; }
        .container { max-width: 1000px; margin: 0 auto; }
        .test-section { background: white; margin: 20px 0; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
        .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
        button { padding: 12px 24px; margin: 8px; border: none; border-radius: 4px; cursor: pointer; background: #007bff; color: white; font-size: 14px; }
        button:hover { background: #0056b3; }
        button.secondary { background: #6c757d; }
        button.success { background: #28a745; }
        button.danger { background: #dc3545; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
        .step { border-left: 4px solid #007bff; padding-left: 15px; margin: 15px 0; }
        .progress { background: #e9ecef; border-radius: 4px; height: 20px; margin: 10px 0; }
        .progress-bar { background: #007bff; height: 100%; border-radius: 4px; transition: width 0.3s; }
        .log { max-height: 300px; overflow-y: auto; background: #1e1e1e; color: #00ff00; padding: 15px; border-radius: 4px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 詳細認證流程測試</h1>
        
        <div class="test-section">
            <h2>📊 當前狀態</h2>
            <div id="current-status"></div>
            <button onclick="checkCurrentStatus()">🔄 重新檢查狀態</button>
        </div>
        
        <div class="test-section">
            <h2>🧪 認證流程測試</h2>
            <div class="step">
                <h3>步驟 1: 初始化測試</h3>
                <button onclick="initializeTest()">🚀 開始測試</button>
                <div id="init-status"></div>
            </div>
            
            <div class="step">
                <h3>步驟 2: Google OAuth 登入</h3>
                <button onclick="testGoogleLogin()">🔐 測試 Google 登入</button>
                <button onclick="openAuthPage()" class="secondary">🌐 在新視窗中測試</button>
                <div id="google-status"></div>
            </div>
            
            <div class="step">
                <h3>步驟 3: Token 處理</h3>
                <button onclick="extractAndProcessToken()">⚡ 處理 URL 中的 Token</button>
                <button onclick="manualTokenTest()" class="secondary">🧪 手動 Token 測試</button>
                <div id="token-status"></div>
            </div>
            
            <div class="step">
                <h3>步驟 4: 持久性測試</h3>
                <button onclick="testPersistence()">🔄 測試頁面重新載入</button>
                <button onclick="simulateReload()" class="secondary">🎭 模擬重新載入</button>
                <div id="persistence-status"></div>
            </div>
        </div>
        
        <div class="test-section">
            <h2>📈 測試進度</h2>
            <div class="progress">
                <div id="progress-bar" class="progress-bar" style="width: 0%"></div>
            </div>
            <div id="progress-text">準備開始測試...</div>
        </div>
        
        <div class="test-section">
            <h2>📝 即時日誌</h2>
            <div id="log" class="log"></div>
            <button onclick="clearLog()" class="danger">🗑️ 清除日誌</button>
            <button onclick="exportLog()" class="success">💾 匯出日誌</button>
        </div>
        
        <div class="test-section">
            <h2>🔧 除錯工具</h2>
            <button onclick="inspectLocalStorage()" class="secondary">🔍 檢查本地儲存</button>
            <button onclick="testServerConnection()" class="secondary">🌐 測試伺服器連接</button>
            <button onclick="validateTokenFormat()" class="secondary">✅ 驗證 Token 格式</button>
            <button onclick="clearAllData()" class="danger">🗑️ 清除所有資料</button>
            <div id="debug-info"></div>
        </div>
    </div>

    <script>
        let testProgress = 0;
        let logEntries = [];
        
        function log(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const entry = \`[\${timestamp}] \${message}\`;
            logEntries.push(entry);
            
            const logElement = document.getElementById('log');
            logElement.innerHTML += entry + '\\n';
            logElement.scrollTop = logElement.scrollHeight;
            
            console.log(message);
        }
        
        function updateProgress(percent, text) {
            document.getElementById('progress-bar').style.width = percent + '%';
            document.getElementById('progress-text').textContent = text;
            testProgress = percent;
        }
        
        function displayStatus(elementId, message, type = 'info') {
            const element = document.getElementById(elementId);
            const className = type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info';
            element.innerHTML = '<div class="status ' + className + '">' + message + '</div>';
        }
        
        function checkCurrentStatus() {
            log('🔍 檢查當前認證狀態');
            
            const token = localStorage.getItem('nexustrade_token');
            const user = localStorage.getItem('nexustrade_user');
            const urlParams = new URLSearchParams(window.location.search);
            
            let status = '<h3>📊 當前狀態報告</h3>';
            
            // URL 參數檢查
            status += '<h4>🔗 URL 參數:</h4><pre>';
            if (urlParams.toString()) {
                urlParams.forEach((value, key) => {
                    status += key + ': ' + value + '\\n';
                });
            } else {
                status += '無 URL 參數\\n';
            }
            status += '</pre>';
            
            // localStorage 檢查
            status += '<h4>💾 本地儲存:</h4><pre>';
            status += 'Token: ' + (token ? token.substring(0, 50) + '...' : '無') + '\\n';
            status += 'User: ' + (user || '無') + '\\n';
            
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const isExpired = payload.exp * 1000 <= Date.now();
                    status += '\\nToken 詳情:\\n';
                    status += 'User ID: ' + payload.userId + '\\n';
                    status += 'Email: ' + payload.email + '\\n';
                    status += '過期狀態: ' + (isExpired ? '已過期' : '有效') + '\\n';
                    status += '過期時間: ' + new Date(payload.exp * 1000).toLocaleString() + '\\n';
                } catch (error) {
                    status += 'Token 解析錯誤: ' + error.message + '\\n';
                }
            }
            status += '</pre>';
            
            document.getElementById('current-status').innerHTML = status;
            log('✅ 狀態檢查完成');
        }
        
        function initializeTest() {
            log('🚀 初始化測試');
            clearAllData();
            updateProgress(10, '測試初始化完成');
            displayStatus('init-status', '✅ 測試環境已初始化', 'success');
            log('✅ 測試初始化完成');
        }
        
        function testGoogleLogin() {
            log('🔐 開始 Google OAuth 測試');
            updateProgress(25, '正在進行 Google OAuth...');
            displayStatus('google-status', '⏳ 正在重定向到 Google...', 'info');
            
            // 開啟 Google OAuth
            window.location.href = '/auth/google';
        }
        
        function openAuthPage() {
            log('🌐 在新視窗中開啟 Google OAuth');
            const authWindow = window.open('/auth/google', 'google-auth', 'width=500,height=600');
            
            // 監聽視窗關閉
            const checkClosed = setInterval(() => {
                if (authWindow.closed) {
                    clearInterval(checkClosed);
                    log('🔄 認證視窗已關閉，檢查結果');
                    setTimeout(() => {
                        checkCurrentStatus();
                        extractAndProcessToken();
                    }, 1000);
                }
            }, 1000);
        }
        
        function extractAndProcessToken() {
            log('⚡ 開始處理 Token');
            
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const provider = urlParams.get('provider');
            const oauth = urlParams.get('oauth');
            
            if (oauth === 'success' && token) {
                log('✅ 發現 OAuth 成功回調');
                log('📄 Token: ' + token.substring(0, 50) + '...');
                log('🔧 Provider: ' + provider);
                
                // 保存到 localStorage
                localStorage.setItem('nexustrade_token', token);
                
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const user = {
                        _id: payload.userId,
                        email: payload.email,
                        name: payload.name || payload.email
                    };
                    localStorage.setItem('nexustrade_user', JSON.stringify(user));
                    
                    log('✅ Token 和使用者資料已保存');
                    updateProgress(60, 'Token 處理完成');
                    displayStatus('token-status', '✅ Token 已成功處理並保存', 'success');
                    
                    // 清除 URL 參數
                    window.history.replaceState({}, document.title, window.location.pathname);
                    log('🧹 URL 參數已清理');
                    
                } catch (error) {
                    log('❌ Token 解析失敗: ' + error.message);
                    displayStatus('token-status', '❌ Token 解析失敗: ' + error.message, 'error');
                }
            } else {
                log('⚠️ 未發現有效的 OAuth 回調');
                displayStatus('token-status', '⚠️ 未發現有效的 OAuth 回調，請先進行登入', 'warning');
            }
        }
        
        function manualTokenTest() {
            log('🧪 開始手動 Token 測試');
            
            // 創建測試 Token
            const header = btoa(JSON.stringify({typ: 'JWT', alg: 'HS256'}));
            const payload = btoa(JSON.stringify({
                userId: 'test-user-123',
                email: 'test@example.com',
                name: 'Test User',
                exp: Math.floor(Date.now() / 1000) + 86400 // 24小時後過期
            }));
            const testToken = header + '.' + payload + '.test-signature';
            
            localStorage.setItem('nexustrade_token', testToken);
            localStorage.setItem('nexustrade_user', JSON.stringify({
                _id: 'test-user-123',
                email: 'test@example.com',
                name: 'Test User'
            }));
            
            log('✅ 測試 Token 已創建並保存');
            displayStatus('token-status', '✅ 測試 Token 已創建', 'success');
            updateProgress(50, '測試 Token 已創建');
        }
        
        function testPersistence() {
            log('🔄 測試頁面重新載入');
            updateProgress(80, '測試持久性...');
            
            const beforeReload = {
                token: localStorage.getItem('nexustrade_token'),
                user: localStorage.getItem('nexustrade_user')
            };
            
            if (beforeReload.token) {
                log('💾 重新載入前有 Token: ' + beforeReload.token.substring(0, 30) + '...');
                window.location.reload();
            } else {
                log('⚠️ 重新載入前沒有 Token');
                displayStatus('persistence-status', '⚠️ 沒有 Token 可以測試持久性', 'warning');
            }
        }
        
        function simulateReload() {
            log('🎭 模擬重新載入行為');
            
            const token = localStorage.getItem('nexustrade_token');
            const user = localStorage.getItem('nexustrade_user');
            
            if (token && user) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const isExpired = payload.exp * 1000 <= Date.now();
                    
                    if (!isExpired) {
                        log('✅ 模擬重新載入成功：Token 仍然有效');
                        displayStatus('persistence-status', '✅ 持久性測試通過', 'success');
                        updateProgress(100, '所有測試完成');
                    } else {
                        log('❌ 模擬重新載入失敗：Token 已過期');
                        displayStatus('persistence-status', '❌ Token 已過期', 'error');
                    }
                } catch (error) {
                    log('❌ 模擬重新載入失敗：Token 格式錯誤');
                    displayStatus('persistence-status', '❌ Token 格式錯誤', 'error');
                }
            } else {
                log('❌ 模擬重新載入失敗：沒有 Token');
                displayStatus('persistence-status', '❌ 沒有 Token 可以測試', 'error');
            }
        }
        
        function inspectLocalStorage() {
            log('🔍 檢查本地儲存');
            
            const keys = Object.keys(localStorage);
            let info = '<h4>📦 localStorage 內容:</h4><pre>';
            
            keys.forEach(key => {
                const value = localStorage.getItem(key);
                if (key.includes('nexustrade')) {
                    info += key + ': ' + (value.length > 100 ? value.substring(0, 100) + '...' : value) + '\\n';
                }
            });
            
            info += '</pre>';
            document.getElementById('debug-info').innerHTML = info;
            log('✅ 本地儲存檢查完成');
        }
        
        function testServerConnection() {
            log('🌐 測試伺服器連接');
            
            Promise.all([
                fetch('/health').catch(() => null),
                fetch('http://localhost:3000/health').catch(() => null)
            ]).then(responses => {
                let info = '<h4>🌐 伺服器連接狀態:</h4>';
                
                if (responses[0] && responses[0].ok) {
                    info += '<div class="status success">✅ 相對路徑 API 可用</div>';
                    log('✅ 相對路徑 API 可用');
                } else {
                    info += '<div class="status error">❌ 相對路徑 API 不可用</div>';
                    log('❌ 相對路徑 API 不可用');
                }
                
                if (responses[1] && responses[1].ok) {
                    info += '<div class="status success">✅ localhost:3000 API 可用</div>';
                    log('✅ localhost:3000 API 可用');
                } else {
                    info += '<div class="status error">❌ localhost:3000 API 不可用</div>';
                    log('❌ localhost:3000 API 不可用');
                }
                
                document.getElementById('debug-info').innerHTML = info;
            });
        }
        
        function validateTokenFormat() {
            log('✅ 驗證 Token 格式');
            
            const token = localStorage.getItem('nexustrade_token');
            let info = '<h4>🔍 Token 格式驗證:</h4>';
            
            if (token) {
                const parts = token.split('.');
                if (parts.length === 3) {
                    try {
                        const header = JSON.parse(atob(parts[0]));
                        const payload = JSON.parse(atob(parts[1]));
                        
                        info += '<div class="status success">✅ Token 格式正確 (JWT)</div>';
                        info += '<pre>Header: ' + JSON.stringify(header, null, 2) + '</pre>';
                        info += '<pre>Payload: ' + JSON.stringify(payload, null, 2) + '</pre>';
                        
                        log('✅ Token 格式驗證通過');
                    } catch (error) {
                        info += '<div class="status error">❌ Token 解析失敗: ' + error.message + '</div>';
                        log('❌ Token 解析失敗: ' + error.message);
                    }
                } else {
                    info += '<div class="status error">❌ Token 格式錯誤 (不是標準 JWT)</div>';
                    log('❌ Token 格式錯誤');
                }
            } else {
                info += '<div class="status warning">⚠️ 沒有 Token</div>';
                log('⚠️ 沒有 Token');
            }
            
            document.getElementById('debug-info').innerHTML = info;
        }
        
        function clearLog() {
            logEntries = [];
            document.getElementById('log').innerHTML = '';
            log('🗑️ 日誌已清除');
        }
        
        function exportLog() {
            const logText = logEntries.join('\\n');
            const blob = new Blob([logText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'auth-test-log-' + new Date().toISOString().substring(0,16) + '.txt';
            a.click();
            URL.revokeObjectURL(url);
            log('💾 日誌已匯出');
        }
        
        function clearAllData() {
            localStorage.removeItem('nexustrade_token');
            localStorage.removeItem('nexustrade_user');
            localStorage.removeItem('nexustrade_refresh_token');
            localStorage.removeItem('nexustrade_line_bound');
            log('🗑️ 所有認證資料已清除');
        }
        
        // 頁面載入時自動檢查
        window.onload = function() {
            log('🎬 頁面載入完成，開始自動檢查');
            checkCurrentStatus();
            
            // 如果 URL 中有 OAuth 參數，自動處理
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('oauth') === 'success') {
                log('🔔 檢測到 OAuth 回調，自動處理');
                extractAndProcessToken();
            }
        };
    </script>
</body>
</html>`;

fs.writeFileSync('/Users/gamepig/projects/NexusTrade/public/detailed-auth-test.html', detailedTestPage);
console.log('✅ 詳細測試頁面已創建: http://localhost:3001/detailed-auth-test.html');

// 6. 執行伺服器檢查
await checkServerStatus();

console.log('\n🎉 診斷完成！');
console.log('\n📋 下一步行動:');
console.log('1. 訪問: http://localhost:3001/detailed-auth-test.html');
console.log('2. 按照頁面上的步驟進行完整測試');
console.log('3. 查看即時日誌了解每個步驟的詳細狀況');
console.log('4. 如果發現問題，可以匯出日誌進行分析');

console.log('\n🔧 如果伺服器未運行:');
console.log('1. 啟動 API 伺服器: npm start 或 pm2 start');
console.log('2. 啟動靜態伺服器: serve -s public -p 3001');
console.log('3. 檢查 pm2 狀態: pm2 status');