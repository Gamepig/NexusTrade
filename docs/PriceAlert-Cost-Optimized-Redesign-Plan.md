# NexusTrade 到價通知功能成本優化重新設計計畫

## 📋 專案背景與目標

### 當前問題分析

**現有系統成本問題**：
- 24/7 每分鐘監控所有活躍警報
- 雲端部署成本過高（預估每月 $200-500）
- 無會員制度區分免費/付費功能
- 多交易對同時監控造成 API 用量激增
- 無智慧監控頻率調整機制

**新需求規格**：
1. **成本控制**：雲端運行成本趨近於零
2. **會員制度**：免費會員限制一組警報，付費無限制
3. **功能區分**：免費（價格上穿/下穿、漲跌%），付費（技術指標）
4. **效能優化**：智慧監控，避免不必要的 API 調用

### 重新設計目標

**核心目標**：
- 🎯 將運行成本降低 90% 以上
- 🎯 建立可持續的會員制商業模式
- 🎯 保持核心功能可用性
- 🎯 為未來擴展提供基礎

## 🔍 現有系統分析

### 已完成功能評估 (85%)

**✅ 後端核心系統**：
```javascript
// PriceAlert 模型 - 功能完整
src/models/PriceAlert.js (476行)
- 支援 4 種警報類型
- 完整的觸發歷史記錄
- 優先級和條件管理
- Mock 版本支援開發測試

// 價格警報控制器 - API 完整
src/controllers/price-alert.controller.js (395行)
- 完整 CRUD 操作
- LINE 用戶綁定整合
- AI 分析訂閱功能
- 輸入驗證和錯誤處理

// 監控服務 - 功能完整但需重構
src/services/price-alert-monitor.service.js (558行)
- 每分鐘檢查機制 ❌ (成本過高)
- 批量檢查優化 ✅
- 通知發送整合 ✅
- 狀態管理完整 ✅
```

**✅ 前端組件系統**：
```javascript
// 價格警報模態框 - 基本功能完整
public/js/components/PriceAlertModal.js
- 警報設定界面 ✅
- LINE 連接檢查 ✅
- 認證狀態管理 ✅

// 價格警報頁面 - 管理界面完整
public/js/components/PriceAlertsPage.js
- 警報清單顯示 ✅
- CRUD 操作界面 ✅
```

**✅ 整合系統**：
```javascript
// API 路由 - 完整
src/routes/notifications.js (75行)
- 警報管理端點 ✅
- 統計查詢端點 ✅
- 測試通知端點 ✅

// LINE 整合 - 完整
- LINE Messaging API 整合 ✅
- 用戶綁定機制 ✅
- 訊息模板系統 ✅
```

### 需要重構的核心問題

**❌ 成本過高的監控機制**：
```javascript
// 當前問題：src/services/price-alert-monitor.service.js:52-54
this.monitorInterval = setInterval(() => {
  this.performCheck();
}, this.checkIntervalMs); // 每分鐘執行，成本過高
```

**❌ 缺少會員制度限制**：
```javascript
// 當前問題：src/controllers/price-alert.controller.js:40-46
// 無會員級別檢查，任何用戶都可創建無限警報
const existingAlert = await PriceAlert.findOne({
  userId,
  symbol: symbol.toUpperCase(),
  alertType,
  targetPrice,
  status: 'active'
});
```

**❌ 無技術指標支援**：
```javascript
// 當前限制：src/models/PriceAlert.js:35
alertType: {
  type: String,
  enum: ['price_above', 'price_below', 'percent_change', 'volume_spike'],
  // 缺少技術指標類型：'rsi', 'macd', 'moving_average' 等
}
```

## 🎯 成本優化策略設計

### 1. 零成本監控架構

**核心概念**：從 Push 模式改為 Pull 模式

**A. 用戶活動觸發監控**：
```javascript
// 新架構：事件驅動監控
class EventDrivenMonitorService {
  // 當用戶訪問市場頁面時觸發檢查
  async onUserMarketAccess(userId, symbols) {
    const userAlerts = await PriceAlert.find({ 
      userId, 
      symbol: { $in: symbols },
      status: 'active' 
    });
    await this.checkUserAlerts(userAlerts);
  }
  
  // 當 WebSocket 連接時機會主義檢查
  async onWebSocketData(marketData) {
    const affectedAlerts = await PriceAlert.find({
      symbol: marketData.symbol,
      status: 'active'
    });
    await this.checkAlertsForSymbol(affectedAlerts, marketData);
  }
}
```

**B. 免費 Webhook 服務整合**：
```javascript
// 整合 Discord/Telegram Webhook 作為免費通知渠道
class FreeWebhookMonitor {
  async setupDiscordWebhook(alertId, webhookUrl) {
    // 註冊到免費的 Discord Webhook 監控服務
    // 當價格變化時由第三方服務觸發通知
  }
  
  async setupTelegramBot(alertId, chatId) {
    // 使用 Telegram Bot API 免費額度
    // 設定價格監控命令
  }
}
```

**C. 智慧監控頻率**：
```javascript
// 根據用戶活躍度調整檢查頻率
class SmartMonitoringService {
  getCheckInterval(userActivity) {
    if (userActivity.lastSeen < 1) return 300; // 5分鐘（活躍用戶）
    if (userActivity.lastSeen < 24) return 3600; // 1小時
    if (userActivity.lastSeen < 168) return 86400; // 1天
    return -1; // 暫停監控（一週未活躍）
  }
}
```

### 2. 會員制度整合設計

**A. 會員等級模型**：
```javascript
// 擴展現有 User 模型
const userSchema = {
  // 現有欄位...
  membershipLevel: {
    type: String,
    enum: ['free', 'premium', 'enterprise'],
    default: 'free'
  },
  membershipExpiry: Date,
  alertQuota: {
    used: { type: Number, default: 0 },
    limit: { type: Number, default: 1 } // 免費用戶預設 1 個
  },
  premiumFeatures: {
    technicalIndicators: { type: Boolean, default: false },
    unlimitedAlerts: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false }
  }
};
```

**B. 警報創建限制邏輯**：
```javascript
// 修改 price-alert.controller.js
class PriceAlertController {
  async createAlert(req, res) {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    // 檢查會員配額
    if (user.membershipLevel === 'free') {
      const activeAlertsCount = await PriceAlert.countDocuments({
        userId,
        status: 'active'
      });
      
      if (activeAlertsCount >= user.alertQuota.limit) {
        return res.status(403).json({
          status: 'error',
          code: 'QUOTA_EXCEEDED',
          message: '免費會員只能設定 1 組價格警報',
          upgradeRequired: true,
          currentQuota: { used: activeAlertsCount, limit: user.alertQuota.limit }
        });
      }
    }
    
    // 檢查技術指標權限
    if (this.isTechnicalIndicatorAlert(req.body.alertType)) {
      if (!user.premiumFeatures.technicalIndicators) {
        return res.status(403).json({
          status: 'error',
          code: 'PREMIUM_FEATURE_REQUIRED',
          message: '技術指標警報需要付費會員',
          upgradeRequired: true
        });
      }
    }
    
    // 繼續原有邏輯...
  }
}
```

**C. 前端會員限制界面**：
```javascript
// 修改 PriceAlertModal.js
class PriceAlertModal {
  async checkUserPermissions() {
    const userInfo = await this.getUserInfo();
    
    if (userInfo.membershipLevel === 'free') {
      this.renderFreeUserLimitations();
    }
  }
  
  renderFreeUserLimitations() {
    const limitationBanner = `
      <div class="membership-limitation">
        <div class="limitation-content">
          <h4>🆓 免費會員限制</h4>
          <p>目前使用配額：${userInfo.alertQuota.used}/${userInfo.alertQuota.limit}</p>
          <p>可設定功能：價格上穿/下穿、漲跌百分比</p>
          <button class="upgrade-btn" onclick="this.showUpgradeModal()">
            ⬆️ 升級付費會員解鎖更多功能
          </button>
        </div>
      </div>
    `;
    
    this.modalContent.insertAdjacentHTML('afterbegin', limitationBanner);
  }
}
```

### 3. 技術指標警報實作

**A. 擴展警報類型**：
```javascript
// 修改 PriceAlert 模型
const priceAlertSchema = {
  alertType: {
    type: String,
    enum: [
      // 免費功能
      'price_above', 'price_below', 'percent_change',
      // 付費功能
      'rsi_above', 'rsi_below',           // RSI 指標
      'macd_bullish', 'macd_bearish',     // MACD 指標  
      'ma_cross_above', 'ma_cross_below', // 移動平均線
      'volume_spike',                     // 成交量異常
      'bollinger_upper', 'bollinger_lower' // 布林通道
    ]
  },
  
  // 技術指標參數
  technicalParams: {
    rsiPeriod: { type: Number, default: 14 },
    rsiThreshold: Number,
    macdFast: { type: Number, default: 12 },
    macdSlow: { type: Number, default: 26 },
    macdSignal: { type: Number, default: 9 },
    maPeriod: { type: Number, default: 20 },
    volumeMultiplier: { type: Number, default: 2.0 }
  }
};
```

**B. 技術指標計算服務**：
```javascript
// 新建 src/services/technical-indicators.service.js
class TechnicalIndicatorsService {
  async calculateRSI(symbol, period = 14) {
    const prices = await this.getHistoricalPrices(symbol, period + 1);
    
    let gains = 0, losses = 0;
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i-1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  }
  
  async calculateMACD(symbol, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const prices = await this.getHistoricalPrices(symbol, slowPeriod + signalPeriod);
    
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    const macdLine = fastEMA - slowEMA;
    
    // 計算 MACD 信號線
    const signalLine = this.calculateEMA([macdLine], signalPeriod);
    const histogram = macdLine - signalLine;
    
    return { macdLine, signalLine, histogram };
  }
  
  // 從快取或 API 取得歷史價格
  async getHistoricalPrices(symbol, count) {
    const cacheKey = `prices_${symbol}_${count}`;
    let prices = await this.cache.get(cacheKey);
    
    if (!prices) {
      prices = await this.binanceService.getKlines(symbol, '1h', count);
      await this.cache.set(cacheKey, prices, 300); // 快取 5 分鐘
    }
    
    return prices.map(k => parseFloat(k[4])); // 收盤價
  }
}
```

**C. 技術指標警報檢查**：
```javascript
// 修改監控服務
class TechnicalAlertChecker {
  async checkTechnicalAlert(alert, currentMarketData) {
    const { alertType, technicalParams } = alert;
    
    switch (alertType) {
      case 'rsi_above':
      case 'rsi_below':
        const rsi = await this.technicalService.calculateRSI(
          alert.symbol, 
          technicalParams.rsiPeriod
        );
        return this.checkRSICondition(rsi, alert);
        
      case 'macd_bullish':
      case 'macd_bearish':
        const macd = await this.technicalService.calculateMACD(
          alert.symbol,
          technicalParams.macdFast,
          technicalParams.macdSlow,
          technicalParams.macdSignal
        );
        return this.checkMACDCondition(macd, alert);
        
      // 其他技術指標...
    }
  }
  
  checkRSICondition(currentRSI, alert) {
    const threshold = alert.technicalParams.rsiThreshold;
    
    if (alert.alertType === 'rsi_above') {
      return currentRSI >= threshold;
    } else {
      return currentRSI <= threshold;
    }
  }
}
```

## 💰 成本分析與效益

### 現有系統成本估算

**24/7 監控成本**：
```
假設場景：
- 100 個活躍用戶，每人平均 3 個警報 = 300 個警報
- 每分鐘檢查 = 每小時 60 次 × 300 警報 = 18,000 次 API 調用/小時
- 每日 = 432,000 次 API 調用
- 每月 = 12,960,000 次 API 調用

雲端成本：
- API Gateway: $3.50 per million calls = $45.36/月
- Lambda 運行時間: 12,960,000 × 100ms = 1,296,000 秒 = $25.92/月
- CloudWatch 日誌: ~$20/月
- 總計：~$91/月 (僅 100 用戶)

隨用戶增長線性增加，1000 用戶約 $910/月
```

### 優化後成本估算

**事件驅動監控成本**：
```
優化場景：
- 僅在用戶活動時檢查
- 平均每用戶每日訪問 10 次市場頁面
- 每次訪問檢查該用戶的警報 = 100 用戶 × 10 次 × 3 警報 = 3,000 次檢查/日
- 每月 = 90,000 次 API 調用

雲端成本：
- API Gateway: $3.50 per million calls = $0.32/月
- Lambda 運行時間: 90,000 × 100ms = 9,000 秒 = $0.18/月
- CloudWatch 日誌: ~$2/月
- 總計：~$2.5/月 (100 用戶)

成本降幅：97.3% (從 $91 降至 $2.5)
```

### 會員制度收益模型

**付費會員定價策略**：
```
免費會員：
- 1 個基礎價格警報
- LINE 通知
- 基本技術分析

付費會員 ($9.99/月)：
- 無限價格警報
- 10+ 技術指標警報
- 優先通知
- 進階圖表功能
- 客製化通知模板

企業會員 ($29.99/月)：
- API 存取權限
- Webhook 整合
- 專屬客服
- 白標解決方案
```

**收益預估**：
```
假設 1000 用戶場景：
- 免費用戶：800 人 (80%)
- 付費用戶：180 人 (18%) × $9.99 = $1,798.2/月
- 企業用戶：20 人 (2%) × $29.99 = $599.8/月
- 總收益：$2,398/月
- 系統成本：~$25/月 (1000 用戶規模)
- 淨利潤：$2,373/月 (94.9% 利潤率)
```

## 🏗️ 技術架構重構計畫

### 第一階段：會員制度基礎 (2天)

**任務 1.1：用戶模型擴展**
```javascript
// 修改現有 User 模型或 Mock 系統
// 檔案：src/controllers/auth.controller.mock.js

class MockUser {
  constructor(data) {
    // 現有欄位...
    this.membershipLevel = data.membershipLevel || 'free';
    this.membershipExpiry = data.membershipExpiry || null;
    this.alertQuota = {
      used: 0,
      limit: data.membershipLevel === 'free' ? 1 : -1 // -1 表示無限制
    };
    this.premiumFeatures = {
      technicalIndicators: data.membershipLevel !== 'free',
      unlimitedAlerts: data.membershipLevel !== 'free',
      prioritySupport: data.membershipLevel === 'enterprise'
    };
  }
}
```

**任務 1.2：警報配額檢查中介軟體**
```javascript
// 新建 src/middleware/membership.middleware.js

const checkAlertQuota = async (req, res, next) => {
  const userId = req.userId;
  const user = await User.findById(userId);
  
  if (user.membershipLevel === 'free') {
    const activeAlerts = await PriceAlert.countDocuments({
      userId,
      status: 'active'
    });
    
    if (activeAlerts >= user.alertQuota.limit) {
      return res.status(403).json({
        status: 'error',
        code: 'QUOTA_EXCEEDED',
        message: '已達免費會員警報上限',
        upgradeRequired: true,
        quota: { used: activeAlerts, limit: user.alertQuota.limit }
      });
    }
  }
  
  next();
};

const checkTechnicalIndicatorPermission = async (req, res, next) => {
  const { alertType } = req.body;
  const technicalTypes = ['rsi_above', 'rsi_below', 'macd_bullish', 'macd_bearish'];
  
  if (technicalTypes.includes(alertType)) {
    const user = await User.findById(req.userId);
    
    if (!user.premiumFeatures.technicalIndicators) {
      return res.status(403).json({
        status: 'error',
        code: 'PREMIUM_FEATURE_REQUIRED',
        message: '技術指標警報需要付費會員',
        upgradeRequired: true
      });
    }
  }
  
  next();
};
```

**任務 1.3：API 路由整合**
```javascript
// 修改 src/routes/notifications.js

// 建立價格警報 - 加入配額檢查
router.post('/alerts', 
  validatePriceAlert,
  checkAlertQuota,
  checkTechnicalIndicatorPermission,
  priceAlertController.createAlert
);
```

### 第二階段：事件驅動監控重構 (3天)

**任務 2.1：新監控服務架構**
```javascript
// 重構 src/services/price-alert-monitor.service.js

class EventDrivenAlertMonitorService {
  constructor() {
    this.activeUserSessions = new Map(); // 追蹤活躍用戶
    this.lastCheckedPrices = new Map();  // 價格快取
    this.checkQueue = new Set();         // 待檢查警報佇列
  }
  
  // 用戶訪問觸發檢查
  async onUserActivity(userId, visitedSymbols = []) {
    const userAlerts = await PriceAlert.find({
      userId,
      status: 'active',
      ...(visitedSymbols.length > 0 && { symbol: { $in: visitedSymbols } })
    });
    
    // 加入檢查佇列
    for (const alert of userAlerts) {
      this.checkQueue.add(alert._id);
    }
    
    // 批量處理
    this.processCheckQueue();
  }
  
  // WebSocket 數據觸發檢查
  async onMarketDataUpdate(symbol, marketData) {
    const affectedAlerts = await PriceAlert.find({
      symbol,
      status: 'active'
    });
    
    for (const alert of affectedAlerts) {
      await this.checkIndividualAlert(alert, marketData);
    }
  }
  
  // 智慧批量處理
  async processCheckQueue() {
    if (this.checkQueue.size === 0) return;
    
    const alertIds = Array.from(this.checkQueue);
    this.checkQueue.clear();
    
    // 按交易對分組以減少 API 調用
    const alertsBySymbol = await this.groupAlertsBySymbol(alertIds);
    
    for (const [symbol, alerts] of alertsBySymbol) {
      await this.checkSymbolAlerts(symbol, alerts);
    }
  }
}
```

**任務 2.2：前端活動監聽整合**
```javascript
// 修改 public/js/components/CurrencyDetailPage.js

class CurrencyDetailPage {
  async loadCurrencyData(symbol) {
    // 現有邏輯...
    
    // 觸發警報檢查
    if (this.isUserLoggedIn()) {
      this.triggerAlertCheck(symbol);
    }
  }
  
  async triggerAlertCheck(symbol) {
    try {
      await fetch('/api/notifications/alerts/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          symbols: [symbol],
          trigger: 'user_activity'
        })
      });
    } catch (error) {
      console.warn('警報檢查觸發失敗:', error);
    }
  }
}
```

**任務 2.3：新的檢查端點**
```javascript
// 新增 src/controllers/price-alert.controller.js 方法

class PriceAlertController {
  // POST /api/notifications/alerts/check
  triggerAlertCheck = asyncErrorHandler(async (req, res) => {
    const userId = req.userId;
    const { symbols, trigger } = req.body;
    
    // 記錄觸發事件
    logger.info('手動觸發警報檢查', {
      userId,
      symbols,
      trigger,
      timestamp: new Date()
    });
    
    // 觸發事件驅動檢查
    const monitorService = getEventDrivenMonitorService();
    await monitorService.onUserActivity(userId, symbols);
    
    res.json({
      status: 'success',
      message: '警報檢查已觸發',
      data: {
        checkedSymbols: symbols,
        trigger
      }
    });
  });
}
```

### 第三階段：技術指標警報系統 (4天)

**任務 3.1：技術指標計算服務**
```javascript
// 新建 src/services/technical-indicators.service.js

class TechnicalIndicatorsService {
  constructor() {
    this.cache = new Map(); // 計算結果快取
    this.cacheTimeout = 5 * 60 * 1000; // 5分鐘快取
  }
  
  async calculateIndicators(symbol, indicators) {
    const results = {};
    
    for (const indicator of indicators) {
      const cacheKey = `${symbol}_${indicator.type}_${JSON.stringify(indicator.params)}`;
      
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          results[indicator.type] = cached.value;
          continue;
        }
      }
      
      let value;
      switch (indicator.type) {
        case 'rsi':
          value = await this.calculateRSI(symbol, indicator.params.period);
          break;
        case 'macd':
          value = await this.calculateMACD(symbol, indicator.params);
          break;
        case 'moving_average':
          value = await this.calculateMA(symbol, indicator.params);
          break;
        case 'bollinger_bands':
          value = await this.calculateBollingerBands(symbol, indicator.params);
          break;
      }
      
      this.cache.set(cacheKey, {
        value,
        timestamp: Date.now()
      });
      
      results[indicator.type] = value;
    }
    
    return results;
  }
}
```

**任務 3.2：擴展警報模型**
```javascript
// 修改 src/models/PriceAlert.js

const priceAlertSchema = new mongoose.Schema({
  // 現有欄位...
  
  // 技術指標配置
  technicalIndicator: {
    type: {
      type: String,
      enum: ['rsi', 'macd', 'moving_average', 'bollinger_bands', 'volume_profile']
    },
    params: {
      // RSI 參數
      rsiPeriod: { type: Number, default: 14 },
      rsiOverbought: { type: Number, default: 70 },
      rsiOversold: { type: Number, default: 30 },
      
      // MACD 參數
      macdFast: { type: Number, default: 12 },
      macdSlow: { type: Number, default: 26 },
      macdSignal: { type: Number, default: 9 },
      
      // 移動平均線參數
      maPeriod: { type: Number, default: 20 },
      maType: { type: String, enum: ['SMA', 'EMA'], default: 'SMA' },
      
      // 布林通道參數
      bbPeriod: { type: Number, default: 20 },
      bbStdDev: { type: Number, default: 2 }
    },
    condition: {
      type: String,
      enum: ['above', 'below', 'cross_above', 'cross_below', 'between']
    },
    threshold: Number,
    thresholdHigh: Number, // 用於 'between' 條件
    thresholdLow: Number
  }
});
```

**任務 3.3：技術指標前端界面**
```javascript
// 修改 public/js/components/PriceAlertModal.js

class PriceAlertModal {
  renderAlertTypeSelection() {
    const userInfo = this.getUserInfo();
    const isPremium = userInfo.membershipLevel !== 'free';
    
    return `
      <div class="alert-type-selection">
        <h4>警報類型</h4>
        
        <!-- 免費功能 -->
        <div class="alert-type-group">
          <h5>🆓 基礎警報</h5>
          <label>
            <input type="radio" name="alertType" value="price_above">
            價格突破 (上穿)
          </label>
          <label>
            <input type="radio" name="alertType" value="price_below">
            價格跌破 (下穿)
          </label>
          <label>
            <input type="radio" name="alertType" value="percent_change">
            漲跌幅度 (%)
          </label>
        </div>
        
        <!-- 付費功能 -->
        <div class="alert-type-group ${!isPremium ? 'premium-locked' : ''}">
          <h5>⭐ 技術指標警報 ${!isPremium ? '(需要付費會員)' : ''}</h5>
          ${this.renderTechnicalIndicatorOptions(isPremium)}
        </div>
      </div>
    `;
  }
  
  renderTechnicalIndicatorOptions(isPremium) {
    const options = [
      { value: 'rsi', label: 'RSI 相對強弱指標', description: 'RSI > 70 超買，RSI < 30 超賣' },
      { value: 'macd', label: 'MACD 指標', description: 'MACD 金叉/死叉信號' },
      { value: 'moving_average', label: '移動平均線', description: '價格穿越移動平均線' },
      { value: 'bollinger_bands', label: '布林通道', description: '價格觸及上軌/下軌' }
    ];
    
    return options.map(option => `
      <label class="${!isPremium ? 'disabled' : ''}">
        <input 
          type="radio" 
          name="alertType" 
          value="${option.value}"
          ${!isPremium ? 'disabled' : ''}
        >
        <div class="option-content">
          <span class="option-label">${option.label}</span>
          <small class="option-description">${option.description}</small>
        </div>
        ${!isPremium ? '<span class="premium-badge">付費</span>' : ''}
      </label>
    `).join('');
  }
}
```

### 第四階段：智慧監控優化 (2天)

**任務 4.1：用戶活躍度追蹤**
```javascript
// 新建 src/services/user-activity-tracker.service.js

class UserActivityTrackerService {
  constructor() {
    this.userSessions = new Map();
    this.activityWindow = 30 * 60 * 1000; // 30分鐘活躍視窗
  }
  
  recordActivity(userId, activityType, data = {}) {
    const now = Date.now();
    
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        firstSeen: now,
        lastSeen: now,
        activities: [],
        alertCheckRequests: 0
      });
    }
    
    const session = this.userSessions.get(userId);
    session.lastSeen = now;
    session.activities.push({
      type: activityType,
      timestamp: now,
      data
    });
    
    // 清理舊活動記錄 (只保留 1 小時)
    const oneHourAgo = now - 60 * 60 * 1000;
    session.activities = session.activities.filter(a => a.timestamp > oneHourAgo);
  }
  
  getUserActivityLevel(userId) {
    const session = this.userSessions.get(userId);
    if (!session) return 'inactive';
    
    const now = Date.now();
    const timeSinceLastActivity = now - session.lastSeen;
    
    if (timeSinceLastActivity < 5 * 60 * 1000) return 'very_active';    // 5分鐘
    if (timeSinceLastActivity < 30 * 60 * 1000) return 'active';        // 30分鐘
    if (timeSinceLastActivity < 24 * 60 * 60 * 1000) return 'moderate'; // 1天
    
    return 'inactive';
  }
  
  getRecommendedCheckInterval(userId) {
    const activityLevel = this.getUserActivityLevel(userId);
    
    switch (activityLevel) {
      case 'very_active': return 60;      // 1分鐘
      case 'active': return 300;          // 5分鐘
      case 'moderate': return 1800;       // 30分鐘
      case 'inactive': return -1;         // 暫停檢查
      default: return 3600;               // 1小時
    }
  }
}
```

**任務 4.2：快取優化策略**
```javascript
// 修改監控服務以支援多層快取

class OptimizedMonitoringService {
  constructor() {
    this.priceCache = new Map();        // L1: 價格快取
    this.indicatorCache = new Map();    // L2: 技術指標快取
    this.alertResultCache = new Map();  // L3: 警報結果快取
  }
  
  async getMarketData(symbol) {
    const cacheKey = `price_${symbol}`;
    
    // 檢查快取
    if (this.priceCache.has(cacheKey)) {
      const cached = this.priceCache.get(cacheKey);
      const age = Date.now() - cached.timestamp;
      
      // 根據市場活躍度調整快取時間
      const maxAge = this.getMarketDataCacheTime(symbol);
      
      if (age < maxAge) {
        return cached.data;
      }
    }
    
    // 取得新數據
    const marketData = await this.binanceService.getCurrentPrice(symbol);
    
    // 更新快取
    this.priceCache.set(cacheKey, {
      data: marketData,
      timestamp: Date.now()
    });
    
    return marketData;
  }
  
  getMarketDataCacheTime(symbol) {
    // 主流幣種快取時間較短
    const majorCoins = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
    
    if (majorCoins.includes(symbol)) {
      return 30 * 1000; // 30秒
    }
    
    return 2 * 60 * 1000; // 2分鐘
  }
}
```

### 第五階段：前端整合優化 (3天)

**任務 5.1：會員升級界面**
```javascript
// 新建 public/js/components/MembershipUpgradeModal.js

class MembershipUpgradeModal {
  constructor() {
    this.currentPlan = 'free';
    this.modalElement = null;
  }
  
  show(triggerReason = 'quota_exceeded') {
    this.modalElement = this.createModal(triggerReason);
    document.body.appendChild(this.modalElement);
    this.modalElement.style.display = 'block';
  }
  
  createModal(triggerReason) {
    const modal = document.createElement('div');
    modal.className = 'membership-upgrade-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>⬆️ 升級付費會員</h2>
          <button class="close-btn" onclick="this.hide()">&times;</button>
        </div>
        
        <div class="modal-body">
          ${this.renderTriggerMessage(triggerReason)}
          ${this.renderPlanComparison()}
          ${this.renderUpgradeOptions()}
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" onclick="this.hide()">稍後再說</button>
          <button class="btn-primary" onclick="this.startUpgrade()">立即升級</button>
        </div>
      </div>
    `;
    
    return modal;
  }
  
  renderTriggerMessage(reason) {
    const messages = {
      quota_exceeded: {
        icon: '⚠️',
        title: '警報配額已滿',
        description: '免費會員只能設定 1 組價格警報。升級後可享受無限制警報功能。'
      },
      technical_indicators: {
        icon: '📊',
        title: '技術指標需要付費會員',
        description: 'RSI、MACD 等技術指標警報為付費會員專屬功能。'
      },
      advanced_features: {
        icon: '⭐',
        title: '解鎖進階功能',
        description: '升級後可享受更多進階功能和優先客服支援。'
      }
    };
    
    const msg = messages[reason] || messages.quota_exceeded;
    
    return `
      <div class="trigger-message">
        <div class="message-icon">${msg.icon}</div>
        <div class="message-content">
          <h3>${msg.title}</h3>
          <p>${msg.description}</p>
        </div>
      </div>
    `;
  }
  
  renderPlanComparison() {
    return `
      <div class="plan-comparison">
        <div class="plan-card current">
          <h4>🆓 免費會員</h4>
          <div class="price">$0/月</div>
          <ul class="features">
            <li>✅ 1 組價格警報</li>
            <li>✅ LINE 通知</li>
            <li>✅ 基本圖表</li>
            <li>❌ 技術指標警報</li>
            <li>❌ 無限警報</li>
            <li>❌ 優先客服</li>
          </ul>
        </div>
        
        <div class="plan-card recommended">
          <div class="plan-badge">推薦</div>
          <h4>⭐ 付費會員</h4>
          <div class="price">$9.99/月</div>
          <ul class="features">
            <li>✅ 無限價格警報</li>
            <li>✅ 所有技術指標</li>
            <li>✅ 客製化通知</li>
            <li>✅ 進階圖表功能</li>
            <li>✅ 優先客服</li>
            <li>✅ API 存取權限</li>
          </ul>
        </div>
      </div>
    `;
  }
}
```

**任務 5.2：智慧警報設定指引**
```javascript
// 修改 PriceAlertModal 加入智慧建議

class SmartAlertGuide {
  generateSmartSuggestions(symbol, currentPrice, userHistory) {
    const suggestions = [];
    
    // 基於歷史價格的建議
    if (userHistory.averageVolatility > 0.05) {
      suggestions.push({
        type: 'price_above',
        value: currentPrice * 1.05,
        reason: `基於 ${symbol} 的歷史波動度，建議設定 5% 上漲警報`
      });
    }
    
    // 基於技術分析的建議
    if (userHistory.rsiData && userHistory.rsiData.current < 30) {
      suggestions.push({
        type: 'rsi_above',
        value: 50,
        reason: '當前 RSI 處於超賣區域，建議設定 RSI 回升警報'
      });
    }
    
    return suggestions;
  }
  
  renderSmartSuggestions(symbol, currentPrice) {
    return `
      <div class="smart-suggestions">
        <h4>💡 智慧建議</h4>
        <div class="suggestion-cards">
          <div class="suggestion-card" onclick="this.applySuggestion('price_above', ${currentPrice * 1.05})">
            <div class="suggestion-icon">📈</div>
            <div class="suggestion-content">
              <span class="suggestion-title">5% 上漲警報</span>
              <span class="suggestion-value">$${(currentPrice * 1.05).toFixed(2)}</span>
              <small class="suggestion-reason">基於歷史波動度建議</small>
            </div>
          </div>
          
          <div class="suggestion-card" onclick="this.applySuggestion('price_below', ${currentPrice * 0.95})">
            <div class="suggestion-icon">📉</div>
            <div class="suggestion-content">
              <span class="suggestion-title">5% 下跌警報</span>
              <span class="suggestion-value">$${(currentPrice * 0.95).toFixed(2)}</span>
              <small class="suggestion-reason">風險控制建議</small>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
```

## 📋 實作時程與里程碑

### 總開發時程：14 天

**第一階段：會員制度基礎 (Day 1-2)**
- ✅ Day 1：用戶模型擴展、配額檢查中介軟體
- ✅ Day 2：API 路由整合、權限驗證測試

**第二階段：事件驅動監控 (Day 3-5)**
- ✅ Day 3：重構監控服務架構
- ✅ Day 4：前端活動監聽、新檢查端點
- ✅ Day 5：批量處理優化、測試整合

**第三階段：技術指標系統 (Day 6-9)**
- ✅ Day 6：技術指標計算服務
- ✅ Day 7：警報模型擴展
- ✅ Day 8：技術指標前端界面
- ✅ Day 9：整合測試、除錯優化

**第四階段：智慧監控優化 (Day 10-11)**
- ✅ Day 10：用戶活躍度追蹤、智慧間隔
- ✅ Day 11：多層快取策略、效能優化

**第五階段：前端整合 (Day 12-14)**
- ✅ Day 12：會員升級界面
- ✅ Day 13：智慧警報建議
- ✅ Day 14：最終測試、效能調整

### 里程碑驗收標準

**里程碑 1 (Day 2)：會員制度**
- [ ] 免費用戶只能創建 1 個警報
- [ ] 技術指標警報需要付費會員
- [ ] 前端顯示會員狀態和限制

**里程碑 2 (Day 5)：事件驅動監控**
- [ ] 停用 24/7 定時監控
- [ ] 用戶訪問時觸發警報檢查
- [ ] API 調用次數減少 90% 以上

**里程碑 3 (Day 9)：技術指標**
- [ ] 支援 RSI、MACD、移動平均線、布林通道
- [ ] 技術指標計算正確性驗證
- [ ] 付費會員可創建技術指標警報

**里程碑 4 (Day 11)：智慧優化**
- [ ] 根據用戶活躍度調整檢查間隔
- [ ] 多層快取機制運作正常
- [ ] 系統資源使用量最佳化

**里程碑 5 (Day 14)：完整整合**
- [ ] 會員升級流程完整
- [ ] 智慧建議功能正常
- [ ] 端到端測試通過

## 📊 測試策略

### 單元測試

**會員制度測試**：
```javascript
// tests/membership.test.js

describe('會員制度限制', () => {
  test('免費用戶只能創建 1 個警報', async () => {
    const freeUser = { membershipLevel: 'free', alertQuota: { limit: 1 } };
    
    // 創建第一個警報應該成功
    const firstAlert = await createAlert(freeUser.id, alertData1);
    expect(firstAlert.status).toBe('success');
    
    // 創建第二個警報應該失敗
    const secondAlert = await createAlert(freeUser.id, alertData2);
    expect(secondAlert.status).toBe('error');
    expect(secondAlert.code).toBe('QUOTA_EXCEEDED');
  });
  
  test('付費用戶可以創建無限警報', async () => {
    const premiumUser = { membershipLevel: 'premium' };
    
    for (let i = 0; i < 10; i++) {
      const alert = await createAlert(premiumUser.id, alertData);
      expect(alert.status).toBe('success');
    }
  });
});
```

**事件驅動監控測試**：
```javascript
// tests/event-driven-monitoring.test.js

describe('事件驅動監控', () => {
  test('用戶訪問時觸發警報檢查', async () => {
    const monitorService = new EventDrivenAlertMonitorService();
    const spy = jest.spyOn(monitorService, 'onUserActivity');
    
    // 模擬用戶訪問
    await monitorService.onUserActivity('user123', ['BTCUSDT']);
    
    expect(spy).toHaveBeenCalledWith('user123', ['BTCUSDT']);
  });
  
  test('WebSocket 數據觸發相關警報檢查', async () => {
    const marketData = { symbol: 'BTCUSDT', price: 50000 };
    const checkSpy = jest.spyOn(monitorService, 'checkSymbolAlerts');
    
    await monitorService.onMarketDataUpdate('BTCUSDT', marketData);
    
    expect(checkSpy).toHaveBeenCalledWith('BTCUSDT', expect.any(Array));
  });
});
```

### 整合測試

**技術指標計算測試**：
```javascript
// tests/technical-indicators.test.js

describe('技術指標計算', () => {
  test('RSI 計算正確性', async () => {
    const mockPrices = [44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83];
    const rsi = await calculateRSI(mockPrices, 6);
    
    expect(rsi).toBeCloseTo(70.53, 1);
  });
  
  test('MACD 計算正確性', async () => {
    const mockPrices = generateMockPriceData(50);
    const macd = await calculateMACD(mockPrices, 12, 26, 9);
    
    expect(macd).toHaveProperty('macdLine');
    expect(macd).toHaveProperty('signalLine');
    expect(macd).toHaveProperty('histogram');
  });
});
```

### 效能測試

**監控效能測試**：
```javascript
// tests/performance.test.js

describe('監控系統效能', () => {
  test('1000 個警報檢查在 5 秒內完成', async () => {
    const alerts = generateMockAlerts(1000);
    const startTime = Date.now();
    
    await monitorService.checkAllAlerts(alerts);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000);
  });
  
  test('API 調用次數減少 90%', async () => {
    const apiCallCounter = new APICallCounter();
    
    // 模擬舊系統 24/7 監控
    const oldSystemCalls = await simulateOldSystemMonitoring(24);
    
    // 模擬新系統事件驅動監控
    const newSystemCalls = await simulateEventDrivenMonitoring(24);
    
    const reduction = (oldSystemCalls - newSystemCalls) / oldSystemCalls;
    expect(reduction).toBeGreaterThan(0.9);
  });
});
```

### 端到端測試

**完整用戶流程測試**：
```javascript
// tests/e2e/user-journey.test.js

describe('完整用戶流程', () => {
  test('免費用戶升級付費會員流程', async () => {
    // 1. 免費用戶登入
    await loginAsUser('free_user@example.com');
    
    // 2. 嘗試創建第二個警報
    await createAlert({ symbol: 'BTCUSDT', type: 'price_above' });
    
    // 3. 應該看到配額限制提示
    expect(await getQuotaLimitModal()).toBeVisible();
    
    // 4. 點擊升級按鈕
    await clickUpgradeButton();
    
    // 5. 應該看到會員比較頁面
    expect(await getMembershipUpgradeModal()).toBeVisible();
    
    // 6. 選擇付費方案
    await selectPremiumPlan();
    
    // 7. 完成升級流程
    await completePurchase();
    
    // 8. 確認可以創建更多警報
    const alert = await createAlert({ symbol: 'ETHUSDT', type: 'rsi_above' });
    expect(alert.status).toBe('success');
  });
});
```

## 🔧 部署與維護

### 部署檢查清單

**環境變數設定**：
```bash
# 新增會員制度相關配置
MEMBERSHIP_FREE_ALERT_LIMIT=1
MEMBERSHIP_PREMIUM_PRICE_MONTHLY=9.99
MEMBERSHIP_ENTERPRISE_PRICE_MONTHLY=29.99

# 監控優化配置
MONITORING_MODE=event_driven  # 改為事件驅動模式
CACHE_TECHNICAL_INDICATORS_TTL=300  # 技術指標快取 5 分鐘
USER_ACTIVITY_WINDOW=1800  # 用戶活躍視窗 30 分鐘

# 效能優化配置
PRICE_CACHE_TTL=30  # 價格快取 30 秒
BATCH_CHECK_SIZE=50  # 批量檢查大小
MAX_CONCURRENT_CHECKS=10  # 最大並發檢查數
```

**資料庫遷移**：
```sql
-- 添加會員相關欄位
ALTER TABLE users ADD COLUMN membership_level VARCHAR(20) DEFAULT 'free';
ALTER TABLE users ADD COLUMN membership_expiry TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN alert_quota_used INT DEFAULT 0;
ALTER TABLE users ADD COLUMN alert_quota_limit INT DEFAULT 1;

-- 添加技術指標相關欄位
ALTER TABLE price_alerts ADD COLUMN technical_indicator_type VARCHAR(50);
ALTER TABLE price_alerts ADD COLUMN technical_params JSON;
ALTER TABLE price_alerts ADD COLUMN technical_condition VARCHAR(20);
ALTER TABLE price_alerts ADD COLUMN technical_threshold DECIMAL(10,4);

-- 創建用戶活動追蹤表
CREATE TABLE user_activities (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255) NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  activity_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id_time (user_id, created_at)
);
```

**服務部署步驟**：
```bash
# 1. 備份資料庫
mysqldump nexustrade > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 停止舊監控服務
pm2 stop price-alert-monitor

# 3. 部署新代碼
git pull origin main
npm install
npm run build

# 4. 執行資料庫遷移
npm run migrate

# 5. 啟動新服務
pm2 start ecosystem.config.js --only nexustrade-api
pm2 start ecosystem.config.js --only event-driven-monitor

# 6. 驗證服務狀態
pm2 status
curl http://localhost:3000/api/health
```

### 監控與警報

**系統監控指標**：
```javascript
// 新增系統監控端點
// GET /api/system/metrics

{
  "monitoring": {
    "mode": "event_driven",
    "active_users": 150,
    "alerts_checked_today": 1200,
    "api_calls_saved": "89.5%",
    "average_response_time": "145ms"
  },
  "membership": {
    "free_users": 120,
    "premium_users": 25,
    "enterprise_users": 5,
    "conversion_rate": "20%"
  },
  "performance": {
    "cache_hit_rate": "94.2%",
    "technical_indicator_calculations": 450,
    "notification_success_rate": "98.7%"
  }
}
```

**警報規則設定**：
```yaml
# CloudWatch/Grafana 警報配置
alerts:
  - name: "API調用次數異常增加"
    condition: "api_calls_per_hour > 10000"
    action: "發送 Slack 通知"
    
  - name: "會員轉換率下降"
    condition: "daily_conversion_rate < 15%"
    action: "通知產品團隊"
    
  - name: "技術指標計算失敗率高"
    condition: "technical_calculation_error_rate > 5%"
    action: "發送緊急通知"
```

### 維護程序

**每日維護任務**：
```bash
#!/bin/bash
# daily_maintenance.sh

# 1. 清理過期的價格快取
redis-cli EVAL "
  for i, key in ipairs(redis.call('KEYS', 'price_*')) do
    if redis.call('TTL', key) == -1 then
      redis.call('DEL', key)
    end
  end
" 0

# 2. 清理用戶活動記錄 (保留 7 天)
mysql -e "DELETE FROM user_activities WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);"

# 3. 統計會員轉換數據
node scripts/generate_daily_membership_report.js

# 4. 檢查系統健康狀態
curl -f http://localhost:3000/api/health || exit 1
```

**每週維護任務**：
```bash
#!/bin/bash
# weekly_maintenance.sh

# 1. 分析用戶使用模式
node scripts/analyze_user_patterns.js

# 2. 優化技術指標快取策略
node scripts/optimize_cache_strategy.js

# 3. 產生效能報告
node scripts/generate_performance_report.js

# 4. 檢查會員帳單狀態
node scripts/check_membership_billing.js
```

## 📈 成功指標與 KPI

### 技術指標

**成本效益指標**：
- [ ] API 調用次數減少 ≥ 90%
- [ ] 雲端運行成本降低 ≥ 85%
- [ ] 系統回應時間 ≤ 200ms
- [ ] 監控準確性 ≥ 99.5%

**效能指標**：
- [ ] 技術指標計算延遲 ≤ 2 秒
- [ ] 快取命中率 ≥ 90%
- [ ] 通知發送成功率 ≥ 98%
- [ ] 系統可用性 ≥ 99.9%

### 業務指標

**會員轉換指標**：
- [ ] 免費到付費轉換率 ≥ 15%
- [ ] 付費會員留存率 ≥ 85%
- [ ] 平均每用戶收益 (ARPU) ≥ $8
- [ ] 客戶終身價值 (LTV) ≥ $120

**用戶滿意度指標**：
- [ ] 警報精準度滿意度 ≥ 90%
- [ ] 功能豐富度滿意度 ≥ 85%
- [ ] 客服回應時間 ≤ 4 小時
- [ ] 用戶推薦意願 (NPS) ≥ 70

### 產品指標

**功能使用指標**：
- [ ] 技術指標警報使用率 ≥ 60% (付費用戶)
- [ ] 智慧建議採用率 ≥ 40%
- [ ] 警報設定完成率 ≥ 95%
- [ ] 升級流程完成率 ≥ 80%

## 🎯 結論與下一步

### 專案價值總結

**✅ 解決的核心問題**：
1. **成本控制**：將雲端運行成本從每月 $500+ 降至 $25，節省 95%
2. **商業模式**：建立可持續的會員制收益，預估每月 $2000+ 收入
3. **功能差異化**：免費基礎功能 + 付費進階功能的明確區分
4. **技術債務**：解決現有系統的效能和重複問題

**✅ 技術創新點**：
1. **事件驅動監控**：從 Push 改為 Pull，根本性降低成本
2. **智慧頻率調整**：根據用戶活躍度動態調整監控間隔
3. **多層快取策略**：價格、技術指標、結果三層快取優化
4. **會員制整合**：與現有認證系統無縫整合

### 預期效益實現時間

**短期效益 (1-3 個月)**：
- 成本降低 90% 以上
- 會員制功能上線
- 基礎技術指標可用

**中期效益 (3-6 個月)**：
- 會員轉換率達到 15%
- 付費用戶達到 100+
- 月收入突破 $1000

**長期效益 (6-12 個月)**：
- 平台用戶達到 5000+
- 月收入突破 $10000
- 技術指標功能完善

### 風險評估與緩解

**技術風險**：
- **風險**：事件驅動監控可能遺漏價格變化
- **緩解**：結合 WebSocket 實時數據和用戶活動雙重觸發

**商業風險**：
- **風險**：用戶對付費功能接受度不高
- **緩解**：提供 7 天免費試用和漸進式功能解鎖

**競爭風險**：
- **風險**：競爭對手提供類似免費功能
- **緩解**：持續創新技術指標演算法和用戶體驗

### 下一階段規劃

**Phase 6：進階功能開發 (Month 2-3)**
- 自訂技術指標組合警報
- 量化策略回測功能
- 組合追蹤和再平衡警報

**Phase 7：API 和整合 (Month 3-4)**
- 開放 API 給企業用戶
- TradingView 指標同步
- 第三方交易所整合

**Phase 8：AI 強化 (Month 4-6)**
- 機器學習預測模型
- 智慧警報建議優化
- 市場情緒分析整合

---

**文件版本：v2.0.0**  
**建立日期：2025-01-01**  
**最後更新：2025-01-01**  
**負責團隊：NexusTrade 開發團隊**  
**預估完成時間：14 天**  
**預期成本節省：95%**  
**預期月收入：$2000+**