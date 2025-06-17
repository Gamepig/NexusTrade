/**
 * NexusTrade 日誌系統
 * 
 * 使用 Winston 建立結構化日誌系統
 * 支援不同環境的日誌級別和輸出格式
 */

const winston = require('winston');
const path = require('path');

// 日誌級別定義
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

/**
 * 自訂日誌格式
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // 添加錯誤堆疊
    if (stack) {
      log += `\n${stack}`;
    }
    
    // 添加額外的 metadata
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

/**
 * 生產環境日誌格式 (JSON)
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * 建立 logger 實例
 */
const createLogger = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
  
  // 基本輸出器配置
  const transports = [
    // 控制台輸出
    new winston.transports.Console({
      level: logLevel,
      format: isProduction ? productionFormat : logFormat
    })
  ];

  // 生產環境檔案輸出
  if (isProduction) {
    // 錯誤日誌檔案
    transports.push(
      new winston.transports.File({
        filename: path.join(__dirname, '../../logs/error.log'),
        level: 'error',
        format: productionFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    );

    // 綜合日誌檔案
    transports.push(
      new winston.transports.File({
        filename: path.join(__dirname, '../../logs/combined.log'),
        format: productionFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    );
  }

  return winston.createLogger({
    levels: LOG_LEVELS,
    level: logLevel,
    format: isProduction ? productionFormat : logFormat,
    transports,
    // 異常處理
    exceptionHandlers: [
      new winston.transports.Console({
        format: isProduction ? productionFormat : logFormat
      })
    ],
    rejectionHandlers: [
      new winston.transports.Console({
        format: isProduction ? productionFormat : logFormat
      })
    ]
  });
};

// 建立 logger 實例
const logger = createLogger();

/**
 * 建立日誌目錄 (如果不存在)
 */
const ensureLogDirectory = () => {
  const fs = require('fs');
  const logDir = path.join(__dirname, '../../logs');
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    logger.info('日誌目錄已建立:', logDir);
  }
};

// 初始化日誌目錄
ensureLogDirectory();

/**
 * 輔助函數：記錄 API 請求
 */
logger.logApiRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id || 'anonymous'
  };

  if (res.statusCode >= 400) {
    logger.warn('API請求失敗', logData);
  } else {
    logger.info('API請求成功', logData);
  }
};

/**
 * 輔助函數：記錄資料庫操作
 */
logger.logDbOperation = (operation, collection, query, result) => {
  const logData = {
    operation,
    collection,
    query: typeof query === 'object' ? JSON.stringify(query) : query,
    success: !!result,
    resultCount: Array.isArray(result) ? result.length : (result ? 1 : 0)
  };

  logger.debug('資料庫操作', logData);
};

/**
 * 輔助函數：記錄業務邏輯錯誤
 */
logger.logBusinessError = (operation, error, context = {}) => {
  logger.error(`業務邏輯錯誤 - ${operation}`, {
    error: error.message,
    stack: error.stack,
    context
  });
};

/**
 * 輔助函數：記錄使用者行為
 */
logger.logUserAction = (userId, action, details = {}) => {
  logger.info('使用者行為', {
    userId,
    action,
    timestamp: new Date().toISOString(),
    ...details
  });
};

/**
 * 輔助函數：記錄系統事件
 */
logger.logSystemEvent = (event, details = {}) => {
  logger.info('系統事件', {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

module.exports = logger;