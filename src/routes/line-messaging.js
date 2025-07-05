/**
 * LINE Messaging API 路由
 * 
 * 定義所有 LINE Messaging 相關的 API 端點
 * 提供統一的路由管理和中介軟體設定
 * 
 * @author NexusTrade 開發團隊
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const lineMessagingController = require('../controllers/line-messaging.controller');

// 中介軟體：請求日誌
router.use((req, res, next) => {
  console.log(`[LINE Messaging API] ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// 中介軟體：請求體大小限制
router.use(express.json({ limit: '10mb' }));

// 中介軟體：CORS 設定（如果需要）
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// ========== 核心訊息發送 API ==========

/**
 * 發送單一訊息
 * POST /api/line-messaging/send
 * 
 * Request Body:
 * {
 *   "userId": "LINE_USER_ID",
 *   "message": "訊息內容" | FlexMessage物件,
 *   "messageType": "text" | "flex",
 *   "options": {
 *     "altText": "替代文字",
 *     "quickReply": {...}
 *   }
 * }
 */
router.post('/send', lineMessagingController.sendMessage);

/**
 * 批量發送訊息
 * POST /api/line-messaging/batch
 * 
 * Request Body:
 * {
 *   "userIds": ["USER_ID_1", "USER_ID_2"],
 *   "message": "訊息內容" | FlexMessage物件,
 *   "messageType": "text" | "flex",
 *   "options": {
 *     "batchSize": 500,
 *     "batchDelay": 100,
 *     "altText": "替代文字"
 *   }
 * }
 */
router.post('/batch', lineMessagingController.sendBatchMessage);

/**
 * 使用模板發送訊息
 * POST /api/line-messaging/template
 * 
 * Request Body:
 * {
 *   "userId": "LINE_USER_ID",
 *   "templateName": "priceAlert" | "marketUpdate" | "welcome" | ...,
 *   "templateData": {
 *     // 模板特定的數據
 *   },
 *   "options": {
 *     "altText": "替代文字"
 *   }
 * }
 */
router.post('/template', lineMessagingController.sendTemplateMessage);

// ========== 服務管理 API ==========

/**
 * 取得服務狀態
 * GET /api/line-messaging/status
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "module": {...},
 *     "messenger": {...},
 *     "isConfigured": true,
 *     "availableTemplates": {...},
 *     "endpoints": {...}
 *   }
 * }
 */
router.get('/status', lineMessagingController.getStatus);

/**
 * 取得可用模板列表
 * GET /api/line-messaging/templates
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "text": [...],
 *     "flex": [...]
 *   }
 * }
 */
router.get('/templates', lineMessagingController.getTemplates);

/**
 * 測試連線
 * GET /api/line-messaging/test?testUserId=USER_ID
 * 
 * Query Parameters:
 * - testUserId (optional): 用於發送測試訊息的使用者 ID
 */
router.get('/test', lineMessagingController.testConnection);

// ========== Webhook 相關 API ==========

/**
 * 驗證 Webhook 簽名
 * POST /api/line-messaging/webhook/verify
 * 
 * Request Body:
 * {
 *   "body": "原始請求內容",
 *   "signature": "LINE-Signature header 值"
 * }
 */
router.post('/webhook/verify', lineMessagingController.verifyWebhookSignature);

// ========== 快速發送 API ==========

/**
 * 快速發送價格警報
 * POST /api/line-messaging/quick/price-alert
 * 
 * Request Body:
 * {
 *   "userId": "LINE_USER_ID",
 *   "alertData": {
 *     "symbol": "BTCUSDT",
 *     "currentPrice": "102000.50",
 *     "targetPrice": "100000.00",
 *     "alertType": "above" | "below",
 *     "changePercent": 2.0
 *   }
 * }
 */
router.post('/quick/price-alert', lineMessagingController.quickPriceAlert);

/**
 * 快速發送市場更新
 * POST /api/line-messaging/quick/market-update
 * 
 * Request Body:
 * {
 *   "userIds": ["USER_ID_1", "USER_ID_2"],
 *   "marketData": {
 *     "trending": [
 *       {
 *         "symbol": "BTC",
 *         "price": "102000.50",
 *         "change": 2.5
 *       }
 *     ],
 *     "summary": "市場保持上漲趨勢",
 *     "totalMarketCap": "2.5T",
 *     "btcDominance": "42.3",
 *     "fearGreedIndex": 65
 *   }
 * }
 */
router.post('/quick/market-update', lineMessagingController.quickMarketUpdate);

// ========== 錯誤處理 ==========

// 404 處理
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `找不到端點: ${req.method} ${req.originalUrl}`,
      availableEndpoints: [
        'POST /api/line-messaging/send',
        'POST /api/line-messaging/batch',
        'POST /api/line-messaging/template',
        'GET /api/line-messaging/status',
        'GET /api/line-messaging/templates',
        'GET /api/line-messaging/test',
        'POST /api/line-messaging/webhook/verify',
        'POST /api/line-messaging/quick/price-alert',
        'POST /api/line-messaging/quick/market-update'
      ]
    }
  });
});

// 錯誤處理中介軟體
router.use((error, req, res, next) => {
  console.error(`[LINE Messaging API] 錯誤:`, error);
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: '伺服器內部錯誤',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }
  });
});

module.exports = router;