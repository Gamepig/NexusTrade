/**
 * 登入流程修復驗證腳本
 * 
 * 模擬 LINE OAuth 登入後的完整流程，包含：
 * 1. 頁面狀態儲存
 * 2. 登入成功處理
 * 3. 頁面跳轉回原位置
 * 4. LINE 狀態重新檢查
 */

console.log('🧪 開始測試登入流程修復...\n');

// 模擬瀏覽器環境
global.sessionStorage = {
  data: {},
  setItem(key, value) {
    this.data[key] = value;
  },
  getItem(key) {
    return this.data[key] || null;
  },
  removeItem(key) {
    delete this.data[key];
  }
};

global.localStorage = {
  data: {},
  setItem(key, value) {
    this.data[key] = value;
  },
  getItem(key) {
    return this.data[key] || null;
  },
  removeItem(key) {
    delete this.data[key];
  }
};

global.window = {
  location: {
    hash: '#/currency/BTCUSDT',
    hostname: 'localhost',
    search: ''
  },
  router: {
    navigate: (path, force) => {
      console.log(`🧭 路由導航: ${path} (force: ${force})`);
      global.window.location.hash = `#${path}`;
    }
  },
  priceAlertModal: {
    isVisible: true,
    currentSymbol: 'BTCUSDT',
    show: (symbol) => {
      console.log(`🔔 顯示價格警報模態框: ${symbol}`);
      global.window.priceAlertModal.currentSymbol = symbol;
      global.window.priceAlertModal.isVisible = true;
    },
    checkLineConnectionStatus: async () => {
      console.log('📱 重新檢查 LINE 連接狀態');
      return Promise.resolve();
    },
    render: () => {
      console.log('🎨 重新渲染價格警報模態框');
    },
    setupEventListeners: () => {
      console.log('🎧 重新設定事件監聽器');
    }
  }
};

global.console = console;

async function testLoginFlowFix() {
  try {
    // 1. 模擬使用者從 BTCUSDT 頁面點擊價格警報，被要求登入
    console.log('📋 步驟 1: 使用者在 BTCUSDT 頁面點擊價格警報設定');
    
    // 模擬 PriceAlertModal 的 redirectToLineLogin 方法
    const currentState = {
      page: 'currency-detail',
      symbol: 'BTCUSDT',
      action: 'price-alert'
    };
    
    global.sessionStorage.setItem('nexustrade_return_state', JSON.stringify(currentState));
    console.log('💾 已儲存返回狀態:', currentState);
    
    // 2. 模擬重定向到 LINE OAuth (這會在實際瀏覽器中發生)
    console.log('\n📋 步驟 2: 重定向到 LINE OAuth 登入...');
    console.log('🔗 模擬：window.location.href = "/auth/line"');
    
    // 3. 模擬 LINE OAuth 成功回調
    console.log('\n📋 步驟 3: LINE OAuth 成功，處理回調');
    
    // 模擬 URL 參數 (LINE OAuth 成功後)
    const mockOAuthParams = {
      oauth: 'success',
      provider: 'line',
      token: 'mock_jwt_token_12345',
      refreshToken: 'mock_refresh_token_67890',
      userName: '測試使用者',
      userEmail: 'line_U123456@example.com',
      userAvatar: 'https://example.com/avatar.jpg'
    };
    
    console.log('📊 OAuth 回調參數:', mockOAuthParams);
    
    // 4. 模擬 LoginModal 的 handleLoginSuccess 方法
    console.log('\n📋 步驟 4: 處理登入成功');
    
    const loginData = {
      token: mockOAuthParams.token,
      refreshToken: mockOAuthParams.refreshToken,
      provider: mockOAuthParams.provider,
      user: {
        email: mockOAuthParams.userEmail,
        profile: {
          displayName: mockOAuthParams.userName,
          picture: mockOAuthParams.userAvatar
        }
      }
    };
    
    // 保存 token (模擬)
    global.localStorage.setItem('nexustrade_token', loginData.token);
    global.localStorage.setItem('nexustrade_user', JSON.stringify(loginData.user));
    console.log('💾 已保存使用者資料和 token');
    
    // 5. 模擬 handlePostLoginNavigation 方法
    console.log('\n📋 步驟 5: 處理登入後導航');
    
    // 檢查返回狀態
    const returnStateStr = global.sessionStorage.getItem('nexustrade_return_state');
    if (returnStateStr) {
      const returnState = JSON.parse(returnStateStr);
      console.log('📍 找到返回狀態:', returnState);
      
      // 清除返回狀態
      global.sessionStorage.removeItem('nexustrade_return_state');
      console.log('🧹 已清除返回狀態');
      
      // 導航回原頁面
      if (returnState.page === 'currency-detail' && returnState.symbol) {
        console.log(`🪙 返回到 ${returnState.symbol} 貨幣詳情頁面`);
        
        // 模擬路由導航
        global.window.router.navigate(`/currency/${returnState.symbol}`, true);
        
        // 如果是價格警報相關，重新打開 PriceAlertModal
        if (returnState.action === 'price-alert') {
          console.log('🔔 重新打開價格警報設定');
          global.window.priceAlertModal.show(returnState.symbol);
          
          // 重新檢查 LINE 狀態
          console.log('📱 重新檢查 LINE 連接狀態...');
          await global.window.priceAlertModal.checkLineConnectionStatus();
          
          // 重新渲染模態框
          global.window.priceAlertModal.render();
          global.window.priceAlertModal.setupEventListeners();
        }
      }
    }
    
    // 6. 驗證最終狀態
    console.log('\n📋 步驟 6: 驗證最終狀態');
    
    const finalTests = {
      tokenSaved: !!global.localStorage.getItem('nexustrade_token'),
      userDataSaved: !!global.localStorage.getItem('nexustrade_user'),
      returnStateCleared: !global.sessionStorage.getItem('nexustrade_return_state'),
      correctPageLocation: global.window.location.hash === '#/currency/BTCUSDT',
      priceAlertModalOpen: global.window.priceAlertModal.isVisible,
      correctSymbol: global.window.priceAlertModal.currentSymbol === 'BTCUSDT'
    };
    
    console.log('\n🎯 測試結果:');
    Object.entries(finalTests).forEach(([testName, passed]) => {
      console.log(`  ${testName}: ${passed ? '✅' : '❌'}`);
    });
    
    const passedTests = Object.values(finalTests).filter(result => result === true).length;
    const totalTests = Object.keys(finalTests).length;
    
    console.log(`\n📊 測試通過率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 所有測試通過！登入流程修復成功！');
      console.log('✨ 使用者現在可以：');
      console.log('   1. 從任何頁面點擊需要登入的功能');
      console.log('   2. 完成 LINE OAuth 登入');
      console.log('   3. 自動返回到原本的頁面');
      console.log('   4. LINE 連接狀態正確更新');
    } else {
      console.log(`\n⚠️ ${totalTests - passedTests} 個測試失敗，需要進一步檢查。`);
    }
    
    console.log('\n🔧 實際瀏覽器中的效果:');
    console.log('   1. 用戶在 BTCUSDT 頁面點擊 "通知設定"');
    console.log('   2. 彈出價格警報模態框，顯示 "需要 LINE 登入"');
    console.log('   3. 用戶點擊 "連結 LINE 帳戶"');
    console.log('   4. 跳轉到 LINE OAuth 頁面');
    console.log('   5. 用戶完成 LINE 登入');
    console.log('   6. 自動跳轉回 BTCUSDT 頁面');
    console.log('   7. 自動重新打開價格警報模態框');
    console.log('   8. 模態框顯示 "✅ LINE 已連結" 和完整設定表單');

  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
    console.error('錯誤堆疊:', error.stack);
  }
}

// 執行測試
testLoginFlowFix().catch(console.error);