# NexusTrade

加密貨幣市場分析與智慧通知平台 - MarketPro 的全新架構重寫版本

> 🚀 **專案狀態**: 生產就緒 - 完整功能實現，支援 Docker 部署

## 📋 專案概述

NexusTrade 是對原有 MarketPro 專案的完全重構，從 React 微服務架構轉向 Vanilla JavaScript + Node.js 單體架構，提供更高性能、更易維護的加密貨幣分析平台。

### ✨ 核心功能
- 🔄 **即時市場數據** - Binance WebSocket 即時價格更新
- 👤 **多重認證系統** - Google/LINE OAuth + Email 登入
- 🔔 **智慧通知系統** - 價格警報、LINE Messaging API 通知
- 📊 **TradingView 整合** - 專業級圖表和技術分析
- ⭐ **觀察清單管理** - 個人化資產追蹤 (規劃中)
- 🤖 **AI 趨勢分析** - OpenRouter + LM Studio 雙模式智慧分析

## 🤖 AI 智慧分析系統

### 📊 功能特色
- **技術指標分析**: RSI、MACD、移動平均線、成交量分析
- **市場情緒監控**: 新聞情緒分析，結合價格走勢判斷
- **多時間框架**: 日線、週線、月線趨勢分析
- **智慧信號分類**: 看漲(綠)、看跌(紅)、中性(黃)、持有(藍)

### 🔄 雙模式 AI 架構
1. **OpenRouter 雲端 AI** (主要)
   - 模型: `meta-llama/llama-4-scout:free`
   - 優勢: 高準確度、多樣化分析
   - 需要: 有效的 API 金鑰

2. **LM Studio 本地 AI** (備用)
   - 模型: `qwen2.5-14b-instruct-mlx`
   - 優勢: 無 API 成本、數據隱私
   - 需要: 本地 LM Studio 服務運行

### 📈 數據來源
- **市場數據**: Binance API (10 大主流加密貨幣)
- **新聞數據**: RSS Feed 自動收集和情緒分析
- **技術指標**: AI 模型基於歷史數據計算
- **快取機制**: MongoDB 每日結果快取，避免重複分析

### 🎨 視覺化指標
| 信號類型 | 顏色 | 含義 | 建議動作 |
|---------|------|------|----------|
| 🟢 看漲 | 綠色 | 技術面偏多 | 考慮買入 |
| 🔴 看跌 | 紅色 | 技術面偏空 | 考慮賣出 |
| 🟡 中性 | 黃色 | 方向不明確 | 觀望等待 |
| 🟦 持有 | 藍色 | 穩健保守 | 維持部位 |

### ⚙️ 配置指南
1. **OpenRouter 設定** (推薦)
   ```bash
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   ```

2. **LM Studio 設定** (本地)
   ```bash
   LM_STUDIO_ENABLED=true
   LM_STUDIO_BASE_URL=http://127.0.0.1:1234
   ```
   > 需要先安裝並運行 [LM Studio](https://lmstudio.ai/)

### 🔍 使用方式
- **首頁檢視**: 自動載入當日 AI 分析結果
- **API 查詢**: `GET /api/ai/homepage-analysis`
- **強制更新**: `POST /api/ai/homepage-analysis/refresh`
- **狀態檢查**: `GET /api/ai/status`

## 🏗️ 技術架構

### 技術棧
- **後端**: Node.js 20+, Express, Mongoose 8.15+
- **前端**: HTML5, CSS3, ES2024 Vanilla JavaScript
- **資料庫**: MongoDB 7.0+
- **快取**: Redis 7.2+
- **即時通訊**: WebSocket (ws)
- **圖表**: TradingView Widgets
- **通知**: LINE Messaging API (取代已停用的 LINE Notify)
- **認證**: JWT + Passport.js (Google/LINE OAuth)
- **AI 分析**: OpenRouter (雲端) + LM Studio (本地端)
- **容器化**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **進程管理**: PM2

### 🎯 架構優勢
- ✅ **高性能** - 無框架負擔，響應時間 < 500ms
- ✅ **易維護** - 單體架構，統一技術棧
- ✅ **易部署** - Docker 一鍵部署，PM2 進程管理
- ✅ **可擴展** - 模組化設計，支援水平擴展

## 📁 專案結構

```
NexusTrade/
├── .github/workflows/         # 🔄 CI/CD 工作流程
│   ├── ci.yml                # 持續整合
│   └── cd.yml                # 持續部署
├── docker/                   # 🐳 Docker 配置
│   └── nginx/               # Nginx 反向代理
├── docs/                     # 📚 專案文件
├── scripts/                  # 🛠️ 實用腳本
│   ├── test-system.sh       # 系統測試
│   └── generate-api-docs.js # API 文件生成
├── src/                      # 🖥️ 後端源碼
│   ├── config/              # ⚙️ 設定檔案
│   ├── controllers/         # 🎮 控制器 (認證、市場數據、通知)
│   ├── middleware/          # 🔗 中介軟體 (認證、錯誤處理)
│   ├── models/              # 📄 資料模型 (User, PriceAlert)
│   ├── routes/              # 🛣️ API 路由
│   ├── services/            # 🔧 業務邏輯 (Binance, LINE, WebSocket)
│   └── utils/               # 🛠️ 工具函數 (JWT, Logger, ApiError)
├── public/                   # 🌐 前端資源
│   ├── js/lib/              # 📚 核心庫 (API, DOM, Router, Store)
│   ├── js/components/       # 🧩 UI 組件
│   └── css/                 # 🎨 樣式表
├── tests/                   # 🧪 測試檔案
│   ├── test_*.html         # 功能測試頁面
│   └── test_*.sh           # 測試腳本
├── docker-compose*.yml      # 🐳 容器編排
├── Dockerfile              # 🏗️ 容器建置
└── ecosystem.config.js     # 🚀 PM2 配置
```

## 🚀 快速開始

### 前置需求
- Node.js 20+ LTS
- MongoDB 7.0+ (可選，支援 Mock 模式)
- Docker & Docker Compose (推薦)

### 方式一：Docker 部署 (推薦)

```bash
# 1. 複製專案
git clone https://github.com/Gamepig/NexusTrade.git
cd NexusTrade

# 2. 配置環境變數
cp .env.example .env
# 編輯 .env 填入必要的 API Keys

# 3. 啟動所有服務
docker-compose up -d

# 4. 查看服務狀態
docker-compose ps

# 5. 訪問應用程式
open http://localhost:3000
```

### 方式二：本地開發

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.example .env

# 3. 啟動開發伺服器
npm run dev

# 或使用 PM2 (生產環境)
npm start
```

### 方式三：開發環境 Docker

```bash
# 開發環境 (支援熱重載)
docker-compose -f docker-compose.dev.yml up -d
```

## 🧪 測試與驗證

### 健康檢查
```bash
# API 健康檢查
curl http://localhost:3000/health

# 使用內建腳本
npm run health
```

### 系統測試
```bash
# 執行完整系統測試
npm run test:system

# 使用腳本
./scripts/test-system.sh
```

### 功能測試頁面
- 📊 **市場數據測試**: `http://localhost:3000/tests/test_market_data.html`
- 🔐 **認證系統測試**: `http://localhost:3000/tests/test_auth_system.html`
- 🔔 **通知系統測試**: `http://localhost:3000/tests/test_notifications.html`
- 🌐 **前端模組測試**: `http://localhost:3000/tests/test_frontend_modules.html`

### 程式碼品質
```bash
# ESLint 檢查
npm run lint

# 自動修復
npm run lint:fix

# 程式碼格式化
npm run format
```

## 🏗️ 應用程式架構

### 📱 頁面結構圖

```
NexusTrade SPA 應用程式
├── 🏠 儀表板 (#dashboard)
│   ├── 市場概覽卡片
│   │   ├── BTC/ETH/BNB 即時價格 (WebSocket)
│   │   ├── 24小時漲跌幅顯示
│   │   └── API: GET /api/market/overview
│   ├── 通知狀態卡片
│   │   ├── 通知系統狀態指示器
│   │   ├── 活動警報數量
│   │   └── API: GET /api/notifications/status
│   └── AI 洞察卡片 (未來功能)
│       ├── 市場趨勢預測
│       └── API: GET /api/ai/insights (規劃中)
│
├── 📊 市場 (#market)
│   ├── TradingView Crypto Screener
│   ├── 熱門交易對列表
│   │   ├── 漲幅排行榜
│   │   ├── 成交量排行榜
│   │   └── API: GET /api/market/trending
│   ├── 交易對搜尋功能
│   │   ├── 即時搜尋建議
│   │   └── API: GET /api/market/search?q=
│   └── TradingView Symbol Overview
│       ├── 個股詳細資訊
│       └── API: GET /api/market/price/:symbol
│
├── ⭐ 關注清單 (#watchlist)
│   ├── 個人化資產追蹤 (需登入)
│   ├── 關注資產列表
│   │   ├── 即時價格更新 (WebSocket)
│   │   ├── 自訂價格警報
│   │   └── API: GET /api/watchlist (需認證)
│   ├── TradingView Mini Charts
│   └── 快速操作按鈕
│       ├── 加入/移除關注
│       └── API: POST/DELETE /api/watchlist (需認證)
│
├── 🔔 通知設定 (#notifications)
│   ├── 價格警報管理 (需登入)
│   │   ├── 警報條件設定
│   │   ├── 通知方式選擇
│   │   └── API: POST /api/notifications/alerts (需認證)
│   ├── LINE 通知整合
│   │   ├── LINE Messaging API 連結
│   │   ├── OAuth 授權流程
│   │   └── API: GET /api/notifications/line-notify/auth-url
│   ├── 通知歷史記錄
│   │   ├── 已發送通知列表
│   │   └── API: GET /api/notifications/history (需認證)
│   └── 測試通知功能
│       └── API: POST /api/notifications/test
│
└── 🤖 AI 分析 (#ai-insights) [未來功能]
    ├── OpenRouter API 整合
    ├── 市場趨勢分析
    ├── 技術指標預測
    └── API: POST /api/ai/analyze (規劃中)
```

### 🔐 認證系統整合

```
認證流程
├── 📧 Email 註冊/登入
│   ├── 密碼加密 (BCrypt)
│   ├── JWT Token 生成
│   └── API: POST /api/auth/login|register
│
├── 🔗 Google OAuth 2.0
│   ├── Passport.js Google Strategy
│   ├── 自動帳戶連結
│   └── API: GET /api/oauth/google
│
├── 📱 LINE Login OAuth
│   ├── LINE Login API 整合
│   ├── 使用者資料同步
│   └── API: GET /api/oauth/line
│
└── 🔄 Token 管理
    ├── Access Token (1小時)
    ├── Refresh Token (7天)
    └── API: POST /api/auth/refresh
```

### 🌐 即時數據架構

```
WebSocket 數據流
├── 📡 Binance WebSocket 連接
│   ├── wss://stream.binance.com:9443/ws
│   ├── 多交易對即時訂閱
│   └── 自動重連機制
│
├── 🔄 後端數據處理
│   ├── 數據解析和格式化
│   ├── 價格快取機制 (5秒有效期)
│   └── WebSocket 轉發到前端
│
└── 🖥️ 前端即時更新
    ├── 價格數據即時顯示
    ├── 圖表動態更新
    └── 通知觸發檢查
```

### 🎨 TradingView 整合規劃

```
TradingView 工具配置
├── 🏠 儀表板頁面
│   └── Market Overview Widget
│       ├── 主要加密貨幣概覽
│       ├── 市場總覽指標
│       └── 響應式網格佈局
│
├── 📊 市場頁面
│   ├── Crypto Screener Widget
│   │   ├── 交易對篩選器
│   │   ├── 自訂排序功能
│   │   └── 即時數據更新
│   └── Symbol Overview Widget
│       ├── 個股詳細資訊
│       ├── 技術指標顯示
│       └── 動態幣種切換
│
├── ⭐ 關注清單頁面
│   └── Mini Chart Widget
│       ├── 小型價格圖表
│       ├── 多時間週期
│       └── 關注資產專用
│
└── 📈 圖表頁面 (新增)
    └── Advanced Chart Widget
        ├── 完整技術分析工具
        ├── 自訂指標設定
        ├── 多時間框架
        └── 路由: #chart/:symbol
```

## 📊 專案進度

### ✅ 已完成 (98%)

#### Phase 1: 基礎建設 ✅
- [x] Task 1: 後端基礎架構 ✅
- [x] Task 2: 前端基礎設施 ✅

#### Phase 2: 核心功能 ✅
- [x] Task 3: 使用者認證系統 ✅
- [x] Task 4: 市場數據系統 ✅
- [x] Task 5: 通知系統 ✅ (LINE Messaging API)
- [x] Task 6: AI 智慧分析系統 ✅ (OpenRouter + LM Studio)

#### Phase 4: 部署與測試 ✅
- [x] Task 9: 容器化與部署 ✅
- [x] Docker 多階段建置 ✅
- [x] GitHub Actions CI/CD ✅
- [x] 系統整合測試 ✅

### 🔄 進行中

#### Phase 5: 文件與交付 (90%)
- [x] API 文件生成 ✅
- [x] 部署指南 ✅
- [ ] 使用者手冊 (規劃中)

### 📋 未來規劃

#### 增強功能
- [ ] **觀察清單系統** - 個人化資產管理
- [ ] **AI 分析系統** - OpenRouter API 整合
- [ ] **新聞聚合** - 多來源新聞整合
- [ ] **高級圖表** - 自訂技術指標

## 🔧 可用腳本

```bash
# 開發
npm run dev          # 開發模式 (nodemon)
npm start           # 生產模式

# 測試
npm run health      # 健康檢查
npm run test:system # 系統測試

# 程式碼品質
npm run lint        # ESLint 檢查
npm run lint:fix    # 自動修復
npm run format      # Prettier 格式化

# Docker
npm run docker:build      # 建置映像
npm run docker:run        # 運行容器
npm run docker:compose    # Docker Compose 啟動
npm run docker:compose:dev # 開發環境

# 文件
npm run docs:generate # 生成 API 文件
```

## 🌐 API 端點

### 核心 API
- `GET /health` - 系統健康檢查
- `GET /api/notifications/status` - 通知系統狀態
- `POST /api/notifications/test` - 測試通知發送
- `POST /api/notifications/alerts` - 建立價格警報

### 認證 API
- `POST /api/auth/login` - 使用者登入
- `POST /api/auth/register` - 使用者註冊
- `GET /api/oauth/google` - Google OAuth
- `GET /api/oauth/line` - LINE OAuth

### 市場數據 API
- `GET /api/market/symbols` - 交易對列表
- `GET /api/market/ticker` - 即時價格數據

### AI 分析 API
- `GET /api/ai/status` - AI 服務狀態檢查
- `GET /api/ai/homepage-analysis` - 首頁大趨勢分析
- `POST /api/ai/homepage-analysis/refresh` - 強制重新分析

### WebSocket
- `ws://localhost:3000/ws` - 即時數據推送

## 🔧 設定說明

### 環境變數

詳細設定請參考 `.env.example`:

```env
# 基本設定
NODE_ENV=development
PORT=3000

# 資料庫
MONGODB_URI=mongodb://localhost:27017/nexustrade
SKIP_MONGODB=false  # true 為 Mock 模式

# JWT 認證
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret

# OAuth 認證
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
LINE_CLIENT_ID=your-line-client-id
LINE_CLIENT_SECRET=your-line-secret

# LINE Messaging API (取代 LINE Notify)
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=your-token
LINE_MESSAGING_CHANNEL_SECRET=your-secret

# Binance API
BINANCE_API_KEY=your-binance-key
BINANCE_API_SECRET=your-binance-secret

# AI 分析服務
OPENROUTER_API_KEY=your-openrouter-key  # OpenRouter 雲端 AI
LM_STUDIO_ENABLED=true                   # 啟用本地 LM Studio
LM_STUDIO_BASE_URL=http://127.0.0.1:1234  # LM Studio 服務地址
```

## 🐳 Docker 部署

### 生產環境
```bash
# 啟動生產服務 (包含 Nginx)
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d

# 檢查服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f nexustrade-app
```

### Staging 環境
```bash
# 啟動測試環境
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d
```

## 📚 技術文件

- 📋 [開發規劃書](./docs/NexusTrade_Development_Plan.md)
- 📝 [詳細任務分解](./docs/Task_Breakdown_Detailed.md)
- 🔧 [API 資訊](./api_info.json) - 自動生成
- 📦 [依賴資訊](./dependency_info.json) - 自動生成

## 🤝 貢獻指南

### 開發流程
1. Fork 專案
2. 建立功能分支: `git checkout -b feature/amazing-feature`
3. 提交變更: `git commit -m 'feat: add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 建立 Pull Request

### 提交規範
- `feat:` 新功能
- `fix:` 修復錯誤
- `docs:` 文件更新
- `style:` 程式碼風格
- `refactor:` 重構
- `test:` 測試相關

## 📄 授權

本專案採用 ISC 授權條款

---

**維護團隊**: NexusTrade Team  
**最後更新**: 2025-06-17  
**版本**: 1.0.0 (生產就緒)

[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-ISC-yellow)](./LICENSE)

## 功能特點 (Features)

### 🔍 關注清單 (Watchlist)

#### 主要功能
- 支持最多 30 個交易對的關注清單
- 即時追蹤加密貨幣交易對
- 靈活的優先級和分類管理

#### API 端點
- `GET /api/watchlist` - 取得關注清單（支援分頁）
- `POST /api/watchlist` - 新增關注項目
- `DELETE /api/watchlist/:symbol` - 移除關注項目
- `GET /api/watchlist/status/:symbol` - 檢查關注狀態
- `PUT /api/watchlist/:symbol` - 更新關注項目
- `GET /api/watchlist/stats` - 取得統計資訊

#### 使用範例

```javascript
// 新增關注清單項目
await axios.post('/api/watchlist', {
  symbol: 'BTCUSDT',
  priority: 1,
  category: 'Top Cryptocurrencies'
});

// 取得關注清單
const watchlist = await axios.get('/api/watchlist');

// 移除關注清單項目
await axios.delete('/api/watchlist/BTCUSDT');
```

#### 限制與驗證
- 每個用戶限制 30 個關注清單項目
- 支持的交易對格式：USDT, BTC, ETH, BNB, BUSD, FDUSD
- 即時價格資料整合
- 完善的錯誤處理