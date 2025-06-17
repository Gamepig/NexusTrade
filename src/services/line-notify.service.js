/**
 * NexusTrade LINE Notify 服務
 * 
 * 處理 LINE Notify API 整合和訊息推送功能
 */

const axios = require('axios');
const logger = require('../utils/logger');
const { ApiErrorFactory } = require('../utils/ApiError');

class LineNotifyService {
  constructor() {
    this.apiUrl = 'https://notify-api.line.me/api/notify';
    this.oAuthUrl = 'https://notify-bot.line.me/oauth';
    this.defaultToken = process.env.LINE_ACCESS_TOKEN;
    this.clientId = process.env.LINE_NOTIFY_CLIENT_ID;
    this.clientSecret = process.env.LINE_NOTIFY_CLIENT_SECRET;
    this.redirectUri = process.env.LINE_NOTIFY_REDIRECT_URI || 'http://localhost:3000/auth/line-notify/callback';
    
    // 訊息模板
    this.templates = {
      priceAlert: this.createPriceAlertTemplate,
      marketUpdate: this.createMarketUpdateTemplate,
      systemAlert: this.createSystemAlertTemplate,
      welcome: this.createWelcomeTemplate
    };
  }

  /**
   * 發送基本訊息
   */
  async sendMessage(message, token = null) {
    try {
      const accessToken = token || this.defaultToken;
      
      if (!accessToken) {
        throw ApiErrorFactory.badRequest('LINE Notify access token 未設定', 'MISSING_ACCESS_TOKEN');
      }

      const response = await axios.post(this.apiUrl, 
        new URLSearchParams({
          message: message
        }),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (response.data.status === 200) {
        logger.info('LINE Notify 訊息發送成功', { 
          message: message.substring(0, 50) + '...',
          status: response.data.status 
        });
        return {
          success: true,
          status: response.data.status,
          message: response.data.message
        };
      } else {
        throw new Error(`LINE Notify API 錯誤: ${response.data.message}`);
      }
    } catch (error) {
      logger.error('LINE Notify 訊息發送失敗:', {
        error: error.message,
        response: error.response?.data
      });
      
      if (error.response?.status === 401) {
        throw ApiErrorFactory.unauthorized('LINE Notify token 無效或已過期', 'INVALID_LINE_TOKEN');
      }
      
      throw ApiErrorFactory.serviceUnavailable(`LINE Notify 服務錯誤: ${error.message}`, 'LINE_NOTIFY_ERROR');
    }
  }

  /**
   * 發送帶圖片的訊息
   */
  async sendMessageWithImage(message, imageUrl, token = null) {
    try {
      const accessToken = token || this.defaultToken;
      
      if (!accessToken) {
        throw ApiErrorFactory.badRequest('LINE Notify access token 未設定', 'MISSING_ACCESS_TOKEN');
      }

      const formData = new URLSearchParams({
        message: message,
        imageThumbnail: imageUrl,
        imageFullsize: imageUrl
      });

      const response = await axios.post(this.apiUrl, formData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data.status === 200) {
        logger.info('LINE Notify 圖片訊息發送成功', { 
          message: message.substring(0, 50) + '...',
          imageUrl,
          status: response.data.status 
        });
        return {
          success: true,
          status: response.data.status,
          message: response.data.message
        };
      } else {
        throw new Error(`LINE Notify API 錯誤: ${response.data.message}`);
      }
    } catch (error) {
      logger.error('LINE Notify 圖片訊息發送失敗:', error.message);
      throw error;
    }
  }

  /**
   * 發送價格警報
   */
  async sendPriceAlert(alertData, token = null) {
    try {
      const message = this.templates.priceAlert(alertData);
      return await this.sendMessage(message, token);
    } catch (error) {
      logger.error('發送價格警報失敗:', error.message);
      throw error;
    }
  }

  /**
   * 發送市場更新
   */
  async sendMarketUpdate(marketData, token = null) {
    try {
      const message = this.templates.marketUpdate(marketData);
      return await this.sendMessage(message, token);
    } catch (error) {
      logger.error('發送市場更新失敗:', error.message);
      throw error;
    }
  }

  /**
   * 發送系統警報
   */
  async sendSystemAlert(alertData, token = null) {
    try {
      const message = this.templates.systemAlert(alertData);
      return await this.sendMessage(message, token);
    } catch (error) {
      logger.error('發送系統警報失敗:', error.message);
      throw error;
    }
  }

  /**
   * 發送歡迎訊息
   */
  async sendWelcomeMessage(userData, token = null) {
    try {
      const message = this.templates.welcome(userData);
      return await this.sendMessage(message, token);
    } catch (error) {
      logger.error('發送歡迎訊息失敗:', error.message);
      throw error;
    }
  }

  /**
   * 價格警報訊息模板
   */
  createPriceAlertTemplate(data) {
    const { symbol, currentPrice, targetPrice, direction, changePercent, timestamp } = data;
    const emoji = direction === 'above' ? '🚀' : '🔻';
    const directionText = direction === 'above' ? '突破' : '跌破';
    
    return `${emoji} 價格警報 - ${symbol}

${symbol} 已${directionText}目標價格！

📊 當前價格: $${currentPrice.toLocaleString()}
🎯 目標價格: $${targetPrice.toLocaleString()}
📈 變化幅度: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%

⏰ 時間: ${new Date(timestamp).toLocaleString('zh-TW')}

立即查看詳情 → http://localhost:3000`;
  }

  /**
   * 市場更新訊息模板
   */
  createMarketUpdateTemplate(data) {
    const { type, symbols, summary, timestamp } = data;
    
    let message = `📊 市場${type === 'daily' ? '日報' : '更新'}\n\n`;
    
    if (summary) {
      message += `📈 市場概況:\n`;
      message += `• 上漲: ${summary.gainers}個\n`;
      message += `• 下跌: ${summary.losers}個\n`;
      message += `• 總成交量: $${summary.totalVolume?.toLocaleString() || 'N/A'}\n\n`;
    }
    
    if (symbols && symbols.length > 0) {
      message += `🔥 熱門交易對:\n`;
      symbols.slice(0, 5).forEach((symbol, index) => {
        const changeEmoji = symbol.priceChangePercent >= 0 ? '📈' : '📉';
        message += `${index + 1}. ${symbol.symbol} $${symbol.price.toLocaleString()} ${changeEmoji}${symbol.priceChangePercent.toFixed(2)}%\n`;
      });
    }
    
    message += `\n⏰ ${new Date(timestamp).toLocaleString('zh-TW')}`;
    
    return message;
  }

  /**
   * 系統警報訊息模板
   */
  createSystemAlertTemplate(data) {
    const { type, message, severity, details, timestamp } = data;
    
    let emoji = '⚠️';
    if (severity === 'critical') emoji = '🚨';
    if (severity === 'warning') emoji = '⚠️';
    if (severity === 'info') emoji = 'ℹ️';
    
    let alertMessage = `${emoji} 系統${type === 'error' ? '錯誤' : '通知'}\n\n`;
    alertMessage += `📝 訊息: ${message}\n`;
    
    if (details) {
      alertMessage += `🔍 詳情: ${details}\n`;
    }
    
    alertMessage += `⏰ 時間: ${new Date(timestamp).toLocaleString('zh-TW')}`;
    
    return alertMessage;
  }

  /**
   * 歡迎訊息模板
   */
  createWelcomeTemplate(data) {
    const { username, email } = data;
    
    return `🎉 歡迎加入 NexusTrade！

👋 哈囉 ${username || email}！

感謝您註冊 NexusTrade 加密貨幣交易平台。您現在可以：

📊 即時追蹤市場價格
🔔 設定價格警報
📈 查看專業圖表分析
🤖 獲得 AI 市場洞察

立即開始使用 → http://localhost:3000

有任何問題隨時聯繫我們！`;
  }

  /**
   * 驗證 LINE Notify token
   */
  async validateToken(token) {
    try {
      const response = await axios.get('https://notify-api.line.me/api/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.status === 200) {
        return {
          valid: true,
          targetType: response.data.targetType,
          target: response.data.target
        };
      } else {
        return { valid: false };
      }
    } catch (error) {
      logger.error('驗證 LINE Notify token 失敗:', error.message);
      return { valid: false };
    }
  }

  /**
   * 撤銷 LINE Notify token
   */
  async revokeToken(token) {
    try {
      const response = await axios.post('https://notify-api.line.me/api/revoke', {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.status === 200) {
        logger.info('LINE Notify token 撤銷成功');
        return { success: true };
      } else {
        throw new Error(`撤銷失敗: ${response.data.message}`);
      }
    } catch (error) {
      logger.error('撤銷 LINE Notify token 失敗:', error.message);
      throw error;
    }
  }

  /**
   * 生成 LINE Notify OAuth 授權 URL
   */
  generateAuthUrl(state = null) {
    if (!this.clientId) {
      throw ApiErrorFactory.serviceUnavailable('LINE Notify Client ID 未設定', 'MISSING_CLIENT_ID');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'notify',
      state: state || Math.random().toString(36).substring(2, 15)
    });

    return `${this.oAuthUrl}/authorize?${params.toString()}`;
  }

  /**
   * 交換授權碼為 access token
   */
  async exchangeCodeForToken(code) {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw ApiErrorFactory.serviceUnavailable('LINE Notify OAuth 設定不完整', 'INCOMPLETE_OAUTH_CONFIG');
      }

      const response = await axios.post(`${this.oAuthUrl}/token`, 
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri,
          client_id: this.clientId,
          client_secret: this.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (response.data.access_token) {
        logger.info('LINE Notify access token 取得成功');
        return {
          success: true,
          accessToken: response.data.access_token
        };
      } else {
        throw new Error('未收到 access token');
      }
    } catch (error) {
      logger.error('交換 LINE Notify token 失敗:', error.message);
      throw ApiErrorFactory.badRequest(`OAuth 授權失敗: ${error.message}`, 'OAUTH_EXCHANGE_FAILED');
    }
  }

  /**
   * 測試通知發送
   */
  async testNotification(token = null) {
    try {
      const testMessage = `🔔 NexusTrade 測試通知

這是一則測試訊息，用於驗證 LINE Notify 整合是否正常運作。

⏰ 時間: ${new Date().toLocaleString('zh-TW')}
🔗 系統: NexusTrade v1.0.0`;

      return await this.sendMessage(testMessage, token);
    } catch (error) {
      logger.error('測試通知發送失敗:', error.message);
      throw error;
    }
  }

  /**
   * 批量發送通知
   */
  async sendBulkNotifications(notifications) {
    const results = [];
    
    for (const notification of notifications) {
      try {
        const result = await this.sendMessage(notification.message, notification.token);
        results.push({
          ...notification,
          success: true,
          result
        });
        
        // 避免超過 LINE Notify 速率限制
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          ...notification,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * 取得服務狀態
   */
  getStatus() {
    return {
      configured: !!this.defaultToken,
      oAuthConfigured: !!(this.clientId && this.clientSecret),
      apiUrl: this.apiUrl,
      redirectUri: this.redirectUri
    };
  }
}

// 單例模式
let lineNotifyServiceInstance = null;

const getLineNotifyService = () => {
  if (!lineNotifyServiceInstance) {
    lineNotifyServiceInstance = new LineNotifyService();
  }
  return lineNotifyServiceInstance;
};

module.exports = {
  LineNotifyService,
  getLineNotifyService
};