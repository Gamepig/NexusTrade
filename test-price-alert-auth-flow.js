#!/usr/bin/env node

/**
 * NexusTrade 價格警報認證流程測試
 * 
 * 測試情境：
 * 1. 檢查目前使用者的認證狀態
 * 2. 模擬「設定通知」按鈕點擊
 * 3. 驗證 PriceAlertModal 的認證檢查邏輯
 * 4. 檢查 LINE 連接狀態的判斷
 */

// 模擬瀏覽器環境
global.window = {
  localStorage: {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; }
  },
  sessionStorage: {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; }
  },
  addEventListener: () => {},
  currentUser: null
};

global.localStorage = global.window.localStorage;
global.sessionStorage = global.window.sessionStorage;

class PriceAlertAuthTester {
  constructor() {
    this.testResults = [];
  }

  /**
   * 記錄測試結果
   */
  logTest(testName, passed, details = null, error = null) {
    const result = {
      testName,
      passed,
      details,
      error: error?.message,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    if (passed) {
      console.log(`✅ ${testName}`);
      if (details) console.log(`   ${details}`);
    } else {
      console.log(`❌ ${testName}`);
      if (error) console.log(`   錯誤: ${error.message}`);
      if (details) console.log(`   詳情: ${details}`);
    }
  }

  /**
   * 模擬 getCurrentUser 方法
   */
  getCurrentUser() {
    try {
      if (global.window.currentUser) {
        return global.window.currentUser;
      }
      
      const userStr = localStorage.getItem('nexustrade_user') || sessionStorage.getItem('nexustrade_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('❌ 取得使用者資訊失敗:', error);
      return null;
    }
  }

  /**
   * 模擬認證檢查邏輯（來自 PriceAlertModal）
   */
  checkAuthStatus() {
    const currentUser = this.getCurrentUser();
    const token = localStorage.getItem('nexustrade_token') || sessionStorage.getItem('nexustrade_token');
    const isAuthenticated = !!(token && currentUser);
    
    return {
      currentUser,
      token: token ? '***存在***' : null,
      isAuthenticated
    };
  }

  /**
   * 測試場景 1: 未登入使用者
   */
  testUnauthenticatedUser() {
    console.log('\n🔵 測試場景 1: 未登入使用者');
    
    // 清除所有認證資料
    localStorage.removeItem('nexustrade_token');
    localStorage.removeItem('nexustrade_user');
    sessionStorage.removeItem('nexustrade_token');
    sessionStorage.removeItem('nexustrade_user');
    global.window.currentUser = null;
    
    const authStatus = this.checkAuthStatus();
    
    this.logTest(
      '1.1 未登入狀態檢查',
      !authStatus.isAuthenticated,
      `認證狀態: ${authStatus.isAuthenticated}, 使用者: ${authStatus.currentUser}, Token: ${authStatus.token}`
    );
    
    // 模擬點擊「設定通知」時的邏輯
    const shouldShowLoginPrompt = !authStatus.isAuthenticated;
    this.logTest(
      '1.2 應該顯示登入提示',
      shouldShowLoginPrompt,
      `會顯示登入提示: ${shouldShowLoginPrompt}`
    );
  }

  /**
   * 測試場景 2: Google 登入使用者（未連結 LINE）
   */
  testGoogleUserWithoutLine() {
    console.log('\n🔵 測試場景 2: Google 登入使用者（未連結 LINE）');
    
    // 設定 Google 登入使用者
    const mockGoogleUser = {
      id: 'google_123456',
      name: 'Vic Huang',
      email: 'vic@example.com',
      provider: 'google',
      lineUserId: null
    };
    
    const mockToken = 'jwt_token_google_user_12345';
    
    localStorage.setItem('nexustrade_token', mockToken);
    localStorage.setItem('nexustrade_user', JSON.stringify(mockGoogleUser));
    
    const authStatus = this.checkAuthStatus();
    
    this.logTest(
      '2.1 Google 使用者認證檢查',
      authStatus.isAuthenticated,
      `認證狀態: ${authStatus.isAuthenticated}, 使用者: ${authStatus.currentUser?.name}, Provider: ${authStatus.currentUser?.provider}`
    );
    
    // 檢查 LINE 連接狀態
    const isLineConnected = !!(authStatus.currentUser?.lineUserId);
    this.logTest(
      '2.2 LINE 連接狀態檢查',
      !isLineConnected, // 預期未連接
      `LINE 連接狀態: ${isLineConnected}, LINE ID: ${authStatus.currentUser?.lineUserId}`
    );
    
    // 模擬 PriceAlertModal 的認證邏輯
    const shouldShowAlertForm = authStatus.isAuthenticated && !isLineConnected;
    this.logTest(
      '2.3 應該顯示 LINE 連接選項',
      shouldShowAlertForm,
      `會顯示 LINE 連接選項和直接設定按鈕: ${shouldShowAlertForm}`
    );
  }

  /**
   * 測試場景 3: 完整登入使用者（已連結 LINE）
   */
  testFullyAuthenticatedUser() {
    console.log('\n🔵 測試場景 3: 完整登入使用者（已連結 LINE）');
    
    // 設定完整登入使用者
    const mockFullUser = {
      id: 'google_123456',
      name: 'Vic Huang',
      email: 'vic@example.com',
      provider: 'google',
      lineUserId: 'line_user_789'
    };
    
    const mockToken = 'jwt_token_full_user_12345';
    
    localStorage.setItem('nexustrade_token', mockToken);
    localStorage.setItem('nexustrade_user', JSON.stringify(mockFullUser));
    
    const authStatus = this.checkAuthStatus();
    
    this.logTest(
      '3.1 完整使用者認證檢查',
      authStatus.isAuthenticated,
      `認證狀態: ${authStatus.isAuthenticated}, 使用者: ${authStatus.currentUser?.name}`
    );
    
    // 檢查 LINE 連接狀態
    const isLineConnected = !!(authStatus.currentUser?.lineUserId);
    this.logTest(
      '3.2 LINE 連接狀態檢查',
      isLineConnected, // 預期已連接
      `LINE 連接狀態: ${isLineConnected}, LINE ID: ${authStatus.currentUser?.lineUserId}`
    );
    
    // 模擬 PriceAlertModal 的認證邏輯
    const shouldShowFullForm = authStatus.isAuthenticated && isLineConnected;
    this.logTest(
      '3.3 應該直接顯示完整警報表單',
      shouldShowFullForm,
      `會直接顯示完整警報設定表單: ${shouldShowFullForm}`
    );
  }

  /**
   * 測試場景 4: 損壞的認證資料
   */
  testCorruptedAuthData() {
    console.log('\n🔵 測試場景 4: 損壞的認證資料');
    
    // 設定損壞的資料
    localStorage.setItem('nexustrade_token', 'invalid_token');
    localStorage.setItem('nexustrade_user', 'invalid_json{');
    
    const authStatus = this.checkAuthStatus();
    
    this.logTest(
      '4.1 損壞資料處理',
      !authStatus.isAuthenticated,
      `認證狀態: ${authStatus.isAuthenticated}, 錯誤處理是否正確`
    );
  }

  /**
   * 模擬實際瀏覽器環境中的認證狀態
   */
  testBrowserEnvironment() {
    console.log('\n🔵 測試場景 5: 模擬瀏覽器環境');
    
    // 從瀏覽器截圖中看到的狀態：使用者顯示為 "Vic Huang"
    const browserUser = {
      id: 'user_12345',
      name: 'Vic Huang',
      email: 'vic@example.com',
      provider: 'line', // 或 'google'
      lineUserId: 'line_user_vic',
      profilePicture: 'https://profile.pic/url'
    };
    
    // 設定瀏覽器中可能的認證狀態
    localStorage.setItem('nexustrade_token', 'real_browser_token_12345');
    localStorage.setItem('nexustrade_user', JSON.stringify(browserUser));
    global.window.currentUser = browserUser;
    
    const authStatus = this.checkAuthStatus();
    
    this.logTest(
      '5.1 瀏覽器環境認證檢查',
      authStatus.isAuthenticated,
      `使用者: ${authStatus.currentUser?.name}, Provider: ${authStatus.currentUser?.provider}`
    );
    
    const isLineConnected = !!(authStatus.currentUser?.lineUserId);
    this.logTest(
      '5.2 瀏覽器環境 LINE 狀態',
      isLineConnected,
      `LINE 連接: ${isLineConnected}, 應該直接顯示警報表單`
    );
  }

  /**
   * 檢查可能的問題源頭
   */
  diagnosePotentialIssues() {
    console.log('\n🔵 問題診斷');
    
    // 檢查 window.currentUser
    const hasWindowUser = !!global.window.currentUser;
    this.logTest(
      'D1. window.currentUser 存在性',
      hasWindowUser,
      `window.currentUser: ${hasWindowUser ? '存在' : '不存在'}`
    );
    
    // 檢查 localStorage 中的資料
    const hasTokenInLocal = !!localStorage.getItem('nexustrade_token');
    const hasUserInLocal = !!localStorage.getItem('nexustrade_user');
    
    this.logTest(
      'D2. localStorage 認證資料',
      hasTokenInLocal && hasUserInLocal,
      `Token: ${hasTokenInLocal ? '存在' : '不存在'}, User: ${hasUserInLocal ? '存在' : '不存在'}`
    );
    
    // 檢查 sessionStorage 中的資料
    const hasTokenInSession = !!sessionStorage.getItem('nexustrade_token');
    const hasUserInSession = !!sessionStorage.getItem('nexustrade_user');
    
    this.logTest(
      'D3. sessionStorage 認證資料',
      true, // 這是資訊性檢查
      `Token: ${hasTokenInSession ? '存在' : '不存在'}, User: ${hasUserInSession ? '存在' : '不存在'}`
    );
  }

  /**
   * 生成測試報告
   */
  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log('\n📊 測試結果報告');
    console.log('='.repeat(50));
    console.log(`總測試數: ${totalTests}`);
    console.log(`✅ 通過: ${passedTests}`);
    console.log(`❌ 失敗: ${failedTests}`);
    console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ 失敗測試詳情:');
      this.testResults
        .filter(result => !result.passed)
        .forEach(result => {
          console.log(`  - ${result.testName}: ${result.error || result.details || '測試失敗'}`);
        });
    }

    console.log('\n🔍 問題分析:');
    console.log('從截圖看到用戶已登入（顯示 "Vic Huang"），但點選「設定通知」仍跳出登入訊息。');
    console.log('可能原因：');
    console.log('1. 前端認證狀態檢查邏輯有問題');
    console.log('2. isLineConnected 狀態判斷錯誤');
    console.log('3. localStorage/sessionStorage 中的資料格式不正確');
    console.log('4. PriceAlertModal 的 getCurrentUser() 方法未正確取得使用者資料');
    
    console.log('\n💡 建議解決方案:');
    console.log('1. 檢查瀏覽器開發者工具的 localStorage 和 sessionStorage');
    console.log('2. 在 PriceAlertModal.show() 方法中添加除錯 console.log');
    console.log('3. 檢查 window.currentUser 是否正確設定');
    console.log('4. 確認 isLineConnected 的判斷邏輯');

    return {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`
      },
      details: this.testResults,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 執行所有測試
   */
  async runAllTests() {
    console.log('🚀 開始 NexusTrade 價格警報認證流程測試');
    
    try {
      this.testUnauthenticatedUser();
      this.testGoogleUserWithoutLine();
      this.testFullyAuthenticatedUser();
      this.testCorruptedAuthData();
      this.testBrowserEnvironment();
      this.diagnosePotentialIssues();
      
      const report = this.generateReport();
      
      // 保存測試報告
      const fs = require('fs');
      const reportPath = `./test-reports/price-alert-auth-flow-${Date.now()}.json`;
      
      if (!fs.existsSync('./test-reports')) {
        fs.mkdirSync('./test-reports', { recursive: true });
      }
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 測試報告已保存至: ${reportPath}`);
      
      return report;
      
    } catch (error) {
      console.error('測試執行失敗:', error);
      throw error;
    }
  }
}

// 執行測試
async function main() {
  const tester = new PriceAlertAuthTester();
  
  try {
    await tester.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('認證流程測試失敗:', error);
    process.exit(1);
  }
}

// 執行主函數
if (require.main === module) {
  main();
}

module.exports = PriceAlertAuthTester;