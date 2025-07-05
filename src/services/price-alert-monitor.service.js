/**
 * NexusTrade 價格警報監控服務
 * 
 * 負責監控所有活躍的價格警報，檢查觸發條件並發送通知
 */

const PriceAlert = require('../models/PriceAlert');
const { getBinanceService } = require('./binance.service');
const lineMessagingService = require('./line-messaging.service');
const smartNotificationDispatcher = require('./smart-notification-dispatcher.service');
const logger = require('../utils/logger');

class PriceAlertMonitorService {
  constructor() {
    this.isRunning = false;
    this.monitorInterval = null;
    this.checkIntervalMs = 60000; // 每分鐘檢查一次
    this.lastPrices = new Map(); // 快取最後價格
    this.alertChecks = new Map(); // 警報檢查狀態
    
    // 統計資料
    this.stats = {
      checksPerformed: 0,
      alertsTriggered: 0,
      notificationsSent: 0,
      errors: 0,
      lastCheck: null,
      uptime: Date.now()
    };
  }

  /**
   * 啟動監控服務
   */
  start() {
    if (this.isRunning) {
      logger.warn('價格警報監控服務已在運行中');
      return;
    }

    this.isRunning = true;
    this.stats.uptime = Date.now();
    
    logger.info('🔔 啟動價格警報監控服務', {
      checkInterval: this.checkIntervalMs,
      environment: process.env.NODE_ENV
    });

    // 立即執行一次檢查
    this.performCheck();

    // 設定定期檢查
    this.monitorInterval = setInterval(() => {
      this.performCheck();
    }, this.checkIntervalMs);
  }

  /**
   * 停止監控服務
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('價格警報監控服務未在運行');
      return;
    }

    this.isRunning = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    logger.info('🔕 停止價格警報監控服務', {
      totalChecks: this.stats.checksPerformed,
      alertsTriggered: this.stats.alertsTriggered,
      uptime: Date.now() - this.stats.uptime
    });
  }

  /**
   * 執行監控檢查
   */
  async performCheck() {
    try {
      this.stats.checksPerformed++;
      this.stats.lastCheck = new Date();

      logger.debug('⏰ 執行價格警報檢查', { 
        checkNumber: this.stats.checksPerformed 
      });

      // 取得所有活躍警報
      const activeAlerts = await PriceAlert.findActiveAlerts();
      
      if (activeAlerts.length === 0) {
        logger.debug('📭 沒有活躍的價格警報');
        return;
      }

      logger.debug(`📊 檢查 ${activeAlerts.length} 個活躍警報`);

      // 按交易對分組以減少 API 調用
      const symbolGroups = this.groupAlertsBySymbol(activeAlerts);
      
      // 批量檢查每個交易對
      for (const [symbol, alerts] of symbolGroups) {
        await this.checkSymbolAlerts(symbol, alerts);
      }

    } catch (error) {
      this.stats.errors++;
      logger.error('價格警報監控檢查失敗:', {
        error: error.message,
        stack: error.stack,
        checkNumber: this.stats.checksPerformed
      });
    }
  }

  /**
   * 按交易對分組警報
   */
  groupAlertsBySymbol(alerts) {
    const groups = new Map();
    
    for (const alert of alerts) {
      if (!groups.has(alert.symbol)) {
        groups.set(alert.symbol, []);
      }
      groups.get(alert.symbol).push(alert);
    }
    
    return groups;
  }

  /**
   * 檢查特定交易對的所有警報
   */
  async checkSymbolAlerts(symbol, alerts) {
    try {
      // 取得當前市場數據
      const binanceService = getBinanceService();
      const currentData = await binanceService.getCurrentPrice(symbol);
      
      if (!currentData || !currentData.price) {
        logger.warn(`無法取得 ${symbol} 的價格數據`);
        return;
      }

      // 更新價格快取
      this.lastPrices.set(symbol, {
        price: currentData.price,
        volume: currentData.volume || 0,
        priceChangePercent: currentData.priceChangePercent || 0,
        timestamp: Date.now()
      });

      logger.debug(`💰 ${symbol} 當前價格: $${currentData.price}`, {
        volume: currentData.volume,
        change: currentData.priceChangePercent
      });

      // 檢查每個警報
      for (const alert of alerts) {
        await this.checkIndividualAlert(alert, currentData);
      }

    } catch (error) {
      logger.error(`檢查 ${symbol} 警報失敗:`, error.message);
    }
  }

  /**
   * 檢查個別警報
   */
  async checkIndividualAlert(alert, marketData) {
    try {
      // 檢查警報是否能觸發
      if (!alert.canTrigger()) {
        logger.debug(`⏭️  警報 ${alert._id} 無法觸發`, {
          reason: this.getCannotTriggerReason(alert)
        });
        return;
      }

      // 檢查觸發條件
      const shouldTrigger = this.checkTriggerCondition(alert, marketData);
      
      if (shouldTrigger) {
        logger.info(`🚨 觸發價格警報!`, {
          alertId: alert._id,
          symbol: alert.symbol,
          alertType: alert.alertType,
          targetPrice: alert.targetPrice,
          currentPrice: marketData.price,
          userId: alert.userId
        });

        // 觸發警報
        await this.triggerAlert(alert, marketData);
        this.stats.alertsTriggered++;
      }

    } catch (error) {
      logger.error(`檢查警報 ${alert._id} 失敗:`, error.message);
    }
  }

  /**
   * 檢查觸發條件
   */
  checkTriggerCondition(alert, marketData) {
    const { alertType, targetPrice, percentChange, volumeMultiplier } = alert;
    const { price, priceChangePercent, volume } = marketData;

    switch (alertType) {
      case 'price_above':
        return price >= targetPrice;
        
      case 'price_below':
        return price <= targetPrice;
        
      case 'percent_change':
        // 檢查24小時變化百分比
        return Math.abs(priceChangePercent) >= Math.abs(percentChange);
        
      case 'volume_spike':
        // 需要有基準交易量來比較
        const baseVolume = alert.createdMarketData?.volume || 0;
        if (baseVolume === 0) return false;
        return volume >= (baseVolume * volumeMultiplier);
        
      default:
        logger.warn(`未知的警報類型: ${alertType}`);
        return false;
    }
  }

  /**
   * 觸發警報
   */
  async triggerAlert(alert, marketData) {
    try {
      // 更新警報狀態
      await alert.trigger(marketData);

      // 發送通知
      await this.sendAlertNotifications(alert, marketData);

      logger.info(`✅ 警報處理完成`, {
        alertId: alert._id,
        symbol: alert.symbol,
        newStatus: alert.status
      });

    } catch (error) {
      logger.error(`觸發警報 ${alert._id} 失敗:`, error.message);
      throw error;
    }
  }

  /**
   * 發送警報通知 - 使用智慧通知分發器進行批量優化
   */
  async sendAlertNotifications(alert, marketData) {
    const notifications = [];
    const { notificationMethods } = alert;

    // 使用智慧通知分發器發送價格警報
    if (notificationMethods.lineMessaging?.enabled) {
      try {
        // 準備警報數據
        const alertData = {
          symbol: alert.symbol,
          currentPrice: marketData.price,
          targetPrice: alert.targetPrice,
          alertType: alert.alertType,
          changePercent: marketData.priceChangePercent || 0,
          urgency: this.determineAlertUrgency(alert, marketData)
        };

        // 使用智慧分發器發送，自動處理批量優化、優先級和用戶分群
        const result = await smartNotificationDispatcher.sendPriceAlert(alertData, alert.userId);
        
        notifications.push({
          method: 'smart_line_messaging',
          success: true,
          taskId: result.taskId,
          estimatedDelay: result.estimatedDelay || 0
        });
        
        this.stats.notificationsSent++;
        logger.info('✅ 智慧通知分發成功', {
          alertId: alert._id,
          userId: alert.userId,
          taskId: result.taskId,
          queuePosition: result.queuePosition
        });

      } catch (error) {
        // 如果智慧分發器失敗，回退到直接 LINE 通知
        logger.warn('⚠️ 智慧分發器失敗，使用直接通知', {
          alertId: alert._id,
          error: error.message
        });

        try {
          const message = this.formatAlertMessage(alert, marketData);
          const lineUserId = await this.findLineUserIdForUser(alert.userId);
          
          if (lineUserId && lineMessagingService.isConfigured) {
            const fallbackResult = await lineMessagingService.sendTextMessage(lineUserId, message);
            
            notifications.push({
              method: 'fallback_line_messaging',
              success: fallbackResult.success,
              error: fallbackResult.success ? null : fallbackResult.error
            });
            
            if (fallbackResult.success) {
              this.stats.notificationsSent++;
            }
          } else {
            notifications.push({
              method: 'fallback_line_messaging',
              success: false,
              error: 'LINE 使用者未找到或未綁定'
            });
          }
        } catch (fallbackError) {
          notifications.push({
            method: 'fallback_line_messaging',
            success: false,
            error: fallbackError.message
          });
          
          logger.error('❌ 回退通知也失敗', {
            alertId: alert._id,
            error: fallbackError.message
          });
        }
      }
    }

    // Email 通知 (TODO: 實作)
    if (notificationMethods.email?.enabled) {
      notifications.push({
        method: 'email',
        success: false,
        error: 'Email 服務尚未實作'
      });
    }

    // Webhook 通知 (TODO: 實作)
    if (notificationMethods.webhook?.enabled) {
      notifications.push({
        method: 'webhook',
        success: false,
        error: 'Webhook 服務尚未實作'
      });
    }

    // 記錄通知結果
    for (const notification of notifications) {
      await alert.addNotificationResult(
        notification.method,
        notification.success,
        notification.error
      );
    }

    logger.info(`📬 發送 ${notifications.length} 個通知`, {
      alertId: alert._id,
      successful: notifications.filter(n => n.success).length,
      failed: notifications.filter(n => !n.success).length,
      usedSmartDispatcher: notifications.some(n => n.method === 'smart_line_messaging')
    });
  }

  /**
   * 確定警報緊急程度
   */
  determineAlertUrgency(alert, marketData) {
    const { alertType, targetPrice } = alert;
    const { price, priceChangePercent = 0 } = marketData;
    
    // 緊急條件：價格變化超過 20% 或觸及關鍵價格點
    if (Math.abs(priceChangePercent) > 20) {
      return 'critical';
    }
    
    // 高緊急：價格變化超過 10% 或接近目標價格
    if (Math.abs(priceChangePercent) > 10) {
      return 'high';
    }
    
    // 如果是價格突破警報，檢查突破幅度
    if (alertType === 'price_above' || alertType === 'price_below') {
      const priceDeviation = Math.abs((price - targetPrice) / targetPrice * 100);
      if (priceDeviation > 5) {
        return 'high';
      }
    }
    
    // 一般緊急程度
    return 'normal';
  }

  /**
   * 格式化警報訊息 - 已修復數值格式問題
   */
  formatAlertMessage(alert, marketData) {
    const { symbol, alertType, targetPrice, percentChange } = alert;
    const { price, priceChangePercent = 0 } = marketData;
    
    // 確保數值格式正確，防止 NaN 或 undefined
    const safePrice = Number(price) || 0;
    const safePriceChangePercent = Number(priceChangePercent) || 0;
    const safeTargetPrice = Number(targetPrice) || 0;
    const safePercentChange = Number(percentChange) || 0;
    
    const changeEmoji = safePriceChangePercent >= 0 ? '📈' : '📉';
    const basePriceForCalculation = alert.createdMarketData?.price || safePrice;
    const priceChange = basePriceForCalculation > 0 ? 
      ((safePrice - basePriceForCalculation) / basePriceForCalculation * 100).toFixed(2) : '0.00';
    
    let message = `🚨 NexusTrade 價格警報\n\n`;
    message += `💰 ${symbol}\n`;
    message += `💵 當前價格: $${safePrice.toFixed(8)}\n`;
    message += `${changeEmoji} 24h變化: ${safePriceChangePercent.toFixed(2)}%\n`;
    
    switch (alertType) {
      case 'price_above':
        message += `📊 觸發條件: 價格 ≥ $${safeTargetPrice.toFixed(8)}\n`;
        break;
      case 'price_below':
        message += `📊 觸發條件: 價格 ≤ $${safeTargetPrice.toFixed(8)}\n`;
        break;
      case 'percent_change':
        message += `📊 觸發條件: 變化 ≥ ${safePercentChange.toFixed(2)}%\n`;
        break;
    }
    
    message += `\n⏰ 觸發時間: ${new Date().toLocaleString('zh-TW')}\n`;
    message += `📱 來自 NexusTrade 智能警報`;
    
    return message;
  }

  /**
   * 取得無法觸發的原因
   */
  getCannotTriggerReason(alert) {
    if (!alert.isActive) return 'alarm_not_active';
    if (alert.triggerCount >= alert.conditions.maxTriggers) return 'max_triggers_reached';
    
    if (alert.lastTriggered) {
      const timeSinceLastTrigger = Date.now() - alert.lastTriggered.getTime();
      if (timeSinceLastTrigger < alert.conditions.minInterval * 1000) {
        return 'min_interval_not_met';
      }
    }
    
    return 'unknown';
  }

  /**
   * 取得服務狀態
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkIntervalMs,
      stats: {
        ...this.stats,
        uptime: this.isRunning ? Date.now() - this.stats.uptime : 0,
        lastCheckAgo: this.stats.lastCheck ? Date.now() - this.stats.lastCheck.getTime() : null
      },
      cachedPrices: this.lastPrices.size,
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * 更新檢查間隔
   */
  setCheckInterval(intervalMs) {
    if (intervalMs < 10000) {
      throw new Error('檢查間隔不能少於10秒');
    }
    
    const oldInterval = this.checkIntervalMs;
    this.checkIntervalMs = intervalMs;
    
    // 如果正在運行，重新設定定時器
    if (this.isRunning) {
      this.stop();
      this.start();
    }
    
    logger.info('更新價格警報檢查間隔', {
      oldInterval,
      newInterval: intervalMs
    });
  }

  /**
   * 手動觸發檢查
   */
  async manualCheck() {
    if (!this.isRunning) {
      throw new Error('監控服務未啟動');
    }
    
    logger.info('🔧 手動觸發價格警報檢查');
    await this.performCheck();
  }

  /**
   * 清除快取
   */
  clearCache() {
    this.lastPrices.clear();
    this.alertChecks.clear();
    logger.info('🧹 已清除價格警報監控快取');
  }

  /**
   * 重置統計資料
   */
  resetStats() {
    this.stats = {
      checksPerformed: 0,
      alertsTriggered: 0,
      notificationsSent: 0,
      errors: 0,
      lastCheck: null,
      uptime: this.isRunning ? Date.now() : this.stats.uptime
    };
    logger.info('📊 已重置價格警報監控統計資料');
  }

  /**
   * 查找使用者的 LINE User ID - 使用雙重檢查機制
   * @param {string} nexusTradeUserId - NexusTrade 使用者 ID
   * @returns {string|null} LINE User ID 或 null
   */
  async findLineUserIdForUser(nexusTradeUserId) {
    try {
      // 方法 1: 從 OAuth 系統查找
      const User = require('../models/User.model');
      const user = await User.findById(nexusTradeUserId);
      
      if (user && user.lineId) {
        // 驗證 LINE ID 是否仍然有效（檢查 LineUser 服務中的綁定狀態）
        const { lineUserService } = require('../models/LineUser');
        const lineUser = await lineUserService.findByLineUserId(user.lineId);
        
        if (lineUser && lineUser.isBound && lineUser.nexusTradeUserId === nexusTradeUserId) {
          logger.debug('✅ 通過 OAuth 系統找到有效的 LINE User ID', {
            nexusTradeUserId,
            lineUserId: user.lineId.substring(0, 8) + '...'
          });
          return user.lineId;
        }
      }
      
      // 方法 2: 從 LineUser 服務查找（備用）
      const { lineUserService } = require('../models/LineUser');
      const lineUser = await lineUserService.findByNexusTradeUserId(nexusTradeUserId);
      
      if (lineUser && lineUser.isBound && lineUser.lineUserId) {
        logger.debug('✅ 通過 LineUser 服務找到有效的 LINE User ID', {
          nexusTradeUserId,
          lineUserId: lineUser.lineUserId.substring(0, 8) + '...'
        });
        return lineUser.lineUserId;
      }
      
      // 未找到任何有效的綁定
      logger.warn('⚠️ 未找到有效的 LINE 綁定', {
        nexusTradeUserId,
        hasOAuthLineId: !!(user && user.lineId),
        hasLineUserRecord: !!lineUser
      });
      
      return null;
      
    } catch (error) {
      logger.error('❌ 查找 LINE User ID 失敗', {
        nexusTradeUserId,
        error: error.message
      });
      return null;
    }
  }
}

// 創建全局實例
let priceAlertMonitorService = null;

/**
 * 取得價格警報監控服務實例
 */
function getPriceAlertMonitorService() {
  if (!priceAlertMonitorService) {
    priceAlertMonitorService = new PriceAlertMonitorService();
  }
  return priceAlertMonitorService;
}

module.exports = {
  PriceAlertMonitorService,
  getPriceAlertMonitorService
};