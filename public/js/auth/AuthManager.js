/**
 * 全新的認證管理器 - 完全重寫的 OAuth 系統
 * 
 * 解決所有已知問題：
 * - Token 被意外清除
 * - 前端後端狀態不同步
 * - UI 更新失敗
 * - OAuth 回調處理問題
 */

class AuthManager {
  constructor() {
    this.isInitialized = false;
    this.authState = {
      isAuthenticated: false,
      token: null,
      refreshToken: null,
      user: null,
      lineConnected: false
    };
    
    this.eventListeners = {
      login: [],
      logout: [],
      stateChange: []
    };
    
    this.STORAGE_KEYS = {
      TOKEN: 'nexustrade_token',
      REFRESH_TOKEN: 'nexustrade_refresh_token',
      USER: 'nexustrade_user',
      LINE_BOUND: 'nexustrade_line_bound'
    };
    
    this.init();
  }
  
  /**
   * 初始化認證管理器
   */
  async init() {
    console.log('🔐 AuthManager 初始化開始...');
    
    // 設置全域實例
    window.authManager = this;
    
    // 載入儲存的認證狀態
    this.loadStoredAuthState();
    
    // 檢查 OAuth 回調
    this.handleOAuthCallback();
    
    // 如果有認證狀態，嘗試恢復
    if (this.authState.token) {
      await this.validateAndRestoreSession();
    }
    
    // 設置 UI 事件監聽器
    this.setupEventListeners();
    
    // 更新 UI
    this.updateUI();
    
    this.isInitialized = true;
    console.log('✅ AuthManager 初始化完成');
    
    // 觸發狀態變化事件
    this.emitStateChange();
  }
  
  /**
   * 載入儲存的認證狀態
   */
  loadStoredAuthState() {
    try {
      const token = localStorage.getItem(this.STORAGE_KEYS.TOKEN);
      const refreshToken = localStorage.getItem(this.STORAGE_KEYS.REFRESH_TOKEN);
      const userString = localStorage.getItem(this.STORAGE_KEYS.USER);
      const lineConnected = localStorage.getItem(this.STORAGE_KEYS.LINE_BOUND) === 'true';
      
      // 🔧 修復：更嚴格的認證狀態檢查
      if (token && userString) {
        const user = JSON.parse(userString);
        
        // 檢查 user 資料是否有效
        if (user && user.name && (user.email || user.provider)) {
          // 自動判斷 LINE 連接狀態，優先使用 lineUserId
          const autoLineConnected = !!(user.lineUserId || user.lineId || (user.provider === 'line'));
          
          this.authState = {
            isAuthenticated: true,
            token,
            refreshToken,
            user,
            lineConnected: autoLineConnected
          };
          
          console.log('📱 已載入有效的認證狀態:', {
            hasToken: !!token,
            hasUser: !!user,
            userName: user.name,
            provider: user.provider,
            lineConnected
          });
        } else {
          console.warn('⚠️ 使用者資料無效，清除認證狀態');
          this.clearAuthState();
        }
      } else if (token && !userString) {
        console.warn('⚠️ 有 token 但沒有使用者資料，清除不完整的認證狀態');
        this.clearAuthState();
      } else {
        console.log('📱 沒有儲存的認證狀態');
        this.authState = {
          isAuthenticated: false,
          token: null,
          refreshToken: null,
          user: null,
          lineConnected: false
        };
      }
    } catch (error) {
      console.error('❌ 載入認證狀態失敗:', error);
      this.clearAuthState();
    }
  }
  
  /**
   * 處理 OAuth 回調
   */
  handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const provider = urlParams.get('provider');
    const error = urlParams.get('error');
    
    if (error) {
      console.error('❌ OAuth 錯誤:', error);
      this.showNotification('登入失敗: ' + error, 'error');
      this.clearOAuthParams();
      return;
    }
    
    if (token && provider) {
      console.log('✅ 檢測到 OAuth 回調:', { provider, hasToken: !!token });
      
      const userData = {
        name: urlParams.get('userName') || '使用者',
        email: urlParams.get('userEmail') || '',
        avatar: urlParams.get('userAvatar') || 'https://via.placeholder.com/40',
        provider: provider,
        lineUserId: urlParams.get('lineUserId') || null // 添加 LINE User ID
      };
      
      const refreshToken = urlParams.get('refreshToken');
      
      // 立即保存認證狀態
      this.setAuthState(token, userData, refreshToken);
      
      // 清除 URL 參數
      this.clearOAuthParams();
      
      // 顯示成功通知
      this.showNotification(`${provider.toUpperCase()} 登入成功！歡迎 ${userData.name}`, 'success');
      
      // 處理返回狀態
      this.handleReturnState();
    }
  }
  
  /**
   * 設置認證狀態
   */
  setAuthState(token, user, refreshToken = null) {
    // 自動判斷 LINE 連接狀態
    const lineConnected = !!(user.lineUserId || user.lineId || (user.provider === 'line'));
    
    this.authState = {
      isAuthenticated: true,
      token,
      refreshToken,
      user,
      lineConnected
    };
    
    // 保存到 localStorage
    localStorage.setItem(this.STORAGE_KEYS.TOKEN, token);
    if (refreshToken) {
      localStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    localStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(user));
    
    console.log('💾 認證狀態已保存:', {
      token: token.substring(0, 20) + '...',
      user: user.name,
      provider: user.provider
    });
    
    // 更新 UI
    this.updateUI();
    
    // 觸發登入事件
    this.emitLogin(user);
    this.emitStateChange();
  }
  
  /**
   * 清除認證狀態
   */
  clearAuthState() {
    this.authState = {
      isAuthenticated: false,
      token: null,
      refreshToken: null,
      user: null,
      lineConnected: false
    };
    
    // 清除 localStorage
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('🧹 認證狀態已清除');
    
    // 更新 UI
    this.updateUI();
    
    // 觸發登出事件
    this.emitLogout();
    this.emitStateChange();
  }
  
  /**
   * 驗證並恢復會話
   */
  async validateAndRestoreSession() {
    if (!this.authState.token) return;
    
    // 如果是測試 token，跳過驗證
    if (this.isTestToken(this.authState.token)) {
      console.log('🧪 測試 token，跳過驗證');
      return;
    }
    
    try {
      console.log('🔍 驗證會話有效性...');
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${this.authState.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ 會話驗證成功');
        
        // 如果沒有使用者資料，從 API 取得
        if (!this.authState.user && data.user) {
          this.authState.user = data.user;
          localStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(data.user));
        }
      } else {
        console.warn('⚠️ 會話驗證失敗，但保留本地狀態');
        // 不清除狀態，允許離線使用
      }
    } catch (error) {
      console.warn('⚠️ 會話驗證錯誤，保留本地狀態:', error);
      // 不清除狀態，允許離線使用
    }
  }
  
  /**
   * 檢查是否為測試 token
   */
  isTestToken(token) {
    return token && (
      token.includes('test') || 
      token.startsWith('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIi')
    );
  }
  
  /**
   * 更新 UI
   */
  updateUI() {
    const loginBtn = document.getElementById('login-btn');
    const userMenu = document.querySelector('.user-menu');
    
    if (this.authState.isAuthenticated && this.authState.user) {
      // 已登入狀態
      if (loginBtn) {
        loginBtn.style.display = 'none';
      }
      
      // 移除舊的使用者選單
      if (userMenu) {
        userMenu.remove();
      }
      
      // 創建新的使用者選單
      this.createUserMenu();
    } else {
      // 未登入狀態
      if (loginBtn) {
        loginBtn.style.display = 'inline-block';
      }
      
      if (userMenu) {
        userMenu.remove();
      }
    }
  }
  
  /**
   * 創建使用者選單
   */
  createUserMenu() {
    const headerRight = document.querySelector('.header-actions') || document.querySelector('.header-right');
    if (!headerRight) {
      console.warn('⚠️ 找不到 header 容器，無法創建使用者選單');
      return;
    }
    
    const user = this.authState.user;
    const userMenuHTML = `
      <div class="user-menu">
        <button class="user-profile-btn" id="user-profile-btn">
          <img src="${user.avatar}" alt="${user.name}" class="user-avatar" 
               onerror="this.src='https://via.placeholder.com/40'">
          <span class="user-name">${user.name}</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        <div class="user-dropdown" id="user-dropdown" style="display: none;">
          <button class="dropdown-item" onclick="window.authManager.logout()">
            <span class="icon">🚪</span> 登出
          </button>
        </div>
      </div>
    `;
    
    headerRight.insertAdjacentHTML('beforeend', userMenuHTML);
    
    // 設定事件監聽器
    const profileBtn = document.getElementById('user-profile-btn');
    const dropdown = document.getElementById('user-dropdown');
    
    if (profileBtn && dropdown) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = dropdown.style.display !== 'none';
        dropdown.style.display = isVisible ? 'none' : 'block';
      });
      
      // 點擊其他地方關閉下拉選單
      document.addEventListener('click', () => {
        dropdown.style.display = 'none';
      });
    }
  }
  
  /**
   * 登入
   */
  async login(provider = 'google') {
    console.log(`🔐 開始 ${provider.toUpperCase()} 登入...`);
    
    // 保存當前頁面狀態
    const currentPath = window.location.pathname + window.location.search + window.location.hash;
    localStorage.setItem('nexustrade_return_state', currentPath);
    
    // 重定向到 OAuth
    let authUrl;
    switch (provider) {
      case 'google':
        authUrl = '/api/auth/google';
        break;
      case 'line':
        authUrl = '/api/auth/line';
        break;
      default:
        console.error('❌ 不支援的登入提供者:', provider);
        return;
    }
    
    window.location.href = authUrl;
  }
  
  /**
   * 登出
   */
  logout() {
    console.log('👋 使用者登出');
    this.clearAuthState();
    this.showNotification('已成功登出', 'success');
  }
  
  /**
   * 處理返回狀態
   */
  handleReturnState() {
    const returnState = localStorage.getItem('nexustrade_return_state');
    if (returnState) {
      localStorage.removeItem('nexustrade_return_state');
      
      setTimeout(() => {
        window.location.href = returnState;
      }, 1000);
    }
  }
  
  /**
   * 清除 OAuth URL 參數
   */
  clearOAuthParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthParams = ['token', 'refreshToken', 'oauth', 'provider', 'userName', 'userEmail', 'userAvatar', 'error'];
    
    let hasOAuthParams = false;
    oauthParams.forEach(param => {
      if (urlParams.has(param)) {
        hasOAuthParams = true;
        urlParams.delete(param);
      }
    });
    
    if (hasOAuthParams) {
      const newUrl = window.location.pathname + 
        (urlParams.toString() ? '?' + urlParams.toString() : '') + 
        window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }
  }
  
  /**
   * 設置事件監聽器
   */
  setupEventListeners() {
    // 登入按鈕
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        this.showLoginModal();
      });
    }
  }
  
  /**
   * 顯示登入模態框
   */
  showLoginModal() {
    // 創建簡單的登入選擇模態框
    const modalHTML = `
      <div id="auth-modal" class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
        <div class="modal-content" style="background: white; padding: 30px; border-radius: 8px; max-width: 400px; width: 90%;">
          <h2 style="margin-bottom: 20px; text-align: center;">登入 NexusTrade</h2>
          <div style="display: flex; flex-direction: column; gap: 15px;">
            <button onclick="window.authManager.login('google')" style="padding: 12px 20px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
              🌟 使用 Google 登入
            </button>
            <button onclick="window.authManager.login('line')" style="padding: 12px 20px; background: #00c300; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
              💬 使用 LINE 登入
            </button>
            <button onclick="document.getElementById('auth-modal').remove()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
              取消
            </button>
          </div>
        </div>
      </div>
    `;
    
    // 移除舊的模態框
    const oldModal = document.getElementById('auth-modal');
    if (oldModal) oldModal.remove();
    
    // 插入新的模態框
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
  
  /**
   * 顯示通知
   */
  showNotification(message, type = 'info') {
    // 創建通知元素
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
      color: white;
      padding: 15px 20px;
      border-radius: 4px;
      z-index: 1001;
      max-width: 300px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 3秒後移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
  
  /**
   * 事件系統
   */
  on(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
    }
  }
  
  off(event, callback) {
    if (this.eventListeners[event]) {
      const index = this.eventListeners[event].indexOf(callback);
      if (index > -1) {
        this.eventListeners[event].splice(index, 1);
      }
    }
  }
  
  emitLogin(user) {
    this.eventListeners.login.forEach(callback => callback(user));
  }
  
  emitLogout() {
    this.eventListeners.logout.forEach(callback => callback());
  }
  
  emitStateChange() {
    this.eventListeners.stateChange.forEach(callback => callback(this.authState));
  }
  
  /**
   * 獲取認證狀態
   */
  getAuthState() {
    return { ...this.authState };
  }
  
  /**
   * 檢查是否已認證
   */
  isAuthenticated() {
    return this.authState.isAuthenticated && !!this.authState.token;
  }
  
  /**
   * 獲取使用者資訊
   */
  getUser() {
    return this.authState.user;
  }
  
  /**
   * 獲取 token
   */
  getToken() {
    return this.authState.token;
  }
}

// 自動初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 開始初始化 AuthManager...');
  window.authManager = new AuthManager();
});

// 如果 DOM 已經載入完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.authManager) {
      window.authManager = new AuthManager();
    }
  });
} else {
  if (!window.authManager) {
    window.authManager = new AuthManager();
  }
}