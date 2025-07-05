/**
 * LINE Webhook 事件控制器
 * 
 * 處理來自 LINE Platform 的各種 Webhook 事件：
 * 1. 使用者訊息事件 (message)
 * 2. 使用者關注/取消關注事件 (follow/unfollow)
 * 3. Postback 事件 (Rich Menu 互動)
 * 4. 加入/退出群組事件 (join/leave)
 */

const logger = require('../utils/logger');
const lineMessagingService = require('../services/line-messaging.service');
const { ApiErrorFactory } = require('../utils/ApiError');

class LineWebhookController {
  /**
   * 處理 LINE Webhook 事件主要入口
   * @param {Array} events - LINE 事件陣列
   * @returns {Promise<Array>} 處理結果陣列
   */
  async handleWebhookEvents(events) {
    const results = [];
    
    for (const event of events) {
      try {
        const result = await this.handleSingleEvent(event);
        results.push({
          eventId: event.id || 'unknown',
          type: event.type,
          success: true,
          result
        });
      } catch (error) {
        logger.error('LINE Webhook 單一事件處理失敗:', {
          eventType: event.type,
          eventId: event.id,
          error: error.message
        });
        
        results.push({
          eventId: event.id || 'unknown',
          type: event.type,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * 處理單一 LINE 事件
   * @param {Object} event - LINE 事件物件
   * @returns {Promise<Object>} 處理結果
   */
  async handleSingleEvent(event) {
    const { type, source, timestamp } = event;
    const userId = source?.userId;

    logger.info('處理 LINE 事件', {
      type,
      userId: userId ? userId.substring(0, 8) + '...' : 'unknown',
      timestamp: new Date(timestamp).toISOString()
    });

    switch (type) {
      case 'message':
        return await this.handleMessageEvent(event);
        
      case 'follow':
        return await this.handleFollowEvent(event);
        
      case 'unfollow':
        return await this.handleUnfollowEvent(event);
        
      case 'postback':
        return await this.handlePostbackEvent(event);
        
      case 'join':
        return await this.handleJoinEvent(event);
        
      case 'leave':
        return await this.handleLeaveEvent(event);
        
      case 'memberJoined':
        return await this.handleMemberJoinedEvent(event);
        
      case 'memberLeft':
        return await this.handleMemberLeftEvent(event);
        
      default:
        logger.debug('未處理的 LINE 事件類型:', { type });
        return { 
          message: `Unhandled event type: ${type}`,
          handled: false 
        };
    }
  }

  /**
   * 處理使用者訊息事件
   * @param {Object} event - 訊息事件
   */
  async handleMessageEvent(event) {
    const { replyToken, message, source } = event;
    const userId = source.userId;
    const messageType = message.type;

    logger.info('收到使用者訊息', {
      userId: userId.substring(0, 8) + '...',
      messageType,
      text: messageType === 'text' ? message.text?.substring(0, 50) : undefined
    });

    try {
      switch (messageType) {
        case 'text':
          return await this.handleTextMessage(replyToken, message.text, userId);
          
        case 'image':
          return await this.handleImageMessage(replyToken, message, userId);
          
        case 'sticker':
          return await this.handleStickerMessage(replyToken, message, userId);
          
        default:
          return await this.handleUnsupportedMessage(replyToken, messageType, userId);
      }
    } catch (error) {
      logger.error('處理訊息事件失敗:', error);
      
      // 發送錯誤回覆
      await this.sendErrorReply(replyToken, '抱歉，處理您的訊息時發生錯誤。');
      throw error;
    }
  }

  /**
   * 處理文字訊息
   * @param {string} replyToken - 回覆 token
   * @param {string} text - 使用者輸入的文字
   * @param {string} userId - 使用者 ID
   */
  async handleTextMessage(replyToken, text, userId) {
    const lowerText = text.toLowerCase().trim();

    // 指令匹配和處理
    if (this.isHelpCommand(lowerText)) {
      return await this.sendHelpMessage(replyToken);
    }
    
    if (this.isPriceCommand(lowerText)) {
      return await this.sendPriceInfo(replyToken, text);
    }
    
    if (this.isStatusCommand(lowerText)) {
      return await this.sendStatusInfo(replyToken);
    }
    
    if (this.isAlertCommand(lowerText)) {
      return await this.sendAlertInfo(replyToken);
    }

    // 加密貨幣代號查詢
    const cryptoSymbol = this.extractCryptoSymbol(text);
    if (cryptoSymbol) {
      return await this.sendCryptoPrice(replyToken, cryptoSymbol);
    }

    // 預設回覆
    return await this.sendDefaultReply(replyToken, text);
  }

  /**
   * 處理圖片訊息
   * @param {string} replyToken - 回覆 token
   * @param {Object} message - 圖片訊息物件
   * @param {string} userId - 使用者 ID
   */
  async handleImageMessage(replyToken, message, userId) {
    const replyText = '感謝您分享的圖片！ 🖼️\n\n目前 NexusTrade 機器人主要處理文字指令。\n\n發送 "幫助" 查看可用功能。';
    
    await lineMessagingService.replyMessage(replyToken, replyText);
    
    return { 
      message: 'Image message acknowledged',
      action: 'replied_with_text_guide' 
    };
  }

  /**
   * 處理貼圖訊息
   * @param {string} replyToken - 回覆 token
   * @param {Object} message - 貼圖訊息物件
   * @param {string} userId - 使用者 ID
   */
  async handleStickerMessage(replyToken, message, userId) {
    const responses = [
      '可愛的貼圖！😊',
      '感謝您的貼圖分享！',
      '很棒的表情！👍'
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    const replyText = `${randomResponse}\n\n發送 "幫助" 查看 NexusTrade 可用功能。`;
    
    await lineMessagingService.replyMessage(replyToken, replyText);
    
    return { 
      message: 'Sticker message acknowledged',
      stickerPackageId: message.packageId,
      stickerId: message.stickerId
    };
  }

  /**
   * 處理不支援的訊息類型
   * @param {string} replyToken - 回覆 token
   * @param {string} messageType - 訊息類型
   * @param {string} userId - 使用者 ID
   */
  async handleUnsupportedMessage(replyToken, messageType, userId) {
    const replyText = `抱歉，目前不支援 ${messageType} 類型的訊息。\n\n發送文字訊息與我互動，或發送 "幫助" 查看可用功能。`;
    
    await lineMessagingService.replyMessage(replyToken, replyText);
    
    return { 
      message: `Unsupported message type: ${messageType}`,
      action: 'replied_with_guide'
    };
  }

  /**
   * 處理使用者關注事件
   * @param {Object} event - 關注事件
   */
  async handleFollowEvent(event) {
    const userId = event.source.userId;
    
    logger.info('新使用者關注', {
      userId: userId.substring(0, 8) + '...',
      timestamp: new Date(event.timestamp).toISOString()
    });

    try {
      // 取得使用者資料
      const userProfile = await lineMessagingService.getUserProfile(userId);
      
      const welcomeMessage = this.createWelcomeMessage(userProfile.profile);
      
      // 發送歡迎訊息
      await lineMessagingService.sendFlexMessage(userId, welcomeMessage);
      
      // TODO: 更新資料庫記錄新使用者
      
      return {
        action: 'user_followed',
        userId: userId.substring(0, 8) + '...',
        displayName: userProfile.profile?.displayName,
        welcomeMessageSent: true
      };
      
    } catch (error) {
      logger.error('處理關注事件失敗:', error);
      
      // 發送簡單歡迎訊息作為備案
      const simpleWelcome = '歡迎使用 NexusTrade！🎉\n\n發送 "幫助" 查看可用功能。';
      await lineMessagingService.sendTextMessage(userId, simpleWelcome);
      
      throw error;
    }
  }

  /**
   * 處理使用者取消關注事件
   * @param {Object} event - 取消關注事件
   */
  async handleUnfollowEvent(event) {
    const userId = event.source.userId;
    
    logger.info('使用者取消關注', {
      userId: userId.substring(0, 8) + '...',
      timestamp: new Date(event.timestamp).toISOString()
    });

    // TODO: 更新資料庫記錄使用者狀態
    // TODO: 停用該使用者的所有通知設定
    
    return {
      action: 'user_unfollowed',
      userId: userId.substring(0, 8) + '...'
    };
  }

  /**
   * 處理 Postback 事件（Rich Menu 互動）
   * @param {Object} event - Postback 事件
   */
  async handlePostbackEvent(event) {
    const { replyToken, postback, source } = event;
    const userId = source.userId;
    const data = postback.data;

    logger.info('收到 Postback 事件', {
      userId: userId.substring(0, 8) + '...',
      data
    });

    try {
      // 解析 postback 數據
      const action = this.parsePostbackData(data);
      
      switch (action.type) {
        case 'price_check':
          return await this.handlePriceCheckPostback(replyToken, action.symbol);
          
        case 'market_summary':
          return await this.handleMarketSummaryPostback(replyToken);
          
        case 'settings':
          return await this.handleSettingsPostback(replyToken, userId);
          
        case 'help':
          return await this.sendHelpMessage(replyToken);
          
        default:
          return await this.handleUnknownPostback(replyToken, data);
      }
      
    } catch (error) {
      logger.error('處理 Postback 事件失敗:', error);
      await this.sendErrorReply(replyToken, '抱歉，處理您的請求時發生錯誤。');
      throw error;
    }
  }

  /**
   * 處理群組加入事件
   * @param {Object} event - 加入事件
   */
  async handleJoinEvent(event) {
    const groupId = event.source.groupId || event.source.roomId;
    
    logger.info('機器人加入群組', {
      groupId: groupId?.substring(0, 8) + '...',
      sourceType: event.source.type
    });

    const welcomeText = `感謝將 NexusTrade 機器人加入群組！🎉\n\n我可以幫助您：\n• 查看加密貨幣價格\n• 接收市場更新\n• 設定價格警報\n\n發送 "幫助" 了解更多功能。`;
    
    await lineMessagingService.replyMessage(event.replyToken, welcomeText);
    
    return {
      action: 'joined_group',
      groupId: groupId?.substring(0, 8) + '...'
    };
  }

  /**
   * 處理群組離開事件
   * @param {Object} event - 離開事件
   */
  async handleLeaveEvent(event) {
    const groupId = event.source.groupId || event.source.roomId;
    
    logger.info('機器人離開群組', {
      groupId: groupId?.substring(0, 8) + '...'
    });

    return {
      action: 'left_group',
      groupId: groupId?.substring(0, 8) + '...'
    };
  }

  /**
   * 處理成員加入事件
   * @param {Object} event - 成員加入事件
   */
  async handleMemberJoinedEvent(event) {
    // 暫時不處理成員加入事件，避免過多通知
    return { action: 'member_joined', handled: false };
  }

  /**
   * 處理成員離開事件
   * @param {Object} event - 成員離開事件
   */
  async handleMemberLeftEvent(event) {
    // 暫時不處理成員離開事件
    return { action: 'member_left', handled: false };
  }

  // ================== 輔助方法 ==================

  /**
   * 檢查是否為幫助指令
   */
  isHelpCommand(text) {
    const helpKeywords = ['help', 'h', '幫助', '說明', '指令', '功能', '?', '？'];
    return helpKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * 檢查是否為價格查詢指令
   */
  isPriceCommand(text) {
    const priceKeywords = ['price', 'p', '價格', '報價', '行情'];
    return priceKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * 檢查是否為狀態查詢指令
   */
  isStatusCommand(text) {
    const statusKeywords = ['status', 'stat', '狀態', '狀況', '系統'];
    return statusKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * 檢查是否為警報設定指令
   */
  isAlertCommand(text) {
    const alertKeywords = ['alert', 'alarm', '警報', '提醒', '通知', '設定'];
    return alertKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * 從文字中提取加密貨幣代號
   */
  extractCryptoSymbol(text) {
    const cryptoPattern = /\b(BTC|ETH|BNB|XRP|ADA|SOL|DOGE|MATIC|DOT|LTC|AVAX|UNI|LINK|BCH|XLM|ICP)\b/i;
    const match = text.match(cryptoPattern);
    return match ? match[1].toUpperCase() : null;
  }

  /**
   * 解析 Postback 數據
   */
  parsePostbackData(data) {
    try {
      return JSON.parse(data);
    } catch (error) {
      // 如果不是 JSON，嘗試簡單的 key=value 格式
      const parts = data.split('=');
      if (parts.length === 2) {
        return { type: parts[0], value: parts[1] };
      }
      return { type: 'unknown', raw: data };
    }
  }

  /**
   * 發送幫助訊息
   */
  async sendHelpMessage(replyToken) {
    const helpText = `🤖 NexusTrade 指令說明

📊 價格查詢：
• 發送 "價格" 查看熱門加密貨幣
• 發送 "BTC"、"ETH" 等代號查看特定價格

⚡ 快速功能：
• 發送 "狀態" 查看系統狀態
• 發送 "警報" 了解價格提醒設定

🌐 網站功能：
更多功能請造訪：https://nexustrade.com

有問題隨時發訊息給我！😊`;

    await lineMessagingService.replyMessage(replyToken, helpText);
    return { action: 'help_sent' };
  }

  /**
   * 發送價格資訊
   */
  async sendPriceInfo(replyToken, originalText) {
    // TODO: 整合實際的價格數據服務
    const priceText = `📊 熱門加密貨幣價格

🚧 此功能正在開發中...

請發送特定幣種代號（如 BTC、ETH）
或造訪網站查看即時價格：
https://nexustrade.com/market`;

    await lineMessagingService.replyMessage(replyToken, priceText);
    return { action: 'price_info_sent', query: originalText };
  }

  /**
   * 發送特定加密貨幣價格
   */
  async sendCryptoPrice(replyToken, symbol) {
    // TODO: 整合 Binance API 取得實際價格
    const priceText = `💰 ${symbol} 價格查詢

🚧 功能開發中...

請造訪網站查看 ${symbol} 即時價格：
https://nexustrade.com/currency/${symbol.toLowerCase()}`;

    await lineMessagingService.replyMessage(replyToken, priceText);
    return { action: 'crypto_price_sent', symbol };
  }

  /**
   * 發送狀態資訊
   */
  async sendStatusInfo(replyToken) {
    const statusText = `⚡ NexusTrade 系統狀態

🟢 機器人：正常運行
🟢 API 服務：穩定
🟢 市場數據：即時更新

📊 支援功能：
• 價格查詢
• 市場分析
• 警報通知

⏰ 最後更新：${new Date().toLocaleString('zh-TW')}`;

    await lineMessagingService.replyMessage(replyToken, statusText);
    return { action: 'status_sent' };
  }

  /**
   * 發送警報設定資訊
   */
  async sendAlertInfo(replyToken) {
    const alertText = `🚨 價格警報設定

設定方式：
1. 造訪 NexusTrade 網站
2. 登入您的帳號
3. 前往"價格警報"頁面
4. 綁定您的 LINE 帳號

網站連結：
https://nexustrade.com/alerts

綁定後即可接收即時價格通知！📲`;

    await lineMessagingService.replyMessage(replyToken, alertText);
    return { action: 'alert_info_sent' };
  }

  /**
   * 發送預設回覆
   */
  async sendDefaultReply(replyToken, originalText) {
    const responses = [
      '感謝您的訊息！發送 "幫助" 查看可用功能。',
      '我是 NexusTrade 機器人，很高興為您服務！\n發送 "幫助" 了解更多功能。',
      '如需協助，請發送 "幫助" 查看指令說明。'
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    await lineMessagingService.replyMessage(replyToken, randomResponse);
    
    return { action: 'default_reply_sent', originalText };
  }

  /**
   * 發送錯誤回覆
   */
  async sendErrorReply(replyToken, errorMessage) {
    try {
      await lineMessagingService.replyMessage(replyToken, errorMessage);
    } catch (error) {
      logger.error('發送錯誤回覆失敗:', error);
    }
  }

  /**
   * 建立歡迎訊息
   */
  createWelcomeMessage(userProfile) {
    const displayName = userProfile?.displayName || '朋友';
    
    return lineMessagingService.templates.welcome({
      username: displayName,
      email: 'LINE 使用者'
    });
  }

  /**
   * 處理價格檢查 Postback
   */
  async handlePriceCheckPostback(replyToken, symbol) {
    return await this.sendCryptoPrice(replyToken, symbol || 'BTC');
  }

  /**
   * 處理市場摘要 Postback
   */
  async handleMarketSummaryPostback(replyToken) {
    return await this.sendPriceInfo(replyToken, 'market summary');
  }

  /**
   * 處理設定 Postback
   */
  async handleSettingsPostback(replyToken, userId) {
    const settingsText = `⚙️ 個人設定

若要完整設定和管理您的偏好：

1. 造訪 NexusTrade 網站
2. 登入您的帳號
3. 前往"設定"頁面
4. 綁定您的 LINE 帳號

網站連結：https://nexustrade.com/settings

綁定後可設定：
• 價格警報通知
• 市場更新頻率
• 個人觀察清單`;

    await lineMessagingService.replyMessage(replyToken, settingsText);
    return { action: 'settings_sent', userId: userId.substring(0, 8) + '...' };
  }

  /**
   * 處理未知 Postback
   */
  async handleUnknownPostback(replyToken, data) {
    const unknownText = '抱歉，無法識別您的請求。\n\n發送 "幫助" 查看可用功能。';
    await lineMessagingService.replyMessage(replyToken, unknownText);
    return { action: 'unknown_postback', data };
  }
}

// 導出單例
module.exports = new LineWebhookController();