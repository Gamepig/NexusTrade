/**
 * NexusTrade 通知系統控制器
 * 
 * 處理通知相關的所有 API 端點
 * 更新: 移除已停用的 LINE Notify，整合 LINE Messaging API
 */

const lineMessagingService = require('../services/line-messaging.service');
const PriceAlert = require('../models/PriceAlert');
const { getBinanceService } = require('../services/binance.service');
const { ApiErrorFactory, ValidationErrorFactory } = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * 取得通知系統狀態
 * GET /api/notifications/status
 */
const getNotificationStatus = async (req, res) => {
  try {
    const lineMessagingStatus = lineMessagingService.getStatus();
    
    res.status(200).json({
      status: 'success',
      message: '取得通知系統狀態成功',
      data: {
        lineMessaging: {
          ...lineMessagingStatus,
          note: 'LINE Messaging API (取代已停用的 LINE Notify)'
        },
        email: {
          configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
          provider: process.env.SMTP_HOST || '未設定'
        },
        telegram: {
          configured: !!process.env.TELEGRAM_BOT_TOKEN,
          webhookConfigured: !!process.env.TELEGRAM_WEBHOOK_URL
        },
        webhook: {
          configured: !!process.env.DEFAULT_WEBHOOK_URL,
          defaultUrl: process.env.DEFAULT_WEBHOOK_URL ? '已設定' : '未設定'
        },
        services: {
          priceAlerts: true,
          marketUpdates: true,
          systemAlerts: true,
          multiChannelSupport: true
        },
        supportedMethods: ['line_messaging', 'email', 'telegram', 'webhook'],
        deprecationNotice: {
          lineNotify: '已於 2025/3/31 停用',
          migration: '請使用 LINE Messaging API'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('取得通知系統狀態失敗:', error.message);
    throw error;
  }
};

/**
 * 發送測試通知
 * POST /api/notifications/test
 */
const sendTestNotification = async (req, res) => {
  try {
    const { method = 'email', recipient, message = '這是來自 NexusTrade 的測試通知' } = req.body;
    
    if (!recipient) {
      throw ValidationErrorFactory.missingField('recipient', '請提供接收者資訊 (email、用戶ID 或 webhook URL)');
    }
    
    let result;
    
    switch (method) {
      case 'line_messaging':
        if (!lineMessagingService.isConfigured) {
          throw ApiErrorFactory.badRequest('LINE Messaging API 未設定');
        }
        result = await lineMessagingService.sendTextMessage(recipient, message);
        break;
        
      case 'email':
        // TODO: 實作 Email 服務
        result = {
          success: false,
          message: 'Email 通知服務尚未實作',
          method: 'email'
        };
        break;
        
      case 'telegram':
        // TODO: 實作 Telegram 服務
        result = {
          success: false,
          message: 'Telegram 通知服務尚未實作',
          method: 'telegram'
        };
        break;
        
      case 'webhook':
        // TODO: 實作 Webhook 服務
        result = {
          success: false,
          message: 'Webhook 通知服務尚未實作',
          method: 'webhook'
        };
        break;
        
      case 'line_notify':
        throw ApiErrorFactory.badRequest(
          'LINE Notify 已於 2025/3/31 停用，請使用 LINE Messaging API',
          'LINE_NOTIFY_DEPRECATED'
        );
        
      default:
        throw ValidationErrorFactory.invalidValue(
          'method',
          method,
          ['line_messaging', 'email', 'telegram', 'webhook']
        );
    }
    
    res.status(result.success ? 200 : 501).json({
      status: result.success ? 'success' : 'error',
      message: result.success ? '測試通知發送成功' : result.message,
      data: {
        method,
        recipient,
        result,
        sentAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('發送測試通知失敗:', error.message);
    throw error;
  }
};

/**
 * 建立價格警報
 * POST /api/notifications/alerts
 */
const createPriceAlert = async (req, res) => {
  try {
    const userId = req.userId || 'test_user';
    const {
      symbol,
      alertType,
      targetPrice,
      percentChange,
      volumeMultiplier,
      priority = 'medium',
      notificationMethods = {},
      conditions = {},
      note,
      expiresAt
    } = req.body;

    // 驗證必填欄位
    if (!symbol || !alertType) {
      throw ValidationErrorFactory.missingRequiredFields(['symbol', 'alertType']);
    }

    // 驗證交易對是否存在
    const binanceService = getBinanceService();
    try {
      await binanceService.getCurrentPrice(symbol);
    } catch (error) {
      throw ApiErrorFactory.badRequest(`交易對 ${symbol} 不存在或無法取得價格`, 'INVALID_SYMBOL');
    }

    // 取得當前市場數據
    const currentMarketData = await binanceService.getCurrentPrice(symbol);
    
    // 建立警報
    const alertData = {
      userId,
      symbol: symbol.toUpperCase(),
      alertType,
      targetPrice,
      percentChange,
      volumeMultiplier,
      priority,
      notificationMethods: {
        lineNotify: {
          enabled: notificationMethods.lineNotify?.enabled || false,
          token: notificationMethods.lineNotify?.token
        },
        email: {
          enabled: notificationMethods.email?.enabled || false,
          address: notificationMethods.email?.address
        },
        webhook: {
          enabled: notificationMethods.webhook?.enabled || false,
          url: notificationMethods.webhook?.url
        }
      },
      conditions: {
        onlyTradingHours: conditions.onlyTradingHours || false,
        minInterval: conditions.minInterval || 300,
        confirmationTime: conditions.confirmationTime || 0,
        maxTriggers: conditions.maxTriggers || 1
      },
      note,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdMarketData: {
        price: currentMarketData.price,
        volume: currentMarketData.volume || 0
      }
    };

    const priceAlert = new PriceAlert(alertData);
    await priceAlert.save();

    logger.logUserAction(userId, 'create_price_alert', {
      alertId: priceAlert._id,
      symbol: symbol.toUpperCase(),
      alertType,
      targetPrice
    });

    res.status(201).json({
      status: 'success',
      message: '價格警報建立成功',
      data: {
        alert: priceAlert,
        currentPrice: currentMarketData.price
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('建立價格警報失敗:', error.message);
    throw error;
  }
};

/**
 * 取得使用者的價格警報
 * GET /api/notifications/alerts
 */
const getUserAlerts = async (req, res) => {
  try {
    const userId = req.userId || 'test_user';
    const { status, symbol, page = 1, limit = 20 } = req.query;

    let alerts;
    if (process.env.SKIP_MONGODB === 'true') {
      // Mock 版本
      alerts = await PriceAlert.findUserAlerts(userId, status);
      
      if (symbol) {
        alerts = alerts.filter(alert => alert.symbol === symbol.toUpperCase());
      }
      
      // 簡單分頁
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      alerts = alerts.slice(startIndex, endIndex);
    } else {
      // MongoDB 版本
      const query = { userId };
      if (status) query.status = status;
      if (symbol) query.symbol = symbol.toUpperCase();

      alerts = await PriceAlert.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((page - 1) * limit);
    }

    res.status(200).json({
      status: 'success',
      message: '取得價格警報成功',
      data: {
        alerts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: alerts.length
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('取得價格警報失敗:', error.message);
    throw error;
  }
};

/**
 * 更新價格警報
 * PUT /api/notifications/alerts/:id
 */
const updatePriceAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || 'test_user';
    const updateData = req.body;

    const alert = await PriceAlert.findById(id);
    if (!alert) {
      throw ApiErrorFactory.notFound('價格警報不存在', 'ALERT_NOT_FOUND');
    }

    if (alert.userId !== userId) {
      throw ApiErrorFactory.forbidden('無權限修改此警報', 'INSUFFICIENT_PERMISSION');
    }

    // 更新允許的欄位
    const allowedFields = [
      'targetPrice', 'percentChange', 'volumeMultiplier', 
      'priority', 'notificationMethods', 'conditions', 
      'note', 'enabled', 'status'
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        if (field === 'notificationMethods' || field === 'conditions') {
          Object.assign(alert[field], updateData[field]);
        } else {
          alert[field] = updateData[field];
        }
      }
    }

    await alert.save();

    logger.logUserAction(userId, 'update_price_alert', {
      alertId: alert._id,
      symbol: alert.symbol,
      changes: Object.keys(updateData)
    });

    res.status(200).json({
      status: 'success',
      message: '價格警報更新成功',
      data: { alert },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('更新價格警報失敗:', error.message);
    throw error;
  }
};

/**
 * 刪除價格警報
 * DELETE /api/notifications/alerts/:id
 */
const deletePriceAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || 'test_user';

    const alert = await PriceAlert.findById(id);
    if (!alert) {
      throw ApiErrorFactory.notFound('價格警報不存在', 'ALERT_NOT_FOUND');
    }

    if (alert.userId !== userId) {
      throw ApiErrorFactory.forbidden('無權限刪除此警報', 'INSUFFICIENT_PERMISSION');
    }

    await alert.remove();

    logger.logUserAction(userId, 'delete_price_alert', {
      alertId: alert._id,
      symbol: alert.symbol
    });

    res.status(200).json({
      status: 'success',
      message: '價格警報刪除成功',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('刪除價格警報失敗:', error.message);
    throw error;
  }
};

/**
 * 暫停/恢復價格警報
 * PATCH /api/notifications/alerts/:id/toggle
 */
const togglePriceAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || 'test_user';

    const alert = await PriceAlert.findById(id);
    if (!alert) {
      throw ApiErrorFactory.notFound('價格警報不存在', 'ALERT_NOT_FOUND');
    }

    if (alert.userId !== userId) {
      throw ApiErrorFactory.forbidden('無權限修改此警報', 'INSUFFICIENT_PERMISSION');
    }

    if (alert.status === 'active') {
      await alert.pause();
    } else if (alert.status === 'paused') {
      await alert.resume();
    } else {
      throw ApiErrorFactory.badRequest('無法切換此警報狀態', 'INVALID_STATUS_TRANSITION');
    }

    logger.logUserAction(userId, 'toggle_price_alert', {
      alertId: alert._id,
      symbol: alert.symbol,
      newStatus: alert.status
    });

    res.status(200).json({
      status: 'success',
      message: `價格警報已${alert.status === 'active' ? '恢復' : '暫停'}`,
      data: { alert },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('切換價格警報狀態失敗:', error.message);
    throw error;
  }
};

/**
 * 取得警報統計
 * GET /api/notifications/stats
 */
const getAlertStats = async (req, res) => {
  try {
    const userId = req.userId || 'test_user';

    if (process.env.SKIP_MONGODB === 'true') {
      // Mock 版本統計
      const alerts = await PriceAlert.findUserAlerts(userId);
      const stats = alerts.reduce((acc, alert) => {
        acc[alert.status] = (acc[alert.status] || 0) + 1;
        return acc;
      }, {});

      const result = Object.entries(stats).map(([status, count]) => ({
        _id: status,
        count
      }));

      res.status(200).json({
        status: 'success',
        message: '取得警報統計成功',
        data: {
          stats: result,
          total: alerts.length
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // MongoDB 版本
      const stats = await PriceAlert.getAlertStats(userId);
      const total = stats.reduce((sum, stat) => sum + stat.count, 0);

      res.status(200).json({
        status: 'success',
        message: '取得警報統計成功',
        data: {
          stats,
          total
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('取得警報統計失敗:', error.message);
    throw error;
  }
};

/**
 * 發送市場更新通知
 * POST /api/notifications/market-update
 */
const sendMarketUpdate = async (req, res) => {
  try {
    const { recipients, type = 'daily', symbols } = req.body;
    
    if (!recipients || !Array.isArray(recipients)) {
      throw ValidationErrorFactory.invalidInput('recipients 必須是陣列');
    }

    const lineNotifyService = getLineNotifyService();
    const binanceService = getBinanceService();
    
    // 取得市場數據
    const marketData = {
      type,
      symbols: symbols || await binanceService.getTopGainers(5),
      summary: {
        gainers: 0,
        losers: 0,
        totalVolume: 0
      },
      timestamp: Date.now()
    };

    // 計算統計數據
    if (marketData.symbols) {
      marketData.summary.gainers = marketData.symbols.filter(s => s.priceChangePercent > 0).length;
      marketData.summary.losers = marketData.symbols.filter(s => s.priceChangePercent < 0).length;
      marketData.summary.totalVolume = marketData.symbols.reduce((sum, s) => sum + (s.quoteVolume || 0), 0);
    }

    // 發送通知
    const results = [];
    for (const recipient of recipients) {
      try {
        const result = await lineNotifyService.sendMarketUpdate(marketData, recipient.token);
        results.push({
          recipient: recipient.id,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          recipient: recipient.id,
          success: false,
          error: error.message
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: '市場更新通知發送完成',
      data: {
        results,
        successCount: results.filter(r => r.success).length,
        errorCount: results.filter(r => !r.success).length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('發送市場更新通知失敗:', error.message);
    throw error;
  }
};

/**
 * LINE Notify OAuth 授權 URL
 * GET /api/notifications/line-notify/auth-url
 */
const getLineNotifyAuthUrl = async (req, res) => {
  try {
    const { state } = req.query;
    const lineNotifyService = getLineNotifyService();
    
    const authUrl = lineNotifyService.generateAuthUrl(state);
    
    res.status(200).json({
      status: 'success',
      message: '取得 LINE Notify 授權 URL 成功',
      data: {
        authUrl,
        state
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('取得 LINE Notify 授權 URL 失敗:', error.message);
    throw error;
  }
};

/**
 * LINE Notify OAuth 回調處理
 * GET /api/notifications/line-notify/callback
 */
const handleLineNotifyCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      throw ApiErrorFactory.badRequest(`LINE Notify 授權失敗: ${error}`, 'OAUTH_ERROR');
    }
    
    if (!code) {
      throw ApiErrorFactory.badRequest('未收到授權碼', 'MISSING_AUTH_CODE');
    }
    
    const lineNotifyService = getLineNotifyService();
    const result = await lineNotifyService.exchangeCodeForToken(code);
    
    if (result.success) {
      // 驗證 token
      const validation = await lineNotifyService.validateToken(result.accessToken);
      
      res.status(200).json({
        status: 'success',
        message: 'LINE Notify 授權成功',
        data: {
          accessToken: result.accessToken,
          tokenInfo: validation,
          state
        },
        timestamp: new Date().toISOString()
      });
    } else {
      throw ApiErrorFactory.badRequest('授權 token 交換失敗', 'TOKEN_EXCHANGE_FAILED');
    }
  } catch (error) {
    logger.error('處理 LINE Notify 回調失敗:', error.message);
    throw error;
  }
};

module.exports = {
  getNotificationStatus,
  sendTestNotification,
  createPriceAlert,
  getUserAlerts,
  updatePriceAlert,
  deletePriceAlert,
  togglePriceAlert,
  getAlertStats,
  sendMarketUpdate,
  getLineNotifyAuthUrl,
  handleLineNotifyCallback
};