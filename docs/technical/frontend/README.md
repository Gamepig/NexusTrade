# 前端架構技術文件

## 📋 目錄結構

```
public/
├── js/
│   ├── components/         # UI 組件
│   ├── lib/               # 核心函式庫
│   ├── auth/              # 認證相關
│   ├── state/             # 狀態管理
│   └── nexus-app-fixed.js # 主應用程式
├── css/                   # 樣式表
└── index.html             # 應用程式入口
```

## 📚 詳細文件

### 核心應用程式
- **[nexus-app-fixed.js](./nexus-app.md)** - 主應用程式與路由系統

### UI 組件系統
- **[PriceAlertModal.js](./components/PriceAlertModal.md)** - 價格警報設定模態框
- **[WatchlistPage.js](./components/WatchlistPage.md)** - 觀察清單頁面組件
- **[CurrencyDetailPage.js](./components/CurrencyDetailPage.md)** - 貨幣詳情頁面
- **[TradingView.js](./components/TradingView.md)** - TradingView 圖表整合
- **[LoginModal.js](./components/LoginModal.md)** - 登入模態框
- **[MarketPage.js](./components/MarketPage.md)** - 市場數據頁面

### 核心函式庫
- **[api.js](./lib/api.md)** - API 客戶端封裝
- **[router.js](./lib/router.md)** - 前端路由系統
- **[dom.js](./lib/dom.md)** - DOM 操作工具
- **[store.js](./state/store.md)** - 狀態管理系統

### 認證系統
- **[AuthManager.js](./auth/AuthManager.md)** - 認證狀態管理
- **[auth-state-manager.js](./auth/auth-state-manager.md)** - 認證狀態工具

### 通用工具
- **[ErrorHandler.js](./common/ErrorHandler.md)** - 錯誤處理工具
- **[LoadingManager.js](./common/LoadingManager.md)** - 載入狀態管理
- **[FormValidator.js](./common/FormValidator.md)** - 表單驗證工具

## 🏗️ 架構設計原則

### 1. 組件化設計
- **獨立組件**: 每個組件自包含，具備完整的生命週期
- **事件驅動**: 組件間通過事件系統通訊
- **可重用**: 組件設計考慮復用性

### 2. 狀態管理
- **全域狀態**: Store 系統管理應用程式狀態
- **本地狀態**: 組件內部狀態管理
- **認證狀態**: 專門的認證狀態管理器

### 3. 模組化架構
- **ES6 模組**: 使用現代 JavaScript 模組系統
- **命名空間**: 避免全域變數污染
- **依賴注入**: 明確的依賴關係

## 🔄 數據流設計

### 應用程式啟動流程
```
index.html → nexus-app-fixed.js → 組件初始化 → 路由設定 → 事件監聽
```

### 用戶操作流程
```
用戶操作 → 事件觸發 → 組件處理 → API 調用 → 狀態更新 → UI 重新渲染
```

### WebSocket 數據流
```
WebSocket 訊息 → 事件分發 → 組件訂閱 → 數據處理 → UI 更新
```

## 🎨 UI 組件架構

### 組件基類設計
```javascript
class BaseComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.isInitialized = false;
    this.eventListeners = new Map();
  }
  
  // 生命週期方法
  init() { /* 初始化邏輯 */ }
  render() { /* 渲染邏輯 */ }
  destroy() { /* 清理邏輯 */ }
  
  // 事件管理
  addEventListener(element, event, handler) { /* 事件註冊 */ }
  removeEventListeners() { /* 事件清理 */ }
}
```

### 組件通訊模式
- **父子組件**: 直接方法調用
- **兄弟組件**: 事件系統
- **跨組件**: 全域狀態管理

## 🌐 路由系統

### Hash-based 路由
```javascript
// 路由配置
const routes = {
  '#dashboard': () => showPage('dashboard'),
  '#market': () => showPage('market'),
  '#watchlist': () => showPage('watchlist'),
  '#currency/:symbol': (params) => showCurrencyDetail(params.symbol)
};
```

### 路由守衛
```javascript
// 認證路由保護
function requireAuth(handler) {
  return (params) => {
    if (!isAuthenticated()) {
      showLoginModal();
      return;
    }
    handler(params);
  };
}
```

## 🔐 認證系統整合

### 認證狀態管理
```javascript
class AuthManager {
  constructor() {
    this.authState = {
      isAuthenticated: false,
      user: null,
      token: null,
      provider: null
    };
  }
  
  // 認證方法
  login(provider) { /* OAuth 登入 */ }
  logout() { /* 登出處理 */ }
  refresh() { /* Token 刷新 */ }
  
  // 狀態檢查
  isAuthenticated() { /* 認證狀態檢查 */ }
  hasPermission(action) { /* 權限檢查 */ }
}
```

### JWT Token 管理
- **自動刷新**: Token 即將過期時自動刷新
- **安全存儲**: localStorage 安全存儲
- **過期處理**: 自動處理過期 Token

## 📡 API 整合

### HTTP 客戶端
```javascript
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }
  
  // HTTP 方法
  async get(endpoint, options = {}) { /* GET 請求 */ }
  async post(endpoint, data, options = {}) { /* POST 請求 */ }
  async put(endpoint, data, options = {}) { /* PUT 請求 */ }
  async delete(endpoint, options = {}) { /* DELETE 請求 */ }
  
  // 認證相關
  setAuthToken(token) { /* 設定認證 Token */ }
  handleAuthError(error) { /* 處理認證錯誤 */ }
}
```

### WebSocket 客戶端
```javascript
class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.subscriptions = new Map();
  }
  
  // 連接管理
  connect() { /* 建立連接 */ }
  disconnect() { /* 關閉連接 */ }
  reconnect() { /* 重新連接 */ }
  
  // 訂閱管理
  subscribe(topic, handler) { /* 訂閱主題 */ }
  unsubscribe(topic) { /* 取消訂閱 */ }
  
  // 訊息處理
  sendMessage(message) { /* 發送訊息 */ }
  handleMessage(message) { /* 處理訊息 */ }
}
```

## 🎯 效能優化策略

### 延遲載入
```javascript
// 組件延遲載入
const loadComponent = async (componentName) => {
  const module = await import(`./components/${componentName}.js`);
  return module.default;
};
```

### 虛擬滾動
```javascript
// 大量數據的虛擬滾動
class VirtualScrollList {
  constructor(container, itemHeight, renderItem) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.renderItem = renderItem;
  }
  
  render(data, scrollTop) {
    const visibleStart = Math.floor(scrollTop / this.itemHeight);
    const visibleEnd = visibleStart + this.visibleCount;
    // 只渲染可見項目
  }
}
```

### 防抖和節流
```javascript
// 防抖函數
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 節流函數
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
```

## 📱 響應式設計

### CSS Grid 佈局
```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
```

### JavaScript 媒體查詢
```javascript
// 響應式斷點檢測
class ResponsiveHelper {
  constructor() {
    this.breakpoints = {
      mobile: '(max-width: 768px)',
      tablet: '(min-width: 769px) and (max-width: 1024px)',
      desktop: '(min-width: 1025px)'
    };
  }
  
  isMobile() {
    return window.matchMedia(this.breakpoints.mobile).matches;
  }
  
  onBreakpointChange(callback) {
    Object.values(this.breakpoints).forEach(query => {
      window.matchMedia(query).addListener(callback);
    });
  }
}
```

## 🧪 測試策略

### 單元測試
```javascript
// Jest 組件測試
describe('PriceAlertModal', () => {
  let modal;
  
  beforeEach(() => {
    document.body.innerHTML = '<div id="price-alert-modal"></div>';
    modal = new PriceAlertModal();
  });
  
  test('should initialize correctly', () => {
    expect(modal.isVisible).toBe(false);
    expect(modal.currentSymbol).toBeNull();
  });
  
  test('should show modal with symbol', () => {
    modal.show('BTCUSDT');
    expect(modal.isVisible).toBe(true);
    expect(modal.currentSymbol).toBe('BTCUSDT');
  });
});
```

### 整合測試
```javascript
// Cypress E2E 測試
describe('Price Alert Flow', () => {
  it('should create price alert successfully', () => {
    cy.visit('/');
    cy.get('[data-testid="currency-BTCUSDT"]').click();
    cy.get('[data-testid="set-alert-btn"]').click();
    cy.get('[data-testid="target-price"]').type('45000');
    cy.get('[data-testid="submit-alert"]').click();
    cy.contains('警報設定成功').should('be.visible');
  });
});
```

## 📊 監控與分析

### 錯誤監控
```javascript
// 全域錯誤捕獲
window.addEventListener('error', (event) => {
  console.error('Global Error:', event.error);
  // 發送錯誤報告到監控服務
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  // 處理未捕獲的 Promise 錯誤
});
```

### 效能監控
```javascript
// Performance Observer
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log('Performance Entry:', entry);
  });
});

observer.observe({ entryTypes: ['navigation', 'resource', 'paint'] });
```

---

*本文件提供了前端架構的完整概覽，詳細的組件實作請參考各個子文件。*