/**
 * NexusTrade 關注清單中介軟體
 * 
 * 提供關注清單特有的驗證、權限檢查和業務邏輯處理
 */

const Watchlist = require('../models/Watchlist');
const { ApiErrorFactory, BusinessErrorFactory } = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * 交易對格式驗證和正規化
 */
const normalizeSymbol = (req, res, next) => {
  try {
    let symbol = req.body.symbol || req.params.symbol;
    
    if (!symbol) {
      return next(ApiErrorFactory.unprocessableEntity(
        '交易對代碼為必填欄位',
        'SYMBOL_REQUIRED'
      ));
    }

    // 轉換為大寫並移除空白
    symbol = symbol.toString().toUpperCase().trim();

    // 驗證交易對格式
    const symbolPattern = /^[A-Z0-9]{2,12}(USDT|BTC|ETH|BNB|BUSD|FDUSD)$/;
    if (!symbolPattern.test(symbol)) {
      return next(ApiErrorFactory.unprocessableEntity(
        '交易對格式不正確，支援格式：BTCUSDT, ETHUSDT, DOGEBTC 等',
        'INVALID_SYMBOL_FORMAT',
        { 
          symbol, 
          supportedQuoteAssets: ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD', 'FDUSD'],
          example: 'BTCUSDT'
        }
      ));
    }

    // 解析基礎貨幣和報價貨幣
    const quoteAssets = ['USDT', 'BTC', 'ETH', 'BNB', 'BUSD', 'FDUSD'];
    let baseAsset = '';
    let quoteAsset = '';

    for (const quote of quoteAssets) {
      if (symbol.endsWith(quote)) {
        quoteAsset = quote;
        baseAsset = symbol.substring(0, symbol.length - quote.length);
        break;
      }
    }

    // 驗證基礎貨幣長度
    if (baseAsset.length < 2 || baseAsset.length > 10) {
      return next(ApiErrorFactory.unprocessableEntity(
        '基礎貨幣代碼長度必須在 2-10 個字元之間',
        'INVALID_BASE_ASSET_LENGTH',
        { baseAsset, symbol }
      ));
    }

    // 將正規化後的資料附加到請求
    req.normalizedSymbol = symbol;
    req.baseAsset = baseAsset;
    req.quoteAsset = quoteAsset;
    
    // 更新請求參數
    if (req.body.symbol) req.body.symbol = symbol;
    if (req.params.symbol) req.params.symbol = symbol;

    logger.debug('交易對正規化完成', { 
      original: req.body.symbol || req.params.symbol,
      normalized: symbol,
      baseAsset,
      quoteAsset
    });

    next();
  } catch (error) {
    logger.error('交易對正規化失敗', { error: error.message });
    next(ApiErrorFactory.internalServerError('交易對處理失敗', 'SYMBOL_PROCESSING_ERROR'));
  }
};

/**
 * 檢查關注清單數量限制
 */
const checkWatchlistLimit = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // 僅在新增操作時檢查限制
    if (req.method !== 'POST' || !req.body.symbol) {
      return next();
    }

    // 取得當前關注清單數量
    const currentCount = await Watchlist.findUserWatchlistCount(userId);
    
    const maxLimit = 30; // PRD 規格：最多 30 個項目
    
    if (currentCount >= maxLimit) {
      return next(ApiErrorFactory.unprocessableEntity(
        `關注清單已達上限（${maxLimit} 個），請先移除其他項目`,
        'WATCHLIST_LIMIT_EXCEEDED',
        { 
          currentCount, 
          maxLimit,
          suggestion: '請先移除不需要的項目再新增'
        }
      ));
    }

    // 將當前數量附加到請求，供後續使用
    req.currentWatchlistCount = currentCount;
    
    logger.debug('關注清單數量檢查通過', { 
      userId, 
      currentCount, 
      maxLimit,
      remainingSlots: maxLimit - currentCount
    });

    next();
  } catch (error) {
    logger.error('關注清單數量檢查失敗', { 
      userId: req.user?.id, 
      error: error.message 
    });
    next(ApiErrorFactory.internalServerError('關注清單數量檢查失敗', 'LIMIT_CHECK_ERROR'));
  }
};

/**
 * 檢查重複項目
 */
const checkDuplicate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const symbol = req.normalizedSymbol || req.body.symbol;
    
    // 僅在新增操作時檢查重複
    if (req.method !== 'POST' || !symbol) {
      return next();
    }

    // 檢查是否已存在
    const existingItem = await Watchlist.findUserWatchlistItem(userId, symbol);
    
    if (existingItem) {
      return next(ApiErrorFactory.conflict(
        `${symbol} 已在關注清單中`,
        'DUPLICATE_WATCHLIST_ITEM',
        { 
          symbol,
          existingItem: {
            id: existingItem._id,
            addedAt: existingItem.addedAt,
            displayName: existingItem.displayName
          }
        }
      ));
    }

    logger.debug('重複項目檢查通過', { userId, symbol });
    next();
  } catch (error) {
    logger.error('重複項目檢查失敗', { 
      userId: req.user?.id, 
      symbol: req.body.symbol,
      error: error.message 
    });
    next(ApiErrorFactory.internalServerError('重複項目檢查失敗', 'DUPLICATE_CHECK_ERROR'));
  }
};

/**
 * 驗證關注清單項目是否存在
 */
const validateWatchlistItemExists = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const symbol = req.normalizedSymbol || req.params.symbol;
    
    // 適用於 PUT、DELETE 操作
    if (!['PUT', 'DELETE'].includes(req.method) || !symbol) {
      return next();
    }

    // 查找項目是否存在
    const item = await Watchlist.findUserWatchlistItem(userId, symbol);
    
    if (!item) {
      return next(ApiErrorFactory.notFound(
        `關注清單中找不到 ${symbol}`,
        'WATCHLIST_ITEM_NOT_FOUND',
        { symbol, userId }
      ));
    }

    // 將項目資訊附加到請求，供後續使用
    req.watchlistItem = item;
    
    logger.debug('關注清單項目驗證通過', { 
      userId, 
      symbol,
      itemId: item._id 
    });

    next();
  } catch (error) {
    logger.error('關注清單項目驗證失敗', { 
      userId: req.user?.id, 
      symbol: req.params.symbol,
      error: error.message 
    });
    next(ApiErrorFactory.internalServerError('關注清單項目驗證失敗', 'ITEM_VALIDATION_ERROR'));
  }
};

/**
 * 驗證批量操作
 */
const validateBatchOperations = (req, res, next) => {
  try {
    const { operations } = req.body;
    
    if (!operations || !Array.isArray(operations)) {
      return next(ApiErrorFactory.unprocessableEntity(
        'operations 必須是陣列格式',
        'INVALID_OPERATIONS_FORMAT'
      ));
    }

    if (operations.length === 0) {
      return next(ApiErrorFactory.unprocessableEntity(
        'operations 不能為空',
        'EMPTY_OPERATIONS'
      ));
    }

    if (operations.length > 10) {
      return next(ApiErrorFactory.unprocessableEntity(
        '批量操作最多支援 10 個項目',
        'TOO_MANY_OPERATIONS',
        { maxOperations: 10, provided: operations.length }
      ));
    }

    // 驗證每個操作
    const validActions = ['add', 'remove', 'update'];
    const errors = [];
    
    operations.forEach((operation, index) => {
      if (!operation.action || !validActions.includes(operation.action)) {
        errors.push(`操作 ${index + 1}: action 必須是 ${validActions.join(', ')} 之一`);
      }
      
      if (!operation.symbol) {
        errors.push(`操作 ${index + 1}: symbol 為必填欄位`);
      }
      
      // 驗證 symbol 格式 (簡化版本，詳細驗證在 normalizeSymbol 中處理)
      if (operation.symbol && typeof operation.symbol !== 'string') {
        errors.push(`操作 ${index + 1}: symbol 必須是字串格式`);
      }
    });

    if (errors.length > 0) {
      return next(ApiErrorFactory.unprocessableEntity(
        '批量操作驗證失敗',
        'BATCH_VALIDATION_ERROR',
        { errors }
      ));
    }

    // 檢查重複的 symbol
    const symbols = operations.map(op => op.symbol.toUpperCase());
    const duplicates = symbols.filter((symbol, index) => symbols.indexOf(symbol) !== index);
    
    if (duplicates.length > 0) {
      return next(ApiErrorFactory.unprocessableEntity(
        '批量操作中不能有重複的交易對',
        'DUPLICATE_SYMBOLS_IN_BATCH',
        { duplicates: [...new Set(duplicates)] }
      ));
    }

    logger.debug('批量操作驗證通過', { 
      userId: req.user?.id, 
      operationCount: operations.length,
      actions: operations.map(op => op.action)
    });

    next();
  } catch (error) {
    logger.error('批量操作驗證失敗', { 
      userId: req.user?.id,
      error: error.message 
    });
    next(ApiErrorFactory.internalServerError('批量操作驗證失敗', 'BATCH_VALIDATION_ERROR'));
  }
};

/**
 * 驗證更新資料
 */
const validateUpdateData = (req, res, next) => {
  try {
    const allowedFields = ['displayName', 'priority', 'category', 'notes'];
    const updateData = {};
    let hasValidFields = false;

    // 檢查是否有允許的更新欄位
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
        hasValidFields = true;
      }
    });

    if (!hasValidFields) {
      return next(ApiErrorFactory.unprocessableEntity(
        '必須提供至少一個要更新的欄位',
        'NO_UPDATE_FIELDS',
        { allowedFields }
      ));
    }

    // 驗證 priority 範圍
    if (updateData.priority !== undefined) {
      const priority = Number(updateData.priority);
      if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
        return next(ApiErrorFactory.unprocessableEntity(
          'priority 必須是 1-5 之間的整數',
          'INVALID_PRIORITY_VALUE'
        ));
      }
      updateData.priority = priority;
    }

    // 驗證 category
    if (updateData.category !== undefined) {
      const validCategories = ['default', 'trading', 'longterm', 'watchonly'];
      if (!validCategories.includes(updateData.category)) {
        return next(ApiErrorFactory.unprocessableEntity(
          'category 必須是有效的分類',
          'INVALID_CATEGORY',
          { validCategories }
        ));
      }
    }

    // 驗證字串長度
    if (updateData.displayName && updateData.displayName.length > 50) {
      return next(ApiErrorFactory.unprocessableEntity(
        'displayName 長度不能超過 50 個字元',
        'DISPLAY_NAME_TOO_LONG'
      ));
    }

    if (updateData.notes && updateData.notes.length > 500) {
      return next(ApiErrorFactory.unprocessableEntity(
        'notes 長度不能超過 500 個字元',
        'NOTES_TOO_LONG'
      ));
    }

    // 將驗證後的更新資料附加到請求
    req.updateData = updateData;

    logger.debug('更新資料驗證通過', { 
      userId: req.user?.id,
      updateFields: Object.keys(updateData)
    });

    next();
  } catch (error) {
    logger.error('更新資料驗證失敗', { 
      userId: req.user?.id,
      error: error.message 
    });
    next(ApiErrorFactory.internalServerError('更新資料驗證失敗', 'UPDATE_VALIDATION_ERROR'));
  }
};

/**
 * 記錄關注清單操作日誌
 */
const logWatchlistOperation = (operation) => {
  return (req, res, next) => {
    // 記錄操作
    logger.info(`關注清單操作: ${operation}`, {
      userId: req.user?.id,
      symbol: req.normalizedSymbol || req.params.symbol || req.body.symbol,
      operation,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    next();
  };
};

module.exports = {
  normalizeSymbol,
  checkWatchlistLimit,
  checkDuplicate,
  validateWatchlistItemExists,
  validateBatchOperations,
  validateUpdateData,
  logWatchlistOperation
}; 