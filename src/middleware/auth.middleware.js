/**
 * NexusTrade 認證中介軟體
 * 
 * 處理 JWT Token 驗證、使用者權限檢查等認證相關功能
 */

const jwt = require('jsonwebtoken');
// 在開發階段使用 Mock 使用者 (因為 MongoDB 未安裝)
const { MockUser } = require('../controllers/auth.controller.mock');
const { ApiErrorFactory, BusinessErrorFactory } = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * 驗證 JWT Token
 */
const authenticateToken = async (req, res, next) => {
  try {
    // 從 Header 取得 Token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      throw ApiErrorFactory.unauthorized('存取 Token 為必填', 'ACCESS_TOKEN_REQUIRED');
    }

    // 驗證 Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查找使用者
    const user = await MockUser.findById(decoded.userId);
    if (!user) {
      throw BusinessErrorFactory.userNotFound(decoded.userId);
    }

    // 檢查帳戶狀態
    if (user.status !== 'active') {
      throw BusinessErrorFactory.accountDisabled();
    }

    // 將使用者資訊附加到請求物件
    req.user = user;
    req.userId = user._id;
    req.token = token;

    // 記錄使用者活動
    logger.logUserAction(user._id, 'api_access', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(ApiErrorFactory.unauthorized('無效的 JWT Token', 'INVALID_JWT'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(ApiErrorFactory.unauthorized('JWT Token 已過期', 'JWT_EXPIRED'));
    }
    if (error.name === 'NotBeforeError') {
      return next(ApiErrorFactory.unauthorized('JWT Token 尚未生效', 'JWT_NOT_BEFORE'));
    }
    
    next(error);
  }
};

/**
 * 可選的認證 - Token 存在則驗證，不存在也允許通過
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      // 沒有 Token，設定為匿名使用者
      req.user = null;
      req.userId = null;
      req.token = null;
      return next();
    }

    // 有 Token，嘗試驗證
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await MockUser.findById(decoded.userId);
    
    if (user && user.status === 'active') {
      req.user = user;
      req.userId = user._id;
      req.token = token;
      
      logger.logUserAction(user._id, 'api_access_optional', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip
      });
    }

    next();
  } catch (error) {
    // 可選認證時，Token 錯誤不應阻擋請求
    logger.warn('可選認證失敗，繼續以匿名身份處理', {
      error: error.message,
      url: req.originalUrl,
      ip: req.ip
    });
    
    req.user = null;
    req.userId = null;
    req.token = null;
    next();
  }
};

/**
 * 檢查使用者權限
 */
const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiErrorFactory.unauthorized('需要認證後才能存取', 'AUTHENTICATION_REQUIRED'));
    }

    // 如果沒有指定角色，只需要登入即可
    if (!requiredRoles || requiredRoles.length === 0) {
      return next();
    }

    // 檢查使用者角色 (目前版本簡化，所有使用者都是一般使用者)
    // 未來可擴展為 admin, moderator, premium 等角色
    const userRoles = ['user']; // 預設所有使用者都是 'user' 角色
    
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return next(ApiErrorFactory.forbidden(
        `需要以下角色之一: ${requiredRoles.join(', ')}`,
        'INSUFFICIENT_PERMISSIONS',
        { requiredRoles, userRoles }
      ));
    }

    next();
  };
};

/**
 * 檢查是否為帳戶擁有者或管理員
 */
const requireOwnershipOrAdmin = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiErrorFactory.unauthorized('需要認證後才能存取', 'AUTHENTICATION_REQUIRED'));
    }

    const targetUserId = req.params[userIdParam] || req.body[userIdParam];
    
    // 檢查是否為帳戶擁有者
    if (req.userId.toString() === targetUserId) {
      return next();
    }

    // 檢查是否為管理員 (未來實現)
    // if (req.user.role === 'admin') {
    //   return next();
    // }

    return next(ApiErrorFactory.forbidden(
      '只能存取自己的資源',
      'RESOURCE_ACCESS_DENIED',
      { requestedUserId: targetUserId, currentUserId: req.userId }
    ));
  };
};

/**
 * 驗證電子郵件
 */
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return next(ApiErrorFactory.unauthorized('需要認證後才能存取', 'AUTHENTICATION_REQUIRED'));
  }

  if (!req.user.emailVerified) {
    return next(ApiErrorFactory.forbidden(
      '需要驗證電子郵件後才能存取此功能',
      'EMAIL_VERIFICATION_REQUIRED',
      { email: req.user.email }
    ));
  }

  next();
};

/**
 * 檢查帳戶狀態
 */
const requireActiveAccount = (req, res, next) => {
  if (!req.user) {
    return next(ApiErrorFactory.unauthorized('需要認證後才能存取', 'AUTHENTICATION_REQUIRED'));
  }

  switch (req.user.status) {
    case 'active':
      return next();
    case 'inactive':
      return next(ApiErrorFactory.forbidden('帳戶未啟用', 'ACCOUNT_INACTIVE'));
    case 'suspended':
      return next(ApiErrorFactory.forbidden('帳戶已被暫停', 'ACCOUNT_SUSPENDED'));
    case 'deleted':
      return next(ApiErrorFactory.forbidden('帳戶已被刪除', 'ACCOUNT_DELETED'));
    default:
      return next(ApiErrorFactory.forbidden('帳戶狀態異常', 'ACCOUNT_STATUS_INVALID'));
  }
};

/**
 * 限制 API 使用頻率 (基於使用者)
 */
const rateLimitByUser = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    const userId = req.userId || req.ip; // 使用 userId 或 IP
    const now = Date.now();
    const windowStart = now - windowMs;

    // 清理過期的記錄
    if (userRequests.has(userId)) {
      const requests = userRequests.get(userId);
      const validRequests = requests.filter(time => time > windowStart);
      userRequests.set(userId, validRequests);
    }

    // 檢查當前請求數
    const currentRequests = userRequests.get(userId) || [];
    
    if (currentRequests.length >= maxRequests) {
      return next(ApiErrorFactory.tooManyRequests(
        `超過限制，每 ${Math.round(windowMs / 60000)} 分鐘最多 ${maxRequests} 次請求`,
        'USER_RATE_LIMIT_EXCEEDED',
        {
          limit: maxRequests,
          windowMs,
          userId: req.userId || 'anonymous'
        }
      ));
    }

    // 記錄此次請求
    currentRequests.push(now);
    userRequests.set(userId, currentRequests);

    // 設定回應標頭
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': Math.max(0, maxRequests - currentRequests.length),
      'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
    });

    next();
  };
};

// JWT 相關函數已移到 utils/jwt.js
const { generateToken, generateRefreshToken, verifyRefreshToken, extractUserFromToken } = require('../utils/jwt');

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireOwnershipOrAdmin,
  requireEmailVerification,
  requireActiveAccount,
  rateLimitByUser
};