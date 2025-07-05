/**
 * 基本認證測試 - 不需要 JSDOM
 */

const jwt = require('jsonwebtoken');

describe('基本認證測試', () => {
  beforeAll(() => {
    // 設定測試環境變數
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
    process.env.GOOGLE_CLIENT_ID = '6853611629-kfaaslvqca65i91d2pgdshbqhkl2uhj7.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = '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';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/auth/google/callback';
  });

  describe('環境變數配置', () => {
    test('JWT 祕鑰應該存在', () => {
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.JWT_SECRET.length).toBeGreaterThan(10);
    });

    test('Google OAuth 設定應該正確', () => {
      expect(process.env.GOOGLE_CLIENT_ID).toContain('apps.googleusercontent.com');
      expect(process.env.GOOGLE_CLIENT_SECRET).toContain('GOCSPX-');
      expect(process.env.GOOGLE_CALLBACK_URL).toContain('/auth/google/callback');
    });
  });

  describe('JWT Token 管理', () => {
    const testUser = {
      _id: 'test-user-id-123',
      email: 'test@example.com',
      name: 'Test User'
    };

    test('應該能生成有效的 JWT Token', () => {
      const token = jwt.sign(
        { 
          userId: testUser._id,
          email: testUser.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // Header.Payload.Signature
    });

    test('應該能解析有效的 JWT Token', () => {
      const token = jwt.sign(
        { 
          userId: testUser._id,
          email: testUser.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testUser._id);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });

    test('應該拒絕無效的 JWT Token', () => {
      const invalidToken = 'invalid.jwt.token';
      
      expect(() => {
        jwt.verify(invalidToken, process.env.JWT_SECRET);
      }).toThrow();
    });

    test('應該拒絕過期的 JWT Token', () => {
      const expiredToken = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // 已過期
      );

      expect(() => {
        jwt.verify(expiredToken, process.env.JWT_SECRET);
      }).toThrow('jwt expired');
    });

    test('應該拒絕使用錯誤 Secret 的 Token', () => {
      const token = jwt.sign(
        { userId: testUser._id },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET);
      }).toThrow('invalid signature');
    });
  });

  describe('模組載入測試', () => {
    test('應該能載入 OAuth 控制器', () => {
      expect(() => {
        require('../../src/controllers/oauth.controller');
      }).not.toThrow();
    });

    test('應該能載入認證路由', () => {
      expect(() => {
        require('../../src/routes/auth');
      }).not.toThrow();
    });
  });

  describe('安全性驗證', () => {
    test('JWT Secret 不應該暴露在 Token 中', () => {
      const token = jwt.sign(
        { userId: 'test-id' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      expect(token).not.toContain(process.env.JWT_SECRET);
    });

    test('JWT 應該包含必要的標準欄位', () => {
      const token = jwt.sign(
        { userId: 'test-id', email: 'test@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      expect(decoded.userId).toBeDefined();
      expect(decoded.email).toBeDefined();
      expect(decoded.exp).toBeDefined(); // 過期時間
      expect(decoded.iat).toBeDefined(); // 發行時間
    });
  });
});