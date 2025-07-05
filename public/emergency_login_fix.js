/**
 * 緊急登入按鈕修復腳本
 * 
 * 此腳本將：
 * 1. 強制創建登入按鈕
 * 2. 設定點擊事件
 * 3. 清理無效狀態
 */

console.log('🚨 開始緊急修復登入按鈕...');

// 1. 檢查並創建登入按鈕
function createLoginButton() {
    let loginBtn = document.getElementById('login-btn');
    
    if (!loginBtn) {
        console.log('❌ 登入按鈕不存在，創建新的...');
        
        // 查找容器
        const container = document.querySelector('.header-actions') || 
                         document.querySelector('.header-right') ||
                         document.querySelector('header .container div:last-child');
        
        if (container) {
            loginBtn = document.createElement('button');
            loginBtn.id = 'login-btn';
            loginBtn.className = 'btn btn-secondary';
            loginBtn.textContent = '登入';
            loginBtn.style.cssText = `
                padding: 8px 16px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                display: inline-block;
            `;
            
            container.appendChild(loginBtn);
            console.log('✅ 登入按鈕已創建');
        } else {
            console.error('❌ 找不到合適的容器來放置登入按鈕');
            return null;
        }
    } else {
        console.log('✅ 登入按鈕已存在');
        loginBtn.style.display = 'inline-block';
    }
    
    return loginBtn;
}

// 2. 設定登入功能
function setupLoginFunction(loginBtn) {
    if (!loginBtn) return;
    
    // 移除舊的事件監聽器
    const newBtn = loginBtn.cloneNode(true);
    loginBtn.parentNode.replaceChild(newBtn, loginBtn);
    
    // 添加新的點擊事件
    newBtn.addEventListener('click', function() {
        console.log('🔐 登入按鈕被點擊');
        
        // 創建簡單的登入模態框
        showSimpleLoginModal();
    });
    
    console.log('✅ 登入事件已設定');
    return newBtn;
}

// 3. 簡單的登入模態框
function showSimpleLoginModal() {
    // 移除舊的模態框
    const oldModal = document.getElementById('emergency-login-modal');
    if (oldModal) oldModal.remove();
    
    const modalHTML = `
        <div id="emergency-login-modal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <div style="
                background: white;
                padding: 30px;
                border-radius: 8px;
                max-width: 400px;
                width: 90%;
                text-align: center;
            ">
                <h2 style="margin-bottom: 20px;">登入 NexusTrade</h2>
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <button onclick="window.location.href='/api/auth/google'" style="
                        padding: 12px 20px;
                        background: #4285f4;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 16px;
                    ">
                        🌟 使用 Google 登入
                    </button>
                    <button onclick="window.location.href='/api/auth/line'" style="
                        padding: 12px 20px;
                        background: #00c300;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 16px;
                    ">
                        💬 使用 LINE 登入
                    </button>
                    <button onclick="document.getElementById('emergency-login-modal').remove()" style="
                        padding: 8px 16px;
                        background: #6c757d;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">
                        取消
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 4. 清理無效狀態
function cleanupInvalidState() {
    // 清除可能導致問題的 localStorage 項目
    const keysToCheck = [
        'nexustrade_token', 'nexustrade_refresh_token', 'nexustrade_user',
        'nexustrade_line_bound', 'nexustrade_return_state'
    ];
    
    let hasInvalidState = false;
    keysToCheck.forEach(key => {
        const value = localStorage.getItem(key);
        if (value && (value === 'null' || value === 'undefined')) {
            localStorage.removeItem(key);
            hasInvalidState = true;
        }
    });
    
    if (hasInvalidState) {
        console.log('🧹 已清理無效的 localStorage 狀態');
    }
    
    // 移除可能存在的無效使用者選單
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) {
        userMenu.remove();
        console.log('🧹 已移除舊的使用者選單');
    }
}

// 執行修復
cleanupInvalidState();
const loginBtn = createLoginButton();
setupLoginFunction(loginBtn);

console.log('🎉 緊急修復完成！登入按鈕應該現在可以使用了。');

// 提供測試函數
window.testLogin = function() {
    showSimpleLoginModal();
};

console.log('💡 如需測試，請在 Console 執行: testLogin()');