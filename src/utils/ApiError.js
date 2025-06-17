/**
 * NexusTrade 自訂 API 錯誤類別
 * 
 * 提供結構化的錯誤處理，包含狀態碼、錯誤代碼和詳細訊息
 */

class ApiError extends Error {
  /**
   * 建立 API 錯誤實例
   * @param {string} message - 錯誤訊息
   * @param {number} statusCode - HTTP 狀態碼
   * @param {string|null} code - 應用程式錯誤代碼
   * @param {Object} details - 額外的錯誤詳情
   * @param {boolean} isOperational - 是否為操作性錯誤
   */
  constructor(
    message,
    statusCode = 500,
    code = null,
    details = {},
    isOperational = true
  ) {
    super(message);
    
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    // 確保堆疊追蹤正確
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 轉換為 JSON 格式
   */
  toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        statusCode: this.statusCode,
        code: this.code,
        details: this.details,
        timestamp: this.timestamp,
        ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
      }
    };
  }
}

/**
 * 常用錯誤建立工具
 */
class ApiErrorFactory {
  /**
   * 400 - 錯誤請求
   */
  static badRequest(message = '錯誤的請求', code = 'BAD_REQUEST', details = {}) {
    return new ApiError(message, 400, code, details);
  }

  /**
   * 401 - 未授權
   */
  static unauthorized(message = '未授權訪問', code = 'UNAUTHORIZED', details = {}) {
    return new ApiError(message, 401, code, details);
  }

  /**
   * 403 - 禁止訪問
   */
  static forbidden(message = '禁止訪問', code = 'FORBIDDEN', details = {}) {
    return new ApiError(message, 403, code, details);
  }

  /**
   * 404 - 資源未找到
   */
  static notFound(message = '資源未找到', code = 'NOT_FOUND', details = {}) {
    return new ApiError(message, 404, code, details);
  }

  /**
   * 409 - 衝突
   */
  static conflict(message = '資源衝突', code = 'CONFLICT', details = {}) {
    return new ApiError(message, 409, code, details);
  }

  /**
   * 422 - 無法處理的實體
   */
  static unprocessableEntity(message = '數據驗證失敗', code = 'VALIDATION_ERROR', details = {}) {
    return new ApiError(message, 422, code, details);
  }

  /**
   * 429 - 請求過多
   */
  static tooManyRequests(message = '請求過於頻繁', code = 'RATE_LIMIT_EXCEEDED', details = {}) {
    return new ApiError(message, 429, code, details);
  }

  /**
   * 500 - 內部伺服器錯誤
   */
  static internal(message = '內部伺服器錯誤', code = 'INTERNAL_ERROR', details = {}) {
    return new ApiError(message, 500, code, details);
  }

  /**
   * 502 - 錯誤閘道
   */
  static badGateway(message = '外部服務錯誤', code = 'BAD_GATEWAY', details = {}) {
    return new ApiError(message, 502, code, details);
  }

  /**
   * 503 - 服務不可用
   */
  static serviceUnavailable(message = '服務暫時不可用', code = 'SERVICE_UNAVAILABLE', details = {}) {
    return new ApiError(message, 503, code, details);
  }
}

/**
 * 業務邏輯特定錯誤
 */
class BusinessErrorFactory extends ApiErrorFactory {
  /**
   * 使用者相關錯誤
   */
  static userNotFound(userId) {
    return ApiErrorFactory.notFound('使用者不存在', 'USER_NOT_FOUND', { userId });
  }

  static emailAlreadyExists(email) {
    return ApiErrorFactory.conflict('電子郵件已存在', 'EMAIL_EXISTS', { email });
  }

  static invalidCredentials() {
    return ApiErrorFactory.unauthorized('登入憑證無效', 'INVALID_CREDENTIALS');
  }

  static accountDisabled() {
    return ApiErrorFactory.forbidden('帳戶已被停用', 'ACCOUNT_DISABLED');
  }

  static userAlreadyExists(email) {
    return ApiErrorFactory.conflict('使用者已存在', 'USER_ALREADY_EXISTS', { email });
  }

  static usernameAlreadyExists(username) {
    return ApiErrorFactory.conflict('使用者名稱已存在', 'USERNAME_EXISTS', { username });
  }

  /**
   * 通知規則相關錯誤
   */
  static notificationRuleNotFound(ruleId) {
    return ApiErrorFactory.notFound('通知規則不存在', 'RULE_NOT_FOUND', { ruleId });
  }

  static maxNotificationRulesReached(maxRules) {
    return ApiErrorFactory.unprocessableEntity(
      `通知規則數量已達上限 (${maxRules})`,
      'MAX_RULES_REACHED',
      { maxRules }
    );
  }

  /**
   * 市場數據相關錯誤
   */
  static invalidSymbol(symbol) {
    return ApiErrorFactory.badRequest('無效的交易對符號', 'INVALID_SYMBOL', { symbol });
  }

  static marketDataUnavailable() {
    return ApiErrorFactory.serviceUnavailable(
      '市場數據服務暫時不可用',
      'MARKET_DATA_UNAVAILABLE'
    );
  }

  /**
   * 第三方服務錯誤
   */
  static binanceApiError(error) {
    return ApiErrorFactory.badGateway(
      'Binance API 錯誤',
      'BINANCE_API_ERROR',
      { originalError: error.message }
    );
  }

  static lineApiError(error) {
    return ApiErrorFactory.badGateway(
      'LINE API 錯誤',
      'LINE_API_ERROR',
      { originalError: error.message }
    );
  }

  static openRouterApiError(error) {
    return ApiErrorFactory.badGateway(
      'OpenRouter API 錯誤',
      'OPENROUTER_API_ERROR',
      { originalError: error.message }
    );
  }
}

/**
 * 驗證錯誤處理
 */
class ValidationErrorFactory {
  /**
   * 從 Mongoose 驗證錯誤建立 ApiError
   */
  static fromMongooseError(error) {
    const details = {};
    
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        details[key] = error.errors[key].message;
      });
    }

    return ApiErrorFactory.unprocessableEntity(
      '數據驗證失敗',
      'MONGOOSE_VALIDATION_ERROR',
      details
    );
  }

  /**
   * 從 Joi 驗證錯誤建立 ApiError
   */
  static fromJoiError(error) {
    const details = {};
    
    if (error.details) {
      error.details.forEach(detail => {
        const key = detail.path.join('.');
        details[key] = detail.message;
      });
    }

    return ApiErrorFactory.unprocessableEntity(
      '輸入驗證失敗',
      'JOI_VALIDATION_ERROR',
      details
    );
  }

  /**
   * 缺少必填欄位錯誤
   */
  static missingRequiredFields(fields) {
    return ApiErrorFactory.badRequest(
      `缺少必填欄位: ${fields.join(', ')}`,
      'MISSING_REQUIRED_FIELDS',
      { missingFields: fields }
    );
  }

  /**
   * 無效輸入錯誤
   */
  static invalidInput(message, field = null) {
    return ApiErrorFactory.badRequest(
      message,
      'INVALID_INPUT',
      field ? { field } : {}
    );
  }
}

module.exports = {
  ApiError,
  ApiErrorFactory,
  BusinessErrorFactory,
  ValidationErrorFactory
};