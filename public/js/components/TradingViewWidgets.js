/**
 * NexusTrade TradingView Widgets 組件
 * 
 * 提供各種 TradingView 圖表工具的整合
 */

class TradingViewWidgets {
  constructor() {
    this.widgets = new Map();
    this.isLoaded = false;
    this.loadTradingViewScript();
  }

  /**
   * 載入 TradingView 腳本
   */
  loadTradingViewScript() {
    if (window.TradingView) {
      this.isLoaded = true;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.onload = () => {
        this.isLoaded = true;
        console.log('✅ TradingView 腳本載入成功');
        resolve();
      };
      script.onerror = () => {
        console.error('❌ TradingView 腳本載入失敗');
        reject(new Error('TradingView script failed to load'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * 等待 TradingView 腳本載入
   */
  async waitForTradingView() {
    if (this.isLoaded && window.TradingView) {
      return;
    }

    // 等待腳本載入
    let attempts = 0;
    while (attempts < 50 && !this.isLoaded) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!this.isLoaded) {
      throw new Error('TradingView 腳本載入超時');
    }
  }

  /**
   * 建立市場概覽 Widget
   */
  async createMarketOverviewWidget(containerId, options = {}) {
    await this.waitForTradingView();

    const defaultOptions = {
      "tabs": [
        {
          "title": "加密貨幣",
          "title_raw": "Crypto",
          "symbols": [
            {"s": "BINANCE:BTCUSDT", "d": "Bitcoin"},
            {"s": "BINANCE:ETHUSDT", "d": "Ethereum"},
            {"s": "BINANCE:BNBUSDT", "d": "BNB"},
            {"s": "BINANCE:ADAUSDT", "d": "Cardano"},
            {"s": "BINANCE:SOLUSDT", "d": "Solana"},
            {"s": "BINANCE:XRPUSDT", "d": "XRP"}
          ],
          "quick_link": {
            "title": "更多加密貨幣",
            "href": "/market"
          }
        }
      ],
      "width": "100%",
      "height": 400,
      "showChart": true,
      "locale": "zh_TW",
      "colorTheme": "dark",
      "isTransparent": false,
      "gridLineColor": "#2A2E39",
      "fontColor": "#787B86",
      "underLineColor": "#E3F2FD"
    };

    const config = { ...defaultOptions, ...options };

    try {
      const widget = new window.TradingView.MediumWidget(config);
      
      // 注入到指定容器
      const container = document.getElementById(containerId);
      if (container) {
        container.appendChild(widget.iframe);
        this.widgets.set(containerId, widget);
        console.log(`✅ 市場概覽 Widget 建立成功: ${containerId}`);
      }

      return widget;
    } catch (error) {
      console.error('❌ 建立市場概覽 Widget 失敗:', error);
      throw error;
    }
  }

  /**
   * 建立 Symbol Overview Widget
   */
  async createSymbolOverviewWidget(containerId, symbol = "BINANCE:BTCUSDT", options = {}) {
    await this.waitForTradingView();

    const defaultOptions = {
      "symbols": [[symbol]],
      "chartOnly": false,
      "width": "100%",
      "height": 500,
      "locale": "zh_TW",
      "colorTheme": "dark",
      "autosize": true,
      "showVolume": false,
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
      "chartType": "area"
    };

    const config = { ...defaultOptions, ...options };

    try {
      const script = document.createElement('script');
      script.innerHTML = `
        new TradingView.widget(${JSON.stringify(config)});
      `;
      
      const container = document.getElementById(containerId);
      if (container) {
        container.appendChild(script);
        this.widgets.set(containerId, { config, script });
        console.log(`✅ Symbol Overview Widget 建立成功: ${containerId} (${symbol})`);
      }

      return { config, script };
    } catch (error) {
      console.error('❌ 建立 Symbol Overview Widget 失敗:', error);
      throw error;
    }
  }

  /**
   * 建立 Mini Chart Widget
   */
  async createMiniChartWidget(containerId, symbol = "BINANCE:BTCUSDT", options = {}) {
    await this.waitForTradingView();

    const defaultOptions = {
      "symbol": symbol,
      "width": 350,
      "height": 220,
      "locale": "zh_TW",
      "dateRange": "12M",
      "colorTheme": "dark",
      "trendLineColor": "#37a6ef",
      "underLineColor": "#E3F2FD",
      "underLineBottomColor": "rgba(56, 119, 235, 0)",
      "isTransparent": false,
      "autosize": true,
      "container_id": containerId
    };

    const config = { ...defaultOptions, ...options };

    try {
      const script = document.createElement('script');
      script.innerHTML = `
        new TradingView.MiniWidget(${JSON.stringify(config)});
      `;
      
      const container = document.getElementById(containerId);
      if (container) {
        container.appendChild(script);
        this.widgets.set(containerId, { config, script });
        console.log(`✅ Mini Chart Widget 建立成功: ${containerId} (${symbol})`);
      }

      return { config, script };
    } catch (error) {
      console.error('❌ 建立 Mini Chart Widget 失敗:', error);
      throw error;
    }
  }

  /**
   * 建立加密貨幣篩選器 Widget
   */
  async createCryptoScreenerWidget(containerId, options = {}) {
    await this.waitForTradingView();

    const defaultOptions = {
      "width": "100%",
      "height": 600,
      "defaultColumn": "overview",
      "screener_type": "crypto_mkt",
      "displayCurrency": "USD",
      "colorTheme": "dark",
      "locale": "zh_TW",
      "isTransparent": false
    };

    const config = { ...defaultOptions, ...options };

    try {
      const script = document.createElement('script');
      script.innerHTML = `
        new TradingView.screener(${JSON.stringify(config)});
      `;
      
      const container = document.getElementById(containerId);
      if (container) {
        container.appendChild(script);
        this.widgets.set(containerId, { config, script });
        console.log(`✅ 加密貨幣篩選器 Widget 建立成功: ${containerId}`);
      }

      return { config, script };
    } catch (error) {
      console.error('❌ 建立加密貨幣篩選器 Widget 失敗:', error);
      throw error;
    }
  }

  /**
   * 移除 Widget
   */
  removeWidget(containerId) {
    const widget = this.widgets.get(containerId);
    if (widget) {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '';
      }
      this.widgets.delete(containerId);
      console.log(`🗑️ Widget 已移除: ${containerId}`);
    }
  }

  /**
   * 清理所有 Widgets
   */
  cleanup() {
    for (const [containerId] of this.widgets) {
      this.removeWidget(containerId);
    }
    console.log('🧹 所有 TradingView Widgets 已清理');
  }

  /**
   * 重新調整 Widget 大小
   */
  resizeWidgets() {
    // TradingView widgets 通常會自動調整大小
    console.log('📐 重新調整 Widgets 大小');
  }
}

// 建立全域實例
if (typeof window !== 'undefined') {
  window.TradingViewWidgets = new TradingViewWidgets();
}