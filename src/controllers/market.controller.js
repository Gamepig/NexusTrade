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
    const { limit = 200 } = req.query;
    const binanceService = getBinanceService();
    
    // 獲取24小時統計數據 (包含所有 USDT 交易對)
    const allTickers = await binanceService.get24hrTicker();
    
    // 過濾 USDT 交易對並按交易量排序
    const usdtPairs = allTickers
      .filter(ticker => ticker.symbol.endsWith('USDT'))
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, parseInt(limit));
    
    // 格式化數據
    const formattedPairs = usdtPairs.map((ticker, index) => ({
      rank: index + 1,
      symbol: ticker.symbol,
      name: ticker.symbol.replace('USDT', ''),
      price: parseFloat(ticker.lastPrice),
      priceChange: parseFloat(ticker.priceChange),
      priceChangePercent: parseFloat(ticker.priceChangePercent),
      volume: parseFloat(ticker.volume),
      quoteVolume: parseFloat(ticker.quoteVolume),
      high: parseFloat(ticker.highPrice),
      low: parseFloat(ticker.lowPrice),
      lastUpdate: new Date().toISOString()
    }));
    
    res.status(200).json({
      success: true,
      message: `取得熱門 ${formattedPairs.length} 個交易對成功`,
      data: formattedPairs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('取得熱門交易對失敗:', error.message);
    res.status(500).json({
      success: false,
      message: '取得熱門交易對失敗',
      error: error.message,
      timestamp: new Date().toISOString()
    });
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
 * 取得多個交易對價格 (查詢參數版本)
 * GET /api/market/prices?symbols=BTCUSDT,ETHUSDT
 */
const getMultiplePricesQuery = async (req, res) => {
  try {
    const { symbols } = req.query;
    
    if (!symbols) {
      throw ApiErrorFactory.badRequest('symbols 查詢參數是必需的', 'MISSING_SYMBOLS_QUERY');
    }
    
    // 將逗號分隔的字符串轉換為陣列
    const symbolsArray = symbols.split(',').map(s => s.trim()).filter(s => s.length > 0);
    
    if (symbolsArray.length === 0) {
      throw ApiErrorFactory.badRequest('至少需要一個有效的交易對符號', 'EMPTY_SYMBOLS_LIST');
    }
    
    if (symbolsArray.length > 100) {
      throw ApiErrorFactory.badRequest('一次最多查詢100個交易對', 'TOO_MANY_SYMBOLS');
    }
    
    const binanceService = getBinanceService();
    const pricePromises = symbolsArray.map(symbol => 
      binanceService.getCurrentPrice(symbol).catch(error => ({
        symbol,
        error: error.message,
        success: false
      }))
    );
    
    const results = await Promise.all(pricePromises);
    const prices = results.filter(result => result.success !== false);
    const errors = results.filter(result => result.success === false);
    
    res.status(200).json({
      status: 'success',
      message: '取得多個價格成功',
      data: prices,
      errors: errors.length > 0 ? errors : undefined,
      meta: {
        requested: symbolsArray.length,
        successful: prices.length,
        failed: errors.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('取得多個價格查詢失敗:', error.message);
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

/**
 * 批量獲取價格數據 (GET 方式)
 * GET /api/market/prices?symbols=BTCUSDT,ETHUSDT,BNBUSDT
 */
const getBatchPrices = async (req, res) => {
  try {
    const { symbols } = req.query;
    
    if (!symbols) {
      return res.status(400).json({
        success: false,
        message: 'symbols 參數必須提供',
        timestamp: new Date().toISOString()
      });
    }
    
    const symbolsArray = symbols.split(',').map(s => s.trim().toUpperCase()).slice(0, 100);
    const binanceService = getBinanceService();
    
    // 獲取24小時統計數據
    const allTickers = await binanceService.get24hrTicker();
    
    // 過濾請求的交易對
    const requestedTickers = allTickers.filter(ticker => 
      symbolsArray.includes(ticker.symbol)
    );
    
    // 格式化數據
    const formattedData = requestedTickers.map(ticker => ({
      symbol: ticker.symbol,
      price: ticker.lastPrice,
      priceChange: ticker.priceChange,
      priceChangePercent: ticker.priceChangePercent,
      volume: ticker.volume,
      quoteVolume: ticker.quoteVolume,
      high: ticker.highPrice,
      low: ticker.lowPrice,
      lastUpdate: new Date().toISOString()
    }));
    
    res.status(200).json({
      success: true,
      message: `獲取 ${formattedData.length} 個價格數據成功`,
      data: formattedData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('批量獲取價格失敗:', error.message);
    res.status(500).json({
      success: false,
      message: '批量獲取價格失敗',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 獲取24小時市場統計
 * GET /api/market/stats24h
 */
const get24hStats = async (req, res) => {
  try {
    const binanceService = getBinanceService();
    
    // 獲取24小時統計數據
    const allTickers = await binanceService.get24hrTicker();
    
    // 過濾 USDT 交易對
    const usdtPairs = allTickers.filter(ticker => ticker.symbol.endsWith('USDT'));
    
    // 計算統計數據
    const totalCoins = usdtPairs.length;
    const gainersCount = usdtPairs.filter(ticker => parseFloat(ticker.priceChangePercent) > 0).length;
    const losersCount = usdtPairs.filter(ticker => parseFloat(ticker.priceChangePercent) < 0).length;
    
    // 計算平均變化
    const totalChange = usdtPairs.reduce((sum, ticker) => 
      sum + parseFloat(ticker.priceChangePercent), 0
    );
    const avgChange = totalCoins > 0 ? totalChange / totalCoins : 0;
    
    // 計算總交易量
    const totalVolume = usdtPairs.reduce((sum, ticker) => 
      sum + parseFloat(ticker.quoteVolume), 0
    );
    
    res.status(200).json({
      success: true,
      message: '獲取24小時市場統計成功',
      data: {
        totalCoins,
        gainersCount,
        losersCount,
        avgChange,
        totalVolume,
        lastUpdate: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('獲取24小時市場統計失敗:', error.message);
    res.status(500).json({
      success: false,
      message: '獲取24小時市場統計失敗',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 獲取單一貨幣詳細資訊
 * GET /api/market/symbol-info/:symbol
 */
const getSymbolInfo = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'symbol 參數必須提供',
        timestamp: new Date().toISOString()
      });
    }
    
    const upperSymbol = symbol.toUpperCase();
    const binanceService = getBinanceService();
    
    // 獲取24小時統計數據
    const ticker = await binanceService.get24hrTicker(upperSymbol);
    
    if (!ticker) {
      return res.status(404).json({
        success: false,
        message: `找不到交易對: ${upperSymbol}`,
        timestamp: new Date().toISOString()
      });
    }
    
    // 格式化數據
    const symbolInfo = {
      symbol: ticker.symbol,
      baseAsset: upperSymbol.replace('USDT', ''),
      quoteAsset: 'USDT',
      price: {
        symbol: ticker.symbol,
        price: ticker.lastPrice,
        priceChange: ticker.priceChange,
        priceChangePercent: ticker.priceChangePercent,
        highPrice: ticker.highPrice,
        lowPrice: ticker.lowPrice,
        volume: ticker.volume,
        quoteVolume: ticker.quoteVolume,
        openPrice: ticker.openPrice,
        count: ticker.count,
        lastUpdate: new Date().toISOString()
      },
      tradingInfo: {
        status: 'TRADING',
        baseAssetPrecision: 8,
        quotePrecision: 8,
        minQty: '0.00001000',
        maxQty: '9000.00000000',
        stepSize: '0.00001000',
        minNotional: '10.00000000'
      }
    };
    
    res.status(200).json({
      success: true,
      message: `獲取 ${upperSymbol} 資訊成功`,
      data: symbolInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('獲取單一貨幣資訊失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取單一貨幣資訊失敗',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getTrendingPairs,
  getSymbolPrice,
  getMultiplePrices,
  getMultiplePricesQuery,
  getBatchPrices,
  get24hStats,
  get24hrTicker,
  getKlines,
  getOrderBookDepth,
  searchSymbols,
  getCachedPrices,
  testConnection,
  getMarketOverview,
  getSymbolInfo
};