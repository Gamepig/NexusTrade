/**
 * NexusTrade 主要 API 路由
 * 
 * 整合所有業務邏輯 API 路由
 * 包含市場數據、通知規則、使用者管理等
 */

const express = require('express');
const { asyncErrorHandler } = require('../middleware/errorHandler');
const { ApiErrorFactory } = require('../utils/ApiError');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * API 根路由 - 提供 API 資訊
 * GET /api
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'NexusTrade API',
    version: '1.0.0',
    documentation: '/api/docs',
    modules: {
      auth: {
        description: '認證與授權 API',
        endpoints: [
          'POST /api/auth/register - 用戶註冊',
          'POST /api/auth/login - 用戶登入',
          'POST /api/auth/logout - 用戶登出',
          'POST /api/auth/refresh - 刷新 Token',
          'GET /api/auth/verify - 驗證 Token',
          'GET /api/auth/me - 取得當前使用者資訊',
          'GET /api/auth/oauth/status - 取得 OAuth 狀態',
          'POST /api/auth/link/:provider - 連結 OAuth 帳戶',
          'DELETE /api/auth/link/:provider - 取消連結 OAuth 帳戶'
        ]
      },
      market: {
        description: '市場數據相關 API',
        endpoints: [
          'GET /api/market/symbols - 取得交易對列表',
          'GET /api/market/ticker/:symbol - 取得特定交易對價格',
          'GET /api/market/klines/:symbol - 取得 K 線數據',
          'GET /api/market/trends - 取得市場趨勢分析'
        ]
      },
      users: {
        description: '使用者管理 API',
        endpoints: [
          'GET /api/users/profile - 取得使用者資料',
          'PUT /api/users/profile - 更新使用者資料'
        ]
      },
      watchlist: {
        description: '關注清單管理 API（v2.0）',
        endpoints: [
          'GET /api/watchlist - 取得關注清單（支援分頁）',
          'POST /api/watchlist - 新增關注項目',
          'DELETE /api/watchlist/:symbol - 移除關注項目',
          'GET /api/watchlist/status/:symbol - 檢查關注狀態',
          'PUT /api/watchlist/:symbol - 更新關注項目',
          'GET /api/watchlist/stats - 取得統計資訊',
          'POST /api/watchlist/batch - 批量操作（最多10個）',
          'GET /api/watchlist/health - 服務健康檢查'
        ]
      },
      notifications: {
        description: '通知系統 API',
        endpoints: [
          'GET /api/notifications/rules - 取得通知規則',
          'POST /api/notifications/rules - 建立通知規則',
          'PUT /api/notifications/rules/:id - 更新通知規則',
          'DELETE /api/notifications/rules/:id - 刪除通知規則',
          'POST /api/notifications/test - 測試通知發送'
        ]
      },
      news: {
        description: '新聞系統 API',
        endpoints: [
          'GET /api/news/latest - 取得最新新聞 (跑馬燈)',
          'GET /api/news - 分頁取得新聞',
          'GET /api/news/search - 搜尋新聞',
          'GET /api/news/sources - 取得新聞來源',
          'POST /api/news/refresh - 重新整理新聞快取',
          'GET /api/news/stats - 取得新聞統計',
          'GET /api/news/:newsId/click - 新聞點擊追蹤'
        ]
      },
      ai: {
        description: 'AI 分析 API (OpenRouter 整合)',
        endpoints: [
          'GET /api/ai/status - 取得 AI 服務狀態',
          'POST /api/ai/trend-analysis - 趨勢分析',
          'POST /api/ai/technical-analysis - 技術指標分析',
          'POST /api/ai/investment-advice - 投資建議生成',
          'POST /api/ai/risk-assessment - 風險評估',
          'POST /api/ai/comprehensive-analysis - 綜合分析報告',
          'POST /api/ai/batch-analysis - 批量分析',
          'DELETE /api/ai/cache - 清理分析快取',
          'GET /api/ai/homepage-analysis - 獲取首頁大趨勢分析',
          'POST /api/ai/homepage-analysis/refresh - 強制重新分析首頁',
          'GET /api/ai/currency-analysis/:symbol - 獲取單一貨幣分析',
          'POST /api/ai/currency-analysis/:symbol/refresh - 強制重新分析單一貨幣'
        ]
      }
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== 市場數據 API ====================

/**
 * 市場數據模組路由
 */
router.use('/market', require('./market'));

/**
 * 通知系統模組路由
 */
router.use('/notifications', require('./notifications'));

/**
 * 新聞系統模組路由
 */
router.use('/news', require('./news'));

/**
 * 認證系統模組路由 (OAuth 和基本認證)
 */
router.use('/auth', require('./auth'));

/**
 * 關注清單模組路由（v2.0 - 使用獨立的 Watchlist 模型）
 */
router.use('/watchlist', require('./watchlist'));

/**
 * AI 分析模組路由
 */
router.use('/ai', require('./ai-analysis'));

// ==================== 使用者管理 API ====================

/**
 * 使用者資料管理
 */
router.get('/users/profile', asyncErrorHandler(async (req, res) => {
  logger.info('取得使用者資料請求', { userId: req.user?.id });
  
  res.status(501).json({
    status: 'error',
    message: '使用者資料查詢功能尚未實現',
    code: 'NOT_IMPLEMENTED',
    plannedImplementation: 'Task 3 - 使用者認證系統',
    timestamp: new Date().toISOString()
  });
}));

router.put('/users/profile', asyncErrorHandler(async (req, res) => {
  logger.info('更新使用者資料請求', { userId: req.user?.id });
  
  res.status(501).json({
    status: 'error',
    message: '使用者資料更新功能尚未實現',
    code: 'NOT_IMPLEMENTED',
    plannedImplementation: 'Task 3 - 使用者認證系統',
    timestamp: new Date().toISOString()
  });
}));

/**
 * 關注清單管理 - 已遷移至 /api/watchlist
 * 
 * 舊的 /users/watchlist 路由已被廢棄，請使用新的 /api/watchlist 端點
 */
router.get('/users/watchlist', asyncErrorHandler(async (req, res) => {
  logger.warn('使用已廢棄的 /users/watchlist 端點', { userId: req.user?.id });
  
  res.status(410).json({
    status: 'error',
    message: '此端點已廢棄，請使用 /api/watchlist',
    code: 'ENDPOINT_DEPRECATED',
    redirectTo: '/api/watchlist',
    deprecatedSince: '2025-01-28',
    timestamp: new Date().toISOString()
  });
}));

router.post('/users/watchlist', asyncErrorHandler(async (req, res) => {
  logger.warn('使用已廢棄的 /users/watchlist 端點', { 
    userId: req.user?.id, 
    symbol: req.body.symbol 
  });
  
  res.status(410).json({
    status: 'error',
    message: '此端點已廢棄，請使用 POST /api/watchlist',
    code: 'ENDPOINT_DEPRECATED',
    redirectTo: '/api/watchlist',
    deprecatedSince: '2025-01-28',
    timestamp: new Date().toISOString()
  });
}));

// ==================== 通知系統 API ====================

/**
 * 通知規則管理
 */
router.get('/notifications/rules', asyncErrorHandler(async (req, res) => {
  logger.info('取得通知規則請求', { userId: req.user?.id });
  
  res.status(501).json({
    status: 'error',
    message: '通知規則查詢功能尚未實現',
    code: 'NOT_IMPLEMENTED',
    plannedImplementation: 'Task 6 - 通知系統',
    timestamp: new Date().toISOString()
  });
}));

router.post('/notifications/rules', asyncErrorHandler(async (req, res) => {
  logger.info('建立通知規則請求', { 
    userId: req.user?.id,
    body: req.body
  });
  
  res.status(501).json({
    status: 'error',
    message: '建立通知規則功能尚未實現',
    code: 'NOT_IMPLEMENTED',
    plannedImplementation: 'Task 6 - 通知系統',
    timestamp: new Date().toISOString()
  });
}));

router.put('/notifications/rules/:id', asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  logger.info('更新通知規則請求', { 
    userId: req.user?.id,
    ruleId: id
  });
  
  res.status(501).json({
    status: 'error',
    message: `更新通知規則 ${id} 功能尚未實現`,
    code: 'NOT_IMPLEMENTED',
    plannedImplementation: 'Task 6 - 通知系統',
    timestamp: new Date().toISOString()
  });
}));

router.delete('/notifications/rules/:id', asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  logger.info('刪除通知規則請求', { 
    userId: req.user?.id,
    ruleId: id
  });
  
  res.status(501).json({
    status: 'error',
    message: `刪除通知規則 ${id} 功能尚未實現`,
    code: 'NOT_IMPLEMENTED',
    plannedImplementation: 'Task 6 - 通知系統',
    timestamp: new Date().toISOString()
  });
}));

// ==================== AI 分析 API ====================
// AI 分析功能已整合至 /ai-analysis 路由模組

// ==================== 測試端點 ====================

/**
 * API 測試端點
 * GET /api/test
 */
router.get('/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API 測試成功',
    timestamp: new Date().toISOString(),
    server: {
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime()
    }
  });
});

/**
 * 受保護的測試端點 (需要認證)
 * GET /api/test/protected
 */
router.get('/test/protected', asyncErrorHandler(async (req, res) => {
  // TODO: 實現認證中介軟體後才能正常運作
  res.status(501).json({
    status: 'error',
    message: '受保護端點測試功能尚未實現 (需要認證中介軟體)',
    code: 'NOT_IMPLEMENTED',
    plannedImplementation: 'Task 3 - 使用者認證系統',
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;