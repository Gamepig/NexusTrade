/**
 * NexusTrade 統一表單驗證系統
 * 
 * 提供一致的表單驗證體驗，包括：
 * - 即時輸入驗證
 * - 友好的錯誤提示
 * - 輸入格式化
 * - 提交前確認
 * - 可存取性支援
 */

class FormValidator {
  constructor() {
    this.validationRules = new Map();
    this.validators = this.initializeValidators();
    this.formatters = this.initializeFormatters();
    this.validatedForms = new Set();
    
    // 預設選項
    this.defaultOptions = {
      validateOnInput: true,
      validateOnBlur: true,
      showSuccessIndicator: true,
      debounceDelay: 300,
      submitPreventDefault: true
    };
    
    this.addStyles();
  }

  /**
   * 初始化驗證規則
   */
  initializeValidators() {
    return {
      required: {
        validate: (value) => value && value.toString().trim().length > 0,
        message: '此欄位為必填'
      },
      
      email: {
        validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: '請輸入有效的電子郵件格式'
      },
      
      phone: {
        validate: (value) => /^[\+]?[\d\-\(\)\s]+$/.test(value) && value.replace(/\D/g, '').length >= 8,
        message: '請輸入有效的電話號碼'
      },
      
      number: {
        validate: (value) => !isNaN(value) && isFinite(value),
        message: '請輸入有效的數字'
      },
      
      positiveNumber: {
        validate: (value) => !isNaN(value) && parseFloat(value) > 0,
        message: '請輸入大於 0 的數字'
      },
      
      integer: {
        validate: (value) => Number.isInteger(parseFloat(value)),
        message: '請輸入整數'
      },
      
      minLength: {
        validate: (value, min) => value && value.toString().length >= parseInt(min),
        message: (min) => `至少需要 ${min} 個字符`
      },
      
      maxLength: {
        validate: (value, max) => !value || value.toString().length <= parseInt(max),
        message: (max) => `最多 ${max} 個字符`
      },
      
      min: {
        validate: (value, min) => parseFloat(value) >= parseFloat(min),
        message: (min) => `最小值為 ${min}`
      },
      
      max: {
        validate: (value, max) => parseFloat(value) <= parseFloat(max),
        message: (max) => `最大值為 ${max}`
      },
      
      pattern: {
        validate: (value, pattern) => new RegExp(pattern).test(value),
        message: '格式不正確'
      },
      
      // 加密貨幣相關驗證
      cryptoSymbol: {
        validate: (value) => /^[A-Z0-9]{2,20}$/.test(value.toUpperCase()),
        message: '貨幣代碼應為 2-20 位英文字母或數字'
      },
      
      price: {
        validate: (value) => {
          const num = parseFloat(value);
          return !isNaN(num) && num > 0 && /^\d+(\.\d{1,8})?$/.test(value);
        },
        message: '請輸入有效的價格（最多8位小數）'
      },
      
      percentage: {
        validate: (value) => {
          const num = parseFloat(value);
          return !isNaN(num) && num >= -100 && num <= 1000;
        },
        message: '請輸入 -100% 到 1000% 之間的百分比'
      },
      
      // 自訂驗證
      custom: {
        validate: (value, validator) => validator(value),
        message: '驗證失敗'
      }
    };
  }

  /**
   * 初始化格式化器
   */
  initializeFormatters() {
    return {
      uppercase: (value) => value.toUpperCase(),
      
      lowercase: (value) => value.toLowerCase(),
      
      phone: (value) => {
        // 移除非數字字符，保留 + 號
        const cleaned = value.replace(/[^\d+]/g, '');
        return cleaned;
      },
      
      currency: (value) => {
        // 移除非數字和小數點的字符
        const cleaned = value.replace(/[^\d.]/g, '');
        // 確保只有一個小數點
        const parts = cleaned.split('.');
        if (parts.length > 2) {
          return parts[0] + '.' + parts.slice(1).join('');
        }
        return cleaned;
      },
      
      cryptoSymbol: (value) => {
        return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      },
      
      percentage: (value) => {
        const cleaned = value.replace(/[^\d.-]/g, '');
        return cleaned;
      }
    };
  }

  /**
   * 註冊表單驗證
   * @param {HTMLFormElement|string} form - 表單元素或選擇器
   * @param {Object} options - 驗證選項
   */
  registerForm(form, options = {}) {
    const formElement = typeof form === 'string' ? document.querySelector(form) : form;
    if (!formElement) {
      console.error('表單元素不存在');
      return;
    }

    const config = { ...this.defaultOptions, ...options };
    
    // 儲存表單配置
    formElement._validatorConfig = config;
    this.validatedForms.add(formElement);
    
    // 設置表單事件
    this.setupFormEvents(formElement, config);
    
    console.log('✅ 表單驗證已註冊:', formElement);
  }

  /**
   * 設置表單事件
   */
  setupFormEvents(form, config) {
    // 提交事件
    form.addEventListener('submit', (e) => {
      if (config.submitPreventDefault) {
        e.preventDefault();
      }
      
      const isValid = this.validateForm(form);
      
      if (isValid) {
        // 觸發自訂驗證通過事件
        form.dispatchEvent(new CustomEvent('validationSuccess', {
          detail: { formData: this.getFormData(form) }
        }));
      } else {
        // 觸發自訂驗證失敗事件
        form.dispatchEvent(new CustomEvent('validationError', {
          detail: { errors: this.getFormErrors(form) }
        }));
      }
    });

    // 為每個輸入元素設置驗證
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      this.setupInputValidation(input, config);
    });
  }

  /**
   * 設置輸入驗證
   */
  setupInputValidation(input, config) {
    let debounceTimer;

    // 輸入事件
    if (config.validateOnInput) {
      input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.validateInput(input);
          this.formatInput(input);
        }, config.debounceDelay);
      });
    }

    // 失焦事件
    if (config.validateOnBlur) {
      input.addEventListener('blur', () => {
        this.validateInput(input);
      });
    }

    // 聚焦事件（清除錯誤狀態）
    input.addEventListener('focus', () => {
      this.clearInputValidation(input);
    });
  }

  /**
   * 驗證整個表單
   * @param {HTMLFormElement} form - 表單元素
   * @returns {boolean} 驗證結果
   */
  validateForm(form) {
    const inputs = form.querySelectorAll('input, textarea, select');
    let isValid = true;

    inputs.forEach(input => {
      if (!this.validateInput(input)) {
        isValid = false;
      }
    });

    return isValid;
  }

  /**
   * 驗證單個輸入
   * @param {HTMLInputElement} input - 輸入元素
   * @returns {boolean} 驗證結果
   */
  validateInput(input) {
    const rules = this.getInputRules(input);
    const value = input.value;

    // 清除之前的驗證狀態
    this.clearInputValidation(input);

    // 如果沒有驗證規則，則視為有效
    if (rules.length === 0) {
      return true;
    }

    // 執行所有驗證規則
    for (const rule of rules) {
      const result = this.executeValidationRule(value, rule);
      
      if (!result.valid) {
        this.showInputError(input, result.message);
        return false;
      }
    }

    // 所有驗證通過
    if (input.form._validatorConfig.showSuccessIndicator && value.trim()) {
      this.showInputSuccess(input);
    }

    return true;
  }

  /**
   * 獲取輸入的驗證規則
   */
  getInputRules(input) {
    const rules = [];
    
    // 從 data 屬性讀取驗證規則
    Object.keys(input.dataset).forEach(key => {
      if (key.startsWith('validate')) {
        const ruleName = key.replace('validate', '').toLowerCase();
        const ruleValue = input.dataset[key];
        
        if (this.validators[ruleName]) {
          rules.push({
            type: ruleName,
            value: ruleValue === '' ? true : ruleValue,
            message: input.dataset[`${key}Message`]
          });
        }
      }
    });

    // HTML5 驗證屬性
    if (input.required) {
      rules.push({ type: 'required', value: true });
    }

    if (input.type === 'email') {
      rules.push({ type: 'email', value: true });
    }

    if (input.type === 'number') {
      rules.push({ type: 'number', value: true });
      
      if (input.min !== '') {
        rules.push({ type: 'min', value: input.min });
      }
      
      if (input.max !== '') {
        rules.push({ type: 'max', value: input.max });
      }
    }

    if (input.minLength) {
      rules.push({ type: 'minLength', value: input.minLength });
    }

    if (input.maxLength) {
      rules.push({ type: 'maxLength', value: input.maxLength });
    }

    if (input.pattern) {
      rules.push({ type: 'pattern', value: input.pattern });
    }

    return rules;
  }

  /**
   * 執行驗證規則
   */
  executeValidationRule(value, rule) {
    const validator = this.validators[rule.type];
    if (!validator) {
      console.warn(`未知的驗證規則: ${rule.type}`);
      return { valid: true };
    }

    const isValid = validator.validate(value, rule.value);
    let message = rule.message;

    if (!message) {
      if (typeof validator.message === 'function') {
        message = validator.message(rule.value);
      } else {
        message = validator.message;
      }
    }

    return {
      valid: isValid,
      message: message
    };
  }

  /**
   * 格式化輸入
   */
  formatInput(input) {
    const formatter = input.dataset.format;
    if (!formatter || !this.formatters[formatter]) {
      return;
    }

    const oldValue = input.value;
    const newValue = this.formatters[formatter](oldValue);
    
    if (oldValue !== newValue) {
      input.value = newValue;
    }
  }

  /**
   * 顯示輸入錯誤
   */
  showInputError(input, message) {
    input.classList.add('validation-error');
    input.classList.remove('validation-success');
    
    // 設置 ARIA 屬性
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', `${input.id}-error`);

    // 建立或更新錯誤訊息元素
    let errorElement = document.getElementById(`${input.id}-error`);
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = `${input.id}-error`;
      errorElement.className = 'validation-message validation-error-message';
      errorElement.setAttribute('role', 'alert');
      
      // 插入錯誤訊息到適當位置
      const container = input.closest('.form-group') || input.parentNode;
      container.appendChild(errorElement);
    }

    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }

  /**
   * 顯示輸入成功
   */
  showInputSuccess(input) {
    input.classList.add('validation-success');
    input.classList.remove('validation-error');
    
    // 清除 ARIA 錯誤屬性
    input.setAttribute('aria-invalid', 'false');
    input.removeAttribute('aria-describedby');

    // 隱藏錯誤訊息
    const errorElement = document.getElementById(`${input.id}-error`);
    if (errorElement) {
      errorElement.style.display = 'none';
    }
  }

  /**
   * 清除輸入驗證狀態
   */
  clearInputValidation(input) {
    input.classList.remove('validation-error', 'validation-success');
    input.setAttribute('aria-invalid', 'false');
    input.removeAttribute('aria-describedby');

    const errorElement = document.getElementById(`${input.id}-error`);
    if (errorElement) {
      errorElement.style.display = 'none';
    }
  }

  /**
   * 獲取表單數據
   */
  getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    return data;
  }

  /**
   * 獲取表單錯誤
   */
  getFormErrors(form) {
    const errors = {};
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      if (input.classList.contains('validation-error')) {
        const errorElement = document.getElementById(`${input.id}-error`);
        if (errorElement) {
          errors[input.name || input.id] = errorElement.textContent;
        }
      }
    });
    
    return errors;
  }

  /**
   * 重置表單驗證
   */
  resetForm(form) {
    const formElement = typeof form === 'string' ? document.querySelector(form) : form;
    if (!formElement) return;

    const inputs = formElement.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      this.clearInputValidation(input);
    });
  }

  /**
   * 手動觸發驗證
   */
  triggerValidation(form) {
    const formElement = typeof form === 'string' ? document.querySelector(form) : form;
    if (!formElement) return false;

    return this.validateForm(formElement);
  }

  /**
   * 新增自訂驗證規則
   */
  addValidator(name, validator) {
    this.validators[name] = validator;
  }

  /**
   * 新增自訂格式化器
   */
  addFormatter(name, formatter) {
    this.formatters[name] = formatter;
  }

  /**
   * 移除表單驗證
   */
  unregisterForm(form) {
    const formElement = typeof form === 'string' ? document.querySelector(form) : form;
    if (!formElement) return;

    this.validatedForms.delete(formElement);
    delete formElement._validatorConfig;
  }

  /**
   * 添加樣式
   */
  addStyles() {
    const existingStyles = document.getElementById('form-validator-styles');
    if (existingStyles) return;

    const styles = document.createElement('style');
    styles.id = 'form-validator-styles';
    styles.textContent = `
      /* 表單驗證樣式 */
      .validation-error {
        border-color: var(--error-color, #e53e3e) !important;
        box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1) !important;
      }

      .validation-success {
        border-color: var(--success-color, #38a169) !important;
        box-shadow: 0 0 0 3px rgba(56, 161, 105, 0.1) !important;
      }

      .validation-message {
        font-size: 12px;
        margin-top: 4px;
        display: none;
        animation: fadeIn 0.2s ease;
      }

      .validation-error-message {
        color: var(--error-color, #e53e3e);
      }

      .validation-success-message {
        color: var(--success-color, #38a169);
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* 高對比度模式 */
      @media (prefers-contrast: high) {
        .validation-error {
          border-width: 2px !important;
        }
        
        .validation-success {
          border-width: 2px !important;
        }
      }

      /* 動畫減少偏好 */
      @media (prefers-reduced-motion: reduce) {
        .validation-message {
          animation: none;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * 銷毀驗證器
   */
  destroy() {
    this.validatedForms.forEach(form => {
      this.unregisterForm(form);
    });
    
    this.validatedForms.clear();
    this.validationRules.clear();
    
    const styles = document.getElementById('form-validator-styles');
    if (styles) {
      styles.remove();
    }
  }
}

// 創建全域實例
window.FormValidator = FormValidator;
window.formValidator = new FormValidator();

// 自動初始化具有 data-validate 屬性的表單
document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('form[data-auto-validate]');
  forms.forEach(form => {
    window.formValidator.registerForm(form);
  });
});

// 導出常用的預設驗證規則常數
window.VALIDATION_RULES = {
  REQUIRED: 'data-validate-required',
  EMAIL: 'data-validate-email',
  PHONE: 'data-validate-phone',
  NUMBER: 'data-validate-number',
  POSITIVE_NUMBER: 'data-validate-positive-number',
  CRYPTO_SYMBOL: 'data-validate-crypto-symbol',
  PRICE: 'data-validate-price',
  PERCENTAGE: 'data-validate-percentage'
};

window.FORMAT_TYPES = {
  UPPERCASE: 'data-format="uppercase"',
  LOWERCASE: 'data-format="lowercase"',
  PHONE: 'data-format="phone"',
  CURRENCY: 'data-format="currency"',
  CRYPTO_SYMBOL: 'data-format="cryptoSymbol"',
  PERCENTAGE: 'data-format="percentage"'
};