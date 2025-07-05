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
    
    // 讓路由器處理初始化，避免重複載入
    setTimeout(() => {
      const hash = window.location.hash;
      if (!hash || hash === '#' || hash === '#/') {
        console.log('🏠 使用路由器載入預設首頁');
        // 使用路由器導航，避免重複調用 showPage
        this.router.navigate('/dashboard', false);
      }
    }, 100); // 縮短延遲時間
    
    console.log('✅ NexusTrade 應用程式已啟動');
  }

  /**
   * 設定組件
   */
    setupComponents() {
    console.log('🧩 設定組件...');
    
    // 初始化通知組件
    this.notificationComponent = new NotificationComponent();
    
    // 初始化價格警報模態框 (全域組件)
    if (typeof PriceAlertModal !== 'undefined' && !window.priceAlertModal) {
      console.log('🔔 初始化價格警報模態框...');
      window.priceAlertModal = new PriceAlertModal();
    }
    
    // 新的認證系統會自動初始化，無需手動設定
    console.log('🔐 等待 AuthManager 自動初始化...');
    
    // 初始化新聞跑馬燈 (全局組件) - 延遲初始化
    setTimeout(() => {
      const tickerContainer = document.getElementById('news-ticker');
      if (typeof NewsTicker !== 'undefined' && !this.newsTickerComponent && tickerContainer) {
        console.log('📰 初始化新聞跑馬燈...');
        this.newsTickerComponent = new NewsTicker(tickerContainer);
      }
    }, 500);
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
      .news(this.showPage.bind(this, 'news'))
      .watchlist(this.showPage.bind(this, 'watchlist'))
      .priceAlerts(this.showPage.bind(this, 'price-alerts'))
      .notifications(this.showPage.bind(this, 'notifications'))
      .settings(this.showPage.bind(this, 'settings'))
      .add('/currency/:symbol', this.showCurrencyDetail.bind(this))
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
    console.log(`🧭 🔥 顯示頁面: ${pageName}`, context);
    
    // 🔧 關鍵修復：先清理所有組件和定時器
    this.cleanupPageComponents();
    
    // 如果離開貨幣詳情頁面，恢復其他 TradingView Widget
    if (this.currentPage === 'currency-detail' && pageName !== 'currency-detail') {
      this.restoreTradingViewWidgets();
    }
    
    // 更新狀態
    this.store.dispatch(ActionCreators.setCurrentPage(pageName));
    this.currentPage = pageName;
    
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
   * 恢復 TradingView Widget 顯示
   */
  restoreTradingViewWidgets() {
    console.log('🔄 恢復 TradingView Widget 顯示...');
    
    // 恢復首頁的 TradingView Widget
    const homepageWidgets = ['homepage-tradingview-0', 'homepage-tradingview-1', 'homepage-tradingview-2'];
    homepageWidgets.forEach(id => {
      const container = document.getElementById(id);
      if (container) {
        container.style.display = '';
      }
    });
    
    // 恢復其他頁面的 TradingView 容器
    const allTradingViewContainers = document.querySelectorAll('.tradingview-widget-container:not([id*="currency-detail"])');
    allTradingViewContainers.forEach(container => {
      if (!container.closest('#currency-detail-page')) {
        container.style.display = '';
      }
    });
    
    console.log('✅ TradingView Widget 顯示已恢復');
  }

  /**
   * 顯示貨幣詳情頁面
   */
  showCurrencyDetail(context) {
    const symbol = context.params.symbol?.toUpperCase();
    
    if (!symbol) {
      console.error('❌ 貨幣符號參數缺失');
      this.router.navigate('/market', true);
      return;
    }
    
    console.log(`📊 顯示 ${symbol} 詳情頁面`);
    
    // 🔧 重要修復：清理頁面組件，避免衝突
    this.cleanupPageComponents();
    
    // 🔧 重要修復：隱藏首頁的 TradingView Widget，避免衝突
    console.log('🧹 隱藏首頁 TradingView Widget 避免衝突...');
    const homepageWidgets = ['homepage-tradingview-0', 'homepage-tradingview-1', 'homepage-tradingview-2'];
    homepageWidgets.forEach(id => {
      const container = document.getElementById(id);
      if (container) {
        container.style.display = 'none';
      }
    });
    
    // 隱藏所有頁面
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });
    
    // 移除所有導航連結的活躍狀態
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    
    // 顯示貨幣詳情頁面
    const currencyDetailPage = document.getElementById('currency-detail-page');
    if (currencyDetailPage) {
      currencyDetailPage.classList.add('active');
      
      // 更新頁面標題
      document.title = `NexusTrade - ${symbol} 詳情分析`;
      
      // 初始化或更新貨幣詳情組件
      if (!this.currencyDetailPageComponent) {
        this.currencyDetailPageComponent = new CurrencyDetailPage();
      }
      
      // 載入指定貨幣的詳情
      this.currencyDetailPageComponent.loadCurrency(symbol);
      
      // 更新當前頁面狀態
      this.currentPage = 'currency-detail';
    } else {
      console.error('❌ 貨幣詳情頁面容器未找到');
      this.router.navigate('/market', true);
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
      dashboard: 'NexusTrade - 首頁',
      market: 'NexusTrade - 市場數據',
      news: 'NexusTrade - 加密貨幣新聞',
      watchlist: 'NexusTrade - 關注清單',
      notifications: 'NexusTrade - 通知設定',
      'price-alerts': 'NexusTrade - 價格警報',
      settings: 'NexusTrade - 使用者設定',
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
    
    if (this.loginModal) {
      this.loginModal.show();
    } else {
      this.store.dispatch(ActionCreators.showNotification(
        '登入模態框尚未載入，請稍後再試', 
        'warning', 
        3000
      ));
    }
  }

  /**
   * 處理註冊
   */
  handleSignup() {
    console.log('📝 處理註冊請求');
    
    if (this.loginModal) {
      this.loginModal.show();
    } else {
      this.store.dispatch(ActionCreators.showNotification(
        '註冊功能將透過 Google 或 LINE 登入提供', 
        'info', 
        4000
      ));
    }
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
    
    // 使用全域通知組件
    if (window.notificationComponent && typeof window.notificationComponent.showNotification === 'function') {
      window.notificationComponent.showNotification(message, type, duration);
    } else if (this.notificationComponent && typeof this.notificationComponent.showNotification === 'function') {
      this.notificationComponent.showNotification(message, type, duration);
    } else {
      // 備用方案：創建簡單的 alert
      const alertType = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
      // 不使用 alert，影響用戶體驗，改為 console 輸出
      console.log(`${alertType} ${message}`);
    }
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
    
    // 清理之前的組件和定時器
    this.cleanupPageComponents();
    
    try {
      switch (pageName) {
        case 'dashboard':
          await this.loadDashboardData();
          break;
        case 'market':
          await this.loadMarketData();
          break;
        case 'news':
          await this.loadNewsData();
          break;
        case 'watchlist':
          await this.loadWatchlistData();
          break;
        case 'notifications':
          await this.loadNotificationsData();
          break;
        case 'price-alerts':
          await this.loadPriceAlertsData();
          break;
        case 'settings':
          await this.loadSettingsData();
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
   * 清理頁面組件
   */
  cleanupPageComponents() {
    console.log('🧹 🔥 強制清理所有頁面組件和定時器...');
    
    // 清理首頁定時器
    this.stopTrendingCoinsTimer();
    
    // 清理市場頁面定時器
    this.stopMarketTrendingCoinsTimer();
    
    // 🔧 強制清理所有可能的定時器
    const timerProps = ['trendingCoinsTimer', 'marketTrendingCoinsTimer', 'newsTimer', 'updateTimer'];
    timerProps.forEach(prop => {
      if (this[prop]) {
        clearInterval(this[prop]);
        this[prop] = null;
        console.log(`🛑 強制清理定時器: ${prop}`);
      }
    });
    
    // 🔄 清理滾動載入監聽器
    if (this.scrollLoadingHandler) {
      window.removeEventListener('scroll', this.scrollLoadingHandler);
      this.scrollLoadingHandler = null;
      console.log('🛑 已清理滾動載入監聽器');
    }
    
    // 重置滾動載入相關狀態
    this.marketDataCache = null;
    this.currentDisplayCount = 0;
    this.loadingMore = false;
    
    // 重置渲染計數器和數據哈希，防止誤判重複
    this.homeRenderCount = 0;
    this.marketRenderCount = 0;
    this.lastHomeDataHash = null;
    this.lastMarketDataHash = null;
    console.log('🔄 已重置渲染計數器和數據哈希');
    
    // 清理市場頁面組件
    if (this.marketCryptoList) {
      try {
        this.marketCryptoList.destroy?.();
      } catch (error) {
        console.warn('⚠️ 清理市場貨幣列表組件失敗:', error);
      }
      this.marketCryptoList = null;
    }
    
    // 清理新聞頁面組件
    if (this.newsPage) {
      try {
        this.newsPage.cleanup?.();
      } catch (error) {
        console.warn('⚠️ 清理新聞頁面組件失敗:', error);
      }
    }
    
    // 清理觀察清單組件
    if (this.watchlistPage) {
      try {
        this.watchlistPage.cleanup?.();
      } catch (error) {
        console.warn('⚠️ 清理觀察清單組件失敗:', error);
      }
    }
    
    // 清理設定頁面組件
    if (this.settingsPage) {
      try {
        this.settingsPage.cleanup?.();
      } catch (error) {
        console.warn('⚠️ 清理設定頁面組件失敗:', error);
      }
    }
    
    // 清理價格警報頁面組件
    if (this.priceAlertsPage) {
      try {
        this.priceAlertsPage.cleanup?.();
      } catch (error) {
        console.warn('⚠️ 清理價格警報頁面組件失敗:', error);
      }
    }
    
    // 清理 AI 分析頁面組件
    if (this.aiInsightsPage) {
      try {
        this.aiInsightsPage.cleanup?.();
      } catch (error) {
        console.warn('⚠️ 清理 AI 分析頁面組件失敗:', error);
      }
    }
    
    console.log('✅ 頁面組件清理完成');
  }

  /**
   * 載入首頁數據
   */
  async loadDashboardData() {
    console.log('🏠 載入首頁數據...');
    
    try {
      // 檢查是否在首頁，如果不是則跳過
      const currentPage = document.getElementById('dashboard-page');
      if (!currentPage || !currentPage.classList.contains('active')) {
        console.log('⏭️ 不在首頁，跳過首頁數據載入');
        return;
      }
      
      // 直接使用穩定的熱門貨幣載入方式 (跳過新組件系統)
      console.log('📊 使用穩定的熱門貨幣載入方式');
      this.startTrendingCoinsTimer();
      
      
      // 並行載入所有數據
      await Promise.all([
        this.loadNewsHighlights(),
        this.loadMainCoinPrices()
      ]);
      
      // 🎯 初始化首頁 TradingView 小工具
      console.log('📊 初始化首頁 TradingView 小工具...');
      await this.initializeHomepageTradingViewWidgets();
      
      // 🤖 初始化首頁 AI 大趨勢分析組件
      console.log('🤖 初始化首頁 AI 大趨勢分析...');
      this.initializeHomepageAITrend();
      
      console.log('✅ 首頁數據載入完成');
    } catch (error) {
      console.error('❌ 載入首頁數據失敗:', error);
      this.showNotification('無法載入首頁數據', 'error');
    }
  }

  /**
   * 更新市場概覽數據
   */
  updateMarketOverview(data) {
    console.log('📊 更新市場概覽數據:', data);
    
    // 更新主要幣種價格
    if (data.majorPrices) {
      this.updatePriceDisplay('BTC/USDT', data.majorPrices.btc);
      this.updatePriceDisplay('ETH/USDT', data.majorPrices.eth);
      
      // 如果有 BNB 數據也更新
      if (data.majorPrices.bnb) {
        this.updatePriceDisplay('BNB/USDT', data.majorPrices.bnb);
      }
    }
    
    // 更新狀態指示器
    const statusIndicator = document.querySelector('.market-overview .status-indicator');
    if (statusIndicator) {
      statusIndicator.className = 'status-indicator online';
      statusIndicator.textContent = '即時';
    }
  }
  
  /**
   * 更新價格顯示
   */
  updatePriceDisplay(label, priceData) {
    if (!priceData) return;
    
    // 查找對應的統計項目
    const statItems = document.querySelectorAll('.stat-item');
    for (const item of statItems) {
      const labelElement = item.querySelector('.stat-label');
      if (labelElement && labelElement.textContent === label) {
        const valueElement = item.querySelector('.stat-value');
        const changeElement = item.querySelector('.stat-change');
        
        if (valueElement) {
          valueElement.textContent = `$${priceData.price?.toLocaleString() || '--'}`;
        }
        
        if (changeElement && priceData.priceChangePercent !== undefined) {
          const change = priceData.priceChangePercent;
          const isPositive = change >= 0;
          changeElement.textContent = `${isPositive ? '+' : ''}${change.toFixed(2)}%`;
          changeElement.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
        }
        break;
      }
    }
  }
  
  /**
   * 更新通知狀態
   */
  async updateNotificationStatus() {
    try {
      const response = await fetch('/api/notifications/status');
      const result = await response.json();
      
      if (result.status === 'success') {
        // 更新通知狀態卡片
        const notificationCard = document.querySelector('.notification-status .card-content');
        if (notificationCard) {
          const hasActiveNotifications = result.data.lineMessaging.configured || 
                                       result.data.email.configured;
          
          notificationCard.innerHTML = `
            <div class="notification-info">
              <p>通知服務狀態: ${hasActiveNotifications ? '已啟用' : '待設定'}</p>
              <button class="btn ${hasActiveNotifications ? 'btn-outline' : 'btn-primary'}" 
                      onclick="app.navigateToPage('notifications')">
                ${hasActiveNotifications ? '管理通知' : '設定通知'}
              </button>
            </div>
          `;
        }
      }
    } catch (error) {
      console.error('❌ 更新通知狀態失敗:', error);
    }
  }

  /**
   * 載入市場數據
   */
  async loadMarketData() {
    console.log('📈 🔥 市場數據載入開始 - 簡化版本');
    
    try {
      // 檢查是否在市場頁面
      const marketPage = document.getElementById('market-page');
      if (!marketPage || !marketPage.classList.contains('active')) {
        console.log('⏭️ 不在市場頁面，跳過市場數據載入');
        return;
      }

      console.log('📊 檢查市場頁面容器...');
      const marketContainer = document.getElementById('market-coins-grid');
      if (!marketContainer) {
        console.error('❌ 找不到市場頁面容器: #market-coins-grid');
        return;
      }
      
      console.log('✅ 找到市場頁面容器，開始簡化載入');
      
      // 🔧 關鍵修復：先停止任何現有的定時器，避免重複載入
      this.stopMarketTrendingCoinsTimer();
      this.stopTrendingCoinsTimer(); // 也停止首頁的定時器
      
      console.log('🛑 已停止所有現有定時器');
      
      // 直接顯示簡化的測試內容，繞過複雜的組件邏輯
      marketContainer.innerHTML = `
        <div class="trending-coins-table">
          <div class="table-header">
            <div class="col-coin">貨幣</div>
            <div class="col-price">價格</div>
            <div class="col-change">24h 變化</div>
            <div class="col-change-amount">漲跌點數</div>
            <div class="col-volume">24h 交易量</div>
            <div class="col-market-cap">市值</div>
          </div>
          <div class="table-body" id="market-coins-grid">
            <div class="loading-row">
              <div class="loading-spinner"></div>
              <span>正在載入市場數據...</span>
            </div>
          </div>
        </div>
      `;
      
      console.log('✅ 市場頁面表格結構已建立');
      
      // 並行載入市場數據和統計資訊
      await Promise.all([
        this.loadMarketTrendingCoinsSimple(),
        this.loadMarketStats()
      ]);
      
      // 🎯 初始化 TradingView 小工具
      console.log('📊 初始化市場頁面 TradingView 小工具...');
      await this.initializeMarketTradingViewWidgets();
      
      console.log('✅ 市場頁面數據載入完成');
    } catch (error) {
      console.error('❌ 載入市場數據失敗:', error);
      console.error('❌ 錯誤堆疊:', error.stack);
      
      // 顯示錯誤狀態
      const marketContainer = document.getElementById('market-coins-grid');
      if (marketContainer) {
        marketContainer.innerHTML = `
          <div class="error-message" style="padding: 20px; text-align: center; color: #ff6b6b;">
            <h3>🚨 載入失敗</h3>
            <p><strong>錯誤詳情:</strong> ${error.message}</p>
            <button onclick="window.app?.loadMarketData()" style="margin-top: 10px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">🔄 重新載入</button>
          </div>
        `;
      }
    }
  }
  
  /**
   * 載入市場統計數據
   */
  async loadMarketStats() {
    console.log('📊 載入市場統計數據...');
    
    try {
      const response = await fetch('/api/market/stats24h');
      const result = await response.json();
      
      if (result.success && result.data) {
        this.updateMarketStatsDisplay(result.data);
      } else {
        console.warn('無法載入市場統計數據');
      }
    } catch (error) {
      console.error('❌ 載入市場統計數據失敗:', error);
    }
  }

  /**
   * 更新市場統計數據顯示
   */
  updateMarketStatsDisplay(stats) {
    const marketStats = document.getElementById('market-stats');
    if (!marketStats) return;

    // 修復欄位名稱對應問題
    const totalCoins = stats.totalCoins || stats.totalPairs || 0;
    const avgChange = stats.avgChange || stats.averageChange || 0;
    const gainersCount = stats.gainersCount || stats.gainers || 0;
    const losersCount = stats.losersCount || stats.losers || 0;
    const totalVolume = stats.totalVolume || 0;

    marketStats.innerHTML = `
      <div class="market-stat">
        <div class="stat-label">總交易對數量</div>
        <div class="stat-value">${totalCoins}</div>
      </div>
      <div class="market-stat">
        <div class="stat-label">24h 平均變化</div>
        <div class="stat-value ${avgChange >= 0 ? 'positive' : 'negative'}">
          ${avgChange.toFixed(2)}%
        </div>
      </div>
      <div class="market-stat">
        <div class="stat-label">上漲貨幣</div>
        <div class="stat-value positive">${gainersCount}</div>
      </div>
      <div class="market-stat">
        <div class="stat-label">下跌貨幣</div>
        <div class="stat-value negative">${losersCount}</div>
      </div>
      <div class="market-stat">
        <div class="stat-label">24h 總交易量</div>
        <div class="stat-value">${this.formatLargeNumber(totalVolume)}</div>
      </div>
    `;
  }

  /**
   * 格式化大數字顯示
   */
  formatLargeNumber(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  }

  /**
   * 顯示熱門交易對
   */
  displayTrendingPairs(pairs) {
    console.log('📈 顯示熱門交易對:', pairs);
    // TODO: 實現熱門交易對顯示邏輯
  }
  
  /**
   * 初始化首頁的 TradingView Widgets
   */
  async initializeHomepageTradingViewWidgets() {
    console.log('📊 初始化首頁 TradingView Widgets...');
    
    try {
      // 首頁的三個 TradingView 小工具
      const homepageWidgets = [
        { containerId: 'homepage-tradingview-0', symbol: "BINANCE:BTCUSDT", name: "Bitcoin" },
        { containerId: 'homepage-tradingview-1', symbol: "BINANCE:ETHUSDT", name: "Ethereum" },
        { containerId: 'homepage-tradingview-2', symbol: "BINANCE:BNBUSDT", name: "BNB" }
      ];

      // 為每個小工具容器創建 TradingView Widget
      homepageWidgets.forEach((widget, index) => {
        const container = document.getElementById(widget.containerId);
        if (container) {
          console.log(`📊 找到容器: ${widget.containerId}`);
          
          // 創建 TradingView widget
          this.createSimpleTradingViewWidget(widget.containerId, {
            symbol: widget.symbol,
            width: "100%",
            height: "200",
            locale: "zh_TW",
            dateRange: "12M",
            colorTheme: "dark",
            isTransparent: false,
            autosize: true
          });
          
          console.log(`✅ 創建首頁 TradingView Widget: ${widget.name} (${widget.symbol})`);
        } else {
          console.warn(`⚠️ 找不到首頁 Widget 容器: ${widget.containerId}`);
        }
      });
      
      console.log('✅ 首頁 TradingView Widgets 初始化完成');
    } catch (error) {
      console.error('❌ 首頁 TradingView Widgets 初始化失敗:', error);
    }
  }

  /**
   * 初始化市場頁面的 TradingView Widgets
   */
  async initializeMarketTradingViewWidgets() {
    console.log('📊 市場頁面 TradingView 小工具已使用官方HTML嵌入');
    
    try {
      // 檢查加密貨幣熱力圖容器
      const heatmapContainer = document.getElementById('crypto-heatmap-widget');
      
      if (heatmapContainer) {
        console.log('✅ 加密貨幣熱力圖容器已存在，使用官方HTML嵌入');
      } else {
        console.warn('⚠️ 找不到加密貨幣熱力圖容器: crypto-heatmap-widget');
      }
      
      console.log('✅ 市場頁面 TradingView 熱力圖初始化完成（使用官方嵌入）');
    } catch (error) {
      console.error('❌ 市場頁面 TradingView 熱力圖初始化失敗:', error);
    }
  }

  /**
   * 創建簡化的 TradingView Widget
   */
  createSimpleTradingViewWidget(containerId, config) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ 找不到容器: ${containerId}`);
      return;
    }

    // 清空容器
    container.innerHTML = '';
    
    // 使用現代的 TradingView 小工具嵌入方式（容器尺寸控制）
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    // 移除直接樣式設定，改由 CSS 控制尺寸
    
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.async = true;
    
    // 使用容器響應式配置方式
    const configJson = {
      "symbol": config.symbol,
      "width": "100%",
      "height": "100%",
      "locale": config.locale || "zh_TW",
      "dateRange": config.dateRange || "12M",
      "colorTheme": config.colorTheme || "dark",
      "isTransparent": config.isTransparent || false,
      "autosize": true,
      "largeChartUrl": ""
    };
    
    script.innerHTML = JSON.stringify(configJson);
    
    widgetContainer.appendChild(widgetDiv);
    widgetContainer.appendChild(script);
    container.appendChild(widgetContainer);
    
    console.log(`✅ 創建現代 TradingView Widget: ${containerId}`, configJson);
  }

  /**
   * 載入真實的 TradingView Widget (非同步) - 已棄用，使用現代方式
   */
  async loadRealTradingViewWidget(containerId, config) {
    // 此方法已不需要，現代方式直接在 createSimpleTradingViewWidget 中處理
    console.log(`📊 使用現代 TradingView 嵌入方式，無需額外載入: ${containerId}`);
  }

  /**
   * 創建 TradingView 加密貨幣熱力圖 Widget
   */
  createCryptoHeatmapWidget(container) {
    try {
      console.log('🔧 載入加密貨幣熱力圖 Widget...');
      
      // 清空容器
      container.innerHTML = '';
      
      // 創建 Widget 容器
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'tradingview-widget';
      widgetContainer.style.height = '500px';
      widgetContainer.style.width = '100%';
      
      // 創建 TradingView Script
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js';
      script.async = true;
      
      // 加密貨幣熱力圖配置
      const config = {
        "dataSource": "Crypto",
        "blockSize": "market_cap_calc",
        "blockColor": "change",
        "locale": "zh_TW",
        "symbolUrl": "",
        "colorTheme": "dark",
        "hasTopBar": false,
        "isDataSetEnabled": false,
        "isZoomEnabled": true,
        "hasSymbolTooltip": true,
        "width": "100%",
        "height": "500"
      };
      
      script.innerHTML = JSON.stringify(config);
      
      // 添加到容器
      container.appendChild(widgetContainer);
      widgetContainer.appendChild(script);
      
      // 添加載入中的提示
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'widget-loading';
      loadingDiv.innerHTML = `
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <p>載入加密貨幣熱力圖中...</p>
        </div>
      `;
      widgetContainer.appendChild(loadingDiv);
      
      // 設定超時檢查
      setTimeout(() => {
        const scripts = widgetContainer.querySelectorAll('script');
        if (scripts.length === 1) {
          console.warn('⚠️ 加密貨幣熱力圖 Widget 可能載入失敗');
          this.showHeatmapError(container);
        }
      }, 10000); // 10秒超時
      
      console.log('✅ 已設定加密貨幣熱力圖 Widget');
      
    } catch (error) {
      console.error('❌ 載入加密貨幣熱力圖 Widget 失敗:', error);
      this.showHeatmapError(container);
    }
  }

  /**
   * 顯示加密貨幣熱力圖載入錯誤
   */
  showHeatmapError(container) {
    container.innerHTML = `
      <div class="widget-error">
        <div class="error-icon">🔥</div>
        <h4>加密貨幣熱力圖</h4>
        <p>載入失敗</p>
        <button class="retry-btn" onclick="nexusApp.createCryptoHeatmapWidget(document.getElementById('crypto-heatmap-widget'))">重試</button>
      </div>
    `;
  }

  /**
   * 創建 TradingView Widget
   */
  createTradingViewWidget(containerId, config) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ 找不到容器: ${containerId}`);
      return;
    }
    
    // 清理現有內容
    container.innerHTML = '';
    
    // 建立 Widget 容器
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify(config);
    
    widgetContainer.appendChild(widgetDiv);
    widgetContainer.appendChild(script);
    container.appendChild(widgetContainer);
    
    console.log(`📊 創建 TradingView Widget: ${containerId}`, config);
  }

  /**
   * 初始化 TradingView Widgets (舊方法，保留向後相容)
   */
  async initializeTradingViewWidgets() {
    try {
      console.log('📊 初始化 TradingView Widgets...');
      
      if (window.TradingViewWidgets) {
        // 建立市場概覽 Widget
        await window.TradingViewWidgets.createMarketOverviewWidget('tradingview-market-overview', {
          height: 300,
          tabs: [
            {
              title: "熱門加密貨幣",
              symbols: [
                {"s": "BINANCE:BTCUSDT", "d": "Bitcoin"},
                {"s": "BINANCE:ETHUSDT", "d": "Ethereum"},
                {"s": "BINANCE:BNBUSDT", "d": "BNB"},
                {"s": "BINANCE:ADAUSDT", "d": "Cardano"},
                {"s": "BINANCE:SOLUSDT", "d": "Solana"}
              ]
            }
          ]
        });
        
        console.log('✅ TradingView Widgets 初始化完成');
      } else {
        console.warn('⚠️ TradingView Widgets 組件未載入');
      }
    } catch (error) {
      console.error('❌ TradingView Widgets 初始化失敗:', error);
    }
  }

  /**
   * 載入新聞數據
   */
  async loadNewsData() {
    console.log('📰 載入新聞頁面...');
    
    try {
      // 確保頁面已經切換，然後初始化新聞頁面組件
      setTimeout(() => {
        if (!this.newsPage) {
          console.log('🔄 初始化新聞頁面組件...');
          this.newsPage = new NewsPage();
        } else {
          // 如果組件已存在，重新初始化DOM連接
          console.log('🔄 重新初始化新聞頁面DOM...');
          this.newsPage.initializeDOM();
        }
      }, 200);
      
      console.log('📰 新聞頁面載入中...');
    } catch (error) {
      console.error('❌ 載入新聞頁面失敗:', error);
      this.showNotification('載入新聞頁面失敗', 'error');
    }
  }

  /**
   * 載入關注清單數據
   */
  async loadWatchlistData() {
    console.log('⭐ 載入觀察清單數據...');
    
    try {
      // 初始化觀察清單組件 (如果尚未初始化)
      if (!this.watchlistPage && typeof WatchlistPage !== 'undefined') {
        console.log('📋 初始化觀察清單組件...');
        this.watchlistPage = new WatchlistPage();
        await this.watchlistPage.init();
        console.log('✅ 觀察清單組件初始化完成');
      } else if (this.watchlistPage) {
        // 如果已經初始化，重新載入數據
        console.log('🔄 重新載入觀察清單數據...');
        await Promise.all([
          this.watchlistPage.loadWatchlist(),
          this.watchlistPage.loadStats()
        ]);
        console.log('✅ 觀察清單數據重新載入完成');
      } else {
        console.warn('⚠️ WatchlistPage 組件未載入');
      }
    } catch (error) {
      console.error('❌ 載入觀察清單數據失敗:', error);
      this.showNotification('無法載入觀察清單', 'error');
    }
  }

  /**
   * 載入通知數據
   */
  async loadNotificationsData() {
    // TODO: 實現通知數據載入
    console.log('🔔 載入通知數據 (尚未實現)');
  }

  /**
   * 載入價格警報數據
   */
  async loadPriceAlertsData() {
    console.log('🔔 載入價格警報數據...');
    
    try {
      // 確保頁面容器存在並設定內容容器
      const pageContainer = document.getElementById('price-alerts-page');
      if (!pageContainer) {
        throw new Error('價格警報頁面容器未找到');
      }
      
      // 設定頁面內容結構
      pageContainer.innerHTML = `
        <div class="page-header">
          <h1>💰 價格警報</h1>
          <p>管理你的價格提醒與通知設定</p>
        </div>
        <div id="price-alerts-content" class="page-content">
          <div class="loading-spinner">載入中...</div>
        </div>
      `;
      
      // 初始化價格警報頁面組件 (如果尚未初始化)
      if (!this.priceAlertsPage && typeof PriceAlertsPage !== 'undefined') {
        console.log('🔔 初始化價格警報頁面組件...');
        this.priceAlertsPage = new PriceAlertsPage();
        await this.priceAlertsPage.init();
        console.log('✅ 價格警報頁面組件初始化完成');
      } else if (this.priceAlertsPage) {
        // 如果已經初始化，重新載入數據
        console.log('🔄 重新載入價格警報數據...');
        await this.priceAlertsPage.loadAlerts();
        console.log('✅ 價格警報數據重新載入完成');
      } else {
        console.warn('⚠️ PriceAlertsPage 組件未載入');
        // 顯示錯誤訊息
        const contentContainer = document.getElementById('price-alerts-content');
        if (contentContainer) {
          contentContainer.innerHTML = `
            <div class="error-message">
              <h3>⚠️ 載入錯誤</h3>
              <p>價格警報組件無法載入，請重新整理頁面。</p>
            </div>
          `;
        }
      }
    } catch (error) {
      console.error('❌ 載入價格警報數據失敗:', error);
      this.showNotification('無法載入價格警報頁面', 'error');
      
      // 顯示錯誤頁面
      const pageContainer = document.getElementById('price-alerts-page');
      if (pageContainer) {
        pageContainer.innerHTML = `
          <div class="error-page">
            <h1>❌ 載入失敗</h1>
            <p>無法載入價格警報數據：${error.message}</p>
            <button class="btn btn-primary" onclick="location.reload()">重新載入</button>
          </div>
        `;
      }
    }
  }

  /**
   * 載入設定數據
   */
  async loadSettingsData() {
    console.log('⚙️ 載入使用者設定數據...');
    
    try {
      // 初始化設定頁面組件 (如果尚未初始化)
      if (!this.settingsPage && typeof SettingsPage !== 'undefined') {
        console.log('⚙️ 初始化設定頁面組件...');
        this.settingsPage = new SettingsPage();
        await this.settingsPage.init();
        console.log('✅ 設定頁面組件初始化完成');
      } else if (this.settingsPage) {
        // 如果已經初始化，重新載入數據
        console.log('🔄 重新載入設定數據...');
        await this.settingsPage.loadSettings();
        this.settingsPage.renderSettings();
        console.log('✅ 設定數據重新載入完成');
      } else {
        console.warn('⚠️ SettingsPage 組件未載入');
      }
    } catch (error) {
      console.error('❌ 載入設定數據失敗:', error);
      this.showNotification('無法載入設定頁面', 'error');
    }
  }

  /**
   * 載入 AI 洞察數據
   */
  async loadAIInsightsData() {
    console.log('🤖 載入 AI 分析頁面...');
    
    try {
      // 檢查 AI 分析頁面組件是否存在
      if (typeof AIInsightsPage !== 'undefined') {
        // 如果已有實例，清理它
        if (this.aiInsightsPage) {
          this.aiInsightsPage.cleanup?.();
        }
        
        // 創建新的 AI 分析頁面實例
        this.aiInsightsPage = new AIInsightsPage();
        
        // 渲染頁面
        this.aiInsightsPage.render();
        
        // 初始化組件
        await this.aiInsightsPage.init();
        
        console.log('✅ AI 分析頁面已載入');
      } else {
        console.warn('⚠️ AIInsightsPage 組件未載入');
        
        // 顯示備用內容
        const container = document.getElementById('ai-insights-content');
        if (container) {
          container.innerHTML = `
            <div class="error-state">
              <h3>⚠️ AI 分析服務未可用</h3>
              <p>AI 分析組件載入失敗，請重新整理頁面或聯繫技術支援。</p>
            </div>
          `;
        }
      }
    } catch (error) {
      console.error('❌ AI 分析頁面載入失敗:', error);
      
      // 顯示錯誤狀態
      const container = document.getElementById('ai-insights-content');
      if (container) {
        container.innerHTML = `
          <div class="error-state">
            <h3>❌ 載入失敗</h3>
            <p>AI 分析頁面載入時發生錯誤：${error.message}</p>
            <button onclick="location.reload()" class="btn btn-primary">重新載入</button>
          </div>
        `;
      }
    }
  }

  /**
   * 初始化新聞跑馬燈
   */
  initializeNewsTicker() {
    console.log('📰 初始化新聞跑馬燈...');
    
    try {
      const tickerContainer = document.getElementById('news-ticker');
      if (tickerContainer) {
        // 檢查 NewsTicker 組件是否存在
        if (typeof NewsTicker !== 'undefined') {
          this.newsTicker = new NewsTicker();
          console.log('📰 新聞跑馬燈已初始化');
        } else {
          console.warn('⚠️ NewsTicker 組件未載入');
        }
      } else {
        console.warn('⚠️ 找不到新聞跑馬燈容器');
      }
    } catch (error) {
      console.error('❌ 新聞跑馬燈初始化失敗:', error);
    }
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

  /**
   * 載入新聞焦點
   */
  async loadNewsHighlights() {
    console.log('📰 載入新聞焦點...');
    
    try {
      const response = await fetch('/api/news/latest?limit=5');
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        this.renderNewsHighlights(result.data);
      } else {
        console.warn('無法載入新聞數據');
      }
    } catch (error) {
      console.error('❌ 載入新聞焦點失敗:', error);
    }
  }

  /**
   * 渲染新聞焦點
   */
  renderNewsHighlights(newsData) {
    const mainStories = newsData.slice(0, 2);  // 前兩則頭條
    const secondaryNews = newsData.slice(2, 5); // 第3-5則新聞

    // 更新兩個頭條新聞
    const mainStoryElements = document.querySelectorAll('.main-story');
    mainStories.forEach((story, index) => {
      const element = mainStoryElements[index];
      if (element && story) {
        const imageElement = element.querySelector('.story-image img');
        const titleElement = element.querySelector('.story-title');
        const summaryElement = element.querySelector('.story-summary');
        const timeElement = element.querySelector('.story-time');

        if (imageElement) {
          imageElement.src = story.imageUrl || '/images/news-placeholder.svg';
          imageElement.alt = story.title;
        }
        
        if (titleElement) {
          titleElement.textContent = story.title;
        }
        
        if (summaryElement) {
          summaryElement.textContent = story.description || '暫無摘要';
        }

        if (timeElement) {
          timeElement.textContent = this.getTimeAgo(story.publishedAt);
        }

        // 添加點擊事件
        element.addEventListener('click', () => {
          window.open(story.link, '_blank');
        });
        element.style.cursor = 'pointer';
      }
    });

    // 更新其他新聞
    const secondaryNewsElements = document.querySelectorAll('.secondary-news .story-item');
    secondaryNews.forEach((news, index) => {
      const element = secondaryNewsElements[index];
      if (element && news) {
        const titleElement = element.querySelector('.story-title');
        const sourceElement = element.querySelector('.story-source');
        
        if (titleElement) {
          titleElement.textContent = news.title;
        }

        if (sourceElement) {
          sourceElement.textContent = news.source;
        }

        // 添加點擊事件
        element.addEventListener('click', () => {
          window.open(news.link, '_blank');
        });
      }
    });

    console.log('✅ 新聞焦點渲染完成');
  }

  /**
   * 載入主要幣種價格
   */
  async loadMainCoinPrices() {
    console.log('💰 載入主要幣種價格...');
    
    try {
      const coins = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
      const promises = coins.map(symbol => 
        fetch(`/api/market/price/${symbol}`).then(res => res.json())
      );
      
      const results = await Promise.all(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'success') {
          this.updateCoinPrice(coins[index], result.data);
        }
      });
      
      console.log('✅ 主要幣種價格更新完成');
    } catch (error) {
      console.error('❌ 載入主要幣種價格失敗:', error);
    }
  }

  /**
   * 更新幣種價格顯示
   */
  updateCoinPrice(symbol, priceData) {
    const coinMap = {
      'BTCUSDT': 'BTC',
      'ETHUSDT': 'ETH', 
      'BNBUSDT': 'BNB'
    };
    
    const coinSymbol = coinMap[symbol];
    if (!coinSymbol) return;

    // 透過幣種符號找到對應的圖表卡片
    const chartCards = document.querySelectorAll('.chart-card');
    let targetCard = null;
    
    chartCards.forEach(card => {
      const symbolElement = card.querySelector('.coin-symbol');
      if (symbolElement && symbolElement.textContent === coinSymbol) {
        targetCard = card;
      }
    });

    if (targetCard) {
      const priceElement = targetCard.querySelector('.current-price');
      const changeElement = targetCard.querySelector('.price-change');

      if (priceElement && priceData.price) {
        priceElement.textContent = `$${parseFloat(priceData.price).toLocaleString()}`;
      }

      if (changeElement && priceData.priceChangePercent !== undefined) {
        const change = parseFloat(priceData.priceChangePercent);
        const isPositive = change >= 0;
        
        changeElement.textContent = `${isPositive ? '+' : ''}${change.toFixed(2)}%`;
        changeElement.className = `price-change ${isPositive ? 'positive' : 'negative'}`;
      }
    }
  }

  /**
   * 固定的熱門貨幣列表配置
   */
  getFixedCoinsList() {
    return [
      { symbol: 'BTCUSDT', name: 'Bitcoin', rank: 1 },
      { symbol: 'ETHUSDT', name: 'Ethereum', rank: 2 },
      { symbol: 'BNBUSDT', name: 'BNB', rank: 3 },
      { symbol: 'ADAUSDT', name: 'Cardano', rank: 4 },
      { symbol: 'SOLUSDT', name: 'Solana', rank: 5 },
      { symbol: 'XRPUSDT', name: 'XRP', rank: 6 },
      { symbol: 'DOGEUSDT', name: 'Dogecoin', rank: 7 },
      { symbol: 'AVAXUSDT', name: 'Avalanche', rank: 8 },
      { symbol: 'MATICUSDT', name: 'Polygon', rank: 9 },
      { symbol: 'DOTUSDT', name: 'Polkadot', rank: 10 }
    ];
  }

  /**
   * 載入熱門貨幣 (固定列表)
   */
  async loadTrendingCoins() {
    console.log('🔥 載入首頁熱門貨幣 (使用真實 API)...');
    
    try {
      // 使用與市場頁面相同的真實 API
      const response = await fetch('/api/market/trending?limit=10');
      const result = await response.json();
      
      if (result.success && result.data) {
        const processedData = result.data.map(coin => ({
          symbol: coin.symbol,
          name: this.getCoinName(coin.symbol),
          price: parseFloat(coin.price),
          priceChange: parseFloat(coin.priceChange || 0),
          priceChangePercent: parseFloat(coin.priceChangePercent || 0),
          volume: parseFloat(coin.volume || 0),
          marketCap: this.calculateMarketCap(parseFloat(coin.price), coin.symbol)
        }));
        
        console.log(`✅ 成功載入 ${processedData.length} 個熱門貨幣`);
        this.renderTrendingCoins(processedData);
      } else {
        throw new Error('API 返回無效數據');
      }
    } catch (error) {
      console.error('❌ 載入熱門貨幣失敗:', error);
      
      // 顯示錯誤狀態
      const container = document.getElementById('trending-coins-list');
      if (container) {
        container.innerHTML = `
          <div class="error-row">
            <div class="error-icon">⚠️</div>
            <span>載入失敗，請稍後重試</span>
          </div>
        `;
      }
    }
  }

  /**
   * 生成模擬價格
   */
  generateMockPrice(symbol) {
    const basePrices = {
      'BTCUSDT': 104500 + (Math.random() - 0.5) * 1000,
      'ETHUSDT': 2510 + (Math.random() - 0.5) * 50,
      'BNBUSDT': 720 + (Math.random() - 0.5) * 20,
      'ADAUSDT': 1.15 + (Math.random() - 0.5) * 0.1,
      'SOLUSDT': 245 + (Math.random() - 0.5) * 15,
      'XRPUSDT': 2.35 + (Math.random() - 0.5) * 0.2,
      'DOGEUSDT': 0.38 + (Math.random() - 0.5) * 0.05,
      'AVAXUSDT': 42 + (Math.random() - 0.5) * 3,
      'MATICUSDT': 0.52 + (Math.random() - 0.5) * 0.05,
      'DOTUSDT': 8.2 + (Math.random() - 0.5) * 0.5
    };
    return basePrices[symbol] || 100;
  }

  /**
   * 生成模擬變化量
   */
  generateMockChange() {
    return (Math.random() - 0.5) * 100; // -50 到 +50
  }

  /**
   * 生成模擬變化百分比
   */
  generateMockChangePercent() {
    return (Math.random() - 0.5) * 10; // -5% 到 +5%
  }

  /**
   * 生成模擬交易量
   */
  generateMockVolume() {
    return Math.random() * 1000000000; // 0 到 10億
  }

  /**
   * 計算市值 (模擬數據)
   */
  calculateMarketCap(price, symbol) {
    if (!price) return 0;
    
    // 模擬市值計算 (實際應該使用真實的流通供應量)
    const simulatedSupply = {
      'BTCUSDT': 19700000,
      'ETHUSDT': 120000000,
      'BNBUSDT': 166800000,
      'ADAUSDT': 35000000000,
      'SOLUSDT': 470000000,
      'XRPUSDT': 55000000000,
      'DOGEUSDT': 146000000000,
      'AVAXUSDT': 390000000,
      'MATICUSDT': 9300000000,
      'DOTUSDT': 1380000000
    };
    
    const supply = simulatedSupply[symbol] || 1000000000;
    return price * supply;
  }

  /**
   * 取得貨幣名稱
   */
  getCoinName(symbol) {
    const coinNames = {
      'BTCUSDT': 'Bitcoin',
      'ETHUSDT': 'Ethereum', 
      'BNBUSDT': 'BNB',
      'ADAUSDT': 'Cardano',
      'SOLUSDT': 'Solana',
      'XRPUSDT': 'XRP',
      'DOGEUSDT': 'Dogecoin',
      'AVAXUSDT': 'Avalanche',
      'DOTUSDT': 'Polkadot',
      'MATICUSDT': 'Polygon',
      'LTCUSDT': 'Litecoin',
      'LINKUSDT': 'Chainlink',
      'UNIUSDT': 'Uniswap',
      'SUIUSDT': 'Sui',
      'RAYUSDT': 'Raydium',
      'PEPEUSDT': 'PEPE',
      'FDUSDUSDT': 'FDUSD',
      'USDCUSDT': 'USDC'
    };
    
    return coinNames[symbol] || symbol.replace('USDT', '');
  }

  /**
   * 啟動熱門貨幣定時更新
   */
  startTrendingCoinsTimer() {
    // 檢查是否已經有定時器在運行，避免重複啟動
    if (this.trendingCoinsTimer) {
      console.log('⚠️ 熱門貨幣定時器已存在，跳過重複啟動');
      return;
    }
    
    console.log('🔥 啟動首頁熱門貨幣定時更新...');
    
    // 先載入一次
    this.loadTrendingCoins();
    
    // 設定每 10 秒更新一次
    this.trendingCoinsTimer = setInterval(() => {
      this.loadTrendingCoins();
    }, 10000);
    
    console.log('✅ 熱門貨幣定時更新已啟動 (每 10 秒)');
  }

  /**
   * 啟動市場頁面的熱門貨幣定時更新 (與首頁邏輯相同)
   */
  startMarketTrendingCoinsTimer() {
    // 檢查是否已經有定時器在運行，避免重複啟動
    if (this.marketTrendingCoinsTimer) {
      console.log('⚠️ 市場頁面定時器已存在，跳過重複啟動');
      return;
    }
    
    console.log('🔥 啟動市場頁面熱門貨幣定時更新...');
    
    // 先載入一次
    this.loadMarketTrendingCoins();
    
    // 設定每 10 秒更新一次
    this.marketTrendingCoinsTimer = setInterval(() => {
      this.loadMarketTrendingCoins();
    }, 10000);
    
    console.log('✅ 市場頁面熱門貨幣定時更新已啟動 (每 10 秒)');
  }

  /**
   * 停止市場頁面的熱門貨幣定時更新
   */
  stopMarketTrendingCoinsTimer() {
    if (this.marketTrendingCoinsTimer) {
      clearInterval(this.marketTrendingCoinsTimer);
      this.marketTrendingCoinsTimer = null;
      console.log('⏹️ 市場頁面熱門貨幣定時更新已停止');
    }
  }

  /**
   * 簡化版本的市場數據載入
   */
  async loadMarketTrendingCoinsSimple() {
    console.log('🔥 簡化版市場數據載入開始...');
    
    try {
      console.log('📊 發送 API 請求...');
      // 🔄 滾動載入：載入更多貨幣 (50個)
      const response = await fetch('/api/market/trending?limit=50');
      console.log(`📊 API 回應: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('📊 API 數據:', result);
      
      if (!result.success || !result.data || !Array.isArray(result.data)) {
        throw new Error(`API 返回無效數據: success=${result.success}, data類型=${typeof result.data}`);
      }
      
      console.log(`✅ 成功獲取 ${result.data.length} 個貨幣數據`);
      
      // 簡化渲染 - 修復容器 ID 不匹配問題
      const tbody = document.getElementById('market-coins-grid');
      if (!tbody) {
        console.error('❌ 找不到市場貨幣列表容器 #market-coins-grid');
        // 備用查找
        const backupContainer = document.querySelector('.market-coins-grid');
        if (backupContainer) {
          console.log('✅ 使用備用容器');
        } else {
          throw new Error('找不到市場貨幣列表容器 #market-coins-grid 或 .market-coins-grid');
        }
      }
      
      console.log('🎨 開始市場頁面渲染，使用與首頁相同的格式...');
      
      // 使用正確的容器
      const container = tbody || document.querySelector('.market-coins-grid');
      if (!container) {
        throw new Error('找不到市場貨幣列表容器');
      }
      
      // 🔄 滾動載入：初始顯示20個，儲存剩餘數據供滾動載入
      this.marketDataCache = result.data; // 儲存完整數據
      this.currentDisplayCount = 20; // 當前顯示數量
      
      // 🎯 創建與首頁相同的表格結構，包含表頭
      const processedData = result.data.slice(0, this.currentDisplayCount);
      
      const tableHTML = `
        <div class="coins-table">
          <div class="table-header">
            <div class="col-coin">貨幣</div>
            <div class="col-price">價格</div>
            <div class="col-change">24h 變化</div>
            <div class="col-change-amount">漲跌點數</div>
            <div class="col-volume">24h 交易量</div>
            <div class="col-market-cap">市值</div>
          </div>
          <div class="table-body">
            ${processedData.map(coin => {
              const changePercent = parseFloat(coin.priceChangePercent || 0);
              const changeAmount = parseFloat(coin.priceChange || 0);
              const isPositive = changePercent >= 0;
              const baseCoin = coin.symbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '');
              
              const coinIconHtml = this.getCoinIcon(coin.symbol);
              
              return `
                <div class="coin-row" data-symbol="${coin.symbol}">
                  <div class="col-coin">
                    <div class="coin-icon">${coinIconHtml}</div>
                    <div class="coin-details">
                      <span class="coin-symbol">${baseCoin}</span>
                      <span class="coin-name">${this.getCoinName(coin.symbol)}</span>
                    </div>
                  </div>
                  <div class="col-price" data-price="${coin.price}">$${parseFloat(coin.price || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                  <div class="col-change ${isPositive ? 'positive' : 'negative'}">
                    ${changePercent.toFixed(2)}%
                  </div>
                  <div class="col-change-amount ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '+' : ''}$${Math.abs(changeAmount).toFixed(4)}
                  </div>
                  <div class="col-volume">${this.formatVolume(coin.volume || 0)}</div>
                  <div class="col-market-cap">${this.formatMarketCap(this.calculateMarketCap(parseFloat(coin.price), coin.symbol))}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
      
      container.innerHTML = tableHTML;
      console.log(`✅ 簡化渲染完成，顯示 ${this.currentDisplayCount}/${result.data.length} 個貨幣`);
      
      // 🔧 關鍵修復：綁定市場頁面貨幣點擊事件
      this.bindMarketCoinClickEvents();
      
      // 🔄 設置滾動載入監聽器
      this.setupScrollLoading(container);
      
      // 🔧 關鍵修復：隱藏所有載入中的載入器
      const loadingElements = document.querySelectorAll('.loading-row, .loading-spinner');
      loadingElements.forEach(el => {
        if (el && el.style) {
          el.style.display = 'none';
        }
      });
      
      // 確保清除任何載入中的文字
      const loadingTexts = document.querySelectorAll('[class*="loading"], [id*="loading"]');
      loadingTexts.forEach(el => {
        if (el && el.textContent && el.textContent.includes('載入')) {
          el.style.display = 'none';
        }
      });
      
      console.log('🎯 已清除所有載入中狀態');
      
      // 🔧 額外修復：清除頁面頂部可能的載入器
      const topLoadingElements = document.querySelectorAll('.loading, .spinner, [class*="load"]');
      topLoadingElements.forEach(el => {
        if (el && el.classList.contains('loading')) {
          el.style.display = 'none';
          console.log('🧹 清除頂部載入器:', el.className);
        }
      });
      
      // 清除市場統計區域的載入狀態
      const marketStats = document.getElementById('market-stats');
      if (marketStats) {
        const loadingStats = marketStats.querySelectorAll('.stat-label');
        loadingStats.forEach(label => {
          if (label.textContent === '載入中...') {
            label.textContent = '市場數據';
          }
        });
      }
      
    } catch (error) {
      console.error('❌ 簡化版市場數據載入失敗:', error);
      
      const tbody = document.getElementById('market-coins-grid');
      if (tbody) {
        tbody.innerHTML = `
          <div style="padding: 20px; text-align: center; color: #ff6b6b;">
            <div>⚠️ 載入失敗</div>
            <div>錯誤: ${error.message}</div>
            <button onclick="window.app?.loadMarketTrendingCoinsSimple()" style="margin-top: 10px; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">重試</button>
          </div>
        `;
      }
      throw error;
    }
  }

  formatVolumeSimple(volume) {
    const num = parseFloat(volume);
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(0);
  }

  /**
   * 載入市場統計資訊
   */
  async loadMarketStats() {
    console.log('📊 載入市場統計資訊...');
    
    try {
      const response = await fetch('/api/market/stats24h');
      
      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📈 市場統計數據:', result);
      
      if (result.success && result.data) {
        this.renderMarketStats(result.data);
      } else {
        console.warn('⚠️ 市場統計數據格式不正確');
      }
    } catch (error) {
      console.error('❌ 載入市場統計失敗:', error);
      // 顯示預設統計資訊
      this.renderMarketStats({
        totalCoins: 591,
        averageChange: -0.65,
        positiveCount: 245,
        negativeCount: 346,
        totalVolume: 125000000000
      });
    }
  }

  /**
   * 渲染市場統計資訊
   */
  renderMarketStats(stats) {
    console.log('🎨 渲染市場統計:', stats);
    
    const marketStatsContainer = document.getElementById('market-stats');
    if (!marketStatsContainer) {
      console.warn('⚠️ 找不到市場統計容器');
      return;
    }
    
    const positivePercentage = ((stats.positiveCount / stats.totalCoins) * 100).toFixed(1);
    const negativePercentage = ((stats.negativeCount / stats.totalCoins) * 100).toFixed(1);
    
    marketStatsContainer.innerHTML = `
      <div class="market-stat">
        <div class="stat-label">總交易對數</div>
        <div class="stat-value">${stats.totalCoins.toLocaleString()}</div>
      </div>
      <div class="market-stat">
        <div class="stat-label">平均變化</div>
        <div class="stat-value ${stats.averageChange >= 0 ? 'positive' : 'negative'}">
          ${stats.averageChange >= 0 ? '+' : ''}${stats.averageChange.toFixed(2)}%
        </div>
      </div>
      <div class="market-stat">
        <div class="stat-label">上漲比例</div>
        <div class="stat-value positive">${positivePercentage}% (${stats.positiveCount})</div>
      </div>
      <div class="market-stat">
        <div class="stat-label">下跌比例</div>
        <div class="stat-value negative">${negativePercentage}% (${stats.negativeCount})</div>
      </div>
      <div class="market-stat">
        <div class="stat-label">24h 總交易量</div>
        <div class="stat-value">$${this.formatVolume(stats.totalVolume)}</div>
      </div>
    `;
    
    console.log('✅ 市場統計渲染完成');
  }

  /**
   * 🔄 設置滾動載入功能
   */
  setupScrollLoading(container) {
    console.log('🔄 設置滾動載入監聽器...');
    
    // 移除舊的監聽器
    if (this.scrollLoadingHandler) {
      window.removeEventListener('scroll', this.scrollLoadingHandler);
    }
    
    this.scrollLoadingHandler = () => {
      // 檢查是否滾動到底部附近
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // 當滾動到距離底部 300px 時觸發載入
      if (scrollTop + windowHeight >= documentHeight - 300) {
        this.loadMoreMarketData();
      }
    };
    
    window.addEventListener('scroll', this.scrollLoadingHandler);
    console.log('✅ 滾動載入監聽器已設置');
  }

  /**
   * 🔄 載入更多市場數據
   */
  loadMoreMarketData() {
    // 防止重複載入
    if (this.loadingMore || !this.marketDataCache) {
      return;
    }
    
    // 檢查是否還有更多數據
    if (this.currentDisplayCount >= this.marketDataCache.length) {
      console.log('📊 已顯示所有數據');
      return;
    }
    
    this.loadingMore = true;
    console.log(`🔄 載入更多數據... (${this.currentDisplayCount}/${this.marketDataCache.length})`);
    
    // 增加顯示數量
    const newDisplayCount = Math.min(this.currentDisplayCount + 10, this.marketDataCache.length);
    const newCoins = this.marketDataCache.slice(this.currentDisplayCount, newDisplayCount);
    
    // 渲染新的貨幣行 - 使用與首頁相同的格式
    const tbody = document.getElementById('market-coins-grid');
    if (tbody && newCoins.length > 0) {
      // 處理新貨幣數據，使用與首頁相同的邏輯
      const processedNewCoins = newCoins.map(coin => ({
        symbol: coin.symbol,
        name: this.getCoinName(coin.symbol),
        price: parseFloat(coin.price),
        priceChange: parseFloat(coin.priceChange || 0),
        priceChangePercent: parseFloat(coin.priceChangePercent || 0),
        volume: parseFloat(coin.volume || 0),
        marketCap: this.calculateMarketCap(parseFloat(coin.price), coin.symbol)
      }));
      
      const newHtml = processedNewCoins.map((coin, index) => {
        const changePercent = parseFloat(coin.priceChangePercent || 0);
        const changeAmount = parseFloat(coin.priceChange || 0);
        const isPositive = changePercent >= 0;
        const baseCoin = coin.symbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '');
        
        const coinIconHtml = this.getCoinIcon(coin.symbol);
        
        return `
          <div class="coin-row" data-symbol="${coin.symbol}">
            <div class="col-coin">
              <div class="coin-icon">${coinIconHtml}</div>
              <div class="coin-details">
                <span class="coin-symbol">${baseCoin}</span>
                <span class="coin-name">${coin.name || coin.symbol}</span>
              </div>
            </div>
            <div class="col-price" data-price="${coin.price}">$${parseFloat(coin.price || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div class="col-change ${isPositive ? 'positive' : 'negative'}">
              ${changePercent.toFixed(2)}%
            </div>
            <div class="col-change-amount ${isPositive ? 'positive' : 'negative'}">
              ${isPositive ? '+' : ''}$${Math.abs(changeAmount).toFixed(4)}
            </div>
            <div class="col-volume">${this.formatVolume(coin.volume || 0)}</div>
            <div class="col-market-cap">${this.formatMarketCap(coin.marketCap || 0)}</div>
          </div>
        `;
      }).join('');
      
      tbody.innerHTML += newHtml;
      this.currentDisplayCount = newDisplayCount;
      
      // 🔧 關鍵修復：新增內容後重新綁定點擊事件
      this.bindMarketCoinClickEvents();
      
      console.log(`✅ 新增 ${newCoins.length} 個貨幣，總共顯示 ${this.currentDisplayCount}/${this.marketDataCache.length}`);
    }
    
    // 延遲重置載入狀態，避免過於頻繁的載入
    setTimeout(() => {
      this.loadingMore = false;
    }, 500);
  }

  /**
   * 載入市場頁面熱門貨幣 (與首頁loadTrendingCoins邏輯完全相同)
   */
  async loadMarketTrendingCoins() {
    console.log('🔥 載入市場頁面熱門貨幣 (使用與首頁相同的真實 API)...');
    
    try {
      // 使用與首頁相同的真實 API
      const response = await fetch('/api/market/trending?limit=200');
      console.log(`📊 API 回應狀態: ${response.status} ${response.statusText}`);
      
      const result = await response.json();
      console.log('📊 API 回應數據:', { success: result.success, dataLength: result.data?.length });
      
      if (result.success && result.data && Array.isArray(result.data)) {
        const processedData = result.data.map((coin, index) => {
          try {
            return {
              symbol: coin.symbol,
              name: this.getCoinName(coin.symbol),
              price: parseFloat(coin.price),
              priceChange: parseFloat(coin.priceChange || 0),
              priceChangePercent: parseFloat(coin.priceChangePercent || 0),
              volume: parseFloat(coin.volume || 0),
              marketCap: this.calculateMarketCap(parseFloat(coin.price), coin.symbol)
            };
          } catch (coinError) {
            console.warn(`⚠️ 處理貨幣數據失敗 (${coin.symbol}):`, coinError);
            return null;
          }
        }).filter(coin => coin !== null);
        
        console.log(`✅ 市場頁面成功處理 ${processedData.length} 個熱門貨幣`);
        this.renderMarketTrendingCoins(processedData);
      } else {
        throw new Error(`API 返回無效數據: success=${result.success}, data類型=${typeof result.data}`);
      }
    } catch (error) {
      console.error('❌ 載入市場頁面熱門貨幣失敗:', error);
      console.error('❌ 錯誤詳情:', error.stack);
      
      // 顯示錯誤狀態
      const container = document.getElementById('market-coins-grid');
      if (container) {
        container.innerHTML = `
          <div class="error-row">
            <div class="error-icon">⚠️</div>
            <span>載入失敗: ${error.message}</span>
            <button onclick="window.app?.loadMarketTrendingCoins()" style="margin-left: 10px; padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer;">重試</button>
          </div>
        `;
      }
    }
  }

  /**
   * 渲染市場頁面熱門貨幣列表 (與首頁renderTrendingCoins邏輯相同)
   */
  renderMarketTrendingCoins(coinsData) {
    try {
      // 添加執行計數和重複檢查
      this.marketRenderCount = (this.marketRenderCount || 0) + 1;
      console.log(`🎨 市場頁面渲染執行 #${this.marketRenderCount}`, {
        coinsCount: coinsData.length,
        timestamp: new Date().toISOString()
      });
      
      // 如果短時間內多次調用，發出警告
      if (this.marketRenderCount > 1) {
        console.warn(`⚠️ 檢測到市場頁面重複渲染! 第 ${this.marketRenderCount} 次執行`);
      }
      
      const tbody = document.getElementById('market-coins-grid');
      if (!tbody) {
        console.error('❌ 找不到市場頁面貨幣列表容器: #market-coins-grid');
        return;
      }

      // 檢查是否已有相同數據，避免重複渲染
      const currentDataHash = JSON.stringify(coinsData.slice(0, 5).map(c => c.symbol + c.price));
      if (this.lastMarketDataHash === currentDataHash) {
        console.log('✅ 數據未變化，跳過重複渲染');
        return;
      }
      this.lastMarketDataHash = currentDataHash;

      const renderedHTML = coinsData.map((coin, index) => {
        try {
          const changePercent = parseFloat(coin.priceChangePercent || 0);
          const changeAmount = parseFloat(coin.priceChange || 0);
          const isPositive = changePercent >= 0;
          const baseCoin = coin.symbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '');
          
          const coinIconHtml = this.getCoinIcon(coin.symbol);
          
          return `
            <div class="coin-row" data-symbol="${coin.symbol}">
              <div class="col-coin">
                ${coinIconHtml}
                <div class="coin-info">
                  <span class="coin-name">${coin.name || baseCoin}</span>
                  <span class="coin-symbol">${coin.symbol}</span>
                </div>
              </div>
              <div class="col-price">$${this.formatPrice(coin.price)}</div>
              <div class="col-change">
                <span class="change-percent ${isPositive ? 'positive' : 'negative'}">
                  ${isPositive ? '↗' : '↘'} ${changePercent.toFixed(2)}%
                </span>
              </div>
              <div class="col-change-amount">
                <span class="change-amount ${isPositive ? 'positive' : 'negative'}">
                  $${Math.abs(changeAmount).toFixed(2)}
                </span>
              </div>
              <div class="col-volume">$${this.formatVolume(coin.volume)}</div>
              <div class="col-market-cap">$${this.formatMarketCap(coin.marketCap)}</div>
            </div>
          `;
        } catch (coinRenderError) {
          console.warn(`⚠️ 渲染貨幣失敗 (${coin.symbol}):`, coinRenderError);
          return `<div class="coin-row error">渲染 ${coin.symbol} 失敗</div>`;
        }
      }).join('');

      tbody.innerHTML = renderedHTML;
      
      // 綁定市場頁面貨幣點擊事件
      this.bindMarketCoinClickEvents();
      
      console.log(`✅ 市場頁面已渲染 ${coinsData.length} 個熱門貨幣 (HTML長度: ${renderedHTML.length})`);
      
    } catch (error) {
      console.error('❌ 市場頁面渲染過程發生錯誤:', error);
      console.error('❌ 渲染錯誤詳情:', error.stack);
      
      const tbody = document.getElementById('market-coins-grid');
      if (tbody) {
        tbody.innerHTML = `
          <div class="error-row">
            <div class="error-icon">⚠️</div>
            <span>渲染失敗: ${error.message}</span>
          </div>
        `;
      }
    }
  }

  /**
   * 渲染市場頁面熱門貨幣錯誤狀態
   */
  renderMarketTrendingCoinsError() {
    const tbody = document.getElementById('market-coins-grid');
    if (!tbody) return;

    tbody.innerHTML = `
      <div class="loading-row">
        <span>暫時無法載入市場貨幣數據</span>
      </div>
    `;
  }

  /**
   * 停止熱門貨幣定時更新
   */
  stopTrendingCoinsTimer() {
    if (this.trendingCoinsTimer) {
      clearInterval(this.trendingCoinsTimer);
      this.trendingCoinsTimer = null;
      console.log('⏹️ 熱門貨幣定時更新已停止');
    }
  }

  /**
   * 獲取加密貨幣圖標 (使用本地圖標系統)
   */
  getCoinIcon(symbol) {
    try {
      // 優先使用新的本地圖標系統
      if (typeof window.getCryptoIcon === 'function') {
        return window.getCryptoIcon(symbol, 32);
      }
    } catch (error) {
      console.warn('⚠️ getCryptoIcon 調用失敗:', error);
    }
    
    // 終極後備方案：簡單文字圖標
    const baseCoin = symbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '').toLowerCase();
    const colors = {
      'btc': '#f7931a', 'eth': '#627eea', 'bnb': '#f0b90b', 'ada': '#0033ad',
      'sol': '#9945ff', 'xrp': '#00aae4', 'doge': '#c2a633', 'dot': '#e6007a',
      'avax': '#e84142', 'matic': '#8247e5', 'link': '#375bd2', 'ltc': '#bfbbbb',
      'usdc': '#2775ca', 'usdt': '#26a17b', 'fdusd': '#f0b90b', 'sui': '#4da2ff',
      'pepe': '#4caf50', 'trx': '#ff0013', 'ton': '#0088cc', 'shib': '#ffa409'
    };
    
    const color = colors[baseCoin] || '#666666';
    
    return `<div class="crypto-icon-text" style="
      width: 32px; 
      height: 32px; 
      background: ${color}; 
      color: white; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      border-radius: 50%; 
      font-weight: bold; 
      font-size: 12px;
      border: 2px solid rgba(255,255,255,0.2);
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">${baseCoin.substring(0, 3).toUpperCase()}</div>`;
  }

  /**
   * 渲染熱門貨幣列表
   */
  renderTrendingCoins(coinsData) {
    // 添加執行計數和重複檢查
    this.homeRenderCount = (this.homeRenderCount || 0) + 1;
    console.log(`🎨 首頁渲染執行 #${this.homeRenderCount}`, {
      coinsCount: coinsData.length,
      timestamp: new Date().toISOString()
    });
    
    // 如果短時間內多次調用，發出警告
    if (this.homeRenderCount > 1) {
      console.warn(`⚠️ 檢測到首頁重複渲染! 第 ${this.homeRenderCount} 次執行`);
    }
    
    const tbody = document.getElementById('trending-coins-list');
    if (!tbody) return;

    // 檢查是否已有相同數據，避免重複渲染
    const currentDataHash = JSON.stringify(coinsData.slice(0, 5).map(c => c.symbol + c.price));
    if (this.lastHomeDataHash === currentDataHash) {
      console.log('✅ 首頁數據未變化，跳過重複渲染');
      return;
    }
    this.lastHomeDataHash = currentDataHash;

    tbody.innerHTML = coinsData.map((coin, index) => {
      const changePercent = parseFloat(coin.priceChangePercent || 0);
      const changeAmount = parseFloat(coin.priceChange || 0);
      const isPositive = changePercent >= 0;
      const baseCoin = coin.symbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '');
      
      const coinIconHtml = this.getCoinIcon(coin.symbol);
      
      return `
        <div class="coin-row" data-symbol="${coin.symbol}">
          <div class="col-coin">
            <div class="coin-icon">${coinIconHtml}</div>
            <div class="coin-details">
              <span class="coin-symbol">${baseCoin}</span>
              <span class="coin-name">${coin.name || coin.symbol}</span>
            </div>
          </div>
          <div class="col-price" data-price="${coin.price}">$${parseFloat(coin.price || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
          <div class="col-change ${isPositive ? 'positive' : 'negative'}">
            ${changePercent.toFixed(2)}%
          </div>
          <div class="col-change-amount ${isPositive ? 'positive' : 'negative'}">
            ${isPositive ? '+' : ''}$${Math.abs(changeAmount).toFixed(4)}
          </div>
          <div class="col-volume">${this.formatVolume(coin.volume || 0)}</div>
          <div class="col-market-cap">${this.formatMarketCap(coin.marketCap || 0)}</div>
        </div>
      `;
    }).join('');

    // 加入更新動畫效果
    this.addUpdateAnimations();

    // 綁定貨幣點擊事件
    this.bindCoinClickEvents();

    console.log('✅ 固定熱門貨幣渲染完成');
  }

  /**
   * 綁定貨幣點擊事件 (首頁)
   */
  bindCoinClickEvents() {
    const coinRows = document.querySelectorAll('#trending-coins-list .coin-row');
    coinRows.forEach(row => {
      // 移除舊的事件監聽器（如果存在）
      row.removeEventListener('click', this.handleCoinClick);
      
      // 添加新的點擊事件監聽器
      row.addEventListener('click', (e) => {
        const symbol = row.dataset.symbol;
        if (symbol) {
          console.log(`📊 首頁點擊貨幣: ${symbol}，導航到詳情頁面`);
          // 導航到貨幣詳情頁面
          window.location.hash = `#/currency/${symbol}`;
        }
      });
      
      // 添加懸停效果
      row.style.cursor = 'pointer';
    });
    
    console.log(`✅ 已綁定首頁 ${coinRows.length} 個貨幣的點擊事件`);
  }

  /**
   * 綁定市場頁面貨幣點擊事件
   */
  bindMarketCoinClickEvents() {
    const coinRows = document.querySelectorAll('#market-coins-grid .coin-row');
    coinRows.forEach(row => {
      // 移除舊的事件監聽器（如果存在）
      row.removeEventListener('click', this.handleCoinClick);
      
      // 添加新的點擊事件監聽器
      row.addEventListener('click', (e) => {
        const symbol = row.dataset.symbol;
        if (symbol) {
          console.log(`📊 市場頁面點擊貨幣: ${symbol}，導航到詳情頁面`);
          // 導航到貨幣詳情頁面
          window.location.hash = `#/currency/${symbol}`;
        }
      });
      
      // 添加懸停效果
      row.style.cursor = 'pointer';
    });
    
    console.log(`✅ 已綁定市場頁面 ${coinRows.length} 個貨幣的點擊事件`);
  }

  /**
   * 加入更新動畫效果
   */
  addUpdateAnimations() {
    const rows = document.querySelectorAll('.coin-row');
    rows.forEach((row, index) => {
      // 延遲動畫，創造波浪效果
      setTimeout(() => {
        row.classList.add('updating');
        setTimeout(() => {
          row.classList.remove('updating');
        }, 300);
      }, index * 100);
    });

    // 價格欄位閃爍效果
    const priceElements = document.querySelectorAll('.col-price');
    priceElements.forEach((element, index) => {
      setTimeout(() => {
        element.classList.add('flash-update');
        setTimeout(() => {
          element.classList.remove('flash-update');
        }, 600);
      }, index * 150);
    });
  }

  /**
   * 渲染熱門貨幣錯誤狀態
   */
  renderTrendingCoinsError() {
    const tbody = document.getElementById('trending-coins-list');
    if (!tbody) return;

    tbody.innerHTML = `
      <div class="loading-row">
        <span>暫時無法載入熱門貨幣數據</span>
      </div>
    `;
  }

  /**
   * 計算時間差
   */
  getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes}分鐘前`;
    if (hours < 24) return `${hours}小時前`;
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * 格式化交易量
   */
  formatVolume(volume) {
    const num = parseFloat(volume);
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(0);
  }

  /**
   * 格式化市值數字
   */
  formatMarketCap(marketCap) {
    const num = parseFloat(marketCap);
    if (num >= 1000000000000) {
      return '$' + (num / 1000000000000).toFixed(2) + 'T';
    }
    if (num >= 1000000000) {
      return '$' + (num / 1000000000).toFixed(2) + 'B';
    }
    if (num >= 1000000) {
      return '$' + (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
      return '$' + (num / 1000).toFixed(2) + 'K';
    }
    return '$' + num.toFixed(2);
  }

  /**
   * 初始化主要貨幣圖表
   */
  async initializeMainCharts() {
    console.log('📊 初始化主要貨幣圖表...');
    
    try {
      if (window.TradingViewWidgets) {
        // 初始化三個主要幣種的迷你圖表
        const coins = [
          { id: 'btc-chart', symbol: 'BINANCE:BTCUSDT' },
          { id: 'eth-chart', symbol: 'BINANCE:ETHUSDT' },
          { id: 'bnb-chart', symbol: 'BINANCE:BNBUSDT' }
        ];

        for (const coin of coins) {
          await window.TradingViewWidgets.createMiniChart(coin.id, {
            symbol: coin.symbol,
            width: '100%',
            height: 200,
            colorTheme: 'dark',
            isTransparent: true,
            autosize: true,
            largeChartUrl: ""
          });
        }
        
        console.log('✅ 主要貨幣圖表初始化完成');
      } else {
        console.warn('⚠️ TradingView Widgets 組件未載入');
      }
    } catch (error) {
      console.error('❌ 主要貨幣圖表初始化失敗:', error);
    }
  }

  /**
   * 初始化首頁 AI 大趨勢分析組件
   */
  initializeHomepageAITrend() {
    try {
      // 檢查 AI 組件類是否可用
      if (typeof AIHomepageTrend === 'undefined') {
        console.warn('⚠️ AIHomepageTrend 組件未載入');
        return;
      }

      // 檢查容器是否存在
      const container = document.getElementById('homepage-ai-trend-container');
      if (!container) {
        console.warn('⚠️ AI 趨勢分析容器未找到');
        return;
      }

      // 初始化 AI 組件 (按需分析：先查資料庫，無當日結果才分析)
      console.log('🤖 初始化 AI 首頁大趨勢分析組件...');
      
      // 創建組件實例並存儲到全域變數
      window.aiHomepageTrend = new AIHomepageTrend('homepage-ai-trend-container');
      
      console.log('✅ AI 首頁大趨勢分析組件初始化完成');
    } catch (error) {
      console.error('❌ AI 首頁大趨勢分析初始化失敗:', error);
      
      // 顯示錯誤狀態
      const container = document.getElementById('homepage-ai-trend-container');
      if (container) {
        container.innerHTML = `
          <div class="ai-analysis-section">
            <div class="ai-header">
              <h3>🔮 AI 市場趨勢分析</h3>
              <div class="ai-cost-notice">
                <small>💡 因AI成本考量，目前只開放日線分析</small>
              </div>
            </div>
            
            <div class="ai-error">
              <div class="error-icon">⚠️</div>
              <div class="error-message">
                <p>AI 分析服務初始化失敗</p>
                <p>請稍後重新整理頁面</p>
              </div>
            </div>
          </div>
        `;
      }
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