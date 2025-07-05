# NexusTrade

🚀 **全棧加密貨幣交易分析平台** - 專業級市場數據、智慧通知、AI 分析

[![Deploy Status](https://img.shields.io/badge/Deploy-Ready-brightgreen)](https://github.com/Gamepig/NexusTrade)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-ISC-yellow)](./LICENSE)

## 📋 專案概述

NexusTrade 是一個現代化的加密貨幣交易分析平台，提供即時市場數據、智慧價格警報、AI 趨勢分析和 LINE 通知整合。採用 Vanilla JavaScript + Node.js 架構，追求高性能和易維護性。

### ✨ 核心功能

🔄 **即時市場數據**
- Binance WebSocket 即時價格追蹤
- 支援 50+ 主流交易對
- TradingView 專業圖表整合

👤 **多重認證系統**
- Google OAuth 2.0 / LINE Login
- JWT Token 安全管理
- 會員等級制度

🔔 **智慧通知系統**
- 22 種價格警報類型
- 18 種技術指標警報 (RSI、MACD、布林通道等)
- LINE Messaging API 即時推送

⭐ **觀察清單管理**
- 個人化資產追蹤 (最多 30 個)
- 即時價格更新
- 分類和優先級管理

🤖 **AI 趨勢分析**
- OpenRouter API 雲端分析
- 技術指標智慧解讀
- 市場趨勢預測

## 🏗️ 技術架構

### 核心技術棧
```
後端        Node.js 20+, Express, MongoDB
前端        HTML5, CSS3, Vanilla JavaScript ES2024
即時通訊    WebSocket (Binance API)
圖表        TradingView Widgets
認證        JWT + Google/LINE OAuth 2.0
通知        LINE Messaging API
容器化      Docker + Docker Compose
進程管理    PM2
```

### 架構設計
- **前後端分離**: RESTful API + SPA 架構
- **事件驅動**: WebSocket 即時數據推送
- **微服務化**: 模組化業務邏輯分離
- **容器化部署**: Docker 一鍵部署
- **生產就緒**: PM2 進程管理 + Nginx 反向代理

## 📁 專案結構

```
NexusTrade/
├── src/                    # 🖥️ 後端源碼
│   ├── controllers/        # 🎮 API 控制器
│   ├── middleware/         # 🔗 中介軟體 (認證、權限)
│   ├── models/            # 📄 MongoDB 資料模型
│   ├── routes/            # 🛣️ API 路由定義
│   ├── services/          # 🔧 業務邏輯服務
│   └── config/            # ⚙️ 配置文件
├── public/                # 🌐 前端資源
│   ├── js/components/     # 🧩 UI 組件
│   ├── js/lib/           # 📚 核心函式庫
│   └── css/              # 🎨 樣式表
├── docs/                  # 📚 技術文件
├── docker-compose.yml     # 🐳 容器編排
└── ecosystem.config.js    # 🚀 PM2 配置
```

## 🚀 快速開始

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

# 4. 訪問應用程式
open http://localhost:3000
```

### 方式二：本地開發

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.example .env

# 3. 啟動 MongoDB (可選，支援 Mock 模式)
docker run -d -p 27017:27017 --name mongodb mongo:7.0

# 4. 啟動開發伺服器
npm run dev

# 或使用 PM2 (生產環境)
npm start
```

## 🔧 環境配置

### 必要環境變數

```env
# 基本設定
NODE_ENV=production
PORT=3000

# 資料庫 (可選，支援 Mock 模式)
MONGODB_URI=mongodb://localhost:27017/nexustrade
SKIP_MONGODB=false

# JWT 認證
JWT_SECRET=your-super-secret-jwt-key

# OAuth 認證
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
LINE_CHANNEL_ID=your-line-channel-id
LINE_CHANNEL_SECRET=your-line-channel-secret

# LINE Messaging API
LINE_ACCESS_TOKEN=your-line-access-token

# AI 分析 (可選)
OPENROUTER_API_KEY=your-openrouter-api-key
```

### Mock 模式運行

如果沒有 MongoDB，可以使用 Mock 模式：

```bash
# 設定環境變數
export SKIP_MONGODB=true

# 啟動應用
npm start
```

## 🎯 功能特色

### 🔔 價格警報系統

#### 基礎警報類型 (免費會員)
- **價格警報**: 高於/低於目標價
- **百分比變化**: 漲跌幅達到設定值
- **成交量異常**: 成交量突增警報

#### 技術指標警報 (付費會員)
- **RSI 指標** (4種): 超買、超賣、自定義閾值
- **MACD 指標** (4種): 金叉、死叉、零軸穿越
- **移動平均線** (6種): 均線交叉、黃金交叉、死亡交叉  
- **布林通道** (4種): 觸及上下軌、通道收縮/擴張

#### 會員制度
- **免費會員**: 1 個基礎警報
- **付費會員**: 50 個警報 + 全部技術指標
- **企業會員**: 無限制 + 優先支援

### ⭐ 觀察清單功能

```javascript
// API 使用範例
// 新增到觀察清單
POST /api/watchlist
{
  "symbol": "BTCUSDT",
  "priority": 1,
  "category": "主流幣"
}

// 取得觀察清單
GET /api/watchlist?page=1&limit=10

// 檢查關注狀態
GET /api/watchlist/status/BTCUSDT
```

### 🤖 AI 分析系統

#### 技術指標分析
- RSI、MACD、移動平均線自動計算
- 布林通道、Williams %R 分析
- 多時間框架趨勢判斷

#### 市場情緒分析
- 新聞情緒監控
- 社群媒體情緒分析
- 價格走勢與情緒關聯

#### 智慧信號分類
| 信號 | 顏色 | 含義 | 建議 |
|------|------|------|------|
| 🟢 看漲 | 綠色 | 技術面偏多 | 考慮買入 |
| 🔴 看跌 | 紅色 | 技術面偏空 | 考慮賣出 |
| 🟡 中性 | 黃色 | 方向不明 | 觀望等待 |
| 🔵 持有 | 藍色 | 穩健保守 | 維持部位 |

## 🌐 API 文件

### 認證相關
- `POST /api/auth/login` - 使用者登入
- `POST /api/auth/register` - 使用者註冊
- `GET /auth/google` - Google OAuth 登入
- `GET /auth/line` - LINE OAuth 登入

### 市場數據
- `GET /api/market/symbols` - 支援的交易對列表
- `GET /api/market/price/:symbol` - 單一交易對價格
- `GET /api/market/prices` - 批量價格查詢
- `WS /ws` - WebSocket 即時數據

### 觀察清單
- `GET /api/watchlist` - 取得觀察清單
- `POST /api/watchlist` - 新增關注項目
- `DELETE /api/watchlist/:symbol` - 移除關注
- `GET /api/watchlist/status/:symbol` - 檢查關注狀態

### 價格警報
- `GET /api/notifications/alerts` - 取得警報列表
- `POST /api/notifications/alerts` - 建立新警報
- `DELETE /api/notifications/alerts/:id` - 刪除警報
- `GET /api/notifications/status` - 通知系統狀態

### AI 分析
- `GET /api/ai/status` - AI 服務狀態
- `GET /api/ai/homepage-analysis` - 首頁趨勢分析
- `POST /api/ai/homepage-analysis/refresh` - 強制更新分析

## 🧪 測試與品質

### 程式碼品質
```bash
# ESLint 檢查
npm run lint

# 自動修復格式
npm run lint:fix

# 程式碼格式化
npm run format
```

### 系統測試
```bash
# 健康檢查
npm run health

# 完整系統測試
npm run test:system
```

## 🐳 生產部署

### Docker 部署
```bash
# 生產環境 (包含 Nginx)
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d

# 測試環境
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# 查看狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

### PM2 部署
```bash
# 啟動應用
pm2 start ecosystem.config.js

# 查看狀態
pm2 status

# 重新啟動
pm2 restart nexustrade-api
```

## 📊 效能指標

### 系統效能
- **響應時間**: < 500ms
- **並發連線**: 1000+ WebSocket 連線
- **記憶體使用**: < 512MB
- **CPU 使用率**: < 50%

### 監控指標
- **正常運行時間**: 99.9%+
- **API 可用性**: 99.9%+
- **通知送達率**: 99%+
- **數據更新延遲**: < 100ms

## 🔒 安全性

### 認證與授權
- JWT Token 雙層驗證
- OAuth 2.0 第三方登入
- API Rate Limiting
- 輸入驗證與過濾

### 資料保護
- 敏感資料加密存儲
- API 金鑰環境變數管理
- HTTPS 強制使用
- CORS 跨域保護

## 📚 技術文件

詳細技術文件請參考 `/docs/technical/` 目錄：

- [後端架構設計](./docs/technical/backend/)
- [前端架構設計](./docs/technical/frontend/)
- [API 參考手冊](./docs/technical/api/)
- [資料庫設計](./docs/technical/database/)
- [部署指南](./docs/technical/deployment/)

## 🤝 貢獻指南

### 開發流程
1. Fork 專案
2. 建立功能分支: `git checkout -b feature/amazing-feature`
3. 遵循 ESLint 規範撰寫程式碼
4. 撰寫測試並確保通過
5. 提交變更: `git commit -m 'feat: add amazing feature'`
6. 推送到分支: `git push origin feature/amazing-feature`
7. 建立 Pull Request

### 提交規範 (Conventional Commits)
- `feat:` 新功能
- `fix:` 修復錯誤
- `docs:` 文件更新
- `style:` 程式碼格式
- `refactor:` 程式碼重構
- `test:` 測試相關
- `chore:` 維護工作

## 📄 授權條款

本專案採用 ISC 授權條款 - 詳見 [LICENSE](./LICENSE) 文件

---

**開發團隊**: NexusTrade Development Team  
**最後更新**: 2025-07-05  
**版本**: 2.0.0 (生產就緒)  
**支援**: 提供完整的技術支援和文件