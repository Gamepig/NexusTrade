/**
 * NexusTrade 統一錯誤處理中介軟體
 * 
 * 處理所有類型的錯誤：API錯誤、驗證錯誤、系統錯誤等
 * 提供統一的錯誤回應格式
 */

const { ApiError, ValidationErrorFactory } = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * 處理 Mongoose 錯誤
 */
const handleMongooseError = (error) => {
  if (error.name === 'ValidationError') {
    return ValidationErrorFactory.fromMongooseError(error);
  }
  
  if (error.name === 'CastError') {
    return new ApiError(
      '無效的資源 ID',
      400,
      'INVALID_OBJECT_ID',
      { field: error.path, value: error.value }
    );
  }
  
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return new ApiError(
      `${field} 已存在`,
      409,
      'DUPLICATE_KEY_ERROR',
      { field, value: error.keyValue[field] }
    );
  }

  return new ApiError('資料庫操作錯誤', 500, 'DATABASE_ERROR');
};

/**
 * 處理 JWT 錯誤
 */
const handleJwtError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new ApiError('無效的 JWT Token', 401, 'INVALID_JWT');
  }
  
  if (error.name === 'TokenExpiredError') {
    return new ApiError('JWT Token 已過期', 401, 'JWT_EXPIRED');
  }
  
  if (error.name === 'NotBeforeError') {
    return new ApiError('JWT Token 尚未生效', 401, 'JWT_NOT_BEFORE');
  }

  return new ApiError('JWT 處理錯誤', 401, 'JWT_ERROR');
};

/**
 * 處理驗證錯誤
 */
const handleValidationError = (error) => {
  // Joi 驗證錯誤
  if (error.isJoi) {
    return ValidationErrorFactory.fromJoiError(error);
  }
  
  // Express-validator 錯誤
  if (error.type === 'validation') {
    return new ApiError(
      '輸入驗證失敗',
      422,
      'EXPRESS_VALIDATION_ERROR',
      { errors: error.errors }
    );
  }

  return new ApiError('驗證錯誤', 422, 'VALIDATION_ERROR');
};

/**
 * 處理系統錯誤
 */
const handleSystemError = (error) => {
  // 檔案系統錯誤
  if (error.code === 'ENOENT') {
    return new ApiError('檔案未找到', 404, 'FILE_NOT_FOUND');
  }
  
  if (error.code === 'EACCES') {
    return new ApiError('檔案權限不足', 403, 'FILE_PERMISSION_DENIED');
  }
  
  // 網路錯誤
  if (error.code === 'ECONNREFUSED') {
    return new ApiError('連接被拒絕', 503, 'CONNECTION_REFUSED');
  }
  
  if (error.code === 'ETIMEDOUT') {
    return new ApiError('連接超時', 504, 'CONNECTION_TIMEOUT');
  }

  return new ApiError('系統錯誤', 500, 'SYSTEM_ERROR');
};

/**
 * 錯誤日誌記錄
 */
const logError = (error, req) => {
  const logData = {
    message: error.message,
    statusCode: error.statusCode || 500,
    code: error.code,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString()
  };

  // 根據錯誤嚴重程度選擇日誌級別
  if (error.statusCode >= 500) {
    logger.error('伺服器錯誤', { ...logData, stack: error.stack });
  } else if (error.statusCode >= 400) {
    logger.warn('客戶端錯誤', logData);
  } else {
    logger.info('一般錯誤', logData);
  }
};

/**
 * 開發環境錯誤回應
 */
const sendErrorDev = (error, req, res) => {
  const response = {
    status: 'error',
    statusCode: error.statusCode || 500,
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    details: error.details || {},
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    stack: error.stack
  };

  res.status(error.statusCode || 500).json(response);
};

/**
 * 生產環境錯誤回應
 */
const sendErrorProd = (error, req, res) => {
  const response = {
    status: 'error',
    statusCode: error.statusCode || 500,
    message: error.isOperational ? error.message : '內部伺服器錯誤',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  };

  // 只在操作性錯誤時包含詳細資訊
  if (error.isOperational && error.details) {
    response.details = error.details;
  }

  res.status(error.statusCode || 500).json(response);
};

/**
 * 主要錯誤處理中介軟體
 */
const errorHandler = (error, req, res, next) => {
  let processedError = error;

  // 如果不是 ApiError，則轉換為 ApiError
  if (!(error instanceof ApiError)) {
    // Mongoose 錯誤
    if (error.name && error.name.includes('Mongo')) {
      processedError = handleMongooseError(error);
    }
    // JWT 錯誤
    else if (error.name && error.name.includes('Token')) {
      processedError = handleJwtError(error);
    }
    // 驗證錯誤
    else if (error.isJoi || error.type === 'validation') {
      processedError = handleValidationError(error);
    }
    // 系統錯誤
    else if (error.code) {
      processedError = handleSystemError(error);
    }
    // 其他未知錯誤
    else {
      processedError = new ApiError(
        process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤',
        500,
        'UNKNOWN_ERROR',
        {},
        false
      );
    }
  }

  // 記錄錯誤
  logError(processedError, req);

  // 發送錯誤回應
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(processedError, req, res);
  } else {
    sendErrorProd(processedError, req, res);
  }
};

/**
 * 非同步錯誤處理包裝器
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 未處理的 Promise 拒絕處理
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('未處理的 Promise 拒絕', {
      reason: reason.message || reason,
      stack: reason.stack,
      promise: promise.toString()
    });
    
    // 優雅關閉伺服器
    process.exit(1);
  });
};

/**
 * 未捕獲的異常處理
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    logger.error('未捕獲的異常', {
      message: error.message,
      stack: error.stack
    });
    
    // 立即關閉程序
    process.exit(1);
  });
};

/**
 * 初始化全域錯誤處理
 */
const initializeGlobalErrorHandling = () => {
  handleUnhandledRejection();
  handleUncaughtException();
};

module.exports = {
  errorHandler,
  asyncErrorHandler,
  initializeGlobalErrorHandling
};