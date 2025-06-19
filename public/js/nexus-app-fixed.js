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
    
    // 初始化首頁 (如果當前頁面是首頁)
    setTimeout(() => {
      const hash = window.location.hash;
      if (!hash || hash === '#' || hash === '#dashboard' || hash === '#/') {
        console.log('🏠 載入預設首頁');
        this.showPage('dashboard');
      }
    }, 500);
    
    console.log('✅ NexusTrade 應用程式已啟動');
  }

  /**
   * 設定組件
   */
  setupComponents() {
    console.log('🧩 設定組件...');
    
    // 初始化通知組件
    this.notificationComponent = new NotificationComponent();
    
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
      dashboard: 'NexusTrade - 首頁',
      market: 'NexusTrade - 市場數據',
      news: 'NexusTrade - 加密貨幣新聞',
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
    console.log('🧹 清理頁面組件...');
    
    // 清理首頁定時器
    this.stopTrendingCoinsTimer();
    
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
    console.log('📈 載入市場數據...');
    
    try {
      // 檢查是否在市場頁面
      const marketPage = document.getElementById('market-page');
      if (!marketPage || !marketPage.classList.contains('active')) {
        console.log('⏭️ 不在市場頁面，跳過市場數據載入');
        return;
      }

      // 初始化市場頁面的 CryptoCurrencyList 組件（無限滾動模式）
      if (!this.marketCryptoList && typeof CryptoCurrencyList !== 'undefined') {
        const marketContainer = document.getElementById('market-coins-grid');
        if (marketContainer) {
          this.marketCryptoList = new CryptoCurrencyList({
            container: marketContainer,
            mode: 'infinite',        // 無限滾動模式
            maxCoins: 200,          // 最多 200 個貨幣
            coinsPerPage: 50,       // 每次載入 50 個
            updateInterval: 15000,   // 15 秒更新
            onCoinClick: (coin) => {
              console.log('🪙 點擊貨幣:', coin);
              // TODO: 實作跳轉到單一貨幣分析頁面
            }
          });
          console.log('✅ 市場頁面 CryptoCurrencyList 組件已初始化');
        } else {
          console.error('❌ 找不到市場貨幣容器: #market-coins-grid');
        }
      } else if (typeof CryptoCurrencyList === 'undefined') {
        console.error('❌ CryptoCurrencyList 組件未載入');
        this.showNotification('貨幣列表組件載入失敗', 'error');
      }

      // 載入市場統計數據
      await this.loadMarketStats();
      
      // 初始化市場頁面的 TradingView Widgets
      await this.initializeMarketTradingViewWidgets();
      
      console.log('✅ 市場頁面數據載入完成');
    } catch (error) {
      console.error('❌ 載入市場數據失敗:', error);
      this.showNotification('無法載入市場數據', 'error');
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

    marketStats.innerHTML = `
      <div class="market-stat">
        <div class="stat-label">總交易對數量</div>
        <div class="stat-value">${stats.totalPairs || 0}</div>
      </div>
      <div class="market-stat">
        <div class="stat-label">24h 平均變化</div>
        <div class="stat-value ${stats.averageChange >= 0 ? 'positive' : 'negative'}">
          ${stats.averageChange ? stats.averageChange.toFixed(2) : '0.00'}%
        </div>
      </div>
      <div class="market-stat">
        <div class="stat-label">上漲貨幣</div>
        <div class="stat-value positive">${stats.gainers || 0}</div>
      </div>
      <div class="market-stat">
        <div class="stat-label">下跌貨幣</div>
        <div class="stat-value negative">${stats.losers || 0}</div>
      </div>
      <div class="market-stat">
        <div class="stat-label">24h 總交易量</div>
        <div class="stat-value">${this.formatLargeNumber(stats.totalVolume || 0)}</div>
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
   * 初始化市場頁面的 TradingView Widgets
   */
  async initializeMarketTradingViewWidgets() {
    console.log('📊 初始化市場頁面 TradingView Widgets...');
    
    try {
      // 市場頁面的主要加密貨幣 Widget 配置
      const marketWidgets = [
        { symbol: "BINANCE:BTCUSDT", name: "Bitcoin" },
        { symbol: "BINANCE:ETHUSDT", name: "Ethereum" },
        { symbol: "BINANCE:BNBUSDT", name: "BNB" },
        { symbol: "BINANCE:ADAUSDT", name: "Cardano" }
      ];

      // 為每個 Widget 容器創建 TradingView Widget
      marketWidgets.forEach((widget, index) => {
        const containerId = `tradingview-widget-${index}`;
        const container = document.getElementById(containerId);
        
        if (container) {
          this.createTradingViewWidget(containerId, {
            symbol: widget.symbol,
            width: "100%",
            height: "300",
            locale: "en",
            dateRange: "12M",
            colorTheme: "dark",
            isTransparent: false,
            autosize: false,
            largeChartUrl: ""
          });
          
          console.log(`✅ 創建 TradingView Widget: ${widget.name}`);
        } else {
          console.warn(`⚠️ 找不到 Widget 容器: ${containerId}`);
        }
      });
      
      console.log('✅ 市場頁面 TradingView Widgets 初始化完成');
    } catch (error) {
      console.error('❌ 市場頁面 TradingView Widgets 初始化失敗:', error);
    }
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
    console.log('🔥 載入固定熱門貨幣...');
    
    const fixedCoins = this.getFixedCoinsList();
    
    try {
      // 首先嘗試從快取獲取數據
      const cacheResponse = await fetch('/api/market/cache/prices');
      let enrichedData;
      
      if (cacheResponse.ok) {
        const cacheResult = await cacheResponse.json();
        if (cacheResult.status === 'success' && cacheResult.data) {
          // 使用快取數據
          enrichedData = fixedCoins.map(coin => {
            const cacheData = cacheResult.data[coin.symbol] || {};
            return {
              ...coin,
              price: cacheData.price || this.generateMockPrice(coin.symbol),
              priceChange: cacheData.priceChange || this.generateMockChange(),
              priceChangePercent: cacheData.priceChangePercent || this.generateMockChangePercent(),
              volume: cacheData.volume || this.generateMockVolume(),
              marketCap: this.calculateMarketCap(cacheData.price || this.generateMockPrice(coin.symbol), coin.symbol)
            };
          });
        }
      }
      
      // 如果快取失敗，使用模擬數據
      if (!enrichedData) {
        console.warn('使用模擬數據');
        enrichedData = fixedCoins.map(coin => ({
          ...coin,
          price: this.generateMockPrice(coin.symbol),
          priceChange: this.generateMockChange(),
          priceChangePercent: this.generateMockChangePercent(),
          volume: this.generateMockVolume(),
          marketCap: this.calculateMarketCap(this.generateMockPrice(coin.symbol), coin.symbol)
        }));
      }
      
      this.renderTrendingCoins(enrichedData);
    } catch (error) {
      console.error('❌ 載入熱門貨幣失敗:', error);
      
      // 使用模擬數據作為後備
      const fixedCoins = this.getFixedCoinsList();
      const mockData = fixedCoins.map(coin => ({
        ...coin,
        price: this.generateMockPrice(coin.symbol),
        priceChange: this.generateMockChange(),
        priceChangePercent: this.generateMockChangePercent(),
        volume: this.generateMockVolume(),
        marketCap: this.calculateMarketCap(this.generateMockPrice(coin.symbol), coin.symbol)
      }));
      
      this.renderTrendingCoins(mockData);
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
   * 啟動熱門貨幣定時更新
   */
  startTrendingCoinsTimer() {
    // 先載入一次
    this.loadTrendingCoins();
    
    // 設定每 10 秒更新一次
    this.trendingCoinsTimer = setInterval(() => {
      this.loadTrendingCoins();
    }, 10000);
    
    console.log('✅ 熱門貨幣定時更新已啟動 (每 10 秒)');
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
    // 優先使用新的本地圖標系統
    if (typeof window.getCryptoIcon === 'function') {
      return window.getCryptoIcon(symbol, 32);
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
    const tbody = document.getElementById('trending-coins-list');
    if (!tbody) return;

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

    console.log('✅ 固定熱門貨幣渲染完成');
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