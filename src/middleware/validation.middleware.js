/**
 * NexusTrade 資料驗證中介軟體
 * 
 * 提供統一的輸入驗證功能，包含常用的驗證規則和自訂驗證器
 */

const { ApiErrorFactory, ValidationErrorFactory } = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * 通用驗證規則
 */
const validationRules = {
  // 電子郵件驗證
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: '電子郵件格式無效'
  },

  // 密碼驗證 - 至少8位，包含大小寫字母和數字
  password: {
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    message: '密碼必須至少8位，包含大寫字母、小寫字母和數字'
  },

  // 使用者名稱驗證 - 3-50字元，只允許字母、數字、底線
  username: {
    pattern: /^[a-zA-Z0-9_]{3,50}$/,
    message: '使用者名稱必須3-50字元，只能包含字母、數字和底線'
  },

  // 交易對符號驗證 - 2-10個大寫字母 + USDT
  symbol: {
    pattern: /^[A-Z]{2,10}USDT?$/,
    message: '交易對格式無效，應為 BTCUSDT 格式'
  },

  // 手機號碼驗證 (台灣格式)
  phone: {
    pattern: /^09\d{8}$/,
    message: '手機號碼格式無效，應為09開頭的10位數字'
  },

  // 正整數驗證
  positiveInteger: {
    pattern: /^[1-9]\d*$/,
    message: '必須是正整數'
  },

  // 正數驗證 (包含小數)
  positiveNumber: {
    pattern: /^(?!0(\.0+)?$)\d+(\.\d+)?$/,
    message: '必須是正數'
  }
};

/**
 * 驗證單一欄位
 */
const validateField = (value, fieldName, rules, isRequired = false) => {
  const errors = [];

  // 檢查必填欄位
  if (isRequired && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} 為必填欄位`);
    return errors;
  }

  // 如果不是必填且值為空，跳過驗證
  if (!isRequired && (value === undefined || value === null || value === '')) {
    return errors;
  }

  // 型別驗證
  if (rules.type) {
    const actualType = typeof value;
    if (actualType !== rules.type) {
      errors.push(`${fieldName} 必須是 ${rules.type} 型別`);
      return errors;
    }
  }

  // 字串長度驗證
  if (rules.minLength && value.length < rules.minLength) {
    errors.push(`${fieldName} 長度不能少於 ${rules.minLength} 個字元`);
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    errors.push(`${fieldName} 長度不能超過 ${rules.maxLength} 個字元`);
  }

  // 數值範圍驗證
  if (rules.min !== undefined && Number(value) < rules.min) {
    errors.push(`${fieldName} 不能小於 ${rules.min}`);
  }

  if (rules.max !== undefined && Number(value) > rules.max) {
    errors.push(`${fieldName} 不能大於 ${rules.max}`);
  }

  // 正則表達式驗證
  if (rules.pattern && !rules.pattern.test(value)) {
    errors.push(rules.message || `${fieldName} 格式無效`);
  }

  // 預設驗證規則
  if (rules.rule && validationRules[rules.rule]) {
    const rule = validationRules[rules.rule];
    if (!rule.pattern.test(value)) {
      errors.push(rule.message);
    }
  }

  // 允許值清單驗證
  if (rules.enum && !rules.enum.includes(value)) {
    errors.push(`${fieldName} 必須是以下值之一: ${rules.enum.join(', ')}`);
  }

  // 自訂驗證函數
  if (rules.validator && typeof rules.validator === 'function') {
    const isValid = rules.validator(value);
    if (!isValid) {
      errors.push(rules.validatorMessage || `${fieldName} 驗證失敗`);
    }
  }

  return errors;
};

/**
 * 建立驗證中介軟體
 */
const validate = (schema) => {
  return (req, res, next) => {
    const errors = {};
    let hasErrors = false;

    // 驗證 body 參數
    if (schema.body) {
      Object.keys(schema.body).forEach(fieldName => {
        const rules = schema.body[fieldName];
        const value = req.body[fieldName];
        const isRequired = rules.required === true;

        const fieldErrors = validateField(value, fieldName, rules, isRequired);
        if (fieldErrors.length > 0) {
          errors[fieldName] = fieldErrors;
          hasErrors = true;
        }
      });
    }

    // 驗證 query 參數
    if (schema.query) {
      Object.keys(schema.query).forEach(fieldName => {
        const rules = schema.query[fieldName];
        const value = req.query[fieldName];
        const isRequired = rules.required === true;

        const fieldErrors = validateField(value, fieldName, rules, isRequired);
        if (fieldErrors.length > 0) {
          errors[`query.${fieldName}`] = fieldErrors;
          hasErrors = true;
        }
      });
    }

    // 驗證 params 參數
    if (schema.params) {
      Object.keys(schema.params).forEach(fieldName => {
        const rules = schema.params[fieldName];
        const value = req.params[fieldName];
        const isRequired = rules.required === true;

        const fieldErrors = validateField(value, fieldName, rules, isRequired);
        if (fieldErrors.length > 0) {
          errors[`params.${fieldName}`] = fieldErrors;
          hasErrors = true;
        }
      });
    }

    if (hasErrors) {
      logger.warn('輸入驗證失敗', {
        url: req.originalUrl,
        method: req.method,
        errors,
        body: req.body,
        query: req.query,
        params: req.params
      });

      return next(ApiErrorFactory.unprocessableEntity(
        '輸入驗證失敗',
        'VALIDATION_ERROR',
        errors
      ));
    }

    next();
  };
};

/**
 * 常用驗證 Schema
 */
const commonSchemas = {
  // 使用者註冊驗證
  userRegistration: {
    body: {
      email: {
        required: true,
        type: 'string',
        rule: 'email'
      },
      password: {
        required: true,
        type: 'string',
        rule: 'password'
      },
      username: {
        required: false,
        type: 'string',
        rule: 'username'
      },
      displayName: {
        required: false,
        type: 'string',
        maxLength: 100
      }
    }
  },

  // 使用者登入驗證
  userLogin: {
    body: {
      email: {
        required: true,
        type: 'string',
        rule: 'email'
      },
      password: {
        required: true,
        type: 'string',
        minLength: 1
      }
    }
  },

  // 密碼變更驗證
  passwordChange: {
    body: {
      currentPassword: {
        required: true,
        type: 'string',
        minLength: 1
      },
      newPassword: {
        required: true,
        type: 'string',
        rule: 'password'
      }
    }
  },

  // 通知規則建立驗證
  notificationRuleCreation: {
    body: {
      symbol: {
        required: true,
        type: 'string',
        rule: 'symbol'
      },
      name: {
        required: false,
        type: 'string',
        maxLength: 100
      },
      description: {
        required: false,
        type: 'string',
        maxLength: 500
      },
      conditions: {
        required: true,
        validator: (value) => Array.isArray(value) && value.length > 0 && value.length <= 5,
        validatorMessage: '條件陣列必須包含 1-5 個項目'
      },
      priority: {
        required: false,
        type: 'number',
        min: 1,
        max: 5
      }
    }
  },

  // 關注清單新增驗證
  watchlistAddition: {
    body: {
      symbol: {
        required: true,
        type: 'string',
        rule: 'symbol'
      },
      priority: {
        required: false,
        type: 'number',
        min: 1,
        max: 5
      }
    }
  },

  // 分頁參數驗證
  pagination: {
    query: {
      page: {
        required: false,
        type: 'string',
        pattern: /^\d+$/,
        message: '頁碼必須是正整數',
        validator: (value) => parseInt(value) >= 1,
        validatorMessage: '頁碼必須大於等於 1'
      },
      limit: {
        required: false,
        type: 'string',
        pattern: /^\d+$/,
        message: '每頁數量必須是正整數',
        validator: (value) => {
          const num = parseInt(value);
          return num >= 1 && num <= 100;
        },
        validatorMessage: '每頁數量必須在 1-100 之間'
      }
    }
  },

  // MongoDB ObjectId 驗證
  objectId: {
    params: {
      id: {
        required: true,
        type: 'string',
        pattern: /^[0-9a-fA-F]{24}$/,
        message: '無效的 ID 格式'
      }
    }
  }
};

/**
 * 預設驗證中介軟體
 */
const validateUserRegistration = validate(commonSchemas.userRegistration);
const validateUserLogin = validate(commonSchemas.userLogin);
const validatePasswordChange = validate(commonSchemas.passwordChange);
const validateNotificationRule = validate(commonSchemas.notificationRuleCreation);
const validateWatchlistAddition = validate(commonSchemas.watchlistAddition);
const validatePagination = validate(commonSchemas.pagination);
const validateObjectId = validate(commonSchemas.objectId);

/**
 * 清理和標準化輸入資料
 */
const sanitizeInput = (req, res, next) => {
  // 清理字串欄位
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.trim();
  };

  // 清理 body
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }

  // 清理 query
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]);
      }
    });
  }

  // 標準化分頁參數
  if (req.query.page) {
    req.query.page = parseInt(req.query.page) || 1;
  }
  if (req.query.limit) {
    req.query.limit = Math.min(parseInt(req.query.limit) || 20, 100);
  }

  // 標準化交易對符號為大寫
  if (req.body.symbol) {
    req.body.symbol = req.body.symbol.toUpperCase();
  }
  if (req.query.symbol) {
    req.query.symbol = req.query.symbol.toUpperCase();
  }
  if (req.params.symbol) {
    req.params.symbol = req.params.symbol.toUpperCase();
  }

  next();
};

/**
 * 檔案上傳驗證
 */
const validateFileUpload = (options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    required = false
  } = options;

  return (req, res, next) => {
    if (!req.file && required) {
      return next(ApiErrorFactory.badRequest('檔案為必填', 'FILE_REQUIRED'));
    }

    if (!req.file) {
      return next();
    }

    // 檢查檔案大小
    if (req.file.size > maxSize) {
      return next(ApiErrorFactory.badRequest(
        `檔案大小不能超過 ${Math.round(maxSize / 1024 / 1024)}MB`,
        'FILE_TOO_LARGE',
        { maxSize, actualSize: req.file.size }
      ));
    }

    // 檢查檔案類型
    if (!allowedTypes.includes(req.file.mimetype)) {
      return next(ApiErrorFactory.badRequest(
        `不支援的檔案類型，允許的類型: ${allowedTypes.join(', ')}`,
        'INVALID_FILE_TYPE',
        { allowedTypes, actualType: req.file.mimetype }
      ));
    }

    next();
  };
};

module.exports = {
  validate,
  validateField,
  validationRules,
  commonSchemas,
  
  // 預設驗證中介軟體
  validateUserRegistration,
  validateUserLogin,
  validatePasswordChange,
  validateNotificationRule,
  validateWatchlistAddition,
  validatePagination,
  validateObjectId,
  
  // 工具函數
  sanitizeInput,
  validateFileUpload
};