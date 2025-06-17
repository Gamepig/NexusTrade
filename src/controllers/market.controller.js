/**
 * NexusTrade 市場數據控制器
 * 
 * 處理市場數據相關的所有 API 端點
 */

const { getBinanceService } = require('../services/binance.service');
const { ApiErrorFactory } = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * 取得熱門交易對
 * GET /api/market/trending
 */
const getTrendingPairs = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const binanceService = getBinanceService();
    
    const trendingPairs = await binanceService.getTopGainers(parseInt(limit));
    
    res.status(200).json({
      status: 'success',
      message: '取得熱門交易對成功',
      data: {
        pairs: trendingPairs,
        count: trendingPairs.length,
        lastUpdate: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('取得熱門交易對失敗:', error.message);
    throw error;
  }
};

/**
 * 取得交易對價格
 * GET /api/market/price/:symbol
 */
const getSymbolPrice = async (req, res) => {
  try {
    const { symbol } = req.params;
    const binanceService = getBinanceService();
    
    if (!symbol) {
      throw ApiErrorFactory.badRequest('交易對參數必須提供', 'SYMBOL_REQUIRED');
    }
    
    const priceData = await binanceService.getCurrentPrice(symbol);
    
    res.status(200).json({
      status: 'success',
      message: '取得價格成功',
      data: priceData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`取得 ${req.params.symbol} 價格失敗:`, error.message);
    throw error;
  }
};

/**
 * 取得多個交易對價格
 * POST /api/market/prices
 */
const getMultiplePrices = async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      throw ApiErrorFactory.badRequest('symbols 必須是陣列', 'INVALID_SYMBOLS_FORMAT');
    }
    
    if (symbols.length > 100) {
      throw ApiErrorFactory.badRequest('一次最多查詢100個交易對', 'TOO_MANY_SYMBOLS');
    }
    
    const binanceService = getBinanceService();
    const pricePromises = symbols.map(symbol => 
      binanceService.getCurrentPrice(symbol).catch(error => ({
        symbol,
        error: error.message
      }))
    );
    
    const results = await Promise.all(pricePromises);
    
    const prices = results.filter(result => !result.error);
    const errors = results.filter(result => result.error);
    
    res.status(200).json({
      status: 'success',
      message: '取得多個價格成功',
      data: {
        prices,
        errors,
        successCount: prices.length,
        errorCount: errors.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('取得多個價格失敗:', error.message);
    throw error;
  }
};

/**
 * 取得24小時價格統計
 * GET /api/market/ticker/:symbol
 */
const get24hrTicker = async (req, res) => {
  try {
    const { symbol } = req.params;
    const binanceService = getBinanceService();
    
    const ticker = await binanceService.get24hrTicker(symbol);
    
    res.status(200).json({
      status: 'success',
      message: '取得24小時統計成功',
      data: ticker,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`取得 ${req.params.symbol} 24小時統計失敗:`, error.message);
    throw error;
  }
};

/**
 * 取得K線數據
 * GET /api/market/klines/:symbol
 */
const getKlines = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1h', limit = 100 } = req.query;
    
    const binanceService = getBinanceService();
    const klines = await binanceService.getKlineData(symbol, interval, parseInt(limit));
    
    res.status(200).json({
      status: 'success',
      message: '取得K線數據成功',
      data: {
        symbol: symbol.toUpperCase(),
        interval,
        klines,
        count: klines.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`取得 ${req.params.symbol} K線數據失敗:`, error.message);
    throw error;
  }
};

/**
 * 取得訂單簿深度
 * GET /api/market/depth/:symbol
 */
const getOrderBookDepth = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 100 } = req.query;
    
    const binanceService = getBinanceService();
    const depth = await binanceService.getOrderBookDepth(symbol, parseInt(limit));
    
    res.status(200).json({
      status: 'success',
      message: '取得訂單簿深度成功',
      data: {
        symbol: symbol.toUpperCase(),
        ...depth
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`取得 ${req.params.symbol} 訂單簿失敗:`, error.message);
    throw error;
  }
};

/**
 * 搜尋交易對
 * GET /api/market/search
 */
const searchSymbols = async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;
    
    if (!query) {
      throw ApiErrorFactory.badRequest('搜尋查詢參數必須提供', 'QUERY_REQUIRED');
    }
    
    if (query.length < 2) {
      throw ApiErrorFactory.badRequest('搜尋查詢至少需要2個字符', 'QUERY_TOO_SHORT');
    }
    
    const binanceService = getBinanceService();
    const results = binanceService.searchSymbols(query, parseInt(limit));
    
    res.status(200).json({
      status: 'success',
      message: '搜尋交易對成功',
      data: {
        query,
        results,
        count: results.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('搜尋交易對失敗:', error.message);
    throw error;
  }
};

/**
 * 取得快取的價格數據
 * GET /api/market/cache/prices
 */
const getCachedPrices = async (req, res) => {
  try {
    const binanceService = getBinanceService();
    const cachedPrices = binanceService.getCachedPrices();
    
    res.status(200).json({
      status: 'success',
      message: '取得快取價格成功',
      data: {
        prices: cachedPrices,
        count: cachedPrices.length,
        lastUpdate: binanceService.lastUpdateTime ? new Date(binanceService.lastUpdateTime).toISOString() : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('取得快取價格失敗:', error.message);
    throw error;
  }
};

/**
 * 測試 Binance API 連接
 * GET /api/market/test
 */
const testConnection = async (req, res) => {
  try {
    const binanceService = getBinanceService();
    const isConnected = await binanceService.testConnection();
    
    res.status(200).json({
      status: 'success',
      message: 'Binance API 連接測試成功',
      data: {
        connected: isConnected,
        apiUrl: binanceService.baseURL,
        wsUrl: binanceService.wsURL
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Binance API 連接測試失敗:', error.message);
    throw error;
  }
};

/**
 * 取得市場概覽
 * GET /api/market/overview
 */
const getMarketOverview = async (req, res) => {
  try {
    const binanceService = getBinanceService();
    
    // 並行取得多個數據
    const [
      trending,
      btcPrice,
      ethPrice,
      cachedPrices
    ] = await Promise.all([
      binanceService.getTopGainers(5),
      binanceService.getCurrentPrice('BTCUSDT').catch(() => null),
      binanceService.getCurrentPrice('ETHUSDT').catch(() => null),
      binanceService.getCachedPrices()
    ]);
    
    // 計算市場統計
    const totalVolume = cachedPrices.reduce((sum, price) => sum + (price.quoteVolume || 0), 0);
    const gainers = cachedPrices.filter(p => p.priceChangePercent > 0).length;
    const losers = cachedPrices.filter(p => p.priceChangePercent < 0).length;
    
    res.status(200).json({
      status: 'success',
      message: '取得市場概覽成功',
      data: {
        majorPrices: {
          btc: btcPrice,
          eth: ethPrice
        },
        trending,
        statistics: {
          totalPairs: cachedPrices.length,
          gainers,
          losers,
          totalVolume: Math.round(totalVolume)
        },
        lastUpdate: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('取得市場概覽失敗:', error.message);
    throw error;
  }
};

module.exports = {
  getTrendingPairs,
  getSymbolPrice,
  getMultiplePrices,
  get24hrTicker,
  getKlines,
  getOrderBookDepth,
  searchSymbols,
  getCachedPrices,
  testConnection,
  getMarketOverview
};