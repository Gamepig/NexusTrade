/**
 * NexusTrade 事件驅動警報監控服務
 * 
 * 取代 24/7 定時監控，實現成本優化的事件驅動架構
 * - 僅在有活躍警報時監控
 * - 智慧監控頻率調整
 * - 用戶活動追蹤觸發
 */

const EventEmitter = require('events');
const PriceAlert = require('../models/PriceAlert');
const TechnicalIndicatorService = require('./technical-indicator-calculation.service');
const lineMessagingService = require('./line-messaging.service');
const logger = require('../utils/logger');

class EventDrivenAlertMonitor extends EventEmitter {
  constructor() {
    super();
    this.isMonitoring = false;
    this.activeSymbols = new Set();
    this.monitoringIntervals = new Map();
    this.priceCache = new Map();
    this.technicalIndicatorCache = new Map();
    this.userActivityTracker = new Map();
    
    // 監控配置
    this.config = {
      baseInterval: 60000, // 基礎監控間隔：60秒
      activeUserInterval: 30000, // 活躍用戶監控間隔：30秒
      inactiveUserInterval: 300000, // 非活躍用戶監控間隔：5分鐘
      maxConcurrentSymbols: 50, // 最大同時監控交易對數量
      cacheExpiry: 120000, // 快取過期時間：2分鐘
      userActivityTimeout: 1800000 // 用戶活動超時：30分鐘
    };

    // 綁定事件監聽器
    this.setupEventListeners();
  }

  /**
   * 設置事件監聽器
   */
  setupEventListeners() {
    // 用戶活動事件
    this.on('userActivity', (data) => this.handleUserActivity(data));
    
    // 價格更新事件
    this.on('priceUpdate', (data) => this.handlePriceUpdate(data));
    
    // 警報觸發事件
    this.on('alertTriggered', (data) => this.handleAlertTriggered(data));
    
    // 系統錯誤事件
    this.on('error', (error) => this.handleError(error));
  }

  /**
   * 啟動事件驅動監控
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      logger.warn('事件驅動監控已在運行中');
      return;
    }

    try {
      logger.info('🚀 啟動事件驅動警報監控服務');
      
      // 載入活躍警報
      await this.loadActiveAlerts();
      
      // 設置基礎監控
      await this.setupBaseMonitoring();
      
      this.isMonitoring = true;
      
      logger.info('✅ 事件驅動監控服務啟動成功', {
        activeSymbols: this.activeSymbols.size,
        monitoringIntervals: this.monitoringIntervals.size
      });

    } catch (error) {
      logger.error('❌ 啟動事件驅動監控失敗:', error);
      throw error;
    }
  }

  /**
   * 停止監控
   */
  async stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    logger.info('🛑 停止事件驅動警報監控服務');

    // 清除所有監控間隔
    for (const [symbol, intervalId] of this.monitoringIntervals) {
      clearInterval(intervalId);
    }

    this.monitoringIntervals.clear();
    this.activeSymbols.clear();
    this.priceCache.clear();
    this.technicalIndicatorCache.clear();
    this.userActivityTracker.clear();
    
    this.isMonitoring = false;
    
    logger.info('✅ 事件驅動監控服務已停止');
  }

  /**
   * 載入活躍警報
   */
  async loadActiveAlerts() {
    try {
      // 使用超時保護和 lean 查詢提升效能
      const activeAlerts = await PriceAlert.findActiveAlerts(null, {
        timeout: 10000,  // 10秒超時
        lean: true,      // 使用 lean 查詢
        select: 'symbol alertType targetPrice technicalIndicatorConfig userId' // 只選擇需要的欄位
      });
      
      // 提取需要監控的交易對
      const symbolsToMonitor = new Set();
      for (const alert of activeAlerts) {
        symbolsToMonitor.add(alert.symbol);
      }

      // 更新活躍交易對
      this.activeSymbols = symbolsToMonitor;
      
      logger.info('📊 載入活躍警報完成', {
        totalAlerts: activeAlerts.length,
        uniqueSymbols: symbolsToMonitor.size,
        symbols: Array.from(symbolsToMonitor)
      });

      return activeAlerts;
    } catch (error) {
      logger.error('❌ 載入活躍警報失敗:', error);
      throw error;
    }
  }

  /**
   * 設置基礎監控
   */
  async setupBaseMonitoring() {
    // 如果沒有活躍警報，不需要監控
    if (this.activeSymbols.size === 0) {
      logger.info('⏸️ 沒有活躍警報，跳過監控設置');
      return;
    }

    // 為每個交易對設置監控
    for (const symbol of this.activeSymbols) {
      await this.setupSymbolMonitoring(symbol);
    }
  }

  /**
   * 設置特定交易對的監控
   */
  async setupSymbolMonitoring(symbol) {
    if (this.monitoringIntervals.has(symbol)) {
      // 已經在監控中
      return;
    }

    // 檢查是否有活躍用戶
    const hasActiveUsers = this.hasActiveUsersForSymbol(symbol);
    const interval = hasActiveUsers ? 
      this.config.activeUserInterval : 
      this.config.inactiveUserInterval;

    // 設置監控間隔
    const intervalId = setInterval(async () => {
      try {
        await this.checkSymbolAlerts(symbol);
      } catch (error) {
        logger.error(`❌ 檢查 ${symbol} 警報失敗:`, error);
        this.emit('error', error);
      }
    }, interval);

    this.monitoringIntervals.set(symbol, intervalId);
    
    logger.info(`⏰ 設置 ${symbol} 監控`, {
      interval: interval / 1000 + 's',
      hasActiveUsers
    });
  }

  /**
   * 檢查特定交易對的警報
   */
  async checkSymbolAlerts(symbol) {
    try {
      // 取得該交易對的活躍警報
      const alerts = await PriceAlert.findActiveAlerts(symbol);
      
      if (alerts.length === 0) {
        // 沒有活躍警報，停止監控該交易對
        await this.stopSymbolMonitoring(symbol);
        return;
      }

      // 取得當前價格和技術指標
      const marketData = await this.getMarketData(symbol);
      const technicalIndicators = await this.getTechnicalIndicators(symbol, marketData);

      // 檢查每個警報
      for (const alert of alerts) {
        if (!alert.canTrigger()) {
          continue;
        }

        const shouldTrigger = await this.evaluateAlert(alert, marketData, technicalIndicators);
        
        if (shouldTrigger) {
          await this.triggerAlert(alert, marketData, technicalIndicators);
        }
      }

    } catch (error) {
      logger.error(`❌ 檢查 ${symbol} 警報時發生錯誤:`, error);
      throw error;
    }
  }

  /**
   * 評估警報是否應該觸發
   */
  async evaluateAlert(alert, marketData, technicalIndicators) {
    try {
      switch (alert.alertType) {
        // 基礎價格警報
        case 'price_above':
          return marketData.price >= alert.targetPrice;
        
        case 'price_below':
          return marketData.price <= alert.targetPrice;
        
        case 'percent_change':
          return Math.abs(marketData.priceChangePercent) >= Math.abs(alert.percentChange);
        
        case 'volume_spike':
          return marketData.volumeRatio >= alert.volumeMultiplier;

        // 技術指標警報
        case 'rsi_above':
          return technicalIndicators.rsi >= (alert.technicalIndicatorConfig?.rsi?.threshold || 70);
        
        case 'rsi_below':
          return technicalIndicators.rsi <= (alert.technicalIndicatorConfig?.rsi?.threshold || 30);
        
        case 'rsi_overbought':
          return technicalIndicators.rsi >= (alert.technicalIndicatorConfig?.rsi?.overboughtLevel || 70);
        
        case 'rsi_oversold':
          return technicalIndicators.rsi <= (alert.technicalIndicatorConfig?.rsi?.oversoldLevel || 30);

        case 'macd_bullish_crossover':
          return technicalIndicators.macd.histogram > 0 && technicalIndicators.macd.previousHistogram <= 0;
        
        case 'macd_bearish_crossover':
          return technicalIndicators.macd.histogram < 0 && technicalIndicators.macd.previousHistogram >= 0;

        case 'ma_golden_cross':
          return technicalIndicators.ma.fast > technicalIndicators.ma.slow && 
                 technicalIndicators.ma.previousFast <= technicalIndicators.ma.previousSlow;
        
        case 'ma_death_cross':
          return technicalIndicators.ma.fast < technicalIndicators.ma.slow && 
                 technicalIndicators.ma.previousFast >= technicalIndicators.ma.previousSlow;

        case 'bb_upper_touch':
          return marketData.price >= technicalIndicators.bollingerBands.upper;
        
        case 'bb_lower_touch':
          return marketData.price <= technicalIndicators.bollingerBands.lower;

        case 'williams_overbought':
          return technicalIndicators.williamsR >= (alert.technicalIndicatorConfig?.williamsR?.overboughtLevel || -20);
        
        case 'williams_oversold':
          return technicalIndicators.williamsR <= (alert.technicalIndicatorConfig?.williamsR?.oversoldLevel || -80);

        default:
          logger.warn(`未知的警報類型: ${alert.alertType}`);
          return false;
      }
    } catch (error) {
      logger.error(`❌ 評估警報失敗 ${alert._id}:`, error);
      return false;
    }
  }

  /**
   * 觸發警報
   */
  async triggerAlert(alert, marketData, technicalIndicators) {
    try {
      logger.info('🚨 警報觸發', {
        alertId: alert._id,
        symbol: alert.symbol,
        alertType: alert.alertType,
        currentPrice: marketData.price,
        targetPrice: alert.targetPrice
      });

      // 更新警報觸發記錄
      await alert.trigger(marketData);

      // 發送通知
      await this.sendAlertNotifications(alert, marketData, technicalIndicators);

      // 發出警報觸發事件
      this.emit('alertTriggered', {
        alert,
        marketData,
        technicalIndicators,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error(`❌ 觸發警報失敗 ${alert._id}:`, error);
      throw error;
    }
  }

  /**
   * 發送警報通知
   */
  async sendAlertNotifications(alert, marketData, technicalIndicators) {
    const notifications = [];

    try {
      // LINE 通知
      if (alert.notificationMethods?.lineMessaging?.enabled) {
        const lineResult = await this.sendLineNotification(alert, marketData, technicalIndicators);
        notifications.push({
          method: 'line',
          success: lineResult.success,
          error: lineResult.success ? null : lineResult.error
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

      return notifications;
    } catch (error) {
      logger.error('❌ 發送警報通知失敗:', error);
      throw error;
    }
  }

  /**
   * 發送 LINE 通知
   */
  async sendLineNotification(alert, marketData, technicalIndicators) {
    try {
      const lineUserId = alert.notificationMethods.lineMessaging.userId;
      
      if (!lineUserId) {
        return { success: false, error: 'LINE User ID 未設定' };
      }

      // 構建通知訊息
      let message = `🚨 價格警報觸發\n\n`;
      message += `💰 ${alert.symbol}\n`;
      message += `📊 當前價格: $${marketData.price.toFixed(6)}\n`;
      
      if (alert.alertType.includes('price_')) {
        message += `🎯 目標價格: $${alert.targetPrice.toFixed(6)}\n`;
      }
      
      message += `📈 24h變化: ${marketData.priceChangePercent.toFixed(2)}%\n`;
      message += `⏰ ${new Date().toLocaleString('zh-TW')}\n`;

      // 添加技術指標資訊（如果是技術指標警報）
      if (alert.alertType.includes('rsi_')) {
        message += `\n📊 RSI: ${technicalIndicators.rsi.toFixed(2)}`;
      }
      
      if (alert.alertType.includes('macd_')) {
        message += `\n📊 MACD: ${technicalIndicators.macd.macd.toFixed(6)}`;
      }

      const result = await lineMessagingService.sendTextMessage(lineUserId, message);
      
      if (result.success) {
        logger.info('✅ LINE 通知發送成功', {
          alertId: alert._id,
          lineUserId,
          messageId: result.messageId
        });
      }

      return result;
    } catch (error) {
      logger.error('❌ 發送 LINE 通知失敗:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 處理用戶活動事件
   */
  handleUserActivity(data) {
    const { userId, symbol, activity } = data;
    
    // 更新用戶活動記錄
    const userKey = `${userId}_${symbol}`;
    this.userActivityTracker.set(userKey, {
      userId,
      symbol,
      activity,
      lastActivity: new Date(),
      isActive: true
    });

    // 如果該交易對不在監控中，添加監控
    if (!this.monitoringIntervals.has(symbol)) {
      this.setupSymbolMonitoring(symbol);
    } else {
      // 更新監控頻率（如果需要）
      this.updateSymbolMonitoringFrequency(symbol);
    }

    logger.info('👤 用戶活動記錄', {
      userId,
      symbol,
      activity
    });
  }

  /**
   * 更新交易對監控頻率
   */
  async updateSymbolMonitoringFrequency(symbol) {
    const hasActiveUsers = this.hasActiveUsersForSymbol(symbol);
    const currentInterval = this.monitoringIntervals.get(symbol);
    
    if (!currentInterval) {
      return;
    }

    // 確定新的監控間隔
    const newInterval = hasActiveUsers ? 
      this.config.activeUserInterval : 
      this.config.inactiveUserInterval;

    // 重新設置監控
    clearInterval(currentInterval);
    await this.setupSymbolMonitoring(symbol);
  }

  /**
   * 檢查交易對是否有活躍用戶
   */
  hasActiveUsersForSymbol(symbol) {
    const now = new Date();
    
    for (const [userKey, activity] of this.userActivityTracker) {
      if (activity.symbol === symbol && activity.isActive) {
        const timeSinceActivity = now - activity.lastActivity;
        if (timeSinceActivity < this.config.userActivityTimeout) {
          return true;
        } else {
          // 標記為非活躍
          activity.isActive = false;
        }
      }
    }
    
    return false;
  }

  /**
   * 停止特定交易對的監控
   */
  async stopSymbolMonitoring(symbol) {
    const intervalId = this.monitoringIntervals.get(symbol);
    if (intervalId) {
      clearInterval(intervalId);
      this.monitoringIntervals.delete(symbol);
      this.activeSymbols.delete(symbol);
      
      logger.info(`⏹️ 停止 ${symbol} 監控 - 無活躍警報`);
    }
  }

  /**
   * 取得市場數據
   */
  async getMarketData(symbol) {
    // 檢查快取
    const cached = this.priceCache.get(symbol);
    if (cached && (Date.now() - cached.timestamp) < this.config.cacheExpiry) {
      return cached.data;
    }

    try {
      // 模擬市場數據獲取（實際應該調用 Binance API）
      const marketData = {
        symbol,
        price: Math.random() * 50000 + 30000, // 模擬價格 30k-80k
        priceChangePercent: (Math.random() - 0.5) * 10, // -5% 到 +5%
        volume: Math.random() * 1000000,
        volumeRatio: Math.random() * 3 + 0.5, // 0.5-3.5倍
        timestamp: new Date()
      };

      // 快取數據
      this.priceCache.set(symbol, {
        data: marketData,
        timestamp: Date.now()
      });

      return marketData;
    } catch (error) {
      logger.error(`❌ 取得 ${symbol} 市場數據失敗:`, error);
      throw error;
    }
  }

  /**
   * 取得技術指標
   */
  async getTechnicalIndicators(symbol, marketData) {
    // 檢查快取
    const cached = this.technicalIndicatorCache.get(symbol);
    if (cached && (Date.now() - cached.timestamp) < this.config.cacheExpiry) {
      return cached.data;
    }

    try {
      // 使用技術指標計算服務
      const indicators = await TechnicalIndicatorService.calculateIndicators(symbol, marketData);

      // 快取數據
      this.technicalIndicatorCache.set(symbol, {
        data: indicators,
        timestamp: Date.now()
      });

      return indicators;
    } catch (error) {
      logger.error(`❌ 計算 ${symbol} 技術指標失敗:`, error);
      throw error;
    }
  }

  /**
   * 處理價格更新事件
   */
  handlePriceUpdate(data) {
    const { symbol, price, volume } = data;
    
    // 更新價格快取
    if (this.priceCache.has(symbol)) {
      const cached = this.priceCache.get(symbol);
      cached.data.price = price;
      cached.data.volume = volume;
      cached.timestamp = Date.now();
    }

    this.emit('priceUpdate', data);
  }

  /**
   * 處理系統錯誤
   */
  handleError(error) {
    logger.error('🚨 事件驅動監控系統錯誤:', error);
    
    // 可以在這裡實現錯誤恢復邏輯
    // 例如重新啟動監控、發送系統警報等
  }

  /**
   * 取得監控狀態
   */
  getMonitoringStatus() {
    return {
      isMonitoring: this.isMonitoring,
      activeSymbols: Array.from(this.activeSymbols),
      monitoringCount: this.monitoringIntervals.size,
      cacheSize: {
        price: this.priceCache.size,
        technicalIndicator: this.technicalIndicatorCache.size
      },
      activeUsers: this.userActivityTracker.size,
      config: this.config
    };
  }
}

// 創建單例實例
const eventDrivenAlertMonitor = new EventDrivenAlertMonitor();

module.exports = eventDrivenAlertMonitor;