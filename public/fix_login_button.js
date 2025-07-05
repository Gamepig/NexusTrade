/**
 * 快速修復登入按鈕顯示問題
 * 在瀏覽器 Console 中執行此腳本
 */

(function fixLoginButton() {
    console.log('🔧 開始修復登入按鈕...');
    
    // 1. 檢查當前 localStorage 狀態
    const authData = {
        token: localStorage.getItem('nexustrade_token'),
        user: localStorage.getItem('nexustrade_user'),
        refreshToken: localStorage.getItem('nexustrade_refresh_token')
    };
    
    console.log('📊 當前認證資料:', authData);
    
    // 2. 檢查是否有無效的認證狀態
    const hasIncompleteAuth = authData.token && !authData.user;
    
    if (hasIncompleteAuth) {
        console.log('⚠️ 檢測到不完整的認證狀態，清除...');
        localStorage.removeItem('nexustrade_token');
        localStorage.removeItem('nexustrade_refresh_token');
        localStorage.removeItem('nexustrade_user');
        localStorage.removeItem('nexustrade_line_bound');
    }
    
    // 3. 確保登入按鈕可見
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.style.display = 'inline-block';
        console.log('✅ 登入按鈕已顯示');
        
        // 確保點擊事件存在
        if (!loginBtn.onclick && window.authManager) {
            loginBtn.addEventListener('click', () => {
                window.authManager.showLoginModal();
            });
            console.log('✅ 登入按鈕事件已設定');
        }
    } else {
        console.log('❌ 找不到登入按鈕元素');
    }
    
    // 4. 移除可能存在的使用者選單
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) {
        userMenu.remove();
        console.log('✅ 舊的使用者選單已移除');
    }
    
    // 5. 重新初始化 AuthManager（如果存在）
    if (window.authManager) {
        console.log('🔄 重新初始化 AuthManager...');
        window.authManager.authState = {
            isAuthenticated: false,
            token: null,
            refreshToken: null,
            user: null,
            lineConnected: false
        };
        window.authManager.updateUI();
        console.log('✅ AuthManager 已重新初始化');
    }
    
    console.log('🎉 登入按鈕修復完成！');
})();