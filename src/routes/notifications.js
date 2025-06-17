/**
 * NexusTrade 通知系統路由
 * 
 * 處理通知相關的所有路由
 */

const express = require('express');
const { asyncErrorHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth.middleware');
const notificationController = require('../controllers/notification.controller');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 通知系統狀態
 * GET /api/notifications/status
 */
router.get('/status', asyncErrorHandler(notificationController.getNotificationStatus));

/**
 * 發送測試通知
 * POST /api/notifications/test
 */
router.post('/test', asyncErrorHandler(notificationController.sendTestNotification));

/**
 * LINE Notify OAuth 授權 URL
 * GET /api/notifications/line-notify/auth-url
 */
router.get('/line-notify/auth-url', asyncErrorHandler(notificationController.getLineNotifyAuthUrl));

/**
 * LINE Notify OAuth 回調
 * GET /api/notifications/line-notify/callback
 */
router.get('/line-notify/callback', asyncErrorHandler(notificationController.handleLineNotifyCallback));

// ==================== 需要認證的路由 ====================

/**
 * 建立價格警報 (需要認證)
 * POST /api/notifications/alerts
 */
router.post('/alerts', authenticateToken, asyncErrorHandler(notificationController.createPriceAlert));

/**
 * 取得使用者的價格警報 (需要認證)
 * GET /api/notifications/alerts
 */
router.get('/alerts', authenticateToken, asyncErrorHandler(notificationController.getUserAlerts));

/**
 * 更新價格警報 (需要認證)
 * PUT /api/notifications/alerts/:id
 */
router.put('/alerts/:id', authenticateToken, asyncErrorHandler(notificationController.updatePriceAlert));

/**
 * 刪除價格警報 (需要認證)
 * DELETE /api/notifications/alerts/:id
 */
router.delete('/alerts/:id', authenticateToken, asyncErrorHandler(notificationController.deletePriceAlert));

/**
 * 暫停/恢復價格警報 (需要認證)
 * PATCH /api/notifications/alerts/:id/toggle
 */
router.patch('/alerts/:id/toggle', authenticateToken, asyncErrorHandler(notificationController.togglePriceAlert));

/**
 * 取得警報統計 (需要認證)
 * GET /api/notifications/stats
 */
router.get('/stats', authenticateToken, asyncErrorHandler(notificationController.getAlertStats));

/**
 * 發送市場更新通知 (需要認證)
 * POST /api/notifications/market-update
 */
router.post('/market-update', authenticateToken, asyncErrorHandler(notificationController.sendMarketUpdate));

/**
 * 路由說明 - 開發階段用途
 * GET /api/notifications
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'NexusTrade 通知系統 API',
    version: '1.0.0',
    endpoints: {
      // 公開端點
      'GET /api/notifications/status': '通知系統狀態',
      'POST /api/notifications/test': '發送測試通知',
      'GET /api/notifications/line-notify/auth-url': 'LINE Notify OAuth 授權 URL',
      'GET /api/notifications/line-notify/callback': 'LINE Notify OAuth 回調',
      
      // 需要認證的端點
      'POST /api/notifications/alerts': '建立價格警報 (需要認證)',
      'GET /api/notifications/alerts': '取得價格警報列表 (需要認證)',
      'PUT /api/notifications/alerts/:id': '更新價格警報 (需要認證)',
      'DELETE /api/notifications/alerts/:id': '刪除價格警報 (需要認證)',
      'PATCH /api/notifications/alerts/:id/toggle': '暫停/恢復價格警報 (需要認證)',
      'GET /api/notifications/stats': '取得警報統計 (需要認證)',
      'POST /api/notifications/market-update': '發送市場更新通知 (需要認證)'
    },
    features: {
      priceAlerts: {
        types: ['price_above', 'price_below', 'percent_change', 'volume_spike'],
        methods: ['line_notify', 'email', 'webhook'],
        conditions: ['minInterval', 'maxTriggers', 'confirmationTime', 'onlyTradingHours']
      },
      lineNotify: {
        oauth: true,
        templates: ['priceAlert', 'marketUpdate', 'systemAlert', 'welcome'],
        features: ['text', 'images', 'batch_sending']
      }
    },
    parameters: {
      alerts: {
        'symbol': '交易對符號 (必填)',
        'alertType': '警報類型 (必填)',
        'targetPrice': '目標價格 (價格警報用)',
        'percentChange': '百分比變化 (百分比警報用)',
        'priority': '優先級 (low/medium/high/critical)',
        'notificationMethods': '通知方式設定',
        'conditions': '觸發條件設定'
      },
      pagination: {
        'page': '頁數 (預設: 1)',
        'limit': '每頁數量 (預設: 20)'
      }
    },
    note: '價格警報支援多種觸發條件和通知方式',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;