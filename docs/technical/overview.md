# NexusTrade 技術架構總覽

## 📋 專案架構概述

NexusTrade 是一個現代化的全端加密貨幣交易分析平台，採用 Node.js + Vanilla JavaScript 技術棧，提供即時市場數據、智慧價格警報、AI 分析和 LINE 通知整合。

## 🏗️ 技術棧

### 後端技術
- **運行環境**: Node.js 20+ LTS
- **Web 框架**: Express.js 4.18+
- **資料庫**: MongoDB 7.0+ with Mongoose ODM
- **即時通訊**: WebSocket (ws library)
- **認證系統**: JWT + OAuth 2.0 (Google, LINE)
- **API 整合**: Binance API, LINE Messaging API, OpenRouter AI

### 前端技術  
- **核心語言**: Vanilla JavaScript ES2024
- **UI 框架**: 自建組件系統
- **圖表整合**: TradingView Widgets
- **狀態管理**: 自建 Store 系統
- **路由系統**: Hash-based SPA Router

### 基礎設施
- **容器化**: Docker + Docker Compose
- **進程管理**: PM2 Cluster Mode
- **反向代理**: Nginx (生產環境)
- **監控**: 自建健康檢查系統

## 📁 專案結構

```
NexusTrade/
├── src/                    # 🖥️ 後端源碼
│   ├── config/            # ⚙️ 配置文件
│   │   └── database.js    # MongoDB 連接配置
│   ├── controllers/       # 🎮 API 控制器
│   │   ├── auth.controller.mock.js     # 認證控制器
│   │   ├── market.controller.js        # 市場數據控制器
│   │   ├── oauth.controller.js         # OAuth 控制器
│   │   ├── price-alert.controller.js   # 價格警報控制器
│   │   └── watchlist.controller.js     # 觀察清單控制器
│   ├── middleware/        # 🔗 中介軟體
│   │   ├── auth.middleware.js          # 認證中介軟體
│   │   ├── membership.middleware.js    # 會員權限中介軟體
│   │   └── validation.middleware.js    # 輸入驗證中介軟體
│   ├── models/           # 📄 資料模型
│   │   ├── User.model.js              # 使用者模型
│   │   ├── PriceAlert.js              # 價格警報模型
│   │   └── Watchlist.js               # 觀察清單模型
│   ├── routes/           # 🛣️ API 路由
│   │   ├── auth.js                    # 認證路由
│   │   ├── market.js                  # 市場數據路由
│   │   ├── notifications.js           # 通知路由
│   │   └── watchlist.js               # 觀察清單路由
│   ├── services/         # 🔧 業務邏輯服務
│   │   ├── binance.service.js         # Binance API 服務
│   │   ├── line-messaging.service.js  # LINE 通知服務
│   │   ├── websocket.service.js       # WebSocket 服務
│   │   └── ai-analysis.service.js     # AI 分析服務
│   └── server.js         # 🚀 應用程式入口點
├── public/               # 🌐 前端靜態資源
│   ├── js/              # 📜 JavaScript 代碼
│   │   ├── components/  # 🧩 UI 組件
│   │   │   ├── PriceAlertModal.js     # 價格警報模態框
│   │   │   ├── WatchlistPage.js       # 觀察清單頁面
│   │   │   ├── CurrencyDetailPage.js  # 貨幣詳情頁面
│   │   │   └── TradingView.js         # TradingView 整合
│   │   ├── lib/         # 📚 核心函式庫
│   │   │   ├── api.js                 # API 客戶端
│   │   │   ├── router.js              # 路由系統
│   │   │   └── dom.js                 # DOM 操作工具
│   │   └── nexus-app-fixed.js         # 主應用程式
│   ├── css/             # 🎨 樣式表
│   │   └── main.css     # 主樣式文件
│   └── index.html       # 📄 應用程式入口頁面
├── docs/                # 📚 技術文件
└── docker-compose.yml   # 🐳 容器編排配置
```

## 🌊 數據流架構

### 即時數據流
```
Binance WebSocket → WebSocket Service → Client WebSocket → UI 更新
```

### API 請求流
```
Client → Express Router → Middleware → Controller → Service → Database/External API
```

### 認證流程
```
Client → OAuth Provider → Callback → JWT Generation → Client Storage
```

## 🔧 核心設計原則

### 1. 模組化設計
- **分層架構**: 控制器、服務、模型清晰分離
- **組件化前端**: 可重用的 UI 組件
- **服務導向**: 獨立的業務邏輯服務

### 2. 事件驅動
- **WebSocket 即時更新**: 市場數據即時推送
- **事件發射器**: 系統內部事件通訊
- **非阻塞 I/O**: 高併發請求處理

### 3. 可擴展性
- **水平擴展**: PM2 Cluster 模式
- **容器化**: Docker 微服務架構
- **模組化**: 新功能易於集成

### 4. 安全性優先
- **認證授權**: JWT + OAuth 2.0
- **輸入驗證**: Mongoose Schema + 自定義驗證
- **API 安全**: Rate Limiting + CORS + Helmet

## 📊 效能特色

### 後端效能
- **響應時間**: < 500ms (API 端點)
- **併發處理**: 1000+ WebSocket 連線
- **記憶體效率**: < 512MB (單一實例)
- **CPU 使用**: < 50% (正常負載)

### 前端效能
- **首次載入**: < 2s (主要內容)
- **路由切換**: < 100ms (SPA 導航)
- **數據更新**: < 100ms (WebSocket 延遲)
- **TradingView**: 按需載入避免阻塞

## 🔒 安全特性

### 認證與授權
- **JWT Token**: 無狀態認證
- **OAuth 2.0**: 第三方登入安全
- **會員制度**: 基於角色的權限控制
- **Session 管理**: 自動過期與刷新

### 資料保護
- **密碼雜湊**: bcrypt with salt rounds
- **敏感資料**: 環境變數存儲
- **API 金鑰**: 加密存儲
- **HTTPS**: 強制安全傳輸

## 🎯 核心功能模組

### 1. 市場數據系統
- **即時價格**: Binance WebSocket 串流
- **歷史數據**: K線圖表支援
- **多交易對**: 50+ 主流加密貨幣
- **數據快取**: Redis 快取層

### 2. 認證系統
- **多重登入**: Email + Google + LINE
- **權限控制**: 基於會員等級
- **Session 管理**: JWT Token 機制
- **帳戶連結**: 統一使用者身份

### 3. 通知系統
- **價格警報**: 22 種警報類型
- **技術指標**: 18 種技術指標監控
- **LINE 整合**: 即時推送通知
- **會員限制**: 基於等級的配額控制

### 4. 觀察清單
- **個人化**: 每用戶最多 30 個
- **即時更新**: WebSocket 價格推送
- **分類管理**: 優先級與類別
- **統計分析**: 投資組合洞察

### 5. AI 分析
- **OpenRouter**: 雲端 AI 分析
- **技術指標**: 自動計算與解讀
- **市場情緒**: 新聞情緒分析
- **趨勢預測**: 多時間框架分析

## 📈 監控與維護

### 健康檢查
- **系統狀態**: `/health` 端點
- **資料庫連接**: MongoDB 連線狀態
- **外部 API**: 第三方服務可用性
- **WebSocket**: 連線健康度監控

### 日誌系統
- **PM2 日誌**: 分離的錯誤與輸出日誌
- **錯誤追蹤**: 結構化錯誤記錄
- **效能監控**: 請求響應時間記錄
- **安全審計**: 認證失敗記錄

## 🚀 部署策略

### Docker 部署
- **多階段建置**: 優化映像大小
- **環境隔離**: 開發、測試、生產環境
- **容器編排**: Docker Compose 管理
- **持久化**: 數據卷掛載

### PM2 管理
- **Cluster 模式**: 多核心利用
- **自動重啟**: 錯誤恢復機制
- **零停機部署**: 滾動更新
- **監控整合**: 實時效能監控

## 📚 文件結構

本技術文件分為以下主要部分：

- **[後端架構](./backend/)** - 詳細的後端設計與實作
- **[前端架構](./frontend/)** - 前端組件與架構說明
- **[API 參考](./api/)** - 完整的 API 端點文件
- **[資料庫設計](./database/)** - 資料模型與關係設計
- **[安全指南](./security/)** - 安全實作與最佳實務
- **[部署指南](./deployment/)** - 部署與維護指南

---

*本文件將隨著專案發展持續更新，確保技術架構文件的準確性與完整性。*