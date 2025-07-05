/**
 * 價格警報頁面組件
 * 
 * 提供完整的價格警報管理功能
 */

class PriceAlertsPage {
  constructor() {
    this.alerts = [];
    this.filteredAlerts = [];
    this.currentFilter = 'all';
    this.currentSort = 'created_desc';
    this.isLoading = false;
    this.selectedAlert = null;
    
    // API 配置
    this.api = window.api || {};
    
    // 事件監聽器追蹤
    this.eventListeners = [];
    
    // 防止多次彈出的標記
    this.isShowingModal = false;
    this.modalCooldown = false;
    
    // 綁定方法
    this.render = this.render.bind(this);
    this.loadAlerts = this.loadAlerts.bind(this);
    this.createAlert = this.createAlert.bind(this);
    this.updateAlert = this.updateAlert.bind(this);
    this.deleteAlert = this.deleteAlert.bind(this);
    this.toggleAlert = this.toggleAlert.bind(this);
  }

  /**
   * 初始化組件
   */
  async init() {
    console.log('🔔 初始化價格警報頁面');
    
    // 檢查認證狀態
    if (!this.checkAuthStatus()) {
      console.log('⚠️ 用戶未登入，顯示登入提示界面');
      // 先渲染登入提示界面
      this.renderLoginRequired();
      this.setupEventListeners();
      return;
    }
    
    await this.loadAlerts();
    this.setupEventListeners();
  }

  /**
   * 載入價格警報列表
   */
  async loadAlerts() {
    try {
      this.isLoading = true;
      this.render();

      const token = localStorage.getItem('nexustrade_token');
      if (!token) {
        this.showError('請先登入');
        return;
      }

      const response = await fetch('/api/notifications/alerts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        this.alerts = data.data.alerts || [];
        
        // 調試：檢查警報數據結構
        console.log('🔍 載入的警報數據:', this.alerts.map(alert => `${alert.symbol}-${alert.alertType}-${alert.status}`));
        this.alerts.forEach((alert, index) => {
          console.log(`警報 ${index}:`, {
            id: alert.id,
            symbol: alert.symbol,
            alertType: alert.alertType,
            status: alert.status
          });
        });
        
        this.applyFilters();
        console.log(`✅ 載入 ${this.alerts.length} 個價格警報`);
      } else {
        throw new Error(data.message || '載入失敗');
      }

    } catch (error) {
      console.error('❌ 載入價格警報失敗:', error);
      this.showError(`載入失敗: ${error.message}`);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  /**
   * 建立新的價格警報
   */
  async createAlert(alertData) {
    try {
      const token = localStorage.getItem('nexustrade_token');
      if (!token) {
        this.showError('請先登入');
        return false;
      }

      const response = await fetch('/api/notifications/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(alertData)
      });

      const data = await response.json();

      if (data.status === 'success') {
        this.showSuccess('價格警報建立成功');
        await this.loadAlerts();
        return true;
      } else {
        // 特殊處理會員限制錯誤
        if (data.message && data.message.includes('免費會員警報上限')) {
          this.showMembershipUpgradePrompt(data.message);
        } else {
          throw new Error(data.message || '建立失敗');
        }
        return false;
      }

    } catch (error) {
      console.error('❌ 建立價格警報失敗:', error);
      this.showError(`建立失敗: ${error.message}`);
      return false;
    }
  }

  /**
   * 更新價格警報
   */
  async updateAlert(alertId, updateData) {
    try {
      const token = localStorage.getItem('nexustrade_token');
      if (!token) {
        this.showError('請先登入');
        return false;
      }

      const response = await fetch(`/api/notifications/alerts/${alertId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (data.status === 'success') {
        this.showSuccess('價格警報更新成功');
        await this.loadAlerts();
        return true;
      } else {
        throw new Error(data.message || '更新失敗');
      }

    } catch (error) {
      console.error('❌ 更新價格警報失敗:', error);
      this.showError(`更新失敗: ${error.message}`);
      return false;
    }
  }

  /**
   * 刪除價格警報
   */
  async deleteAlert(alertId) {
    try {
      const token = localStorage.getItem('nexustrade_token');
      if (!token) {
        this.showError('請先登入');
        return false;
      }

      if (!confirm('確定要刪除此價格警報嗎？')) {
        return false;
      }

      const response = await fetch(`/api/notifications/alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.status === 'success') {
        this.showSuccess('價格警報刪除成功');
        await this.loadAlerts();
        return true;
      } else {
        throw new Error(data.message || '刪除失敗');
      }

    } catch (error) {
      console.error('❌ 刪除價格警報失敗:', error);
      this.showError(`刪除失敗: ${error.message}`);
      return false;
    }
  }

  /**
   * 切換價格警報狀態
   */
  async toggleAlert(alertId) {
    try {
      const token = localStorage.getItem('nexustrade_token');
      if (!token) {
        this.showError('請先登入');
        return false;
      }

      const response = await fetch(`/api/notifications/alerts/${alertId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.status === 'success') {
        this.showSuccess(data.message);
        await this.loadAlerts();
        return true;
      } else {
        throw new Error(data.message || '切換失敗');
      }

    } catch (error) {
      console.error('❌ 切換價格警報狀態失敗:', error);
      this.showError(`切換失敗: ${error.message}`);
      return false;
    }
  }

  /**
   * 套用篩選條件
   */
  applyFilters() {
    let filtered = [...this.alerts];

    // 狀態篩選
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(alert => alert.status === this.currentFilter);
    }

    // 排序
    switch (this.currentSort) {
      case 'created_desc':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'created_asc':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'symbol_asc':
        filtered.sort((a, b) => a.symbol.localeCompare(b.symbol));
        break;
      case 'priority_desc': {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        filtered.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
        break;
      }
    }

    this.filteredAlerts = filtered;
  }

  /**
   * 移除事件監聽器
   */
  removeEventListeners() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  /**
   * 添加事件監聽器並追蹤
   */
  addEventListenerWithTracking(element, event, handler) {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  }

  /**
   * 設定事件監聽器
   */
  setupEventListeners() {
    // 清除舊的事件監聽器
    this.removeEventListeners();

    // 篩選器變更處理器
    const changeHandler = (e) => {
      if (e.target.id === 'alert-filter') {
        this.currentFilter = e.target.value;
        this.applyFilters();
        this.render();
      }
      
      if (e.target.id === 'alert-sort') {
        this.currentSort = e.target.value;
        this.applyFilters();
        this.render();
      }
    };

    // 點擊事件處理器
    const clickHandler = (e) => {
      if (e.target.id === 'add-alert-btn') {
        this.showCreateAlertModal();
      }
      
      if (e.target.id === 'login-btn') {
        this.showLoginModal();
      }
      
      if (e.target.id === 'back-to-home-btn') {
        window.location.hash = '#dashboard';
      }
      
      if (e.target.classList.contains('toggle-alert-btn')) {
        const alertId = e.target.dataset.alertId;
        this.toggleAlert(alertId);
      }
      
      if (e.target.classList.contains('edit-alert-btn')) {
        const alertId = e.target.dataset.alertId;
        this.showEditAlertModal(alertId);
      }
      
      if (e.target.classList.contains('delete-alert-btn')) {
        const alertId = e.target.dataset.alertId;
        console.log('🗑️ PriceAlertsPage: 刪除按鈕點擊', { 
          alertId, 
          dataset: e.target.dataset,
          element: e.target,
          hasClass: e.target.classList.contains('delete-alert-btn')
        });
        
        if (!alertId) {
          console.error('❌ alertId 為空，檢查按鈕渲染:', {
            buttonHTML: e.target.outerHTML,
            allDataAttributes: {...e.target.dataset}
          });
          this.showError('警報 ID 無效，無法刪除');
          return;
        }
        
        this.deleteAlert(alertId);
      }
    };

    // 表單提交處理器
    const submitHandler = (e) => {
      if (e.target.id === 'create-alert-form') {
        e.preventDefault();
        this.handleCreateAlertSubmit(e.target);
      }
      
      if (e.target.id === 'edit-alert-form') {
        e.preventDefault();
        this.handleEditAlertSubmit(e.target);
      }
    };

    // 註冊事件監聽器並追蹤
    this.addEventListenerWithTracking(document, 'change', changeHandler);
    this.addEventListenerWithTracking(document, 'click', clickHandler);
    this.addEventListenerWithTracking(document, 'submit', submitHandler);
  }

  /**
   * 處理建立警報表單提交
   */
  async handleCreateAlertSubmit(form) {
    const formData = new FormData(form);
    
    const alertData = {
      symbol: formData.get('symbol').toUpperCase(),
      alertType: formData.get('alertType'),
      priority: formData.get('priority'),
      note: formData.get('note'),
      notificationMethods: {
        lineNotify: {
          enabled: formData.get('lineNotifyEnabled') === 'on'
        },
        email: {
          enabled: formData.get('emailEnabled') === 'on',
          address: formData.get('emailAddress')
        }
      }
    };

    // 根據警報類型設定特定欄位
    switch (alertData.alertType) {
      case 'price_above':
      case 'price_below':
        alertData.targetPrice = parseFloat(formData.get('targetPrice'));
        break;
      case 'percent_change':
        alertData.percentChange = parseFloat(formData.get('percentChange'));
        break;
      case 'volume_spike':
        alertData.volumeMultiplier = parseFloat(formData.get('volumeMultiplier'));
        break;
    }

    const success = await this.createAlert(alertData);
    if (success) {
      this.hideCreateAlertModal();
      form.reset();
    }
  }

  /**
   * 處理編輯警報表單提交
   */
  async handleEditAlertSubmit(form) {
    const formData = new FormData(form);
    const alertId = form.dataset.alertId;
    
    const updateData = {
      priority: formData.get('priority'),
      note: formData.get('note'),
      enabled: formData.get('enabled') === 'on',
      notificationMethods: {
        lineNotify: {
          enabled: formData.get('lineNotifyEnabled') === 'on'
        },
        email: {
          enabled: formData.get('emailEnabled') === 'on',
          address: formData.get('emailAddress')
        }
      }
    };

    const success = await this.updateAlert(alertId, updateData);
    if (success) {
      this.hideEditAlertModal();
    }
  }

  /**
   * 顯示建立警報模態框
   */
  showCreateAlertModal() {
    if (this.isShowingModal) {
      console.log('⏳ 已有模態框顯示中，跳過新增警報模態框');
      return;
    }

    const modal = document.getElementById('create-alert-modal');
    if (modal) {
      this.isShowingModal = true;
      modal.style.display = 'flex';
      
      // 設置關閉時的回調
      const closeModal = () => {
        modal.style.display = 'none';
        this.isShowingModal = false;
      };
      
      // 為關閉按鈕添加事件
      const closeBtn = modal.querySelector('.modal-close');
      if (closeBtn) {
        closeBtn.onclick = closeModal;
      }
      
      // 點擊外部關閉
      modal.onclick = (e) => {
        if (e.target === modal) {
          closeModal();
        }
      };
    } else {
      console.warn('⚠️ create-alert-modal 元素不存在');
    }
  }

  /**
   * 隱藏建立警報模態框
   */
  hideCreateAlertModal() {
    const modal = document.getElementById('create-alert-modal');
    if (modal) {
      modal.style.display = 'none';
      this.isShowingModal = false;
    }
  }

  /**
   * 顯示編輯警報模態框
   */
  showEditAlertModal(alertId) {
    const alert = this.alerts.find(a => a._id === alertId);
    if (!alert) return;

    this.selectedAlert = alert;
    
    // 填充表單數據
    this.populateEditForm(alert);
    
    const modal = document.getElementById('edit-alert-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  /**
   * 隱藏編輯警報模態框
   */
  hideEditAlertModal() {
    const modal = document.getElementById('edit-alert-modal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.selectedAlert = null;
  }

  /**
   * 填充編輯表單
   */
  populateEditForm(alert) {
    const form = document.getElementById('edit-alert-form');
    if (!form) return;

    form.dataset.alertId = alert._id;
    
    // 填充基本資料
    const elements = {
      'edit-priority': alert.priority,
      'edit-note': alert.note || '',
      'edit-enabled': alert.enabled,
      'edit-lineNotifyEnabled': alert.notificationMethods?.lineNotify?.enabled || false,
      'edit-emailEnabled': alert.notificationMethods?.email?.enabled || false,
      'edit-emailAddress': alert.notificationMethods?.email?.address || ''
    };

    for (const [name, value] of Object.entries(elements)) {
      const element = form.querySelector(`[name="${name}"]`);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = value;
        } else {
          element.value = value;
        }
      }
    }
  }

  /**
   * 渲染登入提示界面
   */
  renderLoginRequired() {
    const container = document.getElementById('price-alerts-content');
    if (!container) return;

    container.innerHTML = `
      <div class="login-required-container">
        <div class="login-required-content">
          <div class="login-icon">🔐</div>
          <h2>需要登入</h2>
          <p>請先登入以使用價格警報功能</p>
          <div class="login-actions">
            <button id="login-btn" class="btn btn-primary">
              🚀 立即登入
            </button>
            <button id="back-to-home-btn" class="btn btn-secondary">
              🏠 返回首頁
            </button>
          </div>
        </div>
      </div>
      
      <style>
        .login-required-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          text-align: center;
        }
        .login-required-content {
          max-width: 400px;
          padding: 40px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .login-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }
        .login-required-content h2 {
          color: #333;
          margin-bottom: 10px;
        }
        .login-required-content p {
          color: #666;
          margin-bottom: 30px;
        }
        .login-actions {
          display: flex;
          gap: 15px;
          justify-content: center;
        }
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          text-decoration: none;
          display: inline-block;
        }
        .btn-primary {
          background: #007bff;
          color: white;
        }
        .btn-primary:hover {
          background: #0056b3;
        }
        .btn-secondary {
          background: #6c757d;
          color: white;
        }
        .btn-secondary:hover {
          background: #545b62;
        }
      </style>
    `;
  }

  /**
   * 渲染頁面
   */
  render() {
    const container = document.getElementById('price-alerts-content');
    if (!container) return;

    if (this.isLoading) {
      container.innerHTML = this.renderLoading();
      return;
    }

    container.innerHTML = `
      <div class="alerts-header">
        <div class="alerts-title">
          <h2>💰 價格警報</h2>
          <span class="alerts-count">${this.alerts.length} 個警報</span>
        </div>
        <button id="add-alert-btn" class="btn btn-primary">
          ➕ 新增警報
        </button>
      </div>

      <div class="alerts-filters">
        <div class="filter-group">
          <label for="alert-filter">狀態篩選:</label>
          <select id="alert-filter" value="${this.currentFilter}">
            <option value="all">全部</option>
            <option value="active">啟用中</option>
            <option value="paused">已暫停</option>
            <option value="triggered">已觸發</option>
            <option value="expired">已過期</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="alert-sort">排序:</label>
          <select id="alert-sort" value="${this.currentSort}">
            <option value="created_desc">建立時間 (新→舊)</option>
            <option value="created_asc">建立時間 (舊→新)</option>
            <option value="symbol_asc">交易對 (A→Z)</option>
            <option value="priority_desc">優先級 (高→低)</option>
          </select>
        </div>
      </div>

      <div class="alerts-list">
        ${this.renderAlertsList()}
      </div>

      ${this.renderCreateAlertModal()}
      ${this.renderEditAlertModal()}
    `;
  }

  /**
   * 渲染載入狀態
   */
  renderLoading() {
    return `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>載入價格警報中...</p>
      </div>
    `;
  }

  /**
   * 渲染警報列表
   */
  renderAlertsList() {
    if (this.filteredAlerts.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🔔</div>
          <h3>尚無價格警報</h3>
          <p>建立您的第一個價格警報，及時掌握市場動態</p>
          <button class="btn btn-primary" onclick="document.getElementById('add-alert-btn').click()">
            建立警報
          </button>
        </div>
      `;
    }

    return this.filteredAlerts.map(alert => this.renderAlertCard(alert)).join('');
  }

  /**
   * 渲染警報卡片
   */
  renderAlertCard(alert) {
    // 調試：檢查警報對象結構
    console.log('🔍 渲染警報卡片:', `${alert.symbol}-${alert.alertType}-${alert.status} (ID: ${alert.id})`);
    
    if (!alert.id) {
      console.error('❌ 警報對象缺少 id 欄位:', alert);
      return '<div class="alert-card error">警報數據異常</div>';
    }
    
    const statusIcon = this.getStatusIcon(alert.status);
    const statusClass = `status-${alert.status}`;
    const priorityIcon = this.getPriorityIcon(alert.priority);
    const alertTypeText = this.getAlertTypeText(alert);
    
    return `
      <div class="alert-card ${statusClass}">
        <div class="alert-header">
          <div class="alert-symbol">
            <span class="symbol-text">${alert.symbol}</span>
            <span class="alert-type">${alertTypeText}</span>
          </div>
          <div class="alert-status">
            <span class="status-badge ${statusClass}">
              ${statusIcon} ${alert.status}
            </span>
            <span class="priority-badge priority-${alert.priority}">
              ${priorityIcon} ${alert.priority}
            </span>
          </div>
        </div>

        <div class="alert-details">
          ${this.renderAlertCondition(alert)}
          
          <div class="alert-notifications">
            <span class="notifications-label">通知方式:</span>
            ${this.renderNotificationMethods(alert.notificationMethods)}
          </div>
          
          ${alert.note ? `<div class="alert-note">"${alert.note}"</div>` : ''}
          
          <div class="alert-meta">
            <span>建立時間: ${new Date(alert.createdAt).toLocaleString('zh-TW')}</span>
            ${alert.triggerHistory?.length > 0 ? 
              `<span>觸發次數: ${alert.triggerHistory.length}</span>` : ''}
          </div>
        </div>

        <div class="alert-actions">
          <button class="btn-icon toggle-alert-btn" data-alert-id="${alert.id}" 
                  title="${alert.status === 'active' ? '暫停' : '恢復'}">
            ${alert.status === 'active' ? '⏸️' : '▶️'}
          </button>
          <button class="btn-icon edit-alert-btn" data-alert-id="${alert.id}" title="編輯">
            ✏️
          </button>
          <button class="btn-icon delete-alert-btn" data-alert-id="${alert.id}" title="刪除">
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 渲染警報條件
   */
  renderAlertCondition(alert) {
    const { alertType, targetPrice, percentChange, volumeMultiplier } = alert;
    
    switch (alertType) {
      case 'price_above':
        return `<div class="alert-condition">當價格 ≥ <strong>$${targetPrice}</strong></div>`;
      case 'price_below':
        return `<div class="alert-condition">當價格 ≤ <strong>$${targetPrice}</strong></div>`;
      case 'percent_change':
        return `<div class="alert-condition">當24h變化 ≥ <strong>${percentChange}%</strong></div>`;
      case 'volume_spike':
        return `<div class="alert-condition">當交易量激增 <strong>${volumeMultiplier}x</strong></div>`;
      default:
        return `<div class="alert-condition">條件: ${alertType}</div>`;
    }
  }

  /**
   * 渲染通知方式
   */
  renderNotificationMethods(methods) {
    const enabled = [];
    
    if (methods?.lineNotify?.enabled) enabled.push('📱 LINE');
    if (methods?.email?.enabled) enabled.push('📧 Email');
    if (methods?.webhook?.enabled) enabled.push('🔗 Webhook');
    
    return enabled.length > 0 ? enabled.join(', ') : '無';
  }

  /**
   * 渲染建立警報模態框
   */
  renderCreateAlertModal() {
    return `
      <div id="create-alert-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>🔔 建立價格警報</h3>
            <button type="button" class="modal-close" onclick="document.getElementById('create-alert-modal').style.display='none'">×</button>
          </div>
          
          <form id="create-alert-form" class="alert-form">
            <div class="form-row">
              <div class="form-group">
                <label for="symbol">交易對</label>
                <input type="text" id="symbol" name="symbol" placeholder="例: BTCUSDT" required>
              </div>
              
              <div class="form-group">
                <label for="alertType">警報類型</label>
                <select id="alertType" name="alertType" required>
                  <option value="price_above">價格高於</option>
                  <option value="price_below">價格低於</option>
                  <option value="percent_change">百分比變化</option>
                  <option value="volume_spike">交易量激增</option>
                </select>
              </div>
            </div>

            <div class="form-row" id="condition-fields">
              <div class="form-group" id="target-price-group">
                <label for="targetPrice">目標價格 ($)</label>
                <input type="number" id="targetPrice" name="targetPrice" step="0.00000001" min="0">
              </div>
              
              <div class="form-group" id="percent-change-group" style="display: none;">
                <label for="percentChange">變化百分比 (%)</label>
                <input type="number" id="percentChange" name="percentChange" step="0.01">
              </div>
              
              <div class="form-group" id="volume-multiplier-group" style="display: none;">
                <label for="volumeMultiplier">交易量倍數</label>
                <input type="number" id="volumeMultiplier" name="volumeMultiplier" step="0.1" min="1">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="priority">優先級</label>
                <select id="priority" name="priority">
                  <option value="low">低</option>
                  <option value="medium" selected>中</option>
                  <option value="high">高</option>
                  <option value="critical">緊急</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="note">備註</label>
              <textarea id="note" name="note" placeholder="可選的備註說明"></textarea>
            </div>

            <div class="form-section">
              <h4>通知設定</h4>
              
              <div class="checkbox-group">
                <label>
                  <input type="checkbox" name="lineNotifyEnabled">
                  📱 LINE 通知
                </label>
              </div>
              
              <div class="checkbox-group">
                <label>
                  <input type="checkbox" name="emailEnabled">
                  📧 Email 通知
                </label>
                <input type="email" name="emailAddress" placeholder="email@example.com" style="margin-top: 5px;">
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('create-alert-modal').style.display='none'">取消</button>
              <button type="submit" class="btn btn-primary">建立警報</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  /**
   * 渲染編輯警報模態框
   */
  renderEditAlertModal() {
    return `
      <div id="edit-alert-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>✏️ 編輯價格警報</h3>
            <button type="button" class="modal-close" onclick="document.getElementById('edit-alert-modal').style.display='none'">×</button>
          </div>
          
          <form id="edit-alert-form" class="alert-form">
            <div class="form-row">
              <div class="form-group">
                <label for="edit-priority">優先級</label>
                <select id="edit-priority" name="priority">
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                  <option value="critical">緊急</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>
                  <input type="checkbox" name="enabled">
                  啟用警報
                </label>
              </div>
            </div>

            <div class="form-group">
              <label for="edit-note">備註</label>
              <textarea id="edit-note" name="note"></textarea>
            </div>

            <div class="form-section">
              <h4>通知設定</h4>
              
              <div class="checkbox-group">
                <label>
                  <input type="checkbox" name="lineNotifyEnabled">
                  📱 LINE 通知
                </label>
              </div>
              
              <div class="checkbox-group">
                <label>
                  <input type="checkbox" name="emailEnabled">
                  📧 Email 通知
                </label>
                <input type="email" name="emailAddress" placeholder="email@example.com" style="margin-top: 5px;">
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('edit-alert-modal').style.display='none'">取消</button>
              <button type="submit" class="btn btn-primary">更新警報</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  /**
   * 工具方法
   */
  getStatusIcon(status) {
    const icons = {
      active: '🟢',
      paused: '⏸️',
      triggered: '🔥',
      expired: '⏰'
    };
    return icons[status] || '❓';
  }

  getPriorityIcon(priority) {
    const icons = {
      low: '🔵',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };
    return icons[priority] || '⚪';
  }

  getAlertTypeText(alert) {
    const types = {
      price_above: '高於目標價',
      price_below: '低於目標價',
      percent_change: '變化百分比',
      volume_spike: '交易量激增'
    };
    return types[alert.alertType] || alert.alertType;
  }

  showSuccess(message) {
    // 整合通知系統
    if (window.store) {
      window.store.dispatch({
        type: 'ui/showNotification',
        payload: { message, type: 'success', duration: 4000 }
      });
    } else {
      alert(message);
    }
  }

  showError(message) {
    // 整合通知系統
    if (window.store) {
      window.store.dispatch({
        type: 'ui/showNotification',
        payload: { message, type: 'error', duration: 5000 }
      });
    } else {
      alert(message);
    }
  }

  /**
   * 檢查認證狀態
   */
  checkAuthStatus() {
    // 檢查 AuthManager
    if (window.authManager && window.authManager.isAuthenticated()) {
      return true;
    }
    
    // 檢查 localStorage
    const token = localStorage.getItem('nexustrade_token');
    const user = localStorage.getItem('nexustrade_user');
    
    return !!(token && user);
  }

  /**
   * 顯示會員升級提示
   */
  showMembershipUpgradePrompt(message) {
    if (this.isShowingModal || this.modalCooldown) {
      console.log('⏳ 模態框冷卻中，跳過顯示');
      return;
    }

    this.isShowingModal = true;
    this.modalCooldown = true;

    const upgradeModal = `
      <div id="membership-upgrade-modal" class="modal-overlay" style="display: flex; z-index: 10000;">
        <div class="modal-content" style="max-width: 500px;">
          <div class="modal-header">
            <h3>💎 會員升級</h3>
            <button type="button" class="modal-close" onclick="this.closest('.modal-overlay').remove(); window.priceAlertsPage.isShowingModal = false;">×</button>
          </div>
          <div class="modal-body">
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 3rem; margin-bottom: 20px;">🔔</div>
              <h4>免費會員警報額度已滿</h4>
              <p style="color: #666; margin: 15px 0;">${message}</p>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h5>升級付費會員享受：</h5>
                <ul style="text-align: left; margin: 10px 0;">
                  <li>✅ 最多 50 個價格警報</li>
                  <li>✅ 18 種技術指標警報</li>
                  <li>✅ RSI、MACD、移動平均線等進階功能</li>
                  <li>✅ 優先通知服務</li>
                </ul>
              </div>
            </div>
          </div>
          <div class="modal-footer" style="text-align: center; padding: 15px;">
            <button class="btn btn-primary" onclick="alert('會員升級功能建構中'); this.closest('.modal-overlay').remove(); window.priceAlertsPage.isShowingModal = false;" style="margin-right: 10px;">
              💎 立即升級
            </button>
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove(); window.priceAlertsPage.isShowingModal = false;">
              稍後再說
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', upgradeModal);

    // 設置冷卻時間 (5秒)
    setTimeout(() => {
      this.modalCooldown = false;
    }, 5000);
  }

  /**
   * 顯示登入視窗
   */
  showLoginModal() {
    if (this.isShowingModal || this.modalCooldown) {
      console.log('⏳ 模態框冷卻中，跳過登入視窗顯示');
      return;
    }

    console.log('🔐 用戶未登入，彈出登入視窗');
    
    this.isShowingModal = true;
    this.modalCooldown = true;
    
    // 方案 1: 使用新的 AuthManager
    if (window.authManager && typeof window.authManager.showLoginModal === 'function') {
      window.authManager.showLoginModal();
      setTimeout(() => { this.modalCooldown = false; }, 3000);
      return;
    }
    
    // 方案 2: 使用全域登入模態框
    if (window.showLoginModal && typeof window.showLoginModal === 'function') {
      window.showLoginModal();
      setTimeout(() => { 
        this.isShowingModal = false;
        this.modalCooldown = false; 
      }, 3000);
      return;
    }
    
    // 方案 3: 使用 LoginModal 實例
    if (window.loginModal && typeof window.loginModal.show === 'function') {
      window.loginModal.show();
      setTimeout(() => { this.modalCooldown = false; }, 3000);
      return;
    }
    
    // 方案 4: 觸發登入事件
    window.dispatchEvent(new CustomEvent('requestLogin', {
      detail: { reason: 'price_alerts_access', returnTo: 'price-alerts' }
    }));
    
    // 方案 5: 嘗試點擊頁面上的登入按鈕
    const headerLoginBtn = document.querySelector('.header-login-btn, .auth-btn');
    if (headerLoginBtn) {
      headerLoginBtn.click();
      setTimeout(() => { this.modalCooldown = false; }, 3000);
      return;
    }
    
    // 備用方案: 顯示提示訊息
    this.showError('請先登入以使用價格警報功能');
    console.log('💡 已顯示登入提示界面，用戶可點擊登入按鈕');
    
    setTimeout(() => { 
      this.isShowingModal = false;
      this.modalCooldown = false; 
    }, 3000);
  }
}

// 創建全局實例
window.PriceAlertsPage = PriceAlertsPage;