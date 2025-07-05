/**
 * NexusTrade LINE Messaging API 服務
 * 
 * 取代已停用的 LINE Notify，使用 LINE Messaging API
 * 參考文件: https://developers.line.biz/en/docs/messaging-api/
 */

const axios = require('axios');
const logger = require('../utils/logger');
const { ApiErrorFactory } = require('../utils/ApiError');

class LineMessagingService {
  constructor() {
    this.apiUrl = 'https://api.line.me/v2/bot';
    this.channelAccessToken = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
    this.channelSecret = process.env.LINE_MESSAGING_CHANNEL_SECRET;
    this.webhookUrl = process.env.LINE_MESSAGING_WEBHOOK_URL;
    
    // 驗證必要設定
    this.isConfigured = !!(this.channelAccessToken && this.channelSecret);
    
    if (!this.isConfigured) {
      logger.warn('LINE Messaging API 未完整設定，通知功能將被停用');
    }
    
    // 設定預設 headers
    this.defaultHeaders = {
      'Authorization': `Bearer ${this.channelAccessToken}`,
      'Content-Type': 'application/json'
    };
    
    // 訊息模板
    this.templates = {
      priceAlert: this.createPriceAlertMessage,
      marketUpdate: this.createMarketUpdateMessage,
      systemAlert: this.createSystemAlertMessage,
      welcome: this.createWelcomeMessage
    };
  }

  /**
   * 發送文字訊息給特定使用者
   * @param {string} userId - LINE 使用者 ID
   * @param {string} message - 訊息內容
   * @param {Object} options - 額外選項
   */
  async sendTextMessage(userId, message, options = {}) {
    try {
      if (!this.isConfigured) {
        throw new Error('LINE Messaging API 未設定');
      }

      const payload = {
        to: userId,
        messages: [{
          type: 'text',
          text: message
        }]
      };

      const response = await axios.post(
        `${this.apiUrl}/message/push`,
        payload,
        { headers: this.defaultHeaders }
      );

      logger.info('LINE 訊息發送成功', {
        userId: userId.substr(0, 8) + '...',
        messageLength: message.length,
        responseStatus: response.status
      });

      return {
        success: true,
        messageId: response.data?.sentMessages?.[0]?.id,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('LINE 訊息發送失敗:', {
        error: error.message,
        userId: userId?.substr(0, 8) + '...',
        status: error.response?.status,
        data: error.response?.data
      });

      throw ApiErrorFactory.internal(
        `LINE Messaging API 錯誤: ${error.message}`,
        'LINE_MESSAGING_ERROR'
      );
    }
  }

  /**
   * 發送彈性訊息 (Flex Message)
   * @param {string} userId - LINE 使用者 ID
   * @param {Object} flexContent - Flex Message 內容
   */
  async sendFlexMessage(userId, flexContent) {
    try {
      if (!this.isConfigured) {
        throw new Error('LINE Messaging API 未設定');
      }

      const payload = {
        to: userId,
        messages: [{
          type: 'flex',
          altText: flexContent.altText || 'NexusTrade 通知',
          contents: flexContent
        }]
      };

      const response = await axios.post(
        `${this.apiUrl}/message/push`,
        payload,
        { headers: this.defaultHeaders }
      );

      logger.info('LINE Flex 訊息發送成功', {
        userId: userId.substr(0, 8) + '...',
        altText: flexContent.altText,
        responseStatus: response.status
      });

      return {
        success: true,
        messageId: response.data?.sentMessages?.[0]?.id,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('LINE Flex 訊息發送失敗:', {
        error: error.message,
        userId: userId?.substr(0, 8) + '...'
      });

      throw ApiErrorFactory.internal(
        `LINE Messaging API 錯誤: ${error.message}`,
        'LINE_MESSAGING_ERROR'
      );
    }
  }

  /**
   * 建立價格警報訊息
   * @param {Object} alertData - 警報數據
   */
  createPriceAlertMessage(alertData) {
    const { symbol, currentPrice, targetPrice, alertType, changePercent } = alertData;
    const emoji = alertType === 'price_above' ? '📈' : '📉';
    const direction = alertType === 'price_above' ? '突破' : '跌破';
    
    return {
      altText: `${symbol} 價格警報`,
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [{
          type: 'text',
          text: `${emoji} 價格警報`,
          weight: 'bold',
          color: '#1DB446',
          size: 'md'
        }]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: symbol,
            weight: 'bold',
            size: 'xl',
            color: '#000000'
          },
          {
            type: 'text',
            text: `${direction} $${safeTargetPrice.toFixed(8)}`,
            size: 'md',
            color: '#666666',
            margin: 'sm'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '當前價格',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 2
                  },
                  {
                    type: 'text',
                    text: `$${safeCurrentPrice.toFixed(8)}`,
                    wrap: true,
                    color: '#666666',
                    size: 'sm',
                    flex: 3
                  }
                ]
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '變動幅度',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 2
                  },
                  {
                    type: 'text',
                    text: `${safeChangePercent > 0 ? '+' : ''}${safeChangePercent.toFixed(2)}%`,
                    wrap: true,
                    color: safeChangePercent > 0 ? '#06C755' : '#FF334B',
                    size: 'sm',
                    flex: 3,
                    weight: 'bold'
                  }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '查看詳細',
              uri: `https://nexustrade.com/market/${symbol}`
            }
          }
        ]
      }
    };
  }

  /**
   * 建立市場更新訊息
   * @param {Object} marketData - 市場數據
   */
  createMarketUpdateMessage(marketData) {
    const { trending, summary, timestamp } = marketData;
    
    return {
      altText: '市場更新摘要',
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [{
          type: 'text',
          text: '📊 市場更新',
          weight: 'bold',
          color: '#1DB446',
          size: 'md'
        }]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '熱門加密貨幣',
            weight: 'bold',
            size: 'lg',
            margin: 'md'
          },
          ...trending.slice(0, 3).map(coin => ({
            type: 'box',
            layout: 'baseline',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: coin.symbol,
                color: '#333333',
                size: 'sm',
                flex: 2,
                weight: 'bold'
              },
              {
                type: 'text',
                text: `$${coin.price}`,
                wrap: true,
                color: '#666666',
                size: 'sm',
                flex: 2
              },
              {
                type: 'text',
                text: `${coin.change > 0 ? '+' : ''}${coin.change.toFixed(2)}%`,
                wrap: true,
                color: coin.change > 0 ? '#06C755' : '#FF334B',
                size: 'sm',
                flex: 2,
                weight: 'bold'
              }
            ]
          })),
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'text',
            text: summary,
            wrap: true,
            color: '#666666',
            size: 'sm',
            margin: 'lg'
          }
        ]
      }
    };
  }

  /**
   * 建立系統警報訊息
   * @param {Object} alertData - 警報數據
   */
  createSystemAlertMessage(alertData) {
    const { level, title, message, timestamp } = alertData;
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨',
      critical: '🔥'
    }[level] || 'ℹ️';

    const color = {
      info: '#1DB446',
      warning: '#FF9500',
      error: '#FF334B',
      critical: '#FF334B'
    }[level] || '#1DB446';

    return `${emoji} *${title}*\n\n${message}\n\n⏰ ${new Date(timestamp).toLocaleString('zh-TW')}`;
  }

  /**
   * 建立歡迎訊息
   * @param {Object} userData - 使用者數據
   */
  createWelcomeMessage(userData) {
    const { username, email } = userData;
    
    return {
      altText: '歡迎加入 NexusTrade',
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [{
          type: 'text',
          text: '🎉 歡迎加入 NexusTrade',
          weight: 'bold',
          color: '#1DB446',
          size: 'lg',
          align: 'center'
        }]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `哈囉 ${username}！`,
            weight: 'bold',
            size: 'xl',
            color: '#000000',
            align: 'center'
          },
          {
            type: 'text',
            text: '感謝您加入 NexusTrade 加密貨幣交易追蹤平台',
            wrap: true,
            color: '#666666',
            size: 'md',
            margin: 'lg',
            align: 'center'
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'text',
            text: '您現在可以：',
            weight: 'bold',
            color: '#333333',
            margin: 'lg'
          },
          {
            type: 'text',
            text: '• 追蹤加密貨幣價格\n• 設定價格警報\n• 接收市場更新\n• 使用 AI 分析功能',
            wrap: true,
            color: '#666666',
            size: 'sm',
            margin: 'md'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '開始使用',
              uri: 'https://nexustrade.com/dashboard'
            }
          }
        ]
      }
    };
  }

  /**
   * 驗證 webhook 簽名
   * @param {string} body - 請求 body
   * @param {string} signature - LINE 簽名
   */
  validateSignature(body, signature) {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('SHA256', this.channelSecret)
      .update(body)
      .digest('base64');
    
    return hash === signature;
  }

  /**
   * 處理 webhook 事件
   * @param {Object} event - LINE webhook 事件
   */
  async handleWebhookEvent(event) {
    try {
      // 委託給專門的 Webhook 控制器處理
      const webhookController = require('../controllers/line-webhook.controller');
      return await webhookController.handleSingleEvent(event);
    } catch (error) {
      logger.error('處理 webhook 事件失敗:', error);
      throw error;
    }
  }

  // 移除舊的事件處理方法，現在由 WebhookController 負責處理

  /**
   * 取得服務狀態
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      apiUrl: this.apiUrl,
      webhookUrl: this.webhookUrl,
      hasChannelToken: !!this.channelAccessToken,
      hasChannelSecret: !!this.channelSecret
    };
  }
}

module.exports = new LineMessagingService();