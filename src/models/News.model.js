const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  // 新聞唯一識別碼（從 RSS link 和來源生成的 hash）
  newsId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // 新聞標題
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  
  // 新聞描述/摘要
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // 原文連結
  link: {
    type: String,
    required: true,
    trim: true
  },
  
  // 新聞圖片
  imageUrl: {
    type: String,
    trim: true
  },
  
  // 發布時間
  publishedAt: {
    type: Date,
    required: true,
    index: true
  },
  
  // 新聞來源
  source: {
    type: String,
    required: true,
    trim: true,
    enum: [
      'CoinTelegraph',
      'CryptoSlate', 
      'NewsBTC',
      'CoinDesk',
      'Decrypt',
      'The Block',
      'Bitcoin.com',
      'CryptoNews'
    ]
  },
  
  // 來源優先級 (1: 高, 2: 中, 3: 低)
  sourcePriority: {
    type: Number,
    default: 2,
    min: 1,
    max: 3
  },
  
  // 新聞分類
  category: {
    type: String,
    default: 'crypto',
    enum: ['crypto', 'bitcoin', 'ethereum', 'defi', 'nft', 'regulation', 'market']
  },
  
  // 標籤 (從標題和內容中提取)
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // 新聞重要性評分 (1-10)
  importance: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  
  // 是否為置頂新聞
  isPinned: {
    type: Boolean,
    default: false
  },
  
  // 是否已驗證
  isVerified: {
    type: Boolean,
    default: true
  },
  
  // 閱讀次數
  viewCount: {
    type: Number,
    default: 0
  },
  
  // RSS 抓取時間
  fetchedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // 自動添加 createdAt 和 updatedAt
  collection: 'news'
});

// 建立複合索引
newsSchema.index({ publishedAt: -1, sourcePriority: 1 });
newsSchema.index({ source: 1, publishedAt: -1 });
newsSchema.index({ category: 1, publishedAt: -1 });
newsSchema.index({ isPinned: -1, publishedAt: -1 });

// 虛擬欄位：格式化的發布時間
newsSchema.virtual('formattedPublishedAt').get(function() {
  return this.publishedAt.toLocaleString('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Taipei'
  });
});

// 虛擬欄位：相對時間
newsSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.publishedAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes}分鐘前`;
  if (hours < 24) return `${hours}小時前`;
  if (days < 7) return `${days}天前`;
  return this.formattedPublishedAt;
});

// 靜態方法：獲取最新新聞
newsSchema.statics.getLatestNews = function(limit = 10) {
  return this.find({ isVerified: true })
    .sort({ isPinned: -1, publishedAt: -1 })
    .limit(limit)
    .select('newsId title description link imageUrl publishedAt source sourcePriority category viewCount');
};

// 靜態方法：分頁獲取新聞
newsSchema.statics.getNewsPaginated = function(page = 1, limit = 10, category = null) {
  const query = { isVerified: true };
  if (category && category !== 'all') {
    query.category = category;
  }
  
  const skip = (page - 1) * limit;
  
  return Promise.all([
    this.find(query)
      .sort({ isPinned: -1, publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('newsId title description link imageUrl publishedAt source sourcePriority category viewCount'),
    this.countDocuments(query)
  ]).then(([news, total]) => ({
    news,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalNews: total,
      hasNextPage: skip + limit < total,
      hasPrevPage: page > 1
    }
  }));
};

// 靜態方法：搜尋新聞
newsSchema.statics.searchNews = function(keyword, page = 1, limit = 10) {
  const query = {
    isVerified: true,
    $or: [
      { title: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
      { tags: { $in: [keyword.toLowerCase()] } }
    ]
  };
  
  const skip = (page - 1) * limit;
  
  return Promise.all([
    this.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit),
    this.countDocuments(query)
  ]).then(([news, total]) => ({
    news,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalNews: total,
      hasNextPage: skip + limit < total,
      hasPrevPage: page > 1
    }
  }));
};

// 實例方法：增加閱讀次數
newsSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Pre-save 中介軟體：自動提取標籤
newsSchema.pre('save', function(next) {
  if (this.isModified('title') || this.isModified('description')) {
    const text = `${this.title} ${this.description}`.toLowerCase();
    const keywords = ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain', 'defi', 'nft', 'regulation', 'trading'];
    
    this.tags = keywords.filter(keyword => text.includes(keyword));
  }
  next();
});

// 確保虛擬欄位包含在 JSON 輸出中
newsSchema.set('toJSON', { virtuals: true });
newsSchema.set('toObject', { virtuals: true });

const News = mongoose.model('News', newsSchema);

module.exports = News;