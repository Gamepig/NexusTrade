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
- 🤖 **AI 趨勢分析** - OpenRouter API 整合 (規劃中)

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

## 📊 專案進度

### ✅ 已完成 (95%)

#### Phase 1: 基礎建設 ✅
- [x] Task 1: 後端基礎架構 ✅
- [x] Task 2: 前端基礎設施 ✅

#### Phase 2: 核心功能 ✅
- [x] Task 3: 使用者認證系統 ✅
- [x] Task 4: 市場數據系統 ✅
- [x] Task 5: 通知系統 ✅ (LINE Messaging API)

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

# OpenRouter AI (可選)
OPENROUTER_API_KEY=your-openrouter-key
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