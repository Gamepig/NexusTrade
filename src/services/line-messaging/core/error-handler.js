/**
 * LINE Messaging 錯誤處理模組
 * 
 * 統一處理各種錯誤情況，提供友善的錯誤訊息
 * 記錄詳細的錯誤資訊以便除錯
 * 
 * @author NexusTrade 開發團隊
 * @version 1.0.0
 */

class LineMessagingErrorHandler {
  constructor() {
    // 錯誤類型定義
    this.errorTypes = {
      VALIDATION_ERROR: 'VALIDATION_ERROR',
      API_ERROR: 'API_ERROR',
      NETWORK_ERROR: 'NETWORK_ERROR',
      AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
      RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
      CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
      UNKNOWN_ERROR: 'UNKNOWN_ERROR'
    };
    
    // LINE API 錯誤碼對應
    this.lineApiErrors = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      413: 'REQUEST_ENTITY_TOO_LARGE',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE'
    };
    
    // 友善錯誤訊息
    this.friendlyMessages = {
      VALIDATION_ERROR: '輸入資料格式錯誤',
      API_ERROR: 'LINE API 服務錯誤',
      NETWORK_ERROR: '網路連線問題',
      AUTHENTICATION_ERROR: 'LINE API 認證失敗',
      RATE_LIMIT_ERROR: '訊息發送頻率過高，請稍後再試',
      CONFIGURATION_ERROR: 'LINE API 設定不完整',
      UNKNOWN_ERROR: '發生未知錯誤'
    };
  }

  /**
   * 主要錯誤處理方法
   * @param {Error} error - 錯誤物件
   * @param {string} operation - 執行的操作名稱
   * @returns {Object} 錯誤處理結果
   */
  handleError(error, operation = 'unknown') {
    const errorInfo = this._analyzeError(error);
    const errorResult = this._createErrorResult(errorInfo, operation);
    
    // 記錄錯誤
    this._logError(errorResult, error);
    
    return errorResult;
  }

  /**
   * 分析錯誤類型和詳細資訊
   * @private
   * @param {Error} error - 錯誤物件
   * @returns {Object} 錯誤分析結果
   */
  _analyzeError(error) {
    const analysis = {
      type: this.errorTypes.UNKNOWN_ERROR,
      code: 'UNKNOWN',
      message: error.message || '未知錯誤',
      details: {},
      isRetryable: false,
      suggestedAction: '請聯繫技術支援'
    };

    // 驗證錯誤
    if (this._isValidationError(error)) {
      analysis.type = this.errorTypes.VALIDATION_ERROR;
      analysis.code = 'VALIDATION_FAILED';
      analysis.isRetryable = false;
      analysis.suggestedAction = '請檢查輸入資料格式';
    }
    
    // LINE API 錯誤
    else if (this._isLineApiError(error)) {
      analysis.type = this.errorTypes.API_ERROR;
      analysis.details = this._parseLineApiError(error);
      analysis.code = analysis.details.lineErrorCode || 'API_ERROR';
      analysis.isRetryable = this._isRetryableApiError(analysis.details.statusCode);
      analysis.suggestedAction = this._getApiErrorSuggestion(analysis.details.statusCode);
    }
    
    // 網路錯誤
    else if (this._isNetworkError(error)) {
      analysis.type = this.errorTypes.NETWORK_ERROR;
      analysis.code = 'NETWORK_FAILED';
      analysis.isRetryable = true;
      analysis.suggestedAction = '請檢查網路連線並稍後重試';
    }
    
    // 認證錯誤
    else if (this._isAuthenticationError(error)) {
      analysis.type = this.errorTypes.AUTHENTICATION_ERROR;
      analysis.code = 'AUTH_FAILED';
      analysis.isRetryable = false;
      analysis.suggestedAction = '請檢查 LINE API 憑證設定';
    }
    
    // 設定錯誤
    else if (this._isConfigurationError(error)) {
      analysis.type = this.errorTypes.CONFIGURATION_ERROR;
      analysis.code = 'CONFIG_ERROR';
      analysis.isRetryable = false;
      analysis.suggestedAction = '請檢查 LINE API 環境變數設定';
    }

    return analysis;
  }

  /**
   * 建立錯誤結果物件
   * @private
   * @param {Object} errorInfo - 錯誤分析結果
   * @param {string} operation - 操作名稱
   * @returns {Object} 錯誤結果
   */
  _createErrorResult(errorInfo, operation) {
    return {
      success: false,
      error: {
        type: errorInfo.type,
        code: errorInfo.code,
        message: errorInfo.message,
        friendlyMessage: this.friendlyMessages[errorInfo.type] || this.friendlyMessages.UNKNOWN_ERROR,
        operation,
        timestamp: new Date().toISOString(),
        isRetryable: errorInfo.isRetryable,
        suggestedAction: errorInfo.suggestedAction,
        details: errorInfo.details
      }
    };
  }

  /**
   * 記錄錯誤資訊
   * @private
   * @param {Object} errorResult - 錯誤結果
   * @param {Error} originalError - 原始錯誤
   */
  _logError(errorResult, originalError) {
    const logData = {
      operation: errorResult.error.operation,
      type: errorResult.error.type,
      code: errorResult.error.code,
      message: errorResult.error.message,
      timestamp: errorResult.error.timestamp,
      stack: originalError.stack
    };

    // 根據錯誤嚴重程度決定日誌級別
    if (errorResult.error.type === this.errorTypes.VALIDATION_ERROR) {
      console.warn('[LINE Messaging] 驗證錯誤:', logData);
    } else if (errorResult.error.type === this.errorTypes.RATE_LIMIT_ERROR) {
      console.warn('[LINE Messaging] 頻率限制:', logData);
    } else if (errorResult.error.isRetryable) {
      console.warn('[LINE Messaging] 可重試錯誤:', logData);
    } else {
      console.error('[LINE Messaging] 嚴重錯誤:', logData);
    }
  }

  // 錯誤類型判斷方法

  /**
   * 判斷是否為驗證錯誤
   * @private
   * @param {Error} error - 錯誤物件
   * @returns {boolean} 是否為驗證錯誤
   */
  _isValidationError(error) {
    const validationKeywords = [
      '不可為空',
      '必須是',
      '長度',
      '格式錯誤',
      '格式不正確',
      '超過',
      '重複',
      '範圍'
    ];
    
    return validationKeywords.some(keyword => error.message.includes(keyword));
  }

  /**
   * 判斷是否為 LINE API 錯誤
   * @private
   * @param {Error} error - 錯誤物件
   * @returns {boolean} 是否為 LINE API 錯誤
   */
  _isLineApiError(error) {
    return error.response && error.response.status && error.response.data;
  }

  /**
   * 判斷是否為網路錯誤
   * @private
   * @param {Error} error - 錯誤物件
   * @returns {boolean} 是否為網路錯誤
   */
  _isNetworkError(error) {
    return error.code === 'ECONNREFUSED' || 
           error.code === 'ENOTFOUND' || 
           error.code === 'ETIMEDOUT' ||
           error.message.includes('timeout') ||
           error.message.includes('ECONNRESET');
  }

  /**
   * 判斷是否為認證錯誤
   * @private
   * @param {Error} error - 錯誤物件
   * @returns {boolean} 是否為認證錯誤
   */
  _isAuthenticationError(error) {
    return error.message.includes('unauthorized') ||
           error.message.includes('invalid access token') ||
           (error.response && error.response.status === 401);
  }

  /**
   * 判斷是否為設定錯誤
   * @private
   * @param {Error} error - 錯誤物件
   * @returns {boolean} 是否為設定錯誤
   */
  _isConfigurationError(error) {
    return error.message.includes('未設定') ||
           error.message.includes('未完整設定') ||
           error.message.includes('環境變數');
  }

  /**
   * 解析 LINE API 錯誤
   * @private
   * @param {Error} error - 錯誤物件
   * @returns {Object} LINE API 錯誤詳細資訊
   */
  _parseLineApiError(error) {
    const response = error.response;
    const details = {
      statusCode: response.status,
      lineErrorCode: this.lineApiErrors[response.status] || 'UNKNOWN_API_ERROR',
      lineErrorMessage: response.data?.message || '未知 API 錯誤',
      requestId: response.headers?.['x-request-id'] || 'unknown'
    };

    // 解析 LINE 特定錯誤資訊
    if (response.data?.details) {
      details.lineDetails = response.data.details;
    }

    return details;
  }

  /**
   * 判斷 API 錯誤是否可重試
   * @private
   * @param {number} statusCode - HTTP 狀態碼
   * @returns {boolean} 是否可重試
   */
  _isRetryableApiError(statusCode) {
    // 5xx 錯誤和 429 錯誤通常可以重試
    return statusCode >= 500 || statusCode === 429;
  }

  /**
   * 取得 API 錯誤建議
   * @private
   * @param {number} statusCode - HTTP 狀態碼
   * @returns {string} 建議動作
   */
  _getApiErrorSuggestion(statusCode) {
    const suggestions = {
      400: '請檢查請求資料格式',
      401: '請檢查 LINE API Access Token',
      403: '請檢查 API 權限設定',
      404: '請檢查 API 端點路徑',
      409: '請檢查資源衝突問題',
      413: '請減少訊息內容大小',
      429: '請降低請求頻率',
      500: '請稍後重試或聯繫 LINE 技術支援',
      502: '請稍後重試',
      503: '請稍後重試，LINE 服務暫時不可用'
    };

    return suggestions[statusCode] || '請聯繫技術支援';
  }

  /**
   * 建立重試策略
   * @param {number} attempt - 重試次數
   * @param {number} maxAttempts - 最大重試次數
   * @returns {Object} 重試策略
   */
  createRetryStrategy(attempt = 1, maxAttempts = 3) {
    if (attempt > maxAttempts) {
      return {
        shouldRetry: false,
        delay: 0,
        message: '已達最大重試次數'
      };
    }

    // 指數退避算法
    const baseDelay = 1000; // 1 秒
    const delay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 200; // 增加隨機性避免雷群效應

    return {
      shouldRetry: true,
      delay: delay + jitter,
      attempt,
      maxAttempts,
      message: `第 ${attempt} 次重試，延遲 ${Math.round(delay)} 毫秒`
    };
  }

  /**
   * 包裝重試邏輯
   * @param {Function} operation - 要重試的操作
   * @param {Object} retryOptions - 重試選項
   * @returns {Promise} 操作結果
   */
  async withRetry(operation, retryOptions = {}) {
    const maxAttempts = retryOptions.maxAttempts || 3;
    const onRetry = retryOptions.onRetry || (() => {});
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const errorInfo = this._analyzeError(error);
        
        if (!errorInfo.isRetryable || attempt === maxAttempts) {
          throw error;
        }
        
        const retryStrategy = this.createRetryStrategy(attempt, maxAttempts);
        onRetry(retryStrategy, error);
        
        // 等待重試延遲
        await new Promise(resolve => setTimeout(resolve, retryStrategy.delay));
      }
    }
    
    throw lastError;
  }
}

module.exports = new LineMessagingErrorHandler();