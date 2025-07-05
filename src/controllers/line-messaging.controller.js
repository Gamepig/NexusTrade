/**
 * LINE Messaging API 控制器
 * 
 * 提供 RESTful API 端點來使用 LINE Messaging 模組
 * 處理 HTTP 請求並呼叫相應的服務方法
 * 
 * @author NexusTrade 開發團隊
 * @version 1.0.0
 */

const lineMessagingModule = require('../services/line-messaging');

class LineMessagingController {
  /**
   * 發送單一訊息
   * POST /api/line-messaging/send
   */
  async sendMessage(req, res) {
    try {
      const { userId, message, messageType, options = {} } = req.body;

      // 基本驗證
      if (!userId || !message) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: '使用者 ID 和訊息內容為必填欄位'
          }
        });
      }

      // 呼叫 LINE Messaging 模組
      const result = await lineMessagingModule.sendMessage(userId, message, options);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result,
          message: '訊息發送成功'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      console.error('[LINE Messaging Controller] 發送訊息錯誤:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '伺服器內部錯誤',
          details: error.message
        }
      });
    }
  }

  /**
   * 批量發送訊息
   * POST /api/line-messaging/batch
   */
  async sendBatchMessage(req, res) {
    try {
      const { userIds, message, messageType, options = {} } = req.body;

      // 基本驗證
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_USER_IDS',
            message: '使用者 ID 列表必須是非空陣列'
          }
        });
      }

      if (!message) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_MESSAGE',
            message: '訊息內容為必填欄位'
          }
        });
      }

      // 呼叫 LINE Messaging 模組
      const result = await lineMessagingModule.sendBatchMessage(userIds, message, options);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result,
          message: '批量訊息發送完成'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      console.error('[LINE Messaging Controller] 批量發送訊息錯誤:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '伺服器內部錯誤',
          details: error.message
        }
      });
    }
  }

  /**
   * 使用模板發送訊息
   * POST /api/line-messaging/template
   */
  async sendTemplateMessage(req, res) {
    try {
      const { userId, templateName, templateData = {}, options = {} } = req.body;

      // 基本驗證
      if (!userId || !templateName) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: '使用者 ID 和模板名稱為必填欄位'
          }
        });
      }

      // 呼叫 LINE Messaging 模組
      const result = await lineMessagingModule.sendTemplateMessage(
        userId, 
        templateName, 
        templateData, 
        options
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result,
          message: '模板訊息發送成功'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      console.error('[LINE Messaging Controller] 模板訊息發送錯誤:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '伺服器內部錯誤',
          details: error.message
        }
      });
    }
  }

  /**
   * 取得服務狀態
   * GET /api/line-messaging/status
   */
  async getStatus(req, res) {
    try {
      const status = lineMessagingModule.getStatus();
      
      res.status(200).json({
        success: true,
        data: status.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[LINE Messaging Controller] 取得狀態錯誤:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '無法取得服務狀態',
          details: error.message
        }
      });
    }
  }

  /**
   * 取得可用模板列表
   * GET /api/line-messaging/templates
   */
  async getTemplates(req, res) {
    try {
      const templates = lineMessagingModule.getAvailableTemplates();
      
      res.status(200).json({
        success: true,
        data: templates.data,
        message: '模板列表取得成功'
      });

    } catch (error) {
      console.error('[LINE Messaging Controller] 取得模板列表錯誤:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '無法取得模板列表',
          details: error.message
        }
      });
    }
  }

  /**
   * 驗證 Webhook 簽名
   * POST /api/line-messaging/webhook/verify
   */
  async verifyWebhookSignature(req, res) {
    try {
      const { body, signature } = req.body;

      if (!body || !signature) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'body 和 signature 為必填欄位'
          }
        });
      }

      const isValid = lineMessagingModule.validateWebhookSignature(body, signature);

      res.status(200).json({
        success: true,
        data: {
          isValid,
          timestamp: new Date().toISOString()
        },
        message: isValid ? '簽名驗證成功' : '簽名驗證失敗'
      });

    } catch (error) {
      console.error('[LINE Messaging Controller] Webhook 簽名驗證錯誤:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '簽名驗證過程發生錯誤',
          details: error.message
        }
      });
    }
  }

  /**
   * 測試連線
   * GET /api/line-messaging/test
   */
  async testConnection(req, res) {
    try {
      // 嘗試取得服務狀態來測試基本功能
      const status = lineMessagingModule.getStatus();
      
      if (!status.data.isConfigured) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_NOT_CONFIGURED',
            message: 'LINE Messaging 服務未正確設定'
          }
        });
      }

      // 如果有測試使用者 ID，可以發送測試訊息
      const testUserId = req.query.testUserId;
      let testResult = null;

      if (testUserId) {
        testResult = await lineMessagingModule.sendMessage(
          testUserId,
          '這是一則測試訊息，用來驗證 LINE Messaging 服務是否正常運作。',
          { source: 'connection_test' }
        );
      }

      res.status(200).json({
        success: true,
        data: {
          serviceStatus: status.data,
          testMessage: testResult,
          timestamp: new Date().toISOString()
        },
        message: '連線測試完成'
      });

    } catch (error) {
      console.error('[LINE Messaging Controller] 連線測試錯誤:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CONNECTION_TEST_FAILED',
          message: '連線測試失敗',
          details: error.message
        }
      });
    }
  }

  /**
   * 快速發送價格警報
   * POST /api/line-messaging/quick/price-alert
   */
  async quickPriceAlert(req, res) {
    try {
      const { userId, alertData } = req.body;

      if (!userId || !alertData) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: '使用者 ID 和警報數據為必填欄位'
          }
        });
      }

      // 使用價格警報模板
      const result = await lineMessagingModule.sendTemplateMessage(
        userId,
        'priceAlert',
        alertData
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result,
          message: '價格警報發送成功'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      console.error('[LINE Messaging Controller] 快速價格警報錯誤:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '價格警報發送失敗',
          details: error.message
        }
      });
    }
  }

  /**
   * 快速發送市場更新
   * POST /api/line-messaging/quick/market-update
   */
  async quickMarketUpdate(req, res) {
    try {
      const { userIds, marketData } = req.body;

      if (!userIds || !Array.isArray(userIds) || !marketData) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: '使用者 ID 列表和市場數據為必填欄位'
          }
        });
      }

      // 使用市場更新模板進行批量發送
      const results = [];
      const errors = [];

      for (const userId of userIds) {
        try {
          const result = await lineMessagingModule.sendTemplateMessage(
            userId,
            'marketUpdate',
            marketData
          );
          
          if (result.success) {
            results.push({ userId, success: true });
          } else {
            errors.push({ userId, error: result.error });
          }
        } catch (error) {
          errors.push({ userId, error: error.message });
        }
      }

      res.status(200).json({
        success: errors.length === 0,
        data: {
          totalUsers: userIds.length,
          successful: results.length,
          failed: errors.length,
          results,
          errors
        },
        message: `市場更新發送完成 (成功: ${results.length}, 失敗: ${errors.length})`
      });

    } catch (error) {
      console.error('[LINE Messaging Controller] 快速市場更新錯誤:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '市場更新發送失敗',
          details: error.message
        }
      });
    }
  }
}

module.exports = new LineMessagingController();