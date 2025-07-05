/**
 * LINE Webhook 簽名驗證中介軟體
 * 
 * 功能：
 * 1. 驗證來自 LINE Platform 的 Webhook 請求簽名
 * 2. 防止偽造的 Webhook 請求
 * 3. 保存原始請求內容供後續處理
 * 
 * 參考：https://developers.line.biz/en/docs/messaging-api/receiving-messages/#verifying-signatures
 */

const crypto = require('crypto');
const logger = require('../utils/logger');
const { ApiErrorFactory } = require('../utils/ApiError');

/**
 * LINE Webhook 簽名驗證中介軟體
 * @param {Object} req - Express 請求物件
 * @param {Object} res - Express 回應物件  
 * @param {Function} next - 下一個中介軟體
 */
function lineSignatureMiddleware(req, res, next) {
  try {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    
    // 檢查必要設定
    if (!channelSecret) {
      logger.error('LINE_CHANNEL_SECRET 環境變數未設定');
      return res.status(500).json({
        success: false,
        error: 'LINE 服務設定錯誤'
      });
    }

    // 取得簽名 header
    const signature = req.get('X-Line-Signature');
    if (!signature) {
      logger.warn('LINE Webhook 請求缺少簽名 header', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        success: false,
        error: 'Missing signature header'
      });
    }

    // 取得原始請求內容
    let body = '';
    
    // 如果 body 已經被解析，嘗試重新序列化
    if (req.body && typeof req.body === 'object') {
      body = JSON.stringify(req.body);
    } else if (req.rawBody) {
      // 如果有原始 body，使用它
      body = req.rawBody;
    } else if (req.body && typeof req.body === 'string') {
      body = req.body;
    } else {
      logger.error('無法取得請求原始內容進行簽名驗證');
      return res.status(400).json({
        success: false,
        error: 'Invalid request body'
      });
    }

    // 計算預期的簽名
    const expectedSignature = crypto
      .createHmac('SHA256', channelSecret)
      .update(body, 'utf8')
      .digest('base64');

    // 驗證簽名
    if (signature !== expectedSignature) {
      logger.warn('LINE Webhook 簽名驗證失敗', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        receivedSignature: signature.substring(0, 10) + '...',
        expectedSignature: expectedSignature.substring(0, 10) + '...'
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    // 簽名驗證成功
    logger.info('LINE Webhook 簽名驗證成功', {
      ip: req.ip,
      eventsCount: req.body?.events?.length || 0
    });

    // 儲存原始內容供後續使用
    req.lineRawBody = body;
    req.lineSignatureVerified = true;

    next();
    
  } catch (error) {
    logger.error('LINE Webhook 簽名驗證中介軟體錯誤:', {
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      success: false,
      error: 'Signature verification failed'
    });
  }
}

/**
 * 原始 body 保存中介軟體
 * 必須在 JSON body parser 之前使用
 */
function preserveRawBody(req, res, next) {
  let data = '';
  
  req.on('data', chunk => {
    data += chunk;
  });
  
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
}

/**
 * LINE Webhook 專用的 body parser 中介軟體
 * 同時保存原始內容和解析 JSON
 */
function lineWebhookBodyParser(req, res, next) {
  // 只處理 LINE webhook 路由
  if (!req.path.includes('/webhook') && !req.path.includes('/line')) {
    return next();
  }

  let rawBody = '';
  
  req.on('data', chunk => {
    rawBody += chunk.toString('utf8');
  });
  
  req.on('end', () => {
    try {
      // 保存原始內容
      req.rawBody = rawBody;
      
      // 解析 JSON
      if (rawBody) {
        req.body = JSON.parse(rawBody);
      } else {
        req.body = {};
      }
      
      next();
    } catch (error) {
      logger.error('LINE Webhook body 解析失敗:', {
        error: error.message,
        rawBody: rawBody.substring(0, 100) + '...'
      });
      
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON body'
      });
    }
  });
}

/**
 * 驗證 LINE Webhook 事件格式
 */
function validateLineWebhookEvents(req, res, next) {
  try {
    const { events } = req.body;
    
    // 檢查 events 陣列
    if (!Array.isArray(events)) {
      logger.warn('LINE Webhook 請求格式錯誤：缺少 events 陣列', {
        body: req.body
      });
      
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook format: missing events array'
      });
    }

    // 檢查事件數量限制
    if (events.length > 100) {
      logger.warn('LINE Webhook 事件數量過多', {
        eventsCount: events.length
      });
      
      return res.status(400).json({
        success: false,
        error: 'Too many events in single request'
      });
    }

    // 驗證每個事件的基本格式
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      if (!event.type || !event.timestamp || !event.source) {
        logger.warn(`LINE Webhook 事件 ${i} 格式錯誤`, {
          event
        });
        
        return res.status(400).json({
          success: false,
          error: `Invalid event format at index ${i}`
        });
      }
    }

    logger.info('LINE Webhook 事件格式驗證成功', {
      eventsCount: events.length,
      eventTypes: events.map(e => e.type)
    });

    next();
    
  } catch (error) {
    logger.error('LINE Webhook 事件驗證錯誤:', {
      error: error.message,
      body: req.body
    });
    
    return res.status(500).json({
      success: false,
      error: 'Event validation failed'
    });
  }
}

/**
 * LINE Webhook 錯誤處理中介軟體
 */
function lineWebhookErrorHandler(error, req, res, next) {
  logger.error('LINE Webhook 處理錯誤:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // 如果回應已經發送，傳遞給預設錯誤處理器
  if (res.headersSent) {
    return next(error);
  }

  // 根據錯誤類型返回適當的回應
  if (error.name === 'SyntaxError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format'
    });
  }

  if (error.code === 'ECONNREFUSED') {
    return res.status(502).json({
      success: false,
      error: 'Service temporarily unavailable'
    });
  }

  // 預設錯誤回應
  return res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
}

/**
 * 建立完整的 LINE Webhook 中介軟體鏈
 * @param {Object} options - 設定選項
 * @returns {Array} 中介軟體陣列
 */
function createLineWebhookMiddleware(options = {}) {
  const {
    enableSignatureValidation = true,
    enableEventValidation = true,
    enableErrorHandling = true
  } = options;

  const middlewares = [];

  // 1. 原始 body 保存和 JSON 解析
  middlewares.push(lineWebhookBodyParser);

  // 2. 簽名驗證（如果啟用）
  if (enableSignatureValidation) {
    middlewares.push(lineSignatureMiddleware);
  }

  // 3. 事件格式驗證（如果啟用）
  if (enableEventValidation) {
    middlewares.push(validateLineWebhookEvents);
  }

  // 4. 錯誤處理（如果啟用）
  if (enableErrorHandling) {
    middlewares.push(lineWebhookErrorHandler);
  }

  return middlewares;
}

module.exports = {
  lineSignatureMiddleware,
  preserveRawBody,
  lineWebhookBodyParser,
  validateLineWebhookEvents,
  lineWebhookErrorHandler,
  createLineWebhookMiddleware
};