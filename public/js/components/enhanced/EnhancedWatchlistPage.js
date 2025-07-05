/**
 * NexusTrade 增強版觀察清單頁面組件
 * 
 * 整合了用戶體驗優化功能：
 * - 統一載入狀態管理
 * - 友好錯誤處理
 * - 智慧重試機制
 * - 響應式設計
 * - 實時數據更新
 */

class EnhancedWatchlistPage {
  constructor() {
    this.watchlist = [];
    this.stats = null;
    this.isLoading = false;
    this.sortBy = 'priority';
    this.sortOrder = 'desc';
    this.refreshInterval = null;
    this.loadingStates = new Set();
    this.retryQueue = new Map();
    
    // 操作 ID 生成器
    this.operationIdCounter = 0;
    
    // 綁定方法
    this.loadWatchlist = this.loadWatchlist.bind(this);
    this.addToWatchlist = this.addToWatchlist.bind(this);
    this.removeFromWatchlist = this.removeFromWatchlist.bind(this);
    this.updatePriority = this.updatePriority.bind(this);
    this.handleRetry = this.handleRetry.bind(this);
    
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
   * 生成操作 ID
   */
  generateOperationId() {
    return `watchlist_${++this.operationIdCounter}_${Date.now()}`;
  }

  /**
   * 顯示載入狀態
   */
  showLoading(id, options = {}) {
    if (window.loadingManager) {
      return window.loadingManager.show(id, options);
    } else {
      // 降級載入指示
      this.setLoading(true);
      return { id, hide: () => this.setLoading(false) };
    }
  }

  /**
   * 隱藏載入狀態
   */
  hideLoading(id) {
    if (window.loadingManager) {
      window.loadingManager.hide(id);
    } else {
      this.setLoading(false);
    }
  }

  /**
   * 處理錯誤
   */
  handleError(error, context = {}, options = {}) {
    if (window.errorHandler) {
      return window.errorHandler.handle(error, context, options);
    } else {
      // 降級錯誤處理
      console.error('錯誤:', error);
      this.showError(error.message || '發生未知錯誤');
      return { handled: true };
    }
  }

  /**
   * 初始化觀察清單頁面 - 增強版
   */
  async init() {
    console.log('📋 初始化增強版觀察清單頁面...');
    
    const operationId = this.generateOperationId();
    
    // 顯示初始載入
    const loader = this.showLoading('watchlist-init', {
      type: 'skeleton',
      skeletonType: 'list',
      message: '正在載入觀察清單...',
      container: '#watchlist-container',
      overlay: false
    });
    
    try {
      // 檢查認證狀態
      const token = this.getAuthToken(true);
      if (!token) {
        this.hideLoading('watchlist-init');
        this.renderLoginRequired();
        return;
      }
      
      // 並行載入初始數據
      const loadPromises = [
        this.loadWatchlistEnhanced(operationId),
        this.loadStatsEnhanced(operationId)
      ];
      
      await Promise.allSettled(loadPromises);
      
      // 設置事件監聽
      this.setupEventListeners();
      
      // 設置自動重新整理
      this.startAutoRefresh();
      
      console.log('✅ 增強版觀察清單頁面初始化完成');
      
    } catch (error) {
      console.error('❌ 觀察清單頁面初始化失敗:', error);
      
      this.handleError(error, {
        component: 'WatchlistPage',
        operation: 'init',
        operationId
      }, {
        retryCallback: () => this.init()
      });
      
    } finally {
      this.hideLoading('watchlist-init');
    }
  }

  /**
   * 載入觀察清單數據 - 增強版
   */
  async loadWatchlistEnhanced(parentOperationId = null) {
    const operationId = parentOperationId || this.generateOperationId();
    console.log(`📊 載入觀察清單數據 [${operationId}]...`);
    
    // 顯示載入狀態
    const loader = this.showLoading('watchlist-data', {
      type: 'dots',
      size: 'small',
      message: '更新數據中...',
      container: '.watchlist-header',
      overlay: false
    });
    
    try {
      const response = await fetch('/api/watchlist', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        // 增加超時處理
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('INVALID_TOKEN');
        }
        throw new Error(`API 請求失敗: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.watchlist = result.data.watchlist;
        console.log(`✅ 載入 ${this.watchlist.length} 個觀察項目`);
        
        // 使用動畫效果渲染
        await this.renderWatchlistEnhanced();
        
        // 清除重試計數
        if (window.errorHandler) {
          window.errorHandler.clearRetryAttempts(operationId);
        }
        
      } else {
        throw new Error(result.message || '載入觀察清單失敗');
      }
      
    } catch (error) {
      console.error('❌ 載入觀察清單失敗:', error);
      
      this.handleError(error, {
        component: 'WatchlistPage',
        operation: 'loadWatchlist',
        operationId
      }, {
        retryCallback: () => this.loadWatchlistEnhanced(operationId),
        showDetails: true
      });
      
    } finally {
      this.hideLoading('watchlist-data');
    }
  }

  /**
   * 載入統計資訊 - 增強版
   */
  async loadStatsEnhanced(parentOperationId = null) {
    const operationId = parentOperationId || this.generateOperationId();
    
    try {
      const response = await fetch('/api/watchlist/stats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.stats = result.data;
          this.renderStatsEnhanced();
        }
      }
      
    } catch (error) {
      console.error('載入統計資訊失敗:', error);
      // 統計資訊載入失敗不影響主要功能，只記錄錯誤
    }
  }

  /**
   * 新增到觀察清單 - 增強版
   */
  async addToWatchlistEnhanced(symbol, priority = 3) {
    const operationId = this.generateOperationId();
    console.log(`➕ 新增 ${symbol} 到觀察清單 [${operationId}]`);
    
    // 顯示提交載入
    const loader = this.showLoading('add-watchlist', {
      type: 'spinner',
      size: 'small',
      message: `正在新增 ${symbol}...`,
      overlay: true
    });
    
    try {
      // 前端驗證
      const validationResult = this.validateAddItem(symbol);
      if (!validationResult.valid) {
        throw new Error(validationResult.message);
      }
      
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          priority: parseInt(priority)
        }),
        signal: AbortSignal.timeout(10000)
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ 成功新增 ${symbol}`);
        this.showSuccessEnhanced(`成功新增 ${symbol} 到觀察清單`);
        
        // 重新載入數據並更新 UI
        await Promise.all([
          this.loadWatchlistEnhanced(operationId),
          this.loadStatsEnhanced(operationId)
        ]);
        
      } else {
        throw new Error(result.message || '新增失敗');
      }
      
    } catch (error) {
      console.error('❌ 新增到觀察清單失敗:', error);
      
      this.handleError(error, {
        component: 'WatchlistPage',
        operation: 'addToWatchlist',
        operationId,
        symbol,
        priority
      }, {
        retryCallback: () => this.addToWatchlistEnhanced(symbol, priority)
      });
      
    } finally {
      this.hideLoading('add-watchlist');
    }
  }

  /**
   * 從觀察清單移除 - 增強版
   */
  async removeFromWatchlistEnhanced(symbol) {
    const operationId = this.generateOperationId();
    console.log(`➖ 從觀察清單移除 ${symbol} [${operationId}]`);
    
    // 先顯示確認對話框
    if (!await this.showConfirmationDialog(`確定要移除 ${symbol} 嗎？`, '移除項目')) {
      return;
    }
    
    // 顯示移除載入
    const loader = this.showLoading('remove-watchlist', {
      type: 'spinner',
      size: 'small',
      message: `正在移除 ${symbol}...`,
      overlay: true
    });
    
    try {
      const response = await fetch(`/api/watchlist/${symbol.toUpperCase()}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ 成功移除 ${symbol}`);
        this.showSuccessEnhanced(`成功移除 ${symbol}`);
        
        // 重新載入數據
        await Promise.all([
          this.loadWatchlistEnhanced(operationId),
          this.loadStatsEnhanced(operationId)
        ]);
        
      } else {
        throw new Error(result.message || '移除失敗');
      }
      
    } catch (error) {
      console.error('❌ 從觀察清單移除失敗:', error);
      
      this.handleError(error, {
        component: 'WatchlistPage',
        operation: 'removeFromWatchlist',
        operationId,
        symbol
      }, {
        retryCallback: () => this.removeFromWatchlistEnhanced(symbol)
      });
      
    } finally {
      this.hideLoading('remove-watchlist');
    }
  }

  /**
   * 更新優先級 - 增強版
   */
  async updatePriorityEnhanced(symbol, priority) {
    const operationId = this.generateOperationId();
    console.log(`🔄 更新 ${symbol} 優先級為 ${priority} [${operationId}]`);
    
    // 顯示更新載入
    const loader = this.showLoading('update-priority', {
      type: 'dots',
      size: 'small',
      message: '更新中...',
      container: `[data-symbol="${symbol}"] .item-actions`
    });
    
    try {
      const response = await fetch(`/api/watchlist/${symbol.toUpperCase()}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          priority: parseInt(priority)
        }),
        signal: AbortSignal.timeout(8000)
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ 成功更新 ${symbol} 優先級`);
        
        // 局部更新 UI，無需重新載入整個清單
        this.updateItemPriorityInUI(symbol, priority);
        
      } else {
        throw new Error(result.message || '更新失敗');
      }
      
    } catch (error) {
      console.error('❌ 更新優先級失敗:', error);
      
      this.handleError(error, {
        component: 'WatchlistPage',
        operation: 'updatePriority',
        operationId,
        symbol,
        priority
      }, {
        retryCallback: () => this.updatePriorityEnhanced(symbol, priority)
      });
      
    } finally {
      this.hideLoading('update-priority');
    }
  }

  /**
   * 渲染觀察清單 - 增強版
   */
  async renderWatchlistEnhanced() {
    console.log('🎨 渲染增強版觀察清單...');
    
    const container = document.getElementById('watchlist-container');
    if (!container) {
      console.error('❌ 找不到觀察清單容器');
      return;
    }

    if (this.watchlist.length === 0) {
      await this.renderEmptyStateEnhanced(container);
      return;
    }

    // 排序觀察清單
    const sortedWatchlist = this.sortWatchlist(this.watchlist);

    const html = `
      <div class="watchlist-header enhanced">
        <div class="watchlist-title">
          <h2>我的觀察清單</h2>
          <span class="item-count">${this.watchlist.length}/30 項目</span>
          <div class="header-actions">
            <button id="add-item-btn" class="btn btn-primary btn-sm">
              <span class="icon">➕</span>
              新增項目
            </button>
          </div>
        </div>
        <div class="watchlist-controls">
          <select id="sort-select" value="${this.sortBy}" class="form-select">
            <option value="priority">按優先級排序</option>
            <option value="name">按名稱排序</option>
            <option value="price">按價格排序</option>
            <option value="change">按變化排序</option>
          </select>
          <button id="refresh-btn" class="btn btn-outline btn-sm">
            <span class="icon">🔄</span>
            重新整理
          </button>
        </div>
      </div>
      
      <div class="watchlist-grid enhanced" id="watchlist-grid">
        ${sortedWatchlist.map(item => this.renderWatchlistItemEnhanced(item)).join('')}
      </div>
      
      ${this.renderAddItemFormEnhanced()}
    `;

    // 使用淡入動畫
    container.style.opacity = '0';
    container.innerHTML = html;
    
    // 重新綁定事件
    this.bindWatchlistEventsEnhanced();
    
    // 淡入動畫
    requestAnimationFrame(() => {
      container.style.transition = 'opacity 0.3s ease';
      container.style.opacity = '1';
    });
  }

  /**
   * 渲染單個觀察清單項目 - 增強版
   */
  renderWatchlistItemEnhanced(item) {
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
      <div class="watchlist-item enhanced" data-symbol="${symbol}">
        <div class="item-header">
          <div class="crypto-info">
            <div class="crypto-icon">${iconHtml}</div>
            <div class="crypto-details">
              <h3 class="crypto-symbol">${symbol}</h3>
              <span class="added-date">新增於 ${new Date(addedAt).toLocaleDateString('zh-TW')}</span>
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
          ` : `
            <div class="loading-placeholder">
              <div class="skeleton-text"></div>
              <div class="skeleton-text"></div>
              <div class="skeleton-text"></div>
            </div>
          `}
        </div>
        
        <div class="item-actions">
          <select class="priority-select form-select" data-symbol="${symbol}">
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
        
        <div class="loading-overlay" style="display: none;">
          <div class="loading-spinner"></div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染空狀態 - 增強版
   */
  async renderEmptyStateEnhanced(container) {
    const html = `
      <div class="empty-state enhanced">
        <div class="empty-animation">
          <div class="empty-icon animated">📋</div>
        </div>
        <h3>觀察清單是空的</h3>
        <p>開始追蹤您感興趣的加密貨幣，掌握市場動態</p>
        <div class="empty-actions">
          <button id="add-first-item-btn" class="btn btn-primary">
            <span class="icon">➕</span>
            新增第一個項目
          </button>
          <a href="#dashboard" class="btn btn-outline">瀏覽熱門貨幣</a>
          <a href="#market" class="btn btn-outline">前往市場頁面</a>
        </div>
        
        <div class="quick-add-suggestions">
          <p>熱門建議：</p>
          <div class="suggestion-chips">
            <button class="suggestion-chip" data-symbol="BTCUSDT">BTC</button>
            <button class="suggestion-chip" data-symbol="ETHUSDT">ETH</button>
            <button class="suggestion-chip" data-symbol="BNBUSDT">BNB</button>
            <button class="suggestion-chip" data-symbol="ADAUSDT">ADA</button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    
    // 綁定空狀態事件
    this.bindEmptyStateEvents();
    
    // 入場動畫
    setTimeout(() => {
      container.querySelector('.empty-icon').classList.add('bounce-in');
    }, 100);
  }

  /**
   * 渲染新增項目表單 - 增強版
   */
  renderAddItemFormEnhanced() {
    return `
      <div id="add-item-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>新增觀察項目</h3>
            <button class="modal-close">×</button>
          </div>
          <div class="modal-body">
            <form id="add-item-form" class="enhanced-form">
              <div class="form-group">
                <label for="add-symbol-input">貨幣代碼</label>
                <input 
                  type="text" 
                  id="add-symbol-input" 
                  class="form-input" 
                  placeholder="例如: BTCUSDT" 
                  autocomplete="off"
                  maxlength="20"
                >
                <div class="input-feedback"></div>
                <div class="input-suggestions" id="symbol-suggestions"></div>
              </div>
              
              <div class="form-group">
                <label for="add-priority-select">優先級</label>
                <select id="add-priority-select" class="form-select">
                  <option value="5">最高 (5) - 重點關注</option>
                  <option value="4">高 (4) - 高度關注</option>
                  <option value="3" selected>普通 (3) - 一般關注</option>
                  <option value="2">低 (2) - 輕度關注</option>
                  <option value="1">最低 (1) - 偶爾關注</option>
                </select>
              </div>
              
              <div class="form-actions">
                <button type="button" class="btn btn-outline" id="cancel-add-btn">取消</button>
                <button type="submit" class="btn btn-primary" id="confirm-add-btn">
                  <span class="btn-text">新增到清單</span>
                  <span class="btn-loading" style="display: none;">
                    <span class="loading-spinner"></span>
                    新增中...
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染統計資訊 - 增強版
   */
  renderStatsEnhanced() {
    if (!this.stats) return;
    
    const statsContainer = document.getElementById('watchlist-stats');
    if (!statsContainer) return;

    const html = `
      <div class="stats-grid enhanced">
        <div class="stat-item" data-stat="total">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">${this.stats.totalItems}</div>
            <div class="stat-label">總項目</div>
          </div>
        </div>
        <div class="stat-item" data-stat="remaining">
          <div class="stat-icon">📋</div>
          <div class="stat-content">
            <div class="stat-value">${this.stats.remainingSlots}</div>
            <div class="stat-label">剩餘空間</div>
          </div>
        </div>
        <div class="stat-item" data-stat="high-priority">
          <div class="stat-icon">⭐</div>
          <div class="stat-content">
            <div class="stat-value">${this.stats.priorityDistribution.high}</div>
            <div class="stat-label">高優先級</div>
          </div>
        </div>
        <div class="stat-item" data-stat="total-value">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <div class="stat-value">${this.stats.totalValue ? '$' + this.stats.totalValue.toLocaleString() : '--'}</div>
            <div class="stat-label">總價值</div>
          </div>
        </div>
      </div>
    `;

    statsContainer.innerHTML = html;
    
    // 添加數值動畫
    setTimeout(() => {
      statsContainer.querySelectorAll('.stat-item').forEach((item, index) => {
        setTimeout(() => {
          item.classList.add('animate-in');
        }, index * 100);
      });
    }, 100);
  }

  /**
   * 綁定觀察清單事件 - 增強版
   */
  bindWatchlistEventsEnhanced() {
    // 排序選擇
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.renderWatchlistEnhanced();
      });
    }

    // 重新整理按鈕
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadWatchlistEnhanced();
      });
    }

    // 新增項目按鈕
    const addBtn = document.getElementById('add-item-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.showAddItemModal();
      });
    }

    // 優先級選擇
    document.querySelectorAll('.priority-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const symbol = e.target.dataset.symbol;
        const priority = e.target.value;
        this.updatePriorityEnhanced(symbol, priority);
      });
    });

    // 移除按鈕
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const symbol = e.target.closest('.remove-btn').dataset.symbol;
        this.removeFromWatchlistEnhanced(symbol);
      });
    });

    // 項目點擊事件（導航到詳細頁面）
    document.querySelectorAll('.watchlist-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // 避免在操作區域觸發導航
        if (!e.target.closest('.item-actions')) {
          const symbol = item.dataset.symbol;
          this.navigateToMarketDetail(symbol);
        }
      });
    });
  }

  /**
   * 綁定空狀態事件
   */
  bindEmptyStateEvents() {
    // 新增第一個項目
    const addFirstBtn = document.getElementById('add-first-item-btn');
    if (addFirstBtn) {
      addFirstBtn.addEventListener('click', () => {
        this.showAddItemModal();
      });
    }

    // 建議項目點擊
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const symbol = e.target.dataset.symbol;
        this.addToWatchlistEnhanced(symbol, 3);
      });
    });
  }

  /**
   * 顯示新增項目模態框
   */
  showAddItemModal() {
    const modal = document.getElementById('add-item-modal');
    if (!modal) return;

    modal.style.display = 'flex';
    
    // 聚焦到輸入框
    setTimeout(() => {
      const input = document.getElementById('add-symbol-input');
      if (input) {
        input.focus();
      }
    }, 100);

    // 綁定模態框事件
    this.bindAddItemModalEvents();
  }

  /**
   * 隱藏新增項目模態框
   */
  hideAddItemModal() {
    const modal = document.getElementById('add-item-modal');
    if (modal) {
      modal.style.display = 'none';
      
      // 重置表單
      const form = document.getElementById('add-item-form');
      if (form) {
        form.reset();
        this.clearFormValidation();
      }
    }
  }

  /**
   * 綁定新增項目模態框事件
   */
  bindAddItemModalEvents() {
    const modal = document.getElementById('add-item-modal');
    const form = document.getElementById('add-item-form');
    const input = document.getElementById('add-symbol-input');
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = document.getElementById('cancel-add-btn');

    // 關閉按鈕
    [closeBtn, cancelBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          this.hideAddItemModal();
        });
      }
    });

    // 點擊遮罩關閉
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideAddItemModal();
      }
    });

    // ESC 鍵關閉
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        this.hideAddItemModal();
      }
    });

    // 表單提交
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddItemSubmit();
      });
    }

    // 即時輸入驗證
    if (input) {
      input.addEventListener('input', (e) => {
        this.validateSymbolInput(e.target.value);
      });
    }
  }

  /**
   * 處理新增項目提交
   */
  async handleAddItemSubmit() {
    const symbolInput = document.getElementById('add-symbol-input');
    const prioritySelect = document.getElementById('add-priority-select');
    const submitBtn = document.getElementById('confirm-add-btn');
    
    if (!symbolInput || !prioritySelect) return;

    const symbol = symbolInput.value.trim().toUpperCase();
    const priority = prioritySelect.value;

    // 表單驗證
    const validation = this.validateAddItem(symbol);
    if (!validation.valid) {
      this.showInputError(symbolInput, validation.message);
      return;
    }

    // 顯示提交載入狀態
    this.toggleSubmitLoading(submitBtn, true);

    try {
      await this.addToWatchlistEnhanced(symbol, priority);
      this.hideAddItemModal();
    } catch (error) {
      // 錯誤已在 addToWatchlistEnhanced 中處理
    } finally {
      this.toggleSubmitLoading(submitBtn, false);
    }
  }

  /**
   * 驗證新增項目
   */
  validateAddItem(symbol) {
    if (!symbol) {
      return { valid: false, message: '請輸入貨幣代碼' };
    }

    if (symbol.length < 2) {
      return { valid: false, message: '貨幣代碼至少需要2個字符' };
    }

    if (!/^[A-Z0-9]+$/.test(symbol)) {
      return { valid: false, message: '貨幣代碼只能包含字母和數字' };
    }

    if (this.watchlist.some(item => item.symbol === symbol)) {
      return { valid: false, message: `${symbol} 已在觀察清單中` };
    }

    if (this.watchlist.length >= 30) {
      return { valid: false, message: '觀察清單已達上限 (30 個項目)' };
    }

    return { valid: true };
  }

  /**
   * 符號輸入驗證
   */
  validateSymbolInput(value) {
    const input = document.getElementById('add-symbol-input');
    const feedback = input.parentNode.querySelector('.input-feedback');
    
    if (!value) {
      this.clearInputFeedback(input);
      return;
    }

    const validation = this.validateAddItem(value.toUpperCase());
    
    if (validation.valid) {
      this.showInputSuccess(input, '✓ 可以新增');
    } else {
      this.showInputError(input, validation.message);
    }
  }

  /**
   * UI 輔助方法
   */
  showInputError(input, message) {
    const feedback = input.parentNode.querySelector('.input-feedback');
    input.classList.add('error');
    input.classList.remove('success');
    if (feedback) {
      feedback.textContent = message;
      feedback.className = 'input-feedback error';
    }
  }

  showInputSuccess(input, message) {
    const feedback = input.parentNode.querySelector('.input-feedback');
    input.classList.add('success');
    input.classList.remove('error');
    if (feedback) {
      feedback.textContent = message;
      feedback.className = 'input-feedback success';
    }
  }

  clearInputFeedback(input) {
    const feedback = input.parentNode.querySelector('.input-feedback');
    input.classList.remove('error', 'success');
    if (feedback) {
      feedback.textContent = '';
      feedback.className = 'input-feedback';
    }
  }

  clearFormValidation() {
    document.querySelectorAll('.form-input').forEach(input => {
      this.clearInputFeedback(input);
    });
  }

  toggleSubmitLoading(btn, loading) {
    const text = btn.querySelector('.btn-text');
    const loadingElement = btn.querySelector('.btn-loading');
    
    if (loading) {
      text.style.display = 'none';
      loadingElement.style.display = 'inline-flex';
      btn.disabled = true;
    } else {
      text.style.display = 'inline';
      loadingElement.style.display = 'none';
      btn.disabled = false;
    }
  }

  /**
   * 顯示確認對話框
   */
  async showConfirmationDialog(message, title = '確認操作') {
    return new Promise((resolve) => {
      // 創建確認對話框
      const dialog = document.createElement('div');
      dialog.className = 'confirmation-dialog-overlay';
      dialog.innerHTML = `
        <div class="confirmation-dialog">
          <div class="dialog-header">
            <h3>${title}</h3>
          </div>
          <div class="dialog-body">
            <p>${message}</p>
          </div>
          <div class="dialog-actions">
            <button class="btn btn-outline cancel-btn">取消</button>
            <button class="btn btn-danger confirm-btn">確認</button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      // 綁定事件
      const cancelBtn = dialog.querySelector('.cancel-btn');
      const confirmBtn = dialog.querySelector('.confirm-btn');

      const cleanup = () => {
        document.body.removeChild(dialog);
      };

      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      confirmBtn.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      // ESC 鍵取消
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve(false);
          document.removeEventListener('keydown', handleEsc);
        }
      };
      document.addEventListener('keydown', handleEsc);

      // 顯示動畫
      setTimeout(() => {
        dialog.classList.add('show');
      }, 10);
    });
  }

  /**
   * 導航到市場詳細頁面
   */
  navigateToMarketDetail(symbol) {
    console.log(`🔗 導航到 ${symbol} 詳細頁面`);
    
    // 使用 router 導航（如果可用）
    if (window.router && typeof window.router.navigate === 'function') {
      window.router.navigate(`market/${symbol}`);
    } else {
      // 備用方案：更新 hash
      window.location.hash = `market/${symbol}`;
    }
  }

  /**
   * 局部更新項目優先級
   */
  updateItemPriorityInUI(symbol, priority) {
    const item = document.querySelector(`[data-symbol="${symbol}"]`);
    if (!item) return;

    const badge = item.querySelector('.priority-badge');
    const select = item.querySelector('.priority-select');

    if (badge) {
      badge.textContent = this.getPriorityLabel(priority);
      badge.className = `priority-badge ${this.getPriorityClass(priority)}`;
    }

    if (select) {
      select.value = priority;
    }

    // 更新本地數據
    const watchlistItem = this.watchlist.find(item => item.symbol === symbol);
    if (watchlistItem) {
      watchlistItem.priority = parseInt(priority);
    }

    // 重新排序並渲染（如果按優先級排序）
    if (this.sortBy === 'priority') {
      this.renderWatchlistEnhanced();
    }
  }

  /**
   * 重試處理
   */
  handleRetry(context) {
    console.log('🔄 處理重試:', context);
    
    switch (context.operation) {
      case 'init':
        this.init();
        break;
      case 'loadWatchlist':
        this.loadWatchlistEnhanced(context.operationId);
        break;
      case 'addToWatchlist':
        this.addToWatchlistEnhanced(context.symbol, context.priority);
        break;
      case 'removeFromWatchlist':
        this.removeFromWatchlistEnhanced(context.symbol);
        break;
      case 'updatePriority':
        this.updatePriorityEnhanced(context.symbol, context.priority);
        break;
      default:
        console.warn('未知的重試操作:', context.operation);
    }
  }

  /**
   * 增強版成功提示
   */
  showSuccessEnhanced(message) {
    console.log('✅', message);
    
    if (window.errorHandler) {
      // 使用錯誤處理器的通知系統
      window.errorHandler.displayNotification({
        id: `success-${Date.now()}`,
        type: 'success',
        title: '操作成功',
        message: message,
        icon: '✅',
        actions: [],
        autoClose: true,
        closeDelay: 3000
      });
    } else {
      // 降級通知
      this.showSuccess(message);
    }
  }

  /**
   * 設置事件監聽
   */
  setupEventListeners() {
    // 錯誤重試事件
    window.addEventListener('errorRetry', (event) => {
      const { context } = event.detail;
      if (context.component === 'WatchlistPage') {
        this.handleRetry(context);
      }
    });

    // 認證過期事件
    window.addEventListener('authExpired', () => {
      this.cleanup();
      this.renderLoginRequired();
    });
  }

  // 繼承原有的工具方法
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
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp * 1000 > Date.now()) {
            return token;
          }
        } catch (error) {
          console.warn('Token 格式錯誤:', error);
        }
      }
      
      throw new Error('用戶未登入或登入已過期');
      
    } catch (error) {
      console.warn('取得認證令牌失敗:', error);
      if (silent) {
        return null;
      }
      this.redirectToLogin();
      return null;
    }
  }

  redirectToLogin() {
    console.log('🔒 需要登入，重導向到登入頁面');
    
    if (window.showLoginModal && typeof window.showLoginModal === 'function') {
      window.showLoginModal();
      return;
    }
    
    if (window.loginModal && typeof window.loginModal.show === 'function') {
      window.loginModal.show();
      return;
    }
    
    window.dispatchEvent(new CustomEvent('requestLogin', {
      detail: { reason: 'watchlist_access', returnTo: 'watchlist' }
    }));
  }

  renderLoginRequired() {
    const container = document.getElementById('watchlist-container');
    if (!container) return;

    container.innerHTML = `
      <div class="login-required-state enhanced">
        <div class="login-animation">
          <div class="login-icon">🔐</div>
        </div>
        <h3>需要登入</h3>
        <p>請先登入您的帳戶以查看和管理個人觀察清單</p>
        <div class="login-actions">
          <button id="login-btn" class="btn btn-primary">立即登入</button>
          <a href="#dashboard" class="btn btn-outline">返回首頁</a>
        </div>
      </div>
    `;

    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        this.redirectToLogin();
      });
    }
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
    if (window.app && typeof window.app.showNotification === 'function') {
      window.app.showNotification(message, 'success');
    }
  }

  showError(message) {
    console.error('❌', message);
    if (window.app && typeof window.app.showNotification === 'function') {
      window.app.showNotification(message, 'error');
    }
  }

  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      this.loadWatchlistEnhanced();
    }, 30000);
  }

  cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// 建立全域實例
if (typeof window !== 'undefined') {
  window.EnhancedWatchlistPage = EnhancedWatchlistPage;
}