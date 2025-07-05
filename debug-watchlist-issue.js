#!/usr/bin/env node

/**
 * NexusTrade 觀察清單功能診斷工具
 * 
 * 檢查：
 * 1. 用戶認證狀態和資料庫記錄
 * 2. 觀察清單 API 端點功能
 * 3. 前端認證狀態管理
 */

const fetch = require('node-fetch');

// 配置
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  testUserId: 'ue5cc188e1d2cdbac5cfda2abb6f6a34b', // Vic Huang 的 LINE ID
  testSymbol: 'BTCUSDT'
};

async function diagnosePriceAlertAndWatchlistIssues() {
  console.log('🔍 開始診斷價格警報和觀察清單問題...\n');

  try {
    // 1. 檢查系統健康狀態
    await checkSystemHealth();
    
    // 2. 檢查用戶認證狀態
    await checkUserAuthentication();
    
    // 3. 檢查觀察清單 API
    await checkWatchlistAPI();
    
    // 4. 檢查價格警報 API
    await checkPriceAlertAPI();
    
    // 5. 生成修復建議
    generateFixRecommendations();
    
  } catch (error) {
    console.error('❌ 診斷過程中發生錯誤:', error);
  }
}

async function checkSystemHealth() {
  console.log('📊 1. 檢查系統健康狀態');
  console.log('=' .repeat(50));
  
  try {
    const response = await fetch(`${CONFIG.baseUrl}/api/health`);
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ 系統健康檢查: 正常');
      console.log(`   - 狀態: ${result.status}`);
      console.log(`   - 時間戳: ${result.timestamp}`);
    } else {
      console.log('❌ 系統健康檢查: 失敗');
      console.log(`   - HTTP狀態: ${response.status}`);
      console.log(`   - 錯誤: ${result.message}`);
    }
  } catch (error) {
    console.log('❌ 系統健康檢查: 連接失敗');
    console.log(`   - 錯誤: ${error.message}`);
    console.log('   - 可能原因: 服務器未啟動或端口不正確');
  }
  
  console.log('');
}

async function checkUserAuthentication() {
  console.log('🔐 2. 檢查用戶認證狀態');
  console.log('=' .repeat(50));
  
  try {
    // 2.1 檢查 LINE bind 狀態 API
    console.log('📱 檢查 LINE 綁定狀態 API...');
    
    const lineResponse = await fetch(`${CONFIG.baseUrl}/api/line/bind/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (lineResponse.status === 401) {
      console.log('⚠️  LINE 綁定狀態 API: 需要認證 (正常行為)');
      console.log('   - HTTP狀態: 401 Unauthorized');
      console.log('   - 這表示 API 端點存在且正常運作');
    } else if (lineResponse.ok) {
      const lineResult = await lineResponse.json();
      console.log('✅ LINE 綁定狀態 API: 可訪問');
      console.log(`   - 回應: ${JSON.stringify(lineResult, null, 2)}`);
    } else {
      console.log('❌ LINE 綁定狀態 API: 異常');
      console.log(`   - HTTP狀態: ${lineResponse.status}`);
    }
    
    // 2.2 模擬用戶驗證
    console.log('\n🧪 模擬用戶認證...');
    
    // 嘗試獲取測試用戶 token
    const authResponse = await fetch(`${CONFIG.baseUrl}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: 'test_token'
      })
    });
    
    if (authResponse.status === 400 || authResponse.status === 401) {
      console.log('✅ 認證 API: 正常運作 (拒絕無效 token)');
      console.log(`   - HTTP狀態: ${authResponse.status}`);
    } else {
      console.log('❌ 認證 API: 異常回應');
      console.log(`   - HTTP狀態: ${authResponse.status}`);
    }
    
  } catch (error) {
    console.log('❌ 用戶認證檢查失敗');
    console.log(`   - 錯誤: ${error.message}`);
  }
  
  console.log('');
}

async function checkWatchlistAPI() {
  console.log('⭐ 3. 檢查觀察清單 API');
  console.log('=' .repeat(50));
  
  try {
    // 3.1 檢查 GET /api/watchlist (需要認證)
    console.log('📋 檢查觀察清單載入 API...');
    
    const getResponse = await fetch(`${CONFIG.baseUrl}/api/watchlist`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (getResponse.status === 401) {
      console.log('✅ GET /api/watchlist: 正常 (需要認證)');
      console.log('   - HTTP狀態: 401 Unauthorized');
      console.log('   - API 端點存在且有正確的認證保護');
    } else {
      console.log('❌ GET /api/watchlist: 異常');
      console.log(`   - HTTP狀態: ${getResponse.status}`);
      
      if (getResponse.ok) {
        const result = await getResponse.json();
        console.log(`   - 回應: ${JSON.stringify(result, null, 2)}`);
      }
    }
    
    // 3.2 檢查 POST /api/watchlist (添加到觀察清單)
    console.log('\n➕ 檢查觀察清單添加 API...');
    
    const postResponse = await fetch(`${CONFIG.baseUrl}/api/watchlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol: CONFIG.testSymbol,
        priority: 3
      })
    });
    
    if (postResponse.status === 401) {
      console.log('✅ POST /api/watchlist: 正常 (需要認證)');
      console.log('   - HTTP狀態: 401 Unauthorized');
      console.log('   - API 端點存在且有正確的認證保護');
    } else {
      console.log('❌ POST /api/watchlist: 異常');
      console.log(`   - HTTP狀態: ${postResponse.status}`);
      
      try {
        const result = await postResponse.json();
        console.log(`   - 回應: ${JSON.stringify(result, null, 2)}`);
      } catch (e) {
        console.log('   - 無法解析 JSON 回應');
      }
    }
    
    // 3.3 檢查觀察清單狀態 API
    console.log('\n🔍 檢查觀察清單狀態 API...');
    
    const statusResponse = await fetch(`${CONFIG.baseUrl}/api/watchlist/status/${CONFIG.testSymbol}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (statusResponse.status === 401) {
      console.log('✅ GET /api/watchlist/status: 正常 (需要認證)');
      console.log('   - HTTP狀態: 401 Unauthorized');
    } else if (statusResponse.status === 404) {
      console.log('❌ GET /api/watchlist/status: API 端點不存在');
      console.log('   - HTTP狀態: 404 Not Found');
      console.log('   - 可能原因: 路由配置缺失');
    } else {
      console.log(`ℹ️  GET /api/watchlist/status: HTTP ${statusResponse.status}`);
      
      try {
        const result = await statusResponse.json();
        console.log(`   - 回應: ${JSON.stringify(result, null, 2)}`);
      } catch (e) {
        console.log('   - 無法解析 JSON 回應');
      }
    }
    
  } catch (error) {
    console.log('❌ 觀察清單 API 檢查失敗');
    console.log(`   - 錯誤: ${error.message}`);
  }
  
  console.log('');
}

async function checkPriceAlertAPI() {
  console.log('🔔 4. 檢查價格警報 API');
  console.log('=' .repeat(50));
  
  try {
    // 4.1 檢查價格警報列表 API
    console.log('📊 檢查價格警報列表 API...');
    
    const listResponse = await fetch(`${CONFIG.baseUrl}/api/notifications/alerts/${CONFIG.testSymbol}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (listResponse.status === 401) {
      console.log('✅ GET /api/notifications/alerts: 正常 (需要認證)');
      console.log('   - HTTP狀態: 401 Unauthorized');
    } else if (listResponse.ok) {
      const result = await listResponse.json();
      console.log('✅ GET /api/notifications/alerts: 可訪問');
      console.log(`   - 回應: ${JSON.stringify(result, null, 2)}`);
    } else {
      console.log('❌ GET /api/notifications/alerts: 異常');
      console.log(`   - HTTP狀態: ${listResponse.status}`);
    }
    
    // 4.2 檢查創建價格警報 API
    console.log('\n➕ 檢查創建價格警報 API...');
    
    const createResponse = await fetch(`${CONFIG.baseUrl}/api/notifications/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol: CONFIG.testSymbol,
        alertType: 'price_above',
        targetPrice: 50000,
        notificationMethods: {
          lineMessaging: { enabled: true }
        }
      })
    });
    
    if (createResponse.status === 401) {
      console.log('✅ POST /api/notifications/alerts: 正常 (需要認證)');
      console.log('   - HTTP狀態: 401 Unauthorized');
    } else {
      console.log(`ℹ️  POST /api/notifications/alerts: HTTP ${createResponse.status}`);
      
      try {
        const result = await createResponse.json();
        console.log(`   - 回應: ${JSON.stringify(result, null, 2)}`);
        
        if (result.message && result.message.includes('使用者不存在')) {
          console.log('🎯 發現問題: "使用者不存在" 錯誤');
          console.log('   - 這確認了用戶在資料庫中不存在或認證有問題');
        }
      } catch (e) {
        console.log('   - 無法解析 JSON 回應');
      }
    }
    
  } catch (error) {
    console.log('❌ 價格警報 API 檢查失敗');
    console.log(`   - 錯誤: ${error.message}`);
  }
  
  console.log('');
}

function generateFixRecommendations() {
  console.log('🛠️  5. 修復建議');
  console.log('=' .repeat(50));
  
  console.log('基於診斷結果，以下是推薦的修復步驟：');
  console.log('');
  
  console.log('📋 立即檢查清單：');
  console.log('1. ✅ 確認 PM2 服務狀態: pm2 status');
  console.log('2. 🔐 檢查用戶認證狀態 (在瀏覽器開發者工具 Console 執行):');
  console.log('   console.log("Token:", localStorage.getItem("nexustrade_token"));');
  console.log('   console.log("User:", JSON.parse(localStorage.getItem("nexustrade_user")));');
  console.log('');
  
  console.log('🔧 潛在修復方案：');
  console.log('');
  
  console.log('方案 A: 前端認證狀態修復');
  console.log('- 訪問: http://localhost:3000/force-auth-sync.html');
  console.log('- 點擊「🚀 從伺服器強制同步」');
  console.log('- 重新測試觀察清單功能');
  console.log('');
  
  console.log('方案 B: 用戶資料修復');
  console.log('- 執行: node debug-database-user.js');
  console.log('- 確認用戶在資料庫中存在且資料完整');
  console.log('');
  
  console.log('方案 C: API 路由檢查');
  console.log('- 檢查 /src/routes/watchlist.js 是否存在');
  console.log('- 確認路由在 server.js 中正確註冊');
  console.log('- 檢查認證中間件是否正確應用');
  console.log('');
  
  console.log('方案 D: 前端錯誤處理改善');
  console.log('- 檢查瀏覽器 Console 是否有 JavaScript 錯誤');
  console.log('- 確認 AuthManager 正確初始化');
  console.log('- 檢查 CurrencyDetailPage 的事件綁定');
  console.log('');
  
  console.log('📞 測試驗證步驟：');
  console.log('1. 登入系統 (Google 或 LINE)');
  console.log('2. 進入任一貨幣詳細頁面 (如 BTCUSDT)');
  console.log('3. 點擊「⭐ 加入關注」按鈕');
  console.log('4. 檢查是否出現錯誤訊息或無反應');
  console.log('5. 檢查瀏覽器開發者工具 Network 標籤');
  console.log('6. 查看 API 請求的回應內容');
  console.log('');
  
  console.log('🚨 如果問題持續存在：');
  console.log('- 檢查後端日誌: pm2 logs nexustrade-api');
  console.log('- 重啟服務: pm2 restart nexustrade-api');
  console.log('- 檢查資料庫連接: 執行 diagnose-auth-flow.js');
}

// 執行診斷
if (require.main === module) {
  diagnosePriceAlertAndWatchlistIssues()
    .then(() => {
      console.log('🎉 診斷完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 診斷失敗:', error);
      process.exit(1);
    });
}

module.exports = {
  diagnosePriceAlertAndWatchlistIssues,
  CONFIG
};