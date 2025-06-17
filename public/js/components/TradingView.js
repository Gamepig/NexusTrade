/**
 * NexusTrade TradingView 圖表組件
 * 
 * 整合 TradingView 圖表到應用程式中
 */

class TradingViewComponent {
  constructor() {
    this.widgets = new Map();
    this.currentSymbol = 'BTCUSDT';
    this.defaultConfig = {
      theme: 'dark',
      locale: 'zh_TW',
      timezone: 'Asia/Taipei',
      toolbar_bg: '#1a1a1a',
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      save_image: false
    };
  }

  /**
   * 建立 TradingView 小工具
   */
  createWidget(containerId, options = {}) {
    if (!window.TradingView) {
      console.error('TradingView 庫未載入');
      return null;
    }

    const config = {
      ...this.defaultConfig,
      ...options,
      container_id: containerId,
      symbol: options.symbol || this.currentSymbol,
      interval: options.interval || 'D',
      width: options.width || '100%',
      height: options.height || 600,
      style: options.style || '1',
      autosize: true,
      studies: options.studies || [
        'MASimple@tv-basicstudies',
        'RSI@tv-basicstudies'
      ]
    };

    try {
      const widget = new window.TradingView.widget(config);
      this.widgets.set(containerId, widget);
      
      // 設定事件監聽器
      this.setupWidgetEvents(widget, containerId);
      
      return widget;
    } catch (error) {
      console.error('建立 TradingView 小工具失敗:', error);
      return null;
    }
  }

  /**
   * 建立輕量級圖表
   */
  createLightweightChart(containerId, options = {}) {
    if (!window.LightweightCharts) {
      console.error('LightweightCharts 庫未載入');
      return null;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`容器 ${containerId} 不存在`);
      return null;
    }

    const config = {
      width: options.width || container.clientWidth,
      height: options.height || 400,
      layout: {
        backgroundColor: '#1a1a1a',
        textColor: '#ffffff',
      },
      grid: {
        vertLines: {
          color: '#2a2a2a',
        },
        horzLines: {
          color: '#2a2a2a',
        },
      },
      crosshair: {
        mode: window.LightweightCharts.CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#485c7b',
      },
      timeScale: {
        borderColor: '#485c7b',
        timeVisible: true,
        secondsVisible: false,
      },
      ...options
    };

    try {
      const chart = window.LightweightCharts.createChart(container, config);
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#4bffb5',
        downColor: '#ff4976',
        borderDownColor: '#ff4976',
        borderUpColor: '#4bffb5',
        wickDownColor: '#ff4976',
        wickUpColor: '#4bffb5',
      });

      this.widgets.set(containerId, {
        chart,
        candlestickSeries,
        type: 'lightweight'
      });

      // 響應式調整
      this.setupResponsiveChart(chart, container);

      return { chart, candlestickSeries };
    } catch (error) {
      console.error('建立輕量級圖表失敗:', error);
      return null;
    }
  }

  /**
   * 設定響應式圖表
   */
  setupResponsiveChart(chart, container) {
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });

    resizeObserver.observe(container);
  }

  /**
   * 設定小工具事件
   */
  setupWidgetEvents(widget, containerId) {
    widget.onChartReady(() => {
      console.log(`TradingView 圖表準備完成: ${containerId}`);
      
      // 可以在這裡添加自訂功能
      const iframe = document.querySelector(`#${containerId} iframe`);
      if (iframe) {
        iframe.style.borderRadius = '8px';
      }
    });
  }

  /**
   * 更新輕量級圖表數據
   */
  updateLightweightChartData(containerId, data) {
    const widget = this.widgets.get(containerId);
    if (!widget || widget.type !== 'lightweight') {
      console.error(`輕量級圖表 ${containerId} 不存在`);
      return;
    }

    try {
      // 格式化數據為 LightweightCharts 格式
      const formattedData = data.map(item => ({
        time: item.time || item.openTime,
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close)
      }));

      widget.candlestickSeries.setData(formattedData);
    } catch (error) {
      console.error('更新圖表數據失敗:', error);
    }
  }

  /**
   * 添加即時數據點
   */
  addRealtimeData(containerId, dataPoint) {
    const widget = this.widgets.get(containerId);
    if (!widget || widget.type !== 'lightweight') {
      return;
    }

    try {
      const formattedPoint = {
        time: dataPoint.time || Math.floor(Date.now() / 1000),
        open: parseFloat(dataPoint.open),
        high: parseFloat(dataPoint.high),
        low: parseFloat(dataPoint.low),
        close: parseFloat(dataPoint.close)
      };

      widget.candlestickSeries.update(formattedPoint);
    } catch (error) {
      console.error('添加即時數據失敗:', error);
    }
  }

  /**
   * 切換交易對
   */
  changeSymbol(containerId, symbol) {
    const widget = this.widgets.get(containerId);
    if (!widget) {
      console.error(`圖表 ${containerId} 不存在`);
      return;
    }

    if (widget.type === 'lightweight') {
      // 輕量級圖表需要重新載入數據
      this.loadSymbolData(containerId, symbol);
    } else {
      // TradingView 小工具
      try {
        widget.setSymbol(symbol, () => {
          console.log(`圖表 ${containerId} 已切換到 ${symbol}`);
        });
      } catch (error) {
        console.error('切換交易對失敗:', error);
      }
    }

    this.currentSymbol = symbol;
  }

  /**
   * 載入交易對數據
   */
  async loadSymbolData(containerId, symbol) {
    try {
      const response = await fetch(`/api/market/klines/${symbol}?interval=1h&limit=500`);
      const result = await response.json();
      
      if (result.status === 'success') {
        this.updateLightweightChartData(containerId, result.data.klines);
      }
    } catch (error) {
      console.error('載入交易對數據失敗:', error);
    }
  }

  /**
   * 設定圖表主題
   */
  setTheme(containerId, theme) {
    const widget = this.widgets.get(containerId);
    if (!widget) return;

    if (widget.type === 'lightweight') {
      const themeConfig = theme === 'dark' ? {
        backgroundColor: '#1a1a1a',
        textColor: '#ffffff',
      } : {
        backgroundColor: '#ffffff',
        textColor: '#000000',
      };

      widget.chart.applyOptions({
        layout: themeConfig
      });
    }
  }

  /**
   * 取得支援的時間間隔
   */
  getSupportedIntervals() {
    return [
      { label: '1分鐘', value: '1' },
      { label: '5分鐘', value: '5' },
      { label: '15分鐘', value: '15' },
      { label: '30分鐘', value: '30' },
      { label: '1小時', value: '60' },
      { label: '4小時', value: '240' },
      { label: '1天', value: 'D' },
      { label: '1週', value: 'W' },
      { label: '1月', value: 'M' }
    ];
  }

  /**
   * 銷毀圖表
   */
  destroyWidget(containerId) {
    const widget = this.widgets.get(containerId);
    if (!widget) return;

    try {
      if (widget.type === 'lightweight') {
        widget.chart.remove();
      } else {
        widget.remove();
      }
      
      this.widgets.delete(containerId);
      console.log(`圖表 ${containerId} 已銷毀`);
    } catch (error) {
      console.error('銷毀圖表失敗:', error);
    }
  }

  /**
   * 銷毀所有圖表
   */
  destroyAll() {
    for (const containerId of this.widgets.keys()) {
      this.destroyWidget(containerId);
    }
  }

  /**
   * 取得圖表列表
   */
  getWidgets() {
    return Array.from(this.widgets.keys());
  }

  /**
   * 檢查圖表是否存在
   */
  hasWidget(containerId) {
    return this.widgets.has(containerId);
  }
}

// 全域實例
window.TradingViewComponent = new TradingViewComponent();

// 導出給模組系統使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TradingViewComponent;
}