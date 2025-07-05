/**
 * NexusTrade 關注清單控制器
 * 
 * 提供個人化加密貨幣追蹤功能
 * 使用獨立的 Watchlist 資料模型
 */

const Watchlist = require('../models/Watchlist');
const { ApiError, ValidationErrorFactory } = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * 取得使用者關注清單
 * GET /api/watchlist
 */
const getWatchlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { limit = 30, offset = 0 } = req.query;
    
    logger.info(`取得關注清單: ${userId}`);

    // 取得關注清單總數
    const total = await Watchlist.findUserWatchlistCount(userId);
    
    // 取得關注清單項目
    const watchlistItems = await Watchlist.findUserWatchlist(userId, {
      enabledOnly: true,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy: 'addedAt',
      sortOrder: 'desc'
    });
    
    // 如果關注清單為空
    if (watchlistItems.length === 0) {
      return res.json({
        success: true,
        message: '關注清單為空',
        data: {
          watchlist: [],
          total: 0,
          hasMore: false
        }
      });
    }

    // 取得所有關注貨幣的即時價格
    const symbols = watchlistItems.map(item => item.symbol);
    let priceData = {};

    try {
      // 使用 Binance API 取得價格資料
      const fetch = require('node-fetch').default || require('node-fetch');
      const symbolsQuery = symbols.map(s => `"${s}"`).join(',');
      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbolsQuery}]`);
      
      if (response.ok) {
        const tickerData = await response.json();
        priceData = tickerData.reduce((acc, ticker) => {
          acc[ticker.symbol] = {
            price: parseFloat(ticker.lastPrice),
            priceChange: parseFloat(ticker.priceChange),
            priceChangePercent: parseFloat(ticker.priceChangePercent),
            volume: parseFloat(ticker.volume),
            high: parseFloat(ticker.highPrice),
            low: parseFloat(ticker.lowPrice),
            count: parseInt(ticker.count)
          };
          return acc;
        }, {});
      }
    } catch (error) {
      logger.warn('取得價格數據失敗:', error.message);
      // 如果價格 API 失敗，仍然回傳關注清單但沒有價格資訊
    }

    // 組合關注清單和價格數據
    const enrichedWatchlist = watchlistItems.map(item => ({
      id: item._id,
      symbol: item.symbol,
      baseAsset: item.baseAsset,
      quoteAsset: item.quoteAsset,
      displayName: item.displayName,
      priority: item.priority,
      category: item.category,
      notes: item.notes,
      addedAt: item.addedAt,
      lastUpdated: item.lastUpdated,
      daysSinceAdded: item.daysSinceAdded,
      priceData: priceData[item.symbol] || null,
      addedMarketData: item.addedMarketData
    }));

    const hasMore = total > parseInt(offset) + parseInt(limit);

    res.json({
      success: true,
      message: `成功取得 ${watchlistItems.length} 個關注項目`,
      data: {
        watchlist: enrichedWatchlist,
        total,
        hasMore,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    logger.error('取得關注清單失敗:', error);
    next(error);
  }
};

/**
 * 新增項目到關注清單
 * POST /api/watchlist
 */
const addToWatchlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { symbol, displayName, priority = 3, category = 'default', notes } = req.body;

    logger.info(`新增到關注清單: ${userId} - ${symbol}`);

    // 驗證輸入
    if (!symbol) {
      throw ApiError.badRequest('缺少必要參數: symbol');
    }

    if (priority < 1 || priority > 5) {
      throw ApiError.badRequest('優先級必須在 1-5 之間');
    }

    // 檢查是否已經在關注清單中
    const existingItem = await Watchlist.isSymbolWatched(userId, symbol);
    if (existingItem) {
      throw ApiError.conflict(`${symbol.toUpperCase()} 已經在關注清單中`);
    }

    // 驗證貨幣代碼是否有效（檢查 Binance API）
    let marketData = null;
    try {
      const fetch = require('node-fetch').default || require('node-fetch');
      const upperSymbol = symbol.toUpperCase();
      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${upperSymbol}`);
      
      if (!response.ok) {
        throw ApiError.badRequest(`無效的加密貨幣交易對: ${symbol}`);
      }
      
      const tickerData = await response.json();
      marketData = {
        price: parseFloat(tickerData.lastPrice),
        volume24h: parseFloat(tickerData.volume),
        priceChange24h: parseFloat(tickerData.priceChange)
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('驗證貨幣代碼失敗:', error);
      throw ApiError.badRequest(`無法驗證貨幣代碼: ${symbol}`);
    }

    // 新增到關注清單
    const watchlistItem = await Watchlist.addToWatchlist(userId, {
      symbol: symbol.toUpperCase(),
      displayName,
      priority,
      category,
      notes
    });

    // 更新市場資料快照
    if (marketData) {
      await watchlistItem.updateMarketData(marketData);
    }

    res.status(201).json({
      success: true,
      message: `已成功加入關注清單`,
      data: {
        id: watchlistItem._id,
        symbol: watchlistItem.symbol,
        baseAsset: watchlistItem.baseAsset,
        quoteAsset: watchlistItem.quoteAsset,
        displayName: watchlistItem.displayName,
        priority: watchlistItem.priority,
        category: watchlistItem.category,
        addedAt: watchlistItem.addedAt
      }
    });

  } catch (error) {
    logger.error('新增關注項目失敗:', error);
    next(error);
  }
};

/**
 * 從關注清單移除項目
 * DELETE /api/watchlist/{symbol}
 */
const removeFromWatchlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { symbol } = req.params;

    logger.info(`從關注清單移除: ${userId} - ${symbol}`);

    if (!symbol) {
      throw ApiError.badRequest('缺少必要參數: symbol');
    }

    const removedItem = await Watchlist.removeFromWatchlist(userId, symbol);
    
    if (!removedItem) {
      throw ApiError.notFound(`${symbol.toUpperCase()} 不在關注清單中`);
    }

    res.json({
      success: true,
      message: `已從關注清單移除 ${symbol.toUpperCase()}`,
      data: {
        symbol: symbol.toUpperCase(),
        removedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('移除關注項目失敗:', error);
    next(error);
  }
};

/**
 * 檢查關注狀態
 * GET /api/watchlist/status/{symbol}
 */
const getWatchlistStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { symbol } = req.params;

    logger.info(`檢查關注狀態: ${userId} - ${symbol}`);

    if (!symbol) {
      throw ApiError.badRequest('缺少必要參數: symbol');
    }

    const watchlistItem = await Watchlist.isSymbolWatched(userId, symbol);
    
    res.json({
      success: true,
      data: {
        isWatched: !!watchlistItem,
        addedAt: watchlistItem ? watchlistItem.addedAt : null,
        priority: watchlistItem ? watchlistItem.priority : null
      }
    });

  } catch (error) {
    logger.error('檢查關注狀態失敗:', error);
    next(error);
  }
};

/**
 * 更新關注清單項目
 * PUT /api/watchlist/{symbol}
 */
const updateWatchlistItem = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { symbol } = req.params;
    const { displayName, priority, category, notes } = req.body;

    logger.info(`更新關注清單項目: ${userId} - ${symbol}`);

    if (!symbol) {
      throw ApiError.badRequest('缺少必要參數: symbol');
    }

    const watchlistItem = await Watchlist.findOne({ 
      userId, 
      symbol: symbol.toUpperCase(),
      enabled: true 
    });
    
    if (!watchlistItem) {
      throw ApiError.notFound(`${symbol.toUpperCase()} 不在關注清單中`);
    }

    // 更新允許的欄位
    if (displayName !== undefined) {
      watchlistItem.displayName = displayName;
    }
    if (priority !== undefined) {
    if (priority < 1 || priority > 5) {
      throw ApiError.badRequest('優先級必須在 1-5 之間');
    }
      watchlistItem.priority = priority;
    }
    if (category !== undefined) {
      if (!['default', 'trading', 'longterm', 'watchonly'].includes(category)) {
        throw ApiError.badRequest('無效的分類');
      }
      watchlistItem.category = category;
    }
    if (notes !== undefined) {
      watchlistItem.notes = notes;
    }

    await watchlistItem.save();

    res.json({
      success: true,
      message: `成功更新 ${symbol.toUpperCase()} 的資訊`,
      data: {
        id: watchlistItem._id,
        symbol: watchlistItem.symbol,
        displayName: watchlistItem.displayName,
        priority: watchlistItem.priority,
        category: watchlistItem.category,
        notes: watchlistItem.notes,
        lastUpdated: watchlistItem.lastUpdated
      }
    });

  } catch (error) {
    logger.error('更新關注清單項目失敗:', error);
    next(error);
  }
};

/**
 * 取得關注清單統計資訊
 * GET /api/watchlist/stats
 */
const getWatchlistStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    logger.info(`取得關注清單統計: ${userId}`);

    const totalCount = await Watchlist.findUserWatchlistCount(userId, false);
    const activeCount = await Watchlist.findUserWatchlistCount(userId, true);
    
    const watchlistItems = await Watchlist.findUserWatchlist(userId, {
      enabledOnly: false,
      limit: 30,
      offset: 0
    });

    // 計算統計資訊
    const priorityDistribution = {
      high: watchlistItems.filter(item => item.priority >= 4).length,
      medium: watchlistItems.filter(item => item.priority === 3).length,
      low: watchlistItems.filter(item => item.priority <= 2).length
    };

    const categoryDistribution = watchlistItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});

    const dates = watchlistItems.map(item => new Date(item.addedAt));
    const oldestDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
    const newestDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;

    const stats = {
      totalItems: totalCount,
      activeItems: activeCount,
      maxItems: 30,
      remainingSlots: Math.max(0, 30 - totalCount),
      priorityDistribution,
      categoryDistribution,
      oldestItem: oldestDate,
      newestItem: newestDate,
      averageDaysTracked: watchlistItems.length > 0 
        ? Math.round(watchlistItems.reduce((sum, item) => sum + item.daysSinceAdded, 0) / watchlistItems.length)
        : 0
    };

    res.json({
      success: true,
      message: '成功取得關注清單統計資訊',
      data: stats
    });

  } catch (error) {
    logger.error('取得關注清單統計失敗:', error);
    next(error);
  }
};

/**
 * 批量管理關注清單
 * POST /api/watchlist/batch
 */
const batchUpdateWatchlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { operations } = req.body; // [{ action: 'add'|'remove'|'update', symbol, data? }]

    logger.info(`批量更新關注清單: ${userId} - ${operations.length} 個操作`);

    if (!Array.isArray(operations) || operations.length === 0) {
      throw ApiError.badRequest('operations 必須是非空陣列');
    }

    if (operations.length > 10) {
      throw ApiError.badRequest('單次批量操作最多支援 10 個項目');
    }

    const results = [];
    let hasErrors = false;

    for (const operation of operations) {
      try {
        const { action, symbol, data = {} } = operation;

        switch (action) {
          case 'add':
            await Watchlist.addToWatchlist(userId, {
              symbol,
              ...data
            });
            results.push({ action, symbol, status: 'success' });
            break;

          case 'remove':
            const removed = await Watchlist.removeFromWatchlist(userId, symbol);
            if (removed) {
            results.push({ action, symbol, status: 'success' });
            } else {
              results.push({ action, symbol, status: 'error', error: '項目不存在' });
              hasErrors = true;
            }
            break;

          case 'update':
            const item = await Watchlist.findOne({ userId, symbol: symbol.toUpperCase() });
            if (item) {
              Object.assign(item, data);
              await item.save();
              results.push({ action, symbol, status: 'success' });
            } else {
              results.push({ action, symbol, status: 'error', error: '項目不存在' });
              hasErrors = true;
            }
            break;

          default:
            results.push({ action, symbol, status: 'error', error: '無效的操作類型' });
            hasErrors = true;
        }
      } catch (error) {
        results.push({ 
          action: operation.action, 
          symbol: operation.symbol, 
          status: 'error', 
          error: error.message 
        });
        hasErrors = true;
      }
    }

    const currentCount = await Watchlist.findUserWatchlistCount(userId);

    res.json({
      success: !hasErrors,
      message: hasErrors ? '部分操作執行失敗' : '批量操作執行成功',
      data: {
        results,
        totalOperations: operations.length,
        successCount: results.filter(r => r.status === 'success').length,
        errorCount: results.filter(r => r.status === 'error').length,
        currentWatchlistSize: currentCount
      }
    });

  } catch (error) {
    logger.error('批量更新關注清單失敗:', error);
    next(error);
  }
};

module.exports = {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getWatchlistStatus,
  updateWatchlistItem,
  getWatchlistStats,
  batchUpdateWatchlist
};