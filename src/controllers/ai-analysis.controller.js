/**
 * AI 分析控制器
 * 
 * 提供加密貨幣 AI 分析相關的 API 端點
 * 重新設計版本：基於資料庫快取的每日分析結果
 */

const { getAIAnalysisService } = require('../services/ai-analysis.service');
const { getHomepageAnalysisService } = require('../services/ai-homepage-analysis.service');
const { getCurrencyAnalysisService } = require('../services/ai-currency-analysis.service');
const AIAnalysisResult = require('../models/AIAnalysisResult');
const logger = require('../utils/logger');

class AIAnalysisController {
  constructor() {
    this.aiService = getAIAnalysisService();
    this.homepageService = getHomepageAnalysisService();
    this.currencyService = getCurrencyAnalysisService();
  }

  /**
   * 獲取服務狀態
   * GET /api/ai/status
   */
  async getStatus(req, res, next) {
    try {
      const stats = this.aiService.getStats();
      
      res.status(200).json({
        status: 'success',
        data: {
          status: stats.isConfigured ? 'ready' : 'not_configured',
          stats,
          message: stats.isConfigured ? 'AI 分析服務已就緒' : 'OpenRouter API 金鑰未設定'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('獲取 AI 服務狀態失敗:', error);
      res.status(500).json({
        status: 'error',
        message: '獲取服務狀態失敗',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 趨勢分析
   * POST /api/ai/trend-analysis
   */
  async analyzeTrend(req, res, next) {
    try {
      const { symbol, timeframe = '1d' } = req.body;

      // 驗證參數
      if (!symbol) {
        return res.status(400).json({
          status: 'error',
          message: '請提供交易對代號',
          timestamp: new Date().toISOString()
        });
      }

      // 檢查服務配置
      if (!this.aiService.isConfigured()) {
        return res.status(503).json({
          status: 'error',
          message: 'AI 分析服務未配置',
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`🔍 開始趨勢分析: ${symbol} (${timeframe})`);

      const analysis = await this.aiService.analyzeTrend(symbol.toUpperCase(), timeframe);

      res.status(200).json({
        status: 'success',
        data: analysis,
        message: '趨勢分析完成',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('趨勢分析失敗:', error);
      
      if (error.message.includes('OpenRouter API') || 
          error.message.includes('使用額度限制') ||
          error.message.includes('rate-limited')) {
        return res.status(503).json({
          status: 'error',
          message: 'AI 服務暫時不可用',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: '趨勢分析失敗',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 技術指標分析
   * POST /api/ai/technical-analysis
   */
  async analyzeTechnicalIndicators(req, res, next) {
    try {
      const { symbol, timeframe = '1d' } = req.body;

      if (!symbol) {
        return res.status(400).json({
          status: 'error',
          message: '請提供交易對代號',
          timestamp: new Date().toISOString()
        });
      }

      if (!this.aiService.isConfigured()) {
        return res.status(503).json({
          status: 'error',
          message: 'AI 分析服務未配置',
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`📊 開始技術指標分析: ${symbol} (${timeframe})`);

      const analysis = await this.aiService.analyzeTechnicalIndicators(symbol.toUpperCase(), timeframe);

      res.status(200).json({
        status: 'success',
        data: analysis,
        message: '技術指標分析完成',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('技術指標分析失敗:', error);
      
      if (error.message.includes('OpenRouter API') || 
          error.message.includes('使用額度限制') ||
          error.message.includes('rate-limited')) {
        return res.status(503).json({
          status: 'error',
          message: 'AI 服務暫時不可用',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: '技術指標分析失敗',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 投資建議生成
   * POST /api/ai/investment-advice
   */
  async generateInvestmentAdvice(req, res, next) {
    try {
      const { symbol, riskLevel = 'medium', investmentHorizon = 'medium' } = req.body;

      if (!symbol) {
        return res.status(400).json({
          status: 'error',
          message: '請提供交易對代號',
          timestamp: new Date().toISOString()
        });
      }

      if (!this.aiService.isConfigured()) {
        return res.status(503).json({
          status: 'error',
          message: 'AI 分析服務未配置',
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`💡 開始投資建議生成: ${symbol} (風險: ${riskLevel}, 期限: ${investmentHorizon})`);

      const advice = await this.aiService.generateInvestmentAdvice(
        symbol.toUpperCase(), 
        riskLevel, 
        investmentHorizon
      );

      res.status(200).json({
        status: 'success',
        data: advice,
        message: '投資建議生成完成',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('投資建議生成失敗:', error);
      
      if (error.message.includes('OpenRouter API') || 
          error.message.includes('使用額度限制') ||
          error.message.includes('rate-limited')) {
        return res.status(503).json({
          status: 'error',
          message: 'AI 服務暫時不可用',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: '投資建議生成失敗',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 風險評估
   * POST /api/ai/risk-assessment
   */
  async assessRisk(req, res, next) {
    try {
      const { symbol, portfolioData = null } = req.body;

      if (!symbol) {
        return res.status(400).json({
          status: 'error',
          message: '請提供交易對代號',
          timestamp: new Date().toISOString()
        });
      }

      if (!this.aiService.isConfigured()) {
        return res.status(503).json({
          status: 'error',
          message: 'AI 分析服務未配置',
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`⚠️ 開始風險評估: ${symbol}`);

      const assessment = await this.aiService.assessRisk(symbol.toUpperCase(), portfolioData);

      res.status(200).json({
        status: 'success',
        data: assessment,
        message: '風險評估完成',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('風險評估失敗:', error);
      
      if (error.message.includes('OpenRouter API') || 
          error.message.includes('使用額度限制') ||
          error.message.includes('rate-limited')) {
        return res.status(503).json({
          status: 'error',
          message: 'AI 服務暫時不可用',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: '風險評估失敗',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 綜合分析報告
   * POST /api/ai/comprehensive-analysis
   */
  async generateComprehensiveAnalysis(req, res, next) {
    try {
      const { 
        symbol, 
        timeframe = '1d', 
        riskLevel = 'medium', 
        investmentHorizon = 'medium',
        includeRisk = true 
      } = req.body;

      if (!symbol) {
        return res.status(400).json({
          status: 'error',
          message: '請提供交易對代號',
          timestamp: new Date().toISOString()
        });
      }

      if (!this.aiService.isConfigured()) {
        return res.status(503).json({
          status: 'error',
          message: 'AI 分析服務未配置',
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`📋 開始綜合分析: ${symbol}`);

      // 執行各種分析
      const [trendAnalysis, technicalAnalysis, investmentAdvice, riskAssessment] = await Promise.all([
        this.aiService.analyzeTrend(symbol.toUpperCase(), timeframe),
        this.aiService.analyzeTechnicalIndicators(symbol.toUpperCase(), timeframe),
        this.aiService.generateInvestmentAdvice(symbol.toUpperCase(), riskLevel, investmentHorizon),
        includeRisk ? this.aiService.assessRisk(symbol.toUpperCase()) : null
      ]);

      const report = {
        symbol: symbol.toUpperCase(),
        timeframe,
        riskLevel,
        investmentHorizon,
        trendAnalysis,
        technicalAnalysis,
        investmentAdvice,
        riskAssessment,
        generatedAt: new Date().toISOString()
      };

      res.status(200).json({
        status: 'success',
        data: { report },
        message: '綜合分析報告生成完成',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('綜合分析報告生成失敗:', error);
      
      if (error.message.includes('OpenRouter API') || 
          error.message.includes('使用額度限制') ||
          error.message.includes('rate-limited')) {
        return res.status(503).json({
          status: 'error',
          message: 'AI 服務暫時不可用',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: '綜合分析報告生成失敗',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 清理快取
   * DELETE /api/ai/cache
   */
  async clearCache(req, res, next) {
    try {
      this.aiService.clearExpiredCache();
      
      res.status(200).json({
        status: 'success',
        message: '分析快取已清理',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('清理快取失敗:', error);
      
      res.status(500).json({
        status: 'error',
        message: '清理快取失敗',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 獲取首頁大趨勢分析
   * GET /api/ai/homepage-analysis
   */
  async getHomepageAnalysis(req, res, next) {
    try {
      logger.info('🏠 獲取首頁大趨勢分析...');

      // 首先嘗試獲取今日分析結果
      let analysisResult = await this.homepageService.getTodayAnalysis();
      
      // 如果沒有今日分析結果，執行新的分析
      if (!analysisResult) {
        logger.info('📊 今日首頁分析不存在，開始執行新分析...');
        analysisResult = await this.homepageService.performHomepageTrendAnalysis();
      }

      if (!analysisResult) {
        return res.status(404).json({
          status: 'error',
          message: '首頁分析結果不存在',
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        status: 'success',
        data: {
          analysis: analysisResult.analysis,
          analysisDate: analysisResult.analysisDate,
          dataSources: analysisResult.dataSources,
          qualityMetrics: analysisResult.qualityMetrics,
          isFromCache: true
        },
        message: '首頁大趨勢分析獲取成功',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('獲取首頁分析失敗:', error);
      
      if (error.message.includes('OpenRouter API') || 
          error.message.includes('使用額度限制') ||
          error.message.includes('rate-limited')) {
        return res.status(503).json({
          status: 'error',
          message: 'AI 服務暫時不可用',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: '獲取首頁分析失敗',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 獲取單一貨幣分析
   * GET /api/ai/currency-analysis/:symbol
   */
  async getCurrencyAnalysis(req, res, next) {
    try {
      const { symbol } = req.params;

      if (!symbol) {
        return res.status(400).json({
          status: 'error',
          message: '請提供交易對代號',
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`💰 獲取 ${symbol} 單一貨幣分析...`);

      // 首先嘗試獲取今日分析結果
      let analysisResult = await this.currencyService.getTodayAnalysis(symbol);
      
      // 如果沒有今日分析結果，執行新的分析
      if (!analysisResult) {
        logger.info(`📈 ${symbol} 今日分析不存在，開始執行新分析...`);
        analysisResult = await this.currencyService.performCurrencyAnalysis(symbol);
      }

      if (!analysisResult) {
        return res.status(404).json({
          status: 'error',
          message: `${symbol} 分析結果不存在`,
          timestamp: new Date().toISOString()
        });
      }

      res.status(200).json({
        status: 'success',
        data: {
          symbol: symbol.toUpperCase(),
          analysis: analysisResult.analysis,
          analysisDate: analysisResult.analysisDate,
          dataSources: analysisResult.dataSources,
          qualityMetrics: analysisResult.qualityMetrics,
          isFromCache: true
        },
        message: `${symbol} 單一貨幣分析獲取成功`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error(`獲取 ${req.params.symbol} 分析失敗:`, error);
      
      if (error.message.includes('OpenRouter API') || 
          error.message.includes('使用額度限制') ||
          error.message.includes('rate-limited')) {
        return res.status(503).json({
          status: 'error',
          message: 'AI 服務暫時不可用',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: `獲取 ${req.params.symbol} 分析失敗`,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 強制重新分析首頁
   * POST /api/ai/homepage-analysis/refresh
   */
  async refreshHomepageAnalysis(req, res, next) {
    try {
      if (!this.homepageService.isConfigured()) {
        return res.status(503).json({
          status: 'error',
          message: 'AI 分析服務未配置',
          timestamp: new Date().toISOString()
        });
      }

      logger.info('🔄 強制重新執行首頁大趨勢分析...');

      const analysisResult = await this.homepageService.performHomepageTrendAnalysis();

      res.status(200).json({
        status: 'success',
        data: {
          analysis: analysisResult.analysis,
          analysisDate: analysisResult.analysisDate,
          dataSources: analysisResult.dataSources,
          qualityMetrics: analysisResult.qualityMetrics,
          isFromCache: false
        },
        message: '首頁大趨勢分析重新執行完成',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('重新執行首頁分析失敗:', error);
      
      res.status(500).json({
        status: 'error',
        message: '重新執行首頁分析失敗',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 強制重新分析單一貨幣
   * POST /api/ai/currency-analysis/:symbol/refresh
   */
  async refreshCurrencyAnalysis(req, res, next) {
    try {
      const { symbol } = req.params;

      if (!symbol) {
        return res.status(400).json({
          status: 'error',
          message: '請提供交易對代號',
          timestamp: new Date().toISOString()
        });
      }

      if (!this.currencyService.isConfigured()) {
        return res.status(503).json({
          status: 'error',
          message: 'AI 分析服務未配置',
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`🔄 強制重新執行 ${symbol} 單一貨幣分析...`);

      const analysisResult = await this.currencyService.performCurrencyAnalysis(symbol);

      res.status(200).json({
        status: 'success',
        data: {
          symbol: symbol.toUpperCase(),
          analysis: analysisResult.analysis,
          analysisDate: analysisResult.analysisDate,
          dataSources: analysisResult.dataSources,
          qualityMetrics: analysisResult.qualityMetrics,
          isFromCache: false
        },
        message: `${symbol} 單一貨幣分析重新執行完成`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error(`重新執行 ${req.params.symbol} 分析失敗:`, error);
      
      res.status(500).json({
        status: 'error',
        message: `重新執行 ${req.params.symbol} 分析失敗`,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// 創建並導出控制器實例
const aiAnalysisController = new AIAnalysisController();

module.exports = {
  // 原有方法
  getStatus: aiAnalysisController.getStatus.bind(aiAnalysisController),
  analyzeTrend: aiAnalysisController.analyzeTrend.bind(aiAnalysisController),
  analyzeTechnicalIndicators: aiAnalysisController.analyzeTechnicalIndicators.bind(aiAnalysisController),
  generateInvestmentAdvice: aiAnalysisController.generateInvestmentAdvice.bind(aiAnalysisController),
  assessRisk: aiAnalysisController.assessRisk.bind(aiAnalysisController),
  generateComprehensiveAnalysis: aiAnalysisController.generateComprehensiveAnalysis.bind(aiAnalysisController),
  clearCache: aiAnalysisController.clearCache.bind(aiAnalysisController),
  
  // 新增方法 - 基於資料庫快取的分析
  getHomepageAnalysis: aiAnalysisController.getHomepageAnalysis.bind(aiAnalysisController),
  getCurrencyAnalysis: aiAnalysisController.getCurrencyAnalysis.bind(aiAnalysisController),
  refreshHomepageAnalysis: aiAnalysisController.refreshHomepageAnalysis.bind(aiAnalysisController),
  refreshCurrencyAnalysis: aiAnalysisController.refreshCurrencyAnalysis.bind(aiAnalysisController)
};