/**
 * LINE Messaging 模組主要入口
 * 
 * 專門負責 LINE 訊息傳送的獨立模組
 * 提供簡潔的 API 介面，接收帳號和訊息內容並處理傳送邏輯
 * 
 * @author NexusTrade 開發團隊
 * @version 1.0.0
 */

const LineCoreMessenger = require('./core/messenger');
const validator = require('./core/validator');
const errorHandler = require('./core/error-handler');
const textTemplates = require('./templates/text-templates');
const flexTemplates = require('./templates/flex-templates');

class LineMessagingModule {
  constructor() {
    this.messenger = new LineCoreMessenger();
    this.validator = validator;
    this.errorHandler = errorHandler;
    this.templates = {
      text: textTemplates,
      flex: flexTemplates
    };
    
    // 模組資訊
    this.moduleInfo = {
      name: 'LINE Messaging Module',
      version: '1.0.0',
      description: '專門負責 LINE 訊息傳送的獨立模組'
    };
  }

  /**
   * 發送單一訊息
   * @param {string} userId - LINE 使用者 ID
   * @param {string|Object} message - 訊息內容（文字或 Flex Message）
   * @param {Object} options - 傳送選項
   * @returns {Promise<Object>} 傳送結果
   */
  async sendMessage(userId, message, options = {}) {
    try {
      // 輸入驗證
      this.validator.validateSendInput(userId, message, options);
      
      // 判斷訊息類型並傳送
      if (typeof message === 'string') {
        return await this.messenger.sendTextMessage(userId, message, options);
      } else {
        return await this.messenger.sendFlexMessage(userId, message, options);
      }
    } catch (error) {
      return this.errorHandler.handleError(error, 'sendMessage');
    }
  }

  /**
   * 批量發送訊息
   * @param {string[]} userIds - LINE 使用者 ID 列表
   * @param {string|Object} message - 訊息內容
   * @param {Object} options - 傳送選項
   * @returns {Promise<Object>} 批量傳送結果
   */
  async sendBatchMessage(userIds, message, options = {}) {
    try {
      // 輸入驗證
      this.validator.validateBatchInput(userIds, message, options);
      
      return await this.messenger.sendBatchMessage(userIds, message, options);
    } catch (error) {
      return this.errorHandler.handleError(error, 'sendBatchMessage');
    }
  }

  /**
   * 使用模板發送訊息
   * @param {string} userId - LINE 使用者 ID
   * @param {string} templateName - 模板名稱
   * @param {Object} templateData - 模板數據
   * @param {Object} options - 傳送選項
   * @returns {Promise<Object>} 傳送結果
   */
  async sendTemplateMessage(userId, templateName, templateData = {}, options = {}) {
    try {
      // 輸入驗證
      this.validator.validateTemplateInput(userId, templateName, templateData, options);
      
      // 根據模板類型生成訊息
      let message;
      if (this.templates.text[templateName]) {
        message = this.templates.text[templateName](templateData);
      } else if (this.templates.flex[templateName]) {
        message = this.templates.flex[templateName](templateData);
      } else {
        throw new Error(`未找到模板: ${templateName}`);
      }
      
      return await this.sendMessage(userId, message, options);
    } catch (error) {
      return this.errorHandler.handleError(error, 'sendTemplateMessage');
    }
  }

  /**
   * 取得模組狀態
   * @returns {Object} 模組狀態資訊
   */
  getStatus() {
    try {
      const messengerStatus = this.messenger.getStatus();
      
      return {
        success: true,
        data: {
          module: this.moduleInfo,
          messenger: messengerStatus,
          isConfigured: messengerStatus.isConfigured,
          availableTemplates: {
            text: Object.keys(this.templates.text),
            flex: Object.keys(this.templates.flex)
          },
          endpoints: {
            send: '/api/line-messaging/send',
            batch: '/api/line-messaging/batch',
            template: '/api/line-messaging/template',
            status: '/api/line-messaging/status'
          }
        }
      };
    } catch (error) {
      return this.errorHandler.handleError(error, 'getStatus');
    }
  }

  /**
   * 取得可用模板列表
   * @returns {Object} 模板列表
   */
  getAvailableTemplates() {
    try {
      return {
        success: true,
        data: {
          text: Object.keys(this.templates.text).map(name => ({
            name,
            description: this.templates.text[name].description || '文字訊息模板',
            type: 'text'
          })),
          flex: Object.keys(this.templates.flex).map(name => ({
            name,
            description: this.templates.flex[name].description || 'Flex Message 模板',
            type: 'flex'
          }))
        }
      };
    } catch (error) {
      return this.errorHandler.handleError(error, 'getAvailableTemplates');
    }
  }

  /**
   * 驗證 LINE Webhook 簽名
   * @param {string} body - 請求 body
   * @param {string} signature - LINE 簽名
   * @returns {boolean} 驗證結果
   */
  validateWebhookSignature(body, signature) {
    try {
      return this.messenger.validateSignature(body, signature);
    } catch (error) {
      return false;
    }
  }
}

module.exports = new LineMessagingModule();