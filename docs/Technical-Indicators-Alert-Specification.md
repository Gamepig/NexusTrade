# NexusTrade 技術指標警報系統實作規格

## 📋 技術指標警報概述

### 功能定位

**付費會員專屬功能**：
- 免費會員：僅支援基礎價格警報 (上穿/下穿、漲跌%)
- 付費會員：解鎖技術指標警報 (RSI、MACD、移動平均線、布林通道等)
- 企業會員：自訂技術指標組合警報

### 核心價值

1. **差異化競爭優勢**：市場上少有平台提供完整技術指標警報
2. **付費轉換驅動**：技術分析用戶轉換率通常較高
3. **專業交易支援**：滿足進階交易者需求
4. **營收增長點**：預估可提升 30-50% 付費轉換率

## 🎯 支援的技術指標類型

### 第一階段：基礎技術指標 (MVP)

基於現有 `ai-currency-analysis.service.js` 的計算能力，實作以下指標：

**1. RSI (相對強弱指標)**
```javascript
alertTypes: [
  'rsi_above',     // RSI 突破指定數值
  'rsi_below',     // RSI 跌破指定數值
  'rsi_overbought', // RSI 進入超買區 (>70)
  'rsi_oversold'   // RSI 進入超賣區 (<30)
]

thresholds: {
  overbought: 70,  // 可自訂 60-80
  oversold: 30,    // 可自訂 20-40
  custom: Number   // 用戶自訂閾值
}
```

**2. MACD (指數平滑移動平均收斂發散)**
```javascript
alertTypes: [
  'macd_bullish_crossover',  // MACD 金叉 (向上穿越信號線)
  'macd_bearish_crossover',  // MACD 死叉 (向下穿越信號線)
  'macd_above_zero',         // MACD 上穿零軸
  'macd_below_zero',         // MACD 下穿零軸
  'macd_histogram_bullish',  // 柱狀圖轉為正值
  'macd_histogram_bearish'   // 柱狀圖轉為負值
]

parameters: {
  fastPeriod: 12,   // 快線週期
  slowPeriod: 26,   // 慢線週期
  signalPeriod: 9   // 信號線週期
}
```

**3. 移動平均線 (Moving Averages)**
```javascript
alertTypes: [
  'ma_cross_above',    // 價格上穿移動平均線
  'ma_cross_below',    // 價格下穿移動平均線
  'ma_golden_cross',   // 短期MA上穿長期MA (黃金交叉)
  'ma_death_cross',    // 短期MA下穿長期MA (死亡交叉)
  'ma_support_bounce', // 價格在MA線附近獲得支撐
  'ma_resistance_reject' // 價格在MA線附近遇到阻力
]

parameters: {
  type: 'SMA' | 'EMA',  // 簡單移動平均或指數移動平均
  period: [7, 20, 50, 200], // 常用週期
  tolerance: 0.5        // 支撐/阻力容錯百分比
}
```

**4. 布林通道 (Bollinger Bands)**
```javascript
alertTypes: [
  'bb_upper_touch',      // 觸及上軌
  'bb_lower_touch',      // 觸及下軌
  'bb_squeeze',          // 帶寬收窄 (低波動性)
  'bb_expansion',        // 帶寬擴張 (高波動性)
  'bb_middle_cross',     // 穿越中軌線
  'bb_bandwidth_alert'   // 帶寬達到特定水平
]

parameters: {
  period: 20,           // 移動平均週期
  stdDev: 2.0,         // 標準差倍數
  bandwidth_threshold: 0.1 // 帶寬閾值
}
```

**5. 威廉指標 (Williams %R)**
```javascript
alertTypes: [
  'williams_overbought', // 威廉指標超買 (>-20)
  'williams_oversold',   // 威廉指標超賣 (<-80)
  'williams_above',      // 威廉指標突破指定值
  'williams_below'       // 威廉指標跌破指定值
]

parameters: {
  period: 14,           // 計算週期
  overbought: -20,      // 超買線
  oversold: -80         // 超賣線
}
```

### 第二階段：進階技術指標

**6. 隨機指標 (Stochastic Oscillator)**
```javascript
alertTypes: [
  'stoch_k_above',      // %K 線突破指定值
  'stoch_k_below',      // %K 線跌破指定值
  'stoch_bullish_div',  // 與價格產生牛市背離
  'stoch_bearish_div'   // 與價格產生熊市背離
]
```

**7. 成交量指標**
```javascript
alertTypes: [
  'volume_spike',       // 成交量異常放大
  'volume_dry_up',      // 成交量異常縮小
  'volume_ma_cross'     // 成交量穿越移動平均
]
```

**8. 動量指標**
```javascript
alertTypes: [
  'momentum_bullish',   // 動量轉為看漲
  'momentum_bearish',   // 動量轉為看跌
  'momentum_divergence' // 動量背離
]
```

## 🏗️ 技術架構設計

### 1. 資料模型擴展

**擴展 PriceAlert 模型** (`src/models/PriceAlert.js`)：

```javascript
// 新增技術指標相關欄位
const priceAlertSchema = new mongoose.Schema({
  // 現有欄位...
  
  // 技術指標配置
  technicalIndicator: {
    // 指標類型
    type: {
      type: String,
      enum: [
        'rsi', 'macd', 'moving_average', 'bollinger_bands', 
        'williams_r', 'stochastic', 'volume', 'momentum'
      ]
    },
    
    // 警報條件
    condition: {
      type: String,
      enum: [
        'above', 'below', 'cross_above', 'cross_below',
        'overbought', 'oversold', 'bullish_crossover', 'bearish_crossover',
        'golden_cross', 'death_cross', 'squeeze', 'expansion',
        'support_bounce', 'resistance_reject', 'divergence'
      ]
    },
    
    // 閾值設定
    threshold: {
      value: Number,        // 主要閾值
      valueHigh: Number,    // 範圍閾值上限
      valueLow: Number,     // 範圍閾值下限
      tolerance: {          // 容錯設定
        type: Number,
        default: 0.5,
        min: 0,
        max: 5
      }
    },
    
    // 技術指標參數
    parameters: {
      // RSI 參數
      rsiPeriod: { type: Number, default: 14, min: 5, max: 50 },
      
      // MACD 參數
      macdFast: { type: Number, default: 12, min: 5, max: 50 },
      macdSlow: { type: Number, default: 26, min: 15, max: 100 },
      macdSignal: { type: Number, default: 9, min: 5, max: 25 },
      
      // 移動平均線參數
      maPeriod: { type: Number, default: 20, min: 5, max: 200 },
      maType: { type: String, enum: ['SMA', 'EMA'], default: 'SMA' },
      
      // 布林通道參數
      bbPeriod: { type: Number, default: 20, min: 10, max: 50 },
      bbStdDev: { type: Number, default: 2.0, min: 1.0, max: 3.0 },
      
      // 威廉指標參數
      williamsPeriod: { type: Number, default: 14, min: 5, max: 50 },
      
      // 隨機指標參數
      stochKPeriod: { type: Number, default: 14, min: 5, max: 50 },
      stochDPeriod: { type: Number, default: 3, min: 1, max: 10 },
      
      // 成交量參數
      volumeMultiplier: { type: Number, default: 2.0, min: 1.5, max: 5.0 },
      volumePeriod: { type: Number, default: 20, min: 10, max: 50 }
    },
    
    // 指標計算結果快取
    lastCalculation: {
      value: Number,
      timestamp: Date,
      marketData: Object,   // 計算時的市場數據
      isValid: { type: Boolean, default: true }
    }
  },
  
  // 背離檢測設定 (進階功能)
  divergenceDetection: {
    enabled: { type: Boolean, default: false },
    lookbackPeriod: { type: Number, default: 10, min: 5, max: 50 },
    sensitivity: { type: Number, default: 0.7, min: 0.1, max: 1.0 }
  }
});

// 虛擬欄位：判斷是否為技術指標警報
priceAlertSchema.virtual('isTechnicalIndicator').get(function() {
  return !!this.technicalIndicator?.type;
});

// 靜態方法：查找特定技術指標的警報
priceAlertSchema.statics.findByIndicator = function(indicator, symbol = null) {
  const query = {
    'technicalIndicator.type': indicator,
    status: 'active',
    enabled: true
  };
  
  if (symbol) {
    query.symbol = symbol.toUpperCase();
  }
  
  return this.find(query);
};
```

### 2. 技術指標計算服務

**新建專用技術指標服務** (`src/services/technical-indicators.service.js`)：

```javascript
/**
 * 技術指標計算服務
 * 
 * 專門處理技術指標的計算、快取和優化
 * 基於現有 ai-currency-analysis.service.js 的計算能力
 */
class TechnicalIndicatorsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分鐘快取
    this.calculationQueue = new Map();  // 防止重複計算
  }
  
  /**
   * 計算指定技術指標
   */
  async calculateIndicator(symbol, indicatorType, parameters = {}) {
    const cacheKey = this.generateCacheKey(symbol, indicatorType, parameters);
    
    // 檢查快取
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.result;
      }
    }
    
    // 防止重複計算
    if (this.calculationQueue.has(cacheKey)) {
      return await this.calculationQueue.get(cacheKey);
    }
    
    // 開始計算
    const calculationPromise = this.performCalculation(symbol, indicatorType, parameters);
    this.calculationQueue.set(cacheKey, calculationPromise);
    
    try {
      const result = await calculationPromise;
      
      // 快取結果
      this.cache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
      
      return result;
      
    } finally {
      this.calculationQueue.delete(cacheKey);
    }
  }
  
  /**
   * 執行實際計算
   */
  async performCalculation(symbol, indicatorType, parameters) {
    try {
      // 取得市場數據
      const marketData = await this.getMarketData(symbol, parameters);
      
      switch (indicatorType) {
        case 'rsi':
          return this.calculateRSI(marketData, parameters);
          
        case 'macd':
          return this.calculateMACD(marketData, parameters);
          
        case 'moving_average':
          return this.calculateMovingAverage(marketData, parameters);
          
        case 'bollinger_bands':
          return this.calculateBollingerBands(marketData, parameters);
          
        case 'williams_r':
          return this.calculateWilliamsR(marketData, parameters);
          
        case 'stochastic':
          return this.calculateStochastic(marketData, parameters);
          
        case 'volume':
          return this.calculateVolumeIndicators(marketData, parameters);
          
        case 'momentum':
          return this.calculateMomentum(marketData, parameters);
          
        default:
          throw new Error(`不支援的技術指標: ${indicatorType}`);
      }
      
    } catch (error) {
      logger.error(`計算 ${symbol} 的 ${indicatorType} 指標失敗:`, error.message);
      throw error;
    }
  }
  
  /**
   * RSI 計算 (基於現有實作)
   */
  calculateRSI(marketData, params = {}) {
    const { period = 14 } = params;
    const prices = marketData.closes;
    
    if (prices.length < period + 1) {
      throw new Error(`RSI 計算需要至少 ${period + 1} 個數據點`);
    }
    
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const avgGain = gains.slice(-period).reduce((sum, val) => sum + val, 0) / period;
    const avgLoss = losses.slice(-period).reduce((sum, val) => sum + val, 0) / period;
    
    if (avgLoss === 0) return { value: 100, signal: 'extreme_overbought' };
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return {
      value: Math.round(rsi * 100) / 100,
      signal: this.interpretRSI(rsi),
      overbought: rsi > 70,
      oversold: rsi < 30,
      timestamp: Date.now()
    };
  }
  
  /**
   * MACD 計算 (增強版)
   */
  calculateMACD(marketData, params = {}) {
    const { fastPeriod = 12, slowPeriod = 26, signalPeriod = 9 } = params;
    const prices = marketData.closes;
    
    if (prices.length < slowPeriod + signalPeriod) {
      throw new Error(`MACD 計算需要至少 ${slowPeriod + signalPeriod} 個數據點`);
    }
    
    // 計算 EMA
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    // MACD 線
    const macdLine = fastEMA - slowEMA;
    
    // 信號線 (MACD 的 EMA)
    const macdHistory = [macdLine]; // 實際應用需要歷史數據
    const signalLine = this.calculateEMA(macdHistory, signalPeriod);
    
    // 柱狀圖
    const histogram = macdLine - signalLine;
    
    return {
      macdLine: Math.round(macdLine * 10000) / 10000,
      signalLine: Math.round(signalLine * 10000) / 10000,
      histogram: Math.round(histogram * 10000) / 10000,
      signal: this.interpretMACD(macdLine, signalLine, histogram),
      bullishCrossover: macdLine > signalLine && histogram > 0,
      bearishCrossover: macdLine < signalLine && histogram < 0,
      timestamp: Date.now()
    };
  }
  
  /**
   * 移動平均線計算
   */
  calculateMovingAverage(marketData, params = {}) {
    const { period = 20, type = 'SMA' } = params;
    const prices = marketData.closes;
    
    if (prices.length < period) {
      throw new Error(`移動平均線計算需要至少 ${period} 個數據點`);
    }
    
    let ma;
    if (type === 'SMA') {
      ma = this.calculateSMA(prices, period);
    } else if (type === 'EMA') {
      ma = this.calculateEMA(prices, period);
    } else {
      throw new Error(`不支援的移動平均線類型: ${type}`);
    }
    
    const currentPrice = prices[prices.length - 1];
    const pricePosition = currentPrice > ma ? 'above' : 'below';
    
    return {
      value: Math.round(ma * 100) / 100,
      type,
      period,
      currentPrice,
      pricePosition,
      signal: this.interpretMAPosition(currentPrice, ma),
      distancePercent: Math.round(((currentPrice - ma) / ma * 100) * 100) / 100,
      timestamp: Date.now()
    };
  }
  
  /**
   * 布林通道計算
   */
  calculateBollingerBands(marketData, params = {}) {
    const { period = 20, stdDev = 2.0 } = params;
    const prices = marketData.closes;
    
    if (prices.length < period) {
      throw new Error(`布林通道計算需要至少 ${period} 個數據點`);
    }
    
    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    const upperBand = sma + (standardDeviation * stdDev);
    const lowerBand = sma - (standardDeviation * stdDev);
    const bandwidth = (upperBand - lowerBand) / sma * 100;
    
    const currentPrice = prices[prices.length - 1];
    const position = this.getBollingerPosition(currentPrice, { upper: upperBand, middle: sma, lower: lowerBand });
    
    return {
      upper: Math.round(upperBand * 100) / 100,
      middle: Math.round(sma * 100) / 100,
      lower: Math.round(lowerBand * 100) / 100,
      bandwidth: Math.round(bandwidth * 100) / 100,
      currentPrice,
      position,
      signal: this.interpretBollingerPosition(position, bandwidth),
      percentB: Math.round(((currentPrice - lowerBand) / (upperBand - lowerBand)) * 10000) / 100,
      timestamp: Date.now()
    };
  }
  
  /**
   * 威廉指標計算
   */
  calculateWilliamsR(marketData, params = {}) {
    const { period = 14 } = params;
    const { highs, lows, closes } = marketData;
    
    if (closes.length < period) {
      throw new Error(`威廉指標計算需要至少 ${period} 個數據點`);
    }
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    const williamsR = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
    
    return {
      value: Math.round(williamsR * 100) / 100,
      overbought: williamsR > -20,
      oversold: williamsR < -80,
      signal: this.interpretWilliamsR(williamsR),
      timestamp: Date.now()
    };
  }
  
  /**
   * 取得市場數據
   */
  async getMarketData(symbol, params = {}) {
    const binanceService = getBinanceService();
    
    // 根據參數決定需要的數據長度
    const maxPeriod = Math.max(
      params.rsiPeriod || 14,
      params.macdSlow || 26,
      params.maPeriod || 20,
      params.bbPeriod || 20,
      params.williamsPeriod || 14,
      params.stochKPeriod || 14
    );
    
    // 加上緩衝區以確保有足夠數據
    const dataLength = Math.max(maxPeriod + 10, 50);
    
    // 取得 K 線數據
    const klineData = await binanceService.getKlineData(symbol, '1h', dataLength);
    
    return {
      symbol,
      highs: klineData.map(k => parseFloat(k.high || k[2])),
      lows: klineData.map(k => parseFloat(k.low || k[3])),
      closes: klineData.map(k => parseFloat(k.close || k[4])),
      volumes: klineData.map(k => parseFloat(k.volume || k[5])),
      timestamps: klineData.map(k => k.openTime || k[0])
    };
  }
  
  /**
   * 計算 SMA
   */
  calculateSMA(prices, period) {
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((sum, price) => sum + price, 0) / period;
  }
  
  /**
   * 計算 EMA
   */
  calculateEMA(prices, period) {
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }
  
  /**
   * 生成快取鍵
   */
  generateCacheKey(symbol, indicatorType, parameters) {
    const paramStr = JSON.stringify(parameters);
    return `${symbol}_${indicatorType}_${Buffer.from(paramStr).toString('base64')}`;
  }
  
  /**
   * 清理過期快取
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
}
```

### 3. 技術指標警報檢查引擎

**新建技術指標警報檢查器** (`src/services/technical-alert-checker.service.js`)：

```javascript
/**
 * 技術指標警報檢查器
 * 
 * 專門處理技術指標警報的條件評估和觸發
 */
class TechnicalAlertChecker {
  constructor() {
    this.technicalIndicatorsService = new TechnicalIndicatorsService();
    this.evaluationCache = new Map();
    this.cacheTTL = 60 * 1000; // 1分鐘快取
  }
  
  /**
   * 檢查技術指標警報
   */
  async checkTechnicalAlert(alert) {
    try {
      const { technicalIndicator, symbol } = alert;
      
      if (!technicalIndicator?.type) {
        throw new Error('警報缺少技術指標配置');
      }
      
      // 檢查會員權限
      if (!await this.hasPermission(alert.userId, technicalIndicator.type)) {
        logger.warn(`用戶 ${alert.userId} 無權限使用技術指標 ${technicalIndicator.type}`);
        return false;
      }
      
      // 計算技術指標
      const indicatorResult = await this.technicalIndicatorsService.calculateIndicator(
        symbol,
        technicalIndicator.type,
        technicalIndicator.parameters
      );
      
      // 評估警報條件
      const shouldTrigger = this.evaluateCondition(alert, indicatorResult);
      
      // 更新警報的最後計算結果
      if (shouldTrigger) {
        await this.updateAlertCalculation(alert, indicatorResult);
      }
      
      return shouldTrigger;
      
    } catch (error) {
      logger.error(`檢查技術指標警報失敗 (${alert._id}):`, error.message);
      return false;
    }
  }
  
  /**
   * 評估警報條件
   */
  evaluateCondition(alert, indicatorResult) {
    const { condition, threshold } = alert.technicalIndicator;
    const { type } = alert.technicalIndicator;
    
    switch (type) {
      case 'rsi':
        return this.evaluateRSICondition(condition, threshold, indicatorResult);
        
      case 'macd':
        return this.evaluateMACDCondition(condition, threshold, indicatorResult);
        
      case 'moving_average':
        return this.evaluateMACondition(condition, threshold, indicatorResult);
        
      case 'bollinger_bands':
        return this.evaluateBollingerCondition(condition, threshold, indicatorResult);
        
      case 'williams_r':
        return this.evaluateWilliamsRCondition(condition, threshold, indicatorResult);
        
      default:
        logger.warn(`未實作的技術指標條件評估: ${type}`);
        return false;
    }
  }
  
  /**
   * RSI 條件評估
   */
  evaluateRSICondition(condition, threshold, result) {
    const { value } = result;
    
    switch (condition) {
      case 'above':
        return value >= threshold.value;
        
      case 'below':
        return value <= threshold.value;
        
      case 'overbought':
        return value >= (threshold.value || 70);
        
      case 'oversold':
        return value <= (threshold.value || 30);
        
      default:
        return false;
    }
  }
  
  /**
   * MACD 條件評估
   */
  evaluateMACDCondition(condition, threshold, result) {
    const { macdLine, signalLine, histogram } = result;
    
    switch (condition) {
      case 'bullish_crossover':
        return result.bullishCrossover;
        
      case 'bearish_crossover':
        return result.bearishCrossover;
        
      case 'above_zero':
        return macdLine > 0;
        
      case 'below_zero':
        return macdLine < 0;
        
      case 'histogram_bullish':
        return histogram > 0;
        
      case 'histogram_bearish':
        return histogram < 0;
        
      default:
        return false;
    }
  }
  
  /**
   * 移動平均線條件評估
   */
  evaluateMACondition(condition, threshold, result) {
    const { currentPrice, value: maValue, pricePosition } = result;
    const tolerance = threshold.tolerance || 0.5;
    
    switch (condition) {
      case 'cross_above':
        return pricePosition === 'above' && 
               Math.abs(currentPrice - maValue) / maValue * 100 <= tolerance;
        
      case 'cross_below':
        return pricePosition === 'below' && 
               Math.abs(currentPrice - maValue) / maValue * 100 <= tolerance;
        
      case 'support_bounce':
        return pricePosition === 'above' && 
               currentPrice <= maValue * (1 + tolerance / 100) &&
               currentPrice >= maValue * (1 - tolerance / 100);
        
      case 'resistance_reject':
        return pricePosition === 'below' && 
               currentPrice >= maValue * (1 - tolerance / 100) &&
               currentPrice <= maValue * (1 + tolerance / 100);
        
      default:
        return false;
    }
  }
  
  /**
   * 布林通道條件評估
   */
  evaluateBollingerCondition(condition, threshold, result) {
    const { position, bandwidth, percentB } = result;
    
    switch (condition) {
      case 'upper_touch':
        return position === 'above_upper' || percentB >= 100;
        
      case 'lower_touch':
        return position === 'below_lower' || percentB <= 0;
        
      case 'squeeze':
        return bandwidth <= (threshold.value || 10);
        
      case 'expansion':
        return bandwidth >= (threshold.value || 20);
        
      case 'middle_cross':
        return Math.abs(percentB - 50) <= (threshold.tolerance || 5);
        
      default:
        return false;
    }
  }
  
  /**
   * 威廉指標條件評估
   */
  evaluateWilliamsRCondition(condition, threshold, result) {
    const { value } = result;
    
    switch (condition) {
      case 'overbought':
        return value >= (threshold.value || -20);
        
      case 'oversold':
        return value <= (threshold.value || -80);
        
      case 'above':
        return value >= threshold.value;
        
      case 'below':
        return value <= threshold.value;
        
      default:
        return false;
    }
  }
  
  /**
   * 檢查用戶權限
   */
  async hasPermission(userId, indicatorType) {
    try {
      // 檢查用戶會員級別
      const user = await User.findById(userId);
      
      if (!user) return false;
      
      // 免費用戶不能使用技術指標
      if (user.membershipLevel === 'free') {
        return false;
      }
      
      // 付費用戶可以使用基礎技術指標
      const basicIndicators = ['rsi', 'macd', 'moving_average', 'bollinger_bands', 'williams_r'];
      if (user.membershipLevel === 'premium' && basicIndicators.includes(indicatorType)) {
        return true;
      }
      
      // 企業用戶可以使用所有技術指標
      if (user.membershipLevel === 'enterprise') {
        return true;
      }
      
      return false;
      
    } catch (error) {
      logger.error(`檢查用戶權限失敗:`, error.message);
      return false;
    }
  }
  
  /**
   * 更新警報的最後計算結果
   */
  async updateAlertCalculation(alert, indicatorResult) {
    try {
      alert.technicalIndicator.lastCalculation = {
        value: indicatorResult.value || indicatorResult.macdLine,
        timestamp: new Date(),
        marketData: {
          symbol: alert.symbol,
          calculatedAt: indicatorResult.timestamp
        },
        isValid: true
      };
      
      await alert.save();
      
    } catch (error) {
      logger.error(`更新警報計算結果失敗:`, error.message);
    }
  }
  
  /**
   * 批量檢查多個技術指標警報
   */
  async checkMultipleTechnicalAlerts(alerts) {
    const results = [];
    
    // 按指標類型和交易對分組以最佳化計算
    const groupedAlerts = this.groupAlertsByIndicatorAndSymbol(alerts);
    
    for (const [groupKey, groupAlerts] of groupedAlerts) {
      const [indicatorType, symbol] = groupKey.split('_');
      
      try {
        // 一次計算，多個警報使用
        const indicatorResult = await this.technicalIndicatorsService.calculateIndicator(
          symbol,
          indicatorType,
          this.mergeParameters(groupAlerts)
        );
        
        // 評估各個警報
        for (const alert of groupAlerts) {
          const shouldTrigger = this.evaluateCondition(alert, indicatorResult);
          results.push({
            alertId: alert._id,
            shouldTrigger,
            indicatorResult
          });
        }
        
      } catch (error) {
        logger.error(`批量檢查 ${groupKey} 失敗:`, error.message);
        
        // 失敗的警報標記為不觸發
        for (const alert of groupAlerts) {
          results.push({
            alertId: alert._id,
            shouldTrigger: false,
            error: error.message
          });
        }
      }
    }
    
    return results;
  }
  
  /**
   * 按指標和交易對分組警報
   */
  groupAlertsByIndicatorAndSymbol(alerts) {
    const groups = new Map();
    
    for (const alert of alerts) {
      if (!alert.technicalIndicator?.type) continue;
      
      const key = `${alert.technicalIndicator.type}_${alert.symbol}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      
      groups.get(key).push(alert);
    }
    
    return groups;
  }
  
  /**
   * 合併同組警報的參數
   */
  mergeParameters(alerts) {
    // 使用最常見的參數，或者取平均值
    const parameters = {};
    
    // 這裡可以實作更複雜的參數合併邏輯
    // 目前簡化為使用第一個警報的參數
    if (alerts.length > 0) {
      return alerts[0].technicalIndicator.parameters || {};
    }
    
    return parameters;
  }
}
```

## 📱 前端界面設計

### 技術指標警報設定界面

**修改 PriceAlertModal.js**，新增技術指標選項：

```javascript
// 在 PriceAlertModal 中新增技術指標選項
class PriceAlertModal {
  renderAlertTypeSelection() {
    const userInfo = this.getUserInfo();
    const isPremium = userInfo.membershipLevel !== 'free';
    
    return `
      <div class="alert-type-selection">
        <!-- 基礎警報 -->
        <div class="alert-type-group">
          <h5>🆓 基礎價格警報</h5>
          <div class="basic-alerts">
            ${this.renderBasicAlertOptions()}
          </div>
        </div>
        
        <!-- 技術指標警報 -->
        <div class="alert-type-group ${!isPremium ? 'premium-locked' : ''}">
          <h5>⭐ 技術指標警報 ${!isPremium ? '(需要付費會員)' : ''}</h5>
          <div class="technical-alerts">
            ${this.renderTechnicalIndicatorOptions(isPremium)}
          </div>
        </div>
      </div>
    `;
  }
  
  renderTechnicalIndicatorOptions(isPremium) {
    const indicators = [
      {
        type: 'rsi',
        name: 'RSI 相對強弱指標',
        description: '超買超賣信號，常用閾值 70/30',
        conditions: [
          { value: 'overbought', label: 'RSI 超買 (>70)' },
          { value: 'oversold', label: 'RSI 超賣 (<30)' },
          { value: 'above', label: 'RSI 突破指定值' },
          { value: 'below', label: 'RSI 跌破指定值' }
        ]
      },
      {
        type: 'macd',
        name: 'MACD 指標',
        description: '趨勢跟蹤指標，金叉死叉信號',
        conditions: [
          { value: 'bullish_crossover', label: 'MACD 金叉 (看漲)' },
          { value: 'bearish_crossover', label: 'MACD 死叉 (看跌)' },
          { value: 'above_zero', label: 'MACD 上穿零軸' },
          { value: 'below_zero', label: 'MACD 下穿零軸' }
        ]
      },
      {
        type: 'moving_average',
        name: '移動平均線',
        description: '趨勢支撐阻力線',
        conditions: [
          { value: 'cross_above', label: '價格上穿移動平均線' },
          { value: 'cross_below', label: '價格下穿移動平均線' },
          { value: 'support_bounce', label: 'MA線支撐反彈' },
          { value: 'resistance_reject', label: 'MA線阻力回落' }
        ]
      },
      {
        type: 'bollinger_bands',
        name: '布林通道',
        description: '波動性指標，通道突破信號',
        conditions: [
          { value: 'upper_touch', label: '觸及布林上軌' },
          { value: 'lower_touch', label: '觸及布林下軌' },
          { value: 'squeeze', label: '通道收縮 (低波動)' },
          { value: 'expansion', label: '通道擴張 (高波動)' }
        ]
      },
      {
        type: 'williams_r',
        name: '威廉指標',
        description: '超買超賣震盪指標',
        conditions: [
          { value: 'overbought', label: 'Williams %R 超買 (>-20)' },
          { value: 'oversold', label: 'Williams %R 超賣 (<-80)' },
          { value: 'above', label: 'Williams %R 突破指定值' },
          { value: 'below', label: 'Williams %R 跌破指定值' }
        ]
      }
    ];
    
    return indicators.map(indicator => `
      <div class="indicator-group ${!isPremium ? 'disabled' : ''}">
        <div class="indicator-header" onclick="this.toggleIndicator('${indicator.type}')">
          <h6>
            <input type="radio" name="alertType" value="${indicator.type}" ${!isPremium ? 'disabled' : ''}>
            ${indicator.name}
            ${!isPremium ? '<span class="premium-badge">付費</span>' : ''}
          </h6>
          <p class="indicator-description">${indicator.description}</p>
        </div>
        
        <div class="indicator-conditions" id="conditions-${indicator.type}" style="display: none;">
          ${indicator.conditions.map(condition => `
            <label class="condition-option">
              <input type="radio" name="indicatorCondition" value="${condition.value}" ${!isPremium ? 'disabled' : ''}>
              ${condition.label}
            </label>
          `).join('')}
          
          <div class="condition-parameters" id="params-${indicator.type}">
            ${this.renderIndicatorParameters(indicator.type, isPremium)}
          </div>
        </div>
      </div>
    `).join('');
  }
  
  renderIndicatorParameters(indicatorType, isPremium) {
    const parameterSets = {
      rsi: `
        <div class="parameter-group">
          <label>RSI 週期</label>
          <input type="number" name="rsiPeriod" value="14" min="5" max="50" ${!isPremium ? 'disabled' : ''}>
        </div>
        <div class="parameter-group">
          <label>自訂閾值 (僅適用於突破/跌破)</label>
          <input type="number" name="customThreshold" min="0" max="100" placeholder="例如: 65" ${!isPremium ? 'disabled' : ''}>
        </div>
      `,
      macd: `
        <div class="parameter-group">
          <label>快線週期</label>
          <input type="number" name="macdFast" value="12" min="5" max="50" ${!isPremium ? 'disabled' : ''}>
        </div>
        <div class="parameter-group">
          <label>慢線週期</label>
          <input type="number" name="macdSlow" value="26" min="15" max="100" ${!isPremium ? 'disabled' : ''}>
        </div>
        <div class="parameter-group">
          <label>信號線週期</label>
          <input type="number" name="macdSignal" value="9" min="5" max="25" ${!isPremium ? 'disabled' : ''}>
        </div>
      `,
      moving_average: `
        <div class="parameter-group">
          <label>移動平均類型</label>
          <select name="maType" ${!isPremium ? 'disabled' : ''}>
            <option value="SMA">簡單移動平均 (SMA)</option>
            <option value="EMA">指數移動平均 (EMA)</option>
          </select>
        </div>
        <div class="parameter-group">
          <label>週期</label>
          <select name="maPeriod" ${!isPremium ? 'disabled' : ''}>
            <option value="7">7 日線</option>
            <option value="20" selected>20 日線</option>
            <option value="50">50 日線</option>
            <option value="200">200 日線</option>
          </select>
        </div>
        <div class="parameter-group">
          <label>容錯範圍 (%)</label>
          <input type="number" name="tolerance" value="0.5" min="0" max="5" step="0.1" ${!isPremium ? 'disabled' : ''}>
        </div>
      `,
      bollinger_bands: `
        <div class="parameter-group">
          <label>移動平均週期</label>
          <input type="number" name="bbPeriod" value="20" min="10" max="50" ${!isPremium ? 'disabled' : ''}>
        </div>
        <div class="parameter-group">
          <label>標準差倍數</label>
          <input type="number" name="bbStdDev" value="2.0" min="1.0" max="3.0" step="0.1" ${!isPremium ? 'disabled' : ''}>
        </div>
        <div class="parameter-group">
          <label>帶寬閾值 (%) (僅適用於收縮/擴張)</label>
          <input type="number" name="bandwidthThreshold" min="5" max="50" placeholder="例如: 10" ${!isPremium ? 'disabled' : ''}>
        </div>
      `,
      williams_r: `
        <div class="parameter-group">
          <label>威廉指標週期</label>
          <input type="number" name="williamsPeriod" value="14" min="5" max="50" ${!isPremium ? 'disabled' : ''}>
        </div>
        <div class="parameter-group">
          <label>自訂閾值 (僅適用於突破/跌破)</label>
          <input type="number" name="williamsThreshold" min="-100" max="0" placeholder="例如: -25" ${!isPremium ? 'disabled' : ''}>
        </div>
      `
    };
    
    return parameterSets[indicatorType] || '';
  }
  
  toggleIndicator(indicatorType) {
    const conditionsDiv = document.getElementById(`conditions-${indicatorType}`);
    if (conditionsDiv) {
      conditionsDiv.style.display = conditionsDiv.style.display === 'none' ? 'block' : 'none';
    }
  }
}
```

## 🧪 測試策略

### 單元測試

**技術指標計算測試** (`tests/technical-indicators.test.js`)：

```javascript
describe('技術指標計算服務', () => {
  let service;
  
  beforeEach(() => {
    service = new TechnicalIndicatorsService();
  });
  
  test('RSI 計算正確性', async () => {
    const mockData = {
      closes: [44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.05, 45.25, 45.02]
    };
    
    const result = service.calculateRSI(mockData, { period: 6 });
    
    expect(result.value).toBeCloseTo(70.53, 1);
    expect(result.overbought).toBe(true);
    expect(result.signal).toBe('overbought');
  });
  
  test('MACD 計算包含所有組件', async () => {
    const mockData = {
      closes: Array.from({length: 50}, (_, i) => 100 + Math.sin(i/5) * 10)
    };
    
    const result = service.calculateMACD(mockData);
    
    expect(result).toHaveProperty('macdLine');
    expect(result).toHaveProperty('signalLine');
    expect(result).toHaveProperty('histogram');
    expect(typeof result.bullishCrossover).toBe('boolean');
  });
});

describe('技術指標警報檢查器', () => {
  let checker;
  
  beforeEach(() => {
    checker = new TechnicalAlertChecker();
  });
  
  test('RSI 超買警報觸發', async () => {
    const mockAlert = {
      _id: 'test123',
      symbol: 'BTCUSDT',
      technicalIndicator: {
        type: 'rsi',
        condition: 'overbought',
        threshold: { value: 70 },
        parameters: { rsiPeriod: 14 }
      }
    };
    
    // Mock 技術指標結果
    jest.spyOn(checker.technicalIndicatorsService, 'calculateIndicator')
      .mockResolvedValue({ value: 75, overbought: true });
    
    const shouldTrigger = await checker.checkTechnicalAlert(mockAlert);
    
    expect(shouldTrigger).toBe(true);
  });
});
```

### 整合測試

**完整警報流程測試**：

```javascript
describe('技術指標警報端到端測試', () => {
  test('創建 RSI 警報並驗證觸發', async () => {
    // 1. 創建付費用戶
    const premiumUser = await createTestUser({ membershipLevel: 'premium' });
    
    // 2. 創建 RSI 警報
    const alertData = {
      userId: premiumUser._id,
      symbol: 'BTCUSDT',
      technicalIndicator: {
        type: 'rsi',
        condition: 'overbought',
        threshold: { value: 70 },
        parameters: { rsiPeriod: 14 }
      }
    };
    
    const response = await request(app)
      .post('/api/notifications/alerts')
      .set('Authorization', `Bearer ${premiumUser.token}`)
      .send(alertData)
      .expect(201);
    
    expect(response.body.data.alert.technicalIndicator.type).toBe('rsi');
    
    // 3. 模擬市場數據變化觸發警報
    // ... 測試邏輯
  });
});
```

## 📊 效能優化

### 計算效能優化

1. **批量計算**：相同指標的多個警報共享計算結果
2. **智慧快取**：根據市場活躍度調整快取時間
3. **延遲計算**：僅在需要時計算複雜指標
4. **並行處理**：不同交易對的指標並行計算

### 記憶體優化

```javascript
// 限制技術指標歷史數據長度
const MAX_KLINE_DATA = 200; // 最多保留200個數據點

// 定期清理快取
setInterval(() => {
  technicalIndicatorsService.cleanupCache();
}, 5 * 60 * 1000); // 每5分鐘清理一次
```

## 🚀 實作時程

### 第一階段：核心技術指標 (4天)

**Day 1-2: 技術指標計算服務**
- 實作 `TechnicalIndicatorsService`
- 基於現有 AI 分析服務的計算能力
- 新增 RSI、MACD、移動平均線、布林通道、威廉指標

**Day 3-4: 警報檢查引擎**
- 實作 `TechnicalAlertChecker`
- 條件評估邏輯
- 批量檢查優化

### 第二階段：前端界面 (2天)

**Day 5-6: 前端界面開發**
- 修改 `PriceAlertModal` 支援技術指標
- 會員限制和升級提示
- 參數設定界面

### 第三階段：整合測試 (2天)

**Day 7-8: 整合和測試**
- 端到端測試
- 效能優化
- 會員權限測試

## 📈 商業價值預估

### 轉換率提升

**目標用戶群體**：
- 技術分析愛好者：通常付費意願較高
- 專業交易者：對進階功能需求強烈
- 量化交易用戶：技術指標是核心需求

**預期效果**：
- 免費用戶轉換率：從 15% 提升至 25%
- 平均會員留存期：從 3個月提升至 6個月
- 客戶終身價值：從 $30 提升至 $60

### 收益增長預估

**保守估算 (1000 用戶場景)**：
```
技術指標功能上線前：
- 付費轉換率：15% = 150 付費用戶
- 月收入：150 × $9.99 = $1,498

技術指標功能上線後：
- 付費轉換率：25% = 250 付費用戶  
- 月收入：250 × $9.99 = $2,498
- 增長：$1,000/月 (66.7% 增長)
```

### ROI 分析

**開發成本**：
- 開發時間：8天 × $500/天 = $4,000
- 維護成本：$200/月

**投資回報**：
- 月收入增長：$1,000
- 投資回收期：4個月
- 第一年淨利潤：$8,000 (200% ROI)

## 🎯 結論

技術指標警報系統作為付費會員的核心差異化功能，具有以下優勢：

1. **技術門檻高**：競爭對手難以快速複製
2. **用戶黏性強**：專業用戶依賴度高
3. **營收潛力大**：可帶來顯著的付費轉換提升
4. **擴展性好**：後續可添加更多進階指標

透過精心設計的會員制度和技術實現，這套系統將成為 NexusTrade 平台的重要競爭優勢和收入來源。

---

**文件版本：v1.0.0**  
**建立日期：2025-01-01**  
**預估實作時間：8 天**  
**預期轉換率提升：10%**  
**預期月收入增長：$1,000+**