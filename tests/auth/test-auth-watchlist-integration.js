#!/usr/bin/env node

/**
 * NexusTrade 認證系統與觀察清單整合測試腳本
 * 
 * 測試流程：
 * 1. 檢查 AuthStateManager 方法是否正確實作
 * 2. 驗證 JWT Token 生成和解析
 * 3. 測試 Watchlist API 的認證整合
 * 4. 檢查 PriceAlertModal 的 LINE 綁定流程
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 開始認證系統與觀察清單整合測試\n');

// 測試結果統計
const tests = [];

function addTest(name, status, message) {
  tests.push({ name, status, message });
  const emoji = status ? '✅' : '❌';
  console.log(`${emoji} ${name}: ${message}`);
}

// 1. 檢查 AuthStateManager 新增的方法
console.log('📋 檢查 AuthStateManager 整合...');

try {
  const authStateManagerPath = path.join(__dirname, 'public/js/lib/auth-state-manager.js');
  const content = fs.readFileSync(authStateManagerPath, 'utf8');
  
  // 檢查必要方法
  const requiredMethods = ['getToken()', 'isTokenExpired()', 'getUserId()', 'isAuthenticated()', 'getUserInfo()'];
  
  for (const method of requiredMethods) {
    if (content.includes(method)) {
      addTest(`AuthStateManager.${method}`, true, '方法已實作');
    } else {
      addTest(`AuthStateManager.${method}`, false, '方法未找到');
    }
  }
  
  // 檢查 JWT 解析邏輯
  if (content.includes('JSON.parse(atob(') && content.includes('payload.exp') && content.includes('payload.userId')) {
    addTest('JWT 解析邏輯', true, 'JWT 解析和過期檢查已正確實作');
  } else {
    addTest('JWT 解析邏輯', false, 'JWT 解析邏輯不完整');
  }
  
} catch (error) {
  addTest('AuthStateManager 檔案讀取', false, error.message);
}

// 2. 檢查 WatchlistPage 認證整合
console.log('\n📋 檢查 WatchlistPage 認證整合...');

try {
  const watchlistPagePath = path.join(__dirname, 'public/js/components/WatchlistPage.js');
  const content = fs.readFileSync(watchlistPagePath, 'utf8');
  
  // 檢查 getAuthToken 方法實作
  if (content.includes('window.authStateManager') && content.includes('getToken()') && content.includes('isTokenExpired()')) {
    addTest('WatchlistPage.getAuthToken()', true, '已整合 AuthStateManager');
  } else {
    addTest('WatchlistPage.getAuthToken()', false, 'AuthStateManager 整合不完整');
  }
  
  // 檢查備用方案
  if (content.includes('localStorage.getItem') && content.includes('sessionStorage.getItem')) {
    addTest('認證備用方案', true, 'localStorage 和 sessionStorage 備用方案已實作');
  } else {
    addTest('認證備用方案', false, '缺少備用認證方案');
  }
  
  // 檢查重導向邏輯
  if (content.includes('redirectToLogin') && content.includes('showLoginModal')) {
    addTest('登入重導向', true, '登入重導向邏輯已實作');
  } else {
    addTest('登入重導向', false, '登入重導向邏輯缺失');
  }
  
} catch (error) {
  addTest('WatchlistPage 檔案讀取', false, error.message);
}

// 3. 檢查後端 Watchlist 控制器
console.log('\n📋 檢查後端 Watchlist 控制器...');

try {
  const controllerPath = path.join(__dirname, 'src/controllers/watchlist.controller.js');
  const content = fs.readFileSync(controllerPath, 'utf8');
  
  // 檢查 User ID 使用
  if (content.includes('req.user._id')) {
    addTest('User ID 使用', true, '正確使用 req.user._id 作為 User ID');
  } else if (content.includes('req.user.id')) {
    addTest('User ID 使用', false, '使用 req.user.id，應改為 req.user._id');
  } else {
    addTest('User ID 使用', false, 'User ID 提取邏輯不明確');
  }
  
  // 檢查認證中介軟體整合
  if (content.includes('const userId = req.user._id')) {
    addTest('認證中介軟體整合', true, 'userId 正確從認證中介軟體取得');
  } else {
    addTest('認證中介軟體整合', false, 'userId 取得方式需要檢查');
  }
  
} catch (error) {
  addTest('Watchlist 控制器檔案讀取', false, error.message);
}

// 4. 檢查 LoginModal OAuth 整合
console.log('\n📋 檢查 LoginModal OAuth 整合...');

try {
  const loginModalPath = path.join(__dirname, 'public/js/components/LoginModal.js');
  const content = fs.readFileSync(loginModalPath, 'utf8');
  
  // 檢查 AuthStateManager 整合
  if (content.includes('window.authStateManager.updateLocalAuthState')) {
    addTest('LoginModal AuthStateManager 整合', true, 'OAuth 成功後更新 AuthStateManager');
  } else {
    addTest('LoginModal AuthStateManager 整合', false, 'OAuth 成功後未更新 AuthStateManager');
  }
  
  // 檢查 OAuth 回調處理
  if (content.includes('checkOAuthCallback') && content.includes('handleLoginSuccess')) {
    addTest('OAuth 回調處理', true, 'OAuth 回調處理邏輯完整');
  } else {
    addTest('OAuth 回調處理', false, 'OAuth 回調處理邏輯不完整');
  }
  
} catch (error) {
  addTest('LoginModal 檔案讀取', false, error.message);
}

// 5. 檢查 PriceAlertModal LINE 綁定
console.log('\n📋 檢查 PriceAlertModal LINE 綁定...');

try {
  const priceAlertModalPath = path.join(__dirname, 'public/js/components/PriceAlertModal.js');
  const content = fs.readFileSync(priceAlertModalPath, 'utf8');
  
  // 檢查 LINE 連接狀態檢查
  if (content.includes('checkLineConnectionStatus') && content.includes('authStateManager')) {
    addTest('LINE 狀態檢查', true, 'LINE 連接狀態檢查已整合 AuthStateManager');
  } else {
    addTest('LINE 狀態檢查', false, 'LINE 狀態檢查需要改善');
  }
  
  // 檢查綁定提示流程
  if (content.includes('需要 LINE 登入') && content.includes('redirectToLineLogin')) {
    addTest('LINE 綁定提示', true, 'LINE 綁定提示和重導向邏輯完整');
  } else {
    addTest('LINE 綁定提示', false, 'LINE 綁定提示邏輯不完整');
  }
  
  // 檢查狀態同步
  if (content.includes('authStateUpdated') && content.includes('handleAuthStateUpdate')) {
    addTest('狀態同步', true, '認證狀態更新事件監聽已實作');
  } else {
    addTest('狀態同步', false, '狀態同步機制不完整');
  }
  
} catch (error) {
  addTest('PriceAlertModal 檔案讀取', false, error.message);
}

// 6. 檢查後端認證中介軟體
console.log('\n📋 檢查後端認證中介軟體...');

try {
  const authMiddlewarePath = path.join(__dirname, 'src/middleware/auth.middleware.js');
  const content = fs.readFileSync(authMiddlewarePath, 'utf8');
  
  // 檢查 JWT 驗證
  if (content.includes('jwt.verify') && content.includes('decoded.userId')) {
    addTest('JWT 驗證', true, 'JWT 驗證和 userId 解析正確');
  } else {
    addTest('JWT 驗證', false, 'JWT 驗證邏輯需要檢查');
  }
  
  // 檢查使用者物件附加
  if (content.includes('req.user = user') && content.includes('req.userId = user._id')) {
    addTest('使用者物件附加', true, 'req.user 和 req.userId 正確設定');
  } else {
    addTest('使用者物件附加', false, '使用者物件附加需要檢查');
  }
  
} catch (error) {
  addTest('認證中介軟體檔案讀取', false, error.message);
}

// 7. 檢查計畫文件
console.log('\n📋 檢查實施計畫文件...');

try {
  const planPath = path.join(__dirname, 'tasks/auth-system-watchlist-integration-plan.md');
  if (fs.existsSync(planPath)) {
    const content = fs.readFileSync(planPath, 'utf8');
    if (content.includes('Phase 1') && content.includes('Phase 2') && content.includes('測試策略')) {
      addTest('實施計畫文件', true, '完整的實施計畫已建立');
    } else {
      addTest('實施計畫文件', false, '實施計畫文件內容不完整');
    }
  } else {
    addTest('實施計畫文件', false, '實施計畫文件不存在');
  }
} catch (error) {
  addTest('實施計畫文件讀取', false, error.message);
}

// 統計測試結果
console.log('\n📊 測試結果統計:');
const passed = tests.filter(t => t.status).length;
const failed = tests.filter(t => !t.status).length;
const total = tests.length;

console.log(`總計: ${total} 項測試`);
console.log(`✅ 通過: ${passed} 項 (${Math.round(passed/total*100)}%)`);
console.log(`❌ 失敗: ${failed} 項 (${Math.round(failed/total*100)}%)`);

if (failed > 0) {
  console.log('\n❌ 失敗的測試:');
  tests.filter(t => !t.status).forEach(test => {
    console.log(`  - ${test.name}: ${test.message}`);
  });
}

// 整合狀態評估
console.log('\n🎯 整合狀態評估:');

const criticalTests = [
  'AuthStateManager.getToken()',
  'AuthStateManager.isTokenExpired()',
  'WatchlistPage.getAuthToken()',
  'User ID 使用',
  'LoginModal AuthStateManager 整合'
];

const criticalPassed = criticalTests.filter(testName => 
  tests.find(t => t.name === testName)?.status
).length;

if (criticalPassed === criticalTests.length) {
  console.log('🎉 核心整合已完成！Google Login → Watchlist 流程應該正常運作');
} else {
  console.log('⚠️ 部分核心功能尚未完成，需要進一步修復');
}

// 下一步建議
console.log('\n📋 下一步建議:');

if (passed >= total * 0.8) {
  console.log('1. 🧪 執行實際瀏覽器測試驗證整合功能');
  console.log('2. 🔧 修復任何剩餘的小問題');
  console.log('3. 📈 進行效能測試和最佳化');
} else {
  console.log('1. 🔧 優先修復失敗的核心測試項目');
  console.log('2. 📝 檢查實施計畫文件的指引');
  console.log('3. 🧪 逐步測試每個修復的功能');
}

console.log('\n✨ 測試完成！');