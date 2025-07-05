/**
 * NexusTrade 價格警報設定模態框組件
 * 
 * 功能：
 * 1. 設定到價通知 (上穿/下穿)
 * 2. 訂閱每日 AI 分析通知
 * 3. LINE 通知設定
 * 4. 簡潔的使用者界面
 */

class PriceAlertModal {
  constructor() {
    this.currentSymbol = null;
    this.currentPrice = null;
    this.existingAlerts = [];
    this.isVisible = false;
    this.isLineConnected = false;
    
    // 綁定方法
    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleAlertTypeChange = this.handleAlertTypeChange.bind(this);
    this.handleAuthStateUpdate = this.handleAuthStateUpdate.bind(this);
    
    // 監聽認證狀態更新事件
    this.setupAuthStateListeners();
  }

  /**
   * 設定認證狀態監聽器
   */
  setupAuthStateListeners() {
    // 監聽認證狀態更新事件
    window.addEventListener('authStateUpdated', this.handleAuthStateUpdate);
    
    // 監聽認證過期事件
    window.addEventListener('authExpired', () => {
      console.log('🔒 檢測到認證過期，關閉價格警報模態框');
      if (this.isVisible) {
        this.hide();
      }
    });
  }

  /**
   * 處理認證狀態更新
   */
  async handleAuthStateUpdate(event) {
    if (!this.isVisible) return;
    
    console.log('🔄 價格警報模態框檢測到認證狀態更新');
    const newAuthState = event.detail;
    
    // 如果 LINE 連接狀態發生變化，重新渲染模態框
    if (this.isLineConnected !== newAuthState.isBound) {
      console.log(`📱 LINE 狀態變化: ${this.isLineConnected} → ${newAuthState.isBound}`);
      this.isLineConnected = newAuthState.isBound;
      
      // 重新渲染模態框內容
      this.render();
      this.setupEventListeners();
    }
  }

  /**
   * 顯示設定模態框
   */
  async show(symbol) {
    if (this.isVisible) return;
    
    this.currentSymbol = symbol;
    this.isVisible = true;
    
    console.log(`🔔 顯示 ${symbol} 價格警報設定`);
    
    try {
      // 載入當前價格
      await this.loadCurrentPrice();
      
      // 檢查 LINE 連接狀態
      await this.checkLineConnectionStatus();
      
      // 載入現有警報
      await this.loadExistingAlerts();
      
      // 渲染模態框
      this.render();
      
      // 設定事件監聽
      this.setupEventListeners();
      
      // 顯示模態框
      const modal = document.getElementById('price-alert-modal');
      if (modal) {
        modal.style.display = 'flex';
        // 添加淡入動畫
        setTimeout(() => {
          modal.classList.add('show');
        }, 10);
      }
      
    } catch (error) {
      console.error('❌ 顯示價格警報模態框失敗:', error);
      this.showError('載入警報設定失敗');
    }
  }

  /**
   * 隱藏模態框
   */
  hide() {
    if (!this.isVisible) return;
    
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
  }

  /**
   * 載入當前價格
   */
  async loadCurrentPrice() {
    try {
      const response = await fetch(`/api/market/ticker/${this.currentSymbol}`);
      if (response.ok) {
        const data = await response.json();
        this.currentPrice = parseFloat(data.data?.price || data.price || 0);
        console.log(`💰 載入 ${this.currentSymbol} 當前價格: $${this.currentPrice}`);
      } else {
        this.currentPrice = null;
        console.warn('⚠️ 無法載入當前價格');
      }
    } catch (error) {
      console.error('❌ 載入當前價格失敗:', error);
      this.currentPrice = null;
    }
  }

  /**
   * 檢查 LINE 連接狀態 - 使用狀態管理器確保一致性
   */
  async checkLineConnectionStatus() {
    try {
      console.log('🔍 檢查 LINE 連接狀態 (使用狀態管理器)');
      
      // 使用 AuthStateManager 確保狀態一致性
      if (window.authStateManager) {
        // 首先驗證狀態一致性
        await window.authStateManager.validateAuthState();
        
        // 等待狀態穩定
        const authState = await window.authStateManager.waitForAuthStability();
        
        this.isLineConnected = authState.isBound;
        console.log(`📱 LINE 連接狀態 (經過狀態管理器驗證): ${this.isLineConnected ? '已連接' : '未連接'}`);
        
        // 如果狀態不一致，嘗試強制重新整理
        if (!authState.isAuthenticated) {
          console.log('🔄 檢測到未認證狀態，嘗試強制重新整理');
          const refreshResult = await window.authStateManager.forceAuthStateRefresh();
          if (refreshResult) {
            const newState = window.authStateManager.getLocalAuthState();
            this.isLineConnected = newState.isBound;
            console.log(`📱 重新整理後 LINE 狀態: ${this.isLineConnected ? '已連接' : '未連接'}`);
          } else {
            console.log('🔒 強制重新整理失敗，可能需要重新登入');
            this.isLineConnected = false;
          }
        }
      } else {
        // 降級處理：如果狀態管理器不可用，使用原有邏輯
        console.warn('⚠️ AuthStateManager 不可用，使用降級邏輯');
        await this.checkLineConnectionStatusFallback();
      }
      
      // 開發環境 URL 參數覆蓋
      const isDevelopment = window.location.hostname === 'localhost';
      if (isDevelopment) {
        const urlParams = new URLSearchParams(window.location.search);
        const urlOverride = urlParams.get('line_connected');
        if (urlOverride !== null) {
          this.isLineConnected = urlOverride === 'true';
          console.log(`🔧 URL 參數覆蓋: LINE 連接狀態設為 ${this.isLineConnected ? '已連接' : '未連接'}`);
        }
      }
      
    } catch (error) {
      console.error('❌ 檢查 LINE 連接狀態失敗:', error);
      this.isLineConnected = false;
    }
  }

  /**
   * 降級邏輯：不使用狀態管理器的原有檢查邏輯
   */
  async checkLineConnectionStatusFallback() {
    try {
      const token = localStorage.getItem('nexustrade_token') || sessionStorage.getItem('nexustrade_token');
      
      if (!token) {
        console.log('📱 未找到認證 token，LINE 未連接');
        this.isLineConnected = false;
        return;
      }
      
      const currentUser = this.getCurrentUser();
      const userId = currentUser?.id || currentUser?._id;
      if (!currentUser || !userId) {
        console.log('📱 使用者未登入或無使用者 ID，LINE 未連接');
        this.isLineConnected = false;
        return;
      }
      
      const response = await fetch('/api/line/bind/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.isLineConnected = data.data?.isBound || false;
        console.log(`📱 LINE 連接狀態: ${this.isLineConnected ? '已連接' : '未連接'}`);
      } else if (response.status === 401) {
        console.log('📱 認證失敗，token 可能已過期，LINE 未連接');
        this.isLineConnected = false;
        localStorage.removeItem('nexustrade_token');
        sessionStorage.removeItem('nexustrade_token');
      } else {
        console.warn('⚠️ 無法檢查 LINE 連接狀態，假設未連接');
        this.isLineConnected = false;
      }
    } catch (error) {
      console.error('❌ 降級檢查 LINE 連接狀態失敗:', error);
      this.isLineConnected = false;
    }
  }
  
  /**
   * 取得當前使用者資訊
   */
  getCurrentUser() {
    try {
      // 從全域變數或 localStorage 取得使用者資訊
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
   * 載入現有警報
   */
  async loadExistingAlerts() {
    try {
      const token = localStorage.getItem('nexustrade_token') || sessionStorage.getItem('nexustrade_token');
      
      const response = await fetch(`/api/notifications/alerts/${this.currentSymbol}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.existingAlerts = data.data.alerts || [];
        console.log(`📊 載入 ${this.currentSymbol} 現有警報:`, this.existingAlerts);
      }
    } catch (error) {
      console.error('❌ 載入現有警報失敗:', error);
      this.existingAlerts = [];
    }
  }

  /**
   * 渲染模態框
   */
  render() {
    const existingModal = document.getElementById('price-alert-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modalHTML = `
      <div id="price-alert-modal" class="price-alert-modal">
        <div class="modal-overlay" onclick="window.priceAlertModal.hide()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>🔔 ${this.currentSymbol} 通知設定</h3>
            <button class="close-btn" onclick="window.priceAlertModal.hide()">×</button>
          </div>
          
          <div class="modal-body">
            ${this.renderExistingAlerts()}
            ${this.renderAlertForm()}
          </div>
        </div>
      </div>
    `;

    // 確保模態框插入到 body 的最頂層
    const modalElement = document.createElement('div');
    modalElement.innerHTML = modalHTML;
    const modal = modalElement.firstElementChild;
    
    // 確保模態框不被其他樣式影響
    modal.style.zIndex = '999999';
    modal.style.position = 'fixed';
    
    document.body.appendChild(modal);
    this.addModalStyles();
  }

  /**
   * 渲染現有警報
   */
  renderExistingAlerts() {
    if (this.existingAlerts.length === 0) {
      return `
        <div class="existing-alerts">
          <h4>📋 目前設定</h4>
          <p class="no-alerts">尚未設定任何通知</p>
        </div>
      `;
    }

    const alertsHTML = this.existingAlerts.map(alert => {
      const alertTypeText = this.getAlertTypeText(alert.alertType);
      const statusIcon = alert.status === 'active' ? '✅' : '⏸️';
      
      return `
        <div class="alert-item" data-alert-id="${alert.id}">
          <div class="alert-info">
            <span class="alert-type">${statusIcon} ${alertTypeText}</span>
            ${alert.targetPrice ? `<span class="target-price">$${alert.targetPrice.toLocaleString()}</span>` : ''}
            ${alert.aiAnalysisSubscription?.enabled ? '<span class="ai-badge">🤖 AI分析</span>' : ''}
          </div>
          <button class="delete-alert-btn" onclick="window.priceAlertModal.deleteAlert('${alert.id}')">
            🗑️
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="existing-alerts">
        <h4>📋 目前設定</h4>
        <div class="alerts-list">
          ${alertsHTML}
        </div>
      </div>
    `;
  }

  /**
   * 渲染警報設定表單
   */
  renderAlertForm() {
    // 檢查使用者是否已認證
    const currentUser = this.getCurrentUser();
    const token = localStorage.getItem('nexustrade_token') || sessionStorage.getItem('nexustrade_token');
    const isAuthenticated = !!(token && currentUser);
    
    // 如果使用者未認證，顯示登入提示
    if (!isAuthenticated) {
      return `
        <div class="alert-form">
          <h4>🔐 需要登入</h4>
          
          <div class="line-login-prompt">
            <div class="login-message">
              <p>⚠️ 設定通知功能需要使用 LINE 帳戶登入</p>
              <p>價格警報通知只能透過 LINE 傳送，請使用 LINE 帳戶登入</p>
            </div>
            
            <div class="login-actions">
              <button type="button" class="btn btn-primary" onclick="window.priceAlertModal.redirectToLineLogin()">
                📱 LINE 登入
              </button>
              <button type="button" class="btn btn-secondary" onclick="window.priceAlertModal.hide()">
                稍後再設定
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // 使用者已認證但 LINE 未連接，顯示 LINE 連接提示（可選）
    if (!this.isLineConnected) {
      console.log('⚠️ LINE 未連接，但允許用戶選擇是否連接或直接設定警報');
      
      // 緊急修復：直接顯示完整表單，不再阻擋用戶
      // 在表單中加入 LINE 連接提示作為可選項目
    }

    // LINE 已連接，顯示完整表單
    const formTitle = this.existingAlerts.length > 0 ? '⚙️ 管理通知設定' : '➕ 新增通知';
    
    return `
      <div class="alert-form">
        <h4>${formTitle}</h4>
        
        <form id="price-alert-form">
          <!-- 會員限制提示 -->
          ${this.renderMembershipStatus()}
          

          <!-- 警報類型選擇 -->
          <div class="form-group">
            <label>通知類型</label>
            <div class="alert-type-options">
              <label class="radio-option">
                <input type="radio" name="alertType" value="price_above" checked>
                <span>📈 價格上穿</span>
              </label>
              <label class="radio-option">
                <input type="radio" name="alertType" value="price_below">
                <span>📉 價格下穿</span>
              </label>
            </div>
            <small class="help-text">
              🔒 技術指標警報 (RSI、MACD、布林通道等) 需要付費會員
            </small>
          </div>

          <!-- 目標價格 -->
          <div class="form-group" id="target-price-group">
            <label for="target-price">目標價格 (USD)</label>
            <input type="number" id="target-price" name="targetPrice" 
                   value="${this.currentPrice || ''}" 
                   placeholder="例如: 50000" step="0.01" min="0" required>
            ${this.currentPrice ? `<small class="help-text">當前價格: $${this.currentPrice.toLocaleString()}</small>` : ''}
          </div>

          <!-- AI 分析訂閱 -->
          <div class="form-group">
            <label class="checkbox-option">
              <input type="checkbox" id="ai-subscription" name="aiSubscription">
              <span>🤖 訂閱每日 AI 分析通知</span>
            </label>
            <small class="help-text">每日早上7點接收 AI 技術分析報告</small>
          </div>

          <!-- LINE 通知設定 -->
          <div class="form-group">
            ${this.renderLineConnectionStatus()}
          </div>

          <!-- 提交按鈕 -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="window.priceAlertModal.hide()">
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              ${this.existingAlerts.length > 0 ? '📝 新增警報' : '💾 儲存設定'}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * 設定事件監聽
   */
  setupEventListeners() {
    const form = document.getElementById('price-alert-form');
    if (form) {
      form.addEventListener('submit', this.handleSubmit);
    }

    // 警報類型變更事件
    const alertTypeInputs = document.querySelectorAll('input[name="alertType"]');
    alertTypeInputs.forEach(input => {
      input.addEventListener('change', this.handleAlertTypeChange);
    });

    // ESC 鍵關閉
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  /**
   * 警報類型變更處理
   */
  handleAlertTypeChange(event) {
    const alertType = event.target.value;
    const targetPriceGroup = document.getElementById('target-price-group');
    const targetPriceInput = document.getElementById('target-price');

    if (alertType === 'price_above' || alertType === 'price_below') {
      targetPriceGroup.style.display = 'block';
      targetPriceInput.required = true;
    } else {
      targetPriceGroup.style.display = 'none';
      targetPriceInput.required = false;
    }
  }

  /**
   * 表單提交處理
   */
  async handleSubmit(event) {
    event.preventDefault();
    
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
          enabled: formData.get('lineNotification') === 'on'
        }
      }
    };

    console.log('📝 提交警報設定:', alertData);

    try {
      // 檢查配額限制
      const quotaCheck = this.checkQuotaLimit();
      if (!quotaCheck.canAddMore) {
        const membershipTypes = {
          free: '免費會員',
          premium: '付費會員',
          enterprise: '企業會員'
        };
        
        this.showError(`⚠️ 配額已滿：${membershipTypes[quotaCheck.membershipType]}最多可設定 ${quotaCheck.maxCount} 個警報。請刪除現有警報或升級會員方案。`);
        
        // 顯示升級提示
        setTimeout(() => {
          this.showUpgradeModal(quotaCheck.membershipType);
        }, 2000);
        
        return;
      }
      
      await this.saveAlert(alertData);
    } catch (error) {
      console.error('❌ 儲存警報失敗:', error);
      this.showError('儲存警報設定失敗');
    }
  }

  /**
   * 儲存警報
   */
  async saveAlert(alertData) {
    this.showLoading(true);

    try {
      const token = localStorage.getItem('nexustrade_token') || sessionStorage.getItem('nexustrade_token');
      
      const response = await fetch('/api/notifications/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(alertData)
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ 警報儲存成功:', result);
        this.showSuccess('警報設定成功！');
        
        // 重新載入現有警報
        await this.loadExistingAlerts();
        
        // 發送警報狀態更新事件
        this.dispatchAlertStatusUpdateEvent();
        
        // 重新渲染
        setTimeout(() => {
          this.render();
          this.setupEventListeners();
        }, 1000);
        
      } else {
        console.error('❌ 警報儲存失敗:', result);
        this.showError(result.message || '儲存失敗');
      }
    } catch (error) {
      console.error('❌ 網路錯誤:', error);
      this.showError('網路連線錯誤');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * 刪除警報
   */
  async deleteAlert(alertId) {
    if (!alertId) {
      console.error('❌ deleteAlert: 警報 ID 為空', { alertId });
      this.showError('警報 ID 無效，無法刪除');
      return;
    }

    console.log('🗑️ 開始刪除警報:', { alertId, symbol: this.currentSymbol });
    
    if (!confirm('確定要刪除這個警報嗎？')) {
      console.log('🚫 用戶取消刪除操作');
      return;
    }

    try {
      const token = localStorage.getItem('nexustrade_token') || sessionStorage.getItem('nexustrade_token');
      
      if (!token) {
        console.error('❌ deleteAlert: 找不到認證 token');
        this.showError('請先登入');
        return;
      }

      console.log('📡 發送刪除請求:', { 
        url: `/api/notifications/alerts/${alertId}`,
        method: 'DELETE',
        hasToken: !!token
      });
      
      const response = await fetch(`/api/notifications/alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📨 刪除 API 回應:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ 警報刪除成功:', responseData);
        this.showSuccess('警報已刪除');
        
        // 重新載入並渲染
        await this.loadExistingAlerts();
        
        // 發送警報狀態更新事件
        this.dispatchAlertStatusUpdateEvent();
        
        this.render();
        this.setupEventListeners();
      } else {
        let errorMessage = '刪除失敗';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('❌ 刪除 API 錯誤回應:', errorData);
        } catch (parseError) {
          console.error('❌ 無法解析錯誤回應:', parseError);
        }
        
        console.error('❌ 刪除請求失敗:', {
          status: response.status,
          statusText: response.statusText,
          alertId
        });
        
        this.showError(`刪除失敗: ${errorMessage} (HTTP ${response.status})`);
      }
    } catch (error) {
      console.error('❌ 刪除警報網路錯誤:', {
        error: error.message,
        stack: error.stack,
        alertId,
        currentSymbol: this.currentSymbol
      });
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        this.showError('網路連線錯誤，請檢查網路狀態');
      } else {
        this.showError(`刪除失敗: ${error.message}`);
      }
    }
  }

  /**
   * 取得警報類型文字
   */
  getAlertTypeText(alertType) {
    const types = {
      'price_above': '價格上穿',
      'price_below': '價格下穿',
      'percent_change': '百分比變化',
      'volume_spike': '成交量激增'
    };
    return types[alertType] || alertType;
  }

  /**
   * 顯示載入狀態
   */
  showLoading(show) {
    const submitBtn = document.querySelector('#price-alert-form button[type="submit"]');
    if (submitBtn) {
      if (show) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ 儲存中...';
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '💾 儲存設定';
      }
    }
  }

  /**
   * 顯示成功訊息
   */
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  /**
   * 顯示錯誤訊息
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * 顯示通知訊息
   */
  showNotification(message, type = 'info') {
    // 移除現有通知
    const existing = document.querySelector('.alert-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `alert-notification ${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()">×</button>
    `;

    document.body.appendChild(notification);

    // 自動移除
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 3000);
  }

  /**
   * 重定向到 LINE 登入頁面
   */
  redirectToLineLogin() {
    console.log('🔗 重定向到 LINE 登入...');
    
    // 儲存當前頁面狀態，登入完成後返回
    const currentState = {
      page: 'currency-detail',
      symbol: this.currentSymbol,
      action: 'price-alert'
    };
    
    sessionStorage.setItem('nexustrade_return_state', JSON.stringify(currentState));
    
    // 重定向到 LINE OAuth 登入
    window.location.href = '/auth/line';
  }

  /**
   * 重定向到一般登入頁面
   */
  redirectToLogin() {
    console.log('🔗 重定向到登入頁面...');
    // 預設使用 LINE 登入（因為是通知功能）
    this.redirectToLineLogin();
  }

  redirectToGoogleLogin() {
    console.log('🔐 重定向到 Google 登入...');
    this.saveCurrentState();
    this.hide();
    window.location.href = '/auth/google';
  }

  saveCurrentState() {
    // 儲存當前頁面狀態，登入完成後返回
    const currentState = {
      page: 'currency-detail',
      symbol: this.currentSymbol,
      action: 'price-alert'
    };
    sessionStorage.setItem('nexustrade_return_state', JSON.stringify(currentState));
  }

  /**
   * 渲染 LINE 連接狀態
   */
  renderLineConnectionStatus() {
    const currentUser = this.getCurrentUser();
    const isConnected = this.isLineConnected || 
                       !!(currentUser?.lineUserId || currentUser?.lineId || currentUser?.provider === 'line');
    
    if (isConnected) {
      return `
        <div class="line-connected-status connected">
          <span class="status-badge connected">✅ LINE 已連結</span>
          <small class="help-text">將通過 LINE 接收通知訊息</small>
        </div>
      `;
    } else {
      return `
        <div class="line-connected-status not-connected">
          <span class="status-badge not-connected">⚠️ LINE 未連結</span>
          <small class="help-text">
            警報將保存但不會收到 LINE 通知 
            <button type="button" class="link-btn" onclick="window.priceAlertModal.redirectToLineLogin()">
              立即連結
            </button>
          </small>
        </div>
      `;
    }
  }

  /**
   * 直接顯示警報設定表單（忽略 LINE 連接狀態）
   */
  showAlertFormDirectly() {
    console.log('📝 直接顯示警報設定表單...');
    
    // 暫時設定 LINE 為已連接狀態，強制顯示表單
    const originalLineConnected = this.isLineConnected;
    this.isLineConnected = true;
    
    // 重新渲染表單
    this.render();
    this.setupEventListeners();
    
    // 恢復原始狀態（但保持表單顯示）
    this.isLineConnected = originalLineConnected;
  }

  /**
   * 添加模態框樣式
   */
  addModalStyles() {
    const existingStyles = document.getElementById('price-alert-modal-styles');
    if (existingStyles) return;

    const styles = document.createElement('style');
    styles.id = 'price-alert-modal-styles';
    styles.textContent = `
      .price-alert-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999999;
        justify-content: center;
        align-items: center;
        opacity: 0;
        transition: opacity 0.3s ease;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
      }

      .price-alert-modal.show {
        opacity: 1;
      }

      .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: transparent;
      }

      .modal-content {
        position: relative;
        z-index: 1000000;
        background: var(--bg-secondary, #1a1d29);
        border: 1px solid var(--border-color, #2d3748);
        border-radius: 12px;
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        color: var(--text-primary, #ffffff);
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }

      .price-alert-modal.show .modal-content {
        transform: scale(1);
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid var(--border-color, #2d3748);
      }

      .modal-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: var(--text-secondary, #a0aec0);
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
      }

      .close-btn:hover {
        background: var(--bg-tertiary, #2d3748);
        color: var(--text-primary, #ffffff);
      }

      .modal-body {
        padding: 20px;
      }

      .existing-alerts {
        margin-bottom: 20px;
      }

      .existing-alerts h4 {
        margin: 0 0 10px 0;
        font-size: 1rem;
        color: var(--text-primary, #ffffff);
      }

      .no-alerts {
        color: var(--text-secondary, #a0aec0);
        font-style: italic;
        text-align: center;
        padding: 20px;
        background: var(--bg-tertiary, #2d3748);
        border-radius: 8px;
      }

      .alerts-list {
        space-y: 8px;
      }

      .alert-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: var(--bg-tertiary, #2d3748);
        border-radius: 8px;
        margin-bottom: 8px;
      }

      .alert-info {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }

      .alert-type {
        font-weight: 500;
      }

      .target-price {
        background: var(--accent-color, #3182ce);
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.875rem;
      }

      .ai-badge {
        background: var(--success-color, #38a169);
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.875rem;
      }

      .delete-alert-btn {
        background: none;
        border: none;
        color: var(--error-color, #e53e3e);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background 0.2s;
      }

      .delete-alert-btn:hover {
        background: rgba(229, 62, 62, 0.1);
      }

      .alert-form h4 {
        margin: 0 0 15px 0;
        font-size: 1rem;
        color: var(--text-primary, #ffffff);
        padding-top: 15px;
        border-top: 1px solid var(--border-color, #2d3748);
      }

      .membership-notice {
        margin-bottom: 20px;
      }

      .notice-box {
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 16px;
      }

      .notice-box.free-member {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .notice-box h5 {
        margin: 0 0 8px 0;
        font-size: 0.95rem;
        font-weight: 600;
      }

      .notice-box p {
        margin: 4px 0;
        font-size: 0.875rem;
        line-height: 1.4;
      }

      .upgrade-btn {
        margin-top: 12px;
        padding: 8px 16px;
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        color: white;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .upgrade-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
      }

      .form-group {
        margin-bottom: 16px;
      }

      .form-group label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        color: var(--text-primary, #ffffff);
      }

      .form-group input[type="number"] {
        width: 100%;
        padding: 10px 12px;
        background: var(--bg-tertiary, #2d3748);
        border: 1px solid var(--border-color, #4a5568);
        border-radius: 6px;
        color: var(--text-primary, #ffffff);
        font-size: 14px;
        transition: border-color 0.2s;
      }

      .form-group input[type="number"]:focus {
        outline: none;
        border-color: var(--accent-color, #3182ce);
        box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
      }

      .alert-type-options {
        display: flex;
        gap: 12px;
      }

      .radio-option, .checkbox-option {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        padding: 8px 12px;
        background: var(--bg-tertiary, #2d3748);
        border-radius: 6px;
        transition: background 0.2s;
      }

      .radio-option:hover, .checkbox-option:hover {
        background: var(--bg-quaternary, #4a5568);
      }

      .radio-option input, .checkbox-option input {
        margin: 0;
      }

      .help-text {
        display: block;
        margin-top: 4px;
        color: var(--text-secondary, #a0aec0);
        font-size: 0.875rem;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid var(--border-color, #2d3748);
      }

      .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .btn-primary {
        background: var(--accent-color, #3182ce);
        color: white;
      }

      .btn-primary:hover {
        background: var(--accent-hover, #2c5aa0);
      }

      .btn-secondary {
        background: var(--bg-tertiary, #2d3748);
        color: var(--text-primary, #ffffff);
        border: 1px solid var(--border-color, #4a5568);
      }

      .btn-secondary:hover {
        background: var(--bg-quaternary, #4a5568);
      }

      /* LINE 登入提示樣式 */
      .line-login-prompt, .line-connection-notice {
        text-align: center;
        padding: 20px;
        background: var(--bg-tertiary, #2d3748);
        border-radius: 8px;
        border: 1px solid var(--border-color, #4a5568);
      }

      .line-connection-notice {
        background: linear-gradient(135deg, #2b5a7e 0%, #1e3a5f 100%);
        border: 1px solid var(--accent-color, #3182ce);
      }

      .login-message, .notice-message {
        margin-bottom: 20px;
      }

      .login-message p, .notice-message p {
        margin: 8px 0;
        color: var(--text-secondary, #a0aec0);
        line-height: 1.5;
      }

      .login-message p:first-child {
        color: var(--warning-color, #ffa500);
        font-weight: 500;
      }

      .notice-message p:first-child {
        color: var(--accent-color, #3182ce);
        font-weight: 500;
      }

      .login-actions, .connection-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
      }

      .btn-outline {
        background: transparent;
        color: var(--accent-color, #3182ce);
        border: 1px solid var(--accent-color, #3182ce);
      }

      .btn-outline:hover {
        background: var(--accent-color, #3182ce);
        color: white;
      }

      .line-connected-status {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-radius: 6px;
        margin-bottom: 16px;
      }

      .line-connected-status.connected {
        background: var(--success-bg, rgba(56, 161, 105, 0.1));
        border: 1px solid var(--success-color, #38a169);
      }

      .line-connected-status.not-connected {
        background: var(--warning-bg, rgba(255, 193, 7, 0.1));
        border: 1px solid var(--warning-color, #ffc107);
      }

      .status-badge {
        font-size: 14px;
        font-weight: 500;
        padding: 4px 12px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .status-badge.connected {
        background: var(--success-color, #38a169);
        color: white;
      }

      .status-badge.disconnected {
        background: var(--error-color, #e53e3e);
        color: white;
      }

      .status-badge.not-connected {
        background: var(--warning-color, #ffc107);
        color: var(--warning-text, #856404);
      }

      .link-btn {
        background: none;
        border: none;
        color: var(--accent-color, #3182ce);
        text-decoration: underline;
        cursor: pointer;
        font-size: 12px;
        padding: 0;
        margin-left: 5px;
      }

      .link-btn:hover {
        color: var(--accent-color-dark, #2c5aa0);
      }

      .alert-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 1000001;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .alert-notification.success {
        background: var(--success-color, #38a169);
      }

      .alert-notification.error {
        background: var(--error-color, #e53e3e);
      }

      .alert-notification button {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 18px;
        padding: 0;
        margin-left: 8px;
      }

      @media (max-width: 768px) {
        .modal-content {
          width: 95%;
          margin: 10px;
        }
        
        .alert-type-options {
          flex-direction: column;
        }
        
        .form-actions {
          flex-direction: column;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * 渲染會員狀態和配額資訊
   */
  renderMembershipStatus() {
    const currentUser = this.getCurrentUser();
    const membershipType = currentUser?.membershipType || 'free';
    const alertCount = this.existingAlerts.length;
    
    // 會員配額設定
    const membershipConfig = {
      free: {
        name: '免費會員',
        icon: '💎',
        maxAlerts: 1,
        features: ['價格上穿/下穿通知', '每日 AI 分析通知'],
        upgradeText: '升級至付費會員'
      },
      premium: {
        name: '付費會員',
        icon: '🚀',
        maxAlerts: 50,
        features: ['50個價格警報', '技術指標警報', 'RSI、MACD、布林通道等'],
        upgradeText: '升級至企業會員'
      },
      enterprise: {
        name: '企業會員',
        icon: '👑',
        maxAlerts: Infinity,
        features: ['無限制警報', '所有技術指標', '優先支援'],
        upgradeText: null
      }
    };
    
    const config = membershipConfig[membershipType];
    const isQuotaExceeded = alertCount >= config.maxAlerts;
    const remainingQuota = config.maxAlerts === Infinity ? '無限制' : Math.max(0, config.maxAlerts - alertCount);
    
    let statusClass = 'free-member';
    if (membershipType === 'premium') statusClass = 'premium-member';
    if (membershipType === 'enterprise') statusClass = 'enterprise-member';
    
    return `
      <div class="membership-notice">
        <div class="notice-box ${statusClass}">
          <h5>${config.icon} ${config.name}</h5>
          
          <!-- 配額狀態 -->
          <div class="quota-status ${isQuotaExceeded ? 'quota-exceeded' : ''}">
            <p><strong>警報配額：</strong>
              ${alertCount}/${config.maxAlerts === Infinity ? '∞' : config.maxAlerts}
              ${isQuotaExceeded ? ' <span class="quota-warning">⚠️ 已達上限</span>' : ''}
            </p>
            ${!isQuotaExceeded && config.maxAlerts !== Infinity ? 
              `<p class="quota-remaining">還可設定 ${remainingQuota} 個警報</p>` : ''
            }
          </div>
          
          <!-- 功能清單 -->
          <div class="features-list">
            ${config.features.map(feature => `<p>• ${feature}</p>`).join('')}
          </div>
          
          <!-- 升級按鈕 -->
          ${config.upgradeText ? `
            <button type="button" class="upgrade-btn" onclick="window.priceAlertModal.showUpgradeModal('${membershipType}')">
              ${config.upgradeText}
            </button>
          ` : ''}
          
          <!-- 配額超出警告 -->
          ${isQuotaExceeded ? `
            <div class="quota-exceeded-warning">
              <p>⚠️ 您已達到${config.name}的警報數量上限</p>
              <p>請刪除現有警報或升級會員方案</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * 顯示升級模態框
   */
  showUpgradeModal(currentPlan) {
    const upgradeModal = document.getElementById('upgrade-modal');
    if (upgradeModal) {
      upgradeModal.remove();
    }
    
    const modalHTML = `
      <div id="upgrade-modal" class="upgrade-modal">
        <div class="modal-overlay" onclick="document.getElementById('upgrade-modal').remove()"></div>
        <div class="modal-content upgrade-content">
          <div class="modal-header">
            <h3>🚀 會員方案升級</h3>
            <button class="close-btn" onclick="document.getElementById('upgrade-modal').remove()">×</button>
          </div>
          
          <div class="modal-body">
            <div class="upgrade-plans">
              ${this.renderUpgradePlans(currentPlan)}
            </div>
            
            <div class="upgrade-contact">
              <h4>💬 聯絡我們</h4>
              <p>如需升級會員方案，請聯絡客服</p>
              <div class="contact-buttons">
                <button class="btn btn-primary" onclick="window.open('mailto:support@nexustrade.com')">
                  📧 Email 聯絡
                </button>
                <button class="btn btn-secondary" onclick="alert('LINE 客服功能開發中')">
                  📱 LINE 客服
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  /**
   * 渲染升級方案
   */
  renderUpgradePlans(currentPlan) {
    const plans = [
      {
        id: 'premium',
        name: '付費會員',
        icon: '🚀',
        price: 'NT$ 199/月',
        features: ['50個價格警報', '技術指標警報', 'RSI、MACD、布林通道', '優先客服支援'],
        recommended: currentPlan === 'free'
      },
      {
        id: 'enterprise',
        name: '企業會員',
        icon: '👑',
        price: 'NT$ 999/月',
        features: ['無限制警報', '所有技術指標', '專屬客服經理', 'API 存取權限'],
        recommended: currentPlan === 'premium'
      }
    ];
    
    return plans.map(plan => `
      <div class="upgrade-plan ${plan.recommended ? 'recommended' : ''}">
        <div class="plan-header">
          <h4>${plan.icon} ${plan.name}</h4>
          ${plan.recommended ? '<span class="recommended-badge">推薦</span>' : ''}
        </div>
        <div class="plan-price">${plan.price}</div>
        <div class="plan-features">
          ${plan.features.map(feature => `<p>✓ ${feature}</p>`).join('')}
        </div>
      </div>
    `).join('');
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
   * 發送警報狀態更新事件
   */
  dispatchAlertStatusUpdateEvent() {
    if (!this.currentSymbol) return;
    
    console.log(`📢 發送警報狀態更新事件: ${this.currentSymbol}`);
    
    // 創建自定義事件
    const event = new CustomEvent('alertStatusChanged', {
      detail: {
        symbol: this.currentSymbol,
        alertCount: this.existingAlerts.length,
        hasAlerts: this.existingAlerts.length > 0,
        alerts: this.existingAlerts
      }
    });
    
    // 分發事件到 window
    window.dispatchEvent(event);
  }
}

// 建立全域實例和類別引用
window.PriceAlertModal = PriceAlertModal;
window.priceAlertModal = new PriceAlertModal();