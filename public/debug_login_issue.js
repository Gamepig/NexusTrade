/**
 * 登入問題診斷腳本
 * 針對使用者反饋的問題進行深度診斷
 */

console.log('🔧 開始登入問題診斷...');

// 1. 基本系統檢查
console.log('\n=== 1. 基本系統檢查 ===');

// 檢查全域變數
console.log('window.app 存在:', typeof window.app !== 'undefined');
console.log('window.loginModal 存在:', typeof window.loginModal !== 'undefined');
console.log('LoginModal 類別存在:', typeof LoginModal !== 'undefined');

// 檢查 DOM 元素
const loginBtn = document.getElementById('login-btn');
const loginModal = document.getElementById('login-modal');

console.log('login-btn 元素存在:', !!loginBtn);
console.log('login-modal 元素存在:', !!loginModal);

if (loginBtn) {
    console.log('login-btn 內容:', loginBtn.textContent);
    console.log('login-btn 可見:', loginBtn.offsetParent !== null);
}

// 2. 事件監聽器檢查
console.log('\n=== 2. 事件監聽器檢查 ===');

// 檢查登入按鈕的事件監聽器
if (loginBtn) {
    // 嘗試獲取事件監聽器 (開發者工具中可用)
    if (typeof getEventListeners !== 'undefined') {
        const listeners = getEventListeners(loginBtn);
        console.log('login-btn 的事件監聽器:', listeners);
    } else {
        console.log('getEventListeners 不可用 (正常，在生產環境中)');
    }
    
    // 檢查 onclick 屬性
    console.log('login-btn onclick 屬性:', loginBtn.onclick);
}

// 3. 模態框檢查
console.log('\n=== 3. 模態框檢查 ===');

if (loginModal) {
    console.log('模態框 display 樣式:', window.getComputedStyle(loginModal).display);
    console.log('模態框 visibility 樣式:', window.getComputedStyle(loginModal).visibility);
    
    // 檢查模態框內的按鈕
    const googleBtn = document.getElementById('google-login-btn');
    const lineBtn = document.getElementById('line-login-btn');
    
    console.log('google-login-btn 存在:', !!googleBtn);
    console.log('line-login-btn 存在:', !!lineBtn);
    
    if (googleBtn) {
        console.log('Google 按鈕內容:', googleBtn.textContent);
        if (typeof getEventListeners !== 'undefined') {
            console.log('Google 按鈕事件監聽器:', getEventListeners(googleBtn));
        }
    }
    
    if (lineBtn) {
        console.log('LINE 按鈕內容:', lineBtn.textContent);
        if (typeof getEventListeners !== 'undefined') {
            console.log('LINE 按鈕事件監聽器:', getEventListeners(lineBtn));
        }
    }
}

// 4. 手動測試函數
console.log('\n=== 4. 手動測試函數 ===');

// 測試登入按鈕點擊
window.testLoginButton = function() {
    console.log('🧪 測試登入按鈕點擊...');
    
    if (loginBtn) {
        console.log('觸發登入按鈕點擊事件...');
        
        // 創建並派發點擊事件
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        
        const result = loginBtn.dispatchEvent(clickEvent);
        console.log('點擊事件派發結果:', result);
        
        // 檢查模態框是否顯示
        setTimeout(() => {
            const modal = document.getElementById('login-modal');
            if (modal) {
                const isVisible = window.getComputedStyle(modal).display !== 'none';
                console.log('模態框顯示狀態:', isVisible);
            }
        }, 100);
    } else {
        console.error('❌ 找不到登入按鈕');
    }
};

// 測試模態框顯示
window.testModalShow = function() {
    console.log('🧪 測試模態框顯示...');
    
    if (window.loginModal && typeof window.loginModal.show === 'function') {
        try {
            window.loginModal.show();
            console.log('✅ 模態框 show() 方法執行成功');
        } catch (error) {
            console.error('❌ 模態框 show() 方法執行失敗:', error);
        }
    } else if (window.app && window.app.loginModal) {
        try {
            window.app.loginModal.show();
            console.log('✅ app.loginModal.show() 方法執行成功');
        } catch (error) {
            console.error('❌ app.loginModal.show() 方法執行失敗:', error);
        }
    } else {
        console.error('❌ 找不到 loginModal 實例');
    }
};

// 測試 Google 登入按鈕
window.testGoogleLogin = function() {
    console.log('🧪 測試 Google 登入按鈕...');
    
    // 先顯示模態框
    window.testModalShow();
    
    setTimeout(() => {
        const googleBtn = document.getElementById('google-login-btn');
        if (googleBtn) {
            console.log('觸發 Google 登入按鈕點擊...');
            
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            
            googleBtn.dispatchEvent(clickEvent);
        } else {
            console.error('❌ 找不到 Google 登入按鈕');
        }
    }, 500);
};

// 測試 LINE 登入按鈕
window.testLineLogin = function() {
    console.log('🧪 測試 LINE 登入按鈕...');
    
    // 先顯示模態框
    window.testModalShow();
    
    setTimeout(() => {
        const lineBtn = document.getElementById('line-login-btn');
        if (lineBtn) {
            console.log('觸發 LINE 登入按鈕點擊...');
            
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            
            lineBtn.dispatchEvent(clickEvent);
        } else {
            console.error('❌ 找不到 LINE 登入按鈕');
        }
    }, 500);
};

// 5. 檢查 Console 錯誤
console.log('\n=== 5. 監聽新錯誤 ===');

const originalError = window.console.error;
window.console.error = function(...args) {
    console.log('🚨 Console 錯誤捕獲:', args);
    originalError.apply(console, args);
};

// 6. 檢查 OAuth 端點
console.log('\n=== 6. 檢查 OAuth 端點 ===');

window.testOAuthEndpoints = async function() {
    console.log('🧪 測試 OAuth 端點...');
    
    try {
        // 測試 Google OAuth
        console.log('測試 Google OAuth 端點...');
        const googleResponse = await fetch('/auth/google', { redirect: 'manual' });
        console.log('Google OAuth 回應:', {
            status: googleResponse.status,
            type: googleResponse.type,
            ok: googleResponse.ok
        });
        
        // 測試 LINE OAuth  
        console.log('測試 LINE OAuth 端點...');
        const lineResponse = await fetch('/auth/line', { redirect: 'manual' });
        console.log('LINE OAuth 回應:', {
            status: lineResponse.status,
            type: lineResponse.type,
            ok: lineResponse.ok
        });
        
    } catch (error) {
        console.error('❌ OAuth 端點測試失敗:', error);
    }
};

// 自動執行基本檢查
console.log('\n=== 自動執行基本檢查 ===');
console.log('可用的測試函數:');
console.log('- testLoginButton() - 測試登入按鈕');
console.log('- testModalShow() - 測試模態框顯示');
console.log('- testGoogleLogin() - 測試 Google 登入');
console.log('- testLineLogin() - 測試 LINE 登入');
console.log('- testOAuthEndpoints() - 測試 OAuth 端點');

console.log('\n診斷完成。請在 Console 中執行上述測試函數進行進一步測試。');