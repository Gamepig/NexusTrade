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

  // 警報類型
  alertType: {
    type: String,
    required: true,
    enum: ['price_above', 'price_below', 'percent_change', 'volume_spike'],
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
    lineNotify: {
      enabled: { type: Boolean, default: false },
      token: { type: String, select: false } // 不會在查詢中返回
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
priceAlertSchema.statics.findActiveAlerts = function(symbol = null) {
  const query = { 
    status: 'active', 
    enabled: true,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  };
  
  if (symbol) {
    query.symbol = symbol.toUpperCase();
  }
  
  return this.find(query);
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
      status: data.status || 'active',
      priority: data.priority || 'medium',
      notificationMethods: data.notificationMethods || {
        lineNotify: { enabled: false },
        email: { enabled: false },
        webhook: { enabled: false }
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
}

// Mock 存儲
MockPriceAlert.store = new Map();

// 根據環境選擇模型
const PriceAlert = process.env.SKIP_MONGODB === 'true' ? 
  MockPriceAlert : 
  mongoose.model('PriceAlert', priceAlertSchema);

module.exports = PriceAlert;