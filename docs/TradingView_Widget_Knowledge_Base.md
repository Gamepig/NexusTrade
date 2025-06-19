# TradingView Widget 完整知識庫

## 📚 概述

TradingView Widget 是預先建置的金融工具，可輕鬆嵌入網站以顯示市場數據。適合金融部落格、交易平台和投資組合追蹤器使用。

### ✨ 核心特色
- **即用型**：無需外部 API 連接
- **內建數據**：使用 TradingView 即時數據
- **響應式設計**：跨裝置相容
- **簡單整合**：3 步驟完成（選擇→配置→嵌入）

---

## 🎯 Widget 分類總覽

### 1. Charts (圖表類)

#### Advanced Chart
- **用途**：完整的互動式圖表
- **適用場景**：專業分析頁面
- **特色**：完整技術分析功能

#### Symbol Overview ⭐ (推薦用於 NexusTrade)
- **用途**：單一交易對概覽圖表
- **適用場景**：首頁展示、產品頁面
- **特色**：簡潔明瞭，包含價格和小圖表
- **建議配置**：
```javascript
{
  "symbol": "BINANCE:BTCUSDT",
  "width": "100%",
  "height": "300",
  "locale": "en",
  "dateRange": "12M",
  "colorTheme": "dark",
  "isTransparent": false,
  "autosize": false
}
```

#### Mini Chart
- **用途**：迷你圖表顯示
- **適用場景**：小空間展示
- **特色**：極簡設計

### 2. Watchlists (觀察清單類)

#### Market Overview ⭐ (推薦用於 NexusTrade 市場頁)
- **用途**：多交易對市場概覽
- **適用場景**：市場總覽頁面
- **特色**：支援多個標籤頁，可自訂交易對
- **建議配置**：
```javascript
{
  "tabs": [
    {
      "title": "熱門加密貨幣",
      "symbols": [
        {"s": "BINANCE:BTCUSDT", "d": "Bitcoin"},
        {"s": "BINANCE:ETHUSDT", "d": "Ethereum"},
        {"s": "BINANCE:BNBUSDT", "d": "BNB"},
        {"s": "BINANCE:ADAUSDT", "d": "Cardano"}
      ]
    }
  ],
  "colorTheme": "dark",
  "height": 400
}
```

#### Stock Market
- **用途**：股票市場數據
- **適用場景**：股票相關網站

#### Market Data
- **用途**：一般市場數據顯示
- **適用場景**：通用市場資訊

### 3. Tickers (跑馬燈類)

#### Ticker Tape ⭐ (推薦用於 NexusTrade 新聞區)
- **用途**：滾動價格跑馬燈
- **適用場景**：網站頂部或新聞區域
- **特色**：持續滾動顯示多個價格

#### Single Ticker
- **用途**：單一價格顯示
- **適用場景**：特定交易對監控

### 4. Heatmaps (熱力圖類)

#### Crypto Coins Heatmap
- **用途**：加密貨幣市場熱力圖
- **適用場景**：市場概況分析
- **特色**：視覺化漲跌表現

#### Stock Heatmap
- **用途**：股票市場熱力圖
- **適用場景**：股票市場分析

### 5. Screeners (篩選器類)

#### Cryptocurrency Market Screener
- **用途**：加密貨幣篩選器
- **適用場景**：進階市場分析
- **特色**：多維度篩選條件

#### Stock Screener
- **用途**：股票篩選器
- **適用場景**：股票投資分析

### 6. Symbol Details (交易對詳情類)

#### Symbol Info
- **用途**：交易對基本資訊
- **適用場景**：詳細資訊頁面

#### Technical Analysis
- **用途**：技術分析數據
- **適用場景**：專業分析頁面

#### Fundamental Data
- **用途**：基本面數據
- **適用場景**：深度分析

### 7. Others (其他類)

#### Top Stories
- **用途**：金融新聞
- **適用場景**：新聞頁面

#### Economic Calendar
- **用途**：經濟事件日曆
- **適用場景**：市場事件追蹤

---

## 🛠️ 技術實作指南

### 實作方式選擇

#### 1. HTML 嵌入方式 (推薦)
```html
<!-- TradingView Widget BEGIN -->
<div class="tradingview-widget-container">
  <div class="tradingview-widget-container__widget"></div>
  <script type="text/javascript" 
          src="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js" 
          async>
  {
    "symbol": "BINANCE:BTCUSDT",
    "width": "100%",
    "height": "300",
    "locale": "en",
    "dateRange": "12M",
    "colorTheme": "dark",
    "isTransparent": false,
    "autosize": false
  }
  </script>
</div>
<!-- TradingView Widget END -->
```

#### 2. JavaScript 動態載入方式
```javascript
// 動態建立 Widget
function createTradingViewWidget(containerId, config) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
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
}
```

### 通用配置參數

#### 基礎參數
- **symbol**: 交易對 (例: "BINANCE:BTCUSDT")
- **width**: 寬度 ("100%" 或具體像素)
- **height**: 高度 (數字，單位像素)
- **locale**: 語言 ("en", "zh_TW", "zh_CN")

#### 外觀參數
- **colorTheme**: 主題 ("light", "dark")
- **isTransparent**: 透明背景 (true/false)
- **autosize**: 自動調整大小 (true/false)

#### 時間範圍參數 (適用於圖表類)
- **dateRange**: 時間範圍 ("1D", "1W", "1M", "3M", "6M", "12M", "all")

### 建議的穩定配置

#### 用於生產環境的配置
```javascript
const stableConfig = {
  "locale": "en",              // 英文語系較穩定
  "colorTheme": "dark",        // 符合 NexusTrade 暗色主題
  "isTransparent": false,      // 避免載入衝突
  "dateRange": "12M",          // 12個月提供完整視圖
  "autosize": false            // 固定尺寸較穩定
};
```

---

## 🎯 NexusTrade 應用建議

### 首頁推薦配置

#### 主要加密貨幣區塊
使用 **Symbol Overview Widget**，分別顯示 BTC、ETH、BNB：

```javascript
const cryptoSymbols = [
  "BINANCE:BTCUSDT",
  "BINANCE:ETHUSDT", 
  "BINANCE:BNBUSDT"
];

cryptoSymbols.forEach((symbol, index) => {
  createTradingViewWidget(`crypto-chart-${index}`, {
    symbol: symbol,
    width: "100%",
    height: "300",
    locale: "en",
    dateRange: "12M",
    colorTheme: "dark",
    isTransparent: false,
    autosize: false
  });
});
```

### 市場頁面推薦配置

#### 主要貨幣 Widget 區塊
使用 **Market Overview Widget** 或多個 **Symbol Overview Widget**：

```javascript
const marketWidgets = [
  { symbol: "BINANCE:BTCUSDT", name: "Bitcoin" },
  { symbol: "BINANCE:ETHUSDT", name: "Ethereum" },
  { symbol: "BINANCE:BNBUSDT", name: "BNB" },
  { symbol: "BINANCE:ADAUSDT", name: "Cardano" }
];

marketWidgets.forEach((widget, index) => {
  createTradingViewWidget(`tradingview-widget-${index}`, {
    symbol: widget.symbol,
    width: "100%",
    height: "300",
    locale: "en",
    dateRange: "12M",
    colorTheme: "dark",
    isTransparent: false,
    autosize: false
  });
});
```

### 常見問題與解決方案

#### 1. Widget 無法載入
- **檢查項目**：
  - 容器元素是否存在
  - 網路連接是否正常
  - 腳本是否正確載入
- **解決方案**：增加錯誤處理和重試機制

#### 2. Widget 顯示異常
- **可能原因**：
  - 語系設定不相容
  - 透明背景衝突
  - 容器尺寸問題
- **建議配置**：使用上述穩定配置

#### 3. 動態更新問題
- **注意事項**：
  - Widget 載入後無法動態更改 symbol
  - 需要重新建立 Widget 來更換交易對
  - 避免頻繁重新建立以免影響效能

### 效能最佳化建議

1. **延遲載入**：在頁面切換時才載入對應的 Widget
2. **清理機制**：頁面切換時清理不需要的 Widget
3. **錯誤處理**：實作載入失敗的後備方案
4. **快取策略**：避免重複載入相同的 Widget

---

## 🔗 相關資源

- [TradingView Widget 官方文件](https://www.tradingview.com/widget-docs/)
- [Widget 產品頁面](https://www.tradingview.com/widget/)
- [Lightweight Charts](https://www.tradingview.com/lightweight-charts/)
- [進階圖表庫](https://www.tradingview.com/HTML5-stock-forex-bitcoin-charting-library/)

---

*最後更新: 2025-06-19*  
*適用於: NexusTrade 專案*