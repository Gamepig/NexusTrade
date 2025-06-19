const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../utils/logger');

class NewsService {
  constructor() {
    // 免費的加密貨幣新聞 RSS Feed 來源
    this.rssSources = [
      {
        name: 'CoinTelegraph',
        url: 'https://cointelegraph.com/rss',
        priority: 1
      },
      {
        name: 'CryptoSlate',
        url: 'https://cryptoslate.com/feed/',
        priority: 2
      },
      {
        name: 'NewsBTC',
        url: 'https://www.newsbtc.com/feed/',
        priority: 2
      },
      {
        name: 'CoinDesk',
        url: 'https://feeds.feedburner.com/CoinDesk',
        priority: 1
      },
      {
        name: 'Decrypt',
        url: 'https://decrypt.co/feed',
        priority: 2
      },
      {
        name: 'The Block',
        url: 'https://www.theblockcrypto.com/rss.xml',
        priority: 1
      },
      {
        name: 'Bitcoin.com',
        url: 'https://news.bitcoin.com/feed/',
        priority: 2
      },
      {
        name: 'CryptoNews',
        url: 'https://cryptonews.com/news/feed/',
        priority: 2
      }
    ];

    this.parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false,
      trim: true
    });

    // 快取設定
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分鐘快取
  }

  /**
   * 抓取單一 RSS Feed
   */
  async fetchRSSFeed(source) {
    try {
      logger.info(`📰 抓取新聞 RSS: ${source.name} - ${source.url}`);
      
      const response = await axios.get(source.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'NexusTrade/1.0 (Crypto News Aggregator)',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        }
      });

      const result = await this.parser.parseStringPromise(response.data);
      const items = this.extractItemsFromFeed(result, source);
      
      logger.info(`📰 ${source.name} 抓取到 ${items.length} 則新聞`);
      return items;

    } catch (error) {
      logger.error(`❌ 抓取 ${source.name} RSS 失敗:`, error.message);
      return [];
    }
  }

  /**
   * 從 RSS 結果中提取新聞項目
   */
  extractItemsFromFeed(feedData, source) {
    let items = [];

    try {
      // 處理不同的 RSS 格式
      if (feedData.rss && feedData.rss.channel && feedData.rss.channel.item) {
        items = Array.isArray(feedData.rss.channel.item) 
          ? feedData.rss.channel.item 
          : [feedData.rss.channel.item];
      } else if (feedData.feed && feedData.feed.entry) {
        // Atom feed 格式
        items = Array.isArray(feedData.feed.entry) 
          ? feedData.feed.entry 
          : [feedData.feed.entry];
      }

      return items.map(item => this.normalizeNewsItem(item, source));
    } catch (error) {
      logger.error(`❌ 解析 ${source.name} feed 資料失敗:`, error.message);
      return [];
    }
  }

  /**
   * 標準化新聞項目格式
   */
  normalizeNewsItem(item, source) {
    const now = new Date();
    
    // 提取發布時間
    let publishedDate = now;
    if (item.pubDate) {
      publishedDate = new Date(item.pubDate);
    } else if (item.published) {
      publishedDate = new Date(item.published);
    } else if (item['dc:date']) {
      publishedDate = new Date(item['dc:date']);
    }

    // 提取圖片
    let imageUrl = null;
    if (item['media:thumbnail'] && item['media:thumbnail'].$.url) {
      imageUrl = item['media:thumbnail'].$.url;
    } else if (item.enclosure && item.enclosure.$.type && item.enclosure.$.type.startsWith('image/')) {
      imageUrl = item.enclosure.$.url;
    } else if (item['media:content'] && item['media:content'].$.url) {
      imageUrl = item['media:content'].$.url;
    }

    // 提取內容描述
    let description = '';
    if (item.description) {
      description = item.description.replace(/<[^>]*>/g, '').trim();
    } else if (item.summary) {
      description = item.summary.replace(/<[^>]*>/g, '').trim();
    } else if (item['content:encoded']) {
      description = item['content:encoded'].replace(/<[^>]*>/g, '').trim();
    }

    // 限制描述長度
    if (description.length > 200) {
      description = description.substring(0, 200) + '...';
    }

    return {
      id: this.generateNewsId(item.link || item.guid, source.name),
      title: item.title || '無標題',
      description,
      link: item.link || item.id || '',
      imageUrl,
      publishedAt: publishedDate,
      source: source.name,
      sourcePriority: source.priority,
      category: 'crypto',
      createdAt: now
    };
  }

  /**
   * 生成新聞唯一 ID
   */
  generateNewsId(link, sourceName) {
    const crypto = require('crypto');
    const content = `${link}-${sourceName}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * 抓取所有來源的新聞
   */
  async fetchAllNews() {
    const cacheKey = 'all_news';
    
    // 檢查快取
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        logger.info('📰 使用快取的新聞資料');
        return cached.data;
      }
    }

    logger.info('📰 開始抓取所有新聞來源...');
    
    // 並發抓取所有 RSS feeds
    const newsPromises = this.rssSources.map(source => this.fetchRSSFeed(source));
    const newsResults = await Promise.allSettled(newsPromises);
    
    // 合併所有新聞
    let allNews = [];
    newsResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allNews = allNews.concat(result.value);
      } else {
        logger.error(`❌ 來源 ${this.rssSources[index].name} 抓取失敗:`, result.reason);
      }
    });

    // 去重並排序
    const uniqueNews = this.deduplicateNews(allNews);
    const sortedNews = uniqueNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // 更新快取
    this.cache.set(cacheKey, {
      data: sortedNews,
      timestamp: Date.now()
    });

    logger.info(`📰 總共抓取到 ${sortedNews.length} 則新聞`);
    return sortedNews;
  }

  /**
   * 去除重複新聞 (增強版相似度檢測)
   */
  deduplicateNews(newsArray) {
    const seen = new Set();
    const result = [];
    
    // 先按發布時間排序，保留最新的
    const sorted = newsArray.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    for (const news of sorted) {
      // 基本去重：相同標題和來源
      const exactKey = `${news.title}-${news.source}`;
      if (seen.has(exactKey)) {
        continue;
      }
      seen.add(exactKey);
      
      // 檢查是否與已有新聞相似
      const isSimilar = result.some(existingNews => {
        return this.areNewsSimilar(news.title, existingNews.title);
      });
      
      if (!isSimilar) {
        result.push(news);
      }
    }
    
    return result;
  }

  /**
   * 檢查兩則新聞是否相似
   */
  areNewsSimilar(title1, title2) {
    if (!title1 || !title2) return false;
    
    const t1 = title1.toLowerCase().trim();
    const t2 = title2.toLowerCase().trim();
    
    // 1. 完全相同
    if (t1 === t2) return true;
    
    // 2. 檢查關鍵金額和事件組合
    const amount1 = this.extractAmount(t1);
    const amount2 = this.extractAmount(t2);
    
    if (amount1 && amount2 && amount1 === amount2) {
      const keywords1 = this.extractEventKeywords(t1);
      const keywords2 = this.extractEventKeywords(t2);
      const commonKeywords = keywords1.filter(k => keywords2.includes(k));
      
      if (commonKeywords.length >= 2) {
        return true; // 相同金額 + 2個以上相同關鍵詞
      }
    }
    
    // 3. 關鍵字重疊度檢查
    const words1 = this.extractKeywords(t1);
    const words2 = this.extractKeywords(t2);
    const overlap = this.calculateOverlap(words1, words2);
    
    return overlap > 0.6; // 60% 關鍵字重疊
  }

  /**
   * 提取金額資訊
   */
  extractAmount(text) {
    const match = text.match(/(\$?\d+(?:\.\d+)?[kmb]?|\d+\s?(?:million|billion))/i);
    if (match) {
      let amount = match[1].toLowerCase().replace(/[^\d.kmb]/g, '');
      // 標準化金額格式
      if (amount.includes('million') || amount.includes('m')) {
        amount = amount.replace(/million|m/g, 'm');
      }
      if (amount.includes('billion') || amount.includes('b')) {
        amount = amount.replace(/billion|b/g, 'b');
      }
      return amount;
    }
    return null;
  }

  /**
   * 提取事件關鍵詞
   */
  extractEventKeywords(text) {
    const keywords = [];
    const patterns = [
      'doj', 'department.*justice', 'seize', 'seized', 'scam', 'hack', 'arrest', 
      'ipo', 'stock', 'price', 'crypto', 'bitcoin', 'ethereum', 'court', 'files'
    ];
    
    patterns.forEach(pattern => {
      if (new RegExp(pattern, 'i').test(text)) {
        keywords.push(pattern.replace('.*', ''));
      }
    });
    
    return keywords;
  }

  /**
   * 提取標題關鍵字
   */
  extractKeywords(title) {
    if (!title) return [];
    
    // 移除標點符號、轉小寫、分詞
    const words = title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !this.isStopWord(word) && 
        !word.match(/^\d+$/) // 過濾純數字
      );
    
    return words;
  }

  /**
   * 停用詞過濾
   */
  isStopWord(word) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'can', 'this', 'that', 'these', 'those', 'as', 'its'
    ]);
    return stopWords.has(word);
  }

  /**
   * 計算關鍵字重疊度
   */
  calculateOverlap(words1, words2) {
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    
    return intersection.size / Math.min(set1.size, set2.size);
  }

  /**
   * 檢查是否為相似內容 (特殊規則)
   */
  isSimilarContent(title1, title2) {
    if (!title1 || !title2) return false;
    
    const t1 = title1.toLowerCase();
    const t2 = title2.toLowerCase();
    
    // 特殊模式檢查：相同的金額 + 關鍵詞組合
    const amountPattern = /(\$\d+[kmb]?|\d+\s?million|\d+\s?billion)/g;
    const keywordPattern = /(doj|department.*justice|seize|scam|hack|arrest|ipo|stock)/g;
    
    const amounts1 = (t1.match(amountPattern) || []).map(a => a.replace(/\s/g, ''));
    const amounts2 = (t2.match(amountPattern) || []).map(a => a.replace(/\s/g, ''));
    const keywords1 = (t1.match(keywordPattern) || []);
    const keywords2 = (t2.match(keywordPattern) || []);
    
    // 如果有相同金額且有相同關鍵詞，視為相似
    const commonAmounts = amounts1.filter(a => amounts2.some(b => 
      a.includes('225') && b.includes('225') // 特別檢查 225M
    ));
    const commonKeywords = keywords1.filter(k => keywords2.includes(k));
    
    if (commonAmounts.length > 0 && commonKeywords.length > 0) {
      return true;
    }
    
    // 檢查標題相似度 (Levenshtein distance)
    const similarity = this.calculateStringSimilarity(t1, t2);
    if (similarity > 0.6) {
      return true;
    }
    
    return false;
  }

  /**
   * 計算字串相似度 (Jaro-Winkler distance)
   */
  calculateStringSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;
    
    // 簡化版相似度：基於公共子字串
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = this.levenshteinDistance(str1, str2);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance 計算
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * 獲取最新新聞 (用於跑馬燈)
   */
  async getLatestNews(limit = 10) {
    try {
      const allNews = await this.fetchAllNews();
      return allNews.slice(0, limit);
    } catch (error) {
      logger.error('❌ 獲取最新新聞失敗:', error);
      return [];
    }
  }

  /**
   * 分頁獲取新聞
   */
  async getNewsPaginated(page = 1, limit = 10) {
    try {
      const allNews = await this.fetchAllNews();
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedNews = allNews.slice(startIndex, endIndex);
      
      return {
        news: paginatedNews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(allNews.length / limit),
          totalNews: allNews.length,
          hasNextPage: endIndex < allNews.length,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      logger.error('❌ 分頁獲取新聞失敗:', error);
      return {
        news: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalNews: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      };
    }
  }

  /**
   * 清除快取
   */
  clearCache() {
    this.cache.clear();
    logger.info('📰 新聞快取已清除');
  }
}

module.exports = new NewsService();