# Market Controller 技術文件

## 📋 概述

Market Controller (`src/controllers/market.controller.js`) 負責處理所有市場數據相關的 API 端點，提供加密貨幣交易對的即時價格、歷史數據和市場統計資訊。

## 🔧 依賴項目

```javascript
const { getBinanceService } = require('../services/binance.service');
const { ApiErrorFactory } = require('../utils/ApiError');
const logger = require('../utils/logger');
```

## 📊 API 端點

### 1. 取得熱門交易對

**端點**: `GET /api/market/trending`

**功能**: 取得按交易量排序的熱門 USDT 交易對列表

#### 參數
- `limit` (query, optional): 返回結果數量，預設 200

#### 實作詳情
```javascript
const getTrendingPairs = async (req, res) => {
  try {
    const { limit = 200 } = req.query;
    const binanceService = getBinanceService();
    
    // 獲取24小時統計數據
    const allTickers = await binanceService.get24hrTicker();
    
    // 過濾和排序邏輯
    const usdtPairs = allTickers
      .filter(ticker => ticker.symbol.endsWith('USDT'))
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, parseInt(limit));
    
    // 格式化響應數據
    const formattedPairs = usdtPairs.map((ticker, index) => ({
      rank: index + 1,
      symbol: ticker.symbol,
      name: ticker.symbol.replace('USDT', ''),
      price: parseFloat(ticker.lastPrice),
      priceChange: parseFloat(ticker.priceChange),
      priceChangePercent: parseFloat(ticker.priceChangePercent),
      volume: parseFloat(ticker.volume),
      quoteVolume: parseFloat(ticker.quoteVolume),
      high: parseFloat(ticker.highPrice),
      low: parseFloat(ticker.lowPrice),
      lastUpdate: new Date().toISOString()
    }));
    
    return formattedPairs;
  } catch (error) {
    logger.error('Error in getTrendingPairs:', error);
    throw ApiErrorFactory.internal('獲取熱門交易對失敗');
  }
};
```

#### 響應格式
```json
{
  "success": true,
  "message": "取得熱門 50 個交易對成功",
  "data": [
    {
      "rank": 1,
      "symbol": "BTCUSDT",
      "name": "BTC",
      "price": 43250.50,
      "priceChange": 1250.75,
      "priceChangePercent": 2.98,
      "volume": 28543.75,
      "quoteVolume": 1234567890.50,
      "high": 44000.00,
      "low": 42000.00,
      "lastUpdate": "2025-07-05T10:30:00.000Z"
    }
  ],
  "timestamp": "2025-07-05T10:30:00.000Z"
}
```

### 2. 取得交易對清單

**端點**: `GET /api/market/symbols`

**功能**: 取得所有支援的交易對清單

#### 實作詳情
```javascript
const getSymbols = async (req, res) => {
  try {
    const binanceService = getBinanceService();
    const exchangeInfo = await binanceService.getExchangeInfo();
    
    // 過濾活躍的 USDT 交易對
    const symbols = exchangeInfo.symbols
      .filter(symbol => 
        symbol.status === 'TRADING' && 
        symbol.symbol.endsWith('USDT')
      )
      .map(symbol => ({
        symbol: symbol.symbol,
        baseAsset: symbol.baseAsset,
        quoteAsset: symbol.quoteAsset,
        status: symbol.status
      }));
    
    res.status(200).json({
      success: true,
      data: symbols,
      count: symbols.length
    });
  } catch (error) {
    logger.error('Error in getSymbols:', error);
    throw ApiErrorFactory.internal('獲取交易對清單失敗');
  }
};
```

### 3. 取得單一交易對價格

**端點**: `GET /api/market/price/:symbol`

**功能**: 取得指定交易對的即時價格資訊

#### 路徑參數
- `symbol` (string): 交易對符號，例如 "BTCUSDT"

#### 實作詳情
```javascript
const getSymbolPrice = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // 驗證交易對格式
    if (!symbol || !symbol.endsWith('USDT')) {
      throw ApiErrorFactory.badRequest('無效的交易對格式');
    }
    
    const binanceService = getBinanceService();
    const ticker = await binanceService.getTicker(symbol);
    
    if (!ticker) {
      throw ApiErrorFactory.notFound(`交易對 ${symbol} 不存在`);
    }
    
    const priceData = {
      symbol: ticker.symbol,
      price: parseFloat(ticker.price),
      priceChange: parseFloat(ticker.priceChange || 0),
      priceChangePercent: parseFloat(ticker.priceChangePercent || 0),
      lastUpdate: new Date().toISOString()
    };
    
    res.status(200).json({
      success: true,
      data: priceData
    });
  } catch (error) {
    if (error.status) throw error; // 重新拋出 API 錯誤
    logger.error('Error in getSymbolPrice:', error);
    throw ApiErrorFactory.internal('獲取價格失敗');
  }
};
```

### 4. 批量查詢價格

**端點**: `POST /api/market/prices`

**功能**: 批量查詢多個交易對的價格

#### 請求體
```json
{
  "symbols": ["BTCUSDT", "ETHUSDT", "BNBUSDT"]
}
```

#### 實作詳情
```javascript
const getBatchPrices = async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!Array.isArray(symbols) || symbols.length === 0) {
      throw ApiErrorFactory.badRequest('symbols 必須是非空陣列');
    }
    
    if (symbols.length > 100) {
      throw ApiErrorFactory.badRequest('一次最多查詢 100 個交易對');
    }
    
    const binanceService = getBinanceService();
    const prices = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const ticker = await binanceService.getTicker(symbol);
          return {
            symbol: ticker.symbol,
            price: parseFloat(ticker.price),
            success: true
          };
        } catch (error) {
          return {
            symbol: symbol,
            error: error.message,
            success: false
          };
        }
      })
    );
    
    res.status(200).json({
      success: true,
      data: prices
    });
  } catch (error) {
    if (error.status) throw error;
    logger.error('Error in getBatchPrices:', error);
    throw ApiErrorFactory.internal('批量查詢價格失敗');
  }
};
```

### 5. 取得 K線數據

**端點**: `GET /api/market/klines/:symbol`

**功能**: 取得指定交易對的 K線圖表數據

#### 參數
- `symbol` (path): 交易對符號
- `interval` (query): 時間間隔 (1m, 5m, 1h, 1d 等)
- `limit` (query): 數據點數量，預設 100

#### 實作詳情
```javascript
const getKlines = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1d', limit = 100 } = req.query;
    
    // 驗證間隔參數
    const validIntervals = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];
    if (!validIntervals.includes(interval)) {
      throw ApiErrorFactory.badRequest('無效的時間間隔');
    }
    
    const binanceService = getBinanceService();
    const klines = await binanceService.getKlines(symbol, interval, parseInt(limit));
    
    // 格式化 K線數據
    const formattedKlines = klines.map(kline => ({
      openTime: kline[0],
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      closeTime: kline[6],
      quoteVolume: parseFloat(kline[7]),
      trades: kline[8]
    }));
    
    res.status(200).json({
      success: true,
      data: {
        symbol,
        interval,
        klines: formattedKlines
      }
    });
  } catch (error) {
    if (error.status) throw error;
    logger.error('Error in getKlines:', error);
    throw ApiErrorFactory.internal('獲取 K線數據失敗');
  }
};
```

## 🛡️ 錯誤處理

### 錯誤類型
1. **400 Bad Request**: 無效的請求參數
2. **404 Not Found**: 交易對不存在
3. **500 Internal Server Error**: 服務器內部錯誤
4. **503 Service Unavailable**: Binance API 不可用

### 錯誤響應格式
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SYMBOL",
    "message": "無效的交易對格式",
    "details": "交易對必須以 USDT 結尾"
  },
  "timestamp": "2025-07-05T10:30:00.000Z"
}
```

## 🔄 快取策略

### 價格數據快取
- **Redis TTL**: 5 秒
- **Memory Cache**: 1 秒 (高頻查詢)
- **Cache Key**: `price:${symbol}`

### 交易對清單快取
- **Redis TTL**: 1 小時
- **Cache Key**: `symbols:list`

### 24小時統計快取
- **Redis TTL**: 30 秒
- **Cache Key**: `ticker:24hr`

## 📈 效能優化

### 批量處理
```javascript
// 使用 Promise.all 並行處理多個請求
const prices = await Promise.all(
  symbols.map(symbol => binanceService.getTicker(symbol))
);
```

### 數據預處理
```javascript
// 預先計算和格式化數據
const formattedPairs = usdtPairs.map((ticker, index) => ({
  rank: index + 1,
  // 數值轉換一次性完成
  price: parseFloat(ticker.lastPrice),
  priceChangePercent: parseFloat(ticker.priceChangePercent)
}));
```

## 🧪 測試範例

### 單元測試
```javascript
describe('Market Controller', () => {
  test('getTrendingPairs should return formatted data', async () => {
    const req = { query: { limit: '10' } };
    const res = mockResponse();
    
    await getTrendingPairs(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            rank: expect.any(Number),
            symbol: expect.any(String),
            price: expect.any(Number)
          })
        ])
      })
    );
  });
});
```

### 整合測試
```javascript
describe('Market API Integration', () => {
  test('GET /api/market/trending', async () => {
    const response = await request(app)
      .get('/api/market/trending?limit=5')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(5);
  });
});
```

## 📊 監控指標

### 效能指標
- **響應時間**: < 500ms (95th percentile)
- **錯誤率**: < 1%
- **吞吐量**: 1000 requests/minute
- **快取命中率**: > 90%

### 監控端點
```javascript
// 健康檢查
app.get('/api/market/health', (req, res) => {
  res.json({
    status: 'healthy',
    binanceApi: 'connected',
    timestamp: new Date().toISOString()
  });
});
```

---

*本文件涵蓋了 Market Controller 的完整實作細節，包括所有 API 端點、錯誤處理、效能優化和測試策略。*