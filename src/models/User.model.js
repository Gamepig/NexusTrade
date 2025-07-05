/**
 * NexusTrade 使用者資料模型
 * 
 * 使用者基本資料、認證資訊、關注清單等
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ValidationErrorFactory } = require('../utils/ApiError');

/**
 * 使用者 Schema 定義
 */
const userSchema = new mongoose.Schema({
  // 基本資料
  email: {
    type: String,
    required: [true, '電子郵件為必填欄位'],
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: '電子郵件格式無效'
    }
  },

  password: {
    type: String,
    required: function() {
      return !this.googleId && !this.lineId; // 如果沒有第三方登入，密碼為必填
    },
    minlength: [8, '密碼長度至少需要 8 個字元'],
    validate: {
      validator: function(password) {
        if (!password) return true; // 第三方登入可以沒有密碼
        
        // 如果密碼已經被雜湊過了 (以 $2b$ 開頭)，就跳過驗證
        if (password.startsWith('$2b$')) return true;
        
        // 至少包含一個大寫字母、一個小寫字母、一個數字
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(password);
      },
      message: '密碼必須包含至少一個大寫字母、一個小寫字母和一個數字'
    }
  },

  username: {
    type: String,
    trim: true,
    maxlength: [50, '使用者名稱長度不能超過 50 個字元']
  },

  displayName: {
    type: String,
    trim: true,
    maxlength: [100, '顯示名稱長度不能超過 100 個字元']
  },

  avatar: {
    type: String,
    default: null
  },

  // 第三方登入資訊
  googleId: {
    type: String,
    default: null
  },

  lineId: {
    type: String,
    default: null
  },

  // 使用者偏好設定
  preferences: {
    language: {
      type: String,
      enum: ['zh-TW', 'zh-CN', 'en-US'],
      default: 'zh-TW'
    },
    
    timezone: {
      type: String,
      default: 'Asia/Taipei'
    },

    currency: {
      type: String,
      enum: ['TWD', 'USD', 'CNY'],
      default: 'TWD'
    },

    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      line: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  },

  // 關注清單 (嵌入式設計，適合小量且不常變動的資料)
  watchlist: {
    type: [{
      symbol: {
        type: String,
        required: true,
        uppercase: true
      },
      addedAt: {
        type: Date,
        default: Date.now
      },
      priority: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
      }
    }],
    validate: {
      validator: function(watchlist) {
        return watchlist.length <= 20; // 最多 20 個關注項目
      },
      message: '關注清單最多只能包含 20 個項目'
    },
    default: []
  },

  // 帳戶狀態
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    default: 'active'
  },

  // 電子郵件驗證
  emailVerified: {
    type: Boolean,
    default: false
  },

  emailVerificationToken: {
    type: String,
    default: null
  },

  emailVerificationExpires: {
    type: Date,
    default: null
  },

  // 密碼重設
  passwordResetToken: {
    type: String,
    default: null
  },

  passwordResetExpires: {
    type: Date,
    default: null
  },

  // 最後登入資訊
  lastLogin: {
    type: Date,
    default: null
  },

  lastLoginIP: {
    type: String,
    default: null
  },

  // 會員制度
  membershipLevel: {
    type: String,
    enum: ['free', 'premium', 'enterprise'],
    default: 'free'
  },

  membershipExpiry: {
    type: Date,
    default: null
  },

  alertQuota: {
    used: {
      type: Number,
      default: 0
    },
    limit: {
      type: Number,
      default: 1 // 免費會員預設限制
    }
  },

  premiumFeatures: {
    technicalIndicators: {
      type: Boolean,
      default: false
    },
    unlimitedAlerts: {
      type: Boolean,
      default: false
    },
    prioritySupport: {
      type: Boolean,
      default: false
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
  // Schema 選項
  timestamps: { 
    createdAt: 'createdAt', 
    updatedAt: 'updatedAt' 
  },
  versionKey: false,
  
  // JSON 轉換選項
  toJSON: {
    transform: function(doc, ret) {
      // 移除敏感資料
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      return ret;
    }
  }
});

/**
 * 索引設定
 */
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ lineId: 1 }, { sparse: true });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'watchlist.symbol': 1 });

/**
 * 中介軟體：密碼雜湊
 */
userSchema.pre('save', async function(next) {
  // 只有密碼被修改時才雜湊
  if (!this.isModified('password')) return next();
  
  // 如果沒有密碼（第三方登入），跳過
  if (!this.password) return next();

  try {
    // 雜湊密碼
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * 中介軟體：更新時間戳記
 */
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

/**
 * 實例方法：驗證密碼
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    throw new Error('此帳戶沒有設定密碼');
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * 實例方法：取得公開資料
 */
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    email: this.email,
    username: this.username,
    displayName: this.displayName,
    avatar: this.avatar,
    preferences: this.preferences,
    watchlist: this.watchlist,
    status: this.status,
    emailVerified: this.emailVerified,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

/**
 * 實例方法：新增關注項目
 */
userSchema.methods.addToWatchlist = function(symbol, priority = 3) {
  // 檢查是否已存在
  const exists = this.watchlist.some(item => item.symbol === symbol.toUpperCase());
  if (exists) {
    throw new Error(`${symbol} 已在關注清單中`);
  }

  // 檢查數量限制
  if (this.watchlist.length >= 20) {
    throw new Error('關注清單已達上限 (20 個項目)');
  }

  this.watchlist.push({
    symbol: symbol.toUpperCase(),
    priority,
    addedAt: new Date()
  });

  return this.save();
};

/**
 * 實例方法：移除關注項目
 */
userSchema.methods.removeFromWatchlist = function(symbol) {
  const index = this.watchlist.findIndex(item => item.symbol === symbol.toUpperCase());
  if (index === -1) {
    throw new Error(`${symbol} 不在關注清單中`);
  }

  this.watchlist.splice(index, 1);
  return this.save();
};

/**
 * 實例方法：更新關注項目優先級
 */
userSchema.methods.updateWatchlistPriority = function(symbol, priority) {
  const item = this.watchlist.find(item => item.symbol === symbol.toUpperCase());
  if (!item) {
    throw new Error(`${symbol} 不在關注清單中`);
  }

  if (priority < 1 || priority > 5) {
    throw new Error('優先級必須在 1-5 之間');
  }

  item.priority = priority;
  return this.save();
};

/**
 * 靜態方法：根據電子郵件查找使用者
 */
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * 靜態方法：根據第三方 ID 查找使用者
 */
userSchema.statics.findByThirdPartyId = function(provider, id) {
  const query = {};
  if (provider === 'google') {
    query.googleId = id;
  } else if (provider === 'line') {
    query.lineId = id;
  } else {
    throw new Error('不支援的第三方登入提供者');
  }
  
  return this.findOne(query);
};

/**
 * 靜態方法：建立使用者（含驗證）
 */
userSchema.statics.createUser = async function(userData) {
  try {
    const user = new this(userData);
    await user.validate();
    return await user.save();
  } catch (error) {
    if (error.name === 'ValidationError') {
      throw ValidationErrorFactory.fromMongooseError(error);
    }
    throw error;
  }
};

/**
 * 靜態方法：取得使用者統計資料
 */
userSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const total = await this.countDocuments();
  const verified = await this.countDocuments({ emailVerified: true });
  const withWatchlist = await this.countDocuments({ 'watchlist.0': { $exists: true } });

  return {
    total,
    verified,
    withWatchlist,
    byStatus: stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {})
  };
};

/**
 * 虛擬欄位：關注清單數量
 */
userSchema.virtual('watchlistCount').get(function() {
  return this.watchlist.length;
});

/**
 * 虛擬欄位：是否為第三方登入用戶
 */
userSchema.virtual('isThirdPartyUser').get(function() {
  return !!(this.googleId || this.lineId);
});

module.exports = mongoose.model('User', userSchema);