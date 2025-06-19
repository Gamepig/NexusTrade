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
    
    // 初始化新聞跑馬燈
    this.initializeNewsTicker();
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
   * 載入首頁數據
   */
  async loadDashboardData() {
    console.log('🏠 載入首頁數據...');
    
    try {
      // 並行載入所有數據
      await Promise.all([
        this.loadNewsHighlights(),
        this.loadMainCoinPrices(),
        this.loadTrendingCoins()
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
      // 載入熱門交易對
      const response = await fetch('/api/market/trending');
      const result = await response.json();
      
      if (result.status === 'success') {
        this.displayTrendingPairs(result.data);
      }
    } catch (error) {
      console.error('❌ 載入市場數據失敗:', error);
      this.showNotification('無法載入市場數據', 'error');
    }
  }
  
  /**
   * 顯示熱門交易對
   */
  displayTrendingPairs(pairs) {
    console.log('📈 顯示熱門交易對:', pairs);
    // TODO: 實現熱門交易對顯示邏輯
  }
  
  /**
   * 初始化 TradingView Widgets
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
      // 初始化新聞頁面組件
      if (!this.newsPage) {
        this.newsPage = new NewsPage();
      }
      
      console.log('📰 新聞頁面已載入');
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
        this.newsTicker = new NewsTicker(tickerContainer);
        console.log('📰 新聞跑馬燈已初始化');
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
   * 載入熱門貨幣
   */
  async loadTrendingCoins() {
    console.log('🔥 載入熱門貨幣...');
    
    try {
      const response = await fetch('/api/market/trending?limit=10');
      const result = await response.json();
      
      if (result.status === 'success' && result.data.pairs && result.data.pairs.length > 0) {
        this.renderTrendingCoins(result.data.pairs);
      } else {
        console.warn('無法載入熱門貨幣數據', result);
      }
    } catch (error) {
      console.error('❌ 載入熱門貨幣失敗:', error);
      this.renderTrendingCoinsError();
    }
  }

  /**
   * 獲取加密貨幣圖標 (使用 cryptologos.cc)
   */
  getCoinIcon(symbol) {
    // 移除 USDT 後綴獲取基礎貨幣名稱
    const baseCoin = symbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '').toLowerCase();
    
    // 使用 CDN 上的加密貨幣圖標 (免費且可靠)
    const iconUrls = {
      'btc': 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
      'eth': 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      'bnb': 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
      'ada': 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
      'sol': 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
      'xrp': 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
      'dot': 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
      'doge': 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
      'avax': 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
      'shib': 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
      'matic': 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
      'ltc': 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
      'uni': 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png',
      'link': 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
      'trx': 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
      'atom': 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png',
      'xlm': 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png',
      'vet': 'https://assets.coingecko.com/coins/images/1077/small/VeChain-Logo-768x725.png',
      'icp': 'https://assets.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png',
      'fil': 'https://assets.coingecko.com/coins/images/12817/small/filecoin.png',
      'cake': 'https://assets.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo.png'
    };
    
    const iconUrl = iconUrls[baseCoin];
    
    if (iconUrl) {
      return `<img src="${iconUrl}" alt="${baseCoin.toUpperCase()}" class="crypto-icon" onerror="this.style.display='none'; this.parentNode.innerHTML='<span class=\\"crypto-fallback\\">${baseCoin.toUpperCase()}</span>'" />`;
    } else {
      // 如果沒有找到圖標，顯示文字
      return `<span class="crypto-fallback">${baseCoin.toUpperCase()}</span>`;
    }
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
        <div class="coin-row">
          <div class="col-rank">${index + 1}</div>
          <div class="col-coin">
            <div class="coin-icon">${coinIconHtml}</div>
            <div class="coin-details">
              <span class="coin-symbol">${baseCoin}</span>
              <span class="coin-name">${coin.symbol}</span>
            </div>
          </div>
          <div class="col-price">$${parseFloat(coin.price || 0).toLocaleString()}</div>
          <div class="col-change ${isPositive ? 'positive' : 'negative'}">
            ${isPositive ? '+' : ''}${changePercent.toFixed(2)}%
          </div>
          <div class="col-change-amount ${isPositive ? 'positive' : 'negative'}">
            ${isPositive ? '+' : ''}$${changeAmount.toFixed(4)}
          </div>
          <div class="col-volume">${this.formatVolume(coin.volume || 0)}</div>
        </div>
      `;
    }).join('');

    console.log('✅ 熱門貨幣渲染完成');
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