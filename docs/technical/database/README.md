# 資料庫設計文件

## 📋 概述

NexusTrade 使用 MongoDB 作為主要資料庫，採用文檔導向的 NoSQL 設計，支援靈活的資料結構和高效的查詢性能。資料庫設計遵循業務邏輯需求，優化了用戶體驗和系統性能。

## 🏗️ 架構設計

### 資料庫架構
```
MongoDB 7.0+
├── nexustrade (主資料庫)
│   ├── users (使用者集合)
│   ├── priceAlerts (價格警報集合)
│   ├── watchlists (觀察清單集合)
│   ├── aiAnalysisResults (AI 分析結果集合)
│   ├── lineUsers (LINE 使用者集合)
│   └── sessions (會話記錄集合)
├── logs (日誌資料庫)
│   ├── apiLogs (API 請求日誌)
│   └── errorLogs (錯誤日誌)
└── cache (快取資料庫)
    ├── marketData (市場數據快取)
    └── analysisCache (分析結果快取)
```

### 連接配置
```javascript
// 生產環境配置
const productionConfig = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  retryWrites: true,
  writeConcern: { w: 'majority', j: true }
};

// 開發環境配置
const developmentConfig = {
  maxPoolSize: 5,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 30000,
  retryWrites: true
};
```

## 📊 資料模型

### 1. Users Collection (使用者集合)

#### Schema 定義
```javascript
const userSchema = new mongoose.Schema({
  // 基本資訊
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: '無效的電子郵件格式'
    }
  },
  
  password: {
    type: String,
    required: function() {
      return !this.googleId && !this.lineId;
    },
    minlength: [8, '密碼至少需要 8 個字元'],
    select: false // 查詢時預設不返回密碼
  },
  
  username: {
    type: String,
    trim: true,
    maxlength: [50, '用戶名不能超過 50 個字元']
  },
  
  displayName: {
    type: String,
    trim: true,
    maxlength: [100, '顯示名稱不能超過 100 個字元']
  },
  
  // OAuth 整合
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  
  lineId: {
    type: String,
    sparse: true,
    unique: true
  },
  
  lineUserId: {
    type: String,
    sparse: true,
    unique: true
  },
  
  // 會員制度
  membershipLevel: {
    type: String,
    enum: ['free', 'premium', 'enterprise'],
    default: 'free'
  },
  
  membershipExpires: {
    type: Date,
    default: null
  },
  
  // 警報配額
  alertQuota: {
    used: { type: Number, default: 0 },
    limit: { type: Number, default: 1 }
  },
  
  // 功能權限
  premiumFeatures: {
    technicalIndicators: { type: Boolean, default: false },
    unlimitedAlerts: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false }
  },
  
  // 觀察清單 (嵌入式設計)
  watchlist: [{
    symbol: {
      type: String,
      required: true,
      validate: {
        validator: function(symbol) {
          return /^[A-Z]{2,10}USDT$/.test(symbol);
        },
        message: '無效的交易對格式'
      }
    },
    addedAt: { type: Date, default: Date.now },
    priority: { type: Number, min: 1, max: 5, default: 3 },
    category: { type: String, default: '預設' },
    notes: { type: String, maxlength: 200 }
  }],
  
  // 偏好設定
  preferences: {
    language: { type: String, default: 'zh-TW' },
    timezone: { type: String, default: 'Asia/Taipei' },
    currency: { type: String, default: 'USD' },
    notifications: {
      email: { type: Boolean, default: true },
      line: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' }
  },
  
  // 狀態追蹤
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  lastLogin: { type: Date },
  lastActivity: { type: Date, default: Date.now },
  
  // 統計資訊
  stats: {
    totalAlerts: { type: Number, default: 0 },
    triggeredAlerts: { type: Number, default: 0 },
    watchlistCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
```

#### 索引策略
```javascript
// 唯一索引
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });
userSchema.index({ lineId: 1 }, { unique: true, sparse: true });
userSchema.index({ lineUserId: 1 }, { unique: true, sparse: true });

// 查詢優化索引
userSchema.index({ isActive: 1, membershipLevel: 1 });
userSchema.index({ lastActivity: 1 });
userSchema.index({ 'watchlist.symbol': 1 });

// 複合索引
userSchema.index({ membershipLevel: 1, alertQuota: 1 });
```

#### 虛擬欄位
```javascript
// 會員狀態
userSchema.virtual('isMembershipActive').get(function() {
  if (this.membershipLevel === 'free') return true;
  return !this.membershipExpires || this.membershipExpires > new Date();
});

// 可用警報數量
userSchema.virtual('availableAlerts').get(function() {
  return Math.max(0, this.alertQuota.limit - this.alertQuota.used);
});

// 觀察清單數量
userSchema.virtual('watchlistCount').get(function() {
  return this.watchlist ? this.watchlist.length : 0;
});
```

#### 實例方法
```javascript
// 密碼驗證
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// 觀察清單管理
userSchema.methods.addToWatchlist = function(symbol, options = {}) {
  if (this.watchlist.some(item => item.symbol === symbol)) {
    throw new Error('交易對已在觀察清單中');
  }
  
  if (this.watchlist.length >= 30) {
    throw new Error('觀察清單已滿 (最多 30 個)');
  }
  
  this.watchlist.push({
    symbol,
    priority: options.priority || 3,
    category: options.category || '預設',
    notes: options.notes || ''
  });
  
  return this.save();
};

userSchema.methods.removeFromWatchlist = function(symbol) {
  this.watchlist = this.watchlist.filter(item => item.symbol !== symbol);
  return this.save();
};

// 會員權限檢查
userSchema.methods.hasPermission = function(feature) {
  if (this.membershipLevel === 'enterprise') return true;
  if (this.membershipLevel === 'premium') {
    return this.premiumFeatures[feature] || false;
  }
  return false;
};

// 更新最後活動時間
userSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save({ validateBeforeSave: false });
};
```

#### 靜態方法
```javascript
// 按電子郵件查找
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// 按第三方 ID 查找
userSchema.statics.findByThirdPartyId = function(provider, id) {
  const query = {};
  if (provider === 'google') query.googleId = id;
  if (provider === 'line') query.lineId = id;
  return this.findOne(query);
};

// 活躍用戶統計
userSchema.statics.getActiveUserStats = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    { $group: {
      _id: '$membershipLevel',
      count: { $sum: 1 },
      avgAlerts: { $avg: '$stats.totalAlerts' }
    }}
  ]);
};
```

### 2. PriceAlerts Collection (價格警報集合)

#### Schema 定義
```javascript
const priceAlertSchema = new mongoose.Schema({
  // 基本資訊
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    validate: {
      validator: function(symbol) {
        return /^[A-Z]{2,10}USDT$/.test(symbol);
      },
      message: '無效的交易對格式'
    }
  },
  
  // 警報類型
  alertType: {
    type: String,
    required: true,
    enum: [
      // 基礎警報 (免費用戶)
      'price_above', 'price_below', 'percent_change', 'volume_spike',
      
      // 技術指標警報 (付費用戶)
      'rsi_above', 'rsi_below', 'rsi_overbought', 'rsi_oversold',
      'macd_bullish_crossover', 'macd_bearish_crossover', 
      'macd_above_zero', 'macd_below_zero',
      'ma_cross_above', 'ma_cross_below', 'ma_golden_cross', 'ma_death_cross',
      'bb_upper_touch', 'bb_lower_touch', 'bb_squeeze', 'bb_expansion',
      'williams_overbought', 'williams_oversold'
    ]
  },
  
  // 價格條件
  targetPrice: {
    type: Number,
    validate: {
      validator: function(price) {
        return price === undefined || price > 0;
      },
      message: '目標價格必須大於 0'
    }
  },
  
  percentageChange: {
    type: Number,
    min: -99,
    max: 999
  },
  
  // 技術指標配置
  technicalIndicatorConfig: {
    rsi: {
      period: { type: Number, default: 14, min: 2, max: 100 },
      overboughtLevel: { type: Number, default: 70, min: 50, max: 90 },
      oversoldLevel: { type: Number, default: 30, min: 10, max: 50 }
    },
    macd: {
      fastPeriod: { type: Number, default: 12, min: 2, max: 50 },
      slowPeriod: { type: Number, default: 26, min: 10, max: 100 },
      signalPeriod: { type: Number, default: 9, min: 2, max: 30 }
    },
    movingAverage: {
      shortPeriod: { type: Number, default: 20, min: 5, max: 50 },
      longPeriod: { type: Number, default: 50, min: 20, max: 200 },
      type: { type: String, enum: ['SMA', 'EMA'], default: 'SMA' }
    },
    bollingerBands: {
      period: { type: Number, default: 20, min: 10, max: 50 },
      standardDeviations: { type: Number, default: 2, min: 1, max: 3 }
    }
  },
  
  // 狀態管理
  status: {
    type: String,
    enum: ['active', 'triggered', 'paused', 'expired'],
    default: 'active',
    index: true
  },
  
  enabled: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // 觸發記錄
  triggerHistory: [{
    triggeredAt: { type: Date, required: true },
    triggerPrice: { type: Number, required: true },
    marketConditions: {
      volume: Number,
      rsi: Number,
      macd: {
        value: Number,
        signal: Number,
        histogram: Number
      }
    },
    notificationSent: { type: Boolean, default: false },
    notificationError: String
  }],
  
  // 通知設定
  notificationMethods: {
    lineMessaging: {
      enabled: { type: Boolean, default: false },
      userId: String,
      lastSent: Date,
      failureCount: { type: Number, default: 0 }
    },
    email: {
      enabled: { type: Boolean, default: false },
      lastSent: Date,
      failureCount: { type: Number, default: 0 }
    }
  },
  
  // 過期設定
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 天後
    }
  },
  
  // 元數據
  metadata: {
    createdIP: String,
    userAgent: String,
    platform: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});
```

#### 索引策略
```javascript
// 基本查詢索引
priceAlertSchema.index({ userId: 1, symbol: 1 });
priceAlertSchema.index({ status: 1, enabled: 1 });
priceAlertSchema.index({ alertType: 1, status: 1 });

// 效能優化索引
priceAlertSchema.index({ userId: 1, status: 1, enabled: 1 });
priceAlertSchema.index({ symbol: 1, status: 1, enabled: 1 });
priceAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 複合查詢索引
priceAlertSchema.index({ 
  userId: 1, 
  symbol: 1, 
  status: 1, 
  alertType: 1 
});
```

#### 實例方法
```javascript
// 觸發警報
priceAlertSchema.methods.trigger = function(marketData) {
  this.triggerHistory.push({
    triggeredAt: new Date(),
    triggerPrice: marketData.price,
    marketConditions: {
      volume: marketData.volume,
      rsi: marketData.rsi,
      macd: marketData.macd
    }
  });
  
  this.status = 'triggered';
  return this.save();
};

// 檢查是否可以觸發
priceAlertSchema.methods.canTrigger = function() {
  if (this.status !== 'active' || !this.enabled) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  
  // 避免重複觸發 (24小時內)
  const lastTrigger = this.triggerHistory[this.triggerHistory.length - 1];
  if (lastTrigger) {
    const hoursSinceLastTrigger = (Date.now() - lastTrigger.triggeredAt) / (1000 * 60 * 60);
    if (hoursSinceLastTrigger < 24) return false;
  }
  
  return true;
};

// 重置警報
priceAlertSchema.methods.reset = function() {
  this.status = 'active';
  return this.save();
};
```

#### 靜態方法
```javascript
// 查找活躍警報
priceAlertSchema.statics.findActiveAlerts = function(symbol, options = {}) {
  const query = {
    status: 'active',
    enabled: true,
    $or: [
      { expiresAt: { $gt: new Date() } },
      { expiresAt: null }
    ]
  };
  
  if (symbol) query.symbol = symbol;
  if (options.userId) query.userId = options.userId;
  if (options.alertType) query.alertType = options.alertType;
  
  return this.find(query).populate('userId', 'email displayName membershipLevel');
};

// 清理過期警報
priceAlertSchema.statics.cleanupExpiredAlerts = function() {
  return this.updateMany(
    { 
      expiresAt: { $lt: new Date() },
      status: { $ne: 'expired' }
    },
    { 
      status: 'expired',
      enabled: false
    }
  );
};
```

### 3. Watchlists Collection (觀察清單集合)

#### Schema 定義
```javascript
const watchlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    validate: {
      validator: function(symbol) {
        return /^[A-Z]{2,10}(USDT|BTC|ETH|BNB|BUSD|FDUSD)$/.test(symbol);
      },
      message: '不支援的交易對格式'
    }
  },
  
  // 分類和優先級
  category: {
    type: String,
    default: '預設',
    maxlength: 50
  },
  
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  
  // 備註和標籤
  notes: {
    type: String,
    maxlength: 200
  },
  
  tags: [{
    type: String,
    maxlength: 20
  }],
  
  // 統計資訊
  stats: {
    addedPrice: Number,
    priceChange: Number,
    priceChangePercent: Number,
    lastPriceUpdate: Date,
    alertsCount: { type: Number, default: 0 }
  },
  
  // 設定
  settings: {
    enableNotifications: { type: Boolean, default: true },
    priceAlertThreshold: Number,
    displayOrder: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});
```

### 4. AIAnalysisResults Collection (AI 分析結果集合)

#### Schema 定義
```javascript
const aiAnalysisResultSchema = new mongoose.Schema({
  // 分析目標
  analysisType: {
    type: String,
    enum: ['homepage-trend', 'currency-detail', 'market-overview', 'custom'],
    required: true
  },
  
  symbol: String, // 特定貨幣分析時使用
  timeframe: {
    type: String,
    enum: ['1h', '4h', '1d', '1w'],
    default: '1d'
  },
  
  // 分析結果
  analysis: {
    signal: {
      type: String,
      enum: ['bullish', 'bearish', 'neutral', 'hold'],
      required: true
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
      maxlength: 1000
    },
    details: {
      technicalIndicators: mongoose.Schema.Types.Mixed,
      marketSentiment: mongoose.Schema.Types.Mixed,
      recommendation: String
    }
  },
  
  // 數據來源
  sourceData: {
    marketData: mongoose.Schema.Types.Mixed,
    newsData: mongoose.Schema.Types.Mixed,
    technicalData: mongoose.Schema.Types.Mixed
  },
  
  // AI 模型資訊
  aiModel: {
    provider: String,
    model: String,
    version: String,
    processingTime: Number
  },
  
  // 快取控制
  expiresAt: {
    type: Date,
    required: true,
    expires: 0
  },
  
  // 使用統計
  accessCount: { type: Number, default: 0 },
  lastAccessed: Date
}, {
  timestamps: true
});
```

## 🔧 資料庫操作

### 連接管理
```javascript
class DatabaseConnection {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }
  
  async connect() {
    try {
      const options = this.getConnectionOptions();
      this.connection = await mongoose.connect(process.env.MONGODB_URI, options);
      this.isConnected = true;
      
      console.log('✅ MongoDB 連接成功');
      this.setupEventListeners();
    } catch (error) {
      console.error('❌ MongoDB 連接失敗:', error);
      throw error;
    }
  }
  
  setupEventListeners() {
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB 連接中斷');
      this.isConnected = false;
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB 重新連接成功');
      this.isConnected = true;
    });
  }
}
```

### 查詢優化
```javascript
// 分頁查詢
async function getPaginatedResults(model, query, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = { createdAt: -1 },
    populate = ''
  } = options;
  
  const skip = (page - 1) * limit;
  
  const [results, total] = await Promise.all([
    model.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate(populate)
      .lean(),
    model.countDocuments(query)
  ]);
  
  return {
    data: results,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

// 聚合查詢範例
async function getUserStatistics() {
  return User.aggregate([
    {
      $group: {
        _id: '$membershipLevel',
        count: { $sum: 1 },
        avgAlerts: { $avg: '$stats.totalAlerts' },
        avgWatchlistSize: { $avg: { $size: '$watchlist' } }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
}
```

### 資料遷移
```javascript
// 遷移腳本範例
async function migrateUserWatchlists() {
  console.log('開始遷移用戶觀察清單...');
  
  const users = await User.find({ 'watchlist.0': { $exists: true } });
  
  for (const user of users) {
    const watchlistItems = user.watchlist.map(item => ({
      userId: user._id,
      symbol: item.symbol,
      category: item.category || '預設',
      priority: item.priority || 3,
      notes: item.notes || '',
      stats: {
        addedPrice: 0, // 需要從市場數據獲取
        lastPriceUpdate: new Date()
      }
    }));
    
    await Watchlist.insertMany(watchlistItems);
    console.log(`✅ 已遷移用戶 ${user.email} 的觀察清單`);
  }
  
  console.log('觀察清單遷移完成');
}
```

## 📊 效能監控

### 慢查詢監控
```javascript
// 啟用慢查詢日誌
mongoose.set('debug', (collectionName, method, query, doc) => {
  const startTime = Date.now();
  
  return function() {
    const duration = Date.now() - startTime;
    if (duration > 100) { // 超過 100ms 的查詢
      console.log(`🐌 慢查詢警告: ${collectionName}.${method} - ${duration}ms`);
      console.log('查詢:', JSON.stringify(query));
    }
  };
});
```

### 索引分析
```javascript
// 檢查索引使用情況
async function analyzeIndexUsage() {
  const collections = ['users', 'pricealerts', 'watchlists'];
  
  for (const collectionName of collections) {
    const stats = await mongoose.connection.db
      .collection(collectionName)
      .aggregate([{ $indexStats: {} }])
      .toArray();
    
    console.log(`📊 ${collectionName} 索引使用統計:`, stats);
  }
}
```

## 🔒 安全設定

### 資料驗證
```javascript
// 自定義驗證器
function createValidator(regex, message) {
  return {
    validator: function(value) {
      return regex.test(value);
    },
    message: message
  };
}

// 使用範例
const symbolValidator = createValidator(
  /^[A-Z]{2,10}USDT$/,
  '交易對必須以 USDT 結尾'
);
```

### 敏感資料處理
```javascript
// 加密敏感欄位
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// 隱藏敏感欄位
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};
```

## 📈 備份策略

### 自動備份
```bash
#!/bin/bash
# 每日備份腳本

BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="nexustrade"

# 創建備份
mongodump --db $DB_NAME --out $BACKUP_DIR/$DATE

# 壓縮備份
tar -czf $BACKUP_DIR/$DATE.tar.gz -C $BACKUP_DIR $DATE
rm -rf $BACKUP_DIR/$DATE

# 清理舊備份 (保留 30 天)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "✅ 備份完成: $BACKUP_DIR/$DATE.tar.gz"
```

### 備份還原
```bash
#!/bin/bash
# 還原腳本

BACKUP_FILE="$1"
DB_NAME="nexustrade"

if [ -z "$BACKUP_FILE" ]; then
  echo "❌ 請指定備份檔案路徑"
  exit 1
fi

# 解壓備份
tar -xzf $BACKUP_FILE -C /tmp/

# 還原資料庫
mongorestore --db $DB_NAME --drop /tmp/$(basename $BACKUP_FILE .tar.gz)/$DB_NAME

echo "✅ 資料庫還原完成"
```

---

*本文件涵蓋了 NexusTrade 資料庫的完整設計，包括 Schema 定義、索引策略、查詢優化和安全設定。*