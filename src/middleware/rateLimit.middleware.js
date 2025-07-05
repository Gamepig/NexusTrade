/**
 * NexusTrade Rate Limiting 中介軟體
 * 
 * 提供細緻的 API 速率限制控制
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * 建立 rate limiter 的工廠函數
 * 
 * @param {Object} options - Rate limit 選項
 * @param {number} options.windowMs - 時間窗口（毫秒）
 * @param {number} options.max - 最大請求數
 * @param {string} options.message - 超限時的訊息
 * @param {Function} options.keyGenerator - 自訂 key 生成器（可選）
 * @returns {Function} Express 中介軟體
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000,          // 預設 1 分鐘
    max = 60,                      // 預設每分鐘 60 次請求
    message = '請求過於頻繁，請稍後再試',
    keyGenerator,                  // 可選的自訂 key 生成器
    skipSuccessfulRequests = false, // 是否跳過成功請求的計數
    skipFailedRequests = false     // 是否跳過失敗請求的計數
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message,
      retryAfter: Math.ceil(windowMs / 1000), // 重試間隔（秒）
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,        // 返回標準的 `RateLimit` 頭部
    legacyHeaders: false,         // 禁用 `X-RateLimit-*` 頭部
    keyGenerator: keyGenerator || ((req) => {
      // 預設使用 IP + User ID（如果已認證）
      const ip = req.ip || req.connection.remoteAddress;
      const userId = req.user?.id || 'anonymous';
      return `${ip}:${userId}`;
    }),
    skipSuccessfulRequests,
    skipFailedRequests,
    handler: (req, res, next, options) => {
      logger.warn(`Rate limit exceeded for ${req.ip}`, {
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        limit: max,
        window: windowMs
      });
      
      res.status(429).json(options.message);
    }
  });
};

/**
 * 預定義的 rate limiter 配置
 */
const rateLimiters = {
  /**
   * 一般讀取操作 - 每分鐘 60 次
   */
  read: createRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: '查詢請求過於頻繁，請稍後再試'
  }),

  /**
   * 寫入操作 - 每分鐘 30 次
   */
  write: createRateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    message: '修改操作過於頻繁，請稍後再試'
  }),

  /**
   * 批量操作 - 每分鐘 5 次
   */
  batch: createRateLimiter({
    windowMs: 60 * 1000,
    max: 5,
    message: '批量操作過於頻繁，請稍後再試'
  }),

  /**
   * 嚴格限制 - 每 5 分鐘 10 次
   */
  strict: createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: 10,
    message: '請求過於頻繁，請 5 分鐘後再試'
  }),

  /**
   * 寬鬆限制 - 每分鐘 120 次
   */
  loose: createRateLimiter({
    windowMs: 60 * 1000,
    max: 120,
    message: '請求過於頻繁，請稍後再試'
  })
};

/**
 * 使用者特定的 rate limiter
 * 已認證使用者有更高的限制
 */
const authenticatedRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100, // 已認證使用者可以有更高的限制
  message: '請求過於頻繁，請稍後再試',
  keyGenerator: (req) => {
    // 對已認證使用者使用 User ID 作為 key
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    // 對未認證使用者使用 IP
    return req.ip || req.connection.remoteAddress;
  }
});

/**
 * API 端點特定的 rate limiter
 */
const endpointSpecificLimiters = {
  // 登入端點 - 防止暴力破解
  login: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 分鐘
    max: 5, // 每 15 分鐘最多 5 次登入嘗試
    message: '登入嘗試過於頻繁，請 15 分鐘後再試',
    skipSuccessfulRequests: true // 成功登入不計入限制
  }),

  // 註冊端點
  register: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 小時
    max: 3, // 每小時最多 3 次註冊
    message: '註冊請求過於頻繁，請 1 小時後再試'
  }),

  // 密碼重設
  passwordReset: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 小時
    max: 3, // 每小時最多 3 次密碼重設
    message: '密碼重設請求過於頻繁，請 1 小時後再試'
  }),

  // 電子郵件發送
  sendEmail: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 小時
    max: 10, // 每小時最多 10 封電子郵件
    message: '電子郵件發送過於頻繁，請稍後再試'
  })
};

module.exports = {
  // 主要工廠函數
  createRateLimiter,
  
  // 預定義的 limiters
  ...rateLimiters,
  
  // 特殊 limiters
  authenticatedRateLimiter,
  endpointSpecificLimiters,
  
  // 直接導出工廠函數供向後相容
  default: createRateLimiter
};