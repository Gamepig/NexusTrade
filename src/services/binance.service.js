/**
 * NexusTrade Binance API 服務
 * 
 * 處理與 Binance API 的所有交互
 * 包含現貨市場數據、WebSocket 連接、價格查詢等
 */

const axios = require('axios');
const crypto = require('crypto');
const WebSocket = require('ws');
const logger = require('../utils/logger');
const { ApiErrorFactory } = require('../utils/ApiError');

class BinanceService {
  constructor() {
    this.baseURL = process.env.BINANCE_API_URL || 'https://api.binance.com';
    this.apiKey = process.env.BINANCE_API_KEY;
    this.apiSecret = process.env.BINANCE_API_SECRET;
    this.wsURL = process.env.BINANCE_WEBSOCKET_URL || 'wss://stream.binance.com:9443/ws';
    
    // WebSocket 連接管理
    this.wsConnections = new Map();
    this.subscriptions = new Map();
    
    // 數據快取
    this.priceCache = new Map();
    this.symbolCache = new Map();
    this.lastUpdateTime = null;
    
    this.initializeService();
  }

  /**
   * 初始化服務
   */
  async initializeService() {
    try {
      logger.info('初始化 Binance 服務...');
      
      // 測試 API 連接
      await this.testConnection();
      
      // 載入交易對資訊
      await this.loadExchangeInfo();
      
      // 初始化熱門交易對的價格數據
      await this.initializePriceData();
      
      logger.info('Binance 服務初始化完成');
    } catch (error) {
      logger.error('Binance 服務初始化失敗:', error.message);
    }
  }

  /**
   * 測試 Binance API 連接
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseURL}/api/v3/ping`);
      logger.info('Binance API 連接測試成功');
      return true;
    } catch (error) {
      logger.error('Binance API 連接測試失敗:', error.message);
      throw ApiErrorFactory.serviceUnavailable('Binance API 無法連接', 'BINANCE_CONNECTION_FAILED');
    }
  }

  /**
   * 載入交易所資訊
   */
  async loadExchangeInfo() {
    try {
      const response = await axios.get(`${this.baseURL}/api/v3/exchangeInfo`);
      const exchangeInfo = response.data;
      
      // 快取交易對資訊
      exchangeInfo.symbols.forEach(symbol => {
        this.symbolCache.set(symbol.symbol, {
          symbol: symbol.symbol,
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          status: symbol.status,
          permissions: symbol.permissions,
          filters: symbol.filters
        });
      });
      
      logger.info(`載入 ${exchangeInfo.symbols.length} 個交易對資訊`);
      return exchangeInfo;
    } catch (error) {
      logger.error('載入交易所資訊失敗:', error.message);
      throw error;
    }
  }

  /**
   * 初始化熱門交易對價格數據
   */
  async initializePriceData() {
    const popularPairs = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT',
      'SOLUSDT', 'DOTUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT'
    ];

    try {
      const prices = await this.get24hrTicker();
      
      popularPairs.forEach(symbol => {
        const ticker = prices.find(p => p.symbol === symbol);
        if (ticker) {
          this.priceCache.set(symbol, {
            symbol: ticker.symbol,
            price: parseFloat(ticker.lastPrice),
            priceChange: parseFloat(ticker.priceChange),
            priceChangePercent: parseFloat(ticker.priceChangePercent),
            volume: parseFloat(ticker.volume),
            quoteVolume: parseFloat(ticker.quoteVolume),
            high: parseFloat(ticker.highPrice),
            low: parseFloat(ticker.lowPrice),
            openPrice: parseFloat(ticker.openPrice),
            timestamp: Date.now()
          });
        }
      });
      
      this.lastUpdateTime = Date.now();
      logger.info(`初始化 ${popularPairs.length} 個熱門交易對價格數據`);
    } catch (error) {
      logger.error('初始化價格數據失敗:', error.message);
    }
  }

  /**
   * 取得當前價格
   */
  async getCurrentPrice(symbol) {
    try {
      // 先檢查快取
      const cached = this.priceCache.get(symbol.toUpperCase());
      if (cached && (Date.now() - cached.timestamp) < 5000) { // 5秒內的數據
        return cached;
      }

      const response = await axios.get(`${this.baseURL}/api/v3/ticker/price`, {
        params: { symbol: symbol.toUpperCase() }
      });

      const priceData = {
        symbol: response.data.symbol,
        price: parseFloat(response.data.price),
        timestamp: Date.now()
      };

      // 更新快取
      this.priceCache.set(symbol.toUpperCase(), priceData);
      
      return priceData;
    } catch (error) {
      logger.error(`取得 ${symbol} 價格失敗:`, error.message);
      throw ApiErrorFactory.badRequest(`無法取得 ${symbol} 價格`, 'PRICE_FETCH_FAILED');
    }
  }

  /**
   * 取得24小時價格統計
   */
  async get24hrTicker(symbol = null) {
    try {
      const params = symbol ? { symbol: symbol.toUpperCase() } : {};
      const response = await axios.get(`${this.baseURL}/api/v3/ticker/24hr`, { params });
      
      return response.data;
    } catch (error) {
      logger.error('取得24小時價格統計失敗:', error.message);
      throw error;
    }
  }

  /**
   * 取得K線數據
   */
  async getKlineData(symbol, interval = '1h', limit = 100) {
    try {
      const response = await axios.get(`${this.baseURL}/api/v3/klines`, {
        params: {
          symbol: symbol.toUpperCase(),
          interval,
          limit
        }
      });

      // 格式化K線數據
      const klines = response.data.map(k => ({
        openTime: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        closeTime: k[6],
        quoteAssetVolume: parseFloat(k[7]),
        numberOfTrades: k[8],
        takerBuyBaseAssetVolume: parseFloat(k[9]),
        takerBuyQuoteAssetVolume: parseFloat(k[10])
      }));

      return klines;
    } catch (error) {
      logger.error(`取得 ${symbol} K線數據失敗:`, error.message);
      throw error;
    }
  }

  /**
   * 取得訂單簿深度
   */
  async getOrderBookDepth(symbol, limit = 100) {
    try {
      const response = await axios.get(`${this.baseURL}/api/v3/depth`, {
        params: {
          symbol: symbol.toUpperCase(),
          limit
        }
      });

      return {
        lastUpdateId: response.data.lastUpdateId,
        bids: response.data.bids.map(b => ({
          price: parseFloat(b[0]),
          quantity: parseFloat(b[1])
        })),
        asks: response.data.asks.map(a => ({
          price: parseFloat(a[0]),
          quantity: parseFloat(a[1])
        }))
      };
    } catch (error) {
      logger.error(`取得 ${symbol} 訂單簿失敗:`, error.message);
      throw error;
    }
  }

  /**
   * 取得熱門交易對排行
   */
  async getTopGainers(limit = 10) {
    try {
      const tickers = await this.get24hrTicker();
      
      // 篩選USDT交易對並排序
      const usdtPairs = tickers
        .filter(t => t.symbol.endsWith('USDT') && parseFloat(t.volume) > 1000000)
        .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
        .slice(0, limit)
        .map(t => ({
          symbol: t.symbol,
          price: parseFloat(t.lastPrice),
          priceChange: parseFloat(t.priceChange),
          priceChangePercent: parseFloat(t.priceChangePercent),
          volume: parseFloat(t.volume),
          quoteVolume: parseFloat(t.quoteVolume)
        }));

      return usdtPairs;
    } catch (error) {
      logger.error('取得熱門交易對失敗:', error.message);
      throw error;
    }
  }

  /**
   * 搜尋交易對
   */
  searchSymbols(query, limit = 20) {
    const searchTerm = query.toUpperCase();
    const results = [];
    
    for (const [symbol, info] of this.symbolCache) {
      if (symbol.includes(searchTerm) || 
          info.baseAsset.includes(searchTerm) || 
          info.quoteAsset.includes(searchTerm)) {
        results.push({
          symbol: info.symbol,
          baseAsset: info.baseAsset,
          quoteAsset: info.quoteAsset,
          status: info.status
        });
        
        if (results.length >= limit) break;
      }
    }
    
    return results;
  }

  /**
   * 建立WebSocket連接
   */
  createWebSocketConnection(streams, onMessage, onError) {
    const streamParam = Array.isArray(streams) ? streams.join('/') : streams;
    const wsUrl = `${this.wsURL}/${streamParam}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.on('open', () => {
        logger.info(`WebSocket 連接建立: ${streamParam}`);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (onMessage) onMessage(message);
        } catch (error) {
          logger.error('WebSocket 訊息解析失敗:', error.message);
        }
      });
      
      ws.on('error', (error) => {
        logger.error('WebSocket 錯誤:', error.message);
        if (onError) onError(error);
      });
      
      ws.on('close', () => {
        logger.info(`WebSocket 連接關閉: ${streamParam}`);
      });
      
      // 儲存連接
      const connectionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.wsConnections.set(connectionId, ws);
      
      return { connectionId, ws };
    } catch (error) {
      logger.error('建立WebSocket連接失敗:', error.message);
      throw error;
    }
  }

  /**
   * 訂閱價格更新
   */
  subscribeToPriceUpdates(symbols, onUpdate) {
    const streams = symbols.map(symbol => `${symbol.toLowerCase()}@ticker`);
    
    return this.createWebSocketConnection(
      streams,
      (message) => {
        if (message.data) {
          // 多流訂閱格式
          const ticker = message.data;
          this.updatePriceCache(ticker);
          if (onUpdate) onUpdate(ticker);
        } else {
          // 單流訂閱格式
          this.updatePriceCache(message);
          if (onUpdate) onUpdate(message);
        }
      },
      (error) => {
        logger.error('價格訂閱錯誤:', error.message);
      }
    );
  }

  /**
   * 更新價格快取
   */
  updatePriceCache(ticker) {
    const priceData = {
      symbol: ticker.s,
      price: parseFloat(ticker.c),
      priceChange: parseFloat(ticker.P),
      priceChangePercent: parseFloat(ticker.P),
      volume: parseFloat(ticker.v),
      quoteVolume: parseFloat(ticker.q),
      high: parseFloat(ticker.h),
      low: parseFloat(ticker.l),
      openPrice: parseFloat(ticker.o),
      timestamp: Date.now()
    };
    
    this.priceCache.set(ticker.s, priceData);
  }

  /**
   * 關閉WebSocket連接
   */
  closeWebSocketConnection(connectionId) {
    const ws = this.wsConnections.get(connectionId);
    if (ws) {
      ws.close();
      this.wsConnections.delete(connectionId);
      logger.info(`WebSocket 連接已關閉: ${connectionId}`);
    }
  }

  /**
   * 取得快取的價格數據
   */
  getCachedPrices() {
    const prices = [];
    for (const [symbol, data] of this.priceCache) {
      prices.push(data);
    }
    return prices.sort((a, b) => b.quoteVolume - a.quoteVolume);
  }

  /**
   * 清理服務資源
   */
  cleanup() {
    // 關閉所有WebSocket連接
    for (const [connectionId, ws] of this.wsConnections) {
      ws.close();
    }
    this.wsConnections.clear();
    this.subscriptions.clear();
    
    logger.info('Binance 服務資源已清理');
  }
}

// 單例模式
let binanceServiceInstance = null;

const getBinanceService = () => {
  if (!binanceServiceInstance) {
    binanceServiceInstance = new BinanceService();
  }
  return binanceServiceInstance;
};

module.exports = {
  BinanceService,
  getBinanceService
};