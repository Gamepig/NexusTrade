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
            text: `${direction} $${targetPrice}`,
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
                    text: `$${currentPrice}`,
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
                    text: `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
                    wrap: true,
                    color: changePercent > 0 ? '#06C755' : '#FF334B',
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
      logger.info('收到 LINE webhook 事件', {
        type: event.type,
        userId: event.source?.userId
      });

      switch (event.type) {
        case 'message':
          await this.handleMessageEvent(event);
          break;
        case 'follow':
          await this.handleFollowEvent(event);
          break;
        case 'unfollow':
          await this.handleUnfollowEvent(event);
          break;
        default:
          logger.debug('未處理的 webhook 事件類型:', event.type);
      }
    } catch (error) {
      logger.error('處理 webhook 事件失敗:', error);
    }
  }

  /**
   * 處理使用者訊息事件
   * @param {Object} event - 訊息事件
   */
  async handleMessageEvent(event) {
    const { replyToken, message, source } = event;
    const userId = source.userId;

    if (message.type === 'text') {
      const text = message.text.toLowerCase();
      
      // 簡單的命令處理
      if (text.includes('幫助') || text.includes('help')) {
        await this.replyHelpMessage(replyToken);
      } else if (text.includes('價格') || text.includes('price')) {
        await this.replyPriceInfo(replyToken);
      } else {
        await this.replyGenericMessage(replyToken);
      }
    }
  }

  /**
   * 處理使用者關注事件
   * @param {Object} event - 關注事件
   */
  async handleFollowEvent(event) {
    const userId = event.source.userId;
    logger.info('新用戶關注:', { userId: userId.substr(0, 8) + '...' });
    
    // 發送歡迎訊息
    await this.sendTextMessage(userId, '歡迎使用 NexusTrade！\n\n發送 "幫助" 查看可用功能。');
  }

  /**
   * 處理使用者取消關注事件
   * @param {Object} event - 取消關注事件
   */
  async handleUnfollowEvent(event) {
    const userId = event.source.userId;
    logger.info('用戶取消關注:', { userId: userId.substr(0, 8) + '...' });
    
    // 可以在這裡更新用戶狀態或進行清理
  }

  /**
   * 回覆幫助訊息
   * @param {string} replyToken - 回覆 token
   */
  async replyHelpMessage(replyToken) {
    const helpText = `🤖 NexusTrade 指令說明

• 發送 "價格" 查看熱門加密貨幣價格
• 發送 "BTC" 或其他幣種代號查看特定價格
• 發送 "警報" 設定價格提醒
• 發送 "狀態" 查看系統狀態

更多功能請訪問: https://nexustrade.com`;

    await this.replyMessage(replyToken, helpText);
  }

  /**
   * 回覆價格資訊
   * @param {string} replyToken - 回覆 token
   */
  async replyPriceInfo(replyToken) {
    const priceText = `📊 熱門加密貨幣價格

🚧 此功能正在開發中...
請訪問網站查看即時價格：
https://nexustrade.com/market`;

    await this.replyMessage(replyToken, priceText);
  }

  /**
   * 回覆一般訊息
   * @param {string} replyToken - 回覆 token
   */
  async replyGenericMessage(replyToken) {
    const responses = [
      '感謝您的訊息！發送 "幫助" 查看可用功能。',
      '我是 NexusTrade 機器人，很高興為您服務！',
      '如需幫助，請發送 "幫助" 查看指令說明。'
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    await this.replyMessage(replyToken, randomResponse);
  }

  /**
   * 回覆訊息
   * @param {string} replyToken - 回覆 token
   * @param {string} message - 訊息內容
   */
  async replyMessage(replyToken, message) {
    try {
      const payload = {
        replyToken,
        messages: [{
          type: 'text',
          text: message
        }]
      };

      await axios.post(
        `${this.apiUrl}/message/reply`,
        payload,
        { headers: this.defaultHeaders }
      );

      logger.info('LINE 回覆訊息成功');
    } catch (error) {
      logger.error('LINE 回覆訊息失敗:', error.message);
    }
  }

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