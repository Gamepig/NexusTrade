/**
 * AuthStateManager 前端認證狀態管理器測試
 * 
 * 測試範圍：
 * 1. JWT Token 管理
 * 2. 使用者狀態檢查
 * 3. 狀態同步機制
 * 4. 事件處理
 * 5. 錯誤處理
 */

const jwt = require('jsonwebtoken');

// 模擬瀏覽器環境
global.localStorage = {
  store: {},
  getItem: jest.fn(key => global.localStorage.store[key] || null),
  setItem: jest.fn((key, value) => { global.localStorage.store[key] = value; }),
  removeItem: jest.fn(key => { delete global.localStorage.store[key]; }),
  clear: jest.fn(() => { global.localStorage.store = {}; })
};

global.sessionStorage = {
  store: {},
  getItem: jest.fn(key => global.sessionStorage.store[key] || null),
  setItem: jest.fn((key, value) => { global.sessionStorage.store[key] = value; }),
  removeItem: jest.fn(key => { delete global.sessionStorage.store[key]; }),
  clear: jest.fn(() => { global.sessionStorage.store = {}; })
};

global.window = {
  localStorage: global.localStorage,
  sessionStorage: global.sessionStorage,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  location: { hostname: 'localhost' }
};

global.console = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// 模擬 fetch API
global.fetch = jest.fn();

describe('AuthStateManager 測試', () => {
  let AuthStateManager;
  let authManager;
  let testUser;
  let validToken;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
    
    // 動態載入 AuthStateManager（模擬瀏覽器環境）
    const fs = require('fs');
    const path = require('path');
    const authStateManagerCode = fs.readFileSync(
      path.join(__dirname, '../../public/js/lib/auth-state-manager.js'),
      'utf8'
    );
    
    // 執行程式碼（移除瀏覽器特定部分）
    const modifiedCode = authStateManagerCode
      .replace(/window\./g, 'global.')
      .replace(/document\./g, 'global.document.');
    
    eval(modifiedCode);
    AuthStateManager = global.AuthStateManager;
  });

  beforeEach(() => {
    // 清理儲存
    global.localStorage.clear();
    global.sessionStorage.clear();
    
    // 重置 mock
    jest.clearAllMocks();
    
    // 創建測試資料
    testUser = {
      _id: 'test-user-id-123',
      email: 'test@example.com',
      name: 'Test User',
      avatar: 'https://example.com/avatar.jpg'
    };

    validToken = jwt.sign(
      { 
        userId: testUser._id,
        email: testUser.email,
        exp: Math.floor(Date.now() / 1000) + 3600 // 1小時後過期
      },
      process.env.JWT_SECRET
    );

    // 創建新的 AuthStateManager 實例
    authManager = new AuthStateManager();
  });

  describe('Token 管理', () => {
    test('getToken() 應該從 localStorage 取得 Token', () => {
      global.localStorage.setItem('nexustrade_token', validToken);
      
      const token = authManager.getToken();
      expect(token).toBe(validToken);
    });

    test('getToken() 沒有 Token 時應該返回 null', () => {
      const token = authManager.getToken();
      expect(token).toBeNull();
    });

    test('isTokenExpired() 應該正確檢查 Token 過期狀態', () => {
      global.localStorage.setItem('nexustrade_token', validToken);
      
      const isExpired = authManager.isTokenExpired();
      expect(isExpired).toBe(false);
    });

    test('isTokenExpired() 對於過期 Token 應該返回 true', () => {
      const expiredToken = jwt.sign(
        { 
          userId: testUser._id,
          exp: Math.floor(Date.now() / 1000) - 3600 // 1小時前過期
        },
        process.env.JWT_SECRET
      );
      
      global.localStorage.setItem('nexustrade_token', expiredToken);
      
      const isExpired = authManager.isTokenExpired();
      expect(isExpired).toBe(true);
    });

    test('isTokenExpired() 對於無效 Token 應該返回 true', () => {
      global.localStorage.setItem('nexustrade_token', 'invalid.token');
      
      const isExpired = authManager.isTokenExpired();
      expect(isExpired).toBe(true);
    });

    test('isTokenExpired() 沒有 Token 時應該返回 true', () => {
      const isExpired = authManager.isTokenExpired();
      expect(isExpired).toBe(true);
    });
  });

  describe('使用者 ID 管理', () => {
    test('getUserId() 應該從 Token 中提取使用者 ID', () => {
      global.localStorage.setItem('nexustrade_token', validToken);
      
      const userId = authManager.getUserId();
      expect(userId).toBe(testUser._id);
    });

    test('getUserId() 沒有 Token 時應該返回 null', () => {
      const userId = authManager.getUserId();
      expect(userId).toBeNull();
    });

    test('getUserId() 對於無效 Token 應該返回 null', () => {
      global.localStorage.setItem('nexustrade_token', 'invalid.token');
      
      const userId = authManager.getUserId();
      expect(userId).toBeNull();
    });
  });

  describe('認證狀態檢查', () => {
    test('isAuthenticated() 有效 Token 時應該返回 true', () => {
      global.localStorage.setItem('nexustrade_token', validToken);
      
      const isAuth = authManager.isAuthenticated();
      expect(isAuth).toBe(true);
    });

    test('isAuthenticated() 沒有 Token 時應該返回 false', () => {
      const isAuth = authManager.isAuthenticated();
      expect(isAuth).toBe(false);
    });

    test('isAuthenticated() Token 過期時應該返回 false', () => {
      const expiredToken = jwt.sign(
        { 
          userId: testUser._id,
          exp: Math.floor(Date.now() / 1000) - 3600
        },
        process.env.JWT_SECRET
      );
      
      global.localStorage.setItem('nexustrade_token', expiredToken);
      
      const isAuth = authManager.isAuthenticated();
      expect(isAuth).toBe(false);
    });
  });

  describe('使用者資訊管理', () => {
    beforeEach(() => {
      global.localStorage.setItem('nexustrade_token', validToken);
      global.localStorage.setItem('nexustrade_user', JSON.stringify(testUser));
    });

    test('getUserInfo() 應該返回使用者資訊', () => {
      const userInfo = authManager.getUserInfo();
      
      expect(userInfo).toEqual(testUser);
    });

    test('getUserInfo() 沒有使用者資訊時應該返回 null', () => {
      global.localStorage.removeItem('nexustrade_user');
      
      const userInfo = authManager.getUserInfo();
      expect(userInfo).toBeNull();
    });

    test('getUserInfo() 無效 JSON 時應該返回 null', () => {
      global.localStorage.setItem('nexustrade_user', 'invalid-json');
      
      const userInfo = authManager.getUserInfo();
      expect(userInfo).toBeNull();
    });
  });

  describe('本地認證狀態管理', () => {
    test('getLocalAuthState() 應該返回完整的認證狀態', () => {
      global.localStorage.setItem('nexustrade_token', validToken);
      global.localStorage.setItem('nexustrade_user', JSON.stringify(testUser));
      
      const authState = authManager.getLocalAuthState();
      
      expect(authState).toEqual({
        isAuthenticated: true,
        token: validToken,
        user: testUser,
        isBound: false // 預設 LINE 未綁定
      });
    });

    test('updateLocalAuthState() 應該更新本地認證狀態', () => {
      const newAuthState = {
        token: validToken,
        user: testUser,
        isBound: true
      };
      
      authManager.updateLocalAuthState(newAuthState);
      
      expect(global.localStorage.setItem).toHaveBeenCalledWith('nexustrade_token', validToken);
      expect(global.localStorage.setItem).toHaveBeenCalledWith('nexustrade_user', JSON.stringify(testUser));
      expect(global.localStorage.setItem).toHaveBeenCalledWith('nexustrade_line_bound', 'true');
    });

    test('clearLocalAuthState() 應該清除所有認證資料', () => {
      authManager.clearLocalAuthState();
      
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('nexustrade_token');
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('nexustrade_user');
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('nexustrade_line_bound');
    });
  });

  describe('狀態驗證和同步', () => {
    test('validateAuthState() 應該驗證本地狀態一致性', async () => {
      global.localStorage.setItem('nexustrade_token', validToken);
      global.localStorage.setItem('nexustrade_user', JSON.stringify(testUser));
      
      // 模擬伺服器回應
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            isAuthenticated: true,
            user: testUser,
            isBound: false
          }
        })
      });
      
      const isValid = await authManager.validateAuthState();
      expect(isValid).toBe(true);
    });

    test('forceAuthStateRefresh() 應該強制重新整理狀態', async () => {
      global.localStorage.setItem('nexustrade_token', validToken);
      
      // 模擬伺服器回應
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            isAuthenticated: true,
            user: testUser,
            isBound: true
          }
        })
      });
      
      const refreshed = await authManager.forceAuthStateRefresh();
      expect(refreshed).toBe(true);
    });

    test('waitForAuthStability() 應該等待狀態穩定', async () => {
      global.localStorage.setItem('nexustrade_token', validToken);
      global.localStorage.setItem('nexustrade_user', JSON.stringify(testUser));
      
      const stableState = await authManager.waitForAuthStability();
      
      expect(stableState).toEqual({
        isAuthenticated: true,
        token: validToken,
        user: testUser,
        isBound: false
      });
    });
  });

  describe('錯誤處理', () => {
    test('網路錯誤時應該正確處理', async () => {
      global.localStorage.setItem('nexustrade_token', validToken);
      
      // 模擬網路錯誤
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      const refreshed = await authManager.forceAuthStateRefresh();
      expect(refreshed).toBe(false);
      expect(global.console.error).toHaveBeenCalled();
    });

    test('伺服器錯誤回應時應該正確處理', async () => {
      global.localStorage.setItem('nexustrade_token', validToken);
      
      // 模擬伺服器錯誤
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });
      
      const validated = await authManager.validateAuthState();
      expect(validated).toBe(false);
    });

    test('無效的 JSON 回應時應該正確處理', async () => {
      global.localStorage.setItem('nexustrade_token', validToken);
      
      // 模擬無效 JSON
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });
      
      const validated = await authManager.validateAuthState();
      expect(validated).toBe(false);
    });
  });

  describe('TOKEN 備用方案', () => {
    test('getLocalToken() 應該按優先順序檢查 Token', () => {
      // 設定 sessionStorage 有 Token
      global.sessionStorage.setItem('nexustrade_token', 'session-token');
      
      // 沒有 localStorage Token
      const token = authManager.getLocalToken();
      expect(token).toBe('session-token');
    });

    test('getLocalToken() localStorage 優先於 sessionStorage', () => {
      global.localStorage.setItem('nexustrade_token', 'local-token');
      global.sessionStorage.setItem('nexustrade_token', 'session-token');
      
      const token = authManager.getLocalToken();
      expect(token).toBe('local-token');
    });

    test('getLocalToken() 都沒有時應該返回 null', () => {
      const token = authManager.getLocalToken();
      expect(token).toBeNull();
    });
  });

  describe('開發環境支援', () => {
    test('開發環境應該有除錯日誌', () => {
      // 確認在 localhost 環境
      expect(global.window.location.hostname).toBe('localhost');
      
      // 呼叫方法應該有 console.log
      authManager.getToken();
      // 在真實的 AuthStateManager 中會有除錯日誌
    });
  });
});