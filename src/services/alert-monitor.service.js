/**
 * NexusTrade 價格警報監控服務
 * 
 * 監控市場價格變化並觸發相應的價格警報
 */

const PriceAlert = require('../models/PriceAlert');
const { getBinanceService } = require('./binance.service');
const { getLineNotifyService } = require('./line-notify.service');
const logger = require('../utils/logger');

class AlertMonitorService {
  constructor() {
    this.monitoredSymbols = new Set();
    this.priceCache = new Map();
    this.alertCache = new Map();
    this.isRunning = false;
    this.monitorInterval = null;
    this.wsConnections = new Map();
    
    // 監控設定
    this.config = {
      checkInterval: 30000, // 30秒檢查一次
      priceUpdateInterval: 5000, // 5秒更新一次價格
      maxConcurrentChecks: 10,
      retryAttempts: 3
    };
  }

  /**
   * 啟動監控服務
   */
  async start() {
    if (this.isRunning) {
      logger.warn('價格警報監控服務已在運行中');
      return;
    }

    try {
      logger.info('啟動價格警報監控服務...');
      
      // 載入活躍警報
      await this.loadActiveAlerts();
      
      // 開始監控
      this.isRunning = true;
      this.monitorInterval = setInterval(() => {
        this.checkAlerts().catch(error => {
          logger.error('檢查價格警報時發生錯誤:', error.message);
        });
      }, this.config.checkInterval);
      
      // 設定價格數據訂閱
      await this.setupPriceSubscriptions();
      
      logger.info('價格警報監控服務已啟動', {
        monitoredSymbols: Array.from(this.monitoredSymbols),
        alertCount: this.alertCache.size
      });
    } catch (error) {
      logger.error('啟動價格警報監控服務失敗:', error.message);
      throw error;
    }
  }

  /**
   * 停止監控服務
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('停止價格警報監控服務...');
    
    this.isRunning = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    // 關閉 WebSocket 連接
    const binanceService = getBinanceService();
    for (const connectionId of this.wsConnections.values()) {
      binanceService.closeWebSocketConnection(connectionId);
    }
    this.wsConnections.clear();
    
    // 清空快取
    this.monitoredSymbols.clear();
    this.priceCache.clear();
    this.alertCache.clear();
    
    logger.info('價格警報監控服務已停止');
  }

  /**
   * 載入活躍警報
   */
  async loadActiveAlerts() {
    try {
      const activeAlerts = await PriceAlert.findActiveAlerts();
      
      this.alertCache.clear();
      this.monitoredSymbols.clear();
      
      for (const alert of activeAlerts) {
        this.alertCache.set(alert._id, alert);
        this.monitoredSymbols.add(alert.symbol);
      }
      
      logger.info(`載入 ${activeAlerts.length} 個活躍警報`, {
        symbols: Array.from(this.monitoredSymbols)
      });
    } catch (error) {
      logger.error('載入活躍警報失敗:', error.message);
      throw error;
    }
  }

  /**
   * 設定價格數據訂閱
   */
  async setupPriceSubscriptions() {
    if (this.monitoredSymbols.size === 0) {
      return;
    }

    const binanceService = getBinanceService();
    const symbols = Array.from(this.monitoredSymbols);
    
    try {
      const { connectionId } = binanceService.subscribeToPriceUpdates(
        symbols,
        (ticker) => {
          this.handlePriceUpdate(ticker);
        }
      );
      
      this.wsConnections.set('main', connectionId);
      
      logger.info(`已訂閱 ${symbols.length} 個交易對的價格更新`, { symbols });
    } catch (error) {
      logger.error('設定價格訂閱失敗:', error.message);
    }
  }

  /**
   * 處理價格更新
   */
  handlePriceUpdate(ticker) {
    const symbol = ticker.s || ticker.symbol;
    const price = parseFloat(ticker.c || ticker.price);
    const priceChange = parseFloat(ticker.P || ticker.priceChangePercent || 0);
    const volume = parseFloat(ticker.v || ticker.volume || 0);
    
    // 更新價格快取
    this.priceCache.set(symbol, {
      symbol,
      price,
      priceChange,
      priceChangePercent: priceChange,
      volume,
      timestamp: Date.now()
    });
    
    // 立即檢查該交易對的警報
    this.checkSymbolAlerts(symbol).catch(error => {
      logger.error(`檢查 ${symbol} 警報時發生錯誤:`, error.message);
    });
  }

  /**
   * 檢查所有警報
   */
  async checkAlerts() {
    if (!this.isRunning || this.alertCache.size === 0) {
      return;
    }

    try {
      // 重新載入活躍警報
      await this.loadActiveAlerts();
      
      // 分批處理警報檢查
      const symbols = Array.from(this.monitoredSymbols);
      const batches = this.chunkArray(symbols, this.config.maxConcurrentChecks);
      
      for (const batch of batches) {
        await Promise.all(batch.map(symbol => 
          this.checkSymbolAlerts(symbol).catch(error => 
            logger.error(`檢查 ${symbol} 警報失敗:`, error.message)
          )
        ));
      }
    } catch (error) {
      logger.error('檢查價格警報失敗:', error.message);
    }
  }

  /**
   * 檢查特定交易對的警報
   */
  async checkSymbolAlerts(symbol) {
    const marketData = this.priceCache.get(symbol);
    if (!marketData) {
      // 如果沒有快取的價格數據，嘗試從 API 取得
      try {
        const binanceService = getBinanceService();
        const priceData = await binanceService.getCurrentPrice(symbol);
        this.priceCache.set(symbol, priceData);
        marketData = priceData;
      } catch (error) {
        logger.error(`無法取得 ${symbol} 價格數據:`, error.message);
        return;
      }
    }

    // 取得該交易對的所有活躍警報
    const symbolAlerts = Array.from(this.alertCache.values())
      .filter(alert => alert.symbol === symbol && alert.canTrigger());

    for (const alert of symbolAlerts) {
      try {
        if (await this.shouldTriggerAlert(alert, marketData)) {
          await this.triggerAlert(alert, marketData);
        }
      } catch (error) {
        logger.error(`處理警報 ${alert._id} 時發生錯誤:`, error.message);
      }
    }
  }

  /**
   * 判斷是否應該觸發警報
   */
  async shouldTriggerAlert(alert, marketData) {
    const { price, priceChange, volume } = marketData;
    
    switch (alert.alertType) {
      case 'price_above':
        return price >= alert.targetPrice;
        
      case 'price_below':
        return price <= alert.targetPrice;
        
      case 'percent_change':
        if (alert.percentChange > 0) {
          return priceChange >= alert.percentChange;
        } else {
          return priceChange <= alert.percentChange;
        }
        
      case 'volume_spike':
        // 需要比較平均成交量
        const avgVolume = await this.getAverageVolume(alert.symbol);
        return volume >= (avgVolume * alert.volumeMultiplier);
        
      default:
        logger.warn(`未知的警報類型: ${alert.alertType}`);
        return false;
    }
  }

  /**
   * 觸發警報
   */
  async triggerAlert(alert, marketData) {
    try {
      logger.info(`觸發價格警報: ${alert.symbol} ${alert.alertType}`, {
        alertId: alert._id,
        currentPrice: marketData.price,
        targetPrice: alert.targetPrice
      });

      // 更新警報狀態
      await alert.trigger(marketData);
      
      // 發送通知
      await this.sendAlertNotifications(alert, marketData);
      
      // 從快取中移除已觸發的警報
      this.alertCache.delete(alert._id);
      
      // 記錄觸發事件
      logger.logSystemEvent('price_alert_triggered', {
        alertId: alert._id,
        userId: alert.userId,
        symbol: alert.symbol,
        alertType: alert.alertType,
        triggerPrice: marketData.price,
        targetPrice: alert.targetPrice
      });
    } catch (error) {
      logger.error(`觸發警報 ${alert._id} 失敗:`, error.message);
    }
  }

  /**
   * 發送警報通知
   */
  async sendAlertNotifications(alert, marketData) {
    const notifications = [];
    
    // LINE Notify 通知
    if (alert.notificationMethods.lineNotify?.enabled) {
      try {
        const lineNotifyService = getLineNotifyService();
        const alertData = {
          symbol: alert.symbol,
          currentPrice: marketData.price,
          targetPrice: alert.targetPrice,
          direction: alert.alertType === 'price_above' ? 'above' : 'below',
          changePercent: marketData.priceChangePercent || 0,
          timestamp: Date.now()
        };
        
        const result = await lineNotifyService.sendPriceAlert(
          alertData, 
          alert.notificationMethods.lineNotify.token
        );
        
        await alert.addNotificationResult('line_notify', result.success);
        notifications.push({ method: 'line_notify', success: result.success });
      } catch (error) {
        logger.error('發送 LINE Notify 警報失敗:', error.message);
        await alert.addNotificationResult('line_notify', false, error.message);
        notifications.push({ method: 'line_notify', success: false, error: error.message });
      }
    }

    // Email 通知 (預留)
    if (alert.notificationMethods.email?.enabled) {
      // TODO: 實作 Email 通知
      notifications.push({ method: 'email', success: false, error: 'Not implemented' });
    }

    // Webhook 通知 (預留)
    if (alert.notificationMethods.webhook?.enabled) {
      // TODO: 實作 Webhook 通知
      notifications.push({ method: 'webhook', success: false, error: 'Not implemented' });
    }

    return notifications;
  }

  /**
   * 取得平均成交量
   */
  async getAverageVolume(symbol, days = 7) {
    try {
      const binanceService = getBinanceService();
      const klines = await binanceService.getKlineData(symbol, '1d', days);
      
      if (klines.length === 0) return 0;
      
      const totalVolume = klines.reduce((sum, kline) => sum + kline.volume, 0);
      return totalVolume / klines.length;
    } catch (error) {
      logger.error(`取得 ${symbol} 平均成交量失敗:`, error.message);
      return 0;
    }
  }

  /**
   * 添加新警報到監控
   */
  async addAlert(alert) {
    this.alertCache.set(alert._id, alert);
    this.monitoredSymbols.add(alert.symbol);
    
    // 如果需要，設定新的價格訂閱
    if (this.isRunning && !this.wsConnections.has(alert.symbol)) {
      await this.setupPriceSubscriptions();
    }
    
    logger.info(`添加警報到監控: ${alert.symbol}`, { alertId: alert._id });
  }

  /**
   * 從監控中移除警報
   */
  removeAlert(alertId) {
    const alert = this.alertCache.get(alertId);
    if (alert) {
      this.alertCache.delete(alertId);
      
      // 檢查是否還有其他警報監控此交易對
      const hasOtherAlerts = Array.from(this.alertCache.values())
        .some(a => a.symbol === alert.symbol);
      
      if (!hasOtherAlerts) {
        this.monitoredSymbols.delete(alert.symbol);
      }
      
      logger.info(`從監控中移除警報: ${alert.symbol}`, { alertId });
    }
  }

  /**
   * 工具函數：分割陣列
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 取得監控狀態
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      monitoredSymbols: Array.from(this.monitoredSymbols),
      alertCount: this.alertCache.size,
      priceDataCount: this.priceCache.size,
      wsConnections: this.wsConnections.size,
      config: this.config
    };
  }

  /**
   * 強制檢查特定警報
   */
  async forceCheckAlert(alertId) {
    const alert = this.alertCache.get(alertId);
    if (!alert) {
      throw new Error(`警報 ${alertId} 不在監控中`);
    }

    await this.checkSymbolAlerts(alert.symbol);
  }
}

// 單例模式
let alertMonitorServiceInstance = null;

const getAlertMonitorService = () => {
  if (!alertMonitorServiceInstance) {
    alertMonitorServiceInstance = new AlertMonitorService();
  }
  return alertMonitorServiceInstance;
};

module.exports = {
  AlertMonitorService,
  getAlertMonitorService
};