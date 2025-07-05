/**
 * AI 首頁大趨勢分析服務
 * 
 * 負責進行首頁的日/週/月大趨勢分析
 * 考量 OpenRouter API 限制，每日執行一次並存入資料庫
 */

const logger = require('../utils/logger');
const AIAnalysisResult = require('../models/AIAnalysisResult');
const { getBinanceService } = require('./binance.service');
const { getNewsService } = require('./news.service');

class AIHomepageAnalysisService {
  constructor() {
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY;
    this.openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.model = process.env.OPENROUTER_DEFAULT_MODEL || 'qwen/qwen-2.5-72b-instruct:free';
    
    // 10個主要交易貨幣
    this.majorCurrencies = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT',
      'SOLUSDT', 'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'LTCUSDT'
    ];
  }

  /**
   * 檢查服務是否已配置
   */
  isConfigured() {
    return !!this.openRouterApiKey;
  }

  /**
   * 檢查今日是否需要重新分析
   */
  async needsAnalysis() {
    return await AIAnalysisResult.needsAnalysis('homepage_trend');
  }

  /**
   * 獲取今日的首頁分析結果
   */
  async getTodayAnalysis() {
    return await AIAnalysisResult.getTodayHomepageAnalysis();
  }

  /**
   * 執行首頁大趨勢分析
   */
  async performHomepageTrendAnalysis() {
    const startTime = Date.now();
    
    try {
      logger.info('🔍 開始首頁大趨勢分析...');

      // 檢查是否需要重新分析
      const needsAnalysis = await this.needsAnalysis();
      if (!needsAnalysis) {
        logger.info('✅ 今日分析已存在，直接返回快取結果');
        return await this.getTodayAnalysis();
      }

      // 檢查 API 配置
      if (!this.isConfigured()) {
        throw new Error('OpenRouter API 金鑰未設定');
      }

      // 1. 收集市場數據
      const marketData = await this.collectMarketData();
      
      // 2. 收集新聞數據
      const newsData = await this.collectNewsData();
      
      // 3. 準備分析數據
      const analysisData = {
        market: marketData,
        news: newsData,
        timestamp: new Date().toISOString()
      };

      // 4. 執行 AI 分析
      const aiAnalysis = await this.performAIAnalysis(analysisData);
      
      // 5. 儲存分析結果
      const analysisResult = await this.saveAnalysisResult(aiAnalysis, analysisData);
      
      const processingTime = Date.now() - startTime;
      logger.info(`✅ 首頁大趨勢分析完成，處理時間: ${processingTime}ms`);
      
      return analysisResult;

    } catch (error) {
      logger.error('❌ 首頁大趨勢分析失敗:', error);
      throw error;
    }
  }

  /**
   * 收集市場數據
   */
  async collectMarketData() {
    try {
      const binanceService = getBinanceService();
      
      // 獲取主要貨幣的24小時統計
      const marketPromises = this.majorCurrencies.map(symbol =>
        binanceService.get24hrTicker(symbol).catch(error => {
          logger.warn(`獲取 ${symbol} 數據失敗:`, error.message);
          return null;
        })
      );

      const marketResults = await Promise.all(marketPromises);
      const validMarketData = marketResults.filter(data => data !== null);

      // 計算市場統計
      const totalVolume = validMarketData.reduce((sum, data) => 
        sum + parseFloat(data.quoteVolume || 0), 0
      );
      
      const avgPriceChange = validMarketData.length > 0 
        ? validMarketData.reduce((sum, data) => 
            sum + parseFloat(data.priceChangePercent || 0), 0
          ) / validMarketData.length
        : 0;

      const gainersCount = validMarketData.filter(data => 
        parseFloat(data.priceChangePercent || 0) > 0
      ).length;

      const losersCount = validMarketData.filter(data => 
        parseFloat(data.priceChangePercent || 0) < 0
      ).length;

      return {
        currencies: validMarketData.map(data => ({
          symbol: data.symbol,
          price: parseFloat(data.lastPrice),
          priceChange: parseFloat(data.priceChange),
          priceChangePercent: parseFloat(data.priceChangePercent),
          volume: parseFloat(data.volume),
          quoteVolume: parseFloat(data.quoteVolume),
          high: parseFloat(data.highPrice),
          low: parseFloat(data.lowPrice)
        })),
        statistics: {
          totalVolume,
          avgPriceChange,
          gainersCount,
          losersCount,
          totalCurrencies: validMarketData.length
        }
      };

    } catch (error) {
      logger.error('收集市場數據失敗:', error);
      throw new Error(`市場數據收集失敗: ${error.message}`);
    }
  }

  /**
   * 收集新聞數據
   */
  async collectNewsData() {
    try {
      const newsService = getNewsService();
      
      // 獲取最新30則新聞用於情緒分析
      const newsArticles = await newsService.getLatestNews(30);
      
      if (!newsArticles || newsArticles.length === 0) {
        logger.warn('未獲取到新聞數據，使用空數據');
        return {
          articles: [],
          sentimentAnalysis: {
            positiveCount: 0,
            negativeCount: 0,
            neutralCount: 0,
            overallSentiment: 'neutral',
            keyTopics: [],
            summary: '無新聞數據可供分析'
          }
        };
      }

      // 簡單的新聞情緒分析 (關鍵字分析)
      const sentimentAnalysis = this.analyzeNewsSentiment(newsArticles);

      return {
        articles: newsArticles.slice(0, 10), // 只保留前10則用於 AI 分析
        sentimentAnalysis,
        totalCount: newsArticles.length
      };

    } catch (error) {
      logger.error('收集新聞數據失敗:', error);
      // 新聞數據非必要，返回空數據繼續分析
      return {
        articles: [],
        sentimentAnalysis: {
          positiveCount: 0,
          negativeCount: 0,
          neutralCount: 0,
          overallSentiment: 'neutral',
          keyTopics: [],
          summary: '新聞數據收集失敗'
        }
      };
    }
  }

  /**
   * 簡單的新聞情緒分析
   */
  analyzeNewsSentiment(articles) {
    const positiveKeywords = [
      'bull', 'bullish', 'gain', 'rise', 'surge', 'pump', 'moon', 'breakthrough',
      '上漲', '看漲', '突破', '利多', '強勢', '成長'
    ];
    
    const negativeKeywords = [
      'bear', 'bearish', 'fall', 'drop', 'crash', 'dump', 'decline', 'correction',
      '下跌', '看跌', '暴跌', '利空', '修正', '回調'
    ];

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    const keyTopics = new Set();

    articles.forEach(article => {
      const content = `${article.title} ${article.description || ''}`.toLowerCase();
      
      let hasPositive = false;
      let hasNegative = false;

      positiveKeywords.forEach(keyword => {
        if (content.includes(keyword.toLowerCase())) {
          hasPositive = true;
          keyTopics.add(keyword);
        }
      });

      negativeKeywords.forEach(keyword => {
        if (content.includes(keyword.toLowerCase())) {
          hasNegative = true;
          keyTopics.add(keyword);
        }
      });

      if (hasPositive && !hasNegative) {
        positiveCount++;
      } else if (hasNegative && !hasPositive) {
        negativeCount++;
      } else {
        neutralCount++;
      }
    });

    // 判斷整體情緒
    let overallSentiment = 'neutral';
    if (positiveCount > negativeCount * 1.5) {
      overallSentiment = 'positive';
    } else if (negativeCount > positiveCount * 1.5) {
      overallSentiment = 'negative';
    }

    return {
      positiveCount,
      negativeCount,
      neutralCount,
      overallSentiment,
      keyTopics: Array.from(keyTopics).slice(0, 10),
      summary: `正面新聞: ${positiveCount}, 負面新聞: ${negativeCount}, 中性新聞: ${neutralCount}`
    };
  }

  /**
   * 檢查 OpenRouter API 服務健康狀態
   */
  async checkOpenRouterHealth() {
    if (!this.isConfigured()) {
      return { healthy: false, error: 'API key not configured' };
    }

    try {
      // 使用輕量級請求檢查 OpenRouter 可用性
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒快速檢查

      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'HTTP-Referer': 'https://nexustrade.com'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return { healthy: false, error: `HTTP ${response.status}` };
      }
      
      return { healthy: true, error: null };
      
    } catch (error) {
      const errorMessage = error.name === 'AbortError' ? 'Timeout' : error.message;
      logger.warn('⚠️ OpenRouter 健康檢查失敗:', errorMessage);
      return { healthy: false, error: errorMessage };
    }
  }

  /**
   * 執行 AI 分析 (使用 OpenRouter)
   */
  async performAIAnalysis(data) {
    // 檢查 OpenRouter 服務健康狀態
    const healthStatus = await this.checkOpenRouterHealth();
    logger.info('🔍 OpenRouter 服務健康檢查:', healthStatus);
    
    if (!healthStatus.healthy) {
      const errorMsg = `OpenRouter API 服務不可用: ${healthStatus.error}`;
      logger.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    try {
      logger.info('🤖 使用 OpenRouter 進行 AI 分析...');
      const result = await this.performOpenRouterAnalysis(data);
      logger.info('✅ OpenRouter AI 分析成功');
      return result;
      
    } catch (error) {
      logger.error(`❌ OpenRouter 分析失敗: ${error.message}`);
      throw error;
    }
  }

  /**
   * 使用 OpenRouter 執行 AI 分析
   */
  async performOpenRouterAnalysis(data) {
    const prompt = this.buildAnalysisPrompt(data);
    
    // 設定 60 秒超時和 AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 60000); // 60 秒超時
    
    let response;
    try {
      response = await fetch(this.openRouterUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://nexustrade.com',
          'X-Title': 'NexusTrade AI Analysis'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: '你是專業的加密貨幣市場分析師。請只回應有效的JSON格式，不要包含任何解釋或其他文字。JSON中的文字內容請使用繁體中文。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.3
        }),
        signal: controller.signal // 添加 AbortController
      });
      
      clearTimeout(timeoutId); // 清除超時計時器

      if (!response.ok) {
        throw new Error(`OpenRouter API 錯誤: ${response.status} ${response.statusText}`);
      }
    
    } catch (error) {
      clearTimeout(timeoutId); // 清除超時計時器
      
      if (error.name === 'AbortError') {
        throw new Error('OpenRouter API 請求超時（60秒）');
      }
      throw error;
    }

    const result = await response.json();
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('OpenRouter API 回應格式錯誤');
    }

    // 取得 AI 回應內容
    const message = result.choices[0].message;
    const aiResponse = message.content || '';
    
    if (!aiResponse.trim()) {
      throw new Error('OpenRouter API 回應內容為空');
    }
    
    const parsedResult = this.parseAIResponse(aiResponse, result);
    
    return {
      success: true,
      provider: 'openrouter',
      model: this.model,
      analysis: parsedResult,
      usage: result.usage
    };
  }

  /**
   * 建立分析提示詞
   */
  buildAnalysisPrompt(data) {
    const { market, news } = data;
    
    return `
請根據以下市場數據和新聞資訊，提供加密貨幣市場的大趨勢分析：

## 市場數據 (主要10個貨幣)
總交易量: ${market.statistics.totalVolume.toLocaleString()} USDT
平均價格變化: ${market.statistics.avgPriceChange.toFixed(2)}%
上漲貨幣數: ${market.statistics.gainersCount}
下跌貨幣數: ${market.statistics.losersCount}

主要貨幣表現:
${market.currencies.map(curr => 
  `${curr.symbol}: $${curr.price.toLocaleString()} (${curr.priceChangePercent > 0 ? '+' : ''}${curr.priceChangePercent.toFixed(2)}%)`
).join('\n')}

## 新聞情緒分析
整體情緒: ${news.sentimentAnalysis.overallSentiment}
正面新聞: ${news.sentimentAnalysis.positiveCount} 則
負面新聞: ${news.sentimentAnalysis.negativeCount} 則
中性新聞: ${news.sentimentAnalysis.neutralCount} 則
關鍵主題: ${news.sentimentAnalysis.keyTopics.join(', ')}

## 最新新聞標題 (前5則)
${news.articles.slice(0, 5).map((article, index) => 
  `${index + 1}. ${article.title}`
).join('\n')}

請提供以下格式的分析結果 (請用 JSON 格式回應)：

{
  "trend": {
    "direction": "bullish|bearish|neutral",
    "confidence": 85,
    "summary": "市場趨勢總結 (100字內)"
  },
  "technicalAnalysis": {
    "rsi": {
      "value": 65,
      "interpretation": "中性偏強",
      "signal": "持有"
    },
    "macd": {
      "value": 0.8,
      "signal": "買入",
      "interpretation": "多頭訊號"
    },
    "movingAverage": {
      "ma20": 45000,
      "ma50": 43000,
      "position": "價格位於移動平均線上方",
      "signal": "看漲"
    },
    "bollingerBands": {
      "position": "中軌附近",
      "squeeze": false,
      "signal": "等待突破"
    },
    "volume": {
      "trend": "上升",
      "interpretation": "成交量放大支撐趨勢",
      "signal": "確認"
    }
  },
  "marketSentiment": {
    "score": 75,
    "label": "greed",
    "factors": [
      {
        "factor": "新聞情緒",
        "impact": "正面",
        "description": "市場新聞偏向樂觀"
      }
    ],
    "summary": "市場情緒分析總結 (80字內)"
  },
  "timeframeAnalysis": {
    "daily": {
      "trend": "看漲",
      "key_levels": [45000, 47000, 50000],
      "summary": "日線分析總結"
    },
    "weekly": {
      "trend": "看漲",
      "key_levels": [43000, 48000, 52000],
      "summary": "週線分析總結"
    },
    "monthly": {
      "trend": "中性",
      "key_levels": [40000, 50000, 60000],
      "summary": "月線分析總結"
    }
  }
}

重要：請直接回應JSON格式，不要包含解釋或其他文字。
`;
  }

  /**
   * 解析 AI 回應
   */
  parseAIResponse(aiResponse, rawResult) {
    try {
      logger.info('🔍 AI 原始回應內容:', aiResponse.substring(0, 800));
      
      // 嘗試多種 JSON 提取策略
      let jsonContent = null;
      
      // 策略 1: 尋找完整的 JSON 物件 (最貪婪匹配)
      const completeJsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (completeJsonMatch) {
        try {
          jsonContent = JSON.parse(completeJsonMatch[0]);
        } catch (e) {
          // 如果解析失敗，嘗試其他策略
        }
      }
      
      // 策略 2: 尋找 JSON 代碼塊
      if (!jsonContent) {
        const codeBlockMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          try {
            jsonContent = JSON.parse(codeBlockMatch[1]);
          } catch (e) {
            // 繼續嘗試其他策略
          }
        }
      }
      
      // 策略 3: 尋找具有特定結構的 JSON 片段
      if (!jsonContent) {
        const structuredJsonMatch = aiResponse.match(/\{\s*["']?trend["']?\s*:\s*\{[\s\S]*?\}\s*\}/);
        if (structuredJsonMatch) {
          try {
            jsonContent = JSON.parse(structuredJsonMatch[0]);
          } catch (e) {
            // 繼續嘗試其他策略
          }
        }
      }
      
      // 策略 4: 多個獨立 JSON 片段合併 (適用於結構化回應)
      if (!jsonContent) {
        const trendMatch = aiResponse.match(/["']?trend["']?\s*:\s*\{[^{}]*\}/);
        const techMatch = aiResponse.match(/["']?technicalAnalysis["']?\s*:\s*\{[\s\S]*?\}/);
        const sentimentMatch = aiResponse.match(/["']?marketSentiment["']?\s*:\s*\{[^{}]*\}/);
        
        if (trendMatch || techMatch || sentimentMatch) {
          try {
            // 嘗試重建完整 JSON
            const rebuiltJson = `{${[trendMatch?.[0], techMatch?.[0], sentimentMatch?.[0]].filter(Boolean).join(',')}}`;
            jsonContent = JSON.parse(rebuiltJson);
          } catch (e) {
            // 最後策略失敗
          }
        }
      }
      
      if (!jsonContent) {
        logger.warn('⚠️ AI 回應中未找到有效的 JSON 格式數據，使用預設分析結果');
        jsonContent = this.getDefaultAnalysis();
      }
      
      logger.info('🔍 成功提取 JSON 內容:', JSON.stringify(jsonContent).substring(0, 500));
      const parsedAnalysis = jsonContent;
      
      // 驗證必要欄位
      if (!parsedAnalysis.trend || !parsedAnalysis.technicalAnalysis || !parsedAnalysis.marketSentiment) {
        throw new Error('AI 回應缺少必要的分析欄位');
      }

      // 確保 timeframeAnalysis 存在，如果不存在則提供預設值
      if (!parsedAnalysis.timeframeAnalysis) {
        parsedAnalysis.timeframeAnalysis = {
          daily: { trend: '中性', key_levels: [], summary: '日線分析基於當前市場數據' },
          weekly: { trend: '中性', key_levels: [], summary: '週線分析因成本考量暫不提供' },
          monthly: { trend: '中性', key_levels: [], summary: '月線分析因成本考量暫不提供' }
        };
      }

      return {
        analysis: parsedAnalysis,
        rawResponse: aiResponse,
        tokensUsed: rawResult.usage ? rawResult.usage.total_tokens : 0,
        model: rawResult.model || this.model
      };

    } catch (error) {
      logger.error('解析 AI 回應失敗:', error);
      
      // 返回預設分析結果
      return {
        analysis: this.getDefaultAnalysis(),
        rawResponse: aiResponse,
        tokensUsed: 0,
        model: this.model,
        parseError: error.message
      };
    }
  }

  /**
   * 獲取預設分析結果 (當 AI 分析失敗時使用)
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
        volume: { trend: '平穩', interpretation: '成交量正常', signal: '中性' }
      },
      marketSentiment: {
        score: 50,
        label: 'neutral',
        factors: [{ factor: '數據處理', impact: '中性', description: '系統處理中' }],
        summary: '市場情緒分析暫時不可用'
      },
      timeframeAnalysis: {
        daily: { trend: '中性', key_levels: [], summary: '日線分析待更新' },
        weekly: { trend: '中性', key_levels: [], summary: '週線分析待更新' },
        monthly: { trend: '中性', key_levels: [], summary: '月線分析待更新' }
      }
    };
  }

  /**
   * 儲存分析結果到資料庫
   */
  async saveAnalysisResult(aiAnalysis, sourceData) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 處理可能的嵌套結構
      const actualAnalysis = aiAnalysis.analysis.analysis || aiAnalysis.analysis;
      
      const analysisResult = new AIAnalysisResult({
        analysisType: 'homepage_trend',
        analysisDate: today,
        analysis: {
          trend: actualAnalysis.trend,
          technicalAnalysis: actualAnalysis.technicalAnalysis,
          marketSentiment: actualAnalysis.marketSentiment,
          newsSentiment: sourceData.news.sentimentAnalysis,
          timeframeAnalysis: actualAnalysis.timeframeAnalysis
        },
        dataSources: {
          symbols: this.majorCurrencies,
          newsCount: sourceData.news.articles.length,
          dataTimestamp: new Date(sourceData.timestamp),
          analysisModel: aiAnalysis.model
        },
        qualityMetrics: {
          tokensUsed: aiAnalysis.tokensUsed || 0,
          processingTime: Date.now() - Date.parse(sourceData.timestamp),
          dataCompleteness: this.calculateDataCompleteness(sourceData),
          confidence: (actualAnalysis && actualAnalysis.trend && actualAnalysis.trend.confidence) 
            ? actualAnalysis.trend.confidence 
            : 50
        }
      });

      await analysisResult.save();
      
      logger.info(`✅ 首頁分析結果已儲存: ${analysisResult._id}`);
      return analysisResult;

    } catch (error) {
      logger.error('儲存分析結果失敗:', error);
      throw new Error(`分析結果儲存失敗: ${error.message}`);
    }
  }

  /**
   * 計算數據完整性
   */
  calculateDataCompleteness(sourceData) {
    let completeness = 0;
    
    // 市場數據完整性 (60%)
    const marketCompleteness = (sourceData.market.currencies.length / this.majorCurrencies.length) * 60;
    completeness += marketCompleteness;
    
    // 新聞數據完整性 (40%)
    const newsCompleteness = Math.min(sourceData.news.articles.length / 10, 1) * 40;
    completeness += newsCompleteness;
    
    return Math.round(completeness);
  }

  /**
   * 獲取服務統計
   */
  getStats() {
    return {
      isConfigured: this.isConfigured(),
      model: this.model,
      majorCurrencies: this.majorCurrencies,
      supportedTimeframes: ['daily', 'weekly', 'monthly']
    };
  }
}

// 創建服務實例
let homepageAnalysisService = null;

/**
 * 獲取首頁分析服務實例
 */
function getHomepageAnalysisService() {
  if (!homepageAnalysisService) {
    homepageAnalysisService = new AIHomepageAnalysisService();
  }
  return homepageAnalysisService;
}

module.exports = {
  AIHomepageAnalysisService,
  getHomepageAnalysisService
};