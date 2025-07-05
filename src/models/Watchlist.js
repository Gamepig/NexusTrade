/**
 * NexusTrade 關注清單模型
 * 
 * 定義使用者關注清單的資料結構和驗證規則
 */

const mongoose = require('mongoose');
const { ValidationErrorFactory } = require('../utils/ApiError');

/**
 * 關注清單 Schema 定義
 */
const watchlistSchema = new mongoose.Schema({
  // 使用者關聯
  userId: {
    type: String, // 使用 String 以兼容 Mock 系統
    required: [true, '使用者 ID 為必填欄位'],
    index: true
  },
  
  // 交易對資訊
  symbol: {
    type: String,
    required: [true, '交易對代碼為必填欄位'],
    uppercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        // 支援標準交易對格式，如 BTCUSDT, ETHBTC 等
        return /^[A-Z0-9]{2,12}(USDT|BTC|ETH|BNB|BUSD|FDUSD)$/.test(v);
      },
      message: '交易對格式不正確，例如：BTCUSDT, ETHUSDT'
    }
  },
  
  // 基礎貨幣和報價貨幣（從 symbol 解析）
  baseAsset: {
    type: String,
    required: [true, '基礎貨幣為必填欄位'],
    uppercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[A-Z0-9]{2,12}$/.test(v);
      },
      message: '基礎貨幣格式不正確'
    }
  },
  
  quoteAsset: {
    type: String,
    required: [true, '報價貨幣為必填欄位'],
    uppercase: true,
    trim: true,
    default: 'USDT',
    enum: {
      values: ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD', 'FDUSD'],
      message: '不支援的報價貨幣'
    }
  },
  
  // 使用者自定義顯示名稱
  displayName: {
    type: String,
    trim: true,
    maxlength: [50, '顯示名稱長度不能超過 50 個字元'],
    default: function() {
      return this.baseAsset; // 預設使用基礎貨幣名稱
    }
  },
  
  // 關注優先級（1-5，5 為最高）
  priority: {
    type: Number,
    min: [1, '優先級不能小於 1'],
    max: [5, '優先級不能大於 5'],
    default: 3
  },
  
  // 排序順序（使用者可自定義排序）
  sortOrder: {
    type: Number,
    default: 0,
    index: true
  },
  
  // 關注類別標籤
  category: {
    type: String,
    enum: ['default', 'trading', 'longterm', 'watchonly'],
    default: 'default'
  },
  
  // 使用者備註
  notes: {
    type: String,
    maxlength: [500, '備註長度不能超過 500 個字元'],
    trim: true
  },
  
  // 關注時的市場資料快照
  addedMarketData: {
    price: {
      type: Number,
      min: 0
    },
    volume24h: {
      type: Number,
      min: 0
    },
    marketCap: Number,
    priceChange24h: Number
  },
  
  // 時間戳記
  addedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // 是否啟用（允許使用者暫時停用某些關注項目）
  enabled: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  // Schema 選項
  timestamps: { 
    createdAt: 'addedAt', 
    updatedAt: 'lastUpdated' 
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 複合索引：確保每個使用者的交易對唯一性
watchlistSchema.index({ userId: 1, symbol: 1 }, { unique: true });

// 使用者查詢優化索引（按加入時間排序）
watchlistSchema.index({ userId: 1, addedAt: -1 });

// 使用者查詢優化索引（按自定義排序）
watchlistSchema.index({ userId: 1, sortOrder: 1, addedAt: -1 });

// 啟用狀態索引
watchlistSchema.index({ userId: 1, enabled: 1, addedAt: -1 });

// 虛擬屬性
watchlistSchema.virtual('isActive').get(function() {
  return this.enabled;
});

watchlistSchema.virtual('daysSinceAdded').get(function() {
  if (!this.addedAt) return 0;
  const diffTime = Date.now() - this.addedAt.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// 實例方法
watchlistSchema.methods.updateMarketData = function(marketData) {
  this.addedMarketData = {
    price: marketData.price,
    volume24h: marketData.volume24h,
    marketCap: marketData.marketCap,
    priceChange24h: marketData.priceChange24h
  };
  this.lastUpdated = new Date();
  return this.save();
};

watchlistSchema.methods.updatePriority = function(priority) {
  if (priority < 1 || priority > 5) {
    throw ValidationErrorFactory('優先級必須在 1 到 5 之間');
  }
  this.priority = priority;
  this.lastUpdated = new Date();
  return this.save();
};

// 靜態方法
watchlistSchema.statics.findUserWatchlist = function(userId, options = {}) {
  const {
    enabledOnly = true,
    limit = 30,
    offset = 0,
    sortBy = 'addedAt',
    sortOrder = 'desc'
  } = options;
  
  const query = { userId };
  if (enabledOnly) {
    query.enabled = true;
  }
  
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  return this.find(query)
    .sort(sortOptions)
    .limit(limit)
    .skip(offset);
};

watchlistSchema.statics.findUserWatchlistCount = function(userId, enabledOnly = true) {
  const query = { userId };
  if (enabledOnly) {
    query.enabled = true;
  }
  return this.countDocuments(query);
};

watchlistSchema.statics.findUserWatchlistItem = function(userId, symbol) {
  return this.findOne({ 
    userId, 
    symbol: symbol.toUpperCase() 
  });
};

watchlistSchema.statics.isSymbolWatched = function(userId, symbol) {
  return this.findOne({ 
    userId, 
    symbol: symbol.toUpperCase(),
    enabled: true 
  });
};

watchlistSchema.statics.addToWatchlist = function(userId, symbolData) {
  const { symbol, displayName, priority = 3, category = 'default', notes } = symbolData;
  
  // 解析基礎貨幣和報價貨幣
  const upperSymbol = symbol.toUpperCase();
  let baseAsset, quoteAsset;
  
  // 常見報價貨幣的順序很重要，先匹配較長的
  const quoteAssets = ['USDT', 'BUSD', 'FDUSD', 'BTC', 'ETH', 'BNB'];
  
  for (const quote of quoteAssets) {
    if (upperSymbol.endsWith(quote)) {
      baseAsset = upperSymbol.slice(0, -quote.length);
      quoteAsset = quote;
      break;
    }
  }
  
  if (!baseAsset || !quoteAsset) {
    throw ValidationErrorFactory('無法解析交易對格式');
  }
  
  const watchlistItem = new this({
    userId,
    symbol: upperSymbol,
    baseAsset,
    quoteAsset,
    displayName: displayName || baseAsset,
    priority,
    category,
    notes
  });
  
  return watchlistItem.save();
};

watchlistSchema.statics.removeFromWatchlist = function(userId, symbol) {
  return this.findOneAndDelete({ 
    userId, 
    symbol: symbol.toUpperCase() 
  });
};

// 限制每個使用者最多 30 個關注項目
watchlistSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.findUserWatchlistCount(this.userId, false);
    if (count >= 30) {
      const error = new Error('每個使用者最多只能關注 30 個交易對');
      error.name = 'ValidationError';
      return next(error);
    }
  }
  next();
});

// 更新 lastUpdated 時間戳記
watchlistSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.lastUpdated = new Date();
  }
  next();
});

// 建立模型
const Watchlist = mongoose.model('Watchlist', watchlistSchema);

module.exports = Watchlist; 