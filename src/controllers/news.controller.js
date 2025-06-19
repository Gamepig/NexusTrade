const newsService = require('../services/news.service');
const logger = require('../utils/logger');

class NewsController {
  /**
   * 獲取最新新聞 (用於跑馬燈)
   * GET /api/news/latest?limit=10
   */
  async getLatestNews(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const news = await newsService.getLatestNews(limit);
      
      res.json({
        success: true,
        data: news,
        message: `獲取最新 ${news.length} 則新聞`
      });
    } catch (error) {
      logger.error('❌ 獲取最新新聞失敗:', error);
      res.status(500).json({
        success: false,
        message: '獲取最新新聞失敗',
        error: process.env.NODE_ENV === 'development' ? error.message : '內部服務器錯誤'
      });
    }
  }

  /**
   * 分頁獲取新聞
   * GET /api/news?page=1&limit=10&category=crypto
   */
  async getNews(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const category = req.query.category || 'all';
      
      // 直接從新聞服務獲取即時新聞，不依賴資料庫
      const result = await newsService.getNewsPaginated(page, limit);
      
      // 如果需要按分類篩選
      if (category && category !== 'all') {
        result.news = result.news.filter(news => 
          news.category === category || 
          news.tags?.includes(category.toLowerCase())
        );
      }
      
      res.json({
        success: true,
        data: result.news,
        pagination: result.pagination,
        message: `獲取第 ${page} 頁新聞`
      });
    } catch (error) {
      logger.error('❌ 獲取分頁新聞失敗:', error);
      res.status(500).json({
        success: false,
        message: '獲取新聞失敗',
        error: process.env.NODE_ENV === 'development' ? error.message : '內部服務器錯誤'
      });
    }
  }

  /**
   * 搜尋新聞
   * GET /api/news/search?q=bitcoin&page=1&limit=10
   */
  async searchNews(req, res) {
    try {
      const keyword = req.query.q || '';
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      if (!keyword.trim()) {
        return res.status(400).json({
          success: false,
          message: '請提供搜尋關鍵字'
        });
      }

      // 從即時新聞中搜尋
      const allNews = await newsService.fetchAllNews();
      const filteredNews = allNews.filter(news => 
        news.title.toLowerCase().includes(keyword.toLowerCase()) ||
        news.description.toLowerCase().includes(keyword.toLowerCase())
      );

      // 手動分頁
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedNews = filteredNews.slice(startIndex, endIndex);

      const result = {
        news: paginatedNews,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(filteredNews.length / limit),
          totalNews: filteredNews.length,
          hasNextPage: endIndex < filteredNews.length,
          hasPrevPage: page > 1
        }
      };
      
      res.json({
        success: true,
        data: result.news,
        pagination: result.pagination,
        message: `找到 ${filteredNews.length} 則相關新聞`
      });
    } catch (error) {
      logger.error('❌ 搜尋新聞失敗:', error);
      res.status(500).json({
        success: false,
        message: '搜尋新聞失敗',
        error: process.env.NODE_ENV === 'development' ? error.message : '內部服務器錯誤'
      });
    }
  }

  /**
   * 獲取新聞來源列表
   * GET /api/news/sources
   */
  async getNewsSources(req, res) {
    try {
      const sources = newsService.rssSources.map(source => ({
        name: source.name,
        priority: source.priority,
        url: source.url
      }));
      
      res.json({
        success: true,
        data: sources,
        message: `獲取 ${sources.length} 個新聞來源`
      });
    } catch (error) {
      logger.error('❌ 獲取新聞來源失敗:', error);
      res.status(500).json({
        success: false,
        message: '獲取新聞來源失敗',
        error: process.env.NODE_ENV === 'development' ? error.message : '內部服務器錯誤'
      });
    }
  }

  /**
   * 重新整理新聞快取
   * POST /api/news/refresh
   */
  async refreshNews(req, res) {
    try {
      logger.info('📰 手動重新整理新聞快取');
      
      // 清除快取
      newsService.clearCache();
      
      // 重新抓取新聞
      const news = await newsService.fetchAllNews();
      
      res.json({
        success: true,
        data: {
          totalNews: news.length,
          refreshedAt: new Date().toISOString()
        },
        message: `新聞快取已重新整理，共 ${news.length} 則新聞`
      });
    } catch (error) {
      logger.error('❌ 重新整理新聞快取失敗:', error);
      res.status(500).json({
        success: false,
        message: '重新整理新聞快取失敗',
        error: process.env.NODE_ENV === 'development' ? error.message : '內部服務器錯誤'
      });
    }
  }

  /**
   * 獲取新聞統計資訊
   * GET /api/news/stats
   */
  async getNewsStats(req, res) {
    try {
      const allNews = await newsService.fetchAllNews();
      
      // 統計各來源新聞數量
      const sourceStats = {};
      allNews.forEach(news => {
        sourceStats[news.source] = (sourceStats[news.source] || 0) + 1;
      });

      // 統計今日新聞數量
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayNews = allNews.filter(news => new Date(news.publishedAt) >= today);

      const stats = {
        totalNews: allNews.length,
        todayNews: todayNews.length,
        sources: Object.keys(sourceStats).length,
        sourceBreakdown: sourceStats,
        lastUpdated: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: stats,
        message: '獲取新聞統計資訊'
      });
    } catch (error) {
      logger.error('❌ 獲取新聞統計失敗:', error);
      res.status(500).json({
        success: false,
        message: '獲取新聞統計失敗',
        error: process.env.NODE_ENV === 'development' ? error.message : '內部服務器錯誤'
      });
    }
  }

  /**
   * 新聞點擊追蹤 (重導向到原始連結)
   * GET /api/news/:newsId/click
   */
  async trackNewsClick(req, res) {
    try {
      const { newsId } = req.params;
      
      // 從快取中找到新聞
      const allNews = await newsService.fetchAllNews();
      const news = allNews.find(n => n.id === newsId);
      
      if (!news) {
        return res.status(404).json({
          success: false,
          message: '新聞不存在'
        });
      }

      // 記錄點擊 (可以後續實作點擊統計)
      logger.info(`📰 新聞點擊: ${news.title} (${news.source})`);
      
      // 重導向到原始新聞連結
      res.redirect(news.link);
    } catch (error) {
      logger.error('❌ 新聞點擊追蹤失敗:', error);
      res.status(500).json({
        success: false,
        message: '新聞連結無效',
        error: process.env.NODE_ENV === 'development' ? error.message : '內部服務器錯誤'
      });
    }
  }
}

module.exports = new NewsController();