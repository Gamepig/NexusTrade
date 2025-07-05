/**
 * NexusTrade 觀察清單頁面組件
 * 
 * 提供個人化加密貨幣追蹤功能
 */

class WatchlistPage {
  constructor() {
    this.watchlist = [];
    this.stats = null;
    this.isLoading = false;
    this.sortBy = 'priority'; // priority, name, price, change
    this.sortOrder = 'desc'; // asc, desc
    this.refreshInterval = null;
    
    // 綁定方法
    this.loadWatchlist = this.loadWatchlist.bind(this);
    this.addToWatchlist = this.addToWatchlist.bind(this);
    this.removeFromWatchlist = this.removeFromWatchlist.bind(this);
    this.updatePriority = this.updatePriority.bind(this);
  }

  /**
   * 初始化觀察清單頁面
   */
  async init() {
    console.log('📋 初始化觀察清單頁面...');
    
    try {
      // 檢查認證狀態 (使用 silent 模式避免自動重導向)
      const token = this.getAuthToken(true);
      if (!token) {
        // 用戶未登入，直接彈出登入視窗
        this.showLoginModal();
        return;
      }
      
      // 載入初始數據
      await Promise.all([
        this.loadWatchlist(),
        this.loadStats()
      ]);
      
      // 設置事件監聽
      this.setupEventListeners();
      
      // 設置自動重新整理 (30秒)
      this.startAutoRefresh();
      
      console.log('✅ 觀察清單頁面初始化完成');
    } catch (error) {
      console.error('❌ 觀察清單頁面初始化失敗:', error);
      this.showError('初始化失敗: ' + error.message);
    }
  }

  /**
   * 載入觀察清單數據
   */
  async loadWatchlist() {
    console.log('📊 載入觀察清單數據...');
    
    try {
      this.setLoading(true);
      
      const response = await fetch('/api/watchlist', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.watchlist = result.data.watchlist;
        console.log(`✅ 載入 ${this.watchlist.length} 個觀察項目`);
        this.renderWatchlist();
      } else {
        throw new Error(result.message || '載入觀察清單失敗');
      }
      
    } catch (error) {
      console.error('❌ 載入觀察清單失敗:', error);
      this.showError('載入失敗: ' + error.message);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * 載入統計資訊
   */
  async loadStats() {
    try {
      const response = await fetch('/api/watchlist/stats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.stats = result.data;
          this.renderStats();
        }
      }
    } catch (error) {
      console.error('載入統計資訊失敗:', error);
    }
  }

  /**
   * 新增到觀察清單
   */
  async addToWatchlist(symbol, priority = 3) {
    console.log(`➕ 新增 ${symbol} 到觀察清單 (優先級: ${priority})`);
    
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          priority: parseInt(priority)
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ 成功新增 ${symbol}`);
        this.showSuccess(`成功新增 ${symbol} 到觀察清單`);
        
        // 重新載入數據
        await this.loadWatchlist();
        await this.loadStats();
      } else {
        throw new Error(result.message || '新增失敗');
      }
      
    } catch (error) {
      console.error('❌ 新增到觀察清單失敗:', error);
      this.showError('新增失敗: ' + error.message);
    }
  }

  /**
   * 從觀察清單移除
   */
  async removeFromWatchlist(symbol) {
    console.log(`➖ 從觀察清單移除 ${symbol}`);
    
    try {
      const response = await fetch(`/api/watchlist/${symbol.toUpperCase()}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ 成功移除 ${symbol}`);
        this.showSuccess(`成功移除 ${symbol}`);
        
        // 重新載入數據
        await this.loadWatchlist();
        await this.loadStats();
      } else {
        throw new Error(result.message || '移除失敗');
      }
      
    } catch (error) {
      console.error('❌ 從觀察清單移除失敗:', error);
      this.showError('移除失敗: ' + error.message);
    }
  }

  /**
   * 更新優先級
   */
  async updatePriority(symbol, priority) {
    console.log(`🔄 更新 ${symbol} 優先級為 ${priority}`);
    
    try {
      const response = await fetch(`/api/watchlist/${symbol.toUpperCase()}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          priority: parseInt(priority)
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ 成功更新 ${symbol} 優先級`);
        
        // 重新載入數據
        await this.loadWatchlist();
      } else {
        throw new Error(result.message || '更新失敗');
      }
      
    } catch (error) {
      console.error('❌ 更新優先級失敗:', error);
      this.showError('更新失敗: ' + error.message);
    }
  }

  /**
   * 渲染觀察清單
   */
  renderWatchlist() {
    console.log('🎨 渲染觀察清單...');
    
    const container = document.getElementById('watchlist-container');
    if (!container) {
      console.error('❌ 找不到觀察清單容器');
      return;
    }

    if (this.watchlist.length === 0) {
      container.innerHTML = this.renderEmptyState();
      return;
    }

    // 排序觀察清單
    const sortedWatchlist = this.sortWatchlist(this.watchlist);

    const html = `
      <div class="watchlist-header">
        <div class="watchlist-title">
          <h2>我的觀察清單</h2>
          <span class="item-count">${this.watchlist.length}/30 項目</span>
        </div>
        <div class="watchlist-controls">
          <select id="sort-select" value="${this.sortBy}">
            <option value="priority">按優先級排序</option>
            <option value="name">按名稱排序</option>
            <option value="price">按價格排序</option>
            <option value="change">按變化排序</option>
          </select>
          <button id="refresh-btn" class="btn btn-outline">
            <span class="icon">🔄</span>
            重新整理
          </button>
        </div>
      </div>
      
      <div class="watchlist-grid">
        ${sortedWatchlist.map(item => this.renderWatchlistItem(item)).join('')}
      </div>
    `;

    container.innerHTML = html;
    
    // 重新綁定事件
    this.bindWatchlistEvents();
  }

  /**
   * 渲染單個觀察清單項目
   */
  renderWatchlistItem(item) {
    const { symbol, priority, addedAt, priceData } = item;
    const priorityLabel = this.getPriorityLabel(priority);
    const priorityClass = this.getPriorityClass(priority);
    
    // 價格數據
    const price = priceData?.price || '--';
    const priceChange = priceData?.priceChangePercent || 0;
    const isPositive = priceChange >= 0;
    const changeClass = isPositive ? 'positive' : 'negative';
    const changeIcon = isPositive ? '▲' : '▼';
    
    // 圖標
    const iconHtml = window.getCryptoIcon ? window.getCryptoIcon(symbol, 40) : 
      `<div class="crypto-icon-fallback">${symbol.substring(0, 2)}</div>`;

    return `
      <div class="watchlist-item" data-symbol="${symbol}">
        <div class="item-header">
          <div class="crypto-info">
            <div class="crypto-icon">${iconHtml}</div>
            <div class="crypto-details">
              <h3 class="crypto-symbol">${symbol}</h3>
              <span class="added-date">新增於 ${new Date(addedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div class="priority-badge ${priorityClass}" title="優先級 ${priority}">
            ${priorityLabel}
          </div>
        </div>
        
        <div class="item-body">
          <div class="price-info">
            <div class="current-price">$${typeof price === 'number' ? price.toLocaleString() : price}</div>
            <div class="price-change ${changeClass}">
              <span class="change-icon">${changeIcon}</span>
              <span class="change-percent">${Math.abs(priceChange).toFixed(2)}%</span>
            </div>
          </div>
          
          ${priceData ? `
            <div class="market-data">
              <div class="data-item">
                <span class="label">24h 最高</span>
                <span class="value">$${priceData.high.toLocaleString()}</span>
              </div>
              <div class="data-item">
                <span class="label">24h 最低</span>
                <span class="value">$${priceData.low.toLocaleString()}</span>
              </div>
              <div class="data-item">
                <span class="label">24h 交易量</span>
                <span class="value">${this.formatVolume(priceData.volume)}</span>
              </div>
            </div>
          ` : '<div class="no-data">價格數據載入中...</div>'}
        </div>
        
        <div class="item-actions">
          <select class="priority-select" data-symbol="${symbol}">
            <option value="5" ${priority === 5 ? 'selected' : ''}>最高 (5)</option>
            <option value="4" ${priority === 4 ? 'selected' : ''}>高 (4)</option>
            <option value="3" ${priority === 3 ? 'selected' : ''}>普通 (3)</option>
            <option value="2" ${priority === 2 ? 'selected' : ''}>低 (2)</option>
            <option value="1" ${priority === 1 ? 'selected' : ''}>最低 (1)</option>
          </select>
          <button class="btn btn-outline btn-sm remove-btn" data-symbol="${symbol}">
            <span class="icon">🗑️</span>
            移除
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 渲染空狀態
   */
  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>觀察清單是空的</h3>
        <p>前往個別貨幣頁面，點擊「加入關注」按鈕來添加您感興趣的加密貨幣</p>
        <div class="empty-actions">
          <a href="#dashboard" class="btn btn-primary">瀏覽熱門貨幣</a>
          <a href="#market" class="btn btn-outline">前往市場頁面</a>
        </div>
      </div>
    `;
  }

  /**
   * 渲染登入要求頁面
   */
  renderLoginRequired() {
    const container = document.getElementById('watchlist-container');
    if (!container) {
      console.error('❌ 找不到觀察清單容器');
      return;
    }

    container.innerHTML = `
      <div class="login-required-state">
        <div class="login-icon">🔐</div>
        <h3>需要登入</h3>
        <p>請先登入您的帳戶以查看和管理個人觀察清單</p>
        <div class="login-actions">
          <button id="login-btn" class="btn btn-primary">立即登入</button>
          <a href="#dashboard" class="btn btn-outline">返回首頁</a>
        </div>
      </div>
    `;

    // 綁定登入按鈕事件
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        this.redirectToLogin();
      });
    }
  }

  /**
   * 渲染統計資訊
   */
  renderStats() {
    if (!this.stats) return;
    
    const statsContainer = document.getElementById('watchlist-stats');
    if (!statsContainer) return;

    const html = `
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">總項目</div>
          <div class="stat-value">${this.stats.totalItems}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">剩餘空間</div>
          <div class="stat-value">${this.stats.remainingSlots}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">高優先級</div>
          <div class="stat-value">${this.stats.priorityDistribution.high}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">普通優先級</div>
          <div class="stat-value">${this.stats.priorityDistribution.medium}</div>
        </div>
      </div>
    `;

    statsContainer.innerHTML = html;
  }

  /**
   * 設置事件監聽
   */
  setupEventListeners() {
    // 設置觀察清單相關事件監聽
    this.bindWatchlistEvents();
  }

  /**
   * 綁定觀察清單相關事件
   */
  bindWatchlistEvents() {
    // 排序選擇
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.renderWatchlist();
      });
    }

    // 重新整理按鈕
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadWatchlist();
      });
    }

    // 優先級選擇
    document.querySelectorAll('.priority-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const symbol = e.target.dataset.symbol;
        const priority = e.target.value;
        this.updatePriority(symbol, priority);
      });
    });

    // 移除按鈕
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const symbol = e.target.closest('.remove-btn').dataset.symbol;
        if (confirm(`確定要移除 ${symbol} 嗎？`)) {
          this.removeFromWatchlist(symbol);
        }
      });
    });

  }

  /**
   * 綁定添加項目事件
   */
  bindAddItemEvents() {
    const addBtn = document.getElementById('add-item-btn');
    const symbolInput = document.getElementById('add-symbol-input');
    
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.handleAddItem();
      });
    }

    if (symbolInput) {
      symbolInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleAddItem();
        }
      });
    }
  }

  /**
   * 處理添加項目
   */
  handleAddItem() {
    const symbolInput = document.getElementById('add-symbol-input');
    const prioritySelect = document.getElementById('add-priority-select');
    
    if (!symbolInput || !prioritySelect) return;

    const symbol = symbolInput.value.trim().toUpperCase();
    const priority = prioritySelect.value;

    if (!symbol) {
      this.showError('請輸入貨幣代碼');
      return;
    }

    if (!/^[A-Z0-9]+$/.test(symbol)) {
      this.showError('貨幣代碼只能包含字母和數字');
      return;
    }

    // 檢查是否已存在
    if (this.watchlist.some(item => item.symbol === symbol)) {
      this.showError(`${symbol} 已在觀察清單中`);
      return;
    }

    // 檢查容量限制
    if (this.watchlist.length >= 20) {
      this.showError('觀察清單已達上限 (20 個項目)');
      return;
    }

    // 清空輸入框
    symbolInput.value = '';
    
    // 新增到觀察清單
    this.addToWatchlist(symbol, priority);
  }

  /**
   * 排序觀察清單
   */
  sortWatchlist(watchlist) {
    return [...watchlist].sort((a, b) => {
      let valueA, valueB;

      switch (this.sortBy) {
        case 'priority':
          valueA = a.priority;
          valueB = b.priority;
          break;
        case 'name':
          valueA = a.symbol;
          valueB = b.symbol;
          break;
        case 'price':
          valueA = a.priceData?.price || 0;
          valueB = b.priceData?.price || 0;
          break;
        case 'change':
          valueA = a.priceData?.priceChangePercent || 0;
          valueB = b.priceData?.priceChangePercent || 0;
          break;
        default:
          return 0;
      }

      if (this.sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }

  /**
   * 工具方法
   */
  getPriorityLabel(priority) {
    const labels = {
      5: '最高',
      4: '高',
      3: '普通',
      2: '低',
      1: '最低'
    };
    return labels[priority] || '普通';
  }

  getPriorityClass(priority) {
    if (priority >= 4) return 'priority-high';
    if (priority === 3) return 'priority-medium';
    return 'priority-low';
  }

  formatVolume(volume) {
    if (volume >= 1000000000) {
      return (volume / 1000000000).toFixed(1) + 'B';
    }
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(1) + 'M';
    }
    if (volume >= 1000) {
      return (volume / 1000).toFixed(1) + 'K';
    }
    return volume.toFixed(0);
  }

  getAuthToken(silent = false) {
    try {
      // 方案 1: 使用全域認證管理器
      if (window.authStateManager) {
        const token = window.authStateManager.getToken();
        if (token && !window.authStateManager.isTokenExpired()) {
          return token;
        }
      }
      
      // 方案 2: 從 localStorage 直接讀取
      const token = localStorage.getItem('nexustrade_token');
      if (token) {
        // 簡單檢查 token 格式和過期時間
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp * 1000 > Date.now()) {
            return token;
          }
        } catch (error) {
          console.warn('Token 格式錯誤:', error);
        }
      }
      
      // 方案 3: 從 sessionStorage 讀取
      const sessionToken = sessionStorage.getItem('nexustrade_token');
      if (sessionToken) {
        try {
          const payload = JSON.parse(atob(sessionToken.split('.')[1]));
          if (payload.exp * 1000 > Date.now()) {
            return sessionToken;
          }
        } catch (error) {
          console.warn('Session Token 格式錯誤:', error);
        }
      }
      
      // 如果沒有有效 token，拋出錯誤
      throw new Error('用戶未登入或登入已過期');
      
    } catch (error) {
      console.warn('取得認證令牌失敗:', error);
      // 如果 silent 模式，不重定向，直接返回 null
      if (silent) {
        return null;
      }
      // 重定向到登入頁面
      this.redirectToLogin();
      return null;
    }
  }

  /**
   * 重導向到登入頁面
   */
  redirectToLogin() {
    console.log('🔒 需要登入，重導向到登入頁面');
    
    // 方案 1: 使用全域登入模態框
    if (window.showLoginModal && typeof window.showLoginModal === 'function') {
      window.showLoginModal();
      return;
    }
    
    // 方案 2: 使用 LoginModal 實例
    if (window.loginModal && typeof window.loginModal.show === 'function') {
      window.loginModal.show();
      return;
    }
    
    // 方案 3: 觸發登入事件
    window.dispatchEvent(new CustomEvent('requestLogin', {
      detail: { reason: 'watchlist_access', returnTo: 'watchlist' }
    }));
    
    // 方案 4: 備用方案 - 顯示提示訊息
    this.showError('請先登入以使用觀察清單功能');
    
    // 可選：延遲後重新載入頁面
    setTimeout(() => {
      if (confirm('需要登入才能使用觀察清單功能，是否重新載入頁面？')) {
        window.location.reload();
      }
    }, 2000);
  }

  setLoading(loading) {
    this.isLoading = loading;
    const container = document.getElementById('watchlist-container');
    if (container) {
      container.classList.toggle('loading', loading);
    }
  }

  showSuccess(message) {
    console.log('✅', message);
    // TODO: 整合通知系統
    // INTEGRATION-GUIDE: Replace this with a call to your global notification system.
    // For example, if you have a global `notifier` object:
    // window.notifier.success(message);
    if (window.app && typeof window.app.showNotification === 'function') {
      window.app.showNotification(message, 'success');
    }
  }

  showError(message) {
    console.error('❌', message);
    // TODO: 整合通知系統
    // INTEGRATION-GUIDE: Replace this with a call to your global notification system.
    // For example, if you have a global `notifier` object:
    // window.notifier.error(message);
    if (window.app && typeof window.app.showNotification === 'function') {
      window.app.showNotification(message, 'error');
    }
  }

  /**
   * 自動重新整理
   */
  startAutoRefresh() {
    // 每30秒重新整理
    this.refreshInterval = setInterval(() => {
      this.loadWatchlist();
    }, 30000);
  }

  /**
   * 清理資源
   */
  cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// 建立全域實例
if (typeof window !== 'undefined') {
  window.WatchlistPage = WatchlistPage;
}