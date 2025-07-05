# 使用 Node.js 結合 OpenRouter 與 Binance API 建立虛擬貨幣技術分析 AI 系統

## 🧠 教學目標
建構一套完整的後端系統，具備以下能力：

- 使用 Node.js 取得幣安 K 線資料
- 串接 OpenRouter 上的 AI 模型（`deepseek/deepseek-r1-0528:free`）
- 分析技術指標：RSI、MACD、KDJ、MA 等
- 使用 AI 回傳清楚的分析與建議
- 自動產生技術分析圖表（輸出為圖片）
- 將圖表與分析資料提供給前端、Line、Discord 等使用

## 📦 技術堆疊

| 技術 | 功能 |
|------|------|
| Node.js + Express | API Server |
| Axios | 呼叫 OpenRouter / Binance API |
| OpenRouter | AI 模型服務 |
| technicalindicators | RSI / MACD 指標計算 |
| chartjs-node-canvas | 產生指標圖表 |
| dotenv | 管理 API 金鑰 |
| Line Notify / Discord.js（可選） | 通知推播 |

## 📁 專案結構

```
crypto-ai-ta/
├── .env
├── app.js
├── routes/
│   └── analyze.js
├── services/
│   ├── binance.js
│   ├── chart.js
│   └── openrouter.js
└── charts/ (產出圖表存放區)
```

## 🔧 專案初始化

```bash
mkdir crypto-ai-ta && cd crypto-ai-ta
npm init -y
npm install express axios dotenv technicalindicators chartjs-node-canvas
```

## 📄 .env

```env
OPENROUTER_API_KEY=sk-xxxxxxxxxx
```

## 📄 app.js

```js
const express = require('express');
const path = require('path');
const analyzeRoute = require('./routes/analyze');
require('dotenv').config();

const app = express();
app.use(express.json());

app.use('/charts', express.static(path.join(__dirname, 'charts')));
app.use('/analyze', analyzeRoute);

const PORT = 3000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
```

## 📄 routes/analyze.js

```js
const express = require('express');
const router = express.Router();
const { getCandlestickData } = require('../services/binance');
const { analyzeWithOpenRouter } = require('../services/openrouter');
const { generateIndicatorChart } = require('../services/chart');

router.post('/', async (req, res) => {
  const { symbol = 'BTCUSDT', interval = '1h', limit = 100 } = req.body;

  try {
    const candles = await getCandlestickData(symbol, interval, limit);
    const chartPath = await generateIndicatorChart(candles, symbol);

    const prompt = `
你是虛擬貨幣技術分析專家。
以下是幣種 ${symbol} 的 K 線資料（[時間, 開盤, 高, 低, 收盤, 成交量]）：
${candles.map(c => `[${c.join(', ')}]`).join('\n')}

請根據 RSI、MACD、KDJ、趨勢線進行判斷：
1. 目前趨勢（多頭/空頭/盤整）
2. 是否出現轉折或背離訊號
3. 明確建議操作策略
`;

    const analysis = await analyzeWithOpenRouter(prompt);
    res.json({ analysis, chart: chartPath.replace(__dirname + '/../', '') });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '分析失敗' });
  }
});

module.exports = router;
```

## 📄 services/binance.js

```js
const axios = require('axios');

async function getCandlestickData(symbol = 'BTCUSDT', interval = '1h', limit = 100) {
  const url = \`https://api.binance.com/api/v3/klines?symbol=\${symbol}&interval=\${interval}&limit=\${limit}\`;
  const response = await axios.get(url);
  return response.data.map(([time, open, high, low, close, volume]) => [
    new Date(time).toISOString(), open, high, low, close, volume
  ]);
}

module.exports = { getCandlestickData };
```

## 📄 services/openrouter.js

```js
const axios = require('axios');

async function analyzeWithOpenRouter(prompt) {
  const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: 'deepseek/deepseek-r1-0528:free',
    messages: [{ role: 'user', content: prompt }],
  }, {
    headers: {
      'Authorization': \`Bearer \${process.env.OPENROUTER_API_KEY}\`,
      'Content-Type': 'application/json',
    }
  });

  return response.data.choices[0].message.content;
}

module.exports = { analyzeWithOpenRouter };
```

## 📄 services/chart.js

```js
const { RSI, MACD } = require('technicalindicators');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const path = require('path');

const width = 800;
const height = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

async function generateIndicatorChart(candles, symbol) {
  const closePrices = candles.map(c => parseFloat(c[4]));

  const rsi = RSI.calculate({ period: 14, values: closePrices });
  const macd = MACD.calculate({
    values: closePrices,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const labels = candles.slice(-rsi.length).map(c => new Date(c[0]).toLocaleTimeString());

  const imageBuffer = await chartJSNodeCanvas.renderToBuffer({
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'RSI', data: rsi, borderColor: 'blue', yAxisID: 'y' },
        { label: 'MACD', data: macd.map(m => m.MACD), borderColor: 'green', yAxisID: 'y1' },
        { label: 'Signal', data: macd.map(m => m.signal), borderColor: 'red', yAxisID: 'y1' },
      ]
    },
    options: {
      scales: {
        y: { type: 'linear', position: 'left', min: 0, max: 100 },
        y1: { type: 'linear', position: 'right' }
      },
      plugins: {
        title: { display: true, text: \`\${symbol} 技術分析圖表\` },
        legend: { position: 'bottom' },
      }
    }
  });

  const filePath = path.resolve(\`./charts/\${symbol}-\${Date.now()}.png\`);
  fs.mkdirSync('./charts', { recursive: true });
  fs.writeFileSync(filePath, imageBuffer);
  return filePath;
}

module.exports = { generateIndicatorChart };
```

## 🧪 測試範例

```bash
curl -X POST http://localhost:3000/analyze \
-H "Content-Type: application/json" \
-d '{"symbol":"ETHUSDT","interval":"1h","limit":50}'
```

## 🎯 回傳結果範例

```json
{
  "analysis": "1. 目前呈現短線多頭趨勢...\n2. RSI 達超買區...\n3. 建議觀望或設置止盈點...",
  "chart": "charts/ETHUSDT-1720000000000.png"
}
```

## 🧠 AI Prompt 設計重點（給 deepseek-r1）

```text
你是虛擬貨幣交易專家，擅長使用技術分析指標（RSI、MACD、KDJ、均線）進行趨勢研判與操作建議。

以下是幣種 ${symbol} 的 K 線數據：
[時間, 開盤價, 最高價, 最低價, 收盤價, 成交量]
${formattedKlines}

請依據資料，完成以下分析：
1. 判斷趨勢與原因（多頭/空頭/盤整）
2. 指標轉折訊號
3. 明確交易建議（觀望/進場/止損）
```

## 🔧 可擴充功能建議

| 功能 | 說明 |
|------|------|
| Line Notify 推播 | 傳送圖表 + AI 分析結果 |
| Discord Bot | 整合 Discord Webhook 傳送訊息 |
| 分析歷史記錄儲存 | 可用 MongoDB / JSON 檔存放分析歷程 |
| 多幣種分析 | 支援一次分析 BTC/ETH/SOL 等多幣種 |
| 前端介面 | 使用 Next.js 建構圖表與分析前台 |