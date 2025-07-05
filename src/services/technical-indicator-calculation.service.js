/**
 * NexusTrade 技術指標計算服務
 * 
 * 提供各種技術指標的計算功能
 * - RSI (相對強弱指數)
 * - MACD (移動平均線收斂/發散)
 * - 移動平均線 (SMA/EMA)
 * - 布林通道 (Bollinger Bands)
 * - Williams %R
 */

const logger = require('../utils/logger');

class TechnicalIndicatorService {
  constructor() {
    this.historyCache = new Map(); // K線歷史數據快取
    this.indicatorCache = new Map(); // 技術指標計算結果快取
    this.cacheExpiry = 60000; // 快取過期時間 1分鐘
  }

  /**
   * 計算所有技術指標
   */
  async calculateIndicators(symbol, marketData, options = {}) {
    try {
      // 取得歷史數據
      const klineData = await this.getKlineData(symbol, options);
      
      if (!klineData || klineData.length < 50) {
        logger.warn(`${symbol} 歷史數據不足，無法計算技術指標`);
        return this.getDefaultIndicators();
      }

      // 計算各項技術指標
      const indicators = {
        rsi: this.calculateRSI(klineData, options.rsiPeriod || 14),
        macd: this.calculateMACD(klineData, options.macdConfig || {}),
        ma: this.calculateMovingAverages(klineData, options.maConfig || {}),
        bollingerBands: this.calculateBollingerBands(klineData, options.bbConfig || {}),
        williamsR: this.calculateWilliamsR(klineData, options.williamsRPeriod || 14),
        timestamp: new Date()
      };

      // 快取結果
      this.cacheIndicators(symbol, indicators);

      return indicators;
    } catch (error) {
      logger.error(`計算 ${symbol} 技術指標失敗:`, error);
      return this.getDefaultIndicators();
    }
  }

  /**
   * 計算 RSI (相對強弱指數)
   */
  calculateRSI(klineData, period = 14) {
    if (klineData.length < period + 1) {
      return { current: 50, previous: 50 };
    }

    const closes = klineData.map(k => k.close);
    const gains = [];
    const losses = [];

    // 計算價格變化
    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // 計算平均獲利和平均損失
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    const rsiValues = [];

    // 計算 RSI
    for (let i = period; i < gains.length; i++) {
      if (avgLoss === 0) {
        rsiValues.push(100);
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        rsiValues.push(rsi);
      }

      // 更新平均值 (Wilder's 平滑)
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    }

    return {
      current: rsiValues[rsiValues.length - 1] || 50,
      previous: rsiValues[rsiValues.length - 2] || 50,
      period,
      overbought: 70,
      oversold: 30
    };
  }

  /**
   * 計算 MACD
   */
  calculateMACD(klineData, config = {}) {
    const {
      fastPeriod = 12,
      slowPeriod = 26,
      signalPeriod = 9
    } = config;

    if (klineData.length < slowPeriod + signalPeriod) {
      return {
        macd: 0,
        signal: 0,
        histogram: 0,
        previousHistogram: 0
      };
    }

    const closes = klineData.map(k => k.close);
    
    // 計算 EMA
    const fastEMA = this.calculateEMA(closes, fastPeriod);
    const slowEMA = this.calculateEMA(closes, slowPeriod);
    
    // 計算 MACD 線
    const macdLine = [];
    for (let i = 0; i < Math.min(fastEMA.length, slowEMA.length); i++) {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
    
    // 計算信號線 (MACD 的 EMA)
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    
    // 計算直方圖
    const histogramValues = [];
    for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
      histogramValues.push(macdLine[i] - signalLine[i]);
    }

    return {
      macd: macdLine[macdLine.length - 1] || 0,
      signal: signalLine[signalLine.length - 1] || 0,
      histogram: histogramValues[histogramValues.length - 1] || 0,
      previousHistogram: histogramValues[histogramValues.length - 2] || 0,
      config: { fastPeriod, slowPeriod, signalPeriod }
    };
  }

  /**
   * 計算移動平均線
   */
  calculateMovingAverages(klineData, config = {}) {
    const {
      fastPeriod = 20,
      slowPeriod = 50,
      type = 'SMA'
    } = config;

    const closes = klineData.map(k => k.close);
    
    let fastMA, slowMA;
    
    if (type === 'EMA') {
      fastMA = this.calculateEMA(closes, fastPeriod);
      slowMA = this.calculateEMA(closes, slowPeriod);
    } else {
      fastMA = this.calculateSMA(closes, fastPeriod);
      slowMA = this.calculateSMA(closes, slowPeriod);
    }

    return {
      fast: fastMA[fastMA.length - 1] || 0,
      slow: slowMA[slowMA.length - 1] || 0,
      previousFast: fastMA[fastMA.length - 2] || 0,
      previousSlow: slowMA[slowMA.length - 2] || 0,
      type,
      periods: { fast: fastPeriod, slow: slowPeriod }
    };
  }

  /**
   * 計算布林通道
   */
  calculateBollingerBands(klineData, config = {}) {
    const {
      period = 20,
      standardDeviations = 2
    } = config;

    if (klineData.length < period) {
      return {
        upper: 0,
        middle: 0,
        lower: 0,
        bandwidth: 0,
        percentB: 0
      };
    }

    const closes = klineData.map(k => k.close);
    const sma = this.calculateSMA(closes, period);
    const currentSMA = sma[sma.length - 1];
    
    // 計算標準差
    const recentCloses = closes.slice(-period);
    const variance = recentCloses.reduce((sum, close) => {
      return sum + Math.pow(close - currentSMA, 2);
    }, 0) / period;
    
    const standardDeviation = Math.sqrt(variance);
    
    // 計算布林通道
    const upper = currentSMA + (standardDeviations * standardDeviation);
    const lower = currentSMA - (standardDeviations * standardDeviation);
    const currentPrice = closes[closes.length - 1];
    
    // 計算 %B (價格在通道中的位置)
    const percentB = (currentPrice - lower) / (upper - lower);
    
    // 計算通道寬度
    const bandwidth = (upper - lower) / currentSMA;

    return {
      upper,
      middle: currentSMA,
      lower,
      bandwidth,
      percentB,
      standardDeviation,
      period,
      config: { period, standardDeviations }
    };
  }

  /**
   * 計算 Williams %R
   */
  calculateWilliamsR(klineData, period = 14) {
    if (klineData.length < period) {
      return {
        current: -50,
        previous: -50,
        overbought: -20,
        oversold: -80
      };
    }

    const recentData = klineData.slice(-period);
    const highs = recentData.map(k => k.high);
    const lows = recentData.map(k => k.low);
    const currentClose = klineData[klineData.length - 1].close;
    
    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);
    
    const williamsR = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
    
    // 計算前一個值
    let previousWilliamsR = -50;
    if (klineData.length > period) {
      const previousData = klineData.slice(-period - 1, -1);
      const prevHighs = previousData.map(k => k.high);
      const prevLows = previousData.map(k => k.low);
      const prevClose = klineData[klineData.length - 2].close;
      
      const prevHighestHigh = Math.max(...prevHighs);
      const prevLowestLow = Math.min(...prevLows);
      
      previousWilliamsR = ((prevHighestHigh - prevClose) / (prevHighestHigh - prevLowestLow)) * -100;
    }

    return {
      current: williamsR || -50,
      previous: previousWilliamsR,
      period,
      overbought: -20,
      oversold: -80
    };
  }

  /**
   * 計算簡單移動平均線 (SMA)
   */
  calculateSMA(data, period) {
    const smaValues = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const average = slice.reduce((sum, value) => sum + value, 0) / period;
      smaValues.push(average);
    }
    
    return smaValues;
  }

  /**
   * 計算指數移動平均線 (EMA)
   */
  calculateEMA(data, period) {
    const emaValues = [];
    const multiplier = 2 / (period + 1);
    
    // 第一個 EMA 值使用 SMA
    const firstSMA = data.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
    emaValues.push(firstSMA);
    
    // 計算後續的 EMA 值
    for (let i = period; i < data.length; i++) {
      const ema = (data[i] * multiplier) + (emaValues[emaValues.length - 1] * (1 - multiplier));
      emaValues.push(ema);
    }
    
    return emaValues;
  }

  /**
   * 取得 K線歷史數據
   */
  async getKlineData(symbol, options = {}) {
    try {
      // 檢查快取
      const cacheKey = `${symbol}_kline`;
      const cached = this.historyCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
        return cached.data;
      }

      // 模擬 K線數據獲取（實際應該調用 Binance API）
      const klineData = this.generateMockKlineData(symbol, options.limit || 200);
      
      // 快取數據
      this.historyCache.set(cacheKey, {
        data: klineData,
        timestamp: Date.now()
      });

      return klineData;
    } catch (error) {
      logger.error(`取得 ${symbol} K線數據失敗:`, error);
      return [];
    }
  }

  /**
   * 生成模擬 K線數據
   */
  generateMockKlineData(symbol, limit = 200) {
    const klineData = [];
    let basePrice = 50000; // 基礎價格
    
    for (let i = 0; i < limit; i++) {
      // 模擬價格波動
      const change = (Math.random() - 0.5) * basePrice * 0.02; // ±1% 波動
      basePrice += change;
      
      const open = basePrice;
      const high = open + (Math.random() * open * 0.01); // 最高價
      const low = open - (Math.random() * open * 0.01);  // 最低價
      const close = low + (Math.random() * (high - low)); // 收盤價
      const volume = Math.random() * 1000000;
      
      klineData.push({
        openTime: Date.now() - (limit - i) * 60000, // 每分鐘一根 K線
        open,
        high,
        low,
        close,
        volume,
        closeTime: Date.now() - (limit - i - 1) * 60000
      });
    }
    
    return klineData;
  }

  /**
   * 快取技術指標結果
   */
  cacheIndicators(symbol, indicators) {
    this.indicatorCache.set(symbol, {
      data: indicators,
      timestamp: Date.now()
    });
  }

  /**
   * 取得預設技術指標值
   */
  getDefaultIndicators() {
    return {
      rsi: { current: 50, previous: 50, period: 14, overbought: 70, oversold: 30 },
      macd: { macd: 0, signal: 0, histogram: 0, previousHistogram: 0 },
      ma: { fast: 0, slow: 0, previousFast: 0, previousSlow: 0, type: 'SMA' },
      bollingerBands: { upper: 0, middle: 0, lower: 0, bandwidth: 0, percentB: 0 },
      williamsR: { current: -50, previous: -50, period: 14, overbought: -20, oversold: -80 },
      timestamp: new Date()
    };
  }

  /**
   * 清除快取
   */
  clearCache() {
    this.historyCache.clear();
    this.indicatorCache.clear();
    logger.info('技術指標快取已清除');
  }

  /**
   * 取得快取狀態
   */
  getCacheStatus() {
    return {
      historyCache: this.historyCache.size,
      indicatorCache: this.indicatorCache.size,
      cacheExpiry: this.cacheExpiry
    };
  }
}

// 創建單例實例
const technicalIndicatorService = new TechnicalIndicatorService();

module.exports = technicalIndicatorService;