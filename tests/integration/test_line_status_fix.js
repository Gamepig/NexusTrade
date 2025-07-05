#!/usr/bin/env node

/**
 * NexusTrade LINE 狀態同步修復測試腳本
 * 
 * 測試目標：
 * 1. 驗證 AuthStateManager 正確運作
 * 2. 驗證 PriceAlertModal 狀態同步
 * 3. 驗證完整端到端流程
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 NexusTrade LINE 狀態同步修復測試');
console.log('='.repeat(50));

// 測試結果追蹤
const testResults = {
  fileExists: {},
  codeIntegrity: {},
  jsLoader: {},
  flowIntegrity: {}
};

// 1. 檢查檔案存在性
console.log('\n📁 檢查關鍵檔案存在性...');

const keyFiles = [
  'public/js/lib/auth-state-manager.js',
  'public/js/components/PriceAlertModal.js',
  'public/js/components/LoginModal.js',
  'public/index.html'
];

keyFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  const exists = fs.existsSync(fullPath);
  testResults.fileExists[file] = exists;
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// 2. 檢查 AuthStateManager 程式碼完整性
console.log('\n🔧 檢查 AuthStateManager 程式碼完整性...');

try {
  const authManagerPath = path.join(__dirname, 'public/js/lib/auth-state-manager.js');
  const authManagerContent = fs.readFileSync(authManagerPath, 'utf8');
  
  const requiredMethods = [
    'forceAuthStateRefresh',
    'validateAuthState',
    'checkServerAuthStatus',
    'compareAuthStates',
    'syncToServerState',
    'triggerAuthStateUpdate',
    'handleStorageChange'
  ];
  
  requiredMethods.forEach(method => {
    const hasMethod = authManagerContent.includes(method);
    testResults.codeIntegrity[method] = hasMethod;
    console.log(`${hasMethod ? '✅' : '❌'} ${method} 方法`);
  });
  
  // 檢查全域實例建立
  const hasGlobalInstance = authManagerContent.includes('window.authStateManager = new AuthStateManager()');
  testResults.codeIntegrity.globalInstance = hasGlobalInstance;
  console.log(`${hasGlobalInstance ? '✅' : '❌'} 全域實例建立`);
  
} catch (error) {
  console.log('❌ AuthStateManager 程式碼檢查失敗:', error.message);
}

// 3. 檢查 PriceAlertModal 整合
console.log('\n🔔 檢查 PriceAlertModal 整合...');

try {
  const modalPath = path.join(__dirname, 'public/js/components/PriceAlertModal.js');
  const modalContent = fs.readFileSync(modalPath, 'utf8');
  
  const integrationChecks = [
    { name: '狀態管理器調用', pattern: 'window.authStateManager' },
    { name: '事件監聽器設定', pattern: 'setupAuthStateListeners' },
    { name: '認證狀態更新處理', pattern: 'handleAuthStateUpdate' },
    { name: '狀態驗證調用', pattern: 'validateAuthState' },
    { name: '降級邏輯', pattern: 'checkLineConnectionStatusFallback' }
  ];
  
  integrationChecks.forEach(check => {
    const hasIntegration = modalContent.includes(check.pattern);
    testResults.codeIntegrity[check.name] = hasIntegration;
    console.log(`${hasIntegration ? '✅' : '❌'} ${check.name}`);
  });
  
} catch (error) {
  console.log('❌ PriceAlertModal 整合檢查失敗:', error.message);
}

// 4. 檢查 LoginModal OAuth 後觸發
console.log('\n🔐 檢查 LoginModal OAuth 後觸發...');

try {
  const loginModalPath = path.join(__dirname, 'public/js/components/LoginModal.js');
  const loginModalContent = fs.readFileSync(loginModalPath, 'utf8');
  
  const oauthChecks = [
    { name: 'OAuth 後狀態同步', pattern: 'authStateManager.forceAuthStateRefresh' },
    { name: '導航處理整合', pattern: 'handlePostLoginNavigation' },
    { name: '價格警報重新檢查', pattern: 'checkLineConnectionStatus' }
  ];
  
  oauthChecks.forEach(check => {
    const hasIntegration = loginModalContent.includes(check.pattern);
    testResults.codeIntegrity[check.name] = hasIntegration;
    console.log(`${hasIntegration ? '✅' : '❌'} ${check.name}`);
  });
  
} catch (error) {
  console.log('❌ LoginModal OAuth 整合檢查失敗:', error.message);
}

// 5. 檢查 JavaScript 載入順序
console.log('\n📜 檢查 JavaScript 載入順序...');

try {
  const indexPath = path.join(__dirname, 'public/index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  const jsLoadOrder = [
    'auth-state-manager.js',
    'LoginModal.js',
    'PriceAlertModal.js'
  ];
  
  jsLoadOrder.forEach(jsFile => {
    const isLoaded = indexContent.includes(jsFile);
    testResults.jsLoader[jsFile] = isLoaded;
    console.log(`${isLoaded ? '✅' : '❌'} ${jsFile} 已載入`);
  });
  
  // 檢查載入順序
  const authManagerIndex = indexContent.indexOf('auth-state-manager.js');
  const modalIndex = indexContent.indexOf('PriceAlertModal.js');
  const orderCorrect = authManagerIndex < modalIndex;
  testResults.jsLoader.loadOrder = orderCorrect;
  console.log(`${orderCorrect ? '✅' : '❌'} 載入順序正確 (AuthStateManager 在 PriceAlertModal 之前)`);
  
} catch (error) {
  console.log('❌ JavaScript 載入檢查失敗:', error.message);
}

// 6. 流程完整性檢查
console.log('\n🔄 流程完整性檢查...');

const flowChecks = [
  { 
    name: '前端狀態檢查流程',
    files: ['public/js/components/PriceAlertModal.js'],
    patterns: ['validateAuthState', 'waitForAuthStability']
  },
  {
    name: 'OAuth 後同步流程',
    files: ['public/js/components/LoginModal.js'],
    patterns: ['forceAuthStateRefresh', 'handlePostLoginNavigation']
  },
  {
    name: '跨標籤頁同步機制',
    files: ['public/js/lib/auth-state-manager.js'],
    patterns: ['storage', 'triggerAuthStateUpdate', 'BroadcastChannel']
  },
  {
    name: '錯誤處理機制',
    files: ['public/js/lib/auth-state-manager.js', 'public/js/components/PriceAlertModal.js'],
    patterns: ['catch (error)', 'console.error', 'handleAuthExpired']
  }
];

flowChecks.forEach(check => {
  let allPatternsFound = true;
  
  check.files.forEach(file => {
    try {
      const filePath = path.join(__dirname, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      check.patterns.forEach(pattern => {
        if (!content.includes(pattern)) {
          allPatternsFound = false;
        }
      });
    } catch (error) {
      allPatternsFound = false;
    }
  });
  
  testResults.flowIntegrity[check.name] = allPatternsFound;
  console.log(`${allPatternsFound ? '✅' : '❌'} ${check.name}`);
});

// 7. 總結報告
console.log('\n📊 測試結果總結');
console.log('='.repeat(50));

const allCategories = [
  { name: '檔案存在性', results: testResults.fileExists },
  { name: '程式碼完整性', results: testResults.codeIntegrity },
  { name: 'JavaScript 載入', results: testResults.jsLoader },
  { name: '流程完整性', results: testResults.flowIntegrity }
];

let totalTests = 0;
let passedTests = 0;

allCategories.forEach(category => {
  const categoryTests = Object.keys(category.results).length;
  const categoryPassed = Object.values(category.results).filter(Boolean).length;
  
  totalTests += categoryTests;
  passedTests += categoryPassed;
  
  console.log(`\n${category.name}: ${categoryPassed}/${categoryTests} 通過`);
  
  Object.entries(category.results).forEach(([test, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${test}`);
  });
});

console.log('\n🎯 整體測試結果');
console.log(`總計: ${passedTests}/${totalTests} 通過 (${Math.round(passedTests/totalTests*100)}%)`);

if (passedTests === totalTests) {
  console.log('\n🎉 所有測試通過！LINE 狀態同步修復已完成。');
  console.log('\n📋 下一步操作：');
  console.log('1. 啟動開發伺服器: npm run dev');
  console.log('2. 瀏覽器訪問: http://localhost:3001');
  console.log('3. 測試 BTCUSDT 頁面的價格警報功能');
  console.log('4. 驗證 LINE 連接狀態顯示正確');
} else {
  console.log('\n⚠️ 部分測試未通過，請檢查上述失敗項目。');
}

console.log('\n📝 用戶端驗證步驟：');
console.log('1. 打開瀏覽器開發工具 Console');
console.log('2. 執行: console.log("AuthStateManager:", window.authStateManager)');
console.log('3. 執行: console.log("PriceAlertModal:", window.priceAlertModal)');
console.log('4. 在 BTCUSDT 頁面點擊「通知設定」');
console.log('5. 觀察 Console 中的狀態同步日誌');

process.exit(passedTests === totalTests ? 0 : 1);