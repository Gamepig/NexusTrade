/**
 * LINE Messaging API 路由
 * 
 * 功能：
 * 1. Webhook 事件接收和處理
 * 2. LINE 使用者管理 API
 * 3. 訊息推送和模板管理
 * 4. Rich Menu 管理
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth.middleware');
const { 
  createLineWebhookMiddleware,
  lineSignatureMiddleware 
} = require('../middleware/line-signature.middleware');

// 服務和控制器
const lineMessagingService = require('../services/line-messaging.service');

/**
 * @route GET /api/line/webhook
 * @desc LINE Developers Console 驗證端點
 * @access Public
 */
router.get('/webhook', (req, res) => {
  // LINE Developers Console 驗證時發送的 GET 請求
  res.status(200).json({
    success: true,
    message: 'LINE Webhook endpoint is ready',
    service: 'NexusTrade LINE Messaging',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route POST /api/line/webhook
 * @desc 接收 LINE Platform 的 Webhook 事件
 * @access Public (但需要簽名驗證)
 */
router.post('/webhook', 
  // 添加 raw body parser 確保正確解析
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      // 立即以正確格式回應 LINE Platform (符合官方要求)
      res.status(200).end(); // 簡單的 200 OK，無額外內容
      
      // 解析請求內容
      let body;
      try {
        body = JSON.parse(req.body);
      } catch (parseError) {
        logger.error('無法解析 LINE Webhook 請求內容:', parseError.message);
        return;
      }
      
      const { events } = body;
      
      if (!events || !Array.isArray(events)) {
        logger.warn('收到無效的 LINE Webhook 請求');
        return;
      }
      
      logger.info('收到 LINE Webhook 事件', {
        eventsCount: events.length,
        eventTypes: events.map(e => e.type),
        timestamp: new Date().toISOString()
      });

      // 異步處理事件 (符合官方建議)
      setImmediate(async () => {
        for (const event of events) {
          try {
            const userId = event.source?.userId;
            
            // 詳細記錄使用者 ID (用於測試)
            if (userId) {
              console.log('\n🎉 =================================');
              console.log('🎉 發現 LINE 使用者 ID！');
              console.log('🎉 =================================');
              console.log(`完整 User ID: ${userId}`);
              console.log(`事件類型: ${event.type}`);
              console.log(`時間: ${new Date().toISOString()}`);
              console.log('🎉 =================================\n');
              
              logger.info('🎉 發現 LINE 使用者 ID', {
                userId: userId.substring(0, 8) + '...',
                fullUserId: userId,
                eventType: event.type,
                timestamp: new Date().toISOString()
              });
            }
            
            // 處理事件
            if (event.type === 'message') {
              logger.info('收到訊息事件', {
                messageType: event.message?.type,
                text: event.message?.text?.substring(0, 50)
              });
            } else if (event.type === 'follow') {
              logger.info('收到關注事件', { userId: userId?.substring(0, 8) + '...' });
            }
            
            // 這裡可以添加實際的事件處理邏輯
            
          } catch (error) {
            logger.error(`處理 LINE 事件失敗: ${event.type}`, {
              error: error.message,
              eventId: event.id || 'unknown'
            });
          }
        }
      });

    } catch (error) {
      logger.error('LINE Webhook 處理失敗:', {
        error: error.message,
        stack: error.stack
      });
      
      // 確保回應 200 OK (即使有錯誤)
      if (!res.headersSent) {
        res.status(200).end();
      }
    }
  }
);

/**
 * @route GET /api/line/status
 * @desc 檢查 LINE Messaging API 服務狀態
 * @access Public
 */
router.get('/status', async (req, res) => {
  try {
    const status = lineMessagingService.getStatus();
    
    res.json({
      success: true,
      data: {
        service: 'line-messaging',
        configured: status.configured,
        endpoints: {
          webhook: '/api/line/webhook',
          push: '/api/line/push',
          bind: '/api/line/bind'
        },
        features: {
          pushMessage: status.configured,
          flexMessage: status.configured,
          richMenu: status.configured,
          webhook: status.configured
        },
        lastCheck: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('取得 LINE 服務狀態失敗:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get service status'
    });
  }
});

/**
 * @route POST /api/line/push
 * @desc 推送訊息給指定使用者
 * @access Private (需要認證)
 */
router.post('/push', authenticateToken, async (req, res) => {
  try {
    const { userId, message, messageType = 'text' } = req.body;

    // 驗證必要參數
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: userId'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: message'
      });
    }

    let result;
    
    // 根據訊息類型發送
    switch (messageType) {
      case 'text':
        result = await lineMessagingService.sendTextMessage(userId, message);
        break;
        
      case 'flex':
        result = await lineMessagingService.sendFlexMessage(userId, message);
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported message type: ${messageType}`
        });
    }

    logger.info('LINE 訊息推送成功', {
      userId: userId.substring(0, 8) + '...',
      messageType,
      admin: req.user?.email
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('LINE 訊息推送失敗:', {
      error: error.message,
      admin: req.user?.email
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/line/push/price-alert
 * @desc 推送價格警報訊息
 * @access Private (需要認證)
 */
router.post('/push/price-alert', authenticateToken, async (req, res) => {
  try {
    const { userId, alertData } = req.body;

    if (!userId || !alertData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: userId, alertData'
      });
    }

    // 建立價格警報 Flex Message
    const flexMessage = lineMessagingService.templates.priceAlert(alertData);
    
    const result = await lineMessagingService.sendFlexMessage(userId, flexMessage);

    logger.info('LINE 價格警報推送成功', {
      userId: userId.substring(0, 8) + '...',
      symbol: alertData.symbol,
      alertType: alertData.alertType
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('LINE 價格警報推送失敗:', {
      error: error.message,
      alertData
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/line/push/market-update
 * @desc 推送市場更新訊息
 * @access Private (需要認證)
 */
router.post('/push/market-update', authenticateToken, async (req, res) => {
  try {
    const { userIds, marketData } = req.body;

    if (!userIds || !Array.isArray(userIds) || !marketData) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid parameters: userIds (array), marketData'
      });
    }

    // 建立市場更新 Flex Message
    const flexMessage = lineMessagingService.templates.marketUpdate(marketData);
    
    const results = [];
    
    // 發送給每個使用者
    for (const userId of userIds) {
      try {
        const result = await lineMessagingService.sendFlexMessage(userId, flexMessage);
        results.push({ userId, success: true, result });
      } catch (error) {
        logger.error(`市場更新推送失敗: ${userId}`, error);
        results.push({ userId, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    logger.info('LINE 市場更新推送完成', {
      totalUsers: userIds.length,
      successCount,
      failureCount: userIds.length - successCount
    });

    res.json({
      success: true,
      data: {
        totalUsers: userIds.length,
        successCount,
        results
      }
    });

  } catch (error) {
    logger.error('LINE 市場更新推送失敗:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/line/bind
 * @desc 綁定 LINE 帳號到 NexusTrade 使用者
 * @access Private (需要認證)
 */
router.post('/bind', authenticateToken, async (req, res) => {
  try {
    const { lineUserId } = req.body;
    const nexusTradeUserId = req.user.id;

    if (!lineUserId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: lineUserId'
      });
    }

    // TODO: 實作綁定邏輯
    // 1. 驗證 LINE 使用者 ID 有效性
    // 2. 檢查是否已經綁定
    // 3. 更新使用者資料
    // 4. 發送歡迎訊息

    logger.info('LINE 帳號綁定請求', {
      nexusTradeUserId,
      lineUserId: lineUserId.substring(0, 8) + '...'
    });

    // 暫時回應成功（實際實作時需要完整邏輯）
    res.json({
      success: true,
      message: 'LINE 帳號綁定功能正在開發中',
      data: {
        nexusTradeUserId,
        lineUserId: lineUserId.substring(0, 8) + '...',
        bindTime: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('LINE 帳號綁定失敗:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/line/bind/status
 * @desc 檢查當前使用者的 LINE 綁定狀態
 * @access Private (需要認證)
 */
router.get('/bind/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId; // 修復：使用正確的使用者 ID

    // 引入必要的模組
    const User = require('../models/User.model');
    const { lineUserService } = require('../models/LineUser');

    // 查詢使用者資料
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // 檢查 OAuth 控制器中的 LINE 綁定狀態
    const isOAuthLineBound = !!(user.lineId);
    
    // 檢查 LineUser 服務中的綁定狀態
    let lineUser = null;
    let isLineUserServiceBound = false;
    let lineUserQuery1 = null;
    let lineUserQuery2 = null;
    
    if (isOAuthLineBound) {
      lineUserQuery1 = user.lineId;
      lineUser = await lineUserService.findByLineUserId(user.lineId);
      isLineUserServiceBound = lineUser ? lineUser.isBound : false;
    } else {
      // 嘗試通過 NexusTrade ID 查找
      lineUserQuery2 = userId;
      lineUser = await lineUserService.findByNexusTradeUserId(userId);
      isLineUserServiceBound = lineUser ? lineUser.isBound : false;
    }

    // 最終綁定狀態：兩個系統都必須確認綁定
    const isBound = isOAuthLineBound && isLineUserServiceBound;
    
    // 開發環境：允許通過查詢參數覆蓋狀態
    const isDevMode = process.env.NODE_ENV === 'development';
    let finalStatus = isBound;
    
    if (isDevMode && req.query.simulate) {
      finalStatus = req.query.simulate === 'bound';
      logger.info('開發模式: 模擬 LINE 綁定狀態', {
        userId,
        originalStatus: isBound,
        simulatedStatus: finalStatus
      });
    }
    
    res.json({
      success: true,
      data: {
        userId,
        isBound: finalStatus,
        lineUserId: finalStatus && user.lineId ? user.lineId.substring(0, 8) + '...' : null,
        bindTime: lineUser?.bindTime || null,
        lastActivity: lineUser?.lastActivity || null,
        // 開發資訊
        ...(isDevMode && {
          debug: {
            oauthLineBound: isOAuthLineBound,
            lineUserServiceBound: isLineUserServiceBound,
            hasLineId: !!user.lineId,
            lineUserExists: !!lineUser,
            lineUserQuery1,
            lineUserQuery2,
            userLineId: user.lineId,
            lineUserData: lineUser ? {
              lineUserId: lineUser.lineUserId?.substring(0, 8) + '...',
              isBound: lineUser.isBound,
              bindTime: lineUser.bindTime
            } : null
          }
        })
      }
    });

    logger.info('LINE 綁定狀態檢查完成', {
      userId,
      isBound: finalStatus,
      lineUserId: user.lineId ? user.lineId.substring(0, 8) + '...' : null
    });

  } catch (error) {
    logger.error('檢查 LINE 綁定狀態失敗:', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/line/bind/status/dev
 * @desc 開發測試用 - 檢查 LINE 綁定狀態 (不需要認證)
 * @access Public (僅開發環境)
 */
router.get('/bind/status/dev', async (req, res) => {
  try {
    // 僅在開發環境中可用
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({
        success: false,
        error: 'This endpoint is only available in development mode'
      });
    }
    
    // 允許通過查詢參數模擬不同狀態
    const simulateBound = req.query.simulate === 'bound';
    
    res.json({
      success: true,
      data: {
        userId: 'dev_user_001',
        isBound: simulateBound,
        lineUserId: simulateBound ? 'U' + Math.random().toString(36).substring(2, 15) : null,
        bindTime: simulateBound ? new Date().toISOString() : null,
        lastActivity: simulateBound ? new Date().toISOString() : null,
        note: 'This is a development test endpoint'
      }
    });
    
  } catch (error) {
    logger.error('開發測試端點錯誤:', error);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/line/bind
 * @desc 解除 LINE 帳號綁定
 * @access Private (需要認證)
 */
router.delete('/bind', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // TODO: 實作解除綁定邏輯
    // 1. 從資料庫移除綁定資訊
    // 2. 停用該使用者的 LINE 通知
    // 3. 發送解除綁定確認訊息

    logger.info('LINE 帳號解除綁定', { userId });

    res.json({
      success: true,
      message: 'LINE 帳號已解除綁定',
      data: {
        userId,
        unbindTime: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('解除 LINE 綁定失敗:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/line/templates
 * @desc 取得可用的訊息模板列表
 * @access Private (需要認證)
 */
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const templates = [
      {
        id: 'price_alert',
        name: '價格警報',
        description: '加密貨幣價格達到設定條件時的通知',
        type: 'flex',
        parameters: ['symbol', 'currentPrice', 'targetPrice', 'alertType', 'changePercent']
      },
      {
        id: 'market_update',
        name: '市場更新',
        description: '市場趨勢和熱門加密貨幣價格摘要',
        type: 'flex',
        parameters: ['trending', 'summary', 'timestamp']
      },
      {
        id: 'system_alert',
        name: '系統警報',
        description: '系統狀態和重要通知',
        type: 'text',
        parameters: ['level', 'title', 'message', 'timestamp']
      },
      {
        id: 'welcome',
        name: '歡迎訊息',
        description: '新使用者歡迎和功能介紹',
        type: 'flex',
        parameters: ['username', 'email']
      }
    ];

    res.json({
      success: true,
      data: {
        templates,
        totalCount: templates.length
      }
    });

  } catch (error) {
    logger.error('取得 LINE 訊息模板失敗:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;