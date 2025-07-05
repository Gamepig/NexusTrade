/**
 * NexusTrade 認證路由
 * 
 * 處理使用者認證相關的所有路由
 * 包含登入、註冊、OAuth、登出等功能
 */

const express = require('express');
const { asyncErrorHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth.middleware');
// 在開發階段使用 Mock 控制器 (因為 MongoDB 未安裝)
const authController = require('../controllers/auth.controller.mock');
const oauthController = require('../controllers/oauth.controller');
const { ApiErrorFactory } = require('../utils/ApiError');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 用戶註冊
 * POST /auth/register
 */
router.post('/register', asyncErrorHandler(authController.register));

/**
 * 用戶登入
 * POST /auth/login
 */
router.post('/login', asyncErrorHandler(authController.login));

/**
 * 用戶登出 (需要認證)
 * POST /auth/logout
 */
router.post('/logout', authenticateToken, asyncErrorHandler(authController.logout));

/**
 * 刷新 Token
 * POST /auth/refresh
 */
router.post('/refresh', asyncErrorHandler(authController.refresh));

/**
 * 驗證 Token (需要認證)
 * GET /auth/verify
 */
router.get('/verify', authenticateToken, asyncErrorHandler(authController.verify));

/**
 * Google OAuth 2.0 登入 (統一 REST API 實作)
 * GET /auth/google
 */
router.get('/google', oauthController.googleLogin);

/**
 * Google OAuth 2.0 回調 (統一 REST API 實作)
 * GET /auth/google/callback
 */
router.get('/google/callback', oauthController.googleCallback);

/**
 * LINE Login (統一 REST API 實作)
 * GET /auth/line
 */
router.get('/line', oauthController.lineLogin);

/**
 * LINE Login 回調 (統一 REST API 實作)
 * GET /auth/line/callback
 */
router.get('/line/callback', oauthController.lineCallback);

/**
 * 取得 OAuth 連結狀態 (需要認證)
 * GET /auth/oauth/status
 */
router.get('/oauth/status', authenticateToken, asyncErrorHandler(oauthController.getOAuthStatus));

/**
 * 忘記密碼
 * POST /auth/forgot-password
 */
router.post('/forgot-password', asyncErrorHandler(authController.forgotPassword));

/**
 * 重設密碼
 * POST /auth/reset-password
 */
router.post('/reset-password', asyncErrorHandler(authController.resetPassword));

/**
 * 更改密碼 (需要認證)
 * POST /auth/change-password
 */
router.post('/change-password', authenticateToken, asyncErrorHandler(authController.changePassword));

/**
 * 取得當前用戶資訊 (需要認證)
 * GET /auth/me
 */
router.get('/me', authenticateToken, asyncErrorHandler(authController.getMe));

/**
 * 路由說明 - 開發階段用途
 * GET /auth
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'NexusTrade 認證 API',
    version: '1.0.0',
    endpoints: {
      'POST /auth/register': '用戶註冊',
      'POST /auth/login': '用戶登入',
      'POST /auth/logout': '用戶登出',
      'POST /auth/refresh': '刷新 Token',
      'GET /auth/verify': '驗證 Token',
      'GET /auth/google': 'Google OAuth 2.0 登入',
      'GET /auth/google/callback': 'Google OAuth 2.0 回調',
      'GET /auth/line': 'LINE Login',
      'GET /auth/line/callback': 'LINE Login 回調',
      'GET /auth/oauth/status': '取得 OAuth 狀態',
      'POST /auth/forgot-password': '忘記密碼',
      'POST /auth/reset-password': '重設密碼',
      'POST /auth/change-password': '更改密碼',
      'GET /auth/me': '取得當前用戶資訊'
    },
    note: 'OAuth 認證系統已完成，使用統一的 REST API 實作',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;