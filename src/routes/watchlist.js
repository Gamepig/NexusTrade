/**
 * NexusTrade 關注清單路由
 * 
 * 提供個人化加密貨幣追蹤的 API 端點
 */

const express = require('express');
const router = express.Router();

// 控制器
const {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlistStatus,
  updateWatchlistItem,
  getWatchlistStats,
  batchUpdateWatchlist
} = require('../controllers/watchlist.controller');

// 中介軟體
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { createRateLimiter } = require('../middleware/rateLimit.middleware');

// 驗證規則
const { body, param, query } = require('express-validator');

/**
 * 關注清單驗證規則
 */
const watchlistValidation = {
  // 新增關注項目驗證
  add: [
    body('symbol')
      .isString()
      .isLength({ min: 6, max: 12 })
      .matches(/^[A-Z0-9]{2,12}(USDT|BTC|ETH|BNB|BUSD|FDUSD)$/)
      .withMessage('交易對格式不正確，例如：BTCUSDT, ETHUSDT'),
    body('displayName')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('顯示名稱長度不能超過 50 個字元'),
    body('priority')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('優先級必須是 1-5 之間的整數'),
    body('category')
      .optional()
      .isIn(['default', 'trading', 'longterm', 'watchonly'])
      .withMessage('分類必須是 default、trading、longterm 或 watchonly'),
    body('notes')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('備註長度不能超過 500 個字元')
  ],

  // 更新關注項目驗證
  update: [
    param('symbol')
      .isString()
      .isLength({ min: 6, max: 12 })
      .matches(/^[A-Z0-9]{2,12}(USDT|BTC|ETH|BNB|BUSD|FDUSD)$/i)
      .withMessage('無效的交易對格式'),
    body('displayName')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('顯示名稱長度不能超過 50 個字元'),
    body('priority')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('優先級必須是 1-5 之間的整數'),
    body('category')
      .optional()
      .isIn(['default', 'trading', 'longterm', 'watchonly'])
      .withMessage('分類必須是 default、trading、longterm 或 watchonly'),
    body('notes')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('備註長度不能超過 500 個字元')
  ],

  // 移除項目驗證
  remove: [
    param('symbol')
      .isString()
      .isLength({ min: 6, max: 12 })
      .matches(/^[A-Z0-9]{2,12}(USDT|BTC|ETH|BNB|BUSD|FDUSD)$/i)
      .withMessage('無效的交易對格式')
  ],

  // 檢查關注狀態驗證
  status: [
    param('symbol')
      .isString()
      .isLength({ min: 6, max: 12 })
      .matches(/^[A-Z0-9]{2,12}(USDT|BTC|ETH|BNB|BUSD|FDUSD)$/i)
      .withMessage('無效的交易對格式')
  ],

  // 取得關注清單查詢參數驗證
  list: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 30 })
      .withMessage('limit 必須是 1-30 之間的整數'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('offset 必須是非負整數')
  ],

  // 批量操作驗證
  batch: [
    body('operations')
      .isArray({ min: 1, max: 10 })
      .withMessage('operations 必須是包含 1-10 個項目的陣列'),
    body('operations.*.action')
      .isIn(['add', 'remove', 'update'])
      .withMessage('操作類型必須是 add、remove 或 update'),
    body('operations.*.symbol')
      .isString()
      .isLength({ min: 6, max: 12 })
      .matches(/^[A-Z0-9]{2,12}(USDT|BTC|ETH|BNB|BUSD|FDUSD)$/i)
      .withMessage('無效的交易對格式'),
    body('operations.*.data')
      .optional()
      .isObject()
      .withMessage('data 必須是物件格式')
  ]
};

/**
 * 速率限制設定
 */
const rateLimits = {
  // 一般查詢操作 - 每分鐘 100 次
  read: createRateLimiter({
    windowMs: 60 * 1000,
    max: 100,
    message: '查詢過於頻繁，請稍後再試'
  }),

  // 修改操作 - 每分鐘 50 次
  write: createRateLimiter({
    windowMs: 60 * 1000,
    max: 50,
    message: '操作過於頻繁，請稍後再試'
  }),

  // 批量操作 - 每分鐘 10 次
  batch: createRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: '批量操作過於頻繁，請稍後再試'
  }),

  // 狀態檢查 - 每分鐘 200 次
  status: createRateLimiter({
    windowMs: 60 * 1000,
    max: 200,
    message: '狀態檢查過於頻繁，請稍後再試'
  })
};

// ==================== 路由定義 ====================

/**
 * @route   GET /api/watchlist
 * @desc    取得使用者關注清單
 * @access  Private
 * @params  ?limit=30&offset=0
 */
router.get('/',
  authenticateToken,
  rateLimits.read,
  watchlistValidation.list,
  validateRequest,
  getWatchlist
);

/**
 * @route   POST /api/watchlist
 * @desc    新增項目到關注清單
 * @access  Private
 */
router.post('/',
  authenticateToken,
  rateLimits.write,
  watchlistValidation.add,
  validateRequest,
  addToWatchlist
);

/**
 * @route   DELETE /api/watchlist/:symbol
 * @desc    從關注清單移除項目
 * @access  Private
 */
router.delete('/:symbol',
  authenticateToken,
  rateLimits.write,
  watchlistValidation.remove,
  validateRequest,
  removeFromWatchlist
);

/**
 * @route   GET /api/watchlist/status/:symbol
 * @desc    檢查關注狀態
 * @access  Private
 */
router.get('/status/:symbol',
  authenticateToken,
  rateLimits.status,
  watchlistValidation.status,
  validateRequest,
  getWatchlistStatus
);

/**
 * @route   PUT /api/watchlist/:symbol
 * @desc    更新關注清單項目
 * @access  Private
 */
router.put('/:symbol',
  authenticateToken,
  rateLimits.write,
  watchlistValidation.update,
  validateRequest,
  updateWatchlistItem
);

/**
 * @route   GET /api/watchlist/stats
 * @desc    取得關注清單統計資訊
 * @access  Private
 */
router.get('/stats',
  authenticateToken,
  rateLimits.read,
  getWatchlistStats
);

/**
 * @route   POST /api/watchlist/batch
 * @desc    批量管理關注清單
 * @access  Private
 */
router.post('/batch',
  authenticateToken,
  rateLimits.batch,
  watchlistValidation.batch,
  validateRequest,
  batchUpdateWatchlist
);

// ==================== 健康檢查 ====================

/**
 * @route   GET /api/watchlist/health
 * @desc    關注清單服務健康檢查
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '關注清單服務運行正常',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: {
      maxWatchlistItems: 30,
      supportedQuoteAssets: ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD', 'FDUSD'],
      batchOperations: true,
      realTimePricing: true
    },
    endpoints: [
      'GET /api/watchlist - 取得關注清單',
      'POST /api/watchlist - 新增關注項目',
      'DELETE /api/watchlist/:symbol - 移除關注項目',
      'GET /api/watchlist/status/:symbol - 檢查關注狀態',
      'PUT /api/watchlist/:symbol - 更新關注項目',
      'GET /api/watchlist/stats - 統計資訊',
      'POST /api/watchlist/batch - 批量操作'
    ]
  });
});

// ==================== 錯誤處理 ====================

/**
 * 路由級錯誤處理中間件
 */
router.use((error, req, res, next) => {
  // 如果是驗證錯誤
  if (error.type === 'validation') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '請求參數驗證失敗',
        details: error.details
      }
    });
  }

  // 如果是速率限制錯誤
  if (error.type === 'rate_limit') {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: error.message,
        retryAfter: error.retryAfter
      }
    });
  }

  // 其他錯誤交給全域錯誤處理器
  next(error);
});

module.exports = router;