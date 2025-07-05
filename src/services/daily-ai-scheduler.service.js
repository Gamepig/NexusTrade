/**
 * NexusTrade 每日 AI 分析排程器服務
 * 
 * 功能：
 * 1. 每日早上7點執行排程
 * 2. 查詢有訂閱 AI 分析的貨幣清單
 * 3. 對訂閱的貨幣執行 AI 分析
 * 4. 發送分析結果通知
 * 
 * 成本優化：只分析有訂閱的貨幣，避免不必要的 API 調用
 */

const cron = require('node-cron');
const PriceAlert = require('../models/PriceAlert');
const { getCurrencyAnalysisService } = require('./ai-currency-analysis.service');
const lineMessagingService = require('./line-messaging.service');
const { lineUserService } = require('../models/LineUser');
const logger = require('../utils/logger');

class DailyAISchedulerService {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.aiAnalysisService = getCurrencyAnalysisService();
    
    // 統計資料
    this.stats = {
      scheduledRuns: 0,
      analysisPerformed: 0,
      notificationsSent: 0,
      errors: 0,
      lastRun: null,
      startTime: Date.now()
    };
  }

  /**
   * 啟動排程服務
   */
  start() {
    if (this.isRunning) {
      logger.warn('每日 AI 分析排程器已在運行中');
      return;
    }

    this.isRunning = true;
    this.stats.startTime = Date.now();

    logger.info('🤖 啟動每日 AI 分析排程器', {
      schedule: '每日早上 7:00',
      timezone: 'Asia/Taipei'
    });

    // 設定 cron job - 每日早上7點執行
    this.cronJob = cron.schedule('0 7 * * *', async () => {
      await this.performDailyAnalysis();
    }, {
      scheduled: true,
      timezone: 'Asia/Taipei'
    });

    // 開發環境下可以立即執行一次測試
    if (process.env.NODE_ENV === 'development') {
      logger.info('🧪 開發環境：立即執行一次 AI 分析測試');
      // 延遲10秒執行，避免與啟動流程衝突
      setTimeout(() => {
        this.performDailyAnalysis();
      }, 10000);
    }
  }

  /**
   * 停止排程服務
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('每日 AI 分析排程器未在運行');
      return;
    }

    this.isRunning = false;

    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
    }

    logger.info('🛑 停止每日 AI 分析排程器', {
      totalRuns: this.stats.scheduledRuns,
      analysisPerformed: this.stats.analysisPerformed,
      uptime: Date.now() - this.stats.startTime
    });
  }

  /**
   * 執行每日 AI 分析
   */
  async performDailyAnalysis() {
    const startTime = Date.now();
    this.stats.scheduledRuns++;
    this.stats.lastRun = new Date();

    try {
      logger.info('🔍 開始執行每日 AI 分析排程...');

      // 1. 查詢有訂閱 AI 分析的貨幣清單
      const subscribedSymbols = await this.getSubscribedSymbols();
      
      if (subscribedSymbols.length === 0) {
        logger.info('📊 沒有貨幣訂閱 AI 分析，跳過執行');
        return;
      }

      logger.info(`📋 發現 ${subscribedSymbols.length} 個貨幣有 AI 分析訂閱`, {
        symbols: subscribedSymbols
      });

      // 2. 對每個訂閱的貨幣執行 AI 分析
      const analysisResults = [];
      for (const symbol of subscribedSymbols) {
        try {
          logger.info(`🤖 開始分析 ${symbol}...`);
          
          // 執行 AI 分析
          const analysisResult = await this.aiAnalysisService.performCurrencyAnalysis(symbol);
          
          if (analysisResult) {
            analysisResults.push({
              symbol,
              result: analysisResult,
              success: true
            });
            this.stats.analysisPerformed++;
            logger.info(`✅ ${symbol} AI 分析完成`);
          } else {
            logger.warn(`⚠️ ${symbol} AI 分析返回空結果`);
          }
          
          // 添加延遲避免 API 限制
          await this.delay(2000);
          
        } catch (error) {
          logger.error(`❌ ${symbol} AI 分析失敗:`, error.message);
          analysisResults.push({
            symbol,
            result: null,
            success: false,
            error: error.message
          });
          this.stats.errors++;
        }
      }

      // 3. 發送分析結果通知
      await this.sendAnalysisNotifications(analysisResults);

      const duration = Date.now() - startTime;
      logger.info(`🎉 每日 AI 分析排程完成`, {
        duration: `${duration}ms`,
        symbolsAnalyzed: analysisResults.filter(r => r.success).length,
        failed: analysisResults.filter(r => !r.success).length,
        notificationsSent: this.stats.notificationsSent
      });

    } catch (error) {
      logger.error('❌ 每日 AI 分析排程執行失敗:', error);
      this.stats.errors++;
    }
  }

  /**
   * 取得有訂閱 AI 分析的貨幣清單
   */
  async getSubscribedSymbols() {
    try {
      const symbols = await PriceAlert.getAISubscribedSymbols();
      return symbols;
    } catch (error) {
      logger.error('❌ 查詢訂閱貨幣清單失敗:', error);
      return [];
    }
  }

  /**
   * 發送 AI 分析結果通知
   */
  async sendAnalysisNotifications(analysisResults) {
    const successfulAnalyses = analysisResults.filter(r => r.success);
    
    if (successfulAnalyses.length === 0) {
      logger.info('📊 沒有成功的 AI 分析結果，跳過通知發送');
      return;
    }

    logger.info(`📬 開始發送 ${successfulAnalyses.length} 個 AI 分析通知...`);

    for (const analysis of successfulAnalyses) {
      try {
        // 查詢訂閱此貨幣 AI 分析的使用者
        const subscribers = await this.getAISubscribers(analysis.symbol);
        
        for (const subscriber of subscribers) {
          await this.sendNotificationToUser(subscriber, analysis);
          this.stats.notificationsSent++;
          
          // 更新最後通知時間
          await this.updateLastNotificationTime(subscriber.alertId);
        }
        
      } catch (error) {
        logger.error(`❌ 發送 ${analysis.symbol} 通知失敗:`, error);
        this.stats.errors++;
      }
    }
  }

  /**
   * 取得訂閱特定貨幣 AI 分析的使用者清單
   */
  async getAISubscribers(symbol) {
    try {
      const alerts = await PriceAlert.find({
        symbol: symbol.toUpperCase(),
        'aiAnalysisSubscription.enabled': true,
        'aiAnalysisSubscription.frequency': 'daily',
        enabled: true
      });

      return alerts.map(alert => ({
        userId: alert.userId,
        alertId: alert._id,
        symbol: alert.symbol,
        notificationMethods: alert.notificationMethods
      }));
    } catch (error) {
      logger.error(`❌ 查詢 ${symbol} 訂閱者失敗:`, error);
      return [];
    }
  }

  /**
   * 發送通知給特定使用者
   */
  async sendNotificationToUser(subscriber, analysis) {
    const { userId, symbol, notificationMethods } = subscriber;
    
    // 只處理 LINE 通知
    if (notificationMethods.lineMessaging?.enabled) {
      try {
        // 查找 LINE User ID - 使用雙重檢查機制
        const lineUserId = await this.findLineUserIdForUser(userId);
        
        if (lineUserId && lineMessagingService.isConfigured) {
          const message = this.formatAIAnalysisMessage(symbol, analysis.result);
          
          const result = await lineMessagingService.sendTextMessage(
            lineUserId,
            message
          );
          
          if (result.success) {
            logger.info(`📤 ${symbol} AI 分析通知已發送`, {
              userId,
              symbol,
              lineUserId: lineUserId.substring(0, 8) + '...'
            });
          } else {
            logger.error(`❌ ${symbol} LINE 通知發送失敗:`, {
              userId,
              error: result.error
            });
          }
        } else {
          const errorMsg = !lineUserId ? 'LINE 使用者未找到或未綁定' : 'LINE 服務未配置';
          logger.warn(`⚠️ ${symbol} 通知跳過`, {
            userId,
            reason: errorMsg
          });
        }
      } catch (error) {
        logger.error(`❌ ${symbol} LINE 通知發送失敗:`, {
          userId,
          error: error.message
        });
      }
    }
  }

  /**
   * 格式化 AI 分析訊息
   */
  formatAIAnalysisMessage(symbol, analysisResult) {
    const analysis = analysisResult.analysis;
    const trend = analysis.trend;
    const technical = analysis.technicalAnalysis;
    
    // 趨勢方向圖標
    const trendIcon = {
      'bullish': '📈',
      'bearish': '📉',
      'neutral': '➡️'
    }[trend.direction] || '📊';

    // 信心度評級
    const confidenceLevel = trend.confidence >= 80 ? '高' : 
                           trend.confidence >= 60 ? '中' : '低';

    const message = `🤖 【每日 AI 分析報告】

💰 ${symbol}
${trendIcon} 趨勢: ${this.translateDirection(trend.direction)}
🎯 信心度: ${trend.confidence}% (${confidenceLevel})

📊 技術指標：
• RSI: ${technical.rsi?.value || 'N/A'} (${technical.rsi?.interpretation || 'N/A'})
• MACD: ${technical.macd?.value || 'N/A'} (${technical.macd?.signal || 'N/A'})
• MA20: ${technical.movingAverage?.ma20 || 'N/A'}

💡 分析摘要：
${trend.summary}

⏰ 分析時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}

🔔 這是您訂閱的每日 AI 分析通知`;

    return message;
  }

  /**
   * 翻譯趨勢方向
   */
  translateDirection(direction) {
    const translations = {
      'bullish': '看漲',
      'bearish': '看跌',
      'neutral': '中性'
    };
    return translations[direction] || direction;
  }

  /**
   * 更新最後通知時間
   */
  async updateLastNotificationTime(alertId) {
    try {
      await PriceAlert.findByIdAndUpdate(alertId, {
        'aiAnalysisSubscription.lastNotificationSent': new Date()
      });
    } catch (error) {
      logger.error('❌ 更新最後通知時間失敗:', error);
    }
  }

  /**
   * 延遲函數
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 取得服務統計資料
   */
  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      isRunning: this.isRunning
    };
  }

  /**
   * 手動觸發 AI 分析 (測試用)
   */
  async triggerManualAnalysis() {
    if (!this.isRunning) {
      throw new Error('排程器未啟動');
    }
    
    logger.info('🧪 手動觸發 AI 分析...');
    await this.performDailyAnalysis();
  }

  /**
   * 查找使用者的 LINE User ID - 使用雙重檢查機制
   * @param {string} nexusTradeUserId - NexusTrade 使用者 ID
   * @returns {string|null} LINE User ID 或 null
   */
  async findLineUserIdForUser(nexusTradeUserId) {
    try {
      // 方法 1: 從 OAuth 系統查找
      const User = require('../models/User.model');
      const user = await User.findById(nexusTradeUserId);
      
      if (user && user.lineId) {
        // 驗證 LINE ID 是否仍然有效（檢查 LineUser 服務中的綁定狀態）
        const lineUser = await lineUserService.findByLineUserId(user.lineId);
        
        if (lineUser && lineUser.isBound && lineUser.nexusTradeUserId === nexusTradeUserId) {
          logger.debug('✅ 通過 OAuth 系統找到有效的 LINE User ID', {
            nexusTradeUserId,
            lineUserId: user.lineId.substring(0, 8) + '...'
          });
          return user.lineId;
        }
      }
      
      // 方法 2: 從 LineUser 服務查找（備用）
      const lineUser = await lineUserService.findByNexusTradeUserId(nexusTradeUserId);
      
      if (lineUser && lineUser.isBound && lineUser.lineUserId) {
        logger.debug('✅ 通過 LineUser 服務找到有效的 LINE User ID', {
          nexusTradeUserId,
          lineUserId: lineUser.lineUserId.substring(0, 8) + '...'
        });
        return lineUser.lineUserId;
      }
      
      // 未找到任何有效的綁定
      logger.warn('⚠️ 未找到有效的 LINE 綁定', {
        nexusTradeUserId,
        hasOAuthLineId: !!(user && user.lineId),
        hasLineUserRecord: !!lineUser
      });
      
      return null;
      
    } catch (error) {
      logger.error('❌ 查找 LINE User ID 失敗', {
        nexusTradeUserId,
        error: error.message
      });
      return null;
    }
  }
}

// 創建全局實例
let dailyAISchedulerService = null;

/**
 * 取得每日 AI 排程器服務實例
 */
function getDailyAISchedulerService() {
  if (!dailyAISchedulerService) {
    dailyAISchedulerService = new DailyAISchedulerService();
  }
  return dailyAISchedulerService;
}

module.exports = {
  DailyAISchedulerService,
  getDailyAISchedulerService
};