/**
 * NexusTrade 前端主要 JavaScript 檔案
 * 
 * 功能：
 * - 基本頁面導航
 * - 系統狀態檢查
 * - API 連接測試
 * - 響應式互動
 */

class NexusTradeApp {
  constructor() {
    this.systemStatus = 'checking';
    this.router = null;
    this.store = window.store;
    this.notificationComponent = null;
    this.init();
  }

  /**
   * 初始化應用程式
   */
  init() {
    console.log('🚀 NexusTrade 應用程式啟動中...');
    
    // 等待 DOM 完全載入
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
    } else {
      this.onDOMReady();
    }
  }

  /**
   * DOM 準備就緒後的初始化
   */
  onDOMReady() {
    console.log('📄 DOM 已準備就緒');
    
    this.setupComponents();
    this.setupRouter();
    this.setupEventListeners();
    this.setupStateSubscriptions();
    this.checkSystemHealth();
    this.hideLoadingScreen();
    
    console.log('✅ NexusTrade 應用程式已啟動');
  }

  /**
   * 設定組件
   */
  setupComponents() {
    console.log('🧩 設定組件...');
    
    // 初始化通知組件
    this.notificationComponent = new NotificationComponent();
  }

  /**
   * 設定路由系統
   */
  setupRouter() {
    console.log('🧭 設定路由系統...');
    
    this.router = RouteBuilder.create()
      .home(this.showPage.bind(this, 'dashboard'))
      .dashboard(this.showPage.bind(this, 'dashboard'))
      .market(this.showPage.bind(this, 'market'))
      .watchlist(this.showPage.bind(this, 'watchlist'))
      .notifications(this.showPage.bind(this, 'notifications'))
      .ai(this.showPage.bind(this, 'ai-insights'))
      .defaultTo('/dashboard')
      .notFound((context) => {
        console.warn('⚠️ 404 - 頁面未找到:', context.path);
        this.store.dispatch(ActionCreators.showNotification('頁面未找到', 'error'));
        this.router.navigate('/dashboard', true);
      })
      .build();
  }

  /**
   * 設定狀態訂閱
   */
  setupStateSubscriptions() {
    console.log('🏪 設定狀態訂閱...');
    
    // 訂閱認證狀態變化
    this.store.subscribe((newState, prevState) => {
      if (newState.auth.isAuthenticated !== prevState.auth?.isAuthenticated) {
        this.handleAuthStateChange(newState.auth.isAuthenticated);
      }
      
      // 訂閱 UI 狀態變化
      if (newState.ui.notification?.visible !== prevState.ui?.notification?.visible) {
        this.handleNotificationChange(newState.ui.notification);
      }
      
      if (newState.ui.loading?.isLoading !== prevState.ui?.loading?.isLoading) {
        this.handleLoadingChange(newState.ui.loading);
      }
    });
  }

  /**
   * 設定事件監聽器
   */
  setupEventListeners() {
    // 導航點擊事件
    document.addEventListener('click', (e) => {
      // 導航連結
      if (e.target.classList.contains('nav-link')) {
        e.preventDefault();
        const href = e.target.getAttribute('href');
        if (href && href.startsWith('#')) {
          this.navigateToPage(href.substring(1));
        }
      }
      
      // 按鈕點擊事件
      if (e.target.id === 'login-btn') {
        this.handleLogin();
      } else if (e.target.id === 'signup-btn') {
        this.handleSignup();
      }
    });

    // 鍵盤快捷鍵
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            this.navigateToPage('dashboard');
            break;
          case '2':
            e.preventDefault();
            this.navigateToPage('market');
            break;
          case '3':
            e.preventDefault();
            this.navigateToPage('watchlist');
            break;
        }
      }
    });

    // 視窗調整大小事件
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    console.log('🎯 事件監聽器已設定');
  }

  /**
   * 顯示頁面
   */
  showPage(pageName, context = {}) {
    console.log(`🧭 顯示頁面: ${pageName}`, context);
    
    // 更新狀態
    this.store.dispatch(ActionCreators.setCurrentPage(pageName));
    
    // 隱藏所有頁面
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });
    
    // 移除所有導航連結的活躍狀態
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    
    // 顯示目標頁面
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
      targetPage.classList.add('active');
      
      // 設定對應導航連結為活躍
      const navLink = document.querySelector(`.nav-link[href="#${pageName}"]`);
      if (navLink) {
        navLink.classList.add('active');
      }
      
      // 更新頁面標題
      this.updatePageTitle(pageName);
      
      // 載入頁面數據
      this.loadPageData(pageName, context);
    }
  }

  /**
   * 舊版導航方法 (向後相容)
   */
  navigateToPage(pageName) {
    if (this.router) {
      this.router.navigate(`/${pageName}`);
    } else {
      this.showPage(pageName);
    }
  }

  /**
   * 更新頁面標題
   */
  updatePageTitle(pageName) {
    const titles = {
      dashboard: 'NexusTrade - 儀表板',
      market: 'NexusTrade - 市場數據',
      watchlist: 'NexusTrade - 關注清單',
      notifications: 'NexusTrade - 通知設定',
      'ai-insights': 'NexusTrade - AI 分析'
    };
    
    document.title = titles[pageName] || 'NexusTrade';
  }

  /**
   * 檢查系統健康狀態
   */
  async checkSystemHealth() {
    console.log('🏥 檢查系統狀態...');
    
    try {
      const response = await fetch('/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateSystemStatus('online', '系統正常');
        console.log('✅ 系統狀態正常:', data);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ 系統狀態檢查失敗:', error);
      this.updateSystemStatus('offline', '連接失敗');
    }
  }

  /**
   * 更新系統狀態顯示
   */
  updateSystemStatus(status, text) {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    
    if (statusDot && statusText) {
      statusDot.className = `status-dot ${status}`;
      statusText.textContent = text;
      this.systemStatus = status;
    }
  }

  /**
   * 隱藏載入畫面
   */
  hideLoadingScreen() {
    setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      const app = document.getElementById('app');
      
      if (loadingScreen && app) {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 0.5s ease';
        
        setTimeout(() => {
          loadingScreen.style.display = 'none';
          app.style.display = 'flex';
          app.style.opacity = '0';
          app.style.transition = 'opacity 0.5s ease';
          
          requestAnimationFrame(() => {
            app.style.opacity = '1';
          });
        }, 500);
      }
    }, 1000); // 顯示載入畫面至少 1 秒
  }

  /**
   * 處理登入
   */
  handleLogin() {
    console.log('🔐 處理登入請求');
    this.store.dispatch(ActionCreators.showNotification(
      '登入功能將在認證系統完成後推出 (Task 3 階段)', 
      'info', 
      4000
    ));
  }

  /**
   * 處理註冊
   */
  handleSignup() {
    console.log('📝 處理註冊請求');
    this.store.dispatch(ActionCreators.showNotification(
      '註冊功能將在認證系統完成後推出 (Task 3 階段)', 
      'info', 
      4000
    ));
  }

  /**
   * 處理視窗大小調整
   */
  handleResize() {
    // 在移動設備上更新視口高度
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  /**
   * 測試 API 連接
   */
  async testApiConnection() {
    console.log('🔌 測試 API 連接...');
    
    try {
      const response = await fetch('/api/test');
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API 連接成功:', data);
        return true;
      } else {
        throw new Error(`API 回應錯誤: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ API 連接失敗:', error);
      return false;
    }
  }

  /**
   * 格式化價格顯示
   */
  formatPrice(price, decimals = 2) {
    if (typeof price !== 'number') return '--';
    
    return new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(price);
  }

  /**
   * 格式化價格變動百分比
   */
  formatPriceChange(change) {
    if (typeof change !== 'number') return '--';
    
    const formatted = Math.abs(change).toFixed(2);
    const sign = change >= 0 ? '+' : '-';
    return `${sign}${formatted}%`;
  }

  /**
   * 顯示通知訊息
   */
  showNotification(message, type = 'info', duration = 3000) {
    console.log(`📢 通知 (${type}):`, message);
    
    // TODO: 實現通知 UI 組件
    // 目前先使用 console.log
  }

  /**
   * 獲取當前時間戳
   */
  getCurrentTimestamp() {
    return new Date().toISOString();
  }

  /**
   * 載入頁面數據
   */
  async loadPageData(pageName, context) {
    console.log(`📊 載入頁面數據: ${pageName}`);
    
    try {
      switch (pageName) {
        case 'dashboard':
          await this.loadDashboardData();
          break;
        case 'market':
          await this.loadMarketData();
          break;
        case 'watchlist':
          await this.loadWatchlistData();
          break;
        case 'notifications':
          await this.loadNotificationsData();
          break;
        case 'ai-insights':
          await this.loadAIInsightsData();
          break;
      }
    } catch (error) {
      console.error(`❌ 載入頁面數據失敗: ${pageName}`, error);
      this.showNotification('載入數據失敗', 'error');
    }
  }

  /**
   * 載入儀表板數據
   */
  async loadDashboardData() {
    // TODO: 實現儀表板數據載入
    console.log('📊 載入儀表板數據 (尚未實現)');
  }

  /**
   * 載入市場數據
   */
  async loadMarketData() {
    // TODO: 實現市場數據載入
    console.log('📈 載入市場數據 (尚未實現)');
  }

  /**
   * 載入關注清單數據
   */
  async loadWatchlistData() {
    // TODO: 實現關注清單數據載入
    console.log('⭐ 載入關注清單數據 (尚未實現)');
  }

  /**
   * 載入通知數據
   */
  async loadNotificationsData() {
    // TODO: 實現通知數據載入
    console.log('🔔 載入通知數據 (尚未實現)');
  }

  /**
   * 載入 AI 洞察數據
   */
  async loadAIInsightsData() {
    // TODO: 實現 AI 洞察數據載入
    console.log('🤖 載入 AI 洞察數據 (尚未實現)');
  }

  /**
   * 處理認證狀態變化
   */
  handleAuthStateChange(isAuthenticated) {
    console.log(`🔐 認證狀態變化: ${isAuthenticated}`);
    
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    
    if (isAuthenticated) {
      // 隱藏登入/註冊按鈕，顯示使用者資訊
      if (loginBtn) loginBtn.style.display = 'none';
      if (signupBtn) signupBtn.style.display = 'none';
      
      // TODO: 顯示使用者資訊和登出按鈕
    } else {
      // 顯示登入/註冊按鈕
      if (loginBtn) loginBtn.style.display = '';
      if (signupBtn) signupBtn.style.display = '';
    }
  }

  /**
   * 處理通知變化
   */
  handleNotificationChange(notification) {
    if (notification.visible) {
      this.displayNotification(notification.message, notification.type, notification.duration);
    }
  }

  /**
   * 處理載入狀態變化
   */
  handleLoadingChange(loading) {
    // TODO: 實現載入狀態 UI 更新
    console.log('⏳ 載入狀態變化:', loading);
  }

  /**
   * 顯示通知 (更新版本)
   */
  displayNotification(message, type = 'info', duration = 3000) {
    console.log(`📢 顯示通知 (${type}):`, message);
    
    // TODO: 實現通知 UI 組件
    // 目前先使用簡單的 alert
    if (type === 'error') {
      console.error(message);
    } else {
      console.info(message);
    }
    
    // 自動隱藏通知
    if (duration > 0) {
      setTimeout(() => {
        this.store.dispatch(ActionCreators.hideNotification());
      }, duration);
    }
  }
}

// 工具函數
const utils = {
  /**
   * 防抖函數
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * 節流函數
   */
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * 本地存儲輔助函數
   */
  storage: {
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('Storage set error:', error);
        return false;
      }
    },

    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.error('Storage get error:', error);
        return defaultValue;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error('Storage remove error:', error);
        return false;
      }
    }
  }
};

// 全域變數
let app;

// 啟動應用程式
document.addEventListener('DOMContentLoaded', () => {
  app = new NexusTradeApp();
  
  // 全域錯誤處理
  window.addEventListener('error', (e) => {
    console.error('🚨 全域錯誤:', e.error);
  });
  
  window.addEventListener('unhandledrejection', (e) => {
    console.error('🚨 未處理的 Promise 拒絕:', e.reason);
  });
});

// 匯出到全域（開發階段用）
window.NexusTradeApp = NexusTradeApp;
window.utils = utils;