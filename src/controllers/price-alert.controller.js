/**
 * NexusTrade 價格警報控制器
 * 
 * 處理價格警報和 AI 分析訂閱的 API 請求
 */

const PriceAlert = require('../models/PriceAlert');
const LineUser = require('../models/LineUser');
const { ApiErrorFactory } = require('../utils/ApiError');
const { asyncErrorHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class PriceAlertController {
  /**
   * 建立價格警報
   * POST /api/notifications/alerts
   */
  createAlert = asyncErrorHandler(async (req, res) => {
    const { symbol, alertType, targetPrice, aiAnalysisSubscription, notificationMethods, technicalIndicatorConfig } = req.body;
    
    // 基本驗證
    if (!symbol || !alertType) {
      throw ApiErrorFactory.badRequest('缺少必要參數: symbol 和 alertType');
    }

    // 驗證警報類型對應的參數
    if ((alertType === 'price_above' || alertType === 'price_below') && !targetPrice) {
      throw ApiErrorFactory.badRequest('價格警報需要 targetPrice 參數');
    }

    if (targetPrice && targetPrice <= 0) {
      throw ApiErrorFactory.badRequest('目標價格必須大於 0');
    }

    // Mock 使用者 ID (實際應用中從 JWT token 取得)
    const userId = req.userId || 'mock_user_001';

    try {
      // 檢查是否已存在相同的警報
      const existingAlert = await PriceAlert.findOne({
        userId,
        symbol: symbol.toUpperCase(),
        alertType,
        targetPrice,
        status: 'active'
      });

      if (existingAlert) {
        throw ApiErrorFactory.conflict('已存在相同的價格警報');
      }

      // 處理 LINE 通知設定
      let lineMessagingConfig = { enabled: false };
      if (notificationMethods?.lineMessaging?.enabled) {
        // 直接從認證用戶取得 LINE ID (因為用戶已通過 LINE OAuth 登入)
        const User = require('../models/User.model');
        const user = await User.findById(userId);
        
        if (user && user.lineId) {
          lineMessagingConfig = {
            enabled: true,
            userId: user.lineId  // 使用正確的 LINE User ID
          };
          logger.info(`✅ 為使用者 ${userId} 啟用 LINE 通知`, {
            lineUserId: user.lineId.substring(0, 8) + '...'
          });
        } else {
          logger.warn(`使用者 ${userId} 嘗試啟用 LINE 通知，但未綁定 LINE 帳戶`);
          // 不拋出錯誤，只是不啟用 LINE 通知
        }
      }

      // 處理 AI 分析訂閱設定
      let aiSubscriptionConfig = { enabled: false };
      if (aiAnalysisSubscription?.enabled) {
        aiSubscriptionConfig = {
          enabled: true,
          frequency: 'daily',
          subscribedAt: new Date()
        };
      }

      // 建立價格警報
      const alertData = {
        userId,
        symbol: symbol.toUpperCase(),
        alertType,
        targetPrice: targetPrice || null,
        technicalIndicatorConfig: technicalIndicatorConfig || {},
        notificationMethods: {
          lineMessaging: lineMessagingConfig,
          email: notificationMethods?.email || { enabled: false },
          webhook: notificationMethods?.webhook || { enabled: false }
        },
        aiAnalysisSubscription: aiSubscriptionConfig,
        status: 'active',
        enabled: true
      };

      const alert = new PriceAlert(alertData);
      await alert.save();

      logger.info(`✅ 建立價格警報成功`, {
        userId,
        symbol: alert.symbol,
        alertType: alert.alertType,
        targetPrice: alert.targetPrice,
        aiSubscription: aiSubscriptionConfig.enabled
      });

      res.status(201).json({
        status: 'success',
        message: '價格警報建立成功',
        data: {
          alert: {
            id: alert._id,
            symbol: alert.symbol,
            alertType: alert.alertType,
            targetPrice: alert.targetPrice,
            technicalIndicatorConfig: alert.technicalIndicatorConfig,
            aiAnalysisSubscription: alert.aiAnalysisSubscription,
            notificationMethods: alert.notificationMethods,
            status: alert.status,
            createdAt: alert.createdAt
          }
        }
      });

    } catch (error) {
      if (error.name === 'ApiError') throw error;
      logger.error('❌ 建立價格警報失敗:', error);
      throw ApiErrorFactory.internal('建立價格警報失敗');
    }
  });

  /**
   * 取得使用者的警報清單
   * GET /api/notifications/alerts
   */
  getUserAlerts = asyncErrorHandler(async (req, res) => {
    const userId = req.userId || 'mock_user_001';
    const { symbol, status } = req.query;

    try {
      let query = { userId };
      
      if (symbol) {
        query.symbol = symbol.toUpperCase();
      }
      
      if (status) {
        query.status = status;
      }

      const alerts = await PriceAlert.find(query)
        .sort({ createdAt: -1 })
        .select('-__v');

      res.json({
        status: 'success',
        data: {
          alerts: alerts.map(alert => ({
            id: alert._id,
            symbol: alert.symbol,
            alertType: alert.alertType,
            targetPrice: alert.targetPrice,
            technicalIndicatorConfig: alert.technicalIndicatorConfig,
            aiAnalysisSubscription: alert.aiAnalysisSubscription,
            notificationMethods: alert.notificationMethods,
            status: alert.status,
            enabled: alert.enabled,
            triggerCount: alert.triggerCount,
            lastTriggered: alert.lastTriggered,
            createdAt: alert.createdAt,
            updatedAt: alert.updatedAt
          }))
        }
      });

    } catch (error) {
      logger.error('❌ 取得警報清單失敗:', error);
      throw ApiErrorFactory.internal('取得警報清單失敗');
    }
  });

  /**
   * 更新價格警報
   * PUT /api/notifications/alerts/:id
   */
  updateAlert = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userId || 'mock_user_001';
    const updateData = req.body;

    try {
      const alert = await PriceAlert.findOne({ _id: id, userId });
      
      if (!alert) {
        throw ApiErrorFactory.notFound('警報未找到');
      }

      // 只允許更新特定欄位
      const allowedUpdates = [
        'targetPrice', 
        'technicalIndicatorConfig',
        'aiAnalysisSubscription', 
        'notificationMethods', 
        'enabled', 
        'status'
      ];

      const updates = {};
      for (const key of allowedUpdates) {
        if (updateData[key] !== undefined) {
          updates[key] = updateData[key];
        }
      }

      // 處理 AI 分析訂閱更新
      if (updateData.aiAnalysisSubscription) {
        if (updateData.aiAnalysisSubscription.enabled && !alert.aiAnalysisSubscription.enabled) {
          updates['aiAnalysisSubscription.subscribedAt'] = new Date();
        }
      }

      if (Object.keys(updates).length === 0) {
        throw ApiErrorFactory.badRequest('沒有提供有效的更新欄位');
      }

      updates.updatedAt = new Date();

      const updatedAlert = await PriceAlert.findByIdAndUpdate(
        id, 
        { $set: updates }, 
        { new: true, runValidators: true }
      );

      logger.info(`✅ 更新價格警報成功`, {
        alertId: id,
        userId,
        updates: Object.keys(updates)
      });

      res.json({
        status: 'success',
        message: '警報更新成功',
        data: {
          alert: {
            id: updatedAlert._id,
            symbol: updatedAlert.symbol,
            alertType: updatedAlert.alertType,
            targetPrice: updatedAlert.targetPrice,
            technicalIndicatorConfig: updatedAlert.technicalIndicatorConfig,
            aiAnalysisSubscription: updatedAlert.aiAnalysisSubscription,
            notificationMethods: updatedAlert.notificationMethods,
            status: updatedAlert.status,
            enabled: updatedAlert.enabled,
            updatedAt: updatedAlert.updatedAt
          }
        }
      });

    } catch (error) {
      if (error.name === 'ApiError') throw error;
      logger.error('❌ 更新價格警報失敗:', error);
      throw ApiErrorFactory.internal('更新價格警報失敗');
    }
  });

  /**
   * 刪除價格警報
   * DELETE /api/notifications/alerts/:id
   */
  deleteAlert = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userId || 'mock_user_001';

    try {
      const alert = await PriceAlert.findOne({ _id: id, userId });
      
      if (!alert) {
        throw ApiErrorFactory.notFound('警報未找到');
      }

      await PriceAlert.findByIdAndDelete(id);

      logger.info(`✅ 刪除價格警報成功`, {
        alertId: id,
        userId,
        symbol: alert.symbol
      });

      res.json({
        status: 'success',
        message: '警報刪除成功'
      });

    } catch (error) {
      if (error.name === 'ApiError') throw error;
      logger.error('❌ 刪除價格警報失敗:', error);
      throw ApiErrorFactory.internal('刪除價格警報失敗');
    }
  });

  /**
   * 取得特定貨幣的警報
   * GET /api/notifications/alerts/:symbol
   */
  getSymbolAlerts = asyncErrorHandler(async (req, res) => {
    const { symbol } = req.params;
    const userId = req.userId || 'mock_user_001';

    try {
      const alerts = await PriceAlert.find({
        userId,
        symbol: symbol.toUpperCase(),
        enabled: true
      }).sort({ createdAt: -1 });

      res.json({
        status: 'success',
        data: {
          symbol: symbol.toUpperCase(),
          alerts: alerts.map(alert => ({
            id: alert._id,
            alertType: alert.alertType,
            targetPrice: alert.targetPrice,
            technicalIndicatorConfig: alert.technicalIndicatorConfig,
            aiAnalysisSubscription: alert.aiAnalysisSubscription,
            notificationMethods: alert.notificationMethods,
            status: alert.status,
            createdAt: alert.createdAt
          }))
        }
      });

    } catch (error) {
      logger.error('❌ 取得貨幣警報失敗:', error);
      throw ApiErrorFactory.internal('取得貨幣警報失敗');
    }
  });

  /**
   * 測試通知發送
   * POST /api/notifications/test
   */
  testNotification = asyncErrorHandler(async (req, res) => {
    const { method, symbol } = req.body;
    const userId = req.userId || 'mock_user_001';

    if (!method || !symbol) {
      throw ApiErrorFactory.badRequest('缺少必要參數: method 和 symbol');
    }

    try {
      const lineMessagingService = require('../services/line-messaging.service');
      const testResults = [];

      if (method === 'line' || method === 'all') {
        // 測試 LINE 通知
        const User = require('../models/User.model');
        const user = await User.findById(userId);
        
        if (user && user.lineId) {
          const testMessage = `🧪 測試通知\n\n💰 ${symbol.toUpperCase()}\n⏰ ${new Date().toLocaleString('zh-TW')}\n\n這是一個測試通知訊息。`;
          
          const result = await lineMessagingService.sendTextMessage(
            user.lineId,
            testMessage
          );

          testResults.push({
            method: 'line',
            success: result.success,
            error: result.success ? null : result.error
          });
        } else {
          testResults.push({
            method: 'line',
            success: false,
            error: 'LINE 帳戶未綁定'
          });
        }
      }

      logger.info(`✅ 測試通知完成`, {
        userId,
        method,
        results: testResults
      });

      res.json({
        status: 'success',
        message: '測試通知完成',
        data: {
          results: testResults
        }
      });

    } catch (error) {
      logger.error('❌ 測試通知失敗:', error);
      throw ApiErrorFactory.internal('測試通知失敗');
    }
  });
}

module.exports = new PriceAlertController();