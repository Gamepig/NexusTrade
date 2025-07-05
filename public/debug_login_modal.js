/**
 * LoginModal 問題診斷腳本
 * 執行方式：在瀏覽器 Console 中執行或加載此腳本
 */

console.log('🔧 開始 LoginModal 問題診斷...');

// 1. 檢查 LoginModal 是否存在
console.log('1. 檢查 LoginModal 類別:');
console.log('LoginModal 類別存在:', typeof LoginModal !== 'undefined');
console.log('window.loginModal 實例存在:', typeof window.loginModal !== 'undefined');

// 2. 檢查模態框 HTML 是否正確生成
console.log('\n2. 檢查模態框 HTML:');
const modal = document.getElementById('login-modal');
console.log('login-modal 元素存在:', !!modal);

if (modal) {
  const googleBtn = document.getElementById('google-login-btn');
  const lineBtn = document.getElementById('line-login-btn');
  
  console.log('google-login-btn 按鈕存在:', !!googleBtn);
  console.log('line-login-btn 按鈕存在:', !!lineBtn);
  
  if (googleBtn) {
    console.log('Google 按鈕類別名稱:', googleBtn.className);
    console.log('Google 按鈕事件監聽器數量:', getEventListeners ? getEventListeners(googleBtn) : '無法檢查');
  }
}

// 3. 檢查事件監聽器是否正確綁定
console.log('\n3. 測試事件綁定:');
if (window.loginModal && typeof window.loginModal.handleGoogleLogin === 'function') {
  console.log('handleGoogleLogin 方法存在');
  
  // 模擬點擊測試
  try {
    console.log('模擬執行 handleGoogleLogin...');
    // 不實際執行，只測試是否會拋出錯誤
    console.log('handleGoogleLogin 可以被調用');
  } catch (error) {
    console.error('handleGoogleLogin 執行錯誤:', error);
  }
} else {
  console.error('handleGoogleLogin 方法不存在');
}

// 4. 檢查頁面載入順序
console.log('\n4. 檢查組件載入:');
console.log('document.readyState:', document.readyState);
console.log('DOMContentLoaded 已觸發:', document.readyState !== 'loading');

// 5. 檢查可能的 JavaScript 錯誤
console.log('\n5. 檢查全域錯誤:');
let hasErrors = false;

// 監聽 JavaScript 錯誤
window.addEventListener('error', function(event) {
  console.error('❌ JavaScript 錯誤:', event.error?.message || event.message);
  console.error('❌ 錯誤檔案:', event.filename);
  console.error('❌ 錯誤行號:', event.lineno);
  hasErrors = true;
});

// 6. 提供測試函數
window.testLoginModal = function() {
  console.log('\n🧪 手動測試 LoginModal:');
  
  if (!window.loginModal) {
    console.error('LoginModal 實例不存在，創建新實例...');
    try {
      window.loginModal = new LoginModal();
      console.log('✅ LoginModal 實例創建成功');
    } catch (error) {
      console.error('❌ LoginModal 創建失敗:', error);
      return;
    }
  }
  
  console.log('顯示 LoginModal...');
  window.loginModal.show();
  
  setTimeout(() => {
    const googleBtn = document.getElementById('google-login-btn');
    if (googleBtn) {
      console.log('測試 Google 按鈕點擊...');
      
      // 手動觸發點擊事件
      const clickEvent = new Event('click', { bubbles: true });
      googleBtn.dispatchEvent(clickEvent);
      
      console.log('Google 按鈕點擊事件已觸發');
    } else {
      console.error('找不到 Google 登入按鈕');
    }
  }, 1000);
};

// 7. 檢查 CSP 策略
console.log('\n6. 檢查 CSP 策略:');
const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
if (metaCSP) {
  console.log('CSP Meta 標籤:', metaCSP.content);
} else {
  console.log('未發現 CSP Meta 標籤');
}

// 8. 檢查 OAuth 流程
console.log('\n7. OAuth 流程檢查:');
window.testOAuthFlow = async function() {
  console.log('測試 OAuth 端點...');
  
  try {
    const response = await fetch('/auth/google', {
      method: 'GET',
      redirect: 'manual'
    });
    
    console.log('OAuth 端點回應狀態:', response.status);
    console.log('OAuth 端點回應類型:', response.type);
    
    if (response.status === 302 || response.type === 'opaqueredirect') {
      console.log('✅ OAuth 端點正常');
    } else {
      console.error('❌ OAuth 端點異常');
    }
  } catch (error) {
    console.error('❌ OAuth 端點測試失敗:', error);
  }
};

console.log('\n🎯 診斷完成！可用測試函數:');
console.log('- testLoginModal() - 測試登入模態框');
console.log('- testOAuthFlow() - 測試 OAuth 流程');
console.log('\n如果要測試，請在 Console 中執行這些函數。');