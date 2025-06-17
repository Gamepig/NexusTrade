/**
 * NexusTrade 市場數據路由
 * 
 * 處理市場數據相關的所有路由
 */

const express = require('express');
const { asyncErrorHandler } = require('../middleware/errorHandler');
const marketController = require('../controllers/market.controller');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 市場概覽
 * GET /api/market/overview
 */
router.get('/overview', asyncErrorHandler(marketController.getMarketOverview));

/**
 * 熱門交易對
 * GET /api/market/trending
 */
router.get('/trending', asyncErrorHandler(marketController.getTrendingPairs));

/**
 * 搜尋交易對
 * GET /api/market/search
 */
router.get('/search', asyncErrorHandler(marketController.searchSymbols));

/**
 * 快取價格數據
 * GET /api/market/cache/prices
 */
router.get('/cache/prices', asyncErrorHandler(marketController.getCachedPrices));

/**
 * 測試連接
 * GET /api/market/test
 */
router.get('/test', asyncErrorHandler(marketController.testConnection));

/**
 * 單個交易對價格
 * GET /api/market/price/:symbol
 */
router.get('/price/:symbol', asyncErrorHandler(marketController.getSymbolPrice));

/**
 * 多個交易對價格
 * POST /api/market/prices
 */
router.post('/prices', asyncErrorHandler(marketController.getMultiplePrices));

/**
 * 24小時價格統計
 * GET /api/market/ticker/:symbol
 */
router.get('/ticker/:symbol', asyncErrorHandler(marketController.get24hrTicker));

/**
 * K線數據
 * GET /api/market/klines/:symbol
 */
router.get('/klines/:symbol', asyncErrorHandler(marketController.getKlines));

/**
 * 訂單簿深度
 * GET /api/market/depth/:symbol
 */
router.get('/depth/:symbol', asyncErrorHandler(marketController.getOrderBookDepth));

/**
 * 路由說明 - 開發階段用途
 * GET /api/market
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'NexusTrade 市場數據 API',
    version: '1.0.0',
    endpoints: {
      'GET /api/market/overview': '市場概覽',
      'GET /api/market/trending': '熱門交易對',
      'GET /api/market/search': '搜尋交易對',
      'GET /api/market/cache/prices': '快取價格數據',
      'GET /api/market/test': '測試 Binance API 連接',
      'GET /api/market/price/:symbol': '單個交易對價格',
      'POST /api/market/prices': '多個交易對價格',
      'GET /api/market/ticker/:symbol': '24小時價格統計',
      'GET /api/market/klines/:symbol': 'K線數據',
      'GET /api/market/depth/:symbol': '訂單簿深度'
    },
    parameters: {
      'trending': 'limit - 限制返回數量 (預設: 10)',
      'search': 'q - 搜尋查詢, limit - 限制返回數量 (預設: 20)',
      'klines': 'interval - K線間隔 (預設: 1h), limit - 限制返回數量 (預設: 100)',
      'depth': 'limit - 限制返回數量 (預設: 100)'
    },
    note: '所有價格數據來自 Binance API',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;