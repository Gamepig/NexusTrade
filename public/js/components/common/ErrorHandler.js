/**
 * NexusTrade 統一錯誤處理系統
 * 
 * 提供一致的錯誤處理體驗，包括：
 * - 錯誤分類與友好訊息
 * - 自動重試機制
 * - 錯誤恢復建議
 * - 錯誤上報機制
 */

class ErrorHandler {
  constructor() {
    this.errorHistory = [];
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 秒基礎延遲
    
    this.errorTypes = {
      network: {
        icon: '🌐',
        title: '網路連線問題',
        retryable: true,
        autoRetry: true
      },
      auth: {
        icon: '🔐',
        title: '認證失敗',
        retryable: false,
        autoRetry: false
      },
      validation: {
        icon: '⚠️',
        title: '輸入驗證錯誤',
        retryable: false,
        autoRetry: false
      },
      server: {
        icon: '🔧',
        title: '伺服器錯誤',
        retryable: true,
        autoRetry: false
      },
      timeout: {
        icon: '⏰',
        title: '請求超時',
        retryable: true,
        autoRetry: true
      },
      unknown: {
        icon: '❓',
        title: '未知錯誤',
        retryable: true,
        autoRetry: false
      }
    };

    this.friendlyMessages = this.initializeFriendlyMessages();
    this.addStyles();
    this.setupGlobalErrorHandling();
  }

  /**
   * 初始化友好錯誤訊息
   */
  initializeFriendlyMessages() {
    return {
      // 網路錯誤
      'Failed to fetch': '無法連接到伺服器，請檢查網路連線',
      'NetworkError': '網路連線不穩定，請稍後再試',
      'ERR_NETWORK': '網路連線中斷，請檢查您的網路設定',
      'ERR_INTERNET_DISCONNECTED': '無網路連線，請檢查網路設定',
      
      // HTTP 狀態錯誤
      400: '請求格式錯誤，請檢查輸入資料',
      401: '未授權存取，請重新登入',
      403: '權限不足，無法執行此操作',
      404: '找不到請求的資源',
      408: '請求超時，請稍後再試',
      429: '請求過於頻繁，請稍後再試',
      500: '伺服器內部錯誤，請稍後再試',
      502: '伺服器暫時無法使用，請稍後再試',
      503: '服務暫時不可用，請稍後再試',
      504: '伺服器回應超時，請稍後再試',
      
      // 應用程式錯誤
      'INVALID_TOKEN': '登入憑證已過期，請重新登入',
      'USER_NOT_FOUND': '用戶不存在，請檢查帳號資訊',
      'INSUFFICIENT_PERMISSIONS': '權限不足，請聯繫管理員',
      'VALIDATION_ERROR': '輸入資料格式不正確',
      'DUPLICATE_ENTRY': '資料已存在，請檢查後重試',
      'QUOTA_EXCEEDED': '已達使用限額，請升級方案或稍後再試',
      
      // 功能相關錯誤
      'ALERT_LIMIT_REACHED': '已達價格警報數量上限',
      'INVALID_PRICE': '價格格式不正確，請輸入有效數值',
      'SYMBOL_NOT_FOUND': '找不到指定的交易對',
      'LINE_NOT_CONNECTED': 'LINE 帳號未連結，請先連結 LINE',
      'WATCHLIST_FULL': '觀察清單已滿，請移除部分項目'
    };
  }

  /**
   * 處理錯誤
   * @param {Error|string} error - 錯誤物件或訊息
   * @param {Object} context - 錯誤上下文
   * @param {Object} options - 處理選項
   * @returns {Object} 錯誤處理結果
   */
  handle(error, context = {}, options = {}) {
    const errorInfo = this.analyzeError(error, context);
    const errorId = this.generateErrorId();
    
    // 記錄錯誤
    this.logError(errorInfo, errorId);
    
    // 決定處理策略
    const strategy = this.determineStrategy(errorInfo, options);
    
    // 執行處理
    return this.executeStrategy(strategy, errorInfo, errorId, options);
  }

  /**
   * 分析錯誤
   * @param {Error|string} error - 錯誤
   * @param {Object} context - 上下文
   * @returns {Object} 錯誤資訊
   */
  analyzeError(error, context) {
    let errorInfo = {
      originalError: error,
      message: '',
      type: 'unknown',
      code: null,
      statusCode: null,
      stack: null,
      context,
      timestamp: new Date().toISOString()
    };

    if (error instanceof Error) {
      errorInfo.message = error.message;
      errorInfo.stack = error.stack;
      
      // 分析錯誤類型
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorInfo.type = 'network';
      } else if (error.name === 'AbortError') {
        errorInfo.type = 'timeout';
      }
    } else if (typeof error === 'string') {
      errorInfo.message = error;
    } else if (error && typeof error === 'object') {
      errorInfo.message = error.message || error.error || '未知錯誤';
      errorInfo.code = error.code;
      errorInfo.statusCode = error.status || error.statusCode;
    }

    // 根據狀態碼或訊息確定類型
    if (errorInfo.statusCode) {
      if (errorInfo.statusCode === 401 || errorInfo.statusCode === 403) {
        errorInfo.type = 'auth';
      } else if (errorInfo.statusCode === 400 || errorInfo.statusCode === 422) {
        errorInfo.type = 'validation';
      } else if (errorInfo.statusCode >= 500) {
        errorInfo.type = 'server';
      } else if (errorInfo.statusCode === 408 || errorInfo.statusCode === 504) {
        errorInfo.type = 'timeout';
      }
    }

    // 檢查特定錯誤訊息
    const message = errorInfo.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch')) {
      errorInfo.type = 'network';
    } else if (message.includes('timeout') || message.includes('超時')) {
      errorInfo.type = 'timeout';
    } else if (message.includes('unauthorized') || message.includes('認證')) {
      errorInfo.type = 'auth';
    } else if (message.includes('validation') || message.includes('驗證')) {
      errorInfo.type = 'validation';
    }

    return errorInfo;
  }

  /**
   * 決定處理策略
   * @param {Object} errorInfo - 錯誤資訊
   * @param {Object} options - 選項
   * @returns {Object} 處理策略
   */
  determineStrategy(errorInfo, options) {
    const errorType = this.errorTypes[errorInfo.type];
    const retryCount = this.retryAttempts.get(errorInfo.context.operationId) || 0;
    
    return {
      showNotification: options.silent !== true,
      allowRetry: errorType.retryable && retryCount < this.maxRetries,
      autoRetry: errorType.autoRetry && retryCount < this.maxRetries && options.autoRetry !== false,
      escalate: retryCount >= this.maxRetries,
      redirectOnAuth: errorInfo.type === 'auth' && options.redirectOnAuth !== false
    };
  }

  /**
   * 執行處理策略
   * @param {Object} strategy - 處理策略
   * @param {Object} errorInfo - 錯誤資訊
   * @param {string} errorId - 錯誤 ID
   * @param {Object} options - 選項
   * @returns {Object} 處理結果
   */
  executeStrategy(strategy, errorInfo, errorId, options) {
    const result = {
      errorId,
      handled: true,
      retry: null,
      notification: null
    };

    // 顯示通知
    if (strategy.showNotification) {
      result.notification = this.showErrorNotification(errorInfo, strategy, options);
    }

    // 自動重試
    if (strategy.autoRetry) {
      result.retry = this.scheduleRetry(errorInfo, options);
    }

    // 認證錯誤重定向
    if (strategy.redirectOnAuth) {
      this.handleAuthError(errorInfo, options);
    }

    // 錯誤升級
    if (strategy.escalate) {
      this.escalateError(errorInfo, options);
    }

    return result;
  }

  /**
   * 顯示錯誤通知
   * @param {Object} errorInfo - 錯誤資訊
   * @param {Object} strategy - 處理策略
   * @param {Object} options - 選項
   * @returns {Object} 通知物件
   */
  showErrorNotification(errorInfo, strategy, options) {
    const errorType = this.errorTypes[errorInfo.type];
    const friendlyMessage = this.getFriendlyMessage(errorInfo);
    
    const notification = {
      id: `error-${Date.now()}`,
      type: 'error',
      title: errorType.title,
      message: friendlyMessage,
      icon: errorType.icon,
      actions: [],
      autoClose: !strategy.allowRetry,
      closeDelay: strategy.allowRetry ? 0 : 5000
    };

    // 添加重試按鈕
    if (strategy.allowRetry) {
      notification.actions.push({
        text: '重試',
        action: () => this.retryOperation(errorInfo, options),
        primary: true
      });
    }

    // 添加詳細資訊按鈕
    if (options.showDetails !== false) {
      notification.actions.push({
        text: '詳細資訊',
        action: () => this.showErrorDetails(errorInfo),
        secondary: true
      });
    }

    // 顯示通知
    this.displayNotification(notification);
    
    return notification;
  }

  /**
   * 獲取友好錯誤訊息
   * @param {Object} errorInfo - 錯誤資訊
   * @returns {string} 友好訊息
   */
  getFriendlyMessage(errorInfo) {
    // 檢查狀態碼
    if (errorInfo.statusCode && this.friendlyMessages[errorInfo.statusCode]) {
      return this.friendlyMessages[errorInfo.statusCode];
    }

    // 檢查錯誤代碼
    if (errorInfo.code && this.friendlyMessages[errorInfo.code]) {
      return this.friendlyMessages[errorInfo.code];
    }

    // 檢查錯誤訊息
    for (const [key, message] of Object.entries(this.friendlyMessages)) {
      if (typeof key === 'string' && errorInfo.message.includes(key)) {
        return message;
      }
    }

    // 預設訊息
    const defaultMessages = {
      network: '網路連線問題，請檢查您的網路連線',
      auth: '認證失敗，請重新登入',
      validation: '輸入資料有誤，請檢查後重試',
      server: '伺服器暫時無法回應，請稍後再試',
      timeout: '請求超時，請稍後再試',
      unknown: '發生未知錯誤，請稍後再試'
    };

    return defaultMessages[errorInfo.type] || defaultMessages.unknown;
  }

  /**
   * 安排重試
   * @param {Object} errorInfo - 錯誤資訊
   * @param {Object} options - 選項
   * @returns {Object} 重試資訊
   */
  scheduleRetry(errorInfo, options) {
    const operationId = errorInfo.context.operationId;
    const retryCount = this.retryAttempts.get(operationId) || 0;
    const delay = this.calculateRetryDelay(retryCount, errorInfo.type);
    
    this.retryAttempts.set(operationId, retryCount + 1);

    const retryInfo = {
      operationId,
      retryCount: retryCount + 1,
      delay,
      scheduledAt: Date.now() + delay
    };

    setTimeout(() => {
      this.retryOperation(errorInfo, options);
    }, delay);

    console.log(`🔄 安排重試 (${retryCount + 1}/${this.maxRetries}):`, retryInfo);
    
    return retryInfo;
  }

  /**
   * 計算重試延遲
   * @param {number} retryCount - 重試次數
   * @param {string} errorType - 錯誤類型
   * @returns {number} 延遲時間 (毫秒)
   */
  calculateRetryDelay(retryCount, errorType) {
    // 指數退避策略
    let delay = this.retryDelay * Math.pow(2, retryCount);
    
    // 根據錯誤類型調整
    const typeMultipliers = {
      network: 1.5,
      timeout: 2.0,
      server: 1.2,
      unknown: 1.0
    };
    
    delay *= typeMultipliers[errorType] || 1.0;
    
    // 添加隨機抖動 (±25%)
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    delay += jitter;
    
    // 限制最大延遲 (30 秒)
    return Math.min(delay, 30000);
  }

  /**
   * 重試操作
   * @param {Object} errorInfo - 錯誤資訊
   * @param {Object} options - 選項
   */
  retryOperation(errorInfo, options) {
    console.log('🔄 執行重試操作:', errorInfo.context);
    
    if (options.retryCallback && typeof options.retryCallback === 'function') {
      options.retryCallback(errorInfo.context);
    } else {
      // 觸發重試事件
      window.dispatchEvent(new CustomEvent('errorRetry', {
        detail: {
          errorInfo,
          context: errorInfo.context
        }
      }));
    }
  }

  /**
   * 處理認證錯誤
   * @param {Object} errorInfo - 錯誤資訊
   * @param {Object} options - 選項
   */
  handleAuthError(errorInfo, options) {
    console.log('🔐 處理認證錯誤:', errorInfo);
    
    // 清除本地認證資料
    localStorage.removeItem('nexustrade_token');
    sessionStorage.removeItem('nexustrade_token');
    localStorage.removeItem('nexustrade_user');
    sessionStorage.removeItem('nexustrade_user');
    
    // 觸發認證失效事件
    window.dispatchEvent(new CustomEvent('authExpired', {
      detail: { errorInfo }
    }));
    
    // 重定向到登入頁面 (如果不在登入頁面)
    if (options.redirectUrl !== false && !window.location.pathname.includes('login')) {
      setTimeout(() => {
        window.location.href = options.redirectUrl || '/';
      }, 2000);
    }
  }

  /**
   * 錯誤升級處理
   * @param {Object} errorInfo - 錯誤資訊
   * @param {Object} options - 選項
   */
  escalateError(errorInfo, options) {
    console.error('🚨 錯誤升級:', errorInfo);
    
    // 觸發錯誤升級事件
    window.dispatchEvent(new CustomEvent('errorEscalated', {
      detail: { errorInfo }
    }));
    
    // 可以在這裡實施錯誤上報機制
    if (options.reportError !== false) {
      this.reportError(errorInfo);
    }
  }

  /**
   * 顯示錯誤詳細資訊
   * @param {Object} errorInfo - 錯誤資訊
   */
  showErrorDetails(errorInfo) {
    const modal = document.createElement('div');
    modal.className = 'error-details-modal';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>錯誤詳細資訊</h3>
          <button class="close-btn" onclick="this.closest('.error-details-modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="error-detail-item">
            <label>錯誤類型:</label>
            <span>${errorInfo.type}</span>
          </div>
          <div class="error-detail-item">
            <label>錯誤訊息:</label>
            <span>${errorInfo.message}</span>
          </div>
          ${errorInfo.statusCode ? `
            <div class="error-detail-item">
              <label>狀態碼:</label>
              <span>${errorInfo.statusCode}</span>
            </div>
          ` : ''}
          ${errorInfo.code ? `
            <div class="error-detail-item">
              <label>錯誤代碼:</label>
              <span>${errorInfo.code}</span>
            </div>
          ` : ''}
          <div class="error-detail-item">
            <label>發生時間:</label>
            <span>${new Date(errorInfo.timestamp).toLocaleString('zh-TW')}</span>
          </div>
          ${errorInfo.context.operationId ? `
            <div class="error-detail-item">
              <label>操作 ID:</label>
              <span>${errorInfo.context.operationId}</span>
            </div>
          ` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.error-details-modal').remove()">
            關閉
          </button>
          <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${JSON.stringify(errorInfo, null, 2)}'); this.textContent='已複製'">
            複製錯誤資訊
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
  }

  /**
   * 顯示通知
   * @param {Object} notification - 通知物件
   */
  displayNotification(notification) {
    const notificationElement = document.createElement('div');
    notificationElement.className = `error-notification ${notification.type}`;
    notificationElement.id = notification.id;
    
    const actionsHTML = notification.actions.map(action => `
      <button class="notification-action ${action.primary ? 'primary' : ''} ${action.secondary ? 'secondary' : ''}"
              onclick="document.getElementById('${notification.id}').remove(); (${action.action.toString()})()">
        ${action.text}
      </button>
    `).join('');
    
    notificationElement.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">${notification.icon}</div>
        <div class="notification-text">
          <div class="notification-title">${notification.title}</div>
          <div class="notification-message">${notification.message}</div>
        </div>
      </div>
      ${notification.actions.length > 0 ? `
        <div class="notification-actions">
          ${actionsHTML}
        </div>
      ` : ''}
      <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notificationElement);
    
    setTimeout(() => {
      notificationElement.classList.add('show');
    }, 10);
    
    // 自動關閉
    if (notification.autoClose && notification.closeDelay > 0) {
      setTimeout(() => {
        if (notificationElement.parentNode) {
          notificationElement.classList.add('hide');
          setTimeout(() => {
            if (notificationElement.parentNode) {
              notificationElement.remove();
            }
          }, 300);
        }
      }, notification.closeDelay);
    }
  }

  /**
   * 記錄錯誤
   * @param {Object} errorInfo - 錯誤資訊
   * @param {string} errorId - 錯誤 ID
   */
  logError(errorInfo, errorId) {
    const logEntry = {
      id: errorId,
      ...errorInfo,
      userAgent: navigator.userAgent,
      url: window.location.href,
      loggedAt: new Date().toISOString()
    };
    
    this.errorHistory.push(logEntry);
    
    // 限制歷史記錄數量
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-50);
    }
    
    console.error(`❌ 錯誤記錄 [${errorId}]:`, logEntry);
  }

  /**
   * 生成錯誤 ID
   * @returns {string} 錯誤 ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 上報錯誤
   * @param {Object} errorInfo - 錯誤資訊
   */
  reportError(errorInfo) {
    // 實施錯誤上報邏輯
    console.log('📊 錯誤上報:', errorInfo);
    
    // 可以發送到錯誤追蹤服務
    // 例如: Sentry, LogRocket, Bugsnag 等
  }

  /**
   * 設置全域錯誤處理
   */
  setupGlobalErrorHandling() {
    // 捕獲未處理的 Promise 拒絕
    window.addEventListener('unhandledrejection', (event) => {
      console.error('未處理的 Promise 拒絕:', event.reason);
      this.handle(event.reason, { 
        type: 'unhandledRejection',
        operationId: `global_${Date.now()}`
      });
    });

    // 捕獲全域 JavaScript 錯誤
    window.addEventListener('error', (event) => {
      console.error('全域 JavaScript 錯誤:', event.error);
      this.handle(event.error, {
        type: 'globalError',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        operationId: `global_${Date.now()}`
      });
    });
  }

  /**
   * 清除重試計數
   * @param {string} operationId - 操作 ID
   */
  clearRetryAttempts(operationId) {
    this.retryAttempts.delete(operationId);
  }

  /**
   * 獲取錯誤歷史
   * @returns {Array} 錯誤歷史記錄
   */
  getErrorHistory() {
    return [...this.errorHistory];
  }

  /**
   * 清除錯誤歷史
   */
  clearErrorHistory() {
    this.errorHistory = [];
  }

  /**
   * 添加樣式
   */
  addStyles() {
    const existingStyles = document.getElementById('error-handler-styles');
    if (existingStyles) return;

    const styles = document.createElement('style');
    styles.id = 'error-handler-styles';
    styles.textContent = `
      /* 錯誤通知樣式 */
      .error-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        min-width: 320px;
        max-width: 480px;
        background: var(--bg-secondary, #1a1d29);
        border: 1px solid var(--error-color, #e53e3e);
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 1000000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        padding: 16px;
      }

      .error-notification.show {
        opacity: 1;
        transform: translateX(0);
      }

      .error-notification.hide {
        opacity: 0;
        transform: translateX(100%);
      }

      .notification-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;
      }

      .notification-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .notification-text {
        flex: 1;
      }

      .notification-title {
        font-weight: 600;
        color: var(--text-primary, #ffffff);
        margin-bottom: 4px;
        font-size: 16px;
      }

      .notification-message {
        color: var(--text-secondary, #a0aec0);
        font-size: 14px;
        line-height: 1.4;
      }

      .notification-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      .notification-action {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .notification-action.primary {
        background: var(--error-color, #e53e3e);
        color: white;
      }

      .notification-action.primary:hover {
        background: var(--error-color-dark, #c53030);
      }

      .notification-action.secondary {
        background: var(--bg-tertiary, #2d3748);
        color: var(--text-secondary, #a0aec0);
        border: 1px solid var(--border-color, #4a5568);
      }

      .notification-action.secondary:hover {
        background: var(--bg-quaternary, #4a5568);
        color: var(--text-primary, #ffffff);
      }

      .notification-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        color: var(--text-secondary, #a0aec0);
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
      }

      .notification-close:hover {
        background: var(--bg-tertiary, #2d3748);
        color: var(--text-primary, #ffffff);
      }

      /* 錯誤詳細資訊模態框 */
      .error-details-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        z-index: 1000001;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .error-details-modal.show {
        opacity: 1;
      }

      .error-details-modal .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
      }

      .error-details-modal .modal-content {
        position: relative;
        background: var(--bg-secondary, #1a1d29);
        border: 1px solid var(--border-color, #2d3748);
        border-radius: 12px;
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      }

      .error-details-modal .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid var(--border-color, #2d3748);
      }

      .error-details-modal .modal-header h3 {
        margin: 0;
        color: var(--text-primary, #ffffff);
        font-size: 18px;
      }

      .error-details-modal .close-btn {
        background: none;
        border: none;
        color: var(--text-secondary, #a0aec0);
        font-size: 24px;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
      }

      .error-details-modal .close-btn:hover {
        background: var(--bg-tertiary, #2d3748);
        color: var(--text-primary, #ffffff);
      }

      .error-details-modal .modal-body {
        padding: 20px;
        max-height: 400px;
        overflow-y: auto;
      }

      .error-detail-item {
        display: flex;
        margin-bottom: 12px;
        gap: 12px;
      }

      .error-detail-item label {
        min-width: 100px;
        font-weight: 500;
        color: var(--text-secondary, #a0aec0);
      }

      .error-detail-item span {
        color: var(--text-primary, #ffffff);
        word-break: break-all;
      }

      .error-details-modal .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 20px;
        border-top: 1px solid var(--border-color, #2d3748);
      }

      .error-details-modal .btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .error-details-modal .btn-secondary {
        background: var(--bg-tertiary, #2d3748);
        color: var(--text-primary, #ffffff);
        border: 1px solid var(--border-color, #4a5568);
      }

      .error-details-modal .btn-secondary:hover {
        background: var(--bg-quaternary, #4a5568);
      }

      .error-details-modal .btn-primary {
        background: var(--accent-color, #3182ce);
        color: white;
      }

      .error-details-modal .btn-primary:hover {
        background: var(--accent-color-dark, #2c5aa0);
      }

      /* 響應式設計 */
      @media (max-width: 768px) {
        .error-notification {
          right: 10px;
          left: 10px;
          min-width: auto;
          max-width: none;
        }

        .error-details-modal .modal-content {
          width: 95%;
          margin: 20px;
        }

        .notification-actions {
          flex-direction: column;
        }

        .error-details-modal .modal-footer {
          flex-direction: column;
        }
      }
    `;

    document.head.appendChild(styles);
  }
}

// 創建全域實例
window.ErrorHandler = ErrorHandler;
window.errorHandler = new ErrorHandler();