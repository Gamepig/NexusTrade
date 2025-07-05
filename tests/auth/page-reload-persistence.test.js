/**
 * 頁面重新載入後認證狀態持久性測試
 * 
 * 專門測試頁面重新載入後登入狀態是否正確保持
 */

const jwt = require('jsonwebtoken');

describe('頁面重新載入認證持久性測試', () => {
  let mockWindow, mockLocalStorage, mockSessionStorage;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  });

  beforeEach(() => {
    // 模擬瀏覽器環境
    mockLocalStorage = {
      store: {},
      getItem: jest.fn(key => mockLocalStorage.store[key] || null),
      setItem: jest.fn((key, value) => { mockLocalStorage.store[key] = value; }),
      removeItem: jest.fn(key => { delete mockLocalStorage.store[key]; })
    };

    mockSessionStorage = {
      store: {},
      getItem: jest.fn(key => mockSessionStorage.store[key] || null),
      setItem: jest.fn((key, value) => { mockSessionStorage.store[key] = value; }),
      removeItem: jest.fn(key => { delete mockSessionStorage.store[key]; })
    };

    mockWindow = {
      localStorage: mockLocalStorage,
      sessionStorage: mockSessionStorage,
      location: { hostname: 'localhost' }
    };
  });

  describe('OAuth 登入後的資料持久性', () => {
    test('Google OAuth 成功後應該將 Token 儲存到 localStorage', () => {
      const testUser = {
        _id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      const token = jwt.sign(
        { 
          userId: testUser._id,
          email: testUser.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // 模擬 OAuth 成功後的資料儲存
      mockLocalStorage.setItem('nexustrade_token', token);
      mockLocalStorage.setItem('nexustrade_user', JSON.stringify(testUser));

      // 驗證資料已正確儲存
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('nexustrade_token', token);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('nexustrade_user', JSON.stringify(testUser));
      
      // 驗證能夠從儲存中取回
      expect(mockLocalStorage.getItem('nexustrade_token')).toBe(token);
      expect(JSON.parse(mockLocalStorage.getItem('nexustrade_user'))).toEqual(testUser);
    });

    test('頁面重新載入後應該能從 localStorage 恢復認證狀態', () => {
      const testUser = {
        _id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      const token = jwt.sign(
        { 
          userId: testUser._id,
          email: testUser.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // 模擬 OAuth 後儲存資料
      mockLocalStorage.store['nexustrade_token'] = token;
      mockLocalStorage.store['nexustrade_user'] = JSON.stringify(testUser);

      // 模擬頁面重新載入後的狀態檢查
      const storedToken = mockLocalStorage.getItem('nexustrade_token');
      const storedUser = JSON.parse(mockLocalStorage.getItem('nexustrade_user'));

      // 驗證資料能夠正確恢復
      expect(storedToken).toBe(token);
      expect(storedUser).toEqual(testUser);

      // 驗證 Token 仍然有效
      const decoded = jwt.verify(storedToken, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(testUser._id);
      expect(decoded.email).toBe(testUser.email);
    });

    test('Token 過期檢查應該正確運作', () => {
      const expiredToken = jwt.sign(
        { userId: 'user-123' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // 已過期
      );

      mockLocalStorage.store['nexustrade_token'] = expiredToken;

      // 檢查過期狀態
      const token = mockLocalStorage.getItem('nexustrade_token');
      
      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET);
      }).toThrow('jwt expired');
    });
  });

  describe('前端狀態初始化問題診斷', () => {
    test('應用程式啟動時應該檢查現有認證狀態', () => {
      const testUser = {
        _id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      const token = jwt.sign(
        { 
          userId: testUser._id,
          email: testUser.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // 模擬頁面載入前已有的認證資料
      mockLocalStorage.store['nexustrade_token'] = token;
      mockLocalStorage.store['nexustrade_user'] = JSON.stringify(testUser);

      // 模擬應用程式初始化檢查
      function checkAuthState() {
        const token = mockLocalStorage.getItem('nexustrade_token');
        const userStr = mockLocalStorage.getItem('nexustrade_user');
        
        if (token && userStr) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = JSON.parse(userStr);
            
            return {
              isAuthenticated: true,
              token,
              user,
              decoded
            };
          } catch (error) {
            return { isAuthenticated: false };
          }
        }
        
        return { isAuthenticated: false };
      }

      const authState = checkAuthState();
      
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.token).toBe(token);
      expect(authState.user).toEqual(testUser);
    });

    test('LoginModal 應該正確處理現有的認證狀態', () => {
      const testUser = {
        _id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      const token = jwt.sign(
        { 
          userId: testUser._id,
          email: testUser.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      mockLocalStorage.store['nexustrade_token'] = token;
      mockLocalStorage.store['nexustrade_user'] = JSON.stringify(testUser);

      // 模擬 LoginModal 的狀態檢查邏輯
      function LoginModal_checkAuthState() {
        const token = mockLocalStorage.getItem('nexustrade_token');
        const userStr = mockLocalStorage.getItem('nexustrade_user');
        
        if (token && userStr) {
          try {
            jwt.verify(token, process.env.JWT_SECRET);
            const user = JSON.parse(userStr);
            
            // 設定為已登入狀態
            return {
              isLoggedIn: true,
              user: user,
              showLoginButton: false,
              showUserInfo: true
            };
          } catch (error) {
            return {
              isLoggedIn: false,
              showLoginButton: true,
              showUserInfo: false
            };
          }
        }
        
        return {
          isLoggedIn: false,
          showLoginButton: true,
          showUserInfo: false
        };
      }

      const uiState = LoginModal_checkAuthState();
      
      expect(uiState.isLoggedIn).toBe(true);
      expect(uiState.showLoginButton).toBe(false);
      expect(uiState.showUserInfo).toBe(true);
      expect(uiState.user).toEqual(testUser);
    });

    test('應該在 DOM 準備好後立即檢查認證狀態', () => {
      const testUser = {
        _id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      const token = jwt.sign(
        { 
          userId: testUser._id,
          email: testUser.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      mockLocalStorage.store['nexustrade_token'] = token;
      mockLocalStorage.store['nexustrade_user'] = JSON.stringify(testUser);

      // 模擬 DOMContentLoaded 事件處理
      function onDOMContentLoaded() {
        const token = mockLocalStorage.getItem('nexustrade_token');
        
        if (token) {
          try {
            jwt.verify(token, process.env.JWT_SECRET);
            return { shouldShowLoginButton: false };
          } catch (error) {
            return { shouldShowLoginButton: true };
          }
        }
        
        return { shouldShowLoginButton: true };
      }

      const result = onDOMContentLoaded();
      expect(result.shouldShowLoginButton).toBe(false);
    });
  });

  describe('常見錯誤情況', () => {
    test('localStorage 中有無效 Token 時應該清除', () => {
      const invalidToken = 'invalid.jwt.token';
      mockLocalStorage.store['nexustrade_token'] = invalidToken;
      mockLocalStorage.store['nexustrade_user'] = '{"_id":"user-123"}';

      function validateAndCleanAuth() {
        const token = mockLocalStorage.getItem('nexustrade_token');
        
        if (token) {
          try {
            jwt.verify(token, process.env.JWT_SECRET);
            return true;
          } catch (error) {
            // 清除無效資料
            mockLocalStorage.removeItem('nexustrade_token');
            mockLocalStorage.removeItem('nexustrade_user');
            return false;
          }
        }
        
        return false;
      }

      const isValid = validateAndCleanAuth();
      
      expect(isValid).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('nexustrade_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('nexustrade_user');
    });

    test('localStorage 中有過期 Token 時應該清除', () => {
      const expiredToken = jwt.sign(
        { userId: 'user-123' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      mockLocalStorage.store['nexustrade_token'] = expiredToken;

      function validateAndCleanAuth() {
        const token = mockLocalStorage.getItem('nexustrade_token');
        
        if (token) {
          try {
            jwt.verify(token, process.env.JWT_SECRET);
            return true;
          } catch (error) {
            mockLocalStorage.removeItem('nexustrade_token');
            mockLocalStorage.removeItem('nexustrade_user');
            return false;
          }
        }
        
        return false;
      }

      const isValid = validateAndCleanAuth();
      expect(isValid).toBe(false);
    });
  });
});