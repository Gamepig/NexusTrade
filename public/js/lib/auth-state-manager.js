/**
 * NexusTrade 認證狀態管理器
 * 解決前端後端狀態不同步問題
 * 
 * 功能：
 * 1. 強制狀態重新整理
 * 2. 狀態一致性驗證
 * 3. 自動同步機制
 * 4. 跨標籤頁狀態同步
 */

class AuthStateManager {
  constructor() {
    this.isValidating = false;
    this.lastValidation = 0;
    this.validationInterval = 5 * 60 * 1000; // 5分鐘
    
    this.initEventListeners();
    console.log('🔧 AuthStateManager 初始化完成');
  }

  /**
   * 初始化事件監聽器
   */
  initEventListeners() {
    // 監聽跨標籤頁狀態變化
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith('nexustrade_')) {
        console.log(`🔄 檢測到儲存變化: ${event.key}`);
        this.handleStorageChange(event.key, event.newValue);
      }
    });

    // 監聽網路狀態變化
    window.addEventListener('online', () => {
      console.log('🌐 網路連接恢復，執行狀態同步');
      this.forceAuthStateRefresh();
    });
  }

  /**
   * 處理儲存變化
   */
  handleStorageChange(key, newValue) {
    if (key === 'nexustrade_token' || key === 'nexustrade_user') {
      console.log(`🔄 ${key} 已變更，觸發狀態同步`);
      // 延遲同步，避免頻繁更新
      setTimeout(() => {
        this.validateAuthState();
      }, 1000);
    }
  }

  /**
   * 強制狀態重新整理
   * 清除本地狀態並重新從伺服器驗證
   */
  async forceAuthStateRefresh() {
    console.log('🔄 執行強制狀態重新整理');
    
    try {
      // 保存原有的認證資訊以便恢復
      const originalToken = this.getLocalToken();
      const originalUser = this.getLocalUser();
      
      // 如果沒有 token，直接回傳 false
      if (!originalToken) {
        console.log('❌ 沒有認證 token，無法重新整理');
        this.clearLocalAuth();
        this.handleAuthExpired();
        return false;
      }
      
      // 清除本地狀態
      this.clearLocalAuth();
      
      // 嘗試從伺服器重新驗證
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${originalToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const authData = await response.json();
        console.log('✅ 伺服器狀態驗證成功');
        
        // 更新本地狀態
        this.updateLocalAuthState(authData);
        
        // 觸發狀態更新事件
        this.triggerAuthStateUpdate();
        
        return true;
      } else if (response.status === 401) {
        console.log('🔒 認證已過期，需要重新登入');
        this.handleAuthExpired();
        return false;
      } else {
        // 如果驗證失敗但非401，恢復原狀態
        console.warn('⚠️ 狀態驗證失敗，恢復原狀態');
        if (originalToken) localStorage.setItem('nexustrade_token', originalToken);
        if (originalUser) localStorage.setItem('nexustrade_user', JSON.stringify(originalUser));
        return false;
      }
    } catch (error) {
      console.error('❌ 強制狀態重新整理失敗:', error);
      return false;
    }
  }

  /**
   * 驗證本地狀態與伺服器狀態一致性
   */
  async validateAuthState() {
    // 防止重複驗證
    const now = Date.now();
    if (this.isValidating || (now - this.lastValidation) < 30000) {
      return;
    }

    this.isValidating = true;
    this.lastValidation = now;

    try {
      console.log('🔍 驗證認證狀態一致性');
      
      const localAuth = this.getLocalAuthState();
      const serverAuth = await this.checkServerAuthStatus();

      if (!serverAuth) {
        console.log('⚠️ 無法檢查伺服器狀態');
        this.isValidating = false;
        return;
      }

      // 比較本地和伺服器狀態
      const isConsistent = this.compareAuthStates(localAuth, serverAuth);
      
      if (!isConsistent) {
        console.warn('⚠️ 檢測到狀態不一致，執行同步');
        await this.syncToServerState(serverAuth);
      } else {
        console.log('✅ 認證狀態一致');
      }

    } catch (error) {
      console.error('❌ 狀態驗證失敗:', error);
    } finally {
      this.isValidating = false;
    }
  }

  /**
   * 檢查伺服器認證狀態
   */
  async checkServerAuthStatus() {
    try {
      const token = this.getLocalToken();
      if (!token) return null;

      const response = await fetch('/api/line/bind/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          isAuthenticated: true,
          isBound: data.data?.isBound || false,
          user: data.data?.user || null
        };
      } else if (response.status === 401) {
        return {
          isAuthenticated: false,
          isBound: false,
          user: null
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ 檢查伺服器狀態失敗:', error);
      return null;
    }
  }

  /**
   * 比較本地和伺服器狀態
   */
  compareAuthStates(localAuth, serverAuth) {
    if (!localAuth.isAuthenticated && !serverAuth.isAuthenticated) {
      return true; // 都未認證，一致
    }

    if (localAuth.isAuthenticated !== serverAuth.isAuthenticated) {
      console.log(`🔍 認證狀態不一致: 本地=${localAuth.isAuthenticated}, 伺服器=${serverAuth.isAuthenticated}`);
      return false;
    }

    if (localAuth.isBound !== serverAuth.isBound) {
      console.log(`🔍 LINE 綁定狀態不一致: 本地=${localAuth.isBound}, 伺服器=${serverAuth.isBound}`);
      return false;
    }

    return true;
  }

  /**
   * 同步到伺服器狀態
   */
  async syncToServerState(serverAuth) {
    console.log('🔄 同步到伺服器狀態:', serverAuth);
    
    if (!serverAuth.isAuthenticated) {
      this.clearLocalAuth();
      this.handleAuthExpired();
    } else {
      // 更新本地狀態
      const authData = {
        user: serverAuth.user,
        isBound: serverAuth.isBound
      };
      this.updateLocalAuthState(authData);
    }

    // 觸發狀態更新事件
    this.triggerAuthStateUpdate();
  }

  /**
   * 取得本地認證狀態
   */
  getLocalAuthState() {
    const token = this.getLocalToken();
    const user = this.getLocalUser();
    
    return {
      isAuthenticated: !!token && !!user,
      isBound: user?.lineId ? true : false,
      user: user
    };
  }

  /**
   * 取得本地 Token
   */
  getLocalToken() {
    return localStorage.getItem('nexustrade_token') || 
           sessionStorage.getItem('nexustrade_token');
  }

  /**
   * 取得本地使用者資訊
   */
  getLocalUser() {
    try {
      const userStr = localStorage.getItem('nexustrade_user') || 
                     sessionStorage.getItem('nexustrade_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('❌ 解析使用者資訊失敗:', error);
      return null;
    }
  }

  /**
   * 清除本地認證資訊
   */
  clearLocalAuth() {
    localStorage.removeItem('nexustrade_token');
    localStorage.removeItem('nexustrade_user');
    sessionStorage.removeItem('nexustrade_token');
    sessionStorage.removeItem('nexustrade_user');
    
    // 清除全域使用者狀態
    if (window.currentUser) {
      window.currentUser = null;
    }
    
    console.log('🗑️ 已清除本地認證資訊');
  }

  /**
   * 更新本地認證狀態
   */
  updateLocalAuthState(authData) {
    if (authData.token) {
      localStorage.setItem('nexustrade_token', authData.token);
    }
    
    if (authData.user) {
      localStorage.setItem('nexustrade_user', JSON.stringify(authData.user));
      window.currentUser = authData.user;
    }
    
    console.log('✅ 本地認證狀態已更新');
  }

  /**
   * 處理認證過期
   */
  handleAuthExpired() {
    console.log('🔒 處理認證過期');
    
    // 清除所有認證資訊
    this.clearLocalAuth();
    
    // 顯示登入提示（如果需要）
    if (typeof window.showLoginModal === 'function') {
      console.log('📱 顯示登入模態框');
      window.showLoginModal();
    }
    
    // 觸發認證過期事件
    window.dispatchEvent(new CustomEvent('authExpired'));
  }

  /**
   * 觸發狀態更新事件
   */
  triggerAuthStateUpdate() {
    // 使用自定義事件通知其他組件狀態已更新
    window.dispatchEvent(new CustomEvent('authStateUpdated', {
      detail: this.getLocalAuthState()
    }));
    
    // 使用 localStorage 事件觸發跨標籤頁同步
    const syncData = {
      timestamp: Date.now(),
      state: this.getLocalAuthState()
    };
    
    localStorage.setItem('auth_sync_trigger', JSON.stringify(syncData));
    localStorage.removeItem('auth_sync_trigger');
    
    console.log('📡 已觸發狀態更新事件');
  }

  /**
   * 等待認證狀態穩定（用於組件初始化）
   */
  async waitForAuthStability(timeout = 3000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkStability = () => {
        if (!this.isValidating || (Date.now() - startTime) > timeout) {
          resolve(this.getLocalAuthState());
        } else {
          setTimeout(checkStability, 100);
        }
      };
      
      checkStability();
    });
  }

  /**
   * 取得認證 Token (相容觀察清單實作範例)
   * 提供給其他組件使用的簡化介面
   */
  getToken() {
    return this.getLocalToken();
  }

  /**
   * 檢查 Token 是否過期
   * 解析 JWT payload 中的 exp 欄位
   */
  isTokenExpired() {
    const token = this.getLocalToken();
    if (!token) return true;
    
    try {
      // 解析 JWT payload (Base64 解碼)
      const base64Payload = token.split('.')[1];
      const payload = JSON.parse(atob(base64Payload));
      
      // 檢查過期時間 (exp 為 Unix 時間戳，需轉換為毫秒)
      return payload.exp * 1000 <= Date.now();
    } catch (error) {
      console.error('❌ 解析 Token 過期時間失敗:', error);
      return true; // 解析失敗視為過期
    }
  }

  /**
   * 從 Token 解析 User ID
   * 用於 API 請求的使用者識別
   */
  getUserId() {
    const token = this.getLocalToken();
    if (!token) return null;
    
    try {
      const base64Payload = token.split('.')[1];
      const payload = JSON.parse(atob(base64Payload));
      return payload.userId || null;
    } catch (error) {
      console.error('❌ 解析 User ID 失敗:', error);
      return null;
    }
  }

  /**
   * 檢查是否已認證 (token 存在且未過期)
   */
  isAuthenticated() {
    const token = this.getLocalToken();
    return token && !this.isTokenExpired();
  }

  /**
   * 取得使用者資訊 (包含 User ID)
   */
  getUserInfo() {
    if (!this.isAuthenticated()) return null;
    
    const user = this.getLocalUser();
    const userId = this.getUserId();
    
    return {
      ...user,
      userId: userId
    };
  }
}

// 創建全域實例
window.authStateManager = new AuthStateManager();

// 導出類別以供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthStateManager;
}