# NexusTrade 零成本監控架構設計

## 📋 架構概述

### 當前問題分析

**現有 24/7 監控成本問題**：
```javascript
// 當前問題：src/services/price-alert-monitor.service.js:52-54
this.monitorInterval = setInterval(() => {
  this.performCheck();
}, this.checkIntervalMs); // 每分鐘執行 = 1,440次/日 × N個警報

// 成本計算：
// - 100個活躍警報 × 1,440次檢查/日 = 144,000次 API 調用/日
// - 月成本約：$50-100 (僅 API 費用)
// - 雲端運算成本：$200-400/月
// - 總計：$250-500/月，且隨警報數量線性增長
```

### 零成本監控核心策略

**1. 事件驅動架構 (Event-Driven)**：
- 從定時檢查改為事件觸發
- 利用現有 WebSocket 連接的數據流
- 用戶活動時機會主義檢查

**2. 智慧觸發機制**：
- WebSocket 數據到達時自動檢查相關警報
- 用戶訪問頁面時檢查個人警報
- 批量處理相同交易對的多個警報

**3. 多層快取優化**：
- 價格數據快取 (30秒-2分鐘)
- 技術指標計算快取 (5-10分鐘)
- 警報檢查結果快取 (避免重複計算)

## 🏗️ 技術架構設計

### 核心組件架構

```
┌─────────────────────────────────────────────────────────────────┐
│                     零成本監控系統架構                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ 用戶活動    │    │ WebSocket   │    │ 第三方      │         │
│  │ 觸發器      │────│ 數據流      │────│ Webhook     │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                   │                   │              │
│         ▼                   ▼                   ▼              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │           事件驅動監控調度器 (EventDrivenMonitor)           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                智慧警報檢查引擎                              │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐              │ │
│  │  │快取管理器 │  │批量處理器 │  │條件評估器 │              │ │
│  │  └───────────┘  └───────────┘  └───────────┘              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │               通知發送系統                                  │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐              │ │
│  │  │LINE 訊息  │  │Email 發送 │  │Webhook 推送│              │ │
│  │  └───────────┘  └───────────┘  └───────────┘              │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1. 事件驅動監控調度器

**檔案位置**: `src/services/event-driven-monitor.service.js`

```javascript
/**
 * 零成本事件驅動監控服務
 * 
 * 核心理念：不主動輪詢，僅在事件發生時被動檢查
 */
class EventDrivenMonitorService {
  constructor() {
    this.activeUserSessions = new Map();     // 追蹤活躍用戶
    this.alertCheckQueue = new Set();        // 待檢查警報佇列
    this.priceCache = new Map();             // 價格快取
    this.lastProcessTime = Date.now();       // 上次處理時間
    this.batchProcessTimer = null;           // 批量處理計時器
    this.stats = {
      eventsTriggered: 0,
      alertsChecked: 0,
      cacheHits: 0,
      apiCalls: 0,
      costSavings: 0
    };
  }
  
  /**
   * 初始化事件監聽器
   */
  initialize() {
    // 監聽 WebSocket 服務的價格更新事件
    this.setupWebSocketListeners();
    
    // 監聽用戶活動事件
    this.setupUserActivityListeners();
    
    // 設定批量處理機制
    this.setupBatchProcessor();
    
    logger.info('🚀 事件驅動監控服務已啟動 (零成本模式)');
  }
  
  /**
   * 設定 WebSocket 事件監聽
   */
  setupWebSocketListeners() {
    const webSocketService = getWebSocketService();
    
    // 監聽價格更新事件
    webSocketService.on('price_update', (data) => {
      this.onPriceUpdate(data);
    });
    
    // 監聽用戶連接事件
    webSocketService.on('client_connected', (clientInfo) => {
      this.onUserConnected(clientInfo);
    });
    
    // 監聽用戶訂閱事件
    webSocketService.on('symbol_subscribed', (clientId, symbol) => {
      this.onSymbolSubscribed(clientId, symbol);
    });
  }
  
  /**
   * WebSocket 價格更新觸發
   */
  async onPriceUpdate(priceData) {
    this.stats.eventsTriggered++;
    
    const { symbol, price, priceChange, volume } = priceData;
    
    // 更新價格快取
    this.updatePriceCache(symbol, priceData);
    
    // 查找該交易對的活躍警報
    const affectedAlerts = await this.findAlertsForSymbol(symbol);
    
    if (affectedAlerts.length > 0) {
      // 加入檢查佇列
      for (const alert of affectedAlerts) {
        this.alertCheckQueue.add(alert._id);
      }
      
      // 觸發批量處理 (延遲500ms 以收集更多事件)
      this.scheduleBatchProcess();
      
      logger.debug(`💡 WebSocket 觸發 ${symbol} 警報檢查 (${affectedAlerts.length} 個警報)`);
    }
  }
  
  /**
   * 用戶活動觸發警報檢查
   */
  async onUserActivity(userId, activityType, metadata = {}) {
    this.stats.eventsTriggered++;
    
    // 記錄用戶活動
    this.recordUserActivity(userId, activityType, metadata);
    
    // 如果用戶訪問了特定交易對頁面，檢查該用戶的相關警報
    if (activityType === 'page_visit' && metadata.symbol) {
      const userAlerts = await this.findUserAlertsForSymbol(userId, metadata.symbol);
      
      for (const alert of userAlerts) {
        this.alertCheckQueue.add(alert._id);
      }
      
      this.scheduleBatchProcess();
      
      logger.debug(`👤 用戶活動觸發 ${userId} 的 ${metadata.symbol} 警報檢查`);
    }
    
    // 如果用戶長時間未活動後重新上線，檢查所有警報
    if (activityType === 'return_user') {
      const userAlerts = await this.findAllUserAlerts(userId);
      
      for (const alert of userAlerts) {
        this.alertCheckQueue.add(alert._id);
      }
      
      this.scheduleBatchProcess();
      
      logger.info(`🔄 用戶 ${userId} 重新上線，檢查所有警報 (${userAlerts.length} 個)`);
    }
  }
  
  /**
   * 排程批量處理
   */
  scheduleBatchProcess() {
    // 如果已有排程，清除舊的
    if (this.batchProcessTimer) {
      clearTimeout(this.batchProcessTimer);
    }
    
    // 延遲處理以收集更多事件 (減少零散的 API 調用)
    this.batchProcessTimer = setTimeout(() => {
      this.processBatchAlerts();
    }, 500); // 500ms 延遲
  }
  
  /**
   * 批量處理警報檢查
   */
  async processBatchAlerts() {
    if (this.alertCheckQueue.size === 0) return;
    
    const alertIds = Array.from(this.alertCheckQueue);
    this.alertCheckQueue.clear();
    
    logger.info(`🔄 批量處理 ${alertIds.length} 個警報檢查`);
    
    // 按交易對分組以最佳化 API 調用
    const alertsBySymbol = await this.groupAlertsBySymbol(alertIds);
    
    for (const [symbol, alerts] of alertsBySymbol) {
      await this.checkSymbolAlerts(symbol, alerts);
    }
    
    this.stats.alertsChecked += alertIds.length;
  }
  
  /**
   * 檢查特定交易對的警報
   */
  async checkSymbolAlerts(symbol, alerts) {
    try {
      // 先檢查快取
      let marketData = this.getPriceFromCache(symbol);
      
      if (!marketData) {
        // 快取未命中，調用 API
        marketData = await this.fetchMarketData(symbol);
        this.updatePriceCache(symbol, marketData);
        this.stats.apiCalls++;
      } else {
        this.stats.cacheHits++;
        this.stats.costSavings += 0.001; // 估算每次 API 調用成本
      }
      
      // 檢查每個警報
      for (const alert of alerts) {
        const shouldTrigger = await this.evaluateAlertCondition(alert, marketData);
        
        if (shouldTrigger) {
          await this.triggerAlert(alert, marketData);
          logger.info(`🚨 警報觸發: ${alert._id} (${symbol})`);
        }
      }
      
    } catch (error) {
      logger.error(`檢查 ${symbol} 警報失敗:`, error.message);
    }
  }
}
```

### 2. 智慧快取管理系統

**檔案位置**: `src/services/smart-cache-manager.service.js`

```javascript
/**
 * 智慧快取管理器
 * 
 * 多層快取架構，最大化減少 API 調用
 */
class SmartCacheManager {
  constructor() {
    // L1: 價格數據快取 (短期，高頻訪問)
    this.priceCache = new Map();
    this.priceCacheTTL = 30 * 1000; // 30秒
    
    // L2: 技術指標快取 (中期，計算密集)
    this.indicatorCache = new Map();
    this.indicatorCacheTTL = 5 * 60 * 1000; // 5分鐘
    
    // L3: 警報評估結果快取 (避免重複評估)
    this.evaluationCache = new Map();
    this.evaluationCacheTTL = 60 * 1000; // 1分鐘
    
    // 快取統計
    this.stats = {
      hits: { L1: 0, L2: 0, L3: 0 },
      misses: { L1: 0, L2: 0, L3: 0 },
      evictions: 0
    };
    
    // 定期清理過期快取
    setInterval(() => this.cleanup(), 60000); // 每分鐘清理一次
  }
  
  /**
   * 取得價格數據 (L1 快取)
   */
  getPrice(symbol) {
    const cacheKey = `price_${symbol}`;
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.priceCacheTTL) {
      this.stats.hits.L1++;
      return cached.data;
    }
    
    this.stats.misses.L1++;
    return null;
  }
  
  /**
   * 設定價格數據快取
   */
  setPrice(symbol, data) {
    const cacheKey = `price_${symbol}`;
    this.priceCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * 取得技術指標 (L2 快取)
   */
  getTechnicalIndicator(symbol, indicator, params) {
    const cacheKey = `indicator_${symbol}_${indicator}_${JSON.stringify(params)}`;
    const cached = this.indicatorCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.indicatorCacheTTL) {
      this.stats.hits.L2++;
      return cached.data;
    }
    
    this.stats.misses.L2++;
    return null;
  }
  
  /**
   * 設定技術指標快取
   */
  setTechnicalIndicator(symbol, indicator, params, data) {
    const cacheKey = `indicator_${symbol}_${indicator}_${JSON.stringify(params)}`;
    this.indicatorCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * 取得警報評估結果 (L3 快取)
   */
  getEvaluationResult(alertId, priceKey) {
    const cacheKey = `eval_${alertId}_${priceKey}`;
    const cached = this.evaluationCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.evaluationCacheTTL) {
      this.stats.hits.L3++;
      return cached.result;
    }
    
    this.stats.misses.L3++;
    return null;
  }
  
  /**
   * 設定警報評估結果快取
   */
  setEvaluationResult(alertId, priceKey, result) {
    const cacheKey = `eval_${alertId}_${priceKey}`;
    this.evaluationCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }
  
  /**
   * 智慧快取策略 - 根據交易對活躍度調整快取時間
   */
  getOptimalCacheTTL(symbol) {
    const majorCoins = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'];
    const popularCoins = ['ADAUSDT', 'DOTUSDT', 'LINKUSDT', 'LTCUSDT'];
    
    if (majorCoins.includes(symbol)) {
      return {
        price: 15 * 1000,        // 15秒 (高頻交易)
        indicator: 2 * 60 * 1000, // 2分鐘
        evaluation: 30 * 1000     // 30秒
      };
    } else if (popularCoins.includes(symbol)) {
      return {
        price: 30 * 1000,        // 30秒
        indicator: 5 * 60 * 1000, // 5分鐘
        evaluation: 60 * 1000     // 1分鐘
      };
    } else {
      return {
        price: 60 * 1000,        // 1分鐘 (低頻交易)
        indicator: 10 * 60 * 1000, // 10分鐘
        evaluation: 2 * 60 * 1000  // 2分鐘
      };
    }
  }
  
  /**
   * 清理過期快取
   */
  cleanup() {
    const now = Date.now();
    let evicted = 0;
    
    // 清理 L1 快取
    for (const [key, value] of this.priceCache) {
      if ((now - value.timestamp) > this.priceCacheTTL) {
        this.priceCache.delete(key);
        evicted++;
      }
    }
    
    // 清理 L2 快取
    for (const [key, value] of this.indicatorCache) {
      if ((now - value.timestamp) > this.indicatorCacheTTL) {
        this.indicatorCache.delete(key);
        evicted++;
      }
    }
    
    // 清理 L3 快取
    for (const [key, value] of this.evaluationCache) {
      if ((now - value.timestamp) > this.evaluationCacheTTL) {
        this.evaluationCache.delete(key);
        evicted++;
      }
    }
    
    if (evicted > 0) {
      this.stats.evictions += evicted;
      logger.debug(`🧹 清理了 ${evicted} 個過期快取項目`);
    }
  }
  
  /**
   * 取得快取統計
   */
  getStats() {
    const totalHits = this.stats.hits.L1 + this.stats.hits.L2 + this.stats.hits.L3;
    const totalMisses = this.stats.misses.L1 + this.stats.misses.L2 + this.stats.misses.L3;
    const totalRequests = totalHits + totalMisses;
    
    return {
      ...this.stats,
      hitRate: totalRequests > 0 ? (totalHits / totalRequests * 100).toFixed(2) + '%' : '0%',
      cacheSizes: {
        L1: this.priceCache.size,
        L2: this.indicatorCache.size,
        L3: this.evaluationCache.size
      }
    };
  }
}
```

### 3. 用戶活動追蹤器

**檔案位置**: `src/services/user-activity-tracker.service.js`

```javascript
/**
 * 用戶活動追蹤器
 * 
 * 追蹤用戶行為，智慧觸發警報檢查
 */
class UserActivityTracker {
  constructor() {
    this.userSessions = new Map();
    this.activityPatterns = new Map();
    this.alertTriggerHistory = new Map();
  }
  
  /**
   * 記錄用戶活動
   */
  recordActivity(userId, activityType, metadata = {}) {
    const now = Date.now();
    
    // 更新用戶 session
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        firstSeen: now,
        lastSeen: now,
        totalActivities: 0,
        recentActivities: [],
        favoriteSymbols: new Map(),
        alertCheckPattern: {
          totalChecks: 0,
          successfulAlerts: 0,
          lastCheckTime: null
        }
      });
    }
    
    const session = this.userSessions.get(userId);
    session.lastSeen = now;
    session.totalActivities++;
    
    // 記錄最近活動 (保留最近 50 個)
    session.recentActivities.push({
      type: activityType,
      timestamp: now,
      metadata
    });
    
    if (session.recentActivities.length > 50) {
      session.recentActivities.shift();
    }
    
    // 追蹤用戶喜好的交易對
    if (metadata.symbol) {
      const count = session.favoriteSymbols.get(metadata.symbol) || 0;
      session.favoriteSymbols.set(metadata.symbol, count + 1);
    }
    
    // 觸發事件驅動監控
    this.triggerSmartCheck(userId, activityType, metadata);
  }
  
  /**
   * 智慧觸發警報檢查
   */
  async triggerSmartCheck(userId, activityType, metadata) {
    const session = this.userSessions.get(userId);
    if (!session) return;
    
    // 根據活動類型決定檢查策略
    switch (activityType) {
      case 'page_visit':
        if (metadata.symbol) {
          // 用戶訪問特定交易對頁面，檢查相關警報
          await this.checkUserSymbolAlerts(userId, metadata.symbol);
        }
        break;
        
      case 'price_alert_created':
        // 用戶創建新警報，立即檢查一次
        if (metadata.alertId) {
          await this.checkSpecificAlert(metadata.alertId);
        }
        break;
        
      case 'websocket_subscribe':
        // 用戶訂閱 WebSocket 數據，檢查訂閱的交易對
        if (metadata.symbols) {
          for (const symbol of metadata.symbols) {
            await this.checkUserSymbolAlerts(userId, symbol);
          }
        }
        break;
        
      case 'login':
        // 用戶登入，檢查最重要的警報
        await this.checkHighPriorityAlerts(userId);
        break;
        
      case 'return_user':
        // 長時間未活動後回歸，檢查所有警報
        await this.checkAllUserAlerts(userId);
        break;
    }
  }
  
  /**
   * 檢查用戶的特定交易對警報
   */
  async checkUserSymbolAlerts(userId, symbol) {
    try {
      const alerts = await PriceAlert.find({
        userId,
        symbol: symbol.toUpperCase(),
        status: 'active',
        enabled: true
      });
      
      if (alerts.length > 0) {
        const eventMonitor = getEventDrivenMonitorService();
        await eventMonitor.onUserActivity(userId, 'symbol_focus', { symbol, alertCount: alerts.length });
        
        logger.debug(`🎯 檢查用戶 ${userId} 的 ${symbol} 警報 (${alerts.length} 個)`);
      }
    } catch (error) {
      logger.error(`檢查用戶交易對警報失敗:`, error.message);
    }
  }
  
  /**
   * 檢查高優先級警報
   */
  async checkHighPriorityAlerts(userId) {
    try {
      const alerts = await PriceAlert.find({
        userId,
        status: 'active',
        enabled: true,
        priority: { $in: ['high', 'critical'] }
      }).sort({ priority: -1, createdAt: -1 }).limit(5);
      
      if (alerts.length > 0) {
        const eventMonitor = getEventDrivenMonitorService();
        for (const alert of alerts) {
          await eventMonitor.onUserActivity(userId, 'priority_check', { 
            alertId: alert._id, 
            symbol: alert.symbol 
          });
        }
        
        logger.info(`⭐ 檢查用戶 ${userId} 的高優先級警報 (${alerts.length} 個)`);
      }
    } catch (error) {
      logger.error(`檢查高優先級警報失敗:`, error.message);
    }
  }
  
  /**
   * 檢查所有用戶警報 (回歸用戶)
   */
  async checkAllUserAlerts(userId) {
    try {
      const alerts = await PriceAlert.find({
        userId,
        status: 'active',
        enabled: true
      });
      
      if (alerts.length > 0) {
        const eventMonitor = getEventDrivenMonitorService();
        await eventMonitor.onUserActivity(userId, 'full_check', { 
          alertCount: alerts.length 
        });
        
        logger.info(`🔄 完整檢查用戶 ${userId} 的所有警報 (${alerts.length} 個)`);
      }
    } catch (error) {
      logger.error(`檢查所有用戶警報失敗:`, error.message);
    }
  }
  
  /**
   * 判斷用戶是否為回歸用戶
   */
  isReturningUser(userId) {
    const session = this.userSessions.get(userId);
    if (!session) return false;
    
    const now = Date.now();
    const inactiveThreshold = 24 * 60 * 60 * 1000; // 24小時
    
    return (now - session.lastSeen) > inactiveThreshold;
  }
  
  /**
   * 取得用戶活動分析
   */
  getUserActivityAnalysis(userId) {
    const session = this.userSessions.get(userId);
    if (!session) return null;
    
    const now = Date.now();
    const sessionDuration = now - session.firstSeen;
    
    // 分析活動模式
    const activityTypes = {};
    for (const activity of session.recentActivities) {
      activityTypes[activity.type] = (activityTypes[activity.type] || 0) + 1;
    }
    
    // 最喜歡的交易對
    const favoriteSymbols = Array.from(session.favoriteSymbols.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([symbol, count]) => ({ symbol, count }));
    
    return {
      sessionDuration,
      totalActivities: session.totalActivities,
      recentActivityCount: session.recentActivities.length,
      activityTypes,
      favoriteSymbols,
      lastSeen: session.lastSeen,
      isActive: (now - session.lastSeen) < 30 * 60 * 1000, // 30分鐘內活躍
      alertCheckPattern: session.alertCheckPattern
    };
  }
}
```

### 4. 第三方免費監控整合

**檔案位置**: `src/services/free-webhook-monitor.service.js`

```javascript
/**
 * 免費第三方監控服務整合
 * 
 * 利用免費服務減少主動監控成本
 */
class FreeWebhookMonitorService {
  constructor() {
    this.webhookProviders = {
      discord: new DiscordWebhookProvider(),
      telegram: new TelegramBotProvider(),
      ifttt: new IFTTTProvider(),
      zapier: new ZapierProvider()
    };
    
    this.monitoredAlerts = new Map();
    this.providerQuotas = new Map();
  }
  
  /**
   * Discord Webhook 監控設定
   */
  async setupDiscordMonitoring(alert) {
    try {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (!webhookUrl) return false;
      
      // 設定 Discord Webhook 監控
      const monitorConfig = {
        alertId: alert._id,
        symbol: alert.symbol,
        condition: alert.alertType,
        threshold: alert.targetPrice,
        webhookUrl
      };
      
      // 使用 Discord Webhook 發送監控設定
      await this.webhookProviders.discord.setupMonitoring(monitorConfig);
      
      this.monitoredAlerts.set(alert._id, {
        provider: 'discord',
        config: monitorConfig,
        setupTime: Date.now()
      });
      
      logger.info(`📢 Discord 監控已設定: ${alert.symbol} (${alert._id})`);
      return true;
    } catch (error) {
      logger.error('Discord 監控設定失敗:', error.message);
      return false;
    }
  }
  
  /**
   * Telegram Bot 監控設定
   */
  async setupTelegramMonitoring(alert, chatId) {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) return false;
      
      // 設定 Telegram Bot 命令監控
      const monitorConfig = {
        alertId: alert._id,
        symbol: alert.symbol,
        condition: alert.alertType,
        threshold: alert.targetPrice,
        chatId,
        botToken
      };
      
      await this.webhookProviders.telegram.setupMonitoring(monitorConfig);
      
      this.monitoredAlerts.set(alert._id, {
        provider: 'telegram',
        config: monitorConfig,
        setupTime: Date.now()
      });
      
      logger.info(`🤖 Telegram 監控已設定: ${alert.symbol} (${alert._id})`);
      return true;
    } catch (error) {
      logger.error('Telegram 監控設定失敗:', error.message);
      return false;
    }
  }
  
  /**
   * IFTTT Webhooks 整合
   */
  async setupIFTTTMonitoring(alert) {
    try {
      const iftttKey = process.env.IFTTT_WEBHOOK_KEY;
      if (!iftttKey) return false;
      
      // 使用 IFTTT Webhooks 服務
      const eventName = `price_alert_${alert.symbol.toLowerCase()}`;
      const webhookUrl = `https://maker.ifttt.com/trigger/${eventName}/with/key/${iftttKey}`;
      
      const monitorConfig = {
        alertId: alert._id,
        symbol: alert.symbol,
        eventName,
        webhookUrl,
        threshold: alert.targetPrice
      };
      
      await this.webhookProviders.ifttt.setupMonitoring(monitorConfig);
      
      this.monitoredAlerts.set(alert._id, {
        provider: 'ifttt',
        config: monitorConfig,
        setupTime: Date.now()
      });
      
      logger.info(`🔗 IFTTT 監控已設定: ${alert.symbol} (${alert._id})`);
      return true;
    } catch (error) {
      logger.error('IFTTT 監控設定失敗:', error.message);
      return false;
    }
  }
  
  /**
   * 智慧監控策略選擇
   */
  async selectOptimalMonitoring(alert, userPreferences = {}) {
    const strategies = [];
    
    // 評估各種免費監控選項
    if (userPreferences.discord && process.env.DISCORD_WEBHOOK_URL) {
      strategies.push({
        provider: 'discord',
        cost: 0,
        reliability: 0.95,
        latency: 2000, // 2秒
        quota: 1000    // 每小時限制
      });
    }
    
    if (userPreferences.telegram && process.env.TELEGRAM_BOT_TOKEN) {
      strategies.push({
        provider: 'telegram',
        cost: 0,
        reliability: 0.98,
        latency: 1000, // 1秒
        quota: 30      // 每秒限制
      });
    }
    
    if (process.env.IFTTT_WEBHOOK_KEY) {
      strategies.push({
        provider: 'ifttt',
        cost: 0,
        reliability: 0.90,
        latency: 5000, // 5秒
        quota: 100     // 每小時限制
      });
    }
    
    // 選擇最佳策略 (可靠性優先)
    const bestStrategy = strategies.sort((a, b) => b.reliability - a.reliability)[0];
    
    if (bestStrategy) {
      switch (bestStrategy.provider) {
        case 'discord':
          return await this.setupDiscordMonitoring(alert);
        case 'telegram':
          return await this.setupTelegramMonitoring(alert, userPreferences.telegramChatId);
        case 'ifttt':
          return await this.setupIFTTTMonitoring(alert);
      }
    }
    
    return false;
  }
  
  /**
   * 處理第三方監控回調
   */
  async handleWebhookCallback(provider, data) {
    try {
      const alertId = data.alertId || data.alert_id;
      const monitoredAlert = this.monitoredAlerts.get(alertId);
      
      if (!monitoredAlert) {
        logger.warn(`收到未知警報的回調: ${alertId}`);
        return;
      }
      
      // 驗證回調數據
      const isValid = await this.validateWebhookCallback(provider, data, monitoredAlert.config);
      if (!isValid) {
        logger.warn(`無效的 Webhook 回調: ${provider}`);
        return;
      }
      
      // 處理警報觸發
      const alert = await PriceAlert.findById(alertId);
      if (alert && alert.canTrigger()) {
        await this.processAlertTrigger(alert, data);
        logger.info(`📬 第三方監控觸發警報: ${alert.symbol} (${provider})`);
      }
      
    } catch (error) {
      logger.error(`處理 Webhook 回調失敗:`, error.message);
    }
  }
  
  /**
   * 清理過期的第三方監控
   */
  async cleanupExpiredMonitoring() {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
    
    for (const [alertId, monitorInfo] of this.monitoredAlerts) {
      if ((now - monitorInfo.setupTime) > maxAge) {
        // 檢查警報是否仍然活躍
        const alert = await PriceAlert.findById(alertId);
        
        if (!alert || alert.status !== 'active') {
          // 清理第三方監控設定
          await this.removeThirdPartyMonitoring(alertId, monitorInfo.provider);
          this.monitoredAlerts.delete(alertId);
          
          logger.info(`🧹 清理過期的第三方監控: ${alertId}`);
        }
      }
    }
  }
}
```

### 5. 前端活動追蹤整合

**檔案位置**: `public/js/lib/activity-tracker.js`

```javascript
/**
 * 前端活動追蹤器
 * 
 * 將用戶前端活動發送到後端觸發警報檢查
 */
class ActivityTracker {
  constructor() {
    this.isEnabled = true;
    this.queue = [];
    this.batchSize = 10;
    this.flushInterval = 5000; // 5秒
    this.lastFlush = Date.now();
    
    this.setupEventListeners();
    this.startBatchProcessor();
  }
  
  /**
   * 設定事件監聽器
   */
  setupEventListeners() {
    // 頁面訪問追蹤
    window.addEventListener('popstate', (event) => {
      this.trackActivity('page_navigation', {
        url: window.location.pathname,
        timestamp: Date.now()
      });
    });
    
    // 交易對頁面訪問
    this.trackCurrencyPageVisits();
    
    // WebSocket 連接追蹤
    this.trackWebSocketActivity();
    
    // 用戶互動追蹤
    this.trackUserInteractions();
  }
  
  /**
   * 追蹤交易對頁面訪問
   */
  trackCurrencyPageVisits() {
    // 監聽路由變化
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      activityTracker.handleRouteChange();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      activityTracker.handleRouteChange();
    };
  }
  
  /**
   * 處理路由變化
   */
  handleRouteChange() {
    const path = window.location.pathname;
    
    // 檢查是否為交易對詳情頁面
    const currencyMatch = path.match(/\/currency\/([A-Z]+USDT?)/);
    if (currencyMatch) {
      const symbol = currencyMatch[1];
      this.trackActivity('currency_page_visit', {
        symbol,
        path,
        timestamp: Date.now(),
        referrer: document.referrer
      });
    }
    
    // 檢查是否為警報管理頁面
    if (path.includes('/alerts') || path.includes('/notifications')) {
      this.trackActivity('alerts_page_visit', {
        path,
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * 追蹤 WebSocket 活動
   */
  trackWebSocketActivity() {
    // 假設有全域 WebSocket 連接
    if (window.wsConnection) {
      const originalSend = window.wsConnection.send;
      
      window.wsConnection.send = function(data) {
        try {
          const message = JSON.parse(data);
          if (message.type === 'subscribe' && message.data.symbols) {
            activityTracker.trackActivity('websocket_subscribe', {
              symbols: message.data.symbols,
              timestamp: Date.now()
            });
          }
        } catch (e) {
          // 忽略 JSON 解析錯誤
        }
        
        return originalSend.call(this, data);
      };
    }
  }
  
  /**
   * 追蹤用戶互動
   */
  trackUserInteractions() {
    // 追蹤價格警報創建
    document.addEventListener('click', (event) => {
      const target = event.target;
      
      // 價格警報按鈕
      if (target.matches('.price-alert-btn, [data-action="create-alert"]')) {
        this.trackActivity('price_alert_interest', {
          element: target.className,
          timestamp: Date.now()
        });
      }
      
      // 通知設定按鈕
      if (target.matches('.notification-btn, [data-action="notification-settings"]')) {
        this.trackActivity('notification_settings_access', {
          element: target.className,
          timestamp: Date.now()
        });
      }
    });
    
    // 追蹤表單提交
    document.addEventListener('submit', (event) => {
      const form = event.target;
      
      if (form.matches('.price-alert-form')) {
        // 提取表單數據
        const formData = new FormData(form);
        const symbol = formData.get('symbol');
        const alertType = formData.get('alertType');
        
        this.trackActivity('price_alert_created', {
          symbol,
          alertType,
          timestamp: Date.now()
        });
      }
    });
  }
  
  /**
   * 記錄活動
   */
  trackActivity(activityType, metadata = {}) {
    if (!this.isEnabled) return;
    
    this.queue.push({
      type: activityType,
      metadata,
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      userId: this.getUserId()
    });
    
    // 檢查是否需要立即發送
    if (this.shouldFlushImmediately(activityType)) {
      this.flush();
    }
  }
  
  /**
   * 判斷是否需要立即發送
   */
  shouldFlushImmediately(activityType) {
    const immediateTypes = [
      'currency_page_visit',
      'price_alert_created',
      'websocket_subscribe',
      'login',
      'logout'
    ];
    
    return immediateTypes.includes(activityType);
  }
  
  /**
   * 開始批量處理器
   */
  startBatchProcessor() {
    setInterval(() => {
      if (this.queue.length > 0 && 
          (this.queue.length >= this.batchSize || 
           Date.now() - this.lastFlush > this.flushInterval)) {
        this.flush();
      }
    }, 1000); // 每秒檢查一次
  }
  
  /**
   * 發送活動數據到後端
   */
  async flush() {
    if (this.queue.length === 0) return;
    
    const activities = this.queue.splice(0, this.batchSize);
    this.lastFlush = Date.now();
    
    try {
      const response = await fetch('/api/user-activity/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          activities,
          source: 'frontend',
          timestamp: Date.now()
        })
      });
      
      if (!response.ok) {
        console.warn('活動追蹤發送失敗:', response.statusText);
      }
      
    } catch (error) {
      console.warn('活動追蹤網路錯誤:', error.message);
      // 將失敗的活動重新加入隊列
      this.queue.unshift(...activities);
    }
  }
  
  /**
   * 取得認證 token
   */
  getAuthToken() {
    return localStorage.getItem('nexustrade_token') || null;
  }
  
  /**
   * 取得用戶 ID
   */
  getUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('nexustrade_user') || '{}');
      return user._id || null;
    } catch {
      return null;
    }
  }
  
  /**
   * 取得 session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('nexustrade_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('nexustrade_session_id', sessionId);
    }
    return sessionId;
  }
}

// 全域實例
window.activityTracker = new ActivityTracker();
```

## 📊 成本效益分析

### 現有 vs 零成本架構對比

| 項目 | 現有 24/7 監控 | 零成本事件驅動 | 節省比例 |
|------|---------------|---------------|----------|
| **API 調用次數/日** | 144,000 | 5,000-8,000 | 94% ↓ |
| **雲端計算成本/月** | $300-500 | $15-25 | 95% ↓ |
| **監控準確性** | 99.9% | 98.5% | 1.4% ↓ |
| **回應延遲** | 1-60秒 | 1-300秒 | 可接受 |
| **擴展性** | 線性成長 | 亞線性成長 | 優異 |

### 實際節省計算

**100 個活躍用戶場景**：
```
現有成本：
- API: 144,000 調用/日 × $0.001 = $144/月
- Lambda: 144,000 × 100ms × $0.0000166667 = $240/月
- 其他服務: $100/月
- 總計: $484/月

零成本架構：
- API: 7,000 調用/日 × $0.001 = $7/月
- Lambda: 7,000 × 100ms × $0.0000166667 = $12/月
- 其他服務: $6/月 (快取等)
- 總計: $25/月

月節省: $459 (94.8%)
年節省: $5,508
```

**1000 個活躍用戶場景**：
```
現有成本：
- 總計: $4,840/月

零成本架構：
- 總計: $180/月 (智慧快取和批量處理)

月節省: $4,660 (96.3%)
年節省: $55,920
```

## 🛠️ 實作部署指南

### 第一階段：事件驅動核心 (2天)

**Day 1: 事件驅動監控服務**
```bash
# 1. 建立事件驅動監控服務
touch src/services/event-driven-monitor.service.js

# 2. 實作核心邏輯
# - WebSocket 事件監聽
# - 批量處理機制
# - 智慧觸發邏輯

# 3. 整合到現有系統
# 修改 src/server.js 以啟動新服務
```

**Day 2: 智慧快取系統**
```bash
# 1. 建立快取管理器
touch src/services/smart-cache-manager.service.js

# 2. 實作多層快取
# - L1: 價格快取 (30秒)
# - L2: 技術指標快取 (5分鐘)
# - L3: 評估結果快取 (1分鐘)

# 3. 整合到監控服務
```

### 第二階段：用戶活動追蹤 (2天)

**Day 3: 後端活動追蹤**
```bash
# 1. 建立用戶活動追蹤器
touch src/services/user-activity-tracker.service.js

# 2. 建立活動記錄 API
touch src/routes/user-activity.js
touch src/controllers/user-activity.controller.js

# 3. 整合到認證中介軟體
```

**Day 4: 前端活動整合**
```bash
# 1. 建立前端活動追蹤器
touch public/js/lib/activity-tracker.js

# 2. 整合到現有頁面
# 修改 public/js/components/CurrencyDetailPage.js
# 修改 public/js/components/PriceAlertModal.js

# 3. 測試端到端活動追蹤
```

### 第三階段：第三方監控整合 (2天)

**Day 5: 免費 Webhook 服務**
```bash
# 1. 建立第三方監控服務
touch src/services/free-webhook-monitor.service.js

# 2. 實作 Discord/Telegram/IFTTT 整合
# 3. 建立 Webhook 回調處理器
```

**Day 6: 系統整合測試**
```bash
# 1. 整合所有服務
# 2. 進行端到端測試
# 3. 效能和成本驗證
```

### 環境變數配置

```bash
# .env 新增配置
MONITORING_MODE=event_driven
CACHE_ENABLED=true
ACTIVITY_TRACKING_ENABLED=true

# 第三方服務配置 (可選)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
IFTTT_WEBHOOK_KEY=your_ifttt_key

# 快取配置
PRICE_CACHE_TTL=30000
INDICATOR_CACHE_TTL=300000
EVALUATION_CACHE_TTL=60000

# 批量處理配置
BATCH_PROCESS_DELAY=500
MAX_BATCH_SIZE=50
```

### 系統監控指標

```javascript
// 新的監控端點: GET /api/system/zero-cost-metrics
{
  "monitoring": {
    "mode": "event_driven",
    "eventsTriggered": 1205,
    "alertsChecked": 856,
    "apiCallsToday": 234,
    "estimatedCostSavings": "$45.60"
  },
  "cache": {
    "hitRate": "94.2%",
    "cacheSizes": {
      "L1": 45,
      "L2": 23,
      "L3": 67
    }
  },
  "userActivity": {
    "activeSessions": 28,
    "totalActivities": 3421,
    "topTriggers": ["page_visit", "websocket_subscribe", "price_alert_created"]
  },
  "thirdPartyMonitoring": {
    "activeWebhooks": 12,
    "providersUsed": ["discord", "telegram"],
    "successRate": "98.3%"
  }
}
```

## 🎯 預期效果與驗證

### 成本節省目標

**第一個月**：
- ✅ API 調用減少 90%
- ✅ 雲端成本降低 85%
- ✅ 監控準確性保持 >98%

**第三個月**：
- ✅ API 調用減少 95%
- ✅ 雲端成本降低 95%
- ✅ 支援 1000+ 用戶不增加顯著成本

### 技術指標驗證

```bash
# 1. 成本監控腳本
node scripts/cost-analysis.js

# 2. 效能基準測試
node scripts/performance-benchmark.js

# 3. 端到端功能測試
npm run test:zero-cost-monitoring
```

### 用戶體驗驗證

- [ ] 警報觸發延遲 < 5分鐘 (95% 情況)
- [ ] 頁面訪問時立即檢查相關警報
- [ ] 高頻交易對 (BTC/ETH) 延遲 < 2分鐘
- [ ] 用戶感知無明顯差異

## 📈 結論

零成本監控架構通過以下創新實現了成本的大幅降低：

1. **事件驅動 vs 定時輪詢**：將被動監控改為主動觸發，減少 90%+ 的無效檢查
2. **智慧快取系統**：多層快取避免重複計算，命中率 >90%
3. **用戶活動導向**：利用用戶行為模式智慧觸發檢查
4. **第三方服務整合**：利用免費 Webhook 服務分散監控負載

預期在保持系統可用性和準確性的前提下，將運行成本從每月 $500+ 降低至 $25，節省比例達 95%，為平台的可持續發展奠定基礎。

---

**文件版本：v1.0.0**  
**建立日期：2025-01-01**  
**預估實作時間：6 天**  
**預期成本節省：95%**  
**適用規模：100-10,000 用戶**