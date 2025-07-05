/**
 * LINE Messaging 輸入驗證模組
 * 
 * 負責驗證所有輸入參數的正確性和安全性
 * 確保傳送到 LINE API 的資料符合規範
 * 
 * @author NexusTrade 開發團隊
 * @version 1.0.0
 */

class LineMessagingValidator {
  constructor() {
    // LINE 使用者 ID 格式正則表達式
    this.userIdPattern = /^[a-zA-Z0-9_-]+$/;
    
    // 訊息長度限制
    this.limits = {
      textMessage: 5000,        // 文字訊息最大長度
      altText: 400,             // Alt Text 最大長度
      maxUsers: 500,            // 批量發送最大使用者數
      templateName: 50          // 模板名稱最大長度
    };
    
    // 支援的訊息類型
    this.supportedMessageTypes = ['text', 'flex'];
  }

  /**
   * 驗證單一訊息發送輸入
   * @param {string} userId - LINE 使用者 ID
   * @param {string|Object} message - 訊息內容
   * @param {Object} options - 傳送選項
   */
  validateSendInput(userId, message, options = {}) {
    // 驗證使用者 ID
    this._validateUserId(userId);
    
    // 驗證訊息內容
    this._validateMessage(message);
    
    // 驗證選項
    this._validateOptions(options);
  }

  /**
   * 驗證批量發送輸入
   * @param {string[]} userIds - LINE 使用者 ID 列表
   * @param {string|Object} message - 訊息內容
   * @param {Object} options - 傳送選項
   */
  validateBatchInput(userIds, message, options = {}) {
    // 驗證使用者 ID 陣列
    this._validateUserIds(userIds);
    
    // 驗證訊息內容
    this._validateMessage(message);
    
    // 驗證批量選項
    this._validateBatchOptions(options);
  }

  /**
   * 驗證模板輸入
   * @param {string} userId - LINE 使用者 ID
   * @param {string} templateName - 模板名稱
   * @param {Object} templateData - 模板數據
   * @param {Object} options - 傳送選項
   */
  validateTemplateInput(userId, templateName, templateData = {}, options = {}) {
    // 驗證使用者 ID
    this._validateUserId(userId);
    
    // 驗證模板名稱
    this._validateTemplateName(templateName);
    
    // 驗證模板數據
    this._validateTemplateData(templateData);
    
    // 驗證選項
    this._validateOptions(options);
  }

  /**
   * 驗證 Webhook 簽名輸入
   * @param {string} body - 請求 body
   * @param {string} signature - LINE 簽名
   */
  validateWebhookInput(body, signature) {
    if (typeof body !== 'string') {
      throw new Error('Webhook body 必須是字串');
    }
    
    if (typeof signature !== 'string' || !signature) {
      throw new Error('LINE 簽名不可為空');
    }
    
    if (!signature.startsWith('sha256=')) {
      throw new Error('LINE 簽名格式錯誤');
    }
  }

  // 私有驗證方法

  /**
   * 驗證單一使用者 ID
   * @private
   * @param {string} userId - 使用者 ID
   */
  _validateUserId(userId) {
    if (!userId) {
      throw new Error('使用者 ID 不可為空');
    }
    
    if (typeof userId !== 'string') {
      throw new Error('使用者 ID 必須是字串');
    }
    
    if (userId.length < 10 || userId.length > 100) {
      throw new Error('使用者 ID 長度必須在 10-100 字元之間');
    }
    
    if (!this.userIdPattern.test(userId)) {
      throw new Error('使用者 ID 格式不正確，只能包含英數字、底線和連字號');
    }
  }

  /**
   * 驗證使用者 ID 陣列
   * @private
   * @param {string[]} userIds - 使用者 ID 列表
   */
  _validateUserIds(userIds) {
    if (!Array.isArray(userIds)) {
      throw new Error('使用者 ID 列表必須是陣列');
    }
    
    if (userIds.length === 0) {
      throw new Error('使用者 ID 列表不可為空');
    }
    
    if (userIds.length > this.limits.maxUsers) {
      throw new Error(`使用者數量不可超過 ${this.limits.maxUsers} 個`);
    }
    
    // 檢查每個使用者 ID
    const uniqueUserIds = new Set();
    
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      
      // 驗證個別使用者 ID
      this._validateUserId(userId);
      
      // 檢查重複
      if (uniqueUserIds.has(userId)) {
        throw new Error(`重複的使用者 ID: ${userId}`);
      }
      uniqueUserIds.add(userId);
    }
  }

  /**
   * 驗證訊息內容
   * @private
   * @param {string|Object} message - 訊息內容
   */
  _validateMessage(message) {
    if (!message) {
      throw new Error('訊息內容不可為空');
    }
    
    if (typeof message === 'string') {
      this._validateTextMessage(message);
    } else if (typeof message === 'object') {
      this._validateFlexMessage(message);
    } else {
      throw new Error('訊息內容必須是字串或物件');
    }
  }

  /**
   * 驗證文字訊息
   * @private
   * @param {string} text - 文字內容
   */
  _validateTextMessage(text) {
    if (text.length === 0) {
      throw new Error('文字訊息不可為空');
    }
    
    if (text.length > this.limits.textMessage) {
      throw new Error(`文字訊息長度不可超過 ${this.limits.textMessage} 字元`);
    }
    
    // 檢查是否包含不允許的控制字元
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text)) {
      throw new Error('文字訊息包含不允許的控制字元');
    }
  }

  /**
   * 驗證 Flex Message
   * @private
   * @param {Object} flexContent - Flex Message 內容
   */
  _validateFlexMessage(flexContent) {
    if (!flexContent || typeof flexContent !== 'object') {
      throw new Error('Flex Message 必須是物件');
    }
    
    // 檢查必要的 type 屬性
    if (!flexContent.type) {
      throw new Error('Flex Message 必須包含 type 屬性');
    }
    
    // 驗證支援的 Flex Message 類型
    const supportedFlexTypes = ['bubble', 'carousel'];
    if (!supportedFlexTypes.includes(flexContent.type)) {
      throw new Error(`不支援的 Flex Message 類型: ${flexContent.type}`);
    }
    
    // 驗證 altText
    if (flexContent.altText) {
      if (typeof flexContent.altText !== 'string') {
        throw new Error('Flex Message altText 必須是字串');
      }
      
      if (flexContent.altText.length > this.limits.altText) {
        throw new Error(`Flex Message altText 長度不可超過 ${this.limits.altText} 字元`);
      }
    }
    
    // 基本的 JSON 結構驗證
    try {
      JSON.stringify(flexContent);
    } catch (error) {
      throw new Error('Flex Message 結構無法序列化');
    }
  }

  /**
   * 驗證傳送選項
   * @private
   * @param {Object} options - 選項
   */
  _validateOptions(options) {
    if (typeof options !== 'object') {
      throw new Error('選項必須是物件');
    }
    
    // 驗證 altText 選項
    if (options.altText !== undefined) {
      if (typeof options.altText !== 'string') {
        throw new Error('altText 選項必須是字串');
      }
      
      if (options.altText.length > this.limits.altText) {
        throw new Error(`altText 長度不可超過 ${this.limits.altText} 字元`);
      }
    }
    
    // 驗證 quickReply 選項
    if (options.quickReply !== undefined) {
      this._validateQuickReply(options.quickReply);
    }
  }

  /**
   * 驗證批量選項
   * @private
   * @param {Object} options - 批量選項
   */
  _validateBatchOptions(options) {
    this._validateOptions(options);
    
    // 驗證批次大小
    if (options.batchSize !== undefined) {
      if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > this.limits.maxUsers) {
        throw new Error(`批次大小必須是 1-${this.limits.maxUsers} 之間的整數`);
      }
    }
    
    // 驗證批次延遲
    if (options.batchDelay !== undefined && options.batchDelay !== false) {
      if (!Number.isInteger(options.batchDelay) || options.batchDelay < 0) {
        throw new Error('批次延遲必須是非負整數（毫秒）');
      }
    }
  }

  /**
   * 驗證模板名稱
   * @private
   * @param {string} templateName - 模板名稱
   */
  _validateTemplateName(templateName) {
    if (!templateName) {
      throw new Error('模板名稱不可為空');
    }
    
    if (typeof templateName !== 'string') {
      throw new Error('模板名稱必須是字串');
    }
    
    if (templateName.length > this.limits.templateName) {
      throw new Error(`模板名稱長度不可超過 ${this.limits.templateName} 字元`);
    }
    
    // 檢查模板名稱格式
    if (!/^[a-zA-Z0-9_-]+$/.test(templateName)) {
      throw new Error('模板名稱只能包含英數字、底線和連字號');
    }
  }

  /**
   * 驗證模板數據
   * @private
   * @param {Object} templateData - 模板數據
   */
  _validateTemplateData(templateData) {
    if (typeof templateData !== 'object' || templateData === null) {
      throw new Error('模板數據必須是物件');
    }
    
    // 檢查是否可以序列化
    try {
      JSON.stringify(templateData);
    } catch (error) {
      throw new Error('模板數據無法序列化');
    }
  }

  /**
   * 驗證 Quick Reply
   * @private
   * @param {Object} quickReply - Quick Reply 物件
   */
  _validateQuickReply(quickReply) {
    if (typeof quickReply !== 'object' || quickReply === null) {
      throw new Error('Quick Reply 必須是物件');
    }
    
    if (!Array.isArray(quickReply.items)) {
      throw new Error('Quick Reply 必須包含 items 陣列');
    }
    
    if (quickReply.items.length === 0 || quickReply.items.length > 13) {
      throw new Error('Quick Reply items 數量必須在 1-13 之間');
    }
    
    // 驗證每個 Quick Reply item
    for (const item of quickReply.items) {
      if (!item.type || !item.action) {
        throw new Error('每個 Quick Reply item 必須包含 type 和 action');
      }
    }
  }
}

module.exports = new LineMessagingValidator();