/**
 * 市場頁面組件 (重構版)
 * 
 * 功能：
 * - TradingView Symbol Overview Widget (4種主要貨幣)
 * - 使用 CryptoCurrencyList 模組顯示200種貨幣
 * - 24小時市場統計數據
 * - 15秒自動更新
 */

class MarketPage {
  constructor() {
    this.cryptoList = null;
    this.marketStats = null;
    this.updateInterval = null;
    
    // 設定全局實例引用 (用於錯誤重試)
    window.marketPageInstance = this;
    
    this.init();
  }

  /**
   * 初始化市場頁面
   */
  init() {
    console.log('🏗️ 初始化 MarketPage 組件 (重構版)...');
    
    // 檢查DOM是否準備就緒
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.initializeComponents(), 500);
      });
    } else {
      // DOM已準備就緒，延遲初始化確保所有元素存在
      setTimeout(() => this.initializeComponents(), 500);
    }
  }

  /**
   * 初始化所有組件
   */
  initializeComponents() {
    this.marketStats = document.getElementById('market-stats');
    const cryptoContainer = document.getElementById('market-coins-grid');
    
    console.log('🎯 DOM 元素:', {
      marketStats: !!this.marketStats,
      cryptoContainer: !!cryptoContainer
    });
    
    if (!cryptoContainer) {
      console.error('❌ 找不到 market-coins-grid 元素');
      return;
    }
    
    // 初始化 TradingView 圖表
    this.initializeTradingViewWidgets();
    
    // 載入市場統計數據
    this.loadMarketStats();
    
    // 初始化加密貨幣列表組件
    this.initializeCryptoList(cryptoContainer);
    
    console.log('✅ MarketPage 組件初始化完成');
  }

  /**
   * 初始化加密貨幣列表
   */
  initializeCryptoList(container) {
    console.log('🏗️ 初始化 CryptoCurrencyList 組件...');
    
    // 檢查 CryptoCurrencyList 是否已載入
    if (typeof CryptoCurrencyList === 'undefined') {
      console.error('❌ CryptoCurrencyList 組件未載入');
      return;
    }
    
    // 初始化加密貨幣列表 (無限滾動模式，200個貨幣)
    this.cryptoList = new CryptoCurrencyList({
      container: container,
      mode: 'infinite',
      maxCoins: 200,
      coinsPerPage: 50,
      updateInterval: 15000, // 15秒更新
      onCoinClick: (symbol) => {
        this.handleCoinClick(symbol);
      }
    });
    
    // 將組件實例綁定到容器 (用於錯誤重試)
    container.component = this.cryptoList;
  }

  /**
   * 處理貨幣點擊事件
   */
  handleCoinClick(symbol) {
    console.log(`🔍 點擊貨幣: ${symbol}`);
    // TODO: 導航到技術分析頁面
    // window.location.hash = `#/analysis/${symbol}`;
  }

  /**
   * 初始化 TradingView Widgets
   */
  initializeTradingViewWidgets() {
    console.log('📊 初始化 TradingView Widgets...');
    
    const mainCryptos = [
      { symbol: 'BTCUSDT', name: 'Bitcoin' },
      { symbol: 'ETHUSDT', name: 'Ethereum' },
      { symbol: 'BNBUSDT', name: 'BNB' },
      { symbol: 'ADAUSDT', name: 'Cardano' }
    ];
    
    mainCryptos.forEach((crypto, index) => {
      const containerId = `tradingview-widget-${index}`;
      const container = document.getElementById(containerId);
      
      if (container) {
        // 清空容器
        container.innerHTML = '';
        
        // 延遲載入避免衝突
        setTimeout(() => {
          this.loadTradingViewWidget(container, crypto, index);
        }, index * 1000); // 每個 widget 間隔 1 秒載入
      } else {
        console.warn(`⚠️ 找不到容器: ${containerId}`);
      }
    });
  }

  /**
   * 載入單個 TradingView Widget
   */
  loadTradingViewWidget(container, crypto, index) {
    try {
      console.log(`🔧 載入 ${crypto.symbol} TradingView Widget...`);
      
      // 創建 Widget 容器
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'tradingview-widget';
      widgetContainer.style.height = '400px';
      
      // 創建 TradingView Script
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
      script.async = true;
      
      // 使用測試過的穩定配置
      const config = {
        "symbols": [
          [`BINANCE:${crypto.symbol}|1D`]
        ],
        "chartOnly": false,
        "width": "100%",
        "height": "400",
        "locale": "en", // 使用英文確保穩定性
        "colorTheme": "dark",
        "autosize": true,
        "showVolume": true,
        "showMA": false,
        "hideDateRanges": false,
        "hideMarketStatus": false,
        "hideSymbolLogo": false,
        "scalePosition": "right",
        "scaleMode": "Normal",
        "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
        "fontSize": "10",
        "noTimeScale": false,
        "valuesTracking": "1",
        "changeMode": "price-and-percent",
        "chartType": "area",
        "backgroundColor": "rgba(19, 23, 34, 1)", // 非透明背景
        "gridLineColor": "rgba(240, 243, 250, 0.06)",
        "lineColor": "rgba(41, 98, 255, 1)",
        "textColor": "rgba(255, 255, 255, 1)",
        "underLineColor": "rgba(41, 98, 255, 0.12)",
        "isTransparent": false // 避免透明度問題
      };
      
      script.innerHTML = JSON.stringify(config);
      
      // 清空容器並添加內容
      container.innerHTML = '';
      container.appendChild(widgetContainer);
      widgetContainer.appendChild(script);
      
      // 添加載入中的提示
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'widget-loading';
      loadingDiv.innerHTML = `
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <p>載入 ${crypto.name} 圖表中...</p>
        </div>
      `;
      widgetContainer.appendChild(loadingDiv);
      
      // 設定超時檢查
      setTimeout(() => {
        const scripts = widgetContainer.querySelectorAll('script');
        if (scripts.length === 1) {
          // 可能載入失敗，顯示錯誤
          console.warn(`⚠️ ${crypto.symbol} Widget 可能載入失敗`);
          this.showWidgetError(container, crypto, index);
        }
      }, 10000); // 10秒超時
      
      console.log(`✅ 已設定 ${crypto.symbol} (${crypto.name}) Widget`);
      
    } catch (error) {
      console.error(`❌ 載入 ${crypto.symbol} Widget 失敗:`, error);
      this.showWidgetError(container, crypto, index);
    }
  }

  /**
   * 顯示 Widget 載入錯誤
   */
  showWidgetError(container, crypto, index) {
    container.innerHTML = `
      <div class="widget-error">
        <div class="error-icon">📊</div>
        <h4>${crypto.name} (${crypto.symbol})</h4>
        <p>圖表載入失敗</p>
        <button class="retry-btn" onclick="window.marketPageInstance.loadTradingViewWidget(this.closest('.trading-widget-container'), ${JSON.stringify(crypto)}, ${index})">重試</button>
      </div>
    `;
  }

  /**
   * 載入市場統計數據
   */
  async loadMarketStats() {
    console.log('📈 載入24小時市場統計數據...');
    
    try {
      // 獲取市場統計
      const response = await fetch('/api/market/stats24h');
      const result = await response.json();
      
      if (result.success) {
        this.renderMarketStats(result.data);
      } else {
        console.warn('⚠️ 獲取市場統計失敗:', result.message);
        this.renderMarketStatsError();
      }
      
    } catch (error) {
      console.error('❌ 載入市場統計失敗:', error);
      this.renderMarketStatsError();
    }
  }

  /**
   * 渲染市場統計數據
   */
  renderMarketStats(stats) {
    if (!this.marketStats) return;
    
    const {
      avgChange = 0,
      gainersCount = 0,
      losersCount = 0,
      totalCoins = 0,
      totalVolume = 0
    } = stats;
    
    const gainersPercent = totalCoins > 0 ? ((gainersCount / totalCoins) * 100).toFixed(1) : 0;
    const losersPercent = totalCoins > 0 ? ((losersCount / totalCoins) * 100).toFixed(1) : 0;
    
    this.marketStats.innerHTML = `
      <div class="market-stat">
        <div class="stat-label">24h 平均變化</div>
        <div class="stat-value ${avgChange >= 0 ? 'positive' : 'negative'}">
          ${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%
        </div>
      </div>
      
      <div class="market-stat">
        <div class="stat-label">漲跌分布</div>
        <div class="stat-value">
          <span class="positive">${gainersCount} (${gainersPercent}%)</span>
          <span class="separator">/</span>
          <span class="negative">${losersCount} (${losersPercent}%)</span>
        </div>
      </div>
      
      <div class="market-stat">
        <div class="stat-label">24h 總交易量</div>
        <div class="stat-value">$${this.formatVolume(totalVolume)}</div>
      </div>
      
      <div class="market-stat">
        <div class="stat-label">追蹤貨幣數</div>
        <div class="stat-value">${totalCoins}</div>
      </div>
    `;
  }

  /**
   * 渲染市場統計錯誤
   */
  renderMarketStatsError() {
    if (!this.marketStats) return;
    
    this.marketStats.innerHTML = `
      <div class="market-stat error">
        <div class="stat-label">市場統計</div>
        <div class="stat-value">載入失敗</div>
      </div>
    `;
  }

  /**
   * 格式化交易量
   */
  formatVolume(volume) {
    if (volume >= 1e12) {
      return (volume / 1e12).toFixed(2) + 'T';
    } else if (volume >= 1e9) {
      return (volume / 1e9).toFixed(2) + 'B';
    } else if (volume >= 1e6) {
      return (volume / 1e6).toFixed(2) + 'M';
    } else if (volume >= 1e3) {
      return (volume / 1e3).toFixed(2) + 'K';
    } else {
      return volume.toFixed(2);
    }
  }

  /**
   * 刷新所有數據
   */
  async refresh() {
    console.log('🔄 刷新市場頁面數據...');
    
    try {
      // 刷新市場統計
      await this.loadMarketStats();
      
      // 刷新加密貨幣列表 (如果已初始化)
      if (this.cryptoList) {
        await this.cryptoList.updatePrices();
      }
      
      console.log('✅ 市場頁面數據刷新完成');
      
    } catch (error) {
      console.error('❌ 刷新市場頁面失敗:', error);
    }
  }

  /**
   * 銷毀組件
   */
  destroy() {
    console.log('🗑️ 銷毀 MarketPage 組件...');
    
    // 停止自動更新
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // 銷毀加密貨幣列表
    if (this.cryptoList) {
      this.cryptoList.destroy();
      this.cryptoList = null;
    }
  }
}

// 導出類別
window.MarketPage = MarketPage;