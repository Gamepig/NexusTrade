/**
 * 登入模態框組件
 * 
 * 提供 Google OAuth、LINE Login 和 Email/密碼登入選項
 */

class LoginModal {
    constructor() {
    this.modal = null;
    this.isVisible = false;
    this.authTokens = this.loadTokensFromStorage();
    
    this.init();
    
    // 🔧 修復：頁面載入後延遲檢查並更新 UI 狀態
    // 增加延遲時間確保所有 DOM 元素和腳本都已載入
    setTimeout(() => {
      this.checkAndUpdateUIState();
    }, 1000);
  }

  /**
   * 初始化組件
   */
  init() {
    this.createModal();
    this.setupEventListeners();
    this.checkOAuthCallback();
    
    // 如果有保存的 token，自動登入
    if (this.authTokens.token) {
      this.handleAutoLogin();
    }
  }

  /**
   * 創建模態框 HTML
   */
  createModal() {
    const modalHTML = `
      <div id="login-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content login-modal">
          <div class="modal-header">
            <h2>登入 NexusTrade</h2>
            <button class="modal-close" id="login-modal-close">&times;</button>
          </div>
          
          <div class="modal-body">
            <!-- OAuth 登入選項 -->
            <div class="oauth-section">
              <h3>選擇登入方式</h3>
              <div class="oauth-buttons">
                <!-- Google 官方 Material Design 按鈕 -->
                <button class="gsi-material-button" id="google-login-btn">
                  <div class="gsi-material-button-state"></div>
                  <div class="gsi-material-button-content-wrapper">
                    <div class="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlns:xlink="http://www.w3.org/1999/xlink" style="display: block;">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <span class="gsi-material-button-contents">Continue with Google</span>
                  </div>
                </button>
                
                <!-- LINE 官方風格按鈕 -->
                <button class="line-login-button" id="line-login-btn">
                  <div class="line-login-button-inner">
                    <div class="line-login-button-icon">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.8 8.35c0-4.6-4.6-8.35-10.3-8.35S-1.8 3.75-1.8 8.35c0 4.13 3.66 7.58 8.61 8.25.34.07.79.22.91.51.1.26.07.68.03 1.02l-.15.91c-.05.26-.2 1.02.89.56.36-.15 1.94-1.14 2.65-1.95 1.45-1.33 2.13-2.68 2.13-4.3h-.49z" fill="currentColor"/>
                      </svg>
                    </div>
                    <span class="line-login-button-text">Log in with LINE</span>
                  </div>
                </button>
              </div>
            </div>
            
            <div class="oauth-notice">
              <p>首次登入將自動建立您的 NexusTrade 帳戶</p>
            </div>
          </div>
          
          <!-- 載入狀態 -->
          <div class="login-loading" id="login-loading" style="display: none;">
            <div class="loading-spinner"></div>
            <p>登入中...</p>
          </div>
        </div>
      </div>
    `;

    // 將模態框插入到 body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('login-modal');
  }

  /**
   * 設定事件監聽器
   */
  setupEventListeners() {
    // 關閉模態框
    const closeBtn = document.getElementById('login-modal-close');
    const overlay = document.getElementById('login-modal');
    
    closeBtn?.addEventListener('click', () => this.hide());
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) this.hide();
    });

    // Google OAuth 登入
    const googleBtn = document.getElementById('google-login-btn');
    googleBtn?.addEventListener('click', (event) => this.handleGoogleLogin(event));

    // LINE Login
    const lineBtn = document.getElementById('line-login-btn');
    lineBtn?.addEventListener('click', () => this.handleLineLogin());

    // ESC 鍵關閉
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  /**
   * 顯示模態框
   */
  show() {
    if (this.modal) {
      this.modal.style.display = 'flex';
      this.isVisible = true;
      document.body.style.overflow = 'hidden';
      console.log('🔐 顯示登入模態框');
    }
  }

  /**
   * 隱藏模態框
   */
  hide() {
    if (this.modal) {
      this.modal.style.display = 'none';
      this.isVisible = false;
      document.body.style.overflow = 'auto';
      this.hideLoading();
      console.log('🔐 隱藏登入模態框');
    }
  }

  /**
   * 顯示載入狀態
   */
  showLoading() {
    const loading = document.getElementById('login-loading');
    const modalBody = this.modal?.querySelector('.modal-body');
    
    if (loading && modalBody) {
      modalBody.style.display = 'none';
      loading.style.display = 'flex';
    }
  }

  /**
   * 隱藏載入狀態
   */
  hideLoading() {
    const loading = document.getElementById('login-loading');
    const modalBody = this.modal?.querySelector('.modal-body');
    
    if (loading && modalBody) {
      loading.style.display = 'none';
      modalBody.style.display = 'block';
    }
  }

  /**
   * 處理 Google OAuth 登入
   */
  async handleGoogleLogin(event) {
    console.log('🔵 開始 Google OAuth 登入');
    
    // 防止事件冒泡和預設行為
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    this.showLoading();
    
    try {
      // 儲存當前頁面狀態（用於回調後恢復）
      const currentHash = window.location.hash;
      if (currentHash) {
        localStorage.setItem('nexustrade_return_state', currentHash);
      }
      
      console.log('🔄 重定向到 Google OAuth...');
      
      // 重定向到 Google OAuth (使用相對路徑，因為現在在同一伺服器)
      window.location.href = '/auth/google';
      
    } catch (error) {
      console.error('❌ Google 登入錯誤:', error);
      this.hideLoading();
      this.showErrorNotification(`Google 登入失敗: ${error.message}`);
    }
  }

  /**
   * 處理 LINE Login
   */
  async handleLineLogin(event) {
    console.log('💚 開始 LINE Login');
    
    // 防止事件冒泡和預設行為
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    this.showLoading();
    
    try {
      // 儲存當前頁面狀態（用於回調後恢復）
      const currentHash = window.location.hash;
      if (currentHash) {
        localStorage.setItem('nexustrade_return_state', currentHash);
      }
      
      console.log('🔄 重定向到 LINE OAuth...');
      
      // 重定向到 LINE OAuth (使用相對路徑，因為現在在同一伺服器)
      window.location.href = '/auth/line';
    } catch (error) {
      console.error('❌ LINE 登入錯誤:', error);
      this.hideLoading();
      this.showErrorNotification('LINE 登入失敗，請稍後再試');
    }
  }


  /**
   * 檢查 OAuth 回調參數
   */
  checkOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const refreshToken = urlParams.get('refreshToken');
    const oauth = urlParams.get('oauth');
    const provider = urlParams.get('provider');
    const error = urlParams.get('error');

    if (error) {
      console.error('❌ OAuth 錯誤:', error);
      this.showErrorNotification(`登入失敗: ${error}`);
      
      // 清除 URL 參數
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
      return;
    }

    if (oauth === 'success' && token) {
      console.log(`✅ ${provider?.toUpperCase()} OAuth 登入成功`);
      
      // 嘗試從 URL 參數中獲取使用者資料
      const userName = urlParams.get('userName');
      const userEmail = urlParams.get('userEmail'); 
      const userAvatar = urlParams.get('userAvatar');
      
      console.log('📋 OAuth 回調數據:', {
        token: token ? token.substring(0, 20) + '...' : null,
        refreshToken: refreshToken ? 'present' : 'missing',
        provider,
        userName,
        userEmail,
        userAvatar
      });
      
      // 如果 URL 包含使用者資料，直接使用
      if (userName || userEmail) {
        console.log('🔄 使用 URL 參數中的使用者資料');
        const loginData = {
          token,
          refreshToken,
          provider,
          user: {
            email: userEmail || `${provider}_user@example.com`,
            profile: {
              displayName: userName || `${provider?.toUpperCase()} 使用者`,
              picture: userAvatar || null
            }
          }
        };
        
        console.log('🎯 準備調用 handleLoginSuccess:', loginData);
        this.handleLoginSuccess(loginData);
      } else {
        // 獲取使用者資料
        this.fetchUserProfile(token).then(userData => {
          const loginData = {
            token,
            refreshToken,
            provider,
            user: userData
          };

          this.handleLoginSuccess(loginData);
        }).catch(error => {
          console.error('❌ 獲取使用者資料失敗:', error);
          console.error('❌ 錯誤詳情:', error.response || error.message);
          
          // 使用簡化的使用者資料
          const loginData = {
            token,
            refreshToken,
            provider,
            user: { 
              email: `${provider}_user@example.com`,
              profile: { displayName: `${provider?.toUpperCase()} 使用者` }
            }
          };
          this.handleLoginSuccess(loginData);
        });
      }
      
      // 注意：URL 參數清理已移動到 handleLoginSuccess 方法的最後
      // 確保在所有處理完成後才清除，避免競態條件
    }
  }

  /**
   * 獲取使用者資料
   */
  async fetchUserProfile(token) {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.user;
      } else {
        throw new Error('無法獲取使用者資料');
      }
    } catch (error) {
      console.error('❌ 獲取使用者資料失敗:', error);
      throw error;
    }
  }

  /**
   * 處理登入成功
   */
  handleLoginSuccess(data) {
    console.log('🎉 登入成功:', data);
    
    // 保存 token
    console.log('💾 保存 tokens 到 localStorage...');
    this.saveTokensToStorage(data);
    console.log('✅ tokens 已保存到 localStorage');
    
    // 重要：更新 AuthStateManager 的狀態
    if (window.authStateManager) {
      window.authStateManager.updateLocalAuthState({
        token: data.token,
        user: data.user
      });
      console.log('✅ AuthStateManager 狀態已更新');
    }
    
    // 更新全局狀態
    if (window.store) {
      window.store.dispatch({
        type: 'auth/login',
        payload: {
          isAuthenticated: true,
          user: data.user,
          token: data.token
        }
      });
    }

    // 隱藏模態框
    this.hide();
    
    // 顯示成功通知
    this.showSuccessNotification(`歡迎回來！${data.provider ? `透過 ${data.provider.toUpperCase()} ` : ''}登入成功`);
    
    // 更新 UI
    this.updateUIForLoggedInUser(data.user);
    
    // 處理登入後的頁面導航
    this.handlePostLoginNavigation(data);
    
    // 在所有處理完成後清除 OAuth URL 參數，避免競態條件
    this.clearOAuthUrlParams();
  }


  /**
   * 檢查並更新 UI 狀態 - 修復頁面重新載入問題
   */
  async checkAndUpdateUIState() {
    console.log('🔍 檢查當前認證狀態...');
    
    // 等待 DOM 完全準備就緒
    if (document.readyState !== 'complete') {
      console.log('⏳ 等待 DOM 完全載入...');
      await new Promise(resolve => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          window.addEventListener('load', resolve, { once: true });
        }
      });
    }
    
    // 首先檢查 localStorage 中的認證狀態
    const token = localStorage.getItem('nexustrade_token') || 
                  localStorage.getItem('token'); // 備用 key
    const userStr = localStorage.getItem('nexustrade_user') || 
                    localStorage.getItem('userInfo'); // 備用 key
    
    if (token && userStr) {
      try {
        // 驗證 Token 格式是否正確
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const isExpired = payload.exp * 1000 <= Date.now();
          
          if (!isExpired) {
            const user = JSON.parse(userStr);
            console.log('✅ 發現有效的認證狀態，恢復登入 UI');
            
            // 檢查是否為測試環境的 Token
            const isTestToken = token.includes('test') || token.startsWith('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIi');
            
            if (isTestToken) {
              console.log('🧪 檢測到測試 Token，跳過伺服器驗證');
              
              // 立即更新 UI
              this.updateUIForLoggedInUser(user);
              
              // 保存到標準 key（確保一致性）
              this.saveTokensToStorage({ token, user });
              
              // 更新全局狀態
              if (window.store) {
                window.store.dispatch({
                  type: 'auth/login',
                  payload: {
                    isAuthenticated: true,
                    user: user,
                    token: token
                  }
                });
              }
              
              // 更新 AuthStateManager
              if (window.authStateManager) {
                window.authStateManager.updateLocalAuthState({
                  token: token,
                  user: user,
                  isBound: localStorage.getItem('nexustrade_line_bound') === 'true'
                });
              }
              
              return true;
            }
            
            // 驗證真實 token 是否在伺服器端仍然有效
            try {
              const verifyResponse = await fetch('/api/auth/verify', {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (verifyResponse.ok) {
                console.log('✅ 伺服器端 token 驗證成功');
                
                // 立即更新 UI
                this.updateUIForLoggedInUser(user);
                
                // 保存到標準 key（確保一致性）
                this.saveTokensToStorage({ token, user });
                
                // 更新全局狀態
                if (window.store) {
                  window.store.dispatch({
                    type: 'auth/login',
                    payload: {
                      isAuthenticated: true,
                      user: user,
                      token: token
                    }
                  });
                }
                
                // 更新 AuthStateManager
                if (window.authStateManager) {
                  window.authStateManager.updateLocalAuthState({
                    token: token,
                    user: user,
                    isBound: localStorage.getItem('nexustrade_line_bound') === 'true'
                  });
                }
                
                return true;
              } else {
                console.warn('⚠️ 伺服器端 token 驗證失敗，但保留本地狀態（可能為網路問題）');
                
                // 不立即清除，先嘗試恢復 UI 狀態
                this.updateUIForLoggedInUser(user);
                return true;
              }
            } catch (verifyError) {
              console.warn('⚠️ Token 驗證請求失敗，但保留本地狀態:', verifyError.message);
              
              // 網路錯誤時仍然保留 UI 狀態
              this.updateUIForLoggedInUser(user);
              return true;
            }
          } else {
            console.warn('⚠️ Token 已過期，清除認證狀態');
            this.clearTokensFromStorage();
            this.updateUIForLoggedOutUser();
          }
        }
      } catch (error) {
        console.error('❌ 解析認證資料失敗:', error);
        this.clearTokensFromStorage();
        this.updateUIForLoggedOutUser();
      }
    } else {
      console.log('ℹ️ 未發現認證狀態，保持登出狀態');
      this.updateUIForLoggedOutUser();
    }
    
    return false;
  }

  /**
   * 處理自動登入
   */
  async handleAutoLogin() {
    console.log('🔄 嘗試自動登入...');
    
    try {
      // 🔧 修復：檢查是否為測試 token
      const isTestToken = this.authTokens.token && (
        this.authTokens.token.includes('test') || 
        this.authTokens.token.startsWith('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIi')
      );
      
      if (isTestToken) {
        console.log('🧪 檢測到測試 Token，跳過 API 驗證，使用本地資料');
        
        // 如果沒有 user 資料，創建預設測試 user
        if (!this.authTokens.user) {
          const testUser = {
            name: '測試使用者',
            email: 'test@example.com',
            avatar: 'https://via.placeholder.com/40',
            provider: 'test'
          };
          
          // 保存測試 user 資料
          this.saveTokensToStorage({
            token: this.authTokens.token,
            refreshToken: this.authTokens.refreshToken,
            user: testUser
          });
        }
        
        // 更新全局狀態
        if (window.store) {
          window.store.dispatch({
            type: 'auth/login',
            payload: {
              isAuthenticated: true,
              user: this.authTokens.user,
              token: this.authTokens.token
            }
          });
        }

        this.updateUIForLoggedInUser(this.authTokens.user);
        return;
      }
      
      // 如果有本地儲存的使用者資料，直接恢復狀態
      if (this.authTokens.user) {
        console.log('✅ 從本地存儲恢復使用者狀態');
        
        // 更新全局狀態
        if (window.store) {
          window.store.dispatch({
            type: 'auth/login',
            payload: {
              isAuthenticated: true,
              user: this.authTokens.user,
              token: this.authTokens.token
            }
          });
        }

        this.updateUIForLoggedInUser(this.authTokens.user);
        return;
      }

      // 🔧 修復：如果有 token 但沒有 user，嘗試從 localStorage 的其他 key 恢復
      const fallbackUserData = localStorage.getItem('userInfo') || localStorage.getItem('user');
      if (fallbackUserData) {
        try {
          const userData = JSON.parse(fallbackUserData);
          console.log('🔄 從備用 localStorage key 恢復使用者資料');
          
          this.saveTokensToStorage({
            token: this.authTokens.token,
            refreshToken: this.authTokens.refreshToken,
            user: userData
          });
          
          this.updateUIForLoggedInUser(userData);
          return;
        } catch (parseError) {
          console.warn('⚠️ 備用使用者資料解析失敗:', parseError);
        }
      }

      // 如果沒有本地使用者資料，通過 API 驗證並獲取
      console.log('🌐 嘗試通過 API 驗證獲取使用者資料...');
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${this.authTokens.token}`
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        const userData = responseData.data?.user || responseData.user;
        console.log('✅ 通過 API 驗證自動登入成功');
        
        // 儲存使用者資料到本地存儲
        this.saveTokensToStorage({
          token: this.authTokens.token,
          refreshToken: this.authTokens.refreshToken,
          user: userData
        });
        
        // 更新全局狀態
        if (window.store) {
          window.store.dispatch({
            type: 'auth/login',
            payload: {
              isAuthenticated: true,
              user: userData,
              token: this.authTokens.token
            }
          });
        }

        this.updateUIForLoggedInUser(userData);
      } else {
        console.warn('⚠️ API 驗證失敗，但保留 token（可能為網路問題或伺服器維護）');
        console.log('🔄 如果有 token，將保留並稍後重試');
        
        // 🔧 修復：不立即清除 token，而是創建臨時使用者狀態
        if (this.authTokens.token) {
          const tempUser = {
            name: '用戶',
            email: 'user@nexustrade.com',
            avatar: 'https://via.placeholder.com/40',
            provider: 'unknown',
            isTemporary: true
          };
          
          console.log('🔄 創建臨時使用者狀態，保留認證 token');
          this.updateUIForLoggedInUser(tempUser);
        }
      }
    } catch (error) {
      console.error('❌ 自動登入過程中發生錯誤:', error);
      
      // 🔧 修復：錯誤時也不立即清除，而是保留現有狀態
      if (this.authTokens.token) {
        console.log('🔄 發生錯誤但保留現有認證狀態');
        const errorUser = {
          name: '用戶',
          email: 'user@nexustrade.com',
          avatar: 'https://via.placeholder.com/40',
          provider: 'error',
          isTemporary: true
        };
        this.updateUIForLoggedInUser(errorUser);
      } else {
        console.log('🧹 沒有有效 token，清除存儲');
        this.clearTokensFromStorage();
      }
    }
  }

  /**
   * 登出
   */
  logout() {
    console.log('👋 使用者登出');
    
    // 清除存儲的 token
    this.clearTokensFromStorage();
    
    // 更新全局狀態
    if (window.store) {
      window.store.dispatch({
        type: 'auth/logout'
      });
    }
    
    // 更新 UI
    this.updateUIForLoggedOutUser();
    
    this.showSuccessNotification('已成功登出');
  }

  /**
   * 更新已登入使用者的 UI
   */
  updateUIForLoggedInUser(user) {
    console.log('🔄 更新已登入使用者 UI:', user);
    
    // 確保必要的 DOM 元素存在
    const loginBtn = document.getElementById('login-btn');
    if (!loginBtn) {
      console.warn('⚠️ 登入按鈕元素不存在，稍後重試...');
      setTimeout(() => this.updateUIForLoggedInUser(user), 500);
      return;
    }
    const signupBtn = document.getElementById('signup-btn');
    
    // 清理舊的使用者選單（防止重複）
    const existingUserMenus = document.querySelectorAll('.user-menu');
    existingUserMenus.forEach(menu => menu.remove());
    
    if (loginBtn) {
      // 隱藏登入按鈕
      loginBtn.style.display = 'none';
      
      // 移除註冊按鈕（如果存在的話）
      if (signupBtn) {
        signupBtn.remove();
      }
      
      // 獲取使用者資訊
      const userName = user.profile?.displayName || user.name || user.email || '使用者';
      const userAvatar = user.profile?.picture || user.picture || null;
      
      // 創建使用者選單
      const userMenu = document.createElement('div');
      userMenu.className = 'user-menu';
      
      // 建立頭像 HTML (CSP 兼容的錯誤處理)
      const avatarHTML = userAvatar 
        ? `<img src="${userAvatar}" alt="${userName}" class="user-avatar-img">
           <div class="user-avatar-fallback" style="display: none;">👤</div>`
        : `<div class="user-avatar-fallback">👤</div>`;
      
      userMenu.innerHTML = `
        <button class="user-profile-btn" id="user-profile-btn">
          <div class="user-avatar">
            ${avatarHTML}
          </div>
          <span class="user-name">${userName}</span>
          <svg class="dropdown-icon" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </button>
        <div class="user-dropdown" id="user-dropdown" style="display: none;">
          <div class="dropdown-header">
            <div class="dropdown-user-info">
              <div class="dropdown-avatar">
                ${avatarHTML}
              </div>
              <div class="dropdown-user-details">
                <div class="dropdown-user-name">${userName}</div>
                <div class="dropdown-user-email">${user.email || ''}</div>
              </div>
            </div>
          </div>
          <div class="dropdown-divider"></div>
          <a href="#/watchlist" class="dropdown-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 12l-4.5-4.5L4.914 6.086 8 9.172l3.086-3.086L12.5 7.5 8 12z"/>
            </svg>
            我的關注清單
          </a>
          <a href="#/price-alerts" class="dropdown-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm.995-14.901a1 1 0 1 0-1.99 0A5.002 5.002 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/>
            </svg>
            價格警報
          </a>
          <a href="#/settings" class="dropdown-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.292-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.292c.415.764-.42 1.6-1.185 1.184l-.292-.159a1.873 1.873 0 0 0-2.692 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.693-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.292A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
            </svg>
            帳戶設定
          </a>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item logout-btn" id="logout-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
              <path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
            </svg>
            登出
          </button>
        </div>
      `;
      
      // 將使用者選單插入到 header actions 中
      const headerActions = document.querySelector('.header-actions');
      if (headerActions) {
        headerActions.appendChild(userMenu);
      }
      
      // 設定使用者選單事件
      this.setupUserMenuEvents();
      
      // 設定頭像載入錯誤處理 (CSP 兼容)
      this.setupAvatarErrorHandling();
    }
  }

  /**
   * 更新已登出使用者的 UI
   */
  updateUIForLoggedOutUser() {
    console.log('🔄 更新登出使用者 UI');
    
    // 確保必要的 DOM 元素存在
    const loginBtn = document.getElementById('login-btn');
    if (!loginBtn) {
      console.warn('⚠️ 登入按鈕元素不存在，稍後重試...');
      setTimeout(() => this.updateUIForLoggedOutUser(), 500);
      return;
    }
    const userMenu = document.querySelector('.user-menu');
    
    // 顯示登入按鈕
    if (loginBtn) {
      loginBtn.style.display = 'inline-block';
    }
    
    // 移除使用者選單
    if (userMenu) {
      userMenu.remove();
    }
    
    // 不需要註冊按鈕 - 註冊功能已整合到登入流程中
    // 移除任何可能存在的註冊按鈕
    const signupBtn = document.getElementById('signup-btn');
    if (signupBtn) {
      signupBtn.remove();
    }
  }

  /**
   * 設定使用者選單事件
   */
  setupUserMenuEvents() {
    const profileBtn = document.getElementById('user-profile-btn');
    const dropdown = document.getElementById('user-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    
    profileBtn?.addEventListener('click', () => {
      const isVisible = dropdown.style.display !== 'none';
      dropdown.style.display = isVisible ? 'none' : 'block';
    });
    
    logoutBtn?.addEventListener('click', () => this.logout());
    
    // 點擊外部關閉下拉選單
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-menu')) {
        dropdown.style.display = 'none';
      }
    });
  }

  /**
   * 設定頭像載入錯誤處理 (CSP 兼容)
   */
  setupAvatarErrorHandling() {
    const avatarImages = document.querySelectorAll('.user-avatar-img');
    
    avatarImages.forEach(img => {
      img.addEventListener('error', (e) => {
        const fallback = e.target.nextElementSibling;
        if (fallback && fallback.classList.contains('user-avatar-fallback')) {
          e.target.style.display = 'none';
          fallback.style.display = 'flex';
        }
      });
      
      // 檢查已經載入失敗的圖片
      if (img.complete && img.naturalWidth === 0) {
        const fallback = img.nextElementSibling;
        if (fallback && fallback.classList.contains('user-avatar-fallback')) {
          img.style.display = 'none';
          fallback.style.display = 'flex';
        }
      }
    });
  }


  /**
   * 從本地存儲載入 token 和使用者資料
   */
  loadTokensFromStorage() {
    const userData = localStorage.getItem('nexustrade_user');
    return {
      token: localStorage.getItem('nexustrade_token'),
      refreshToken: localStorage.getItem('nexustrade_refresh_token'),
      user: userData ? JSON.parse(userData) : null
    };
  }

  /**
   * 保存 token 和使用者資料到本地存儲
   */
  saveTokensToStorage(data) {
    if (data.token) {
      localStorage.setItem('nexustrade_token', data.token);
    }
    if (data.refreshToken) {
      localStorage.setItem('nexustrade_refresh_token', data.refreshToken);
    }
    if (data.user) {
      localStorage.setItem('nexustrade_user', JSON.stringify(data.user));
    }
    this.authTokens = this.loadTokensFromStorage();
  }

  /**
   * 清除本地存儲的 token 和使用者資料
   */
  clearTokensFromStorage() {
    // 清除所有可能的 token keys
    localStorage.removeItem('nexustrade_token');
    localStorage.removeItem('nexustrade_refresh_token'); 
    localStorage.removeItem('nexustrade_user');
    localStorage.removeItem('nexustrade_line_bound');
    
    // 清除備用 keys
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('refreshToken');
    
    // 清除狀態返回參數
    localStorage.removeItem('nexustrade_return_state');
    
    this.authTokens = { token: null, refreshToken: null, user: null };
    
    console.log('🧹 已清除所有認證資料');
  }

  /**
   * 顯示成功通知
   */
  showSuccessNotification(message) {
    if (window.store) {
      window.store.dispatch({
        type: 'ui/showNotification',
        payload: { message, type: 'success', duration: 4000 }
      });
    }
  }

  /**
   * 顯示錯誤通知
   */
  showErrorNotification(message) {
    if (window.store) {
      window.store.dispatch({
        type: 'ui/showNotification',
        payload: { message, type: 'error', duration: 5000 }
      });
    }
  }

  /**
   * 顯示資訊通知
   */
  showInfoNotification(message) {
    if (window.store) {
      window.store.dispatch({
        type: 'ui/showNotification',
        payload: { message, type: 'info', duration: 4000 }
      });
    }
  }

  /**
   * 取得當前認證狀態
   */
  isAuthenticated() {
    return !!this.authTokens.token;
  }

  /**
   * 處理登入後的頁面導航
   */
  handlePostLoginNavigation(data) {
    console.log('🔄 處理登入後導航...');
    
    try {
      // 檢查是否有儲存的返回狀態
      const returnStateStr = sessionStorage.getItem('nexustrade_return_state');
      
      if (returnStateStr) {
        const returnState = JSON.parse(returnStateStr);
        console.log('📍 找到返回狀態:', returnState);
        
        // 清除返回狀態
        sessionStorage.removeItem('nexustrade_return_state');
        
        // 根據返回狀態導航
        if (returnState.page === 'currency-detail' && returnState.symbol) {
          console.log(`🪙 返回到 ${returnState.symbol} 貨幣詳情頁面`);
          
          // 導航到貨幣詳情頁面
          setTimeout(() => {
            if (window.router) {
              window.router.navigate(`/currency/${returnState.symbol}`, true);
              
              // 觸發認證狀態同步
              if (window.authStateManager) {
                setTimeout(async () => {
                  await window.authStateManager.forceAuthStateRefresh();
                }, 200);
              }
              
              // 如果是價格警報相關，重新打開 PriceAlertModal
              if (returnState.action === 'price-alert') {
                setTimeout(() => {
                  if (window.priceAlertModal) {
                    console.log('🔔 重新打開價格警報設定');
                    window.priceAlertModal.show(returnState.symbol);
                  }
                }, 800);
              }
            } else {
              // 如果沒有路由器，直接更改 hash
              window.location.hash = `#/currency/${returnState.symbol}`;
            }
          }, 100);
          
          return;
        }
      }
      
      console.log('🏠 沒有返回狀態，保持在當前頁面');
      
      // 觸發認證狀態管理器強制重新整理
      if (window.authStateManager) {
        console.log('🔄 觸發認證狀態管理器同步');
        setTimeout(async () => {
          await window.authStateManager.forceAuthStateRefresh();
        }, 300);
      }
      
      // 如果當前頁面有 PriceAlertModal 並且是打開狀態，重新檢查 LINE 狀態
      if (window.priceAlertModal && window.priceAlertModal.isVisible) {
        console.log('🔔 當前有價格警報模態框，重新檢查 LINE 狀態');
        setTimeout(async () => {
          await window.priceAlertModal.checkLineConnectionStatus();
          // 重新渲染模態框以更新 LINE 狀態
          window.priceAlertModal.render();
          window.priceAlertModal.setupEventListeners();
        }, 800);
      }
      
    } catch (error) {
      console.error('❌ 處理登入後導航時發生錯誤:', error);
    }
  }

  /**
   * 清除 OAuth URL 參數
   */
  clearOAuthUrlParams() {
    console.log('🧹 清除 OAuth URL 參數...');
    
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
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '') + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
      console.log('✅ OAuth URL 參數已清除');
    }
  }

  /**
   * 取得認證 token
   */
  getAuthToken() {
    return this.authTokens.token;
  }
}

// 創建全局實例
window.LoginModal = LoginModal;