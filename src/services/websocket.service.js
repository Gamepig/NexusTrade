/**
 * NexusTrade WebSocket 服務
 * 
 * 處理即時市場數據推送和客戶端連接管理
 */

const WebSocket = require('ws');
const { getBinanceService } = require('./binance.service');
const logger = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map();
    this.subscriptions = new Map();
    this.binanceConnections = new Map();
    this.isInitialized = false;
  }

  /**
   * 初始化 WebSocket 伺服器
   */
  initialize(server) {
    try {
      this.wss = new WebSocket.Server({ 
        server,
        path: '/ws',
        clientTracking: true
      });

      this.setupWebSocketServer();
      this.isInitialized = true;
      
      logger.info('WebSocket 服務初始化完成');
    } catch (error) {
      logger.error('WebSocket 服務初始化失敗:', error.message);
      throw error;
    }
  }

  /**
   * 設定 WebSocket 伺服器事件處理
   */
  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientInfo = {
        id: clientId,
        ws,
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        subscriptions: new Set(),
        connectedAt: new Date(),
        lastActivity: new Date()
      };
      
      this.clients.set(clientId, clientInfo);
      
      logger.info(`WebSocket 客戶端連接: ${clientId}`, {
        ip: clientInfo.ip,
        totalClients: this.clients.size
      });

      // 發送歡迎訊息
      this.sendToClient(clientId, {
        type: 'connection',
        status: 'connected',
        clientId,
        timestamp: new Date().toISOString()
      });

      // 設定客戶端事件處理
      this.setupClientEvents(clientId, ws);
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket 伺服器錯誤:', error.message);
    });

    // 定期清理無效連接
    setInterval(() => {
      this.cleanupInactiveClients();
    }, 30000); // 每30秒檢查一次
  }

  /**
   * 設定客戶端事件處理
   */
  setupClientEvents(clientId, ws) {
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(clientId, message);
        
        // 更新最後活動時間
        const client = this.clients.get(clientId);
        if (client) {
          client.lastActivity = new Date();
        }
      } catch (error) {
        logger.error(`處理客戶端 ${clientId} 訊息失敗:`, error.message);
        this.sendToClient(clientId, {
          type: 'error',
          message: '訊息格式錯誤',
          timestamp: new Date().toISOString()
        });
      }
    });

    ws.on('close', (code, reason) => {
      this.handleClientDisconnect(clientId, code, reason);
    });

    ws.on('error', (error) => {
      logger.error(`客戶端 ${clientId} WebSocket 錯誤:`, error.message);
    });

    // 心跳檢測
    ws.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.lastActivity = new Date();
      }
    });
  }

  /**
   * 處理客戶端訊息
   */
  async handleClientMessage(clientId, message) {
    const { type, data } = message;
    
    logger.info(`處理客戶端 ${clientId} 訊息:`, { type, data });

    switch (type) {
      case 'subscribe':
        await this.handleSubscription(clientId, data);
        break;
        
      case 'unsubscribe':
        await this.handleUnsubscription(clientId, data);
        break;
        
      case 'ping':
        this.sendToClient(clientId, {
          type: 'pong',
          timestamp: new Date().toISOString()
        });
        break;
        
      case 'get_subscriptions':
        this.sendClientSubscriptions(clientId);
        break;
        
      default:
        logger.warn(`未知的訊息類型: ${type}`, { clientId });
        this.sendToClient(clientId, {
          type: 'error',
          message: `未知的訊息類型: ${type}`,
          timestamp: new Date().toISOString()
        });
    }
  }

  /**
   * 處理訂閱請求
   */
  async handleSubscription(clientId, data) {
    try {
      const { symbols, streams } = data;
      const client = this.clients.get(clientId);
      
      if (!client) {
        logger.error(`客戶端 ${clientId} 不存在`);
        return;
      }

      if (symbols && Array.isArray(symbols)) {
        // 訂閱特定交易對的價格更新
        for (const symbol of symbols) {
          await this.subscribeToSymbol(clientId, symbol.toUpperCase());
        }
      } else if (streams && Array.isArray(streams)) {
        // 訂閱特定數據流
        for (const stream of streams) {
          await this.subscribeToStream(clientId, stream);
        }
      }

      this.sendToClient(clientId, {
        type: 'subscription_success',
        data: {
          symbols: symbols || [],
          streams: streams || []
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`處理訂閱請求失敗:`, error.message);
      this.sendToClient(clientId, {
        type: 'subscription_error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 訂閱交易對價格更新
   */
  async subscribeToSymbol(clientId, symbol) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // 添加到客戶端訂閱列表
    client.subscriptions.add(symbol);

    // 檢查是否已有這個交易對的 Binance 連接
    if (!this.binanceConnections.has(symbol)) {
      await this.createBinanceSubscription(symbol);
    }

    // 添加到全域訂閱追蹤
    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, new Set());
    }
    this.subscriptions.get(symbol).add(clientId);

    logger.info(`客戶端 ${clientId} 訂閱交易對: ${symbol}`);
  }

  /**
   * 建立 Binance WebSocket 訂閱
   */
  async createBinanceSubscription(symbol) {
    try {
      const binanceService = getBinanceService();
      const { connectionId } = binanceService.subscribeToPriceUpdates(
        [symbol],
        (ticker) => {
          this.broadcastToSymbolSubscribers(symbol, {
            type: 'price_update',
            data: {
              symbol: ticker.s || symbol,
              price: parseFloat(ticker.c),
              priceChange: parseFloat(ticker.P),
              priceChangePercent: parseFloat(ticker.P),
              volume: parseFloat(ticker.v),
              timestamp: Date.now()
            }
          });
        }
      );

      this.binanceConnections.set(symbol, connectionId);
      logger.info(`建立 Binance 訂閱: ${symbol}`);
    } catch (error) {
      logger.error(`建立 Binance 訂閱失敗 (${symbol}):`, error.message);
    }
  }

  /**
   * 廣播訊息給交易對訂閱者
   */
  broadcastToSymbolSubscribers(symbol, message) {
    const subscribers = this.subscriptions.get(symbol);
    if (!subscribers) return;

    for (const clientId of subscribers) {
      this.sendToClient(clientId, message);
    }
  }

  /**
   * 處理取消訂閱請求
   */
  async handleUnsubscription(clientId, data) {
    try {
      const { symbols, streams } = data;
      const client = this.clients.get(clientId);
      
      if (!client) return;

      if (symbols && Array.isArray(symbols)) {
        for (const symbol of symbols) {
          await this.unsubscribeFromSymbol(clientId, symbol.toUpperCase());
        }
      }

      this.sendToClient(clientId, {
        type: 'unsubscription_success',
        data: {
          symbols: symbols || [],
          streams: streams || []
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`處理取消訂閱請求失敗:`, error.message);
    }
  }

  /**
   * 取消訂閱交易對
   */
  async unsubscribeFromSymbol(clientId, symbol) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // 從客戶端訂閱列表移除
    client.subscriptions.delete(symbol);

    // 從全域訂閱追蹤移除
    const subscribers = this.subscriptions.get(symbol);
    if (subscribers) {
      subscribers.delete(clientId);
      
      // 如果沒有訂閱者了，關閉 Binance 連接
      if (subscribers.size === 0) {
        this.subscriptions.delete(symbol);
        const connectionId = this.binanceConnections.get(symbol);
        if (connectionId) {
          const binanceService = getBinanceService();
          binanceService.closeWebSocketConnection(connectionId);
          this.binanceConnections.delete(symbol);
          logger.info(`關閉 Binance 訂閱: ${symbol}`);
        }
      }
    }

    logger.info(`客戶端 ${clientId} 取消訂閱交易對: ${symbol}`);
  }

  /**
   * 發送客戶端訂閱列表
   */
  sendClientSubscriptions(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.sendToClient(clientId, {
      type: 'subscriptions',
      data: {
        symbols: Array.from(client.subscriptions),
        count: client.subscriptions.size
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 處理客戶端斷線
   */
  handleClientDisconnect(clientId, code, reason) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // 清理所有訂閱
    for (const symbol of client.subscriptions) {
      this.unsubscribeFromSymbol(clientId, symbol);
    }

    // 移除客戶端
    this.clients.delete(clientId);

    logger.info(`客戶端斷線: ${clientId}`, {
      code,
      reason: reason?.toString(),
      totalClients: this.clients.size
    });
  }

  /**
   * 發送訊息給特定客戶端
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error(`發送訊息給客戶端 ${clientId} 失敗:`, error.message);
      return false;
    }
  }

  /**
   * 廣播訊息給所有客戶端
   */
  broadcast(message) {
    let sentCount = 0;
    for (const [clientId, client] of this.clients) {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }
    return sentCount;
  }

  /**
   * 生成客戶端 ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理無效連接
   */
  cleanupInactiveClients() {
    const now = new Date();
    const inactiveThreshold = 5 * 60 * 1000; // 5分鐘

    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState !== WebSocket.OPEN || 
          (now - client.lastActivity) > inactiveThreshold) {
        logger.info(`清理無效客戶端: ${clientId}`);
        this.handleClientDisconnect(clientId, 1001, 'Inactive');
      } else {
        // 發送心跳
        client.ws.ping();
      }
    }
  }

  /**
   * 取得服務狀態
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      clientsCount: this.clients.size,
      subscriptionsCount: this.subscriptions.size,
      binanceConnectionsCount: this.binanceConnections.size,
      clients: Array.from(this.clients.values()).map(client => ({
        id: client.id,
        ip: client.ip,
        subscriptions: Array.from(client.subscriptions),
        connectedAt: client.connectedAt,
        lastActivity: client.lastActivity
      }))
    };
  }

  /**
   * 清理資源
   */
  cleanup() {
    // 關閉所有客戶端連接
    for (const [clientId, client] of this.clients) {
      client.ws.close(1001, 'Server shutdown');
    }

    // 關閉所有 Binance 連接
    const binanceService = getBinanceService();
    for (const connectionId of this.binanceConnections.values()) {
      binanceService.closeWebSocketConnection(connectionId);
    }

    // 關閉 WebSocket 伺服器
    if (this.wss) {
      this.wss.close();
    }

    // 清空所有集合
    this.clients.clear();
    this.subscriptions.clear();
    this.binanceConnections.clear();

    logger.info('WebSocket 服務資源已清理');
  }
}

// 單例模式
let webSocketServiceInstance = null;

const getWebSocketService = () => {
  if (!webSocketServiceInstance) {
    webSocketServiceInstance = new WebSocketService();
  }
  return webSocketServiceInstance;
};

module.exports = {
  WebSocketService,
  getWebSocketService
};