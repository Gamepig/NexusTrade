/**
 * AI 分析結果模型
 * 
 * 儲存每日 AI 分析結果，避免重複調用 OpenRouter API
 */

const mongoose = require('mongoose');

/**
 * AI 分析結果 Schema
 */
const aiAnalysisResultSchema = new mongoose.Schema({
  // 分析類型
  analysisType: {
    type: String,
    required: true,
    enum: ['homepage_trend', 'single_currency'],
    index: true
  },
  
  // 分析日期 (YYYY-MM-DD 格式)
  analysisDate: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: '分析日期格式必須為 YYYY-MM-DD'
    }
  },
  
  // 交易對代號 (單一貨幣分析時使用)
  symbol: {
    type: String,
    required: function() {
      return this.analysisType === 'single_currency';
    },
    uppercase: true,
    index: true
  },
  
  // 分析結果
  analysis: {
    // 趨勢方向
    trend: {
      direction: {
        type: String,
        required: true,
        enum: ['bullish', 'bearish', 'neutral'], // 看漲、看跌、中性
      },
      confidence: {
        type: Number,
        min: 0,
        max: 100,
        required: true
      },
      summary: {
        type: String,
        required: true,
        maxlength: 500
      }
    },
    
    // 技術分析 (6個主要指標)
    technicalAnalysis: {
      rsi: {
        value: Number,
        interpretation: String, // 超買、超賣、中性
        signal: String // 買入、賣出、持有
      },
      macd: {
        value: Number,
        signal: String,
        interpretation: String
      },
      movingAverage: {
        ma7: Number,
        ma20: Number,
        ma50: Number,
        position: String, // 價格相對於MA的位置
        signal: String
      },
      bollingerBands: {
        upper: Number,
        middle: Number,
        lower: Number,
        position: String, // 價格在布林帶的位置
        squeeze: Boolean, // 是否處於收縮狀態
        signal: String
      },
      volume: {
        trend: String, // 量能趨勢
        interpretation: String,
        signal: String
      },
      williamsR: {
        value: Number,
        interpretation: String, // 超買、超賣、中性
        signal: String // 買入、賣出、持有
      }
    },
    
    // 市場情緒
    marketSentiment: {
      score: {
        type: Number,
        min: 0,
        max: 100,
        required: true
      },
      label: {
        type: String,
        required: true,
        enum: ['extreme_fear', 'fear', 'neutral', 'greed', 'extreme_greed']
      },
      factors: [{
        factor: String,
        impact: String,
        description: String
      }],
      summary: {
        type: String,
        required: true,
        maxlength: 300
      }
    },
    
    // 新聞情緒分析 (首頁分析時使用)
    newsSentiment: {
      type: {
        positiveCount: Number,
        negativeCount: Number,
        neutralCount: Number,
        overallSentiment: String,
        keyTopics: [String],
        summary: String
      },
      required: function() {
        return this.analysisType === 'homepage_trend';
      }
    },
    
    // 時間框架分析 (首頁分析時使用)
    timeframeAnalysis: {
      type: {
        daily: {
          trend: String,
          key_levels: [Number],
          summary: String
        },
        weekly: {
          trend: String,
          key_levels: [Number], 
          summary: String
        },
        monthly: {
          trend: String,
          key_levels: [Number],
          summary: String
        }
      },
      required: function() {
        return this.analysisType === 'homepage_trend';
      }
    }
  },
  
  // 使用的數據來源
  dataSources: {
    symbols: [String], // 分析使用的交易對
    newsCount: Number, // 使用的新聞數量
    dataTimestamp: Date, // 數據時間戳
    analysisModel: {
      type: String,
      default: 'qwen/qwen-2.5-72b-instruct:free'
    }
  },
  
  // 分析品質指標
  qualityMetrics: {
    tokensUsed: Number,
    processingTime: Number, // 毫秒
    dataCompleteness: Number, // 0-100
    confidence: Number // 整體分析可信度 0-100
  },
  
  // 快取設定
  expiresAt: {
    type: Date,
    default: function() {
      // 設定為隔日早上 6 點過期
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0);
      return tomorrow;
    },
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true,
  collection: 'ai_analysis_results'
});

// 複合索引：優化查詢效能
aiAnalysisResultSchema.index({ 
  analysisType: 1, 
  analysisDate: 1 
});

aiAnalysisResultSchema.index({ 
  analysisType: 1, 
  symbol: 1, 
  analysisDate: 1 
});

// 虛擬欄位：格式化趨勢方向
aiAnalysisResultSchema.virtual('analysis.trend.directionText').get(function() {
  const directions = {
    'bullish': '看漲',
    'bearish': '看跌', 
    'neutral': '中性'
  };
  return directions[this.analysis.trend.direction] || this.analysis.trend.direction;
});

// 虛擬欄位：格式化市場情緒
aiAnalysisResultSchema.virtual('analysis.marketSentiment.labelText').get(function() {
  const labels = {
    'extreme_fear': '極度恐慌',
    'fear': '恐慌',
    'neutral': '中性',
    'greed': '貪婪',
    'extreme_greed': '極度貪婪'
  };
  return labels[this.analysis.marketSentiment.label] || this.analysis.marketSentiment.label;
});

// 靜態方法：獲取今日首頁分析
aiAnalysisResultSchema.statics.getTodayHomepageAnalysis = function() {
  const today = new Date().toISOString().split('T')[0];
  return this.findOne({
    analysisType: 'homepage_trend',
    analysisDate: today
  }).sort({ createdAt: -1 });
};

// 靜態方法：獲取今日單一貨幣分析
aiAnalysisResultSchema.statics.getTodayCurrencyAnalysis = function(symbol) {
  const today = new Date().toISOString().split('T')[0];
  return this.findOne({
    analysisType: 'single_currency',
    symbol: symbol.toUpperCase(),
    analysisDate: today
  }).sort({ createdAt: -1 });
};

// 靜態方法：檢查是否需要重新分析
aiAnalysisResultSchema.statics.needsAnalysis = async function(analysisType, symbol = null) {
  const today = new Date().toISOString().split('T')[0];
  const query = {
    analysisType,
    analysisDate: today
  };
  
  if (symbol) {
    query.symbol = symbol.toUpperCase();
  }
  
  const existing = await this.findOne(query);
  return !existing;
};

// 實例方法：檢查分析是否過期
aiAnalysisResultSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// 實例方法：獲取分析總結
aiAnalysisResultSchema.methods.getSummary = function() {
  return {
    type: this.analysisType,
    date: this.analysisDate,
    symbol: this.symbol,
    trend: {
      direction: this.analysis.trend.direction,
      confidence: this.analysis.trend.confidence,
      summary: this.analysis.trend.summary
    },
    sentiment: {
      score: this.analysis.marketSentiment.score,
      label: this.analysis.marketSentiment.label,
      summary: this.analysis.marketSentiment.summary
    },
    quality: this.qualityMetrics
  };
};

// 中介軟體：保存前驗證
aiAnalysisResultSchema.pre('save', function(next) {
  // 自動設定分析日期為今天
  if (!this.analysisDate) {
    this.analysisDate = new Date().toISOString().split('T')[0];
  }
  
  // 驗證必要欄位
  if (this.analysisType === 'single_currency' && !this.symbol) {
    return next(new Error('單一貨幣分析必須指定交易對代號'));
  }
  
  next();
});

const AIAnalysisResult = mongoose.model('AIAnalysisResult', aiAnalysisResultSchema);

module.exports = AIAnalysisResult;