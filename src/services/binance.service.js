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
    this.wsURL = process.env.BINANCE_WEBSOCKET_URL || 'wss://stream.binance.com:9443';
    this.wsStreamURL = process.env.BINANCE_WEBSOCKET_STREAM_URL || 'wss://stream.binance.com:443';
    
    // WebSocket 連接管理
    this.wsConnections = new Map();
    this.subscriptions = new Map();
    
    // 數據快取
    this.priceCache = new Map();
    this.symbolCache = new Map();
    this.allTickersCache = null;
    this.allTickersCacheTime = null;
    this.cacheExpiryTime = 60000; // 1 分鐘快取
    this.lastUpdateTime = null;
    
    // 速率限制保護 (2023年8月更新)
    this.requestQueue = [];
    this.requestCount = 0;
    this.requestWindow = 60000; // 1分鐘窗口
    this.maxRequestsPerWindow = 6000; // Binance 新限制為 6000 請求權重/分鐘
    this.maxRawRequestsPerWindow = 1200; // 原始請求數限制
    this.minRequestInterval = 50; // 最小請求間隔 50ms (提升性能)
    this.lastRequestTime = 0;
    
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
   * 速率限制檢查和等待
   */
  async rateLimitCheck() {
    const now = Date.now();
    
    // 清理過期的請求記錄
    this.requestQueue = this.requestQueue.filter(timestamp => 
      now - timestamp < this.requestWindow
    );
    
    // 檢查是否超過速率限制
    if (this.requestQueue.length >= this.maxRequestsPerWindow) {
      const oldestRequest = Math.min(...this.requestQueue);
      const waitTime = this.requestWindow - (now - oldestRequest);
      logger.warn(`達到速率限制，等待 ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.rateLimitCheck(); // 遞歸檢查
    }
    
    // 檢查最小請求間隔
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // 記錄請求
    this.requestQueue.push(Date.now());
    this.lastRequestTime = Date.now();
  }

  /**
   * 帶速率限制的 HTTP 請求
   */
  async makeRequest(url, params = {}) {
    await this.rateLimitCheck();
    
    try {
      const response = await axios.get(url, { params });
      return response;
    } catch (error) {
      if (error.response?.status === 429) {
        // 429 Too Many Requests - 退避重試
        const retryAfter = error.response.headers['retry-after'] || 60;
        logger.warn(`收到 429 錯誤，等待 ${retryAfter} 秒後重試`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.makeRequest(url, params); // 重試
      }
      throw error;
    }
  }

  /**
   * 測試 Binance API 連接
   */
  async testConnection() {
    try {
      await this.makeRequest(`${this.baseURL}/api/v3/ping`);
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
      const response = await this.makeRequest(`${this.baseURL}/api/v3/exchangeInfo`);
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

      const response = await this.makeRequest(`${this.baseURL}/api/v3/ticker/price`, {
        symbol: symbol.toUpperCase()
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
   * 取得24小時價格統計 (帶快取優化)
   */
  async get24hrTicker(symbol = null) {
    try {
      // 如果請求特定交易對，直接調用 API
      if (symbol) {
        const params = { symbol: symbol.toUpperCase() };
        const response = await this.makeRequest(`${this.baseURL}/api/v3/ticker/24hr`, params);
        return response.data;
      }
      
      // 如果請求所有交易對，檢查快取
      const now = Date.now();
      if (this.allTickersCache && 
          this.allTickersCacheTime && 
          (now - this.allTickersCacheTime) < this.cacheExpiryTime) {
        logger.info('使用快取的24小時統計數據');
        return this.allTickersCache;
      }
      
      // 快取過期或不存在，重新獲取數據
      logger.info('獲取新的24小時統計數據...');
      const response = await this.makeRequest(`${this.baseURL}/api/v3/ticker/24hr`, {});
      
      // 更新快取
      this.allTickersCache = response.data;
      this.allTickersCacheTime = now;
      
      logger.info(`已快取 ${response.data.length} 個交易對的24小時統計數據`);
      return response.data;
    } catch (error) {
      logger.error('取得24小時價格統計失敗:', error.message);
      
      // 如果有快取數據，返回快取（即使過期）
      if (this.allTickersCache) {
        logger.warn('API 調用失敗，使用過期的快取數據');
        return this.allTickersCache;
      }
      
      throw error;
    }
  }

  /**
   * 取得K線數據
   */
  async getKlineData(symbol, interval = '1h', limit = 100) {
    try {
      const response = await this.makeRequest(`${this.baseURL}/api/v3/klines`, {
        symbol: symbol.toUpperCase(),
        interval,
        limit
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
      const response = await this.makeRequest(`${this.baseURL}/api/v3/depth`, {
        symbol: symbol.toUpperCase(),
        limit
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
    let wsUrl;
    
    if (Array.isArray(streams) && streams.length > 1) {
      // 多重串流使用組合格式
      const streamParam = streams.join('/');
      wsUrl = `${this.wsStreamURL}/stream?streams=${streamParam}`;
    } else {
      // 單一串流使用直接格式
      const streamParam = Array.isArray(streams) ? streams[0] : streams;
      wsUrl = `${this.wsURL}/ws/${streamParam}`;
    }
    
    try {
      const ws = new WebSocket(wsUrl);
      
      // 心跳檢測
      let heartbeatInterval;
      
      ws.on('open', () => {
        logger.info(`WebSocket 連接建立: ${wsUrl}`);
        
        // 設定心跳檢測 (每20秒)
        heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
          }
        }, 20000);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (onMessage) onMessage(message);
        } catch (error) {
          logger.error('WebSocket 訊息解析失敗:', error.message);
        }
      });
      
      ws.on('pong', () => {
        // 收到 pong 回應，連接正常
      });
      
      ws.on('error', (error) => {
        logger.error('WebSocket 錯誤:', error.message);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (onError) onError(error);
      });
      
      ws.on('close', (code, reason) => {
        logger.info(`WebSocket 連接關閉: ${code} - ${reason}`);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        
        // 自動重連邏輯 (5秒後)
        if (code !== 1000) { // 非正常關閉
          setTimeout(() => {
            logger.info('嘗試 WebSocket 重連...');
            this.createWebSocketConnection(streams, onMessage, onError);
          }, 5000);
        }
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
      priceChange: parseFloat(ticker.p), // 修正：使用 ticker.p 表示價格變動
      priceChangePercent: parseFloat(ticker.P), // 修正：使用 ticker.P 表示百分比變動
      volume: parseFloat(ticker.v),
      quoteVolume: parseFloat(ticker.q),
      high: parseFloat(ticker.h),
      low: parseFloat(ticker.l),
      openPrice: parseFloat(ticker.o),
      count: parseInt(ticker.n), // 修正：使用 ticker.n 表示24小時交易筆數
      timestamp: Date.now()
    };
    
    this.priceCache.set(ticker.s, priceData);
    logger.debug(`更新價格快取: ${ticker.s} = ${priceData.price} (${priceData.priceChangePercent}%)`);
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