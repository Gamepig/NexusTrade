# NexusTrade 關注清單實作範例

**版本**: 1.0  
**日期**: 2025-06-29  
**作者**: AI Assistant  

## 📋 文件目的

本文件提供具體的程式碼範例，指導開發者完成 NexusTrade 關注清單功能的剩餘整合工作，包括認證系統整合、通知系統連接和 UX 優化。

## 🔐 認證系統整合範例

### 1. getAuthToken() 方法實作

```javascript
// 在 WatchlistPage.js 中更新 getAuthToken() 方法
getAuthToken() {
  try {
    // 方案 1: 使用全域認證管理器
    if (window.AuthStateManager) {
      const token = window.AuthStateManager.getToken();
      if (token && !window.AuthStateManager.isTokenExpired()) {
        return token;
      }
    }
    
    // 方案 2: 從 localStorage 直接讀取
    const token = localStorage.getItem('auth_token');
    if (token) {
      // 簡單檢查 token 格式
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 > Date.now()) {
        return token;
      }
    }
    
    // 方案 3: 從 cookies 讀取
    const cookieToken = this.getCookieValue('auth_token');
    if (cookieToken) {
      return cookieToken;
    }
    
    // 如果沒有有效 token，拋出錯誤
    throw new Error('用戶未登入或登入已過期');
    
  } catch (error) {
    console.warn('取得認證令牌失敗:', error);
    // 重定向到登入頁面
    this.redirectToLogin();
    return null;
  }
}

// 輔助方法：從 cookies 取得值
getCookieValue(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(';').shift();
  }
  return null;
}

// 重定向到登入頁面
redirectToLogin() {
  console.log('重定向到登入頁面...');
  // 保存當前頁面路徑，登入後可以返回
  localStorage.setItem('returnTo', window.location.hash);
  window.location.hash = '#login';
}
```

### 2. 安全的 API 請求方法

```javascript
// 新增 API 請求的統一方法
async makeAuthenticatedRequest(url, options = {}) {
  try {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('無法取得認證令牌');
    }
    
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    const response = await fetch(url, { ...options, ...defaultOptions });
    
    // 處理認證錯誤
    if (response.status === 401) {
      console.warn('認證失效，準備重新登入...');
      this.clearAuthData();
      this.redirectToLogin();
      throw new Error('認證失效，請重新登入');
    }
    
    if (!response.ok) {
      throw new Error(`API 請求失敗: ${response.status} ${response.statusText}`);
    }
    
    return response;
    
  } catch (error) {
    console.error('API 請求錯誤:', error);
    throw error;
  }
}

// 清除認證資料
clearAuthData() {
  localStorage.removeItem('auth_token');
  document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  if (window.AuthStateManager) {
    window.AuthStateManager.clearToken();
  }
}

// 更新 loadWatchlist 方法使用新的請求方法
async loadWatchlist() {
  console.log('📊 載入觀察清單數據...');
  
  try {
    this.setLoading(true);
    
    const response = await this.makeAuthenticatedRequest('/api/watchlist');
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
```

### 3. 登入狀態檢查

```javascript
// 新增登入狀態檢查方法
checkLoginStatus() {
  try {
    const token = this.getAuthToken();
    const isLoggedIn = token !== null;
    
    if (!isLoggedIn) {
      console.log('使用者未登入，顯示登入提示...');
      this.showLoginRequired();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('檢查登入狀態失敗:', error);
    return false;
  }
}

// 顯示登入要求頁面
showLoginRequired() {
  const container = document.getElementById('watchlist-container');
  if (container) {
    container.innerHTML = `
      <div class="login-required">
        <div class="login-required-content">
          <h2>🔐 需要登入</h2>
          <p>請先登入您的帳戶以查看個人關注清單</p>
          <div class="login-actions">
            <button class="btn btn-primary" onclick="window.location.hash='#login'">
              立即登入
            </button>
            <button class="btn btn-secondary" onclick="window.location.hash='#register'">
              註冊新帳戶
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

// 更新 init 方法加入登入檢查
async init() {
  console.log('📋 初始化觀察清單頁面...');
  
  // 首先檢查登入狀態
  if (!this.checkLoginStatus()) {
    return; // 如果未登入，直接返回
  }
  
  try {
    await Promise.all([
      this.loadWatchlist(),
      this.loadStats()
    ]);
    
    this.setupEventListeners();
    this.startAutoRefresh();
    
    console.log('✅ 觀察清單頁面初始化完成');
  } catch (error) {
    console.error('❌ 觀察清單頁面初始化失敗:', error);
    this.showError('初始化失敗: ' + error.message);
  }
}
```

## 🔔 通知系統整合範例

### 1. showSuccess() 和 showError() 方法實作

```javascript
// 實作通知方法
showSuccess(message, duration = 3000) {
  console.log('✅ 成功:', message);
  
  // 方案 1: 使用全域通知系統
  if (window.NotificationManager) {
    window.NotificationManager.showSuccess(message, duration);
    return;
  }
  
  // 方案 2: 使用自訂 Toast 通知
  this.showToast(message, 'success', duration);
}

showError(message, duration = 5000) {
  console.error('❌ 錯誤:', message);
  
  // 方案 1: 使用全域通知系統
  if (window.NotificationManager) {
    window.NotificationManager.showError(message, duration);
    return;
  }
  
  // 方案 2: 使用自訂 Toast 通知
  this.showToast(message, 'error', duration);
}

// 自訂 Toast 通知實作
showToast(message, type = 'info', duration = 3000) {
  // 建立 toast 容器（如果不存在）
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  // 建立 toast 元素
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} show`;
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon">${this.getToastIcon(type)}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  
  // 自動移除
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

// 取得 Toast 圖示
getToastIcon(type) {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  return icons[type] || icons.info;
}
```

### 2. 載入狀態改善

```javascript
// 改善載入狀態顯示
setLoading(loading) {
  this.isLoading = loading;
  const container = document.getElementById('watchlist-container');
  const loadingOverlay = document.getElementById('watchlist-loading');
  
  if (loading) {
    // 顯示載入中狀態
    if (!loadingOverlay) {
      const overlay = document.createElement('div');
      overlay.id = 'watchlist-loading';
      overlay.className = 'loading-overlay';
      overlay.innerHTML = `
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <p>載入關注清單中...</p>
        </div>
      `;
      container?.appendChild(overlay);
    }
    
    // 禁用操作按鈕
    const buttons = container?.querySelectorAll('button');
    buttons?.forEach(btn => btn.disabled = true);
    
  } else {
    // 移除載入狀態
    loadingOverlay?.remove();
    
    // 啟用操作按鈕
    const buttons = container?.querySelectorAll('button');
    buttons?.forEach(btn => btn.disabled = false);
  }
}

// 改善錯誤處理
async handleApiError(error, operation) {
  console.error(`${operation} 失敗:`, error);
  
  let userMessage;
  
  if (error.message.includes('401') || error.message.includes('認證')) {
    userMessage = '登入已過期，請重新登入';
    this.redirectToLogin();
  } else if (error.message.includes('403')) {
    userMessage = '沒有權限執行此操作';
  } else if (error.message.includes('429')) {
    userMessage = '操作過於頻繁，請稍後再試';
  } else if (error.message.includes('網路') || error.message.includes('fetch')) {
    userMessage = '網路連線問題，請檢查網路連線';
  } else {
    userMessage = error.message || `${operation}失敗，請稍後再試`;
  }
  
  this.showError(userMessage);
}
```

### 3. 批量操作回饋

```javascript
// 批量操作進度顯示
async batchOperation(operations, operationName) {
  const total = operations.length;
  let completed = 0;
  let errors = 0;
  
  // 建立進度條
  this.showProgress(operationName, 0, total);
  
  for (const operation of operations) {
    try {
      await operation();
      completed++;
      this.updateProgress(completed, total);
    } catch (error) {
      errors++;
      console.error('批量操作錯誤:', error);
    }
  }
  
  // 顯示結果
  this.hideProgress();
  
  if (errors === 0) {
    this.showSuccess(`${operationName}完成！成功處理 ${completed} 個項目`);
  } else {
    this.showError(`${operationName}完成，成功 ${completed} 個，失敗 ${errors} 個`);
  }
}

// 進度條實作
showProgress(operation, current, total) {
  const progressBar = document.createElement('div');
  progressBar.id = 'batch-progress';
  progressBar.className = 'progress-container';
  progressBar.innerHTML = `
    <div class="progress-header">
      <span>${operation}進行中...</span>
      <span>${current}/${total}</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${(current/total)*100}%"></div>
    </div>
  `;
  
  document.body.appendChild(progressBar);
}

updateProgress(current, total) {
  const progressBar = document.getElementById('batch-progress');
  if (progressBar) {
    const percentage = (current / total) * 100;
    progressBar.querySelector('.progress-fill').style.width = `${percentage}%`;
    progressBar.querySelector('.progress-header span:last-child').textContent = `${current}/${total}`;
  }
}

hideProgress() {
  const progressBar = document.getElementById('batch-progress');
  if (progressBar) {
    setTimeout(() => progressBar.remove(), 1000);
  }
}
```

## 🎨 UX 優化範例

### 1. 響應式網格布局

```css
/* 新增到 main.css 中 */
.watchlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.watchlist-item {
  background: var(--card-background, #ffffff);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.watchlist-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.watchlist-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.symbol-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.crypto-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.symbol-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.priority-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.priority-high { background: #ff4757; color: white; }
.priority-medium { background: #ffa502; color: white; }
.priority-low { background: #747d8c; color: white; }

.price-info {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  margin: 0.5rem 0;
}

.current-price {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.price-change {
  text-align: right;
  font-size: 0.9rem;
}

.price-change.positive { color: #2ed573; }
.price-change.negative { color: #ff4757; }

/* 響應式設計 */
@media (max-width: 768px) {
  .watchlist-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    padding: 0.5rem;
  }
  
  .watchlist-item {
    padding: 0.75rem;
  }
  
  .symbol-name {
    font-size: 1rem;
  }
  
  .current-price {
    font-size: 1.1rem;
  }
}

@media (max-width: 480px) {
  .price-info {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .price-change {
    text-align: left;
  }
}
```

### 2. 排序和篩選功能

```javascript
// 新增排序和篩選控件
renderControls() {
  const controlsHTML = `
    <div class="watchlist-controls">
      <div class="controls-row">
        <div class="sort-controls">
          <label>排序：</label>
          <select id="sort-select" class="form-select">
            <option value="priority-desc">優先級（高→低）</option>
            <option value="priority-asc">優先級（低→高）</option>
            <option value="name-asc">名稱（A→Z）</option>
            <option value="name-desc">名稱（Z→A）</option>
            <option value="price-desc">價格（高→低）</option>
            <option value="price-asc">價格（低→高）</option>
            <option value="change-desc">漲幅（高→低）</option>
            <option value="change-asc">漲幅（低→高）</option>
          </select>
        </div>
        
        <div class="filter-controls">
          <label>篩選：</label>
          <select id="category-filter" class="form-select">
            <option value="">所有分類</option>
            <option value="trading">交易</option>
            <option value="longterm">長期持有</option>
            <option value="watchonly">僅觀察</option>
          </select>
        </div>
        
        <div class="search-controls">
          <input type="text" id="search-input" placeholder="搜尋貨幣..." class="form-input">
        </div>
      </div>
    </div>
  `;
  
  const container = document.getElementById('watchlist-container');
  container.insertAdjacentHTML('afterbegin', controlsHTML);
  
  // 綁定事件
  document.getElementById('sort-select').addEventListener('change', (e) => {
    const [field, order] = e.target.value.split('-');
    this.sortBy = field;
    this.sortOrder = order;
    this.renderWatchlist();
  });
  
  document.getElementById('category-filter').addEventListener('change', (e) => {
    this.categoryFilter = e.target.value;
    this.renderWatchlist();
  });
  
  document.getElementById('search-input').addEventListener('input', (e) => {
    this.searchQuery = e.target.value.toLowerCase();
    this.renderWatchlist();
  });
}

// 更新排序邏輯
sortWatchlist(watchlist) {
  const filtered = this.filterWatchlist(watchlist);
  
  return filtered.sort((a, b) => {
    let compareValue = 0;
    
    switch (this.sortBy) {
      case 'priority':
        compareValue = a.priority - b.priority;
        break;
      case 'name':
        compareValue = a.baseAsset.localeCompare(b.baseAsset);
        break;
      case 'price':
        const priceA = a.priceData?.price || 0;
        const priceB = b.priceData?.price || 0;
        compareValue = priceA - priceB;
        break;
      case 'change':
        const changeA = a.priceData?.priceChangePercent || 0;
        const changeB = b.priceData?.priceChangePercent || 0;
        compareValue = changeA - changeB;
        break;
      default:
        compareValue = new Date(a.addedAt) - new Date(b.addedAt);
    }
    
    return this.sortOrder === 'desc' ? -compareValue : compareValue;
  });
}

// 篩選邏輯
filterWatchlist(watchlist) {
  return watchlist.filter(item => {
    // 分類篩選
    if (this.categoryFilter && item.category !== this.categoryFilter) {
      return false;
    }
    
    // 搜尋篩選
    if (this.searchQuery) {
      const searchText = `${item.symbol} ${item.baseAsset} ${item.displayName}`.toLowerCase();
      if (!searchText.includes(this.searchQuery)) {
        return false;
      }
    }
    
    return true;
  });
}
```

### 3. 快速新增功能

```javascript
// 快速新增表單
renderQuickAdd() {
  const quickAddHTML = `
    <div class="quick-add-section">
      <h3>🚀 快速新增</h3>
      <div class="quick-add-form">
        <div class="input-group">
          <input type="text" id="quick-symbol" placeholder="輸入交易對，如 BTCUSDT" 
                 class="form-input" autocomplete="off">
          <datalist id="symbol-suggestions"></datalist>
        </div>
        <div class="quick-add-options">
          <select id="quick-priority" class="form-select">
            <option value="3">普通優先級</option>
            <option value="5">高優先級</option>
            <option value="1">低優先級</option>
          </select>
          <button id="quick-add-btn" class="btn btn-primary">新增</button>
        </div>
      </div>
    </div>
  `;
  
  const container = document.getElementById('watchlist-container');
  container.insertAdjacentHTML('afterbegin', quickAddHTML);
  
  // 綁定事件
  document.getElementById('quick-add-btn').addEventListener('click', () => {
    this.handleQuickAdd();
  });
  
  document.getElementById('quick-symbol').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      this.handleQuickAdd();
    }
  });
  
  // 自動完成建議
  this.setupSymbolAutocomplete();
}

// 處理快速新增
async handleQuickAdd() {
  const symbol = document.getElementById('quick-symbol').value.trim().toUpperCase();
  const priority = parseInt(document.getElementById('quick-priority').value);
  
  if (!symbol) {
    this.showError('請輸入交易對代碼');
    return;
  }
  
  if (!/^[A-Z0-9]{6,12}$/.test(symbol)) {
    this.showError('交易對格式不正確，例如：BTCUSDT, ETHUSDT');
    return;
  }
  
  try {
    await this.addToWatchlist(symbol, priority);
    
    // 清空表單
    document.getElementById('quick-symbol').value = '';
    document.getElementById('quick-priority').value = '3';
    
  } catch (error) {
    // 錯誤已在 addToWatchlist 中處理
  }
}

// 設定自動完成
setupSymbolAutocomplete() {
  const popularSymbols = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT',
    'SOLUSDT', 'DOTUSDT', 'DOGEUSDT', 'MATICUSDT', 'LTCUSDT'
  ];
  
  const datalist = document.getElementById('symbol-suggestions');
  popularSymbols.forEach(symbol => {
    const option = document.createElement('option');
    option.value = symbol;
    datalist.appendChild(option);
  });
}
```

## 🧪 整合檢查清單

### Phase 1: 認證整合檢查
- [ ] `getAuthToken()` 方法能正確取得 JWT token
- [ ] API 請求包含正確的 Authorization header
- [ ] 401 錯誤能正確處理並重定向到登入頁面
- [ ] 未登入使用者看到登入提示頁面

### Phase 2: 通知系統檢查
- [ ] 成功操作顯示綠色成功通知
- [ ] 錯誤操作顯示紅色錯誤通知
- [ ] 載入狀態有清楚的視覺指示
- [ ] 長時間操作有進度顯示

### Phase 3: UX 優化檢查
- [ ] 在手機、平板、桌面都有良好顯示
- [ ] 排序功能正常運作
- [ ] 篩選功能正常運作  
- [ ] 搜尋功能正常運作
- [ ] 快速新增功能正常運作

### 整體功能檢查
- [ ] 新增關注項目功能正常
- [ ] 移除關注項目功能正常
- [ ] 更新優先級功能正常
- [ ] 價格資料即時更新
- [ ] 統計資訊正確顯示

---

**使用建議**: 按照認證系統→通知系統→UX優化的順序實作，每個階段完成後進行測試再進入下一階段。 