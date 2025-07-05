/**
 * LINE Messaging 核心傳送服務
 * 
 * 負責與 LINE Messaging API 的實際溝通
 * 處理訊息傳送的核心邏輯
 * 
 * @author NexusTrade 開發團隊
 * @version 1.0.0
 */

const axios = require('axios');
const crypto = require('crypto');
const flexMessageValidator = require('../flex-message-validator');

class LineCoreMessenger {
  constructor() {
    // LINE API 設定
    this.apiUrl = 'https://api.line.me/v2/bot';
    this.channelAccessToken = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN || process.env.LINE_ACCESS_TOKEN;
    this.channelSecret = process.env.LINE_MESSAGING_CHANNEL_SECRET || process.env.LINE_CHANNEL_SECRET;
    
    // 檢查設定是否完整
    this.isConfigured = !!(this.channelAccessToken && this.channelSecret);
    
    if (!this.isConfigured) {
      console.warn('[LINE Messaging] 未完整設定，服務將無法運作');
    }
    
    // HTTP 客戶端設定
    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${this.channelAccessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'NexusTrade-LINE-Messaging/1.0.0'
      }
    });
    
    // 設定請求攔截器
    this.httpClient.interceptors.request.use(
      (config) => {
        console.log(`[LINE API] 發送請求: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[LINE API] 請求錯誤:', error);
        return Promise.reject(error);
      }
    );
    
    // 設定回應攔截器
    this.httpClient.interceptors.response.use(
      (response) => {
        console.log(`[LINE API] 回應成功: ${response.status}`);
        return response;
      },
      (error) => {
        console.error('[LINE API] 回應錯誤:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * 發送文字訊息
   * @param {string} userId - LINE 使用者 ID
   * @param {string} text - 文字內容
   * @param {Object} options - 傳送選項
   * @returns {Promise<Object>} 傳送結果
   */
  async sendTextMessage(userId, text, options = {}) {
    if (!this.isConfigured) {
      throw new Error('LINE Messaging API 未設定');
    }

    try {
      const payload = {
        to: userId,
        messages: [{
          type: 'text',
          text: text
        }]
      };

      // 如果有額外選項，加入 payload
      if (options.quickReply) {
        payload.messages[0].quickReply = options.quickReply;
      }

      const response = await this.httpClient.post('/message/push', payload);

      const result = {
        success: true,
        messageId: response.data?.sentMessages?.[0]?.id,
        timestamp: new Date().toISOString(),
        userId: this._maskUserId(userId),
        messageType: 'text',
        messageLength: text.length
      };

      console.log('[LINE Messaging] 文字訊息發送成功:', result);
      return result;

    } catch (error) {
      const errorResult = {
        success: false,
        error: error.message,
        errorCode: error.response?.data?.message || 'UNKNOWN_ERROR',
        userId: this._maskUserId(userId),
        messageType: 'text',
        timestamp: new Date().toISOString()
      };

      console.error('[LINE Messaging] 文字訊息發送失敗:', errorResult);
      throw new Error(`LINE 文字訊息發送失敗: ${error.message}`);
    }
  }

  /**
   * 發送 Flex Message - 已增加驗證和自動修復
   * @param {string} userId - LINE 使用者 ID
   * @param {Object} flexContent - Flex Message 內容
   * @param {Object} options - 傳送選項
   * @returns {Promise<Object>} 傳送結果
   */
  async sendFlexMessage(userId, flexContent, options = {}) {
    if (!this.isConfigured) {
      throw new Error('LINE Messaging API 未設定');
    }

    try {
      // 驗證 Flex Message 格式
      const validation = flexMessageValidator.validateFlexMessage(flexContent);
      
      let processedContent = flexContent;
      if (!validation.isValid) {
        console.warn('[LINE Flex] 原始訊息格式有誤，嘗試自動修復:', validation.errors);
        
        // 嘗試自動修復
        processedContent = flexMessageValidator.autoFixFlexMessage(flexContent);
        
        // 再次驗證
        const revalidation = flexMessageValidator.validateFlexMessage(processedContent);
        if (!revalidation.isValid) {
          throw new Error(`Flex Message 格式驗證失敗: ${revalidation.errors.join(', ')}`);
        }
        
        console.log('[LINE Flex] 自動修復成功');
      }
      const payload = {
        to: userId,
        messages: [{
          type: 'flex',
          altText: processedContent.altText || options.altText || 'NexusTrade 通知',
          contents: processedContent
        }]
      };
      
      // 記錄發送的訊息格式供除錯
      console.log('[LINE Flex] 發送訊息:', {
        userId: this._maskUserId(userId),
        altText: payload.messages[0].altText,
        contentType: processedContent.type,
        hasHeader: !!processedContent.header,
        hasBody: !!processedContent.body,
        hasFooter: !!processedContent.footer
      });

      // 如果有額外選項，加入 payload
      if (options.quickReply) {
        payload.messages[0].quickReply = options.quickReply;
      }

      const response = await this.httpClient.post('/message/push', payload);

      const result = {
        success: true,
        messageId: response.data?.sentMessages?.[0]?.id,
        timestamp: new Date().toISOString(),
        userId: this._maskUserId(userId),
        messageType: 'flex',
        altText: payload.messages[0].altText
      };

      console.log('[LINE Messaging] Flex 訊息發送成功:', result);
      return result;

    } catch (error) {
      const errorResult = {
        success: false,
        error: error.message,
        errorCode: error.response?.data?.message || 'UNKNOWN_ERROR',
        userId: this._maskUserId(userId),
        messageType: 'flex',
        timestamp: new Date().toISOString()
      };

      // 詳細錯誤訊息
      console.error('[LINE Messaging] Flex 訊息發送失敗:', {
        ...errorResult,
        responseData: error.response?.data,
        requestPayload: error.config?.data ? JSON.parse(error.config.data) : null
      });
      
      // 特別處理 400 錯誤
      if (error.response?.status === 400) {
        const errorDetails = error.response.data;
        throw new Error(`LINE Flex 訊息格式錯誤: ${errorDetails.message || error.message}`);
      }
      
      throw new Error(`LINE Flex 訊息發送失敗: ${error.message}`);
    }
  }

  /**
   * 批量發送訊息（使用 multicast）
   * @param {string[]} userIds - LINE 使用者 ID 列表
   * @param {string|Object} message - 訊息內容
   * @param {Object} options - 傳送選項
   * @returns {Promise<Object>} 批量傳送結果
   */
  async sendBatchMessage(userIds, message, options = {}) {
    if (!this.isConfigured) {
      throw new Error('LINE Messaging API 未設定');
    }

    // LINE multicast API 限制最多 500 個使用者
    const maxBatchSize = options.batchSize || 500;
    const batches = this._createBatches(userIds, maxBatchSize);
    
    const results = [];
    const errors = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        // 如果是 Flex Message，驗證每個訊息
        let processedMessage = message;
        if (typeof message === 'object' && message.type === 'bubble') {
          const validation = flexMessageValidator.validateFlexMessage(message);
          if (!validation.isValid) {
            processedMessage = flexMessageValidator.autoFixFlexMessage(message);
          }
        }
        
        const batchResult = await this._sendMulticastMessage(batch, processedMessage, options);
        results.push({
          batchIndex: i,
          userCount: batch.length,
          success: true,
          result: batchResult
        });

        // 批次間延遲，避免觸發頻率限制
        if (i < batches.length - 1 && options.batchDelay !== false) {
          await this._delay(options.batchDelay || 100);
        }

      } catch (error) {
        errors.push({
          batchIndex: i,
          userCount: batch.length,
          error: error.message
        });
      }
    }

    const totalResult = {
      success: errors.length === 0,
      totalUsers: userIds.length,
      totalBatches: batches.length,
      successfulBatches: results.length,
      failedBatches: errors.length,
      results,
      errors,
      timestamp: new Date().toISOString()
    };

    console.log('[LINE Messaging] 批量發送完成:', {
      totalUsers: totalResult.totalUsers,
      successful: totalResult.successfulBatches,
      failed: totalResult.failedBatches
    });

    return totalResult;
  }

  /**
   * 發送 multicast 訊息
   * @private
   * @param {string[]} userIds - 使用者 ID 列表
   * @param {string|Object} message - 訊息內容
   * @param {Object} options - 選項
   * @returns {Promise<Object>} 傳送結果
   */
  async _sendMulticastMessage(userIds, message, options = {}) {
    let messageObject;

    // 根據訊息類型建立訊息物件
    if (typeof message === 'string') {
      messageObject = {
        type: 'text',
        text: message
      };
    } else {
      messageObject = {
        type: 'flex',
        altText: message.altText || options.altText || 'NexusTrade 通知',
        contents: message
      };
    }

    // 如果有 quickReply 選項，加入訊息物件
    if (options.quickReply) {
      messageObject.quickReply = options.quickReply;
    }

    const payload = {
      to: userIds,
      messages: [messageObject]
    };

    const response = await this.httpClient.post('/message/multicast', payload);

    return {
      success: true,
      userCount: userIds.length,
      messageType: messageObject.type,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 驗證 Webhook 簽名
   * @param {string} body - 請求 body
   * @param {string} signature - LINE 簽名
   * @returns {boolean} 驗證結果
   */
  validateSignature(body, signature) {
    if (!this.channelSecret) {
      console.warn('[LINE Messaging] Channel Secret 未設定，無法驗證簽名');
      return false;
    }

    try {
      const hash = crypto
        .createHmac('SHA256', this.channelSecret)
        .update(body)
        .digest('base64');
      
      return hash === signature;
    } catch (error) {
      console.error('[LINE Messaging] 簽名驗證錯誤:', error);
      return false;
    }
  }

  /**
   * 取得服務狀態
   * @returns {Object} 服務狀態
   */
  getStatus() {
    return {
      isConfigured: this.isConfigured,
      apiUrl: this.apiUrl,
      hasAccessToken: !!this.channelAccessToken,
      hasChannelSecret: !!this.channelSecret,
      lastCheck: new Date().toISOString()
    };
  }

  /**
   * 測試連線
   * @returns {Promise<Object>} 測試結果
   */
  async testConnection() {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'LINE Messaging API 未設定'
      };
    }

    try {
      // 使用 quota API 測試連線
      const response = await this.httpClient.get('/message/quota');
      
      return {
        success: true,
        quota: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 私有輔助方法

  /**
   * 遮罩使用者 ID（保護隱私）
   * @private
   * @param {string} userId - 使用者 ID
   * @returns {string} 遮罩後的 ID
   */
  _maskUserId(userId) {
    if (!userId || userId.length < 8) return 'unknown';
    return userId.substr(0, 4) + '***' + userId.substr(-4);
  }

  /**
   * 建立批次陣列
   * @private
   * @param {Array} array - 原陣列
   * @param {number} batchSize - 批次大小
   * @returns {Array[]} 批次陣列
   */
  _createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 延遲函數
   * @private
   * @param {number} ms - 延遲毫秒數
   * @returns {Promise} 延遲 Promise
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = LineCoreMessenger;