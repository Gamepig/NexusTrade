/**
 * 單一貨幣詳情頁面組件
 * 基於 TradingView 官方設計和 currency-detail-layout.json 配置
 * 
 * Widget 順序: Symbol Info → Advanced Chart → AI Analysis → Technical Analysis → Top Stories
 */

class CurrencyDetailPage {
  constructor() {
    this.currentSymbol = null;
    this.aiAnalysisComponent = null;
    this.widgets = new Map(); // 儲存所有 widget 實例
    this.priceUpdateTimer = null;
    this.isLoading = false;
    this.layoutConfig = null;
  }
  
  /**
   * 載入佈局配置
   */
  async loadLayoutConfig() {
    try {
      const response = await fetch('/data/currency-detail-layout.json');
      this.layoutConfig = await response.json();
      console.log('✅ 佈局配置載入成功');
    } catch (error) {
      console.warn('⚠️ 佈局配置載入失敗，使用預設配置');
      this.layoutConfig = this.getDefaultConfig();
    }
  }
  
  /**
   * 載入指定貨幣的詳情頁面
   */
  async loadCurrency(symbol) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.currentSymbol = symbol;
    
    console.log(`📊 載入 ${symbol} 詳情頁面...`);
    
    try {
      // 載入佈局配置
      await this.loadLayoutConfig();
      
      // 清理舊組件和 TradingView 衝突
      this.cleanup();
      
      // 清理可能的 TradingView 全域衝突
      this.clearTradingViewConflicts();
      
      // 渲染頁面結構 (按照 JSON 配置)
      this.renderPageStructure();
      
      // 載入貨幣基本資訊
      await this.loadCurrencyInfo();
      
      // 按順序初始化所有 Widget
      await this.initializeWidgetsInOrder();
      
      // 設定操作按鈕事件
      this.setupActionEvents();
      
      // 檢查並更新按鈕狀態
      await this.updateButtonStates();
      
      console.log(`✅ ${symbol} 詳情頁面載入完成`);
      
    } catch (error) {
      console.error(`❌ ${symbol} 詳情頁面載入失敗:`, error);
      this.renderError(error.message);
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * 渲染頁面基本結構 (根據佈局檔案規劃：垂直堆疊 + 響應式網格)
   */
  renderPageStructure() {
    const container = document.getElementById('currency-detail-page');
    if (!container) {
      throw new Error('貨幣詳情頁面容器未找到');
    }
    
    const displayName = this.getDisplayName(this.currentSymbol);
    
    container.innerHTML = `
      <div class="currency-detail-container">
        <!-- 操作按鈕區域 -->
        <div class="action-buttons-container">
          <button class="action-btn primary" id="add-watchlist-btn">
            ⭐ 加入關注
          </button>
          <button class="action-btn secondary" id="set-alert-btn">
            🔔 設定通知
          </button>
        </div>

        <!-- 主要內容區域 - CSS Grid 佈局 -->
        <main class="currency-main-content">
          <!-- 1. Symbol Info Widget (全寬) -->
          <section class="widget-section symbol-info-section">
            <div id="symbol-info-widget" class="tradingview-widget-container">
              <!-- Symbol Info Widget 將在這裡載入 -->
            </div>
          </section>

          <!-- 2. 主要圖表區域 (全寬，主要視覺焦點) -->
          <section class="widget-section chart-section">
            <div id="advanced-chart-widget" class="tradingview-widget-container chart-container">
              <!-- Advanced Chart Widget 將在這裡載入 -->
            </div>
          </section>

          <!-- 3. AI 分析區域 (全寬，緊接圖表下方 - 重點位置) -->
          <section class="widget-section ai-analysis-section">
            <div id="ai-analysis-container" class="ai-analysis-content">
              <!-- AI 分析組件將在這裡載入 -->
            </div>
          </section>

          <!-- 4. 技術分析 + 新聞 並排區域 (2欄 Grid) -->
          <div class="parallel-widgets-grid">
            <!-- Technical Analysis Widget (左側) -->
            <section class="widget-section technical-analysis-section">
              <div id="technical-analysis-widget" class="tradingview-widget-container">
                <!-- Technical Analysis Widget 將在這裡載入 -->
              </div>
            </section>

            <!-- Top Stories Widget (右側) -->
            <section class="widget-section stories-section">
              <div id="top-stories-widget" class="tradingview-widget-container">
                <!-- Top Stories Widget 將在這裡載入 -->
              </div>
            </section>
          </div>

        </main>
      </div>
    `;
  }
  
  /**
   * 按照簡化後的佈局順序初始化所有 Widget
   */
  async initializeWidgetsInOrder() {
    const initSequence = [
      { order: 1, method: 'initSymbolInfoWidget' },
      { order: 2, method: 'initAdvancedChartWidget' },
      { order: 3, method: 'initAIAnalysis' },
      { order: 4, method: 'initTechnicalAnalysisWidget' },
      { order: 5, method: 'initTopStoriesWidget' }
    ];
    
    console.log(`📋 開始初始化 ${initSequence.length} 個 Widget`);
    
    for (const { order, method } of initSequence) {
      try {
        console.log(`🔧 初始化 Widget ${order}: ${method}`);
        
        // 檢查容器是否存在
        const containerId = this.getContainerIdByMethod(method);
        const container = document.getElementById(containerId);
        if (!container) {
          console.error(`❌ 容器 ${containerId} 不存在，跳過 ${method}`);
          continue;
        }
        
        await this[method]();
        console.log(`✅ Widget ${order} 初始化完成`);
      } catch (error) {
        console.error(`❌ Widget ${order} 初始化失敗:`, error);
      }
    }
    
    console.log(`🎉 所有 Widget 初始化完成`);
  }
  
  /**
   * 根據方法名稱獲取容器 ID
   */
  getContainerIdByMethod(method) {
    const mapping = {
      'initSymbolInfoWidget': 'symbol-info-widget',
      'initAdvancedChartWidget': 'advanced-chart-widget',
      'initAIAnalysis': 'ai-analysis-container',
      'initTechnicalAnalysisWidget': 'technical-analysis-widget',
      'initTopStoriesWidget': 'top-stories-widget'
    };
    return mapping[method] || 'unknown';
  }
  
  /**
   * 1. Symbol Info Widget
   */
  async initSymbolInfoWidget() {
    const container = document.getElementById('symbol-info-widget');
    if (!container) return;
    
    const symbol = this.getTradingViewSymbol(this.currentSymbol);
    
    // 使用現代化的嵌入方式
    container.innerHTML = `
      <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
      </div>
    `;
    
    // 創建並插入腳本
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      "symbol": symbol,
      "width": "100%",
      "locale": "zh_TW",
      "colorTheme": "dark",
      "isTransparent": true
    });
    
    container.appendChild(script);
  }
  
  /**
   * 1. Advanced Chart Widget (主要圖表)
   */
  async initAdvancedChartWidget() {
    const container = document.getElementById('advanced-chart-widget');
    if (!container) return;
    
    const symbol = this.getTradingViewSymbol(this.currentSymbol);
    
    // 使用現代化的嵌入方式
    container.innerHTML = `
      <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
        <div class="tradingview-widget-copyright">
          <a href="https://zh.tradingview.com/" rel="noopener nofollow" target="_blank">
            <span class="blue-text">查看圖表於 TradingView</span>
          </a>
        </div>
      </div>
    `;
    
    // 創建並插入腳本
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      "width": "100%",
      "height": "600",
      "symbol": symbol,
      "interval": "D",
      "timezone": "Asia/Taipei",
      "theme": "dark",
      "style": "1",
      "locale": "zh_TW",
      "backgroundColor": "rgba(19, 23, 34, 1)",
      "gridColor": "rgba(42, 46, 57, 0.5)",
      "allow_symbol_change": false,
      "save_image": false,
      "calendar": false,
      "hide_legend": false,
      "hide_side_toolbar": false,
      "studies": [
        "RSI@tv-basicstudies",
        "MACD@tv-basicstudies"
      ],
      "show_popup_button": true,
      "popup_width": "1000",  
      "popup_height": "650"
    });
    
    container.appendChild(script);
  }
  
  /**
   * 3. Company Profile Widget
   */
  async initCompanyProfileWidget() {
    const container = document.getElementById('company-profile-widget');
    if (!container) return;
    
    const symbol = this.getTradingViewSymbol(this.currentSymbol);
    
    container.innerHTML = `
      <div class="tradingview-widget-container__widget"></div>
      <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-symbol-profile.js" async>
      {
        "symbol": "${symbol}",
        "width": "100%",
        "height": "400",
        "locale": "zh_TW",
        "colorTheme": "dark",
        "isTransparent": true
      }
      </script>
    `;
  }
  
  /**
   * 2. AI Analysis Component (位於圖表下方 - 重點位置)
   */
  async initAIAnalysis() {
    const container = document.getElementById('ai-analysis-container');
    if (!container) return;
    
    try {
      // 清理舊的 AI 分析組件
      if (this.aiAnalysisComponent) {
        this.aiAnalysisComponent.destroy();
      }
      
      // 先顯示載入狀態
      container.innerHTML = `
        <div class="ai-analysis-content">
          <div class="loading-indicator">
            <div class="spinner"></div>
            <p>正在載入 AI 分析...</p>
          </div>
        </div>
      `;
      
      // 創建新的 AI 分析組件
      if (typeof AICurrencyAnalysis !== 'undefined') {
        this.aiAnalysisComponent = new AICurrencyAnalysis('ai-analysis-container', this.currentSymbol);
        console.log('✅ AI 分析組件初始化完成');
      } else {
        console.warn('⚠️ AICurrencyAnalysis 組件未載入');
        // 顯示備用內容
        setTimeout(() => {
          container.innerHTML = `
            <div class="ai-analysis-content">
              <div class="ai-unavailable">
                <p>🔧 AI 分析服務正在升級中</p>
                <p>請暫時參考下方的技術分析指標</p>
              </div>
            </div>
          `;
        }, 2000);
      }
    } catch (error) {
      console.error('❌ AI 分析組件初始化失敗:', error);
      // 顯示錯誤狀態
      container.innerHTML = `
        <div class="ai-analysis-content">
          <div class="ai-error">
            <p>⚠️ AI 分析載入失敗</p>
            <p>請重新整理頁面或稍後再試</p>
          </div>
        </div>
      `;
    }
  }
  
  /**
   * 3. Technical Analysis Widget
   */
  async initTechnicalAnalysisWidget() {
    const container = document.getElementById('technical-analysis-widget');
    if (!container) return;
    
    const symbol = this.getTradingViewSymbol(this.currentSymbol);
    
    // 使用現代化的嵌入方式
    container.innerHTML = `
      <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
      </div>
    `;
    
    // 創建並插入腳本
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      "interval": "1D",
      "width": "100%",
      "isTransparent": true,
      "height": "400",
      "symbol": symbol,
      "showIntervalTabs": true,
      "locale": "zh_TW",
      "colorTheme": "dark"
    });
    
    container.appendChild(script);
  }
  
  /**
   * 4. Top Stories Widget
   */
  async initTopStoriesWidget() {
    const container = document.getElementById('top-stories-widget');
    if (!container) return;
    
    const symbol = this.getTradingViewSymbol(this.currentSymbol);
    
    // 使用現代化的嵌入方式
    container.innerHTML = `
      <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
      </div>
    `;
    
    // 創建並插入腳本
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      "feedMode": "symbol",
      "symbol": symbol,
      "colorTheme": "dark",
      "isTransparent": true,
      "displayMode": "compact",
      "width": "100%",
      "height": "400",
      "locale": "en",
      "largeChartUrl": "",
      "showSymbolLogo": true,
      "showFloatingTooltip": false,
      "autosize": false
    });
    
    container.appendChild(script);
  }
  
  
  /**
   * 8. Cryptocurrency Market Widget
   */
  async initCryptocurrencyMarketWidget() {
    const container = document.getElementById('crypto-market-widget');
    if (!container) return;
    
    container.innerHTML = `
      <div class="tradingview-widget-container__widget"></div>
      <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-cryptocurrency-market.js" async>
      {
        "width": "100%",
        "height": "400",
        "defaultColumn": "overview",
        "screener_type": "crypto_mkt",
        "displayCurrency": "USD",
        "colorTheme": "dark",
        "locale": "zh_TW",
        "isTransparent": true
      }
      </script>
    `;
  }
  
  /**
   * 載入貨幣基本資訊
   */
  async loadCurrencyInfo() {
    try {
      const response = await fetch(`/api/market/ticker/${this.currentSymbol}`);
      if (response.ok) {
        const data = await response.json();
        this.updatePriceInfo(data);
      }
    } catch (error) {
      console.warn('價格資訊載入失敗:', error);
    }
  }
  
  /**
   * 更新價格顯示
   */
  updatePriceInfo(data) {
    const priceInfoElement = document.getElementById('price-info');
    if (!priceInfoElement || !data) return;
    
    const isPositive = data.priceChangePercent >= 0;
    const changeClass = isPositive ? 'positive' : 'negative';
    const changeIcon = isPositive ? '↗' : '↘';
    
    priceInfoElement.innerHTML = `
      <div class="current-price">$${parseFloat(data.price).toLocaleString()}</div>
      <div class="price-change ${changeClass}">
        ${changeIcon} ${data.priceChangePercent.toFixed(2)}%
        <span class="change-amount">(${isPositive ? '+' : ''}$${parseFloat(data.priceChange).toLocaleString()})</span>
      </div>
    `;
  }
  
  /**
   * 設定操作按鈕事件
   */
  setupActionEvents() {
    // 關注按鈕
    const watchlistBtn = document.getElementById('add-watchlist-btn');
    if (watchlistBtn) {
      watchlistBtn.addEventListener('click', () => {
        this.handleAddToWatchlist();
      });
      
      // 檢查當前貨幣的觀察清單狀態
      this.checkAndUpdateWatchlistStatus();
    }
    
    // 設定通知按鈕
    const alertBtn = document.getElementById('set-alert-btn');
    if (alertBtn) {
      alertBtn.addEventListener('click', () => {
        console.log(`🔔 設定通知: ${this.currentSymbol}`);
        
        // 確保 PriceAlertModal 已載入
        if (window.priceAlertModal) {
          window.priceAlertModal.show(this.currentSymbol);
        } else {
          console.error('❌ PriceAlertModal 組件未載入');
          // 動態載入組件
          this.loadPriceAlertModal();
        }
      });
      
      // 檢查當前貨幣的價格警報狀態
      this.checkAndUpdateAlertStatus();
    }
    
    // 監聽警報狀態變更事件
    this.setupAlertStatusListener();
  }
  
  /**
   * 更新按鈕狀態 - 檢查觀察清單和警報狀態
   */
  async updateButtonStates() {
    console.log(`🔄 更新 ${this.currentSymbol} 按鈕狀態...`);
    
    try {
      // 並行檢查觀察清單和警報狀態
      const [watchlistStatus, alertStatus] = await Promise.all([
        this.checkWatchlistStatus(),
        this.checkAlertStatus()
      ]);
      
      // 更新觀察清單按鈕
      this.updateWatchlistButton(watchlistStatus);
      
      // 更新警報按鈕
      this.updateAlertButton(alertStatus);
      
      console.log(`✅ ${this.currentSymbol} 按鈕狀態更新完成`, {
        watchlistStatus,
        alertStatus
      });
      
    } catch (error) {
      console.warn('更新按鈕狀態失敗:', error);
      // 保持預設狀態，不阻擋頁面載入
    }
  }

  /**
   * 設定警報狀態監聽器
   */
  setupAlertStatusListener() {
    window.addEventListener('alertStatusChanged', (event) => {
      const { symbol, alertCount, hasAlerts, alerts } = event.detail;
      
      // 只處理當前貨幣的警報狀態變更
      if (symbol === this.currentSymbol) {
        console.log(`🔄 接收到 ${symbol} 警報狀態變更:`, { alertCount, hasAlerts });
        
        const alertStatus = {
          hasAlerts,
          alertCount,
          alerts
        };
        
        this.updateAlertButton(alertStatus);
      }
    });
  }
  
  /**
   * 動態載入 PriceAlertModal 組件
   */
  async loadPriceAlertModal() {
    try {
      // 檢查是否已載入
      if (window.priceAlertModal) {
        window.priceAlertModal.show(this.currentSymbol);
        return;
      }

      console.log('📦 動態載入 PriceAlertModal 組件...');
      
      // 創建 script 標籤載入組件
      const script = document.createElement('script');
      script.src = '/js/components/PriceAlertModal.js';
      script.onload = () => {
        console.log('✅ PriceAlertModal 組件載入成功');
        if (window.priceAlertModal) {
          window.priceAlertModal.show(this.currentSymbol);
        }
      };
      script.onerror = () => {
        console.error('❌ PriceAlertModal 組件載入失敗');
      };
      
      document.head.appendChild(script);
      
    } catch (error) {
      console.error('❌ 載入 PriceAlertModal 組件失敗:', error);
    }
  }

  /**
   * 獲取 TradingView 交易對符號
   */
  getTradingViewSymbol(symbol) {
    // 確保使用 BINANCE 前綴
    if (symbol.includes(':')) {
      return symbol;
    }
    return `BINANCE:${symbol}`;
  }
  
  /**
   * 獲取貨幣顯示名稱
   */
  getDisplayName(symbol) {
    const names = {
      'BTCUSDT': 'Bitcoin',
      'ETHUSDT': 'Ethereum', 
      'BNBUSDT': 'BNB',
      'XRPUSDT': 'XRP',
      'ADAUSDT': 'Cardano',
      'SOLUSDT': 'Solana',
      'DOGEUSDT': 'Dogecoin',
      'MATICUSDT': 'Polygon',
      'DOTUSDT': 'Polkadot',
      'LTCUSDT': 'Litecoin'
    };
    return names[symbol] || symbol.replace('USDT', '');
  }
  
  /**
   * 獲取貨幣圖標
   */
  getCurrencyIcon(symbol) {
    const icons = {
      'BTCUSDT': '₿',
      'ETHUSDT': 'Ξ',
      'BNBUSDT': '🔶',
      'XRPUSDT': '💠',
      'ADAUSDT': '🔵',
      'SOLUSDT': '🟣',
      'DOGEUSDT': '🐕',
      'MATICUSDT': '🔷',
      'DOTUSDT': '⚫',
      'LTCUSDT': '🥈'
    };
    return icons[symbol] || '💰';
  }
  
  /**
   * 渲染錯誤狀態
   */
  renderError(message) {
    const container = document.getElementById('currency-detail-page');
    if (!container) return;
    
    container.innerHTML = `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h2>載入失敗</h2>
        <p>${message}</p>
        <button onclick="window.location.hash='#/market'" class="retry-btn">
          返回市場頁面
        </button>
      </div>
    `;
  }
  
  /**
   * 獲取預設配置
   */
  getDefaultConfig() {
    return {
      layout: {
        container: {
          maxWidth: "1400px",
          padding: "20px"
        }
      }
    };
  }
  
  /**
   * 清理 TradingView 全域衝突
   */
  clearTradingViewConflicts() {
    console.log('🧹 清理 TradingView 全域衝突...');
    
    // 清理首頁的 TradingView Widget 容器
    const homepageWidgets = ['homepage-tradingview-0', 'homepage-tradingview-1', 'homepage-tradingview-2'];
    homepageWidgets.forEach(id => {
      const container = document.getElementById(id);
      if (container) {
        // 暫時隱藏而不刪除，避免返回首頁時需要重新載入
        container.style.display = 'none';
      }
    });
    
    // 清理可能存在的其他 TradingView 容器
    const allTradingViewContainers = document.querySelectorAll('.tradingview-widget-container:not([id*="currency-detail"])');
    allTradingViewContainers.forEach(container => {
      if (container.closest('#currency-detail-page')) return; // 不要清理自己的容器
      container.style.display = 'none';
    });
    
    console.log('✅ TradingView 衝突清理完成');
  }

  /**
   * 處理加入觀察清單
   */
  async handleAddToWatchlist() {
    try {
      console.log(`⭐ 準備加入關注: ${this.currentSymbol}`);
      
      // 檢查認證狀態
      const token = this.getAuthToken();
      if (!token) {
        console.log('🔒 用戶未登入，重導向到登入頁面');
        return;
      }

      // 檢查是否已在觀察清單中
      const isWatched = await this.checkWatchlistStatus();
      if (isWatched) {
        this.showNotification('此貨幣已在您的觀察清單中', 'warning');
        return;
      }

      // 發送 API 請求加入觀察清單
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: this.currentSymbol,
          priority: 3, // 預設中等優先級
          category: 'default'
        })
      });

      const result = await response.json();

      if (result.success) {
        this.showNotification(`✅ ${this.currentSymbol} 已加入觀察清單`, 'success');
        this.updateWatchlistButton(true);
        console.log(`✅ 成功加入觀察清單: ${this.currentSymbol}`);
      } else {
        throw new Error(result.message || '加入觀察清單失敗');
      }

    } catch (error) {
      console.error('❌ 加入觀察清單失敗:', error);
      this.showNotification('加入觀察清單失敗: ' + error.message, 'error');
    }
  }

  /**
   * 檢查觀察清單狀態
   */
  async checkWatchlistStatus() {
    try {
      const token = this.getAuthToken();
      if (!token) return false;

      const response = await fetch(`/api/watchlist/status/${this.currentSymbol}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      return result.success && result.data.isWatched;
    } catch (error) {
      console.warn('檢查觀察清單狀態失敗:', error);
      return false;
    }
  }

  /**
   * 檢查並更新觀察清單狀態
   */
  async checkAndUpdateWatchlistStatus() {
    try {
      const isWatched = await this.checkWatchlistStatus();
      this.updateWatchlistButton(isWatched);
    } catch (error) {
      console.warn('檢查觀察清單狀態失敗:', error);
      // 保持預設狀態
    }
  }

  /**
   * 檢查價格警報狀態
   */
  async checkAlertStatus() {
    try {
      const token = this.getAuthToken();
      if (!token) return { hasAlerts: false, alertCount: 0 };

      const response = await fetch(`/api/notifications/alerts/${this.currentSymbol}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('檢查警報狀態失敗:', response.statusText);
        return { hasAlerts: false, alertCount: 0 };
      }

      const result = await response.json();
      const alerts = result.data?.alerts || [];
      
      return {
        hasAlerts: alerts.length > 0,
        alertCount: alerts.length,
        alerts: alerts
      };
    } catch (error) {
      console.warn('檢查警報狀態失敗:', error);
      return { hasAlerts: false, alertCount: 0 };
    }
  }

  /**
   * 檢查並更新價格警報狀態
   */
  async checkAndUpdateAlertStatus() {
    try {
      const alertStatus = await this.checkAlertStatus();
      this.updateAlertButton(alertStatus);
    } catch (error) {
      console.warn('檢查價格警報狀態失敗:', error);
      // 保持預設狀態
    }
  }

  /**
   * 更新觀察清單按鈕狀態
   */
  updateWatchlistButton(isWatched) {
    const watchlistBtn = document.getElementById('add-watchlist-btn');
    if (!watchlistBtn) return;

    if (isWatched) {
      watchlistBtn.innerHTML = '✅ 已關注';
      watchlistBtn.classList.add('added');
      watchlistBtn.disabled = true;
    } else {
      watchlistBtn.innerHTML = '⭐ 加入關注';
      watchlistBtn.classList.remove('added');
      watchlistBtn.disabled = false;
    }
  }

  /**
   * 更新價格警報按鈕狀態
   */
  updateAlertButton(alertStatus) {
    const alertBtn = document.getElementById('set-alert-btn');
    if (!alertBtn) return;

    if (alertStatus.hasAlerts) {
      // 已設定警報：顯示警報數量和編輯選項
      if (alertStatus.alertCount === 1) {
        alertBtn.innerHTML = '🔔 已設定通知';
      } else {
        alertBtn.innerHTML = `🔔 已設定 ${alertStatus.alertCount} 個通知`;
      }
      alertBtn.classList.add('alert-active');
      alertBtn.classList.remove('secondary');
      alertBtn.classList.add('primary');
      alertBtn.disabled = false;
      
      // 添加工具提示顯示警報詳情
      this.addAlertTooltip(alertBtn, alertStatus.alerts);
      
    } else {
      // 未設定警報：顯示設定選項
      alertBtn.innerHTML = '🔔 設定通知';
      alertBtn.classList.remove('alert-active');
      alertBtn.classList.remove('primary');
      alertBtn.classList.add('secondary');
      alertBtn.disabled = false;
      
      // 移除工具提示
      this.removeAlertTooltip(alertBtn);
    }
  }

  /**
   * 添加警報工具提示
   */
  addAlertTooltip(button, alerts) {
    if (!alerts || alerts.length === 0) return;
    
    // 建立工具提示內容
    const tooltipContent = alerts.map(alert => {
      // 使用 alertType 或 type 作為備選
      const alertType = alert.alertType || alert.type;
      const alertTypeText = this.getAlertTypeText(alertType);
      const targetValue = alert.targetPrice ? `$${parseFloat(alert.targetPrice).toLocaleString()}` : 
                         alert.percentageChange ? `${alert.percentageChange}%` : '未設定';
      return `${alertTypeText}: ${targetValue}`;
    }).join('\n');
    
    button.title = `已設定的通知:\n${tooltipContent}\n\n點擊查看或編輯`;
  }

  /**
   * 移除警報工具提示
   */
  removeAlertTooltip(button) {
    button.title = '點擊設定價格通知';
  }

  /**
   * 獲取警報類型顯示文字
   */
  getAlertTypeText(alertType) {
    const alertTypeMap = {
      'price_above': '價格上穿',
      'price_below': '價格下穿',
      'percent_change': '漲跌幅變化',
      'volume_spike': '成交量異常',
      'daily_ai_analysis': '每日AI分析'
    };
    return alertTypeMap[alertType] || alertType;
  }

  /**
   * 獲取認證令牌
   */
  getAuthToken() {
    try {
      // 方案 1: 使用新的 AuthManager
      if (window.authManager && window.authManager.isAuthenticated()) {
        const token = window.authManager.getToken();
        if (token) {
          return token;
        }
      }
      
      // 方案 2: 使用舊的 authStateManager (備用)
      if (window.authStateManager) {
        const token = window.authStateManager.getToken();
        if (token && !window.authStateManager.isTokenExpired()) {
          return token;
        }
      }
      
      // 方案 3: 從 localStorage 直接讀取
      const token = localStorage.getItem('nexustrade_token');
      if (token) {
        try {
          // 簡單檢查 JWT 格式
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            if (payload.exp && payload.exp * 1000 > Date.now()) {
              return token;
            }
          }
        } catch (error) {
          console.warn('Token 格式錯誤:', error);
        }
      }
      
      throw new Error('用戶未登入或登入已過期');
      
    } catch (error) {
      console.warn('取得認證令牌失敗:', error);
      this.redirectToLogin();
      return null;
    }
  }

  /**
   * 重導向到登入頁面
   */
  redirectToLogin() {
    console.log('🔒 需要登入，重導向到登入頁面');
    
    // 方案 1: 使用新的 AuthManager
    if (window.authManager && typeof window.authManager.showLoginModal === 'function') {
      window.authManager.showLoginModal();
      return;
    }
    
    // 方案 2: 使用全域登入模態框
    if (window.showLoginModal && typeof window.showLoginModal === 'function') {
      window.showLoginModal();
      return;
    }
    
    // 方案 3: 使用主應用程式的登入功能
    if (window.app && typeof window.app.showLoginModal === 'function') {
      window.app.showLoginModal();
      return;
    }
    
    // 方案 4: 嘗試觸發登入按鈕
    const loginBtn = document.querySelector('#login-btn, .login-btn');
    if (loginBtn) {
      loginBtn.click();
      return;
    }
    
    // 方案 5: 顯示提示訊息
    this.showNotification('請先登入以使用價格警報和觀察清單功能', 'warning');
  }

  /**
   * 顯示通知
   */
  showNotification(message, type = 'info') {
    console.log(`📢 通知 (${type}):`, message);
    
    // 使用全域通知系統
    if (window.app && typeof window.app.showNotification === 'function') {
      window.app.showNotification(message, type);
    } else {
      // 備用方案: 簡單的 console 輸出
      const alertType = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
      console.log(`${alertType} ${message}`);
    }
  }

  /**
   * 清理組件
   */
  cleanup() {
    // 清理 AI 分析組件
    if (this.aiAnalysisComponent) {
      this.aiAnalysisComponent.destroy();
      this.aiAnalysisComponent = null;
    }
    
    // 清理價格更新定時器
    if (this.priceUpdateTimer) {
      clearInterval(this.priceUpdateTimer);
      this.priceUpdateTimer = null;
    }
    
    // 清理所有 Widget
    this.widgets.clear();
  }
  
  /**
   * 銷毀組件
   */
  destroy() {
    this.cleanup();
    console.log('🗑️ CurrencyDetailPage 組件已銷毀');
  }
}

// 導出到全局作用域
window.CurrencyDetailPage = CurrencyDetailPage;