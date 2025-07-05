/**
 * 認證中介軟體測試
 * 
 * 測試範圍：
 * 1. JWT Token 驗證
 * 2. 使用者權限檢查
 * 3. 請求物件裝飾
 * 4. 錯誤處理
 * 5. 可選認證
 */

const jwt = require('jsonwebtoken');
const { MockUser } = require('../../src/controllers/auth.controller.mock');
const {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireOwnershipOrAdmin,
  requireEmailVerification,
  requireActiveAccount,
  rateLimitByUser
} = require('../../src/middleware/auth.middleware');

describe('認證中介軟體測試', () => {
  let req, res, next;
  let testUser;
  let validToken;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  });

  beforeEach(async () => {
    // 重置請求、回應和 next 函數
    req = {
      headers: {},
      method: 'GET',
      originalUrl: '/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      params: {},
      body: {}
    };

    res = {
      set: jest.fn()
    };

    next = jest.fn();

    // 清理 Mock 資料
    MockUser.clearAll();

    // 創建測試使用者
    testUser = await MockUser.createFromGoogle({
      id: 'google-123456789',
      emails: [{ value: 'test@example.com' }],
      displayName: 'Test User',
      photos: [{ value: 'https://example.com/avatar.jpg' }]
    });

    // 生成有效 Token
    validToken = jwt.sign(
      { 
        userId: testUser._id,
        email: testUser.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('authenticateToken 中介軟體', () => {
    test('應該接受有效的 Bearer Token', async () => {
      req.headers['authorization'] = `Bearer ${validToken}`;

      await authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
      expect(req.user._id).toBe(testUser._id);
      expect(req.userId).toBe(testUser._id);
      expect(req.token).toBe(validToken);
    });

    test('應該拒絕缺少 Authorization Header', async () => {
      await authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: '存取 Token 為必填'
        })
      );
    });

    test('應該拒絕無效的 Bearer Token 格式', async () => {
      req.headers['authorization'] = 'InvalidFormat';

      await authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: '存取 Token 為必填'
        })
      );
    });

    test('應該拒絕無效的 JWT Token', async () => {
      req.headers['authorization'] = 'Bearer invalid.jwt.token';

      await authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: '無效的 JWT Token'
        })
      );
    });

    test('應該拒絕過期的 JWT Token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );
      req.headers['authorization'] = `Bearer ${expiredToken}`;

      await authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'JWT Token 已過期'
        })
      );
    });

    test('應該拒絕不存在的使用者', async () => {
      const nonExistentUserToken = jwt.sign(
        { userId: 'non-existent-user-id' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers['authorization'] = `Bearer ${nonExistentUserToken}`;

      await authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: expect.stringContaining('使用者不存在')
        })
      );
    });

    test('應該拒絕非啟用狀態的使用者', async () => {
      testUser.status = 'inactive';
      await testUser.save();

      req.headers['authorization'] = `Bearer ${validToken}`;

      await authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: expect.stringContaining('帳戶已停用')
        })
      );
    });
  });

  describe('optionalAuth 中介軟體', () => {
    test('沒有 Token 時應該設定為匿名使用者', async () => {
      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeNull();
      expect(req.userId).toBeNull();
      expect(req.token).toBeNull();
    });

    test('有效 Token 時應該設定使用者資訊', async () => {
      req.headers['authorization'] = `Bearer ${validToken}`;

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
      expect(req.user._id).toBe(testUser._id);
      expect(req.userId).toBe(testUser._id);
      expect(req.token).toBe(validToken);
    });

    test('無效 Token 時應該繼續以匿名身份處理', async () => {
      req.headers['authorization'] = 'Bearer invalid.token';

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeNull();
      expect(req.userId).toBeNull();
      expect(req.token).toBeNull();
    });
  });

  describe('requireRole 中介軟體', () => {
    test('應該允許已認證的使用者（無特定角色要求）', () => {
      req.user = testUser;
      const middleware = requireRole();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('應該拒絕未認證的使用者', () => {
      req.user = null;
      const middleware = requireRole(['user']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: '需要認證後才能存取'
        })
      );
    });

    test('應該允許具有所需角色的使用者', () => {
      req.user = testUser;
      const middleware = requireRole(['user']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('應該拒絕沒有所需角色的使用者', () => {
      req.user = testUser;
      const middleware = requireRole(['admin']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: expect.stringContaining('需要以下角色之一')
        })
      );
    });
  });

  describe('requireOwnershipOrAdmin 中介軟體', () => {
    test('應該允許資源擁有者存取', () => {
      req.user = testUser;
      req.userId = testUser._id;
      req.params.userId = testUser._id;
      const middleware = requireOwnershipOrAdmin();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('應該拒絕非資源擁有者存取', () => {
      req.user = testUser;
      req.userId = testUser._id;
      req.params.userId = 'other-user-id';
      const middleware = requireOwnershipOrAdmin();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: '只能存取自己的資源'
        })
      );
    });

    test('應該拒絕未認證的使用者', () => {
      req.user = null;
      const middleware = requireOwnershipOrAdmin();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: '需要認證後才能存取'
        })
      );
    });
  });

  describe('requireEmailVerification 中介軟體', () => {
    test('應該允許已驗證電子郵件的使用者', () => {
      req.user = testUser;
      testUser.emailVerified = true;

      requireEmailVerification(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('應該拒絕未驗證電子郵件的使用者', () => {
      req.user = testUser;
      testUser.emailVerified = false;

      requireEmailVerification(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: '需要驗證電子郵件後才能存取此功能'
        })
      );
    });
  });

  describe('requireActiveAccount 中介軟體', () => {
    test('應該允許啟用狀態的帳戶', () => {
      req.user = testUser;
      testUser.status = 'active';

      requireActiveAccount(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('應該拒絕非啟用狀態的帳戶', () => {
      req.user = testUser;
      testUser.status = 'inactive';

      requireActiveAccount(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: '帳戶未啟用'
        })
      );
    });

    test('應該拒絕已暫停的帳戶', () => {
      req.user = testUser;
      testUser.status = 'suspended';

      requireActiveAccount(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: '帳戶已被暫停'
        })
      );
    });
  });

  describe('rateLimitByUser 中介軟體', () => {
    test('應該允許在限制內的請求', () => {
      req.userId = testUser._id;
      const middleware = rateLimitByUser(10, 60000); // 10 次/分鐘

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': 10,
          'X-RateLimit-Remaining': 9
        })
      );
    });

    test('應該拒絕超過限制的請求', () => {
      req.userId = testUser._id;
      const middleware = rateLimitByUser(1, 60000); // 1 次/分鐘

      // 第一次請求應該成功
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();

      // 重置 mock
      next.mockClear();

      // 第二次請求應該被拒絕
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429,
          message: expect.stringContaining('超過限制')
        })
      );
    });

    test('對於匿名使用者應該使用 IP 限制', () => {
      req.userId = null;
      req.ip = '192.168.1.1';
      const middleware = rateLimitByUser(10, 60000);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': 10,
          'X-RateLimit-Remaining': 9
        })
      );
    });
  });

  describe('整合測試', () => {
    test('完整的認證流程應該正常運作', async () => {
      // 1. 認證成功
      req.headers['authorization'] = `Bearer ${validToken}`;
      await authenticateToken(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();

      // 重置 mock
      next.mockClear();

      // 2. 角色檢查通過
      const roleMiddleware = requireRole(['user']);
      roleMiddleware(req, res, next);
      expect(next).toHaveBeenCalledWith();

      // 重置 mock
      next.mockClear();

      // 3. 帳戶狀態檢查通過
      requireActiveAccount(req, res, next);
      expect(next).toHaveBeenCalledWith();

      // 重置 mock
      next.mockClear();

      // 4. 電子郵件驗證檢查通過
      requireEmailVerification(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    test('認證失敗時應該中止後續檢查', async () => {
      // 無效 Token
      req.headers['authorization'] = 'Bearer invalid.token';
      await authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401
        })
      );

      // 確保使用者物件未設定
      expect(req.user).toBeUndefined();
    });
  });
});