/**
 * NexusTrade 價格警報模型
 * 
 * 定義價格警報的資料結構和驗證規則
 */

const mongoose = require('mongoose');

const priceAlertSchema = new mongoose.Schema({
  // 使用者 ID
  userId: {
    type: String, // 使用 String 以兼容 Mock 系統
    required: true,
    index: true
  },

  // 交易對
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[A-Z0-9]{2,12}USDT?$/.test(v);
      },
      message: '交易對格式不正確'
    }
  },

  // 警報類型 (擴展支援技術指標)
  alertType: {
    type: String,
    required: true,
    enum: [
      // 基礎價格警報 (免費會員)
      'price_above', 'price_below', 'percent_change', 'volume_spike',
      // 技術指標警報 (付費會員)
      'rsi_above', 'rsi_below', 'rsi_overbought', 'rsi_oversold',
      'macd_bullish_crossover', 'macd_bearish_crossover', 
      'macd_above_zero', 'macd_below_zero',
      'ma_cross_above', 'ma_cross_below', 'ma_golden_cross', 'ma_death_cross',
      'ma_support_bounce', 'ma_resistance_reject',
      'bb_upper_touch', 'bb_lower_touch', 'bb_squeeze', 'bb_expansion',
      'bb_middle_cross', 'bb_bandwidth_alert',
      'williams_overbought', 'williams_oversold', 'williams_above', 'williams_below'
    ],
    default: 'price_above'
  },

  // 目標價格 (價格警報用)
  targetPrice: {
    type: Number,
    required: function() {
      return this.alertType === 'price_above' || this.alertType === 'price_below';
    },
    min: 0
  },

  // 百分比變化 (百分比警報用)
  percentChange: {
    type: Number,
    required: function() {
      return this.alertType === 'percent_change';
    },
    min: -100,
    max: 1000
  },

  // 成交量倍數 (成交量警報用)
  volumeMultiplier: {
    type: Number,
    required: function() {
      return this.alertType === 'volume_spike';
    },
    min: 1
  },

  // 技術指標配置 (付費會員功能)
  technicalIndicatorConfig: {
    // RSI 配置
    rsi: {
      period: { type: Number, default: 14, min: 2, max: 50 },
      overboughtLevel: { type: Number, default: 70, min: 50, max: 95 },
      oversoldLevel: { type: Number, default: 30, min: 5, max: 50 },
      threshold: { type: Number, min: 0, max: 100 } // 自定義閾值
    },
    
    // MACD 配置
    macd: {
      fastPeriod: { type: Number, default: 12, min: 2, max: 50 },
      slowPeriod: { type: Number, default: 26, min: 2, max: 100 },
      signalPeriod: { type: Number, default: 9, min: 2, max: 50 },
      threshold: { type: Number, default: 0 } // 零軸或自定義閾值
    },
    
    // 移動平均線配置
    movingAverage: {
      fastPeriod: { type: Number, default: 20, min: 2, max: 200 },
      slowPeriod: { type: Number, default: 50, min: 2, max: 200 },
      type: { type: String, enum: ['SMA', 'EMA'], default: 'SMA' },
      priceType: { type: String, enum: ['close', 'open', 'high', 'low'], default: 'close' }
    },
    
    // 布林通道配置
    bollingerBands: {
      period: { type: Number, default: 20, min: 2, max: 100 },
      standardDeviations: { type: Number, default: 2, min: 0.5, max: 5 },
      bandwidth: { type: Number, min: 0, max: 1 }, // 通道寬度警報閾值
      squeeze: { type: Number, default: 0.1, min: 0.01, max: 0.5 } // 擠壓檢測閾值
    },
    
    // Williams %R 配置
    williamsR: {
      period: { type: Number, default: 14, min: 2, max: 50 },
      overboughtLevel: { type: Number, default: -20, min: -50, max: -10 },
      oversoldLevel: { type: Number, default: -80, min: -95, max: -50 },
      threshold: { type: Number, min: -100, max: 0 } // 自定義閾值
    }
  },

  // 警報狀態
  status: {
    type: String,
    enum: ['active', 'triggered', 'paused', 'expired'],
    default: 'active',
    index: true
  },

  // 警報優先級
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  // 通知方式
  notificationMethods: {
    lineMessaging: {
      enabled: { type: Boolean, default: false },
      userId: { type: String } // 儲存 LINE User ID
    },
    email: {
      enabled: { type: Boolean, default: false },
      address: String
    },
    webhook: {
      enabled: { type: Boolean, default: false },
      url: String
    }
  },

  // AI 分析訂閱
  aiAnalysisSubscription: {
    enabled: { type: Boolean, default: false },
    frequency: { 
      type: String, 
      enum: ['daily'], 
      default: 'daily' 
    },
    lastNotificationSent: Date,
    subscribedAt: Date
  },

  // 觸發條件
  conditions: {
    // 僅在交易時間觸發
    onlyTradingHours: { type: Boolean, default: false },
    
    // 最小觸發間隔 (秒)
    minInterval: { type: Number, default: 300, min: 60 },
    
    // 確認時間 (秒) - 價格需要維持多久才觸發
    confirmationTime: { type: Number, default: 0, min: 0 },
    
    // 最大觸發次數
    maxTriggers: { type: Number, default: 1, min: 1 }
  },

  // 觸發歷史
  triggerHistory: [{
    triggeredAt: { type: Date, default: Date.now },
    triggerPrice: Number,
    priceChange: Number,
    volume: Number,
    notificationsSent: [{
      method: String,
      success: Boolean,
      sentAt: Date,
      error: String
    }]
  }],

  // 建立時的市場數據
  createdMarketData: {
    price: Number,
    volume: Number,
    marketCap: Number
  },

  // 備註
  note: {
    type: String,
    maxlength: 500,
    trim: true
  },

  // 過期時間
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  },

  // 是否啟用
  enabled: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 複合索引
priceAlertSchema.index({ userId: 1, symbol: 1 });
priceAlertSchema.index({ status: 1, enabled: 1 });
priceAlertSchema.index({ alertType: 1, status: 1 });

// 虛擬屬性
priceAlertSchema.virtual('isActive').get(function() {
  return this.status === 'active' && this.enabled && 
         (!this.expiresAt || this.expiresAt > new Date());
});

priceAlertSchema.virtual('triggerCount').get(function() {
  return this.triggerHistory ? this.triggerHistory.length : 0;
});

priceAlertSchema.virtual('lastTriggered').get(function() {
  if (this.triggerHistory && this.triggerHistory.length > 0) {
    return this.triggerHistory[this.triggerHistory.length - 1].triggeredAt;
  }
  return null;
});

// 實例方法
priceAlertSchema.methods.trigger = function(marketData) {
  const trigger = {
    triggeredAt: new Date(),
    triggerPrice: marketData.price,
    priceChange: marketData.priceChange,
    volume: marketData.volume,
    notificationsSent: []
  };
  
  this.triggerHistory.push(trigger);
  
  // 檢查是否達到最大觸發次數
  if (this.triggerHistory.length >= this.conditions.maxTriggers) {
    this.status = 'triggered';
    this.enabled = false;
  }
  
  return this.save();
};

priceAlertSchema.methods.addNotificationResult = function(method, success, error = null) {
  if (this.triggerHistory.length > 0) {
    const lastTrigger = this.triggerHistory[this.triggerHistory.length - 1];
    lastTrigger.notificationsSent.push({
      method,
      success,
      sentAt: new Date(),
      error
    });
    return this.save();
  }
};

priceAlertSchema.methods.pause = function() {
  this.status = 'paused';
  return this.save();
};

priceAlertSchema.methods.resume = function() {
  if (this.status === 'paused') {
    this.status = 'active';
  }
  return this.save();
};

priceAlertSchema.methods.canTrigger = function() {
  if (!this.isActive) return false;
  
  // 檢查觸發間隔
  if (this.lastTriggered) {
    const timeSinceLastTrigger = Date.now() - this.lastTriggered.getTime();
    if (timeSinceLastTrigger < this.conditions.minInterval * 1000) {
      return false;
    }
  }
  
  // 檢查最大觸發次數
  if (this.triggerCount >= this.conditions.maxTriggers) {
    return false;
  }
  
  return true;
};

// 靜態方法
priceAlertSchema.statics.findActiveAlerts = async function(symbol = null, options = {}) {
  try {
    // 建立基礎查詢條件
    const query = { 
      status: 'active', 
      enabled: true
    };
    
    if (symbol) {
      query.symbol = symbol.toUpperCase();
    }
    
    // 使用原生 MongoDB 查詢避開 Mongoose 8.x 的序列化問題
    const collection = this.collection;
    const pipeline = [
      { $match: query },
      { 
        $match: {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
          ]
        }
      },
      { $sort: { createdAt: -1 } }
    ];
    
    // 添加可選的限制
    if (options.limit) {
      pipeline.push({ $limit: options.limit });
    }
    
    if (options.skip) {
      pipeline.push({ $skip: options.skip });
    }
    
    // 添加字段選擇
    if (options.select) {
      const projection = {};
      const fields = options.select.split(' ');
      fields.forEach(field => {
        if (field.trim()) {
          projection[field.trim()] = 1;
        }
      });
      pipeline.push({ $project: projection });
    }
    
    // 執行聚合查詢
    const results = await collection.aggregate(pipeline, {
      maxTimeMS: options.timeout || 15000
    }).toArray();
    
    // 如果不使用 lean，則轉換為 Mongoose 文檔
    if (options.lean === false) {
      return results.map(doc => new this(doc));
    }
    
    return results;
  } catch (error) {
    // 如果聚合查詢失敗，回退到簡單查詢（不使用 expiresAt 條件）
    console.warn('聚合查詢失敗，使用簡化查詢:', error.message);
    
    const simpleQuery = { 
      status: 'active', 
      enabled: true
    };
    
    if (symbol) {
      simpleQuery.symbol = symbol.toUpperCase();
    }
    
    let queryBuilder = this.find(simpleQuery);
    
    if (options.select) {
      queryBuilder = queryBuilder.select(options.select);
    }
    
    if (options.lean !== false) {
      queryBuilder = queryBuilder.lean();
    }
    
    if (options.limit) {
      queryBuilder = queryBuilder.limit(options.limit);
    }
    
    queryBuilder = queryBuilder.sort({ createdAt: -1 });
    
    return await queryBuilder.exec();
  }
};

priceAlertSchema.statics.findUserAlerts = function(userId, status = null) {
  const query = { userId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

priceAlertSchema.statics.getAlertStats = function(userId = null) {
  const matchStage = userId ? { $match: { userId } } : { $match: {} };
  
  return this.aggregate([
    matchStage,
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

priceAlertSchema.statics.getAISubscribedSymbols = function() {
  return this.find({
    'aiAnalysisSubscription.enabled': true,
    'aiAnalysisSubscription.frequency': 'daily',
    enabled: true
  }).distinct('symbol');
};

// 中介軟體
priceAlertSchema.pre('save', function(next) {
  // 設定過期時間 (如果未設定，預設30天)
  if (!this.expiresAt && this.isNew) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  
  next();
});

priceAlertSchema.pre('remove', function(next) {
  // 清理相關通知歷史
  // 這裡可以添加清理邏輯
  next();
});

// Mock 版本 (用於開發)
class MockPriceAlert {
  constructor(data) {
    Object.assign(this, {
      _id: data._id || this.generateId(),
      userId: data.userId,
      symbol: data.symbol?.toUpperCase(),
      alertType: data.alertType || 'price_above',
      targetPrice: data.targetPrice,
      percentChange: data.percentChange,
      volumeMultiplier: data.volumeMultiplier,
      technicalIndicatorConfig: data.technicalIndicatorConfig || {},
      status: data.status || 'active',
      priority: data.priority || 'medium',
      notificationMethods: data.notificationMethods || {
        lineMessaging: { enabled: false },
        email: { enabled: false },
        webhook: { enabled: false }
      },
      aiAnalysisSubscription: data.aiAnalysisSubscription || {
        enabled: false,
        frequency: 'daily',
        lastNotificationSent: null,
        subscribedAt: null
      },
      conditions: data.conditions || {
        onlyTradingHours: false,
        minInterval: 300,
        confirmationTime: 0,
        maxTriggers: 1
      },
      triggerHistory: data.triggerHistory || [],
      createdMarketData: data.createdMarketData,
      note: data.note,
      expiresAt: data.expiresAt,
      enabled: data.enabled !== false,
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date()
    });
  }

  generateId() {
    return 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  save() {
    this.updatedAt = new Date();
    MockPriceAlert.store.set(this._id, this);
    return Promise.resolve(this);
  }

  remove() {
    MockPriceAlert.store.delete(this._id);
    return Promise.resolve();
  }

  get isActive() {
    return this.status === 'active' && this.enabled && 
           (!this.expiresAt || this.expiresAt > new Date());
  }

  get triggerCount() {
    return this.triggerHistory ? this.triggerHistory.length : 0;
  }

  get lastTriggered() {
    if (this.triggerHistory && this.triggerHistory.length > 0) {
      return this.triggerHistory[this.triggerHistory.length - 1].triggeredAt;
    }
    return null;
  }

  canTrigger() {
    if (!this.isActive) return false;
    
    if (this.lastTriggered) {
      const timeSinceLastTrigger = Date.now() - this.lastTriggered.getTime();
      if (timeSinceLastTrigger < this.conditions.minInterval * 1000) {
        return false;
      }
    }
    
    if (this.triggerCount >= this.conditions.maxTriggers) {
      return false;
    }
    
    return true;
  }

  trigger(marketData) {
    const trigger = {
      triggeredAt: new Date(),
      triggerPrice: marketData.price,
      priceChange: marketData.priceChange,
      volume: marketData.volume,
      notificationsSent: []
    };
    
    this.triggerHistory.push(trigger);
    
    if (this.triggerHistory.length >= this.conditions.maxTriggers) {
      this.status = 'triggered';
      this.enabled = false;
    }
    
    return this.save();
  }

  static findActiveAlerts(symbol = null) {
    const alerts = Array.from(MockPriceAlert.store.values()).filter(alert => {
      if (!alert.isActive) return false;
      if (symbol && alert.symbol !== symbol.toUpperCase()) return false;
      return true;
    });
    return Promise.resolve(alerts);
  }

  static findUserAlerts(userId, status = null) {
    const alerts = Array.from(MockPriceAlert.store.values())
      .filter(alert => {
        if (alert.userId !== userId) return false;
        if (status && alert.status !== status) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    return Promise.resolve(alerts);
  }

  static findById(id) {
    return Promise.resolve(MockPriceAlert.store.get(id) || null);
  }

  static getAISubscribedSymbols() {
    const symbols = Array.from(MockPriceAlert.store.values())
      .filter(alert => {
        return alert.aiAnalysisSubscription?.enabled === true && 
               alert.aiAnalysisSubscription?.frequency === 'daily' &&
               alert.enabled;
      })
      .map(alert => alert.symbol);
    
    // 去重
    return Promise.resolve([...new Set(symbols)]);
  }
}

// Mock 存儲
MockPriceAlert.store = new Map();

// 根據環境選擇模型
const PriceAlert = process.env.SKIP_MONGODB === 'true' ? 
  MockPriceAlert : 
  mongoose.model('PriceAlert', priceAlertSchema);

module.exports = PriceAlert;