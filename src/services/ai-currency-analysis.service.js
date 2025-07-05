/**
 * AI 單一貨幣分析服務
 * 
 * 負責進行單一貨幣的日線分析
 * 考量 OpenRouter API 限制，每日執行一次並存入資料庫
 */

const logger = require('../utils/logger');
const AIAnalysisResult = require('../models/AIAnalysisResult');
const { getBinanceService } = require('./binance.service');

class AICurrencyAnalysisService {
  constructor() {
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
    this.openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.model = process.env.OPENROUTER_DEFAULT_MODEL || 'qwen/qwen-2.5-72b-instruct:free';
    this.fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';
    
    // 多模型備援鏈：Qwen 2.5-72B → Llama 3.1-8B → 降級
    // 這些都是經過測試的高品質非推理型模型，能直接輸出 JSON 結果
    this.modelFallbackChain = [
      this.model,
      this.fallbackModel
    ];
  }

  /**
   * 檢查服務是否已配置
   */
  isConfigured() {
    return !!this.openRouterApiKey;
  }

  /**
   * 檢查特定貨幣今日是否需要重新分析
   */
  async needsAnalysis(symbol) {
    return await AIAnalysisResult.needsAnalysis('single_currency', symbol);
  }

  /**
   * 獲取特定貨幣今日的分析結果
   */
  async getTodayAnalysis(symbol) {
    return await AIAnalysisResult.getTodayCurrencyAnalysis(symbol);
  }

  /**
   * 執行單一貨幣分析
   */
  async performCurrencyAnalysis(symbol) {
    const startTime = Date.now();
    
    try {
      logger.info(`🔍 開始 ${symbol} 單一貨幣分析...`);

      // 檢查是否需要重新分析
      const needsAnalysis = await this.needsAnalysis(symbol);
      if (!needsAnalysis) {
        logger.info(`✅ ${symbol} 今日分析已存在，直接返回快取結果`);
        return await this.getTodayAnalysis(symbol);
      }

      // 檢查 API 配置
      if (!this.isConfigured()) {
        throw new Error('OpenRouter API 金鑰未設定');
      }

      // 1. 收集貨幣數據 (使用週線數據進行日線分析)
      const currencyData = await this.collectCurrencyData(symbol);
      
      // 2. 執行 AI 分析 (增強技術指標數據傳遞)
      const aiAnalysis = await this.performAIAnalysis(symbol, currencyData);
      
      // 3. 儲存分析結果
      const analysisResult = await this.saveAnalysisResult(symbol, aiAnalysis, currencyData);
      
      const processingTime = Date.now() - startTime;
      logger.info(`✅ ${symbol} 單一貨幣分析完成，處理時間: ${processingTime}ms`);
      
      return analysisResult;

    } catch (error) {
      logger.error(`❌ ${symbol} 單一貨幣分析失敗:`, error);
      throw error;
    }
  }

  /**
   * 收集特定貨幣的數據
   */
  async collectCurrencyData(symbol) {
    try {
      const binanceService = getBinanceService();
      
      // 並行獲取多種數據
      const [
        currentPrice,
        ticker24h,
        weeklyKlines,
        orderBookDepth
      ] = await Promise.all([
        binanceService.getCurrentPrice(symbol),
        binanceService.get24hrTicker(symbol),
        binanceService.getKlineData(symbol, '1d', 7), // 7天的日線數據
        binanceService.getOrderBookDepth(symbol, 20).catch(() => null)
      ]);

      // 計算技術指標 - 提取價格和成交量數據
      // 修復：K線數據格式為物件，不是陣列
      const highs = weeklyKlines.map(kline => {
        const high = Array.isArray(kline) ? parseFloat(kline[2]) : parseFloat(kline.high);
        console.log(`🔍 [collectCurrencyData] 提取高價: ${kline.high || kline[2]} -> ${high}`);
        return high;
      });
      const lows = weeklyKlines.map(kline => {
        const low = Array.isArray(kline) ? parseFloat(kline[3]) : parseFloat(kline.low);
        console.log(`🔍 [collectCurrencyData] 提取低價: ${kline.low || kline[3]} -> ${low}`);
        return low;
      });
      const closes = weeklyKlines.map(kline => {
        const close = Array.isArray(kline) ? parseFloat(kline[4]) : parseFloat(kline.close);
        console.log(`🔍 [collectCurrencyData] 提取收盤價: ${kline.close || kline[4]} -> ${close}`);
        return close;
      });
      const volumes = weeklyKlines.map(kline => {
        const volume = Array.isArray(kline) ? parseFloat(kline[5]) : parseFloat(kline.volume);
        console.log(`🔍 [collectCurrencyData] 提取成交量: ${kline.volume || kline[5]} -> ${volume}`);
        return volume;
      });
      
      const technicalIndicators = this.calculateTechnicalIndicators(highs, lows, closes, volumes);
      
      // 計算價格統計
      const priceStats = this.calculatePriceStatistics(weeklyKlines, currentPrice);

      return {
        symbol,
        currentPrice,
        ticker24h,
        weeklyKlines,
        orderBookDepth,
        technicalIndicators,
        priceStats,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`收集 ${symbol} 數據失敗:`, error);
      throw new Error(`貨幣數據收集失敗: ${error.message}`);
    }
  }

  /**
   * 計算技術指標
   */
  calculateTechnicalIndicators(highs, lows, closes, volumes) {
    logger.info(`🔍 計算技術指標，K線數據長度: ${closes ? closes.length : 0}`);
    
    if (!closes || closes.length < 3) {
      logger.warn('⚠️ K線數據不足，使用預設技術指標');
      return this.getDefaultTechnicalIndicators();
    }
    
    // 確保所有數據都是數字
    const safeCloses = closes.filter(price => !isNaN(price) && price > 0);
    const safeHighs = highs.filter(price => !isNaN(price) && price > 0);
    const safeLows = lows.filter(price => !isNaN(price) && price > 0);
    const safeVolumes = volumes.filter(vol => !isNaN(vol) && vol >= 0);

    logger.debug(`💹 價格數據範圍: ${Math.min(...closes).toFixed(2)} - ${Math.max(...closes).toFixed(2)}`);

    // RSI 計算 (簡化版)
    const rsi = this.calculateRSI(closes);
    
    // 移動平均線 - 計算常用週期
    const ma3 = this.calculateMA(closes, Math.min(3, closes.length));
    const ma7 = this.calculateMA(closes, Math.min(7, closes.length));
    const ma20 = this.calculateMA(closes, Math.min(20, closes.length));
    const ma50 = this.calculateMA(closes, Math.min(50, closes.length));
    
    // 布林帶 (簡化版)
    const bollingerBands = this.calculateBollingerBands(closes);
    
    // 成交量分析
    const volumeAnalysis = this.analyzeVolume(volumes);
    
    // 新增：隨機指標 (Stochastic) %K
    const stochastic = this.calculateStochastic(highs, lows, closes);
    
    // 新增：威廉指標 (Williams %R)
    const williamsR = this.calculateWilliamsR(highs, lows, closes);
    
    // 新增：MACD 指標
    const macd = this.calculateMACD(closes);

    // 安全地檢查所有計算結果，避免undefined/NaN
    const safeRsi = (rsi !== null && !isNaN(rsi)) ? rsi : 50;
    const safeMa3 = (ma3 !== null && !isNaN(ma3)) ? ma3 : closes[closes.length - 1];
    const safeMa7 = (ma7 !== null && !isNaN(ma7)) ? ma7 : closes[closes.length - 1];
    const safeMa20 = (ma20 !== null && !isNaN(ma20)) ? ma20 : closes[closes.length - 1];
    const safeMa50 = (ma50 !== null && !isNaN(ma50)) ? ma50 : closes[closes.length - 1];
    const safeStochastic = (stochastic !== null && !isNaN(stochastic)) ? stochastic : 50;
    const safeWilliamsR = (williamsR !== null && !isNaN(williamsR)) ? williamsR : -50;
    const safeMacd = (macd !== null && !isNaN(macd)) ? macd : 0;
    
    logger.info(`📊 技術指標計算完成 - RSI: ${safeRsi.toFixed(2)}, MACD: ${safeMacd.toFixed(2)}, MA7: ${safeMa7.toFixed(2)}, MA20: ${safeMa20.toFixed(2)}, Williams%R: ${safeWilliamsR.toFixed(2)}`);
    
    return {
      rsi: {
        value: safeRsi,
        interpretation: this.interpretRSI(safeRsi),
        signal: this.getRSISignal(safeRsi)
      },
      macd: {
        value: safeMacd,
        interpretation: this.interpretMACD(safeMacd),
        signal: this.getMACDSignal(safeMacd)
      },
      movingAverages: {
        ma3: safeMa3,
        ma7: safeMa7,
        ma20: safeMa20,
        ma50: safeMa50,
        position: closes[closes.length - 1] > safeMa7 ? '價格位於移動平均線上方' : '價格位於移動平均線下方',
        signal: closes[closes.length - 1] > safeMa7 ? '看漲' : '看跌'
      },
      bollingerBands: {
        upper: bollingerBands.upper || 0,
        middle: bollingerBands.middle || 0,
        lower: bollingerBands.lower || 0,
        position: this.getBollingerPosition(closes[closes.length - 1], bollingerBands),
        signal: this.getBollingerSignal(closes[closes.length - 1], bollingerBands)
      },
      volume: volumeAnalysis || { trend: '平穩', interpretation: '正常', signal: '中性' },
      stochastic: {
        value: safeStochastic,
        interpretation: this.interpretStochastic(safeStochastic),
        signal: this.getStochasticSignal(safeStochastic)
      },
      williamsR: {
        value: safeWilliamsR,
        interpretation: this.interpretWilliamsR(safeWilliamsR),
        signal: this.getWilliamsRSignal(safeWilliamsR)
      },
      priceAction: {
        trend: this.identifyTrend(closes) || '無趨勢',
        volatility: this.calculateVolatility(closes) || 0,
        momentum: this.calculateMomentum(closes) || 0
      }
    };
  }

  /**
   * 計算 RSI
   */
  calculateRSI(prices, period = 6) {
    if (prices.length < period) return 50; // 預設中性值

    const gains = [];
    const losses = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = gains.slice(-period).reduce((sum, val) => sum + val, 0) / period;
    const avgLoss = losses.slice(-period).reduce((sum, val) => sum + val, 0) / period;

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return Math.round(rsi * 100) / 100;
  }

  /**
   * 計算移動平均線
   */
  calculateMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1];
    
    const recentPrices = prices.slice(-period);
    const sum = recentPrices.reduce((sum, price) => sum + price, 0);
    return Math.round((sum / period) * 100) / 100;
  }

  /**
   * 計算布林帶
   */
  calculateBollingerBands(prices, period = 7, multiplier = 2) {
    console.log('🔍 [calculateBollingerBands] 輸入數據:', { 
      pricesLength: prices.length, 
      period, 
      prices: prices.slice(0, 3).concat(prices.length > 3 ? ['...'] : []) 
    });
    
    // 數據驗證：過濾無效值
    const validPrices = prices.filter(price => {
      const isValid = price !== null && price !== undefined && !isNaN(price) && price > 0;
      if (!isValid) {
        console.log(`🔍 [calculateBollingerBands] 發現無效價格: ${price}`);
      }
      return isValid;
    });
    
    console.log('🔍 [calculateBollingerBands] 有效價格數量:', validPrices.length);
    
    if (validPrices.length < Math.min(period, 3)) {
      console.log('⚠️ [calculateBollingerBands] 有效數據不足，使用降級方案');
      const fallbackPrice = validPrices.length > 0 ? validPrices[validPrices.length - 1] : 100000;
      return {
        upper: fallbackPrice * 1.02,
        middle: fallbackPrice,
        lower: fallbackPrice * 0.98
      };
    }

    const usePeriod = Math.min(period, validPrices.length);
    const recentPrices = validPrices.slice(-usePeriod);
    
    console.log('🔍 [calculateBollingerBands] 計算用價格:', recentPrices);
    
    const mean = recentPrices.reduce((sum, price) => sum + price, 0) / usePeriod;
    console.log('🔍 [calculateBollingerBands] 平均價格:', mean);
    
    if (isNaN(mean)) {
      console.error('❌ [calculateBollingerBands] 平均價格計算為 NaN!');
      const fallbackPrice = validPrices[validPrices.length - 1] || 100000;
      return {
        upper: fallbackPrice * 1.02,
        middle: fallbackPrice,
        lower: fallbackPrice * 0.98
      };
    }
    
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / usePeriod;
    const standardDeviation = Math.sqrt(variance);
    
    console.log('🔍 [calculateBollingerBands] 標準差:', standardDeviation);
    
    const result = {
      upper: Math.round((mean + (standardDeviation * multiplier)) * 100) / 100,
      middle: Math.round(mean * 100) / 100,
      lower: Math.round((mean - (standardDeviation * multiplier)) * 100) / 100
    };
    
    // 最終驗證結果
    if (isNaN(result.upper) || isNaN(result.middle) || isNaN(result.lower)) {
      console.error('❌ [calculateBollingerBands] 計算結果包含 NaN!', result);
      const fallbackPrice = mean || validPrices[validPrices.length - 1] || 100000;
      return {
        upper: fallbackPrice * 1.02,
        middle: fallbackPrice,
        lower: fallbackPrice * 0.98
      };
    }
    
    console.log('🔍 [calculateBollingerBands] 計算結果:', result);
    console.trace('布林通道數值計算完成');
    
    return result;
  }

  /**
   * 分析成交量
   */
  analyzeVolume(volumes) {
    if (volumes.length < 3) {
      return {
        trend: '平穩',
        interpretation: '數據不足',
        signal: '中性'
      };
    }

    const recentVolume = volumes.slice(-3);
    const avgVolume = recentVolume.reduce((sum, vol) => sum + vol, 0) / recentVolume.length;
    const latestVolume = volumes[volumes.length - 1];
    
    let trend = '平穩';
    let interpretation = '成交量正常';
    let signal = '中性';

    if (latestVolume > avgVolume * 1.5) {
      trend = '放量';
      interpretation = '成交量大幅增加';
      signal = '注意';
    } else if (latestVolume < avgVolume * 0.5) {
      trend = '縮量';
      interpretation = '成交量減少';
      signal = '觀望';
    }

    return { trend, interpretation, signal };
  }

  /**
   * 識別價格趨勢
   */
  identifyTrend(prices) {
    if (prices.length < 3) return '無趨勢';

    const recent = prices.slice(-3);
    if (recent[2] > recent[1] && recent[1] > recent[0]) {
      return '上升趨勢';
    } else if (recent[2] < recent[1] && recent[1] < recent[0]) {
      return '下降趨勢';
    } else {
      return '震盪';
    }
  }

  /**
   * 計算波動率
   */
  calculateVolatility(prices) {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.round(Math.sqrt(variance) * 100 * 100) / 100; // 轉換為百分比
  }

  /**
   * 計算動量
   */
  calculateMomentum(prices) {
    if (prices.length < 2) return 0;
    
    const momentum = (prices[prices.length - 1] - prices[0]) / prices[0] * 100;
    return Math.round(momentum * 100) / 100;
  }

  /**
   * 計算 MACD 指標
   */
  calculateMACD(prices, fastPeriod = 3, slowPeriod = 6, signalPeriod = 3) {
    if (prices.length < slowPeriod) {
      logger.debug(`⚠️ MACD 計算需要至少 ${slowPeriod} 個數據點，當前只有 ${prices.length}`);
      return null;
    }

    // 計算快速和慢速移動平均線
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    if (!fastEMA || !slowEMA) {
      logger.debug('⚠️ MACD EMA 計算失敗');
      return null;
    }

    // MACD = 快速EMA - 慢速EMA
    const macdValue = fastEMA - slowEMA;
    
    logger.debug(`📊 MACD 計算: 快速EMA=${fastEMA.toFixed(2)}, 慢速EMA=${slowEMA.toFixed(2)}, MACD=${macdValue.toFixed(2)}`);
    
    return Math.round(macdValue * 100) / 100;
  }

  /**
   * 計算指數移動平均線 (EMA)
   */
  calculateEMA(prices, period) {
    if (prices.length < period) return null;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0]; // 第一個值作為初始 EMA
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  /**
   * 計算價格統計
   */
  calculatePriceStatistics(klines, currentPrice) {
    if (!klines || klines.length === 0) {
      return {
        weekHigh: currentPrice?.price || 0,
        weekLow: currentPrice?.price || 0,
        weekAvg: currentPrice?.price || 0,
        currentPosition: 'middle'
      };
    }

    const highs = klines.map(k => parseFloat(k.high));
    const lows = klines.map(k => parseFloat(k.low));
    const closes = klines.map(k => parseFloat(k.close));

    const weekHigh = Math.max(...highs);
    const weekLow = Math.min(...lows);
    const weekAvg = closes.reduce((sum, close) => sum + close, 0) / closes.length;
    
    const current = currentPrice?.price || closes[closes.length - 1];
    let currentPosition = 'middle';
    
    if (current > weekAvg * 1.02) {
      currentPosition = 'upper';
    } else if (current < weekAvg * 0.98) {
      currentPosition = 'lower';
    }

    return {
      weekHigh: Math.round(weekHigh * 100) / 100,
      weekLow: Math.round(weekLow * 100) / 100,
      weekAvg: Math.round(weekAvg * 100) / 100,
      currentPosition
    };
  }

  /**
   * 執行 AI 分析 (多層級備援：OpenRouter Gemini → OpenRouter Llama → LM Studio → 降級)
   */
  async performAIAnalysis(symbol, data) {
    // 檢查 OpenRouter 是否配置
    if (this.isConfigured()) {
      // 嘗試 OpenRouter 多模型備援
      for (const model of this.modelFallbackChain) {
        try {
          logger.info(`☁️ 使用 OpenRouter 模型 ${model} 進行 ${symbol} AI 分析...`);
          const result = await this.performOpenRouterAnalysisWithModel(symbol, data, model);
          logger.info(`✅ OpenRouter ${model} ${symbol} AI 分析成功`);
          return result;
          
        } catch (modelError) {
          logger.error(`❌ OpenRouter ${model} ${symbol} 分析失敗: ${modelError.message}`);
          
          // 檢查是否為需要切換模型的錯誤
          const shouldSwitchModel = (
            modelError.message.includes('429') ||             // 限制錯誤
            modelError.message.includes('408') ||             // 超時錯誤
            modelError.message.includes('使用額度限制') ||      // 中文錯誤訊息
            modelError.message.includes('rate-limited') ||    // 上游限制
            modelError.message.includes('Timed out') ||       // OpenRouter 超時
            modelError.message.includes('503') ||             // 服務不可用
            modelError.message.includes('502') ||             // 網關錯誤
            modelError.message.includes('invalid') ||         // 無效請求
            modelError.message.includes('model not found') || // 模型不存在
            modelError.message.includes('temporarily rate-limited upstream') // 上游限制
          );
          
          if (shouldSwitchModel) {
            logger.info(`🔄 模型 ${model} 遇到問題，嘗試下一個模型...`);
            continue; // 嘗試下一個模型
          } else {
            // 非模型特定錯誤，可能是系統錯誤，不嘗試其他模型
            logger.warn(`⚠️ 模型 ${model} 發生系統錯誤，停止嘗試其他模型`);
            break;
          }
        }
      }
      
      logger.info(`🔄 所有 OpenRouter 模型都失敗，使用技術指標降級分析`);
    } else {
      logger.info(`🏠 OpenRouter 未配置，使用技術指標降級分析`);
    }
    
    // 使用技術指標分析作為降級方案
    logger.info(`🔄 使用基於技術指標的降級分析方案`);
    return this.generateFallbackAnalysis(symbol, data);
  }

  /**
   * 生成降級分析（基於技術指標）
   */
  generateFallbackAnalysis(symbol, data) {
    logger.info(`🔧 為 ${symbol} 生成基於技術指標的降級分析`);
    
    const technicalIndicators = data.technicalIndicators;
    const priceChange = data.ticker24h?.priceChangePercent || 0;
    
    // 基於RSI和價格變化判斷趨勢
    let trendDirection = 'neutral';
    let confidence = 60;
    
    if (technicalIndicators?.rsi?.value) {
      const rsi = technicalIndicators.rsi.value;
      if (rsi > 70 && priceChange > 0) {
        trendDirection = 'bullish';
        confidence = 75;
      } else if (rsi < 30 && priceChange < 0) {
        trendDirection = 'bearish';
        confidence = 75;
      } else if (priceChange > 5) {
        trendDirection = 'bullish';
        confidence = 65;
      } else if (priceChange < -5) {
        trendDirection = 'bearish';
        confidence = 65;
      }
    }
    
    return {
      success: true,
      provider: 'fallback',
      model: 'technical-indicators',
      analysis: {
        trend: {
          direction: trendDirection,
          confidence: confidence,
          summary: `基於技術指標分析，${symbol} 當前趨勢為${trendDirection === 'bullish' ? '看漲' : trendDirection === 'bearish' ? '看跌' : '中性'}，24小時變化${priceChange}%`
        },
        technicalAnalysis: {
          rsi: {
            value: technicalIndicators?.rsi?.value || 50,
            signal: technicalIndicators?.rsi?.signal || '持有',
            interpretation: technicalIndicators?.rsi?.interpretation || 'RSI指標正常'
          },
          macd: {
            value: technicalIndicators?.macd?.value || 0,
            signal: technicalIndicators?.macd?.signal || '持有',
            interpretation: technicalIndicators?.macd?.interpretation || 'MACD指標正常'
          },
          movingAverage: {
            value: technicalIndicators?.movingAverages?.ma7 || null,
            signal: technicalIndicators?.movingAverages?.signal || '持有',
            interpretation: technicalIndicators?.movingAverages?.position || '移動平均線分析'
          },
          bollingerBands: {
            value: technicalIndicators?.bollingerBands?.middle || null,
            signal: technicalIndicators?.bollingerBands?.signal || '持有',
            interpretation: technicalIndicators?.bollingerBands?.position || '布林帶分析基於價格位置'
          },
          volume: {
            value: null, // 成交量沒有單一數值，使用 null
            signal: technicalIndicators?.volume?.signal || '持有',
            interpretation: technicalIndicators?.volume?.interpretation || '成交量正常'
          },
          williamsR: {
            value: technicalIndicators?.williamsR?.value || -50,
            signal: technicalIndicators?.williamsR?.signal || '持有',
            interpretation: technicalIndicators?.williamsR?.interpretation || '威廉指標中性'
          }
        },
        marketSentiment: {
          score: priceChange > 0 ? 60 : priceChange < 0 ? 40 : 50,
          label: 'neutral',
          summary: `基於價格變化的市場情緒評估：${priceChange > 5 ? '積極' : priceChange < -5 ? '謹慎' : '中性'}`
        }
      },
      usage: { total_tokens: 0 }
    };
  }

  /**
   * 使用指定模型進行 OpenRouter AI 分析
   */
  async performOpenRouterAnalysisWithModel(symbol, data, model) {
    const originalModel = this.model;
    this.model = model; // 臨時切換模型
    
    try {
      const result = await this.performOpenRouterAnalysis(symbol, data);
      return result;
    } finally {
      this.model = originalModel; // 恢復原始模型
    }
  }

  /**
   * 使用 OpenRouter 執行 AI 分析
   */
  async performOpenRouterAnalysis(symbol, data) {
    const prompt = this.buildAnalysisPrompt(symbol, data);
    
    // 為 Gemini 2.0 Flash 設置合理的超時時間（30秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(this.openRouterUrl, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nexustrade.com',
        'X-Title': 'NexusTrade Currency Analysis'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是一位專業的加密貨幣技術分析師。請根據提供的技術指標數據進行分析，直接輸出 JSON 格式的分析結果。使用繁體中文填寫分析內容。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 8000,  // 大幅提高 token 限制確保 Qwen 2.5-72B 完整回應
        temperature: 0.1   // 降低 temperature 獲得更穩定的 JSON 格式
      })
    });

    // 清理超時定時器
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`OpenRouter API 錯誤 ${response.status}:`, errorText);
      
      // 針對429錯誤提供更詳細的處理和誤報檢查
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const rateLimitInfo = response.headers.get('x-ratelimit-remaining');
        const rateLimitReset = response.headers.get('x-ratelimit-reset');
        
        logger.warn(`⚠️ OpenRouter API 達到使用限制`);
        logger.warn(`剩餘額度: ${rateLimitInfo || '未知'}`);
        logger.warn(`建議等待時間: ${retryAfter || '未知'} 秒`);
        logger.warn(`限制重置時間: ${rateLimitReset || '未知'}`);
        
        // 檢查是否為誤報：如果剩餘額度不為 0，可能是誤報
        if (rateLimitInfo && parseInt(rateLimitInfo) > 0) {
          logger.warn(`🚨 可能的 429 誤報：剩餘額度為 ${rateLimitInfo}，但返回 429 錯誤`);
        }
        
        throw new Error(`OpenRouter API 使用額度限制。剩餘額度: ${rateLimitInfo || '0'}，建議等待: ${retryAfter || '60'} 秒`);
      }
      
      // 其他HTTP錯誤
      throw new Error(`OpenRouter API 錯誤: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    // 記錄 OpenRouter 完整原始回應以便除錯
    logger.info('🔍 OpenRouter 完整原始回應:', JSON.stringify(result, null, 2));
    
    logger.debug('OpenRouter 原始回應結構:', {
      hasChoices: !!result.choices,
      choicesLength: result.choices?.length || 0,
      usage: result.usage,
      model: result.model,
      includeReasoning: !!result.reasoning  // 檢查是否包含推理內容
    });
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      logger.error('OpenRouter API 回應格式錯誤，完整回應:', JSON.stringify(result, null, 2));
      throw new Error('OpenRouter API 回應格式錯誤');
    }

    // 優化的模型回應處理 - 所有頂級免費模型都是非推理型
    const message = result.choices[0].message;
    
    // 🔧 簡化：直接使用標準的 message.content
    let aiResponse;
    
    if (message.content && typeof message.content === 'string' && message.content.trim().length > 0) {
      aiResponse = message.content;
      logger.info('✅ 使用標準 message.content');
      logger.debug('AI 回應長度:', message.content.length);
    } else {
      logger.error('❌ 無法獲取 AI 回應內容');
      logger.debug('message 結構:', {
        hasContent: !!message.content,
        contentType: typeof message.content,
        contentLength: message.content ? message.content.length : 0,
        messageKeys: Object.keys(message)
      });
      aiResponse = null;
    }
    let modelType = 'direct_response'; // 直接回應型模型
    
    // 識別模型類型以便除錯
    if (this.model.includes('qwen-2.5-72b')) {
      modelType = 'qwen-2.5-72b';
    } else if (this.model.includes('llama-3.1-8b')) {
      modelType = 'llama-3.1-8b';  
    } else if (this.model.includes('llama-3.2-3b')) {
      modelType = 'llama-3.2-3b';
    } else if (this.model.includes('mistral')) {
      modelType = 'mistral';
    }
    
    // 簡化檢查：這些頂級模型都應該在 content 中直接提供 JSON
    if (!aiResponse || aiResponse.trim() === '') {
      logger.error(`❌ ${modelType} 模型回應內容為空`);
      logger.debug('完整 message 結構:', JSON.stringify(message, null, 2));
      throw new Error(`${modelType} AI 回應內容為空`);
    }
    
    logger.info(`OpenRouter AI 回應內容長度: ${aiResponse ? aiResponse.length : 0}`);
    logger.info(`OpenRouter AI 回應類型: ${typeof aiResponse}`);
    logger.info(`OpenRouter AI 模型類型: ${modelType}`);
    logger.info(`OpenRouter AI 回應是否為空: ${!aiResponse}`);
    
    if (aiResponse) {
      logger.debug('OpenRouter AI 回應前500字符:', aiResponse.substring(0, 500));
      logger.debug('OpenRouter AI 回應最後500字符:', aiResponse.substring(Math.max(0, aiResponse.length - 500)));
      
      // 記錄完整的 AI 回應以便除錯
      logger.debug('🔍 完整 AI 回應內容 (用於除錯):', aiResponse);
      
      // 對於短回應，直接輸出完整內容
      if (aiResponse.length < 100) {
        logger.info(`完整短回應內容: ${JSON.stringify(aiResponse)}`);
      }
    } else {
      logger.error('❌ OpenRouter AI 回應內容和 reasoning 都為空');
      logger.debug('完整的 choices[0].message:', JSON.stringify(result.choices[0].message, null, 2));
    }
    
    const parsedResult = this.parseAIResponse(aiResponse, result);
    
    return {
      success: true,
      provider: 'openrouter',
      model: this.model,
      analysis: parsedResult.analysis, // 修復雙重嵌套問題
      usage: result.usage,
      tokensUsed: parsedResult.tokensUsed
    };
  }

  /**
   * 建立分析提示詞
   */
  buildAnalysisPrompt(symbol, data) {
    const { currentPrice, ticker24h, technicalIndicators } = data;
    
    return `分析 ${symbol} 加密貨幣，當前價格 $${currentPrice?.price || 'N/A'}，24h變化 ${ticker24h?.priceChangePercent || 'N/A'}%

技術指標：
RSI: ${technicalIndicators.rsi.value}
MACD: ${technicalIndicators.macd.value}  
MA7: ${technicalIndicators.movingAverages.ma7}
Williams %R: ${technicalIndicators.williamsR.value}

請提供JSON格式分析：
{
  "trend": {"direction": "bullish/bearish/neutral", "confidence": 75, "summary": "趨勢總結"},
  "technicalAnalysis": {
    "rsi": {"signal": "買入/賣出/持有", "interpretation": "RSI分析"},
    "macd": {"signal": "買入/賣出/持有", "interpretation": "MACD分析"},
    "movingAverage": {"signal": "看漲/看跌/持有", "interpretation": "均線分析"},
    "bollingerBands": {"signal": "買入/賣出/等待突破", "interpretation": "布林帶分析"},
    "volume": {"signal": "觀望/積極/謹慎", "interpretation": "成交量分析"},
    "williamsR": {"signal": "買入/賣出/持有", "interpretation": "威廉指標分析"}
  },
  "marketSentiment": {"score": 65, "label": "neutral", "summary": "情緒評估"}
}

只回應JSON：
`;
  }

  /**
   * 解析 AI 回應
   */
  parseAIResponse(aiResponse, rawResult, modelType = 'unknown') {
    try {
      logger.info('🔍 開始解析 AI 回應，回應長度:', aiResponse ? aiResponse.length : 'undefined');
      logger.info('🔍 AI 模型類型:', modelType);
      logger.info('🔍 AI 回應類型:', typeof aiResponse);
      logger.info('🔍 AI 回應是否存在:', !!aiResponse);
      if (aiResponse) {
        logger.debug('AI 回應前200字符:', aiResponse.substring(0, 200));
        logger.info('🔍 字串化檢測 - 開始字符:', JSON.stringify(aiResponse.substring(0, 3)));
        logger.info('🔍 字串化檢測 - 結束字符:', JSON.stringify(aiResponse.substring(aiResponse.length - 3)));
        logger.info('🔍 字串化檢測 - startsWith("):', aiResponse.startsWith('"'));
        logger.info('🔍 字串化檢測 - endsWith("):', aiResponse.endsWith('"'));
      } else {
        logger.error('❌ AI 回應為空或未定義');
      }
      
      let jsonContent = null;
      let extractedJson = null;
      
      // 🔧 修復：優先處理字串化 JSON 的情況
      // 檢查是否為 OpenRouter 字串化 JSON 回應
      if (aiResponse && typeof aiResponse === 'string' && 
          (aiResponse.startsWith('"') && aiResponse.endsWith('"') ||
           aiResponse.includes('\\"trend\\"') || aiResponse.includes('\\"technicalAnalysis\\"'))) {
        logger.info('🔧 檢測到字串化 JSON，嘗試反序列化');
        try {
          let jsonString = aiResponse;
          
          // 如果是被引號包裹的字串化 JSON
          if (aiResponse.startsWith('"') && aiResponse.endsWith('"')) {
            try {
              jsonString = JSON.parse(aiResponse);
              logger.info('✅ 字串化 JSON 外層解析成功');
            } catch (outerParseError) {
              logger.debug('❌ 外層解析失敗，嘗試手動處理:', outerParseError.message);
              // 手動移除引號並處理轉義
              jsonString = aiResponse.slice(1, -1)
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\r/g, '\r')
                .replace(/\\\\/g, '\\')
                .replace(/\\"/g, '"');
            }
          }
          
          // 清理控制字符
          const cleanedJson = jsonString
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字符
            .replace(/,(\s*[}\]])/g, '$1') // 移除尾隨逗號
            .trim();
          
          // 解析最終 JSON
          extractedJson = JSON.parse(cleanedJson);
          logger.info('✅ 字串化 JSON 完全解析成功');
          
        } catch (stringParseError) {
          logger.debug('❌ 字串化 JSON 解析失敗:', stringParseError.message);
          // 繼續使用常規解析策略
        }
      }
      
      // 如果字串化解析成功，跳過其他解析策略
      if (!extractedJson) {
        // 🔧 優先嘗試直接解析 AI 回應，因為大多數模型直接返回 JSON
        logger.debug('⚡ 嘗試直接解析 AI 回應（跳過提取策略）');
        try {
          // 先清理可能的控制字符
          const cleanedResponse = aiResponse
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字符
            .replace(/,(\s*[}\]])/g, '$1') // 移除尾隨逗號
            .trim();
          
          extractedJson = JSON.parse(cleanedResponse);
          logger.info('✅ 直接解析 AI 回應成功，跳過提取策略');
          
        } catch (directParseError) {
          logger.debug('❌ 直接解析失敗，使用提取策略:', directParseError.message);
          
          // 如果直接解析失敗，才使用提取策略
          if (modelType === 'gemini') {
            // Gemini 2.0 Flash 優先解析策略
            jsonContent = this.parseGeminiResponse(aiResponse);
            
          } else if (modelType === 'llama') {
            // Meta-Llama 4 Scout 優先解析策略
            jsonContent = this.parseLlamaResponse(aiResponse);
            
          } else if (modelType === 'deepseek') {
            // DeepSeek R1 優先解析策略
            jsonContent = this.parseDeepSeekResponse(aiResponse);
            
          } else {
            // 通用解析策略
            jsonContent = this.parseGenericResponse(aiResponse);
          }
          
          // 如果特定模型解析失敗，嘗試通用解析
          if (!jsonContent && modelType !== 'generic') {
            logger.info('⚠️ 特定模型解析失敗，嘗試通用解析...');
            jsonContent = this.parseGenericResponse(aiResponse);
          }
          
          if (!jsonContent) {
            logger.error('❌ 所有JSON提取策略都失敗');
            throw new Error('AI 回應中未找到 JSON 格式數據');
          }
          
          // 清理和修復JSON格式
          jsonContent = jsonContent
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字符
            .replace(/,(\s*[}\]])/g, '$1') // 移除尾隨逗號
            .trim();
          
          logger.debug('清理後的JSON:', jsonContent.substring(0, 200));
          
          // 解析JSON - 增強修復能力
          try {
            extractedJson = JSON.parse(jsonContent);
          } catch (parseError) {
            logger.warn('⚠️ 首次JSON解析失敗，嘗試修復:', parseError.message);
            
            // 嘗試多種修復策略
            const repairStrategies = [
              // 策略1: 修復常見的引號問題
              (text) => text.replace(/'/g, '"').replace(/([{,]\s*)(\w+):/g, '$1"$2":'),
              
              // 策略2: 修復尾隨逗號和多餘字符
              (text) => text.replace(/,\s*([}\]])/g, '$1').replace(/([}\]])(?!\s*[,}\]])/g, '$1'),
              
              // 策略3: 修復JSON中斷問題
              (text) => {
                // 如果JSON被截斷，嘗試補全
                let fixed = text.trim();
                if (!fixed.endsWith('}')) {
                  // 計算需要多少個閉合括號
                  const openBraces = (fixed.match(/\{/g) || []).length;
                  const closeBraces = (fixed.match(/\}/g) || []).length;
                  const missing = openBraces - closeBraces;
                  for (let i = 0; i < missing; i++) {
                    fixed += '}';
                  }
                }
                return fixed;
              }
            ];
            
            let repaired = false;
            for (let i = 0; i < repairStrategies.length; i++) {
              try {
                const repairedJson = repairStrategies[i](jsonContent);
                extractedJson = JSON.parse(repairedJson);
                logger.info(`✅ JSON修復成功 (策略 ${i + 1})`);
                repaired = true;
                break;
              } catch (repairError) {
                logger.debug(`❌ 修復策略 ${i + 1} 失敗: ${repairError.message}`);
                continue;
              }
            }
            
            if (!repaired) {
              logger.error('❌ 所有JSON修復策略都失敗');
              logger.error('原始錯誤:', parseError.message);
              logger.error('問題JSON內容 (前500字符):', jsonContent.substring(0, 500));
              logger.error('問題JSON內容 (後500字符):', jsonContent.substring(Math.max(0, jsonContent.length - 500)));
              throw new Error(`JSON 解析失敗: ${parseError.message}`);
            }
          }
        }
      }
      
      // 驗證必要欄位
      if (!extractedJson.trend || !extractedJson.technicalAnalysis || !extractedJson.marketSentiment) {
        logger.error('❌ JSON結構驗證失敗，缺少必要欄位');
        logger.error('解析得到的結構:', Object.keys(extractedJson));
        logger.error('完整解析結果:', JSON.stringify(extractedJson, null, 2));
        throw new Error('AI 回應缺少必要的分析欄位');
      }
      
      logger.info('✅ JSON解析成功，包含所有必要欄位');
      
      // 布林通道數值追蹤：檢查解析後是否包含完整數值
      if (extractedJson.technicalAnalysis && extractedJson.technicalAnalysis.bollingerBands) {
        console.log('🔍 [parseAIResponse] 解析後布林通道數值:', extractedJson.technicalAnalysis.bollingerBands);
        console.trace('解析後布林通道數值檢查');
      }
      
      // 修復技術指標資料完整性
      const fixedAnalysis = this.fixTechnicalIndicatorsData(extractedJson);
      
      return {
        analysis: fixedAnalysis,
        rawResponse: aiResponse,
        tokensUsed: rawResult.usage ? rawResult.usage.total_tokens : 0,
        model: rawResult.model || this.model,
        modelType: modelType
      };

    } catch (error) {
      logger.error('解析 AI 回應失敗:', error);
      
      // 返回預設分析結果
      return {
        analysis: this.getDefaultAnalysis(),
        rawResponse: aiResponse,
        tokensUsed: 0,
        model: this.model,
        modelType: modelType || 'unknown',
        parseError: error.message
      };
    }
  }

  /**
   * 獲取預設分析結果
   */
  getDefaultAnalysis() {
    return {
      trend: {
        direction: 'neutral',
        confidence: 50,
        summary: '由於數據處理問題，暫時無法提供準確的趨勢分析'
      },
      technicalAnalysis: {
        rsi: { value: 50, interpretation: '中性', signal: '持有' },
        macd: { value: 0, signal: '持有', interpretation: '無明確訊號' },
        movingAverage: { ma20: 0, ma50: 0, position: '待確認', signal: '持有' },
        bollingerBands: { position: '中軌', squeeze: false, signal: '等待' },
        volume: { trend: '平穩', interpretation: '成交量正常', signal: '中性' },
        williamsR: { value: -50, interpretation: '中性區域', signal: '持有' }
      },
      marketSentiment: {
        score: 50,
        label: 'neutral',
        factors: [{ factor: '數據處理', impact: '中性', description: '系統處理中' }],
        summary: '市場情緒分析暫時不可用'
      }
    };
  }

  /**
   * 獲取預設技術指標
   */
  getDefaultTechnicalIndicators() {
    return {
      rsi: { value: 50, interpretation: '中性', signal: '持有' },
      movingAverages: { ma3: 0, ma7: 0, position: '數據不足', signal: '待確認' },
      bollingerBands: { upper: 0, middle: 0, lower: 0, position: '中軌', signal: '等待' },
      volume: { trend: '平穩', interpretation: '數據不足', signal: '中性' },
      stochastic: { value: 50, interpretation: '中性', signal: '持有' },
      williamsR: { value: -50, interpretation: '中性區域', signal: '持有' },
      priceAction: { trend: '無趨勢', volatility: 0, momentum: 0 }
    };
  }

  /**
   * 計算隨機指標 (Stochastic %K)
   */
  calculateStochastic(highs, lows, closes, period = 14) {
    if (closes.length < period) {
      // 對於較短的數據，使用可用的全部數據
      period = Math.max(3, closes.length);
    }
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    if (highestHigh === lowestLow) {
      return 50; // 避免除零，返回中性值
    }
    
    const stochasticK = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    return Math.round(stochasticK * 100) / 100;
  }

  /**
   * 解讀隨機指標
   */
  interpretStochastic(stochastic) {
    if (stochastic > 80) return '超買';
    if (stochastic < 20) return '超賣';
    if (stochastic > 50) return '偏強';
    return '偏弱';
  }

  /**
   * 獲取隨機指標信號
   */
  getStochasticSignal(stochastic) {
    if (stochastic > 80) return '賣出';
    if (stochastic < 20) return '買入';
    if (stochastic > 60) return '看漲';
    if (stochastic < 40) return '看跌';
    return '持有';
  }

  /**
   * 計算威廉指標 (Williams %R)
   */
  calculateWilliamsR(highs, lows, closes, period = 14) {
    if (closes.length < period) {
      // 對於較短的數據，使用可用的全部數據
      period = Math.max(3, closes.length);
    }
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    if (highestHigh === lowestLow) return -50; // 避免除零
    
    const williamsR = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
    
    return Math.round(williamsR * 100) / 100; // 四捨五入到小數點後兩位
  }

  /**
   * 解讀威廉指標
   */
  interpretWilliamsR(williamsR) {
    if (williamsR > -20) return '超買區域';
    if (williamsR < -80) return '超賣區域';
    if (williamsR > -40) return '偏強勢';
    if (williamsR < -60) return '偏弱勢';
    return '中性區域';
  }

  /**
   * 獲取威廉指標信號
   */
  getWilliamsRSignal(williamsR) {
    if (williamsR > -20) return '賣出';
    if (williamsR < -80) return '買入';
    if (williamsR > -40) return '看漲';
    if (williamsR < -60) return '看跌';
    return '持有';
  }

  /**
   * 合併我們計算的技術指標數值與 AI 的分析判斷
   */
  mergeTechnicalIndicatorsWithAI(aiAnalysis, ourTechnicalIndicators) {
    logger.info('🔧 合併技術指標數值與 AI 分析判斷');
    
    // 如果 AI 分析失敗，直接使用我們的技術指標
    if (!aiAnalysis || !aiAnalysis.technicalAnalysis) {
      logger.warn('⚠️ AI 分析不完整，使用純技術指標結果');
      return {
        trend: {
          direction: 'neutral',
          confidence: 60,
          summary: '基於技術指標的分析結果'
        },
        technicalAnalysis: {
          rsi: ourTechnicalIndicators.rsi,
          macd: ourTechnicalIndicators.macd,
          movingAverage: {
            value: ourTechnicalIndicators.movingAverages?.ma7 || null,
            signal: ourTechnicalIndicators.movingAverages?.signal || '持有',
            interpretation: ourTechnicalIndicators.movingAverages?.position || '移動平均線分析'
          },
          bollingerBands: {
            value: ourTechnicalIndicators.bollingerBands?.middle || null,
            signal: ourTechnicalIndicators.bollingerBands?.signal || '持有',
            interpretation: ourTechnicalIndicators.bollingerBands?.position || '布林帶分析'
          },
          volume: {
            value: null,
            signal: ourTechnicalIndicators.volume?.signal || '持有',
            interpretation: ourTechnicalIndicators.volume?.interpretation || '成交量分析'
          },
          williamsR: ourTechnicalIndicators.williamsR
        },
        marketSentiment: {
          score: 50,
          label: 'neutral',
          summary: '基於技術指標的市場情緒評估'
        }
      };
    }
    
    // 合併我們的精確數值 + AI 的專業判斷
    const merged = JSON.parse(JSON.stringify(aiAnalysis)); // 深度複製
    
    // 確保技術指標有我們計算的精確數值
    if (merged.technicalAnalysis) {
      // RSI: 使用我們的計算值，保留 AI 的判斷
      if (ourTechnicalIndicators.rsi && merged.technicalAnalysis.rsi) {
        merged.technicalAnalysis.rsi.value = ourTechnicalIndicators.rsi.value;
      }
      
      // MACD: 使用我們的計算值，保留 AI 的判斷
      if (ourTechnicalIndicators.macd && merged.technicalAnalysis.macd) {
        merged.technicalAnalysis.macd.value = ourTechnicalIndicators.macd.value;
      }
      
      // Moving Average: 使用我們的計算值，確保有有效數據
      if (ourTechnicalIndicators.movingAverages && merged.technicalAnalysis.movingAverage) {
        const ma7 = ourTechnicalIndicators.movingAverages.ma7;
        const ma20 = ourTechnicalIndicators.movingAverages.ma20;
        
        // 使用可用的移動平均線數值
        if (ma7 && ma7 > 0) {
          merged.technicalAnalysis.movingAverage.value = ma7;
          merged.technicalAnalysis.movingAverage.ma7 = ma7;
        }
        if (ma20 && ma20 > 0) {
          merged.technicalAnalysis.movingAverage.ma20 = ma20;
          if (!merged.technicalAnalysis.movingAverage.value) {
            merged.technicalAnalysis.movingAverage.value = ma20;
          }
        }
      }
      
      // Bollinger Bands: 強制使用我們的計算值，確保數值不被覆蓋
      if (ourTechnicalIndicators.bollingerBands) {
        // 從我們自己計算的指標中獲取所有精確數值
        const { upper, middle, lower, position, signal } = ourTechnicalIndicators.bollingerBands;
        
        // 確保布林通道物件存在
        if (!merged.technicalAnalysis.bollingerBands) {
          merged.technicalAnalysis.bollingerBands = {};
        }
        
        // 強制覆寫計算出的數值，確保數值不被 AI 回應覆蓋
        merged.technicalAnalysis.bollingerBands.upper = upper || 0;
        merged.technicalAnalysis.bollingerBands.middle = middle || 0;
        merged.technicalAnalysis.bollingerBands.lower = lower || 0;
        
        // 保留我們的位置分析，但允許 AI 提供更詳細的解讀
        if (!merged.technicalAnalysis.bollingerBands.position || 
            merged.technicalAnalysis.bollingerBands.position === '中軌' ||
            merged.technicalAnalysis.bollingerBands.position === '中軌附近') {
          merged.technicalAnalysis.bollingerBands.position = position || '中軌附近';
        }
        
        // 保留我們的信號，如果 AI 沒有提供更好的信號
        if (!merged.technicalAnalysis.bollingerBands.signal || 
            merged.technicalAnalysis.bollingerBands.signal === '持有' ||
            merged.technicalAnalysis.bollingerBands.signal === '等待') {
          merged.technicalAnalysis.bollingerBands.signal = signal || '等待突破';
        }
        
        // 移除可能存在的舊 'value' 欄位，避免混淆
        delete merged.technicalAnalysis.bollingerBands.value;
        
        // 布林通道數值追蹤：確認合併後的數值
        console.log('🔍 [mergeTechnicalIndicatorsWithAI] 布林通道數值合併完成:', {
          upper: merged.technicalAnalysis.bollingerBands.upper,
          middle: merged.technicalAnalysis.bollingerBands.middle,
          lower: merged.technicalAnalysis.bollingerBands.lower,
          position: merged.technicalAnalysis.bollingerBands.position,
          signal: merged.technicalAnalysis.bollingerBands.signal
        });
      }
      
      // Williams %R: 強制使用我們的計算值，確保數值不被覆蓋
      if (ourTechnicalIndicators.williamsR) {
        // 確保 Williams %R 物件存在
        if (!merged.technicalAnalysis.williamsR) {
          merged.technicalAnalysis.williamsR = {};
        }
        
        // 從我們的計算中獲取所有數值
        const { value, interpretation, signal } = ourTechnicalIndicators.williamsR;
        
        // 強制設定計算出的數值
        if (value !== null && value !== undefined && !isNaN(value)) {
          merged.technicalAnalysis.williamsR.value = value;
        }
        
        // 保留我們的解讀，但允許 AI 提供更詳細的解讀
        if (!merged.technicalAnalysis.williamsR.interpretation || 
            merged.technicalAnalysis.williamsR.interpretation === '數據分析中' ||
            merged.technicalAnalysis.williamsR.interpretation === '中性區域') {
          merged.technicalAnalysis.williamsR.interpretation = interpretation || '威廉指標分析';
        }
        
        // 保留我們的信號，如果 AI 沒有提供更好的信號
        if (!merged.technicalAnalysis.williamsR.signal || 
            merged.technicalAnalysis.williamsR.signal === '觀望' ||
            merged.technicalAnalysis.williamsR.signal === '持有') {
          merged.technicalAnalysis.williamsR.signal = signal || '持有';
        }
        
        // Williams %R 數值追蹤：確認合併後的數值
        console.log('🔍 [mergeTechnicalIndicatorsWithAI] Williams %R 數值合併完成:', {
          value: merged.technicalAnalysis.williamsR.value,
          interpretation: merged.technicalAnalysis.williamsR.interpretation,
          signal: merged.technicalAnalysis.williamsR.signal
        });
      }
    }
    
    logger.info('✅ 技術指標數值與 AI 判斷合併完成');
    return merged;
  }

  /**
   * 儲存分析結果到資料庫
   */
  async saveAnalysisResult(symbol, aiAnalysis, sourceData) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 合併我們的技術指標數值與 AI 的分析判斷
      const mergedAnalysis = this.mergeTechnicalIndicatorsWithAI(aiAnalysis.analysis, sourceData.technicalIndicators);
      
      // 規範化分析結果以符合 MongoDB Schema
      const normalizedAnalysis = this.normalizeAnalysisForSchema(mergedAnalysis);
      
      const analysisResult = new AIAnalysisResult({
        analysisType: 'single_currency',
        analysisDate: today,
        symbol: symbol.toUpperCase(),
        analysis: normalizedAnalysis,
        dataSources: {
          symbols: [symbol],
          newsCount: 0, // 單一貨幣分析不使用新聞
          dataTimestamp: new Date(sourceData.timestamp),
          analysisModel: aiAnalysis.model
        },
        qualityMetrics: {
          tokensUsed: aiAnalysis.tokensUsed || 0,
          processingTime: Date.now() - Date.parse(sourceData.timestamp),
          dataCompleteness: this.calculateDataCompleteness(sourceData),
          confidence: (aiAnalysis.analysis && aiAnalysis.analysis.trend && aiAnalysis.analysis.trend.confidence) || 50
        }
      });

      await analysisResult.save();
      
      logger.info(`✅ ${symbol} 分析結果已儲存: ${analysisResult._id}`);
      return analysisResult;

    } catch (error) {
      logger.error(`儲存 ${symbol} 分析結果失敗:`, error);
      throw new Error(`分析結果儲存失敗: ${error.message}`);
    }
  }

  /**
   * 規範化分析結果以符合 MongoDB Schema
   */
  normalizeAnalysisForSchema(analysis) {
    // 深度複製避免修改原始數據
    const normalized = JSON.parse(JSON.stringify(analysis));
    
    // 規範化趨勢方向
    if (normalized.trend && normalized.trend.direction) {
      const direction = normalized.trend.direction.toLowerCase();
      if (direction.includes('bull') || direction.includes('看漲')) {
        normalized.trend.direction = 'bullish';
      } else if (direction.includes('bear') || direction.includes('看跌')) {
        normalized.trend.direction = 'bearish';
      } else {
        normalized.trend.direction = 'neutral';
      }
    }
    
    // 規範化市場情緒標籤
    if (normalized.marketSentiment && normalized.marketSentiment.label) {
      const label = normalized.marketSentiment.label.toLowerCase();
      const score = normalized.marketSentiment.score || 50;
      
      // 根據分數和標籤內容映射到允許的枚舉值
      if (score <= 20 || label.includes('extreme') && label.includes('fear')) {
        normalized.marketSentiment.label = 'extreme_fear';
      } else if (score <= 40 || label.includes('fear') || label.includes('bearish')) {
        normalized.marketSentiment.label = 'fear';
      } else if (score >= 80 || label.includes('extreme') && label.includes('greed')) {
        normalized.marketSentiment.label = 'extreme_greed';
      } else if (score >= 60 || label.includes('greed') || label.includes('bullish')) {
        normalized.marketSentiment.label = 'greed';
      } else {
        normalized.marketSentiment.label = 'neutral';
      }
    }
    
    // 清理技術指標的所有欄位 (關鍵修復)
    if (normalized.technicalAnalysis) {
      Object.keys(normalized.technicalAnalysis).forEach(key => {
        const indicator = normalized.technicalAnalysis[key];
        if (indicator && typeof indicator === 'object') {
          // 處理 value 欄位
          if (indicator.value === undefined || 
              indicator.value === 'N/A' || 
              indicator.value === 'null' || 
              indicator.value === 'undefined' || 
              indicator.value === '') {
            indicator.value = null;
          } else if (typeof indicator.value === 'string') {
            // 嘗試轉換為數字
            const numValue = parseFloat(indicator.value);
            indicator.value = isNaN(numValue) ? null : numValue;
          }
          
          // 處理 interpretation 欄位
          if (indicator.interpretation === undefined || 
              indicator.interpretation === 'N/A' || 
              indicator.interpretation === 'null' || 
              indicator.interpretation === 'undefined' || 
              !indicator.interpretation || 
              indicator.interpretation.trim() === '') {
            indicator.interpretation = '數據分析中';
          }
          
          // 處理 signal 欄位
          if (indicator.signal === undefined || 
              indicator.signal === 'N/A' || 
              indicator.signal === 'null' || 
              indicator.signal === 'undefined' || 
              !indicator.signal || 
              indicator.signal.trim() === '') {
            indicator.signal = '觀望';
          }
        }
      });
    }
    
    // 確保信心度在有效範圍內
    if (normalized.trend && normalized.trend.confidence) {
      normalized.trend.confidence = Math.min(100, Math.max(0, normalized.trend.confidence));
    }
    
    if (normalized.marketSentiment && normalized.marketSentiment.score) {
      normalized.marketSentiment.score = Math.min(100, Math.max(0, normalized.marketSentiment.score));
    }
    
    // 確保所有技術指標都有完整的欄位結構
    this.ensureCompleteIndicatorFields(normalized);
    
    logger.debug('🔧 已規範化分析結果以符合 Schema 要求，包含技術指標完整性檢查');
    return normalized;
  }

  /**
   * 確保所有技術指標都有完整的欄位結構
   */
  ensureCompleteIndicatorFields(normalized) {
    if (!normalized.technicalAnalysis) {
      normalized.technicalAnalysis = {};
    }

    const requiredIndicators = ['rsi', 'macd', 'movingAverage', 'bollingerBands', 'volume', 'williamsR'];
    
    requiredIndicators.forEach(key => {
      // 如果指標物件本身不存在，創建一個基本的佔位符
      if (!normalized.technicalAnalysis[key] || typeof normalized.technicalAnalysis[key] !== 'object') {
        normalized.technicalAnalysis[key] = {
          interpretation: '數據分析中',
          signal: '觀望'
        };
        return; // 創建後即跳過，不做進一步檢查
      }
      
      const indicator = normalized.technicalAnalysis[key];
      
      // 只在 interpretation 或 signal 不存在時，才補全它們
      if (!indicator.interpretation) {
        indicator.interpretation = '數據分析中';
      }
      if (!indicator.signal) {
        indicator.signal = '觀望';
      }
    });
    
    logger.debug('✅ 已確保所有技術指標都有完整的欄位結構');
  }

  /**
   * 修復技術指標資料完整性
   */
  fixTechnicalIndicatorsData(analysis) {
    // 布林通道數值追蹤：檢查修復前的數值
    if (analysis.technicalAnalysis && analysis.technicalAnalysis.bollingerBands) {
      console.log('🔍 [fixTechnicalIndicatorsData] 修復前布林通道數值:', analysis.technicalAnalysis.bollingerBands);
      console.trace('修復前布林通道數值檢查');
    }
    
    if (!analysis.technicalAnalysis) {
      analysis.technicalAnalysis = {};
    }

    const indicators = analysis.technicalAnalysis;
    
    // 確保每個技術指標都有完整的資料結構
    const requiredIndicators = ['rsi', 'macd', 'movingAverage', 'bollingerBands', 'volume', 'williamsR'];
    
    requiredIndicators.forEach(key => {
      if (!indicators[key]) {
        indicators[key] = {};
      }
      
      const indicator = indicators[key];
      
      // 特殊處理布林通道：保護數值結構不被覆蓋
      if (key === 'bollingerBands') {
        // 只在完全缺失時添加預設欄位，避免覆蓋現有數值
        if (!indicator.signal) {
          indicator.signal = '等待突破';
        }
        if (!indicator.interpretation) {
          indicator.interpretation = this.getDefaultInterpretation(key);
        }
        // 布林通道數值保護：不修改 upper, middle, lower 數值
        console.log('🔍 [fixTechnicalIndicatorsData] 保護布林通道數值結構，不進行覆蓋');
        return; // 跳過其他處理
      }
      
      // 對於其他指標，確保有 value, signal, interpretation
      if (!indicator.hasOwnProperty('value')) {
        indicator.value = this.getDefaultIndicatorValue(key);
      }
      
      if (!indicator.signal) {
        indicator.signal = '持有';
      }
      
      if (!indicator.interpretation) {
        indicator.interpretation = this.getDefaultInterpretation(key);
      }
    });
    
    // 布林通道數值追蹤：檢查修復後的數值
    if (analysis.technicalAnalysis && analysis.technicalAnalysis.bollingerBands) {
      console.log('🔍 [fixTechnicalIndicatorsData] 修復後布林通道數值:', analysis.technicalAnalysis.bollingerBands);
      console.trace('修復後布林通道數值檢查');
    }
    
    logger.info('🔧 已修復技術指標資料完整性');
    return analysis;
  }

  /**
   * 獲取指標預設值
   */
  getDefaultIndicatorValue(indicatorKey) {
    const defaults = {
      'rsi': 50,
      'macd': 0,
      'movingAverage': 'N/A',
      'bollingerBands': '中軌',
      'volume': '正常',
      'williamsR': -50
    };
    return defaults[indicatorKey] || 'N/A';
  }

  /**
   * 獲取指標預設解讀
   */
  getDefaultInterpretation(indicatorKey) {
    const defaults = {
      'rsi': 'RSI 指標中性',
      'macd': 'MACD 指標暫時無法計算',
      'movingAverage': '移動平均線分析',
      'bollingerBands': '布林帶分析基於價格位置',
      'volume': '成交量分析',
      'williamsR': '威廉指標中性區域'
    };
    return defaults[indicatorKey] || '指標分析';
  }

  /**
   * 計算數據完整性
   */
  calculateDataCompleteness(sourceData) {
    let completeness = 0;
    
    if (sourceData.currentPrice) completeness += 25;
    if (sourceData.ticker24h) completeness += 25;
    if (sourceData.weeklyKlines && sourceData.weeklyKlines.length >= 5) completeness += 30;
    if (sourceData.technicalIndicators) completeness += 20;
    
    return completeness;
  }

  // RSI 解讀方法
  interpretRSI(rsi) {
    if (rsi > 70) return '超買';
    if (rsi < 30) return '超賣';
    return '中性';
  }

  getRSISignal(rsi) {
    if (rsi > 80) return '賣出';
    if (rsi < 20) return '買入';
    return '持有';
  }

  // MACD 方法
  interpretMACD(macd) {
    if (macd > 50) return 'MACD 強烈看漲信號';
    if (macd < -50) return 'MACD 強烈看跌信號';
    if (macd > 0) return 'MACD 弱看漲信號';
    if (macd < 0) return 'MACD 弱看跌信號';
    return 'MACD 中性信號';
  }

  getMACDSignal(macd) {
    if (macd > 30) return '買入';
    if (macd < -30) return '賣出';
    return '持有';
  }

  // 布林帶方法
  getBollingerPosition(price, bands) {
    if (price > bands.upper) return '上軌之上';
    if (price < bands.lower) return '下軌之下';
    return '中軌附近';
  }

  getBollingerSignal(price, bands) {
    if (price > bands.upper) return '超買警告';
    if (price < bands.lower) return '超賣機會';
    return '等待突破';
  }

  /**
   * Gemini 2.0 Flash 優先解析策略
   */
  parseGeminiResponse(aiResponse) {
    logger.debug('🔍 使用 Gemini 2.0 Flash 優先解析策略');
    
    // 策略 1: 直接 JSON 格式（Gemini 最常見）
    let match = aiResponse.match(/^\s*\{[\s\S]*\}\s*$/);
    if (match) {
      logger.debug('策略 1 (Gemini 直接 JSON) 提取成功');
      return match[0].trim();
    }
    
    // 策略 2: ```json 代碼塊格式
    match = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) {
      logger.debug('策略 2 (Gemini 代碼塊) 提取成功');
      return match[1].trim();
    }
    
    // 策略 3: 包含必要欄位的 JSON
    match = aiResponse.match(/\{[\s\S]*?"trend"[\s\S]*?"technicalAnalysis"[\s\S]*?"marketSentiment"[\s\S]*?\}/);
    if (match) {
      logger.debug('策略 3 (Gemini 必要欄位) 提取成功');
      return match[0];
    }
    
    return null;
  }

  /**
   * Meta-Llama 4 Scout 優先解析策略
   */
  parseLlamaResponse(aiResponse) {
    logger.debug('🔍 使用 Meta-Llama 4 Scout 優先解析策略');
    
    // 策略 1: ```json 代碼塊格式（Llama 最常見）
    const match = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) {
      logger.debug('策略 1 (Llama 代碼塊) 提取成功');
      return match[1].trim();
    }
    
    // 策略 2: 最後一個完整 JSON 對象
    const jsonMatches = aiResponse.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
    if (jsonMatches && jsonMatches.length > 0) {
      for (let i = jsonMatches.length - 1; i >= 0; i--) {
        const candidate = jsonMatches[i];
        if (candidate.includes('trend') && candidate.includes('technicalAnalysis')) {
          logger.debug('策略 2 (Llama 完整 JSON) 提取成功');
          return candidate;
        }
      }
      // 使用最後一個
      logger.debug('策略 2 (Llama 最後 JSON) 提取成功');
      return jsonMatches[jsonMatches.length - 1];
    }
    
    return null;
  }

  /**
   * DeepSeek R1 優先解析策略
   */
  parseDeepSeekResponse(aiResponse) {
    logger.debug('🔍 使用 DeepSeek R1 優先解析策略');
    
    // 策略 1: 從推理內容中提取結論 JSON（DeepSeek R1 特有）
    if (aiResponse.includes('<think>')) {
      const afterThinkMatch = aiResponse.match(/<\/think>\s*([\s\S]*)/); 
      if (afterThinkMatch) {
        const finalAnswer = afterThinkMatch[1];
        const finalJsonMatch = finalAnswer.match(/\{[\s\S]*?\}/);
        if (finalJsonMatch) {
          logger.debug('策略 1 (DeepSeek 推理結論) 提取成功');
          return finalJsonMatch[0];
        }
      }
    }
    
    // 策略 2: ```json 代碼塊格式
    let match = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) {
      logger.debug('策略 2 (DeepSeek 代碼塊) 提取成功');
      return match[1].trim();
    }
    
    // 策略 3: 包含必要欄位的 JSON
    match = aiResponse.match(/\{[\s\S]*?"trend"[\s\S]*?"technicalAnalysis"[\s\S]*?"marketSentiment"[\s\S]*?\}/);
    if (match) {
      logger.debug('策略 3 (DeepSeek 必要欄位) 提取成功');
      return match[0];
    }
    
    return null;
  }

  /**
   * 通用解析策略
   */
  parseGenericResponse(aiResponse) {
    logger.debug('🔍 使用通用解析策略');
    
    // 預處理：檢查是否為字串化的 JSON（被包在雙引號中）
    let processedResponse = aiResponse;
    if (aiResponse.startsWith('"') && aiResponse.endsWith('"')) {
      logger.debug('🔧 檢測到字串化 JSON，嘗試反序列化');
      try {
        processedResponse = JSON.parse(aiResponse);
        logger.info('✅ 字串化 JSON 反序列化成功');
      } catch (e) {
        logger.debug('❌ 字串化 JSON 反序列化失敗，使用原始內容');
      }
    }
    
    // 策略 1: ```json 代碼塊格式（最常見）
    let match = processedResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) {
      logger.debug('策略 1 (通用代碼塊) 提取成功');
      return match[1].trim();
    }
    
    // 策略 2: 包含必要欄位的 JSON
    match = processedResponse.match(/\{[\s\S]*?"trend"[\s\S]*?"technicalAnalysis"[\s\S]*?"marketSentiment"[\s\S]*?\}/);
    if (match) {
      logger.debug('策略 2 (通用必要欄位) 提取成功');
      return match[0];
    }
    
    // 策略 3: 最後一個完整 JSON 對象
    const jsonMatches = processedResponse.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
    if (jsonMatches && jsonMatches.length > 0) {
      for (let i = jsonMatches.length - 1; i >= 0; i--) {
        const candidate = jsonMatches[i];
        if (candidate.includes('trend') && candidate.includes('technicalAnalysis')) {
          logger.debug('策略 3 (通用完整 JSON) 提取成功');
          return candidate;
        }
      }
      logger.debug('策略 3 (通用最後 JSON) 提取成功');
      return jsonMatches[jsonMatches.length - 1];
    }
    
    // 策略 4: 最基本的 JSON 提取（保底方案）
    match = processedResponse.match(/\{[\s\S]*\}/);
    if (match) {
      logger.debug('策略 4 (通用基本提取) 提取成功');
      return match[0];
    }
    
    return null;
  }

  /**
   * 獲取服務統計
   */
  getStats() {
    return {
      isConfigured: this.isConfigured(),
      model: this.model,
      supportedTimeframes: ['1d'],
      analysisType: 'single_currency'
    };
  }
}

// 創建服務實例
let currencyAnalysisService = null;

/**
 * 獲取單一貨幣分析服務實例
 */
function getCurrencyAnalysisService() {
  if (!currencyAnalysisService) {
    currencyAnalysisService = new AICurrencyAnalysisService();
  }
  return currencyAnalysisService;
}

module.exports = {
  AICurrencyAnalysisService,
  getCurrencyAnalysisService
};