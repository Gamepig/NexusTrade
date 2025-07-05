/**
 * NexusTrade 增強版價格警報模態框
 * 
 * 整合了用戶體驗優化功能：
 * - 統一載入狀態管理
 * - 友好錯誤處理
 * - 即時表單驗證
 * - 智慧重試機制
 * - 響應式設計
 */

class EnhancedPriceAlertModal {
  constructor() {
    this.currentSymbol = null;
    this.currentPrice = null;
    this.existingAlerts = [];
    this.isVisible = false;
    this.isLineConnected = false;
    this.loadingStates = new Set();
    this.validationErrors = new Map();
    
    // 操作 ID 生成器
    this.operationIdCounter = 0;
    
    // 綁定方法
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleAuthStateUpdate = this.handleAuthStateUpdate.bind(this);
    this.validateForm = this.validateForm.bind(this);
    
    // 設置事件監聽
    this.setupEventListeners();
    
    // 確保依賴的系統已載入
    this.ensureDependencies();
  }

  /**
   * 確保依賴系統已載入
   */
  ensureDependencies() {
    if (!window.loadingManager) {
      console.warn('⚠️ LoadingManager 未載入，使用降級載入指示');
    }
    
    if (!window.errorHandler) {
      console.warn('⚠️ ErrorHandler 未載入，使用基本錯誤處理');
    }
  }

  /**
   * 設置事件監聽器
   */
  setupEventListeners() {
    // 認證狀態更新
    window.addEventListener('authStateUpdated', this.handleAuthStateUpdate);
    
    // 認證過期
    window.addEventListener('authExpired', () => {
      if (this.isVisible) {
        this.hide();
      }
    });

    // 錯誤重試
    window.addEventListener('errorRetry', (event) => {
      const { context } = event.detail;
      if (context.component === 'PriceAlertModal') {
        this.handleRetry(context);
      }
    });
  }

  /**
   * 顯示模態框 - 增強版
   */
  async show(symbol) {
    if (this.isVisible) return;
    
    this.currentSymbol = symbol;
    this.isVisible = true;
    
    console.log(`🔔 顯示增強版價格警報設定: ${symbol}`);
    
    // 顯示初始載入
    this.showLoading('modal-init', {
      type: 'skeleton',
      skeletonType: 'card',
      message: '正在載入警報設定...',
      container: document.body,
      overlay: true
    });

    try {
      // 並行載入所有必要數據
      const loadPromises = [
        this.loadCurrentPriceEnhanced(),
        this.checkLineConnectionStatusEnhanced(),
        this.loadExistingAlertsEnhanced()
      ];

      await Promise.allSettled(loadPromises);
      
      // 渲染模態框
      this.renderEnhanced();
      this.setupEnhancedEventListeners();
      
      // 顯示模態框動畫
      this.showModalWithAnimation();
      
    } catch (error) {
      this.handleError(error, {
        operation: 'show',
        context: { symbol }
      });
    } finally {
      this.hideLoading('modal-init');
    }
  }

  /**
   * 增強版載入當前價格
   */
  async loadCurrentPriceEnhanced() {
    const operationId = this.generateOperationId('load-price');
    
    this.showLoading('price-loading', {
      type: 'dots',
      size: 'small',
      message: '載入價格...'
    });

    try {
      const response = await fetch(`/api/market/ticker/${this.currentSymbol}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.currentPrice = parseFloat(data.data?.price || data.price || 0);
      
      console.log(`💰 載入 ${this.currentSymbol} 當前價格: $${this.currentPrice}`);
      
      // 清除重試計數
      if (window.errorHandler) {
        window.errorHandler.clearRetryAttempts(operationId);
      }
      
    } catch (error) {
      this.handleError(error, {
        operation: 'loadCurrentPrice',
        operationId,
        retryCallback: () => this.loadCurrentPriceEnhanced()
      });
      this.currentPrice = null;
    } finally {
      this.hideLoading('price-loading');
    }
  }

  /**
   * 增強版檢查 LINE 連接狀態
   */
  async checkLineConnectionStatusEnhanced() {
    const operationId = this.generateOperationId('check-line');
    
    this.showLoading('line-check', {
      type: 'spinner',
      size: 'small',
      message: '檢查 LINE 狀態...'
    });

    try {
      // 優先使用 AuthStateManager
      if (window.authStateManager) {
        await window.authStateManager.validateAuthState();
        const authState = await window.authStateManager.waitForAuthStability();
        this.isLineConnected = authState.isBound;
      } else {
        // 降級邏輯
        await this.checkLineConnectionFallback();
      }
      
      console.log(`📱 LINE 連接狀態: ${this.isLineConnected ? '已連接' : '未連接'}`);
      
      if (window.errorHandler) {
        window.errorHandler.clearRetryAttempts(operationId);
      }
      
    } catch (error) {
      this.handleError(error, {
        operation: 'checkLineConnection',
        operationId,
        retryCallback: () => this.checkLineConnectionStatusEnhanced()
      });
      this.isLineConnected = false;
    } finally {
      this.hideLoading('line-check');
    }
  }

  /**
   * 增強版載入現有警報
   */
  async loadExistingAlertsEnhanced() {
    const operationId = this.generateOperationId('load-alerts');
    
    this.showLoading('alerts-loading', {
      type: 'skeleton',
      skeletonType: 'list',
      message: '載入現有警報...'
    });

    try {
      const token = this.getAuthToken();
      if (!token) {
        this.existingAlerts = [];
        return;
      }

      const response = await fetch(`/api/notifications/alerts/${this.currentSymbol}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('INVALID_TOKEN');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.existingAlerts = data.data.alerts || [];
      
      console.log(`📊 載入 ${this.currentSymbol} 現有警報: ${this.existingAlerts.length} 個`);
      
      if (window.errorHandler) {
        window.errorHandler.clearRetryAttempts(operationId);
      }
      
    } catch (error) {
      this.handleError(error, {
        operation: 'loadExistingAlerts',
        operationId,
        retryCallback: () => this.loadExistingAlertsEnhanced(),
        context: { symbol: this.currentSymbol }
      });
      this.existingAlerts = [];
    } finally {
      this.hideLoading('alerts-loading');
    }
  }

  /**
   * 增強版表單提交
   */
  async handleSubmit(event) {
    event.preventDefault();
    
    // 表單驗證
    const validation = this.validateForm(event.target);
    if (!validation.isValid) {
      this.showValidationErrors(validation.errors);
      return;
    }

    const operationId = this.generateOperationId('submit-alert');
    const formData = new FormData(event.target);
    
    const alertData = {
      symbol: this.currentSymbol,
      alertType: formData.get('alertType'),
      targetPrice: formData.get('targetPrice') ? parseFloat(formData.get('targetPrice')) : null,
      aiAnalysisSubscription: {
        enabled: formData.get('aiSubscription') === 'on'
      },
      notificationMethods: {
        lineMessaging: {
          enabled: true // 預設啟用 LINE 通知
        }
      }
    };

    console.log('📝 提交增強版警報設定:', alertData);

    // 檢查配額限制
    const quotaCheck = this.checkQuotaLimit();
    if (!quotaCheck.canAddMore) {
      this.showQuotaExceededError(quotaCheck);
      return;
    }

    // 顯示提交載入
    this.showLoading('submit-alert', {
      type: 'progress',
      progressType: 'bar',
      message: '正在儲存警報設定...',
      showProgress: true
    });

    try {
      // 模擬進度更新
      this.updateLoadingProgress('submit-alert', 30);
      
      await this.saveAlertEnhanced(alertData, operationId);
      
      this.updateLoadingProgress('submit-alert', 100);
      
      // 顯示成功訊息
      this.showSuccessNotification('警報設定已成功儲存！');
      
      // 重新載入並更新界面
      await this.loadExistingAlertsEnhanced();
      this.renderEnhanced();
      this.setupEnhancedEventListeners();
      
    } catch (error) {
      this.handleError(error, {
        operation: 'submitAlert',
        operationId,
        context: { alertData },
        retryCallback: () => this.handleSubmit(event)
      });
    } finally {
      this.hideLoading('submit-alert');
    }
  }

  /**
   * 增強版儲存警報
   */
  async saveAlertEnhanced(alertData, operationId) {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('INVALID_TOKEN');
    }

    const response = await fetch('/api/notifications/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(alertData)
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('INVALID_TOKEN');
      } else if (response.status === 400) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'VALIDATION_ERROR');
      } else if (response.status === 429) {
        throw new Error('QUOTA_EXCEEDED');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '儲存失敗');
    }

    return result;
  }

  /**
   * 表單驗證
   */
  validateForm(form) {
    const errors = [];
    const formData = new FormData(form);
    
    // 清除之前的驗證錯誤
    this.validationErrors.clear();

    // 驗證警報類型
    const alertType = formData.get('alertType');
    if (!alertType) {
      errors.push({
        field: 'alertType',
        message: '請選擇警報類型'
      });
    }

    // 驗證目標價格
    const targetPrice = formData.get('targetPrice');
    if (alertType === 'price_above' || alertType === 'price_below') {
      if (!targetPrice) {
        errors.push({
          field: 'targetPrice',
          message: '請輸入目標價格'
        });
      } else {
        const price = parseFloat(targetPrice);
        if (isNaN(price) || price <= 0) {
          errors.push({
            field: 'targetPrice',
            message: '請輸入有效的價格數值'
          });
        } else if (this.currentPrice) {
          // 邏輯驗證
          if (alertType === 'price_above' && price <= this.currentPrice) {
            errors.push({
              field: 'targetPrice',
              message: `上穿價格應高於當前價格 $${this.currentPrice.toLocaleString()}`
            });
          } else if (alertType === 'price_below' && price >= this.currentPrice) {
            errors.push({
              field: 'targetPrice',
              message: `下穿價格應低於當前價格 $${this.currentPrice.toLocaleString()}`
            });
          }
        }
      }
    }

    // 儲存驗證錯誤
    errors.forEach(error => {
      this.validationErrors.set(error.field, error.message);
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 顯示驗證錯誤
   */
  showValidationErrors(errors) {
    // 清除之前的錯誤樣式
    document.querySelectorAll('.form-error').forEach(el => el.remove());
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

    errors.forEach(error => {
      const field = document.querySelector(`[name="${error.field}"]`);
      if (field) {
        // 添加錯誤樣式
        field.classList.add('input-error');
        
        // 添加錯誤訊息
        const errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        errorElement.textContent = error.message;
        
        // 插入錯誤訊息
        const fieldContainer = field.closest('.form-group');
        if (fieldContainer) {
          fieldContainer.appendChild(errorElement);
        }
      }
    });

    // 聚焦到第一個錯誤欄位
    const firstErrorField = document.querySelector('.input-error');
    if (firstErrorField) {
      firstErrorField.focus();
    }
  }

  /**
   * 顯示配額超出錯誤
   */
  showQuotaExceededError(quotaCheck) {
    const membershipTypes = {
      free: '免費會員',
      premium: '付費會員',
      enterprise: '企業會員'
    };

    const message = `⚠️ 配額已滿：${membershipTypes[quotaCheck.membershipType]}最多可設定 ${quotaCheck.maxCount} 個警報。請刪除現有警報或升級會員方案。`;
    
    if (window.errorHandler) {
      window.errorHandler.handle(new Error('QUOTA_EXCEEDED'), {
        component: 'PriceAlertModal',
        operation: 'quotaCheck'
      }, {
        customMessage: message,
        showDetails: false
      });
    } else {
      alert(message);
    }

    // 顯示升級選項
    setTimeout(() => {
      this.showUpgradeModal(quotaCheck.membershipType);
    }, 2000);
  }

  /**
   * 處理錯誤 - 增強版
   */
  handleError(error, context = {}) {
    console.error(`❌ 增強版價格警報錯誤 [${context.operation}]:`, error);

    if (window.errorHandler) {
      return window.errorHandler.handle(error, {
        component: 'PriceAlertModal',
        ...context
      }, {
        autoRetry: context.operation !== 'submitAlert', // 提交操作不自動重試
        showDetails: true
      });
    } else {
      // 降級錯誤處理
      this.showBasicError(error, context);
    }
  }

  /**
   * 基本錯誤處理 (降級)
   */
  showBasicError(error, context) {
    const message = error.message || '發生未知錯誤';
    console.error('基本錯誤處理:', message);
    
    // 簡單的錯誤提示
    const notification = document.createElement('div');
    notification.className = 'basic-error-notification';
    notification.innerHTML = `
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-message">${message}</span>
        <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  /**
   * 處理重試
   */
  handleRetry(context) {
    console.log('🔄 處理重試:', context);
    
    switch (context.operation) {
      case 'loadCurrentPrice':
        this.loadCurrentPriceEnhanced();
        break;
      case 'checkLineConnection':
        this.checkLineConnectionStatusEnhanced();
        break;
      case 'loadExistingAlerts':
        this.loadExistingAlertsEnhanced();
        break;
      case 'submitAlert':
        // 重新觸發表單提交
        const form = document.getElementById('price-alert-form');
        if (form) {
          this.handleSubmit({ target: form, preventDefault: () => {} });
        }
        break;
    }
  }

  /**
   * 顯示載入狀態
   */
  showLoading(id, options = {}) {
    this.loadingStates.add(id);
    
    if (window.loadingManager) {
      return window.loadingManager.show(id, options);
    } else {
      // 降級載入指示
      console.log(`⏳ 載入中: ${id} - ${options.message || ''}`);
    }
  }

  /**
   * 隱藏載入狀態
   */
  hideLoading(id) {
    this.loadingStates.delete(id);
    
    if (window.loadingManager) {
      window.loadingManager.hide(id);
    }
  }

  /**
   * 更新載入進度
   */
  updateLoadingProgress(id, progress) {
    if (window.loadingManager) {
      window.loadingManager.update(id, { progress });
    }
  }

  /**
   * 顯示成功通知
   */
  showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="success-icon">✅</span>
        <span class="success-message">${message}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.add('hide');
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 3000);
  }

  /**
   * 生成操作 ID
   */
  generateOperationId(operation) {
    return `${operation}_${++this.operationIdCounter}_${Date.now()}`;
  }

  /**
   * 獲取認證 Token
   */
  getAuthToken() {
    return localStorage.getItem('nexustrade_token') || sessionStorage.getItem('nexustrade_token');
  }

  /**
   * 獲取當前用戶
   */
  getCurrentUser() {
    try {
      if (window.currentUser) {
        return window.currentUser;
      }
      
      const userStr = localStorage.getItem('nexustrade_user') || sessionStorage.getItem('nexustrade_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('❌ 取得使用者資訊失敗:', error);
      return null;
    }
  }

  /**
   * 檢查配額限制
   */
  checkQuotaLimit() {
    const currentUser = this.getCurrentUser();
    const membershipType = currentUser?.membershipType || 'free';
    const alertCount = this.existingAlerts.length;
    
    const maxAlerts = {
      free: 1,
      premium: 50,
      enterprise: Infinity
    }[membershipType];
    
    return {
      canAddMore: alertCount < maxAlerts,
      currentCount: alertCount,
      maxCount: maxAlerts,
      membershipType
    };
  }

  /**
   * 增強版渲染 (繼承原有邏輯，但加入增強功能)
   */
  renderEnhanced() {
    // 移除現有模態框
    const existingModal = document.getElementById('price-alert-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // 使用原有的渲染邏輯，但添加增強樣式
    const modalHTML = this.generateEnhancedModalHTML();
    
    const modalElement = document.createElement('div');
    modalElement.innerHTML = modalHTML;
    const modal = modalElement.firstElementChild;
    
    modal.style.zIndex = '999999';
    modal.style.position = 'fixed';
    
    document.body.appendChild(modal);
    this.addEnhancedStyles();
  }

  /**
   * 生成增強版模態框 HTML
   */
  generateEnhancedModalHTML() {
    return `
      <div id="price-alert-modal" class="price-alert-modal enhanced">
        <div class="modal-overlay" onclick="window.enhancedPriceAlertModal.hide()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>🔔 ${this.currentSymbol} 通知設定</h3>
            <button class="close-btn" onclick="window.enhancedPriceAlertModal.hide()">×</button>
          </div>
          
          <div class="modal-body">
            ${this.renderLoadingStates()}
            ${this.renderExistingAlertsEnhanced()}
            ${this.renderAlertFormEnhanced()}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染載入狀態占位符
   */
  renderLoadingStates() {
    return `
      <div class="loading-states">
        <!-- 載入狀態將動態插入此處 -->
      </div>
    `;
  }

  /**
   * 渲染增強版警報表單
   */
  renderAlertFormEnhanced() {
    const currentUser = this.getCurrentUser();
    const token = this.getAuthToken();
    const isAuthenticated = !!(token && currentUser);
    
    if (!isAuthenticated) {
      return this.renderLoginRequired();
    }

    return `
      <div class="alert-form enhanced">
        <h4>⚙️ 管理通知設定</h4>
        
        <form id="price-alert-form" class="enhanced-form" novalidate>
          ${this.renderMembershipStatusEnhanced()}
          ${this.renderAlertTypeSection()}
          ${this.renderTargetPriceSection()}
          ${this.renderAISubscriptionSection()}
          ${this.renderLineConnectionStatus()}
          ${this.renderFormActions()}
        </form>
      </div>
    `;
  }

  /**
   * 渲染警報類型選擇
   */
  renderAlertTypeSection() {
    return `
      <div class="form-group enhanced">
        <label class="form-label">
          <span class="label-text">通知類型</span>
          <span class="label-required">*</span>
        </label>
        <div class="alert-type-options">
          <label class="radio-option enhanced">
            <input type="radio" name="alertType" value="price_above" checked>
            <span class="radio-indicator"></span>
            <span class="option-content">
              <span class="option-icon">📈</span>
              <span class="option-text">價格上穿</span>
            </span>
          </label>
          <label class="radio-option enhanced">
            <input type="radio" name="alertType" value="price_below">
            <span class="radio-indicator"></span>
            <span class="option-content">
              <span class="option-icon">📉</span>
              <span class="option-text">價格下穿</span>
            </span>
          </label>
        </div>
        <div class="form-hint">
          🔒 技術指標警報 (RSI、MACD、布林通道等) 需要付費會員
        </div>
      </div>
    `;
  }

  /**
   * 渲染目標價格輸入
   */
  renderTargetPriceSection() {
    return `
      <div class="form-group enhanced" id="target-price-group">
        <label for="target-price" class="form-label">
          <span class="label-text">目標價格 (USD)</span>
          <span class="label-required">*</span>
        </label>
        <div class="input-wrapper">
          <input type="number" 
                 id="target-price" 
                 name="targetPrice" 
                 class="form-input enhanced"
                 value="${this.currentPrice || ''}" 
                 placeholder="例如: 50000" 
                 step="0.01" 
                 min="0" 
                 required>
          <div class="input-feedback">
            ${this.currentPrice ? `<span class="current-price">當前價格: $${this.currentPrice.toLocaleString()}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染 AI 訂閱選項
   */
  renderAISubscriptionSection() {
    return `
      <div class="form-group enhanced">
        <label class="checkbox-option enhanced">
          <input type="checkbox" id="ai-subscription" name="aiSubscription">
          <span class="checkbox-indicator"></span>
          <span class="option-content">
            <span class="option-icon">🤖</span>
            <span class="option-text">訂閱每日 AI 分析通知</span>
          </span>
        </label>
        <div class="form-hint">每日早上7點接收 AI 技術分析報告</div>
      </div>
    `;
  }

  /**
   * 渲染表單操作按鈕
   */
  renderFormActions() {
    return `
      <div class="form-actions enhanced">
        <button type="button" class="btn btn-secondary enhanced" onclick="window.enhancedPriceAlertModal.hide()">
          <span class="btn-icon">✖️</span>
          <span class="btn-text">取消</span>
        </button>
        <button type="submit" class="btn btn-primary enhanced">
          <span class="btn-icon">💾</span>
          <span class="btn-text">儲存設定</span>
        </button>
      </div>
    `;
  }

  /**
   * 設置增強版事件監聽
   */
  setupEnhancedEventListeners() {
    const form = document.getElementById('price-alert-form');
    if (form) {
      form.addEventListener('submit', this.handleSubmit);
      
      // 即時驗證
      const inputs = form.querySelectorAll('input');
      inputs.forEach(input => {
        input.addEventListener('blur', () => this.validateField(input));
        input.addEventListener('input', () => this.clearFieldError(input));
      });
    }

    // ESC 鍵關閉
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  /**
   * 驗證單個欄位
   */
  validateField(input) {
    const form = input.closest('form');
    if (!form) return;

    const validation = this.validateForm(form);
    const fieldName = input.name;
    const fieldError = validation.errors.find(error => error.field === fieldName);

    if (fieldError) {
      this.showFieldError(input, fieldError.message);
    } else {
      this.clearFieldError(input);
    }
  }

  /**
   * 顯示欄位錯誤
   */
  showFieldError(input, message) {
    input.classList.add('input-error');
    
    const existingError = input.parentNode.querySelector('.form-error');
    if (existingError) {
      existingError.textContent = message;
    } else {
      const errorElement = document.createElement('div');
      errorElement.className = 'form-error';
      errorElement.textContent = message;
      input.parentNode.appendChild(errorElement);
    }
  }

  /**
   * 清除欄位錯誤
   */
  clearFieldError(input) {
    input.classList.remove('input-error');
    const errorElement = input.parentNode.querySelector('.form-error');
    if (errorElement) {
      errorElement.remove();
    }
  }

  /**
   * 顯示模態框動畫
   */
  showModalWithAnimation() {
    const modal = document.getElementById('price-alert-modal');
    if (modal) {
      modal.style.display = 'flex';
      setTimeout(() => {
        modal.classList.add('show');
      }, 10);
    }
  }

  /**
   * 隱藏模態框
   */
  hide() {
    if (!this.isVisible) return;
    
    // 隱藏所有載入狀態
    this.loadingStates.forEach(id => this.hideLoading(id));
    
    const modal = document.getElementById('price-alert-modal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
        modal.remove();
      }, 300);
    }
    
    this.isVisible = false;
    this.currentSymbol = null;
    this.existingAlerts = [];
    this.validationErrors.clear();
  }

  /**
   * 處理認證狀態更新
   */
  async handleAuthStateUpdate(event) {
    if (!this.isVisible) return;
    
    console.log('🔄 增強版價格警報檢測到認證狀態更新');
    const newAuthState = event.detail;
    
    if (this.isLineConnected !== newAuthState.isBound) {
      console.log(`📱 LINE 狀態變化: ${this.isLineConnected} → ${newAuthState.isBound}`);
      this.isLineConnected = newAuthState.isBound;
      
      // 重新渲染
      this.renderEnhanced();
      this.setupEnhancedEventListeners();
    }
  }

  // 繼承其他必要方法 (renderExistingAlertsEnhanced, renderMembershipStatusEnhanced 等)
  renderExistingAlertsEnhanced() {
    // 使用原有邏輯但加入增強樣式
    if (this.existingAlerts.length === 0) {
      return `
        <div class="existing-alerts enhanced empty">
          <h4>📋 目前設定</h4>
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <p class="empty-message">尚未設定任何通知</p>
            <p class="empty-hint">設定您的第一個價格警報來接收即時通知</p>
          </div>
        </div>
      `;
    }

    const alertsHTML = this.existingAlerts.map(alert => {
      const alertTypeText = this.getAlertTypeText(alert.alertType);
      const statusIcon = alert.status === 'active' ? '✅' : '⏸️';
      
      return `
        <div class="alert-item enhanced" data-alert-id="${alert.id}">
          <div class="alert-info">
            <div class="alert-status">
              <span class="status-icon">${statusIcon}</span>
              <span class="alert-type">${alertTypeText}</span>
            </div>
            <div class="alert-details">
              ${alert.targetPrice ? `<span class="target-price">$${alert.targetPrice.toLocaleString()}</span>` : ''}
              ${alert.aiAnalysisSubscription?.enabled ? '<span class="ai-badge">🤖 AI分析</span>' : ''}
            </div>
          </div>
          <button class="delete-alert-btn enhanced" onclick="window.enhancedPriceAlertModal.deleteAlert('${alert.id}')" title="刪除警報">
            🗑️
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="existing-alerts enhanced">
        <h4>📋 目前設定 (${this.existingAlerts.length})</h4>
        <div class="alerts-list">
          ${alertsHTML}
        </div>
      </div>
    `;
  }

  renderMembershipStatusEnhanced() {
    // 繼承原有邏輯但加入增強樣式
    const currentUser = this.getCurrentUser();
    const membershipType = currentUser?.membershipType || 'free';
    const alertCount = this.existingAlerts.length;
    
    const membershipConfig = {
      free: {
        name: '免費會員',
        icon: '💎',
        maxAlerts: 1,
        color: 'blue'
      },
      premium: {
        name: '付費會員',
        icon: '🚀',
        maxAlerts: 50,
        color: 'purple'
      },
      enterprise: {
        name: '企業會員',
        icon: '👑',
        maxAlerts: Infinity,
        color: 'gold'
      }
    };
    
    const config = membershipConfig[membershipType];
    const isQuotaExceeded = alertCount >= config.maxAlerts;
    const remainingQuota = config.maxAlerts === Infinity ? '無限制' : Math.max(0, config.maxAlerts - alertCount);
    
    return `
      <div class="membership-notice enhanced ${config.color}">
        <div class="membership-header">
          <span class="membership-icon">${config.icon}</span>
          <span class="membership-name">${config.name}</span>
          ${isQuotaExceeded ? '<span class="quota-warning">⚠️ 已達上限</span>' : ''}
        </div>
        
        <div class="quota-info">
          <div class="quota-bar">
            <div class="quota-fill" style="width: ${config.maxAlerts === Infinity ? 0 : (alertCount / config.maxAlerts * 100)}%"></div>
          </div>
          <div class="quota-text">
            <span>警報配額: ${alertCount}/${config.maxAlerts === Infinity ? '∞' : config.maxAlerts}</span>
            ${!isQuotaExceeded && config.maxAlerts !== Infinity ? 
              `<span class="quota-remaining">還可設定 ${remainingQuota} 個</span>` : ''
            }
          </div>
        </div>
        
        ${isQuotaExceeded ? `
          <div class="quota-exceeded-actions">
            <p>已達到警報數量上限，請刪除現有警報或升級會員方案</p>
            <button type="button" class="btn btn-upgrade" onclick="window.enhancedPriceAlertModal.showUpgradeModal('${membershipType}')">
              升級會員方案
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  // 其他輔助方法...
  renderLoginRequired() {
    return `
      <div class="login-required enhanced">
        <div class="login-icon">🔐</div>
        <h4>需要登入</h4>
        <p>設定通知功能需要使用 LINE 帳戶登入</p>
        <p>價格警報通知只能透過 LINE 傳送，請使用 LINE 帳戶登入</p>
        
        <div class="login-actions">
          <button type="button" class="btn btn-primary enhanced" onclick="window.enhancedPriceAlertModal.redirectToLineLogin()">
            <span class="btn-icon">📱</span>
            <span class="btn-text">LINE 登入</span>
          </button>
          <button type="button" class="btn btn-secondary enhanced" onclick="window.enhancedPriceAlertModal.hide()">
            <span class="btn-icon">⏰</span>
            <span class="btn-text">稍後再設定</span>
          </button>
        </div>
      </div>
    `;
  }

  renderLineConnectionStatus() {
    const currentUser = this.getCurrentUser();
    const isConnected = this.isLineConnected || 
                       !!(currentUser?.lineUserId || currentUser?.lineId || currentUser?.provider === 'line');
    
    if (isConnected) {
      return `
        <div class="line-status enhanced connected">
          <div class="status-indicator connected"></div>
          <div class="status-content">
            <span class="status-title">✅ LINE 已連結</span>
            <span class="status-description">將通過 LINE 接收通知訊息</span>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="line-status enhanced not-connected">
          <div class="status-indicator not-connected"></div>
          <div class="status-content">
            <span class="status-title">⚠️ LINE 未連結</span>
            <div class="status-description">
              警報將保存但不會收到 LINE 通知
              <button type="button" class="link-action" onclick="window.enhancedPriceAlertModal.redirectToLineLogin()">
                立即連結
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }

  getAlertTypeText(alertType) {
    const types = {
      'price_above': '價格上穿',
      'price_below': '價格下穿',
      'percent_change': '百分比變化',
      'volume_spike': '成交量激增'
    };
    return types[alertType] || alertType;
  }

  redirectToLineLogin() {
    console.log('🔗 重定向到 LINE 登入...');
    const currentState = {
      page: 'currency-detail',
      symbol: this.currentSymbol,
      action: 'price-alert'
    };
    sessionStorage.setItem('nexustrade_return_state', JSON.stringify(currentState));
    window.location.href = '/auth/line';
  }

  showUpgradeModal(currentPlan) {
    // 實施升級模態框邏輯
    console.log('升級模態框:', currentPlan);
  }

  checkLineConnectionFallback() {
    // 實施降級 LINE 連接檢查
  }

  deleteAlert(alertId) {
    // 實施刪除警報邏輯
  }

  /**
   * 添加增強版樣式
   */
  addEnhancedStyles() {
    const existingStyles = document.getElementById('enhanced-price-alert-styles');
    if (existingStyles) return;

    const styles = document.createElement('style');
    styles.id = 'enhanced-price-alert-styles';
    styles.textContent = `
      /* 增強版價格警報模態框樣式 */
      .price-alert-modal.enhanced {
        backdrop-filter: blur(12px);
      }

      .price-alert-modal.enhanced .modal-content {
        background: linear-gradient(135deg, var(--bg-secondary, #1a1d29) 0%, var(--bg-tertiary, #2d3748) 100%);
        border: 1px solid var(--border-color, #2d3748);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
      }

      /* 增強版表單樣式 */
      .enhanced-form .form-group.enhanced {
        margin-bottom: 24px;
      }

      .form-label {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 8px;
        font-weight: 600;
        color: var(--text-primary, #ffffff);
      }

      .label-required {
        color: var(--error-color, #e53e3e);
        font-size: 14px;
      }

      .input-wrapper {
        position: relative;
      }

      .form-input.enhanced {
        width: 100%;
        padding: 12px 16px;
        background: var(--bg-tertiary, #2d3748);
        border: 2px solid var(--border-color, #4a5568);
        border-radius: 8px;
        color: var(--text-primary, #ffffff);
        font-size: 16px;
        transition: all 0.3s ease;
      }

      .form-input.enhanced:focus {
        outline: none;
        border-color: var(--accent-color, #3182ce);
        box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
        background: var(--bg-secondary, #1a1d29);
      }

      .form-input.enhanced.input-error {
        border-color: var(--error-color, #e53e3e);
        box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1);
      }

      .input-feedback {
        margin-top: 6px;
        font-size: 14px;
      }

      .current-price {
        color: var(--text-secondary, #a0aec0);
      }

      .form-error {
        margin-top: 6px;
        color: var(--error-color, #e53e3e);
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .form-error::before {
        content: "⚠️";
        font-size: 12px;
      }

      .form-hint {
        margin-top: 8px;
        color: var(--text-secondary, #a0aec0);
        font-size: 13px;
        line-height: 1.4;
      }

      /* 增強版選項樣式 */
      .radio-option.enhanced,
      .checkbox-option.enhanced {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: var(--bg-tertiary, #2d3748);
        border: 2px solid var(--border-color, #4a5568);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .radio-option.enhanced:hover,
      .checkbox-option.enhanced:hover {
        background: var(--bg-quaternary, #4a5568);
        border-color: var(--accent-color, #3182ce);
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      }

      .radio-option.enhanced input:checked + .radio-indicator,
      .checkbox-option.enhanced input:checked + .checkbox-indicator {
        background: var(--accent-color, #3182ce);
        border-color: var(--accent-color, #3182ce);
      }

      .radio-indicator,
      .checkbox-indicator {
        width: 20px;
        height: 20px;
        border: 2px solid var(--border-color, #4a5568);
        border-radius: 50%;
        background: var(--bg-secondary, #1a1d29);
        position: relative;
        transition: all 0.3s ease;
        flex-shrink: 0;
      }

      .checkbox-indicator {
        border-radius: 4px;
      }

      .radio-indicator::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: white;
        transition: transform 0.2s ease;
      }

      .checkbox-indicator::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        color: white;
        font-size: 12px;
        font-weight: bold;
        transition: transform 0.2s ease;
      }

      .radio-option.enhanced input:checked + .radio-indicator::after,
      .checkbox-option.enhanced input:checked + .checkbox-indicator::after {
        transform: translate(-50%, -50%) scale(1);
      }

      .option-content {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }

      .option-icon {
        font-size: 18px;
      }

      .option-text {
        font-weight: 500;
        color: var(--text-primary, #ffffff);
      }

      /* 增強版按鈕樣式 */
      .btn.enhanced {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .btn.enhanced::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        transition: left 0.5s ease;
      }

      .btn.enhanced:hover::before {
        left: 100%;
      }

      .btn-primary.enhanced {
        background: linear-gradient(135deg, var(--accent-color, #3182ce) 0%, var(--success-color, #38a169) 100%);
        color: white;
        box-shadow: 0 4px 15px rgba(49, 130, 206, 0.3);
      }

      .btn-primary.enhanced:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(49, 130, 206, 0.4);
      }

      .btn-secondary.enhanced {
        background: var(--bg-tertiary, #2d3748);
        color: var(--text-primary, #ffffff);
        border: 2px solid var(--border-color, #4a5568);
      }

      .btn-secondary.enhanced:hover {
        background: var(--bg-quaternary, #4a5568);
        border-color: var(--accent-color, #3182ce);
        transform: translateY(-2px);
      }

      .btn-icon {
        font-size: 16px;
      }

      /* 增強版會員狀態 */
      .membership-notice.enhanced {
        margin-bottom: 24px;
        padding: 20px;
        border-radius: 12px;
        border: 2px solid;
        background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.05) 100%);
      }

      .membership-notice.enhanced.blue {
        border-color: var(--accent-color, #3182ce);
        background: linear-gradient(135deg, rgba(49, 130, 206, 0.1) 0%, rgba(49, 130, 206, 0.05) 100%);
      }

      .membership-notice.enhanced.purple {
        border-color: #9f7aea;
        background: linear-gradient(135deg, rgba(159, 122, 234, 0.1) 0%, rgba(159, 122, 234, 0.05) 100%);
      }

      .membership-notice.enhanced.gold {
        border-color: #ffd700;
        background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%);
      }

      .membership-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .membership-icon {
        font-size: 20px;
      }

      .membership-name {
        font-weight: 600;
        color: var(--text-primary, #ffffff);
      }

      .quota-warning {
        margin-left: auto;
        padding: 4px 8px;
        background: var(--error-color, #e53e3e);
        color: white;
        border-radius: 4px;
        font-size: 12px;
      }

      .quota-bar {
        width: 100%;
        height: 8px;
        background: var(--bg-tertiary, #2d3748);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
      }

      .quota-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--accent-color, #3182ce), var(--success-color, #38a169));
        border-radius: 4px;
        transition: width 0.3s ease;
      }

      .quota-text {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        color: var(--text-secondary, #a0aec0);
      }

      .quota-remaining {
        color: var(--success-color, #38a169);
        font-weight: 500;
      }

      /* 增強版現有警報 */
      .existing-alerts.enhanced {
        margin-bottom: 24px;
      }

      .existing-alerts.enhanced h4 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
        color: var(--text-primary, #ffffff);
        font-weight: 600;
      }

      .empty-state {
        text-align: center;
        padding: 40px 20px;
        background: var(--bg-tertiary, #2d3748);
        border-radius: 12px;
        border: 2px dashed var(--border-color, #4a5568);
      }

      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .empty-message {
        color: var(--text-primary, #ffffff);
        font-weight: 500;
        margin-bottom: 8px;
      }

      .empty-hint {
        color: var(--text-secondary, #a0aec0);
        font-size: 14px;
      }

      .alert-item.enhanced {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        background: var(--bg-tertiary, #2d3748);
        border: 2px solid var(--border-color, #4a5568);
        border-radius: 12px;
        margin-bottom: 12px;
        transition: all 0.3s ease;
      }

      .alert-item.enhanced:hover {
        background: var(--bg-quaternary, #4a5568);
        border-color: var(--accent-color, #3182ce);
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      }

      .alert-info {
        flex: 1;
      }

      .alert-status {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .status-icon {
        font-size: 16px;
      }

      .alert-type {
        font-weight: 500;
        color: var(--text-primary, #ffffff);
      }

      .alert-details {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .target-price {
        background: var(--accent-color, #3182ce);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
      }

      .ai-badge {
        background: var(--success-color, #38a169);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
      }

      .delete-alert-btn.enhanced {
        background: none;
        border: 2px solid transparent;
        color: var(--error-color, #e53e3e);
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        font-size: 16px;
        transition: all 0.3s ease;
      }

      .delete-alert-btn.enhanced:hover {
        background: rgba(229, 62, 62, 0.1);
        border-color: var(--error-color, #e53e3e);
        transform: scale(1.1);
      }

      /* LINE 狀態指示器 */
      .line-status.enhanced {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border-radius: 12px;
        border: 2px solid;
        margin-bottom: 24px;
      }

      .line-status.enhanced.connected {
        border-color: var(--success-color, #38a169);
        background: linear-gradient(135deg, rgba(56, 161, 105, 0.1) 0%, rgba(56, 161, 105, 0.05) 100%);
      }

      .line-status.enhanced.not-connected {
        border-color: var(--warning-color, #ffc107);
        background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%);
      }

      .status-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .status-indicator.connected {
        background: var(--success-color, #38a169);
        box-shadow: 0 0 8px rgba(56, 161, 105, 0.5);
      }

      .status-indicator.not-connected {
        background: var(--warning-color, #ffc107);
        box-shadow: 0 0 8px rgba(255, 193, 7, 0.5);
      }

      .status-content {
        flex: 1;
      }

      .status-title {
        display: block;
        font-weight: 600;
        color: var(--text-primary, #ffffff);
        margin-bottom: 4px;
      }

      .status-description {
        font-size: 14px;
        color: var(--text-secondary, #a0aec0);
      }

      .link-action {
        background: none;
        border: none;
        color: var(--accent-color, #3182ce);
        text-decoration: underline;
        cursor: pointer;
        font-size: 14px;
        margin-left: 8px;
      }

      .link-action:hover {
        color: var(--accent-color-dark, #2c5aa0);
      }

      /* 通知樣式 */
      .success-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, var(--success-color, #38a169) 0%, #2f855a 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 1000001;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease;
      }

      .success-notification.show {
        transform: translateX(0);
        opacity: 1;
      }

      .success-notification.hide {
        transform: translateX(100%);
        opacity: 0;
      }

      .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .success-icon {
        font-size: 20px;
      }

      .success-message {
        font-weight: 500;
      }

      /* 基本錯誤通知 */
      .basic-error-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--error-color, #e53e3e);
        color: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 1000001;
        max-width: 400px;
      }

      .error-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .error-icon {
        font-size: 20px;
        flex-shrink: 0;
      }

      .error-message {
        flex: 1;
        font-weight: 500;
      }

      .error-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 18px;
        padding: 4px;
        margin-left: 8px;
      }

      /* 響應式設計 */
      @media (max-width: 768px) {
        .alert-type-options {
          flex-direction: column;
          gap: 12px;
        }

        .form-actions.enhanced {
          flex-direction: column;
          gap: 12px;
        }

        .btn.enhanced {
          width: 100%;
          justify-content: center;
        }

        .alert-item.enhanced {
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
        }

        .alert-info {
          text-align: center;
        }

        .alert-details {
          justify-content: center;
        }

        .delete-alert-btn.enhanced {
          align-self: center;
        }
      }
    `;

    document.head.appendChild(styles);
  }
}

// 創建全域實例
window.EnhancedPriceAlertModal = EnhancedPriceAlertModal;
window.enhancedPriceAlertModal = new EnhancedPriceAlertModal();