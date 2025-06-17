/**
 * NexusTrade 通知規則資料模型
 * 
 * 定義使用者的價格通知規則和條件
 */

const mongoose = require('mongoose');
const { ValidationErrorFactory } = require('../utils/ApiError');

/**
 * 通知條件 Schema
 */
const conditionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'price_above',     // 價格高於
      'price_below',     // 價格低於
      'price_change',    // 價格變動百分比
      'volume_above',    // 交易量高於
      'volume_below',    // 交易量低於
      'volume_change'    // 交易量變動百分比
    ],
    required: [true, '條件類型為必填']
  },

  value: {
    type: Number,
    required: [true, '條件數值為必填'],
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: '條件數值必須大於 0'
    }
  },

  unit: {
    type: String,
    enum: ['USD', 'USDT', 'BTC', 'ETH', 'percent'],
    default: 'USDT'
  },

  // 用於百分比變動的時間範圍
  timeframe: {
    type: String,
    enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
    default: '1h',
    required: function() {
      return this.type.includes('_change');
    }
  }
}, { _id: false });

/**
 * 通知規則 Schema
 */
const notificationRuleSchema = new mongoose.Schema({
  // 關聯使用者
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '使用者 ID 為必填'],
    index: true
  },

  // 交易對
  symbol: {
    type: String,
    required: [true, '交易對為必填'],
    uppercase: true,
    trim: true,
    validate: {
      validator: function(symbol) {
        // 基本的交易對格式驗證 (例: BTCUSDT, ETHUSDT)
        return /^[A-Z]{2,10}USDT?$/.test(symbol);
      },
      message: '交易對格式無效'
    }
  },

  // 規則名稱
  name: {
    type: String,
    required: [true, '規則名稱為必填'],
    trim: true,
    maxlength: [100, '規則名稱長度不能超過 100 個字元']
  },

  // 規則描述
  description: {
    type: String,
    trim: true,
    maxlength: [500, '規則描述長度不能超過 500 個字元']
  },

  // 通知條件 (可以有多個條件)
  conditions: {
    type: [conditionSchema],
    validate: {
      validator: function(conditions) {
        return conditions && conditions.length > 0 && conditions.length <= 5;
      },
      message: '每個規則必須有 1-5 個條件'
    }
  },

  // 條件邏輯關係
  conditionLogic: {
    type: String,
    enum: ['AND', 'OR'],
    default: 'AND',
    required: function() {
      return this.conditions && this.conditions.length > 1;
    }
  },

  // 通知方式
  notificationMethods: {
    email: {
      type: Boolean,
      default: false
    },
    line: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: true
    }
  },

  // 規則狀態
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // 優先級
  priority: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    default: 3,
    validate: {
      validator: function(priority) {
        return priority >= 1 && priority <= 5;
      },
      message: '優先級必須在 1-5 之間'
    }
  },

  // 觸發限制
  trigger: {
    // 最大觸發次數 (0 表示無限制)
    maxTriggers: {
      type: Number,
      default: 0,
      min: [0, '最大觸發次數不能為負數']
    },

    // 已觸發次數
    triggeredCount: {
      type: Number,
      default: 0,
      min: [0, '觸發次數不能為負數']
    },

    // 冷卻期間 (分鐘，避免重複通知)
    cooldownMinutes: {
      type: Number,
      default: 60,
      min: [1, '冷卻期間至少 1 分鐘'],
      max: [1440, '冷卻期間最多 24 小時']
    },

    // 上次觸發時間
    lastTriggered: {
      type: Date,
      default: null
    }
  },

  // 有效期限
  expiresAt: {
    type: Date,
    default: function() {
      // 預設 30 天後過期
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    },
    validate: {
      validator: function(date) {
        return date > new Date();
      },
      message: '過期時間必須是未來的時間'
    }
  },

  // 系統欄位
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  versionKey: false
});

/**
 * 索引設定
 */
notificationRuleSchema.index({ userId: 1, isActive: 1 });
notificationRuleSchema.index({ symbol: 1, isActive: 1 });
notificationRuleSchema.index({ isActive: 1, expiresAt: 1 });
notificationRuleSchema.index({ userId: 1, symbol: 1 });
notificationRuleSchema.index({ createdAt: -1 });
notificationRuleSchema.index({ priority: 1, isActive: 1 });

// 複合索引用於查詢特定使用者的活躍規則
notificationRuleSchema.index({ 
  userId: 1, 
  isActive: 1, 
  expiresAt: 1 
});

/**
 * 中介軟體：更新時間戳記
 */
notificationRuleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

/**
 * 中介軟體：自動設定規則名稱
 */
notificationRuleSchema.pre('save', function(next) {
  if (!this.name && this.conditions && this.conditions.length > 0) {
    const condition = this.conditions[0];
    let conditionText = '';
    
    switch (condition.type) {
      case 'price_above':
        conditionText = `價格高於 ${condition.value} ${condition.unit}`;
        break;
      case 'price_below':
        conditionText = `價格低於 ${condition.value} ${condition.unit}`;
        break;
      case 'price_change':
        conditionText = `價格變動 ${condition.value}% (${condition.timeframe})`;
        break;
      default:
        conditionText = '自訂條件';
    }
    
    this.name = `${this.symbol} ${conditionText}`;
  }
  next();
});

/**
 * 實例方法：檢查規則是否可觸發
 */
notificationRuleSchema.methods.canTrigger = function() {
  // 檢查規則是否活躍
  if (!this.isActive) return false;
  
  // 檢查是否已過期
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  
  // 檢查觸發次數限制
  if (this.trigger.maxTriggers > 0 && 
      this.trigger.triggeredCount >= this.trigger.maxTriggers) {
    return false;
  }
  
  // 檢查冷卻期間
  if (this.trigger.lastTriggered) {
    const cooldownMs = this.trigger.cooldownMinutes * 60 * 1000;
    const timeSinceLastTrigger = Date.now() - this.trigger.lastTriggered.getTime();
    if (timeSinceLastTrigger < cooldownMs) return false;
  }
  
  return true;
};

/**
 * 實例方法：觸發通知
 */
notificationRuleSchema.methods.triggerNotification = function() {
  if (!this.canTrigger()) {
    throw new Error('規則目前無法觸發');
  }
  
  this.trigger.triggeredCount += 1;
  this.trigger.lastTriggered = new Date();
  
  return this.save();
};

/**
 * 實例方法：重設觸發計數
 */
notificationRuleSchema.methods.resetTriggerCount = function() {
  this.trigger.triggeredCount = 0;
  this.trigger.lastTriggered = null;
  return this.save();
};

/**
 * 實例方法：延長有效期限
 */
notificationRuleSchema.methods.extendExpiry = function(days = 30) {
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + days);
  this.expiresAt = newExpiry;
  return this.save();
};

/**
 * 實例方法：生成條件描述
 */
notificationRuleSchema.methods.getConditionDescription = function() {
  if (!this.conditions || this.conditions.length === 0) {
    return '無條件';
  }
  
  const descriptions = this.conditions.map(condition => {
    switch (condition.type) {
      case 'price_above':
        return `價格 > ${condition.value} ${condition.unit}`;
      case 'price_below':
        return `價格 < ${condition.value} ${condition.unit}`;
      case 'price_change':
        return `價格變動 ${condition.value}% (${condition.timeframe})`;
      case 'volume_above':
        return `交易量 > ${condition.value}`;
      case 'volume_below':
        return `交易量 < ${condition.value}`;
      case 'volume_change':
        return `交易量變動 ${condition.value}% (${condition.timeframe})`;
      default:
        return '未知條件';
    }
  });
  
  if (descriptions.length === 1) {
    return descriptions[0];
  }
  
  const logic = this.conditionLogic === 'OR' ? ' 或 ' : ' 且 ';
  return descriptions.join(logic);
};

/**
 * 靜態方法：取得使用者的活躍規則
 */
notificationRuleSchema.statics.findActiveByUser = function(userId) {
  return this.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).sort({ priority: -1, createdAt: -1 });
};

/**
 * 靜態方法：取得特定交易對的活躍規則
 */
notificationRuleSchema.statics.findActiveBySymbol = function(symbol) {
  return this.find({
    symbol: symbol.toUpperCase(),
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).populate('userId', 'email preferences.notifications')
    .sort({ priority: -1, createdAt: -1 });
};

/**
 * 靜態方法：清理過期規則
 */
notificationRuleSchema.statics.cleanupExpired = async function() {
  const result = await this.updateMany(
    { 
      isActive: true,
      expiresAt: { $lt: new Date() }
    },
    { 
      $set: { isActive: false }
    }
  );
  
  return result.modifiedCount;
};

/**
 * 靜態方法：取得統計資料
 */
notificationRuleSchema.statics.getStatistics = async function() {
  const totalRules = await this.countDocuments();
  const activeRules = await this.countDocuments({ isActive: true });
  const expiredRules = await this.countDocuments({ 
    expiresAt: { $lt: new Date() }
  });
  
  const triggerStats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalTriggers: { $sum: '$trigger.triggeredCount' },
        avgTriggersPerRule: { $avg: '$trigger.triggeredCount' }
      }
    }
  ]);

  const symbolStats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$symbol',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  return {
    totalRules,
    activeRules,
    expiredRules,
    triggerStatistics: triggerStats[0] || { totalTriggers: 0, avgTriggersPerRule: 0 },
    topSymbols: symbolStats
  };
};

/**
 * 靜態方法：建立通知規則（含驗證）
 */
notificationRuleSchema.statics.createRule = async function(ruleData) {
  try {
    const rule = new this(ruleData);
    await rule.validate();
    return await rule.save();
  } catch (error) {
    if (error.name === 'ValidationError') {
      throw ValidationErrorFactory.fromMongooseError(error);
    }
    throw error;
  }
};

/**
 * 虛擬欄位：是否已過期
 */
notificationRuleSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

/**
 * 虛擬欄位：剩餘觸發次數
 */
notificationRuleSchema.virtual('remainingTriggers').get(function() {
  if (this.trigger.maxTriggers === 0) return Infinity;
  return Math.max(0, this.trigger.maxTriggers - this.trigger.triggeredCount);
});

/**
 * 虛擬欄位：距離下次可觸發的時間 (分鐘)
 */
notificationRuleSchema.virtual('minutesUntilNextTrigger').get(function() {
  if (!this.trigger.lastTriggered) return 0;
  
  const cooldownMs = this.trigger.cooldownMinutes * 60 * 1000;
  const timeSinceLastTrigger = Date.now() - this.trigger.lastTriggered.getTime();
  const remainingCooldown = cooldownMs - timeSinceLastTrigger;
  
  return Math.max(0, Math.ceil(remainingCooldown / (60 * 1000)));
});

module.exports = mongoose.model('NotificationRule', notificationRuleSchema);