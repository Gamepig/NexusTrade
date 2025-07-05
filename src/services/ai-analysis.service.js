/**
 * AI 分析服務
 * 
 * 使用 OpenRouter API 提供加密貨幣市場分析功能：
 * - 趨勢分析
 * - 技術指標解讀
 * - 投資建議生成
 * - 風險評估
 */

const logger = require('../utils/logger');
const { getBinanceService } = require('./binance.service');

class AIAnalysisService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseUrl = 'https://openrouter.ai/api/v1';
    this.binanceService = getBinanceService();
    
    // AI 模型配置
    this.defaultModel = process.env.OPENROUTER_DEFAULT_MODEL || 'qwen/qwen-2.5-72b-instruct:free';
    this.maxTokens = 1000;
    this.temperature = 0.7;
    
    // 分析快取 (5分鐘)
    this.analysisCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000;
    
    logger.info('🤖 AI 分析服務初始化');
  }

  /**
   * 檢查 AI 服務配置
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * 調用 AI API (OpenRouter)
   */
  async callAI(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('AI 服務未設定：OpenRouter API 金鑰未設定');
    }

    const requestBody = {
      model: options.model || this.defaultModel,
      messages,
      max_tokens: options.maxTokens || this.maxTokens,
      temperature: options.temperature || this.temperature,
      ...options
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
          'X-Title': 'NexusTrade AI Analysis'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API 錯誤: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '無法獲取分析結果';

    } catch (error) {
      logger.error('OpenRouter API 調用失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取市場數據用於分析
   */
  async getMarketDataForAnalysis(symbol, timeframe = '1d', limit = 30) {
    try {
      // 獲取 K線數據
      const klines = await this.binanceService.getKlines(symbol, timeframe, limit);
      
      // 獲取當前價格
      const currentPrice = await this.binanceService.getSymbolPrice(symbol);
      
      // 獲取24小時統計
      const stats24h = await this.binanceService.get24hrStats(symbol);

      return {
        symbol,
        currentPrice: parseFloat(currentPrice.price),
        change24h: parseFloat(stats24h.priceChangePercent),
        volume24h: parseFloat(stats24h.volume),
        high24h: parseFloat(stats24h.highPrice),
        low24h: parseFloat(stats24h.lowPrice),
        klines: klines.map(kline => ({
          timestamp: kline[0],
          open: parseFloat(kline[1]),
          high: parseFloat(kline[2]),
          low: parseFloat(kline[3]),
          close: parseFloat(kline[4]),
          volume: parseFloat(kline[5])
        }))
      };
    } catch (error) {
      logger.error('獲取市場數據失敗:', error);
      throw error;
    }
  }

  /**
   * 加密貨幣趨勢分析
   */
  async analyzeTrend(symbol, timeframe = '1d') {
    const cacheKey = `trend_${symbol}_${timeframe}`;
    
    // 檢查快取
    if (this.analysisCache.has(cacheKey)) {
      const cached = this.analysisCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // 獲取市場數據
      const marketData = await this.getMarketDataForAnalysis(symbol, timeframe);
      
      // 建構分析提示
      const analysisPrompt = this.buildTrendAnalysisPrompt(marketData);
      
      // 調用 AI 分析
      const analysis = await this.callAI([
        {
          role: 'system',
          content: '你是一位專業的加密貨幣分析師，擅長技術分析和市場趨勢預測。請提供客觀、專業的分析建議。'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ]);

      const result = {
        symbol,
        timeframe,
        analysis,
        marketData: {
          currentPrice: marketData.currentPrice,
          change24h: marketData.change24h,
          volume24h: marketData.volume24h
        },
        timestamp: new Date().toISOString()
      };

      // 快取結果
      this.analysisCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      logger.info(`✅ 完成 ${symbol} 趨勢分析`);
      return result;

    } catch (error) {
      logger.error(`${symbol} 趨勢分析失敗:`, error);
      throw error;
    }
  }

  /**
   * 技術指標分析
   */
  async analyzeTechnicalIndicators(symbol, timeframe = '1d') {
    const cacheKey = `technical_${symbol}_${timeframe}`;
    
    // 檢查快取
    if (this.analysisCache.has(cacheKey)) {
      const cached = this.analysisCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // 獲取市場數據
      const marketData = await this.getMarketDataForAnalysis(symbol, timeframe, 50);
      
      // 計算基本技術指標
      const indicators = this.calculateBasicIndicators(marketData.klines);
      
      // 建構技術分析提示
      const analysisPrompt = this.buildTechnicalAnalysisPrompt(marketData, indicators);
      
      // 調用 AI 分析
      const analysis = await this.callAI([
        {
          role: 'system',
          content: '你是一位技術分析專家，精通各種技術指標的解讀和應用。請分析提供的技術指標並給出專業建議。'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ]);

      const result = {
        symbol,
        timeframe,
        analysis,
        indicators,
        marketData: {
          currentPrice: marketData.currentPrice,
          change24h: marketData.change24h
        },
        timestamp: new Date().toISOString()
      };

      // 快取結果
      this.analysisCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      logger.info(`✅ 完成 ${symbol} 技術指標分析`);
      return result;

    } catch (error) {
      logger.error(`${symbol} 技術指標分析失敗:`, error);
      throw error;
    }
  }

  /**
   * 投資建議生成
   */
  async generateInvestmentAdvice(symbol, riskLevel = 'medium', investmentHorizon = 'medium') {
    const cacheKey = `advice_${symbol}_${riskLevel}_${investmentHorizon}`;
    
    // 檢查快取
    if (this.analysisCache.has(cacheKey)) {
      const cached = this.analysisCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // 獲取市場數據
      const marketData = await this.getMarketDataForAnalysis(symbol, '1d', 30);
      
      // 建構投資建議提示
      const advicePrompt = this.buildInvestmentAdvicePrompt(marketData, riskLevel, investmentHorizon);
      
      // 調用 AI 分析
      const advice = await this.callAI([
        {
          role: 'system',
          content: '你是一位專業的投資顧問，具備豐富的加密貨幣投資經驗。請根據風險等級和投資期限提供個人化的投資建議。'
        },
        {
          role: 'user',
          content: advicePrompt
        }
      ], { temperature: 0.8 });

      const result = {
        symbol,
        riskLevel,
        investmentHorizon,
        advice,
        marketData: {
          currentPrice: marketData.currentPrice,
          change24h: marketData.change24h
        },
        timestamp: new Date().toISOString()
      };

      // 快取結果
      this.analysisCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      logger.info(`✅ 完成 ${symbol} 投資建議生成`);
      return result;

    } catch (error) {
      logger.error(`${symbol} 投資建議生成失敗:`, error);
      throw error;
    }
  }

  /**
   * 風險評估
   */
  async assessRisk(symbol, portfolioData = null) {
    const cacheKey = `risk_${symbol}_${portfolioData ? 'portfolio' : 'single'}`;
    
    // 檢查快取
    if (this.analysisCache.has(cacheKey)) {
      const cached = this.analysisCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // 獲取市場數據
      const marketData = await this.getMarketDataForAnalysis(symbol, '1d', 60);
      
      // 計算風險指標
      const riskMetrics = this.calculateRiskMetrics(marketData.klines);
      
      // 建構風險評估提示
      const riskPrompt = this.buildRiskAssessmentPrompt(marketData, riskMetrics, portfolioData);
      
      // 調用 AI 分析
      const assessment = await this.callAI([
        {
          role: 'system',
          content: '你是一位風險管理專家，專精於加密貨幣市場的風險評估和管理。請提供詳細的風險分析和管理建議。'
        },
        {
          role: 'user',
          content: riskPrompt
        }
      ]);

      const result = {
        symbol,
        assessment,
        riskMetrics,
        marketData: {
          currentPrice: marketData.currentPrice,
          change24h: marketData.change24h,
          volatility: riskMetrics.volatility
        },
        timestamp: new Date().toISOString()
      };

      // 快取結果
      this.analysisCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      logger.info(`✅ 完成 ${symbol} 風險評估`);
      return result;

    } catch (error) {
      logger.error(`${symbol} 風險評估失敗:`, error);
      throw error;
    }
  }

  /**
   * 建構趨勢分析提示
   */
  buildTrendAnalysisPrompt(marketData) {
    const recentPrices = marketData.klines.slice(-10).map(k => k.close);
    const priceChange = ((recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0] * 100).toFixed(2);
    
    return `
請分析 ${marketData.symbol} 的市場趨勢：

當前價格: $${marketData.currentPrice}
24小時變化: ${marketData.change24h}%
24小時交易量: $${marketData.volume24h.toLocaleString()}
24小時最高: $${marketData.high24h}
24小時最低: $${marketData.low24h}

最近10天收盤價格走勢:
${recentPrices.map((price, i) => `第${i+1}天: $${price}`).join('\n')}

期間價格變化: ${priceChange}%

請提供：
1. 短期趨勢分析 (1-7天)
2. 中期趨勢預測 (1-4週)
3. 關鍵支撐位和阻力位
4. 趨勢強度評估
5. 潛在的趨勢轉折點

請以專業但易懂的方式回答，控制在800字以內。
    `.trim();
  }

  /**
   * 建構技術分析提示
   */
  buildTechnicalAnalysisPrompt(marketData, indicators) {
    return `
請分析 ${marketData.symbol} 的技術指標：

當前價格: $${marketData.currentPrice}
24小時變化: ${marketData.change24h}%

技術指標:
- RSI (14天): ${indicators.rsi?.toFixed(2) || 'N/A'}
- MACD: ${indicators.macd?.toFixed(4) || 'N/A'}
- 移動平均線 MA(20): $${indicators.ma20?.toFixed(2) || 'N/A'}
- 移動平均線 MA(50): $${indicators.ma50?.toFixed(2) || 'N/A'}
- 布林帶上軌: $${indicators.bollingerUpper?.toFixed(2) || 'N/A'}
- 布林帶下軌: $${indicators.bollingerLower?.toFixed(2) || 'N/A'}
- 波動率 (30天): ${indicators.volatility?.toFixed(2) || 'N/A'}%

請提供：
1. 各技術指標的現況解讀
2. 超買超賣信號分析
3. 趨勢確認信號
4. 進場和出場建議
5. 風險控制要點

請以專業角度分析，控制在700字以內。
    `.trim();
  }

  /**
   * 建構投資建議提示
   */
  buildInvestmentAdvicePrompt(marketData, riskLevel, investmentHorizon) {
    const riskLevelText = {
      low: '保守型（低風險）',
      medium: '平衡型（中風險）',
      high: '積極型（高風險）'
    };

    const horizonText = {
      short: '短期（1-3個月）',
      medium: '中期（3-12個月）',
      long: '長期（1年以上）'
    };

    return `
請為 ${marketData.symbol} 提供投資建議：

當前市場狀況:
- 當前價格: $${marketData.currentPrice}
- 24小時變化: ${marketData.change24h}%
- 24小時交易量: $${marketData.volume24h.toLocaleString()}

投資者風險偏好: ${riskLevelText[riskLevel] || riskLevel}
投資期限: ${horizonText[investmentHorizon] || investmentHorizon}

請提供：
1. 投資策略建議
2. 建議的倉位配置
3. 進場時機分析
4. 止損止盈建議
5. 投資組合建議

請根據指定的風險等級和投資期限，提供個人化建議，控制在600字以內。
    `.trim();
  }

  /**
   * 建構風險評估提示
   */
  buildRiskAssessmentPrompt(marketData, riskMetrics, portfolioData) {
    return `
請評估 ${marketData.symbol} 的投資風險：

市場數據:
- 當前價格: $${marketData.currentPrice}
- 24小時變化: ${marketData.change24h}%
- 24小時交易量: $${marketData.volume24h.toLocaleString()}

風險指標:
- 波動率 (30天): ${riskMetrics.volatility?.toFixed(2) || 'N/A'}%
- 最大回撤: ${riskMetrics.maxDrawdown?.toFixed(2) || 'N/A'}%
- VaR (95%): ${riskMetrics.var95?.toFixed(2) || 'N/A'}%
- 夏普比率: ${riskMetrics.sharpeRatio?.toFixed(2) || 'N/A'}

${portfolioData ? `投資組合資訊: ${JSON.stringify(portfolioData)}` : ''}

請提供：
1. 整體風險等級評估
2. 主要風險因素分析
3. 風險管理建議
4. 資金管理策略
5. 預警信號識別

請提供專業的風險管理建議，控制在700字以內。
    `.trim();
  }

  /**
   * 計算基本技術指標
   */
  calculateBasicIndicators(klines) {
    if (!klines || klines.length < 14) {
      return {};
    }

    const closes = klines.map(k => k.close);
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);

    try {
      return {
        rsi: this.calculateRSI(closes, 14),
        ma20: this.calculateSMA(closes, 20),
        ma50: this.calculateSMA(closes, 50),
        volatility: this.calculateVolatility(closes, 30),
        bollingerUpper: this.calculateBollingerUpper(closes, 20),
        bollingerLower: this.calculateBollingerLower(closes, 20)
      };
    } catch (error) {
      logger.error('技術指標計算失敗:', error);
      return {};
    }
  }

  /**
   * 計算風險指標
   */
  calculateRiskMetrics(klines) {
    if (!klines || klines.length < 30) {
      return {};
    }

    const closes = klines.map(k => k.close);
    
    try {
      return {
        volatility: this.calculateVolatility(closes, 30),
        maxDrawdown: this.calculateMaxDrawdown(closes),
        var95: this.calculateVaR(closes, 0.95),
        sharpeRatio: this.calculateSharpeRatio(closes)
      };
    } catch (error) {
      logger.error('風險指標計算失敗:', error);
      return {};
    }
  }

  /**
   * 計算 RSI
   */
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < prices.length; i++) {
      const difference = prices[i] - prices[i - 1];
      gains.push(difference > 0 ? difference : 0);
      losses.push(difference < 0 ? Math.abs(difference) : 0);
    }
    
    const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * 計算簡單移動平均線
   */
  calculateSMA(prices, period) {
    if (prices.length < period) return null;
    
    const slice = prices.slice(-period);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  }

  /**
   * 計算波動率
   */
  calculateVolatility(prices, period = 30) {
    if (prices.length < period + 1) return null;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const recentReturns = returns.slice(-period);
    const mean = recentReturns.reduce((sum, ret) => sum + ret, 0) / recentReturns.length;
    
    const variance = recentReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / recentReturns.length;
    
    return Math.sqrt(variance * 365) * 100; // 年化波動率
  }

  /**
   * 計算布林帶上軌
   */
  calculateBollingerUpper(prices, period = 20, multiplier = 2) {
    const sma = this.calculateSMA(prices, period);
    if (!sma) return null;
    
    const slice = prices.slice(-period);
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    return sma + (stdDev * multiplier);
  }

  /**
   * 計算布林帶下軌
   */
  calculateBollingerLower(prices, period = 20, multiplier = 2) {
    const sma = this.calculateSMA(prices, period);
    if (!sma) return null;
    
    const slice = prices.slice(-period);
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    return sma - (stdDev * multiplier);
  }

  /**
   * 計算最大回撤
   */
  calculateMaxDrawdown(prices) {
    let maxDrawdown = 0;
    let peak = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > peak) {
        peak = prices[i];
      } else {
        const drawdown = (peak - prices[i]) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }
    
    return maxDrawdown * 100;
  }

  /**
   * 計算 VaR (風險價值)
   */
  calculateVaR(prices, confidence = 0.95) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    returns.sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * returns.length);
    
    return Math.abs(returns[index] * 100);
  }

  /**
   * 計算夏普比率
   */
  calculateSharpeRatio(prices, riskFreeRate = 0.02) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    const annualizedReturn = avgReturn * 365;
    const annualizedStdDev = stdDev * Math.sqrt(365);
    
    return (annualizedReturn - riskFreeRate) / annualizedStdDev;
  }

  /**
   * 清理過期快取
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.analysisCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.analysisCache.delete(key);
      }
    }
  }

  /**
   * 獲取服務統計
   */
  getStats() {
    return {
      isConfigured: this.isConfigured(),
      cacheSize: this.analysisCache.size,
      model: this.defaultModel,
      cacheTimeout: this.cacheTimeout / 1000 / 60 // 分鐘
    };
  }
}

// 單例模式
let aiAnalysisServiceInstance = null;

/**
 * 獲取 AI 分析服務實例
 */
function getAIAnalysisService() {
  if (!aiAnalysisServiceInstance) {
    aiAnalysisServiceInstance = new AIAnalysisService();
  }
  return aiAnalysisServiceInstance;
}

module.exports = { 
  AIAnalysisService, 
  getAIAnalysisService 
};