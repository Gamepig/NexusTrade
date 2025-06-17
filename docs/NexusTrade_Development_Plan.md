# NexusTrade 專案開發規劃書

## 📋 專案概述

**NexusTrade** 是 MarketPro 的完全重寫版本，目標是從 React 微服務架構轉換為 Node.js + Vanilla JavaScript 的現代化單體架構，提供加密貨幣市場分析與通知功能。

### 專案背景
- **原始專案**: MarketPro (React + 微服務架構)
- **重寫目標**: 簡化架構、提升性能、降低維護複雜度
- **技術轉換**: React → Vanilla JS，微服務 → 單體服務

## 🎯 專案目標

### 主要目標
1. **架構簡化**: 從複雜的微服務架構轉為單體架構
2. **技術現代化**: 使用最新的 ES2024 JavaScript 功能
3. **性能優化**: 去除框架負擔，提升載入和響應速度
4. **維護性提升**: 統一技術棧，降低學習和維護成本
5. **部署簡化**: Docker 化，CI/CD 自動化

### 功能目標
保持 MarketPro 的所有核心功能：
- ✅ 即時市場數據與圖表顯示
- ✅ 新聞資訊聚合與展示  
- ✅ 多重使用者認證 (Google/LINE/Email)
- ✅ 個人化觀察清單管理
- ✅ 智慧通知系統 (價格/時間觸發)
- ✅ AI 趨勢分析整合
- ✅ 技術指標計算與顯示

## 🏗️ 技術架構決策

### 前端技術選型：Vanilla JavaScript

#### 選擇理由
1. **符合專案願景**: 完全移除 React 依賴
2. **性能優勢**: 無框架負擔，快速響應
3. **控制力**: 完全掌控 DOM 操作和事件處理
4. **學習成本**: 基於標準 Web 技術，無額外學習負擔
5. **部署簡單**: 純靜態資源，配合 Node.js 後端

#### 技術棧
- **HTML5**: 語意化標籤，現代化結構
- **CSS3**: 響應式設計，動畫效果
- **ES2024**: 最新 JavaScript 功能
- **Web APIs**: Fetch API, WebSocket API, Local Storage

### 後端技術選型：Node.js + Express

#### 選擇理由
1. **統一語言**: JavaScript 全棧開發
2. **豐富生態**: NPM 套件庫支援
3. **高效能**: 非阻塞 I/O，適合即時應用
4. **易整合**: 與各種第三方 API 良好整合

#### 技術棧
- **Node.js 18+**: 最新 LTS 版本
- **Express**: 輕量級 Web 框架
- **Mongoose**: MongoDB ODM
- **JWT**: 使用者認證
- **WebSocket**: 即時通訊
- **Passport.js**: OAuth 整合

### 資料庫：MongoDB

#### 選擇理由
1. **延續性**: 保持與 MarketPro 相同
2. **靈活性**: Schema-less，適合快速迭代
3. **效能**: 優秀的讀寫性能
4. **整合性**: 與 Node.js 生態系統完美整合

## 📊 原始架構 vs 目標架構

### MarketPro (原始架構)
```
┌─────────────────┐    ┌──────────────────┐
│  React Frontend │    │   Microservices  │
│   + Vite        │◄──►│   - auth-api     │
│   + CSS Modules │    │   - binance-proxy│
└─────────────────┘    │   - news-api     │
                       │   - ai-api       │
                       │ + notification   │
                       │   (Golang)       │
                       └──────────────────┘
                                │
                       ┌──────────────────┐
                       │    MongoDB       │
                       └──────────────────┘
```

### NexusTrade (目標架構)
```
┌─────────────────┐    ┌──────────────────┐
│ Vanilla JS      │    │   Node.js        │
│ Frontend        │◄──►│   Express        │
│ + HTML5         │    │   + All Services │
│ + CSS3          │    │   + WebSocket    │
│ + ES2024        │    │   + JWT Auth     │
└─────────────────┘    └──────────────────┘
                                │
                       ┌──────────────────┐
                       │    MongoDB       │
                       │   + Mongoose     │
                       └──────────────────┘
```

## 🗂️ 專案結構規劃

```
NexusTrade/
├── docs/                      # 專案文件
│   ├── NexusTrade_Development_Plan.md
│   ├── API_Documentation.md
│   └── Deployment_Guide.md
├── src/                       # 後端源碼
│   ├── config/               # 設定檔案
│   │   ├── database.js
│   │   ├── logger.js
│   │   └── auth.js
│   ├── controllers/          # 控制器
│   │   ├── auth.controller.js
│   │   ├── market.controller.js
│   │   ├── news.controller.js
│   │   ├── watchlist.controller.js
│   │   ├── notification.controller.js
│   │   ├── ai.controller.js
│   │   └── user.controller.js
│   ├── middleware/           # 中介軟體
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   └── validation.middleware.js
│   ├── models/               # 資料模型
│   │   ├── User.model.js
│   │   ├── NotificationRule.model.js
│   │   ├── NewsCache.model.js
│   │   └── AiCache.model.js
│   ├── routes/               # 路由定義
│   │   ├── auth.routes.js
│   │   ├── market.routes.js
│   │   ├── news.routes.js
│   │   ├── watchlist.routes.js
│   │   ├── notification.routes.js
│   │   ├── ai.routes.js
│   │   └── user.routes.js
│   ├── services/             # 業務邏輯
│   │   ├── authService.js
│   │   ├── marketDataService.js
│   │   ├── newsService.js
│   │   ├── watchlistService.js
│   │   ├── notificationService.js
│   │   ├── notificationMonitor.js
│   │   ├── aiService.js
│   │   └── lineService.js
│   ├── utils/                # 工具函數
│   │   ├── ApiError.js
│   │   ├── validation.js
│   │   └── helpers.js
│   └── server.js             # 應用程式入口
├── public/                    # 前端靜態資源
│   ├── index.html
│   ├── css/                  # 樣式表
│   │   ├── base/
│   │   ├── layout/
│   │   ├── components/
│   │   ├── pages/
│   │   └── main.css
│   ├── js/                   # JavaScript
│   │   ├── main.js           # 應用程式入口
│   │   ├── lib/              # 工具庫
│   │   │   ├── api.js
│   │   │   ├── dom.js
│   │   │   ├── websocket.js
│   │   │   └── router.js
│   │   ├── components/       # UI 組件
│   │   │   ├── assetList.js
│   │   │   ├── loginModal.js
│   │   │   ├── newsTicker.js
│   │   │   ├── notificationModal.js
│   │   │   ├── notificationList.js
│   │   │   ├── aiTrendAnalysis.js
│   │   │   └── supportResistanceTable.js
│   │   ├── pages/            # 頁面邏輯
│   │   │   ├── marketPage.js
│   │   │   ├── newsPage.js
│   │   │   ├── watchlistPage.js
│   │   │   └── assetDetailPage.js
│   │   └── state/            # 狀態管理
│   │       └── store.js
│   └── images/               # 圖片資源
├── tests/                     # 測試檔案
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker-compose.yml         # Docker 編排
├── Dockerfile                 # Docker 映像定義
├── .github/workflows/         # CI/CD 設定
│   ├── ci.yml
│   └── cd.yml
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 🚀 開發階段規劃

### Phase 1: 基礎建設 (2-3 週)

#### 1.1 專案初始化 ✅ (已完成)
- [x] 目錄結構建立
- [x] Node.js 專案初始化
- [x] ESLint & Prettier 設定
- [x] Git 版本控制
- [x] GitHub 倉庫設定

#### 1.2 後端基礎架構 (Task 1)
- [ ] Express 應用程式設定
- [ ] MongoDB 連接與 Mongoose 設定
- [ ] 基礎路由結構
- [ ] 錯誤處理機制
- [ ] 日誌系統
- [ ] 環境變數管理

#### 1.3 前端基礎架構 (Task 2)
- [ ] HTML 基礎結構設計
- [ ] CSS 架構建立
- [ ] JavaScript 模組系統
- [ ] 前端路由實現
- [ ] 狀態管理機制
- [ ] API 請求封裝

### Phase 2: 核心功能開發 (4-5 週)

#### 2.1 使用者認證系統 (Task 3.3)
- [ ] JWT 認證實現
- [ ] Google OAuth 整合
- [ ] LINE OAuth 整合
- [ ] Email 登入/註冊
- [ ] 前端登入介面
- [ ] 認證狀態管理

#### 2.2 市場數據系統 (Task 3.1)
- [ ] WebSocket 服務建立
- [ ] Binance API 整合
- [ ] 即時數據推送
- [ ] 前端數據顯示
- [ ] TradingView Widgets 整合
- [ ] 熱力圖組件

#### 2.3 新聞系統 (Task 3.2)
- [ ] 新聞爬取服務
- [ ] 新聞 API 實現
- [ ] 快取機制
- [ ] 前端新聞顯示
- [ ] 滾動新聞條

#### 2.4 觀察清單系統 (Task 3.4)
- [ ] 觀察清單 CRUD API
- [ ] 前端觀察清單介面
- [ ] 加入/移除功能
- [ ] 數據同步

#### 2.5 AI 分析系統 (Task 3.5)
- [ ] OpenRouter API 整合
- [ ] AI 服務實現
- [ ] 結果快取
- [ ] 前端分析顯示

#### 2.6 技術指標系統 (Task 3.6)
- [ ] 支撐阻力位計算
- [ ] 技術指標邏輯
- [ ] 前端圖表顯示

### Phase 3: 通知系統 (2-3 週)

#### 3.1 通知設定系統 (Task 4)
- [ ] 通知規則模型
- [ ] 通知設定 API
- [ ] 前端設定介面
- [ ] 規則管理功能

#### 3.2 通知監控引擎
- [ ] 排程監控系統
- [ ] 條件檢查邏輯
- [ ] 觸發機制

#### 3.3 通知推送服務
- [ ] LINE Notify 整合
- [ ] 訊息模板設計
- [ ] 推送邏輯實現
- [ ] 錯誤處理

### Phase 4: 部署與測試 (2 週)

#### 4.1 容器化 (Task 5)
- [ ] Dockerfile 編寫
- [ ] docker-compose 設定
- [ ] 環境變數管理
- [ ] 測試部署

#### 4.2 CI/CD 設定 (Task 6)
- [ ] GitHub Actions 設定
- [ ] 自動化測試
- [ ] 自動化部署
- [ ] 環境管理

#### 4.3 測試實現 (Task 7)
- [ ] 單元測試
- [ ] 整合測試
- [ ] E2E 測試
- [ ] 性能測試

### Phase 5: 文件與交接 (1 週)

#### 5.1 文件完善 (Task 8)
- [ ] API 文件
- [ ] 部署指南
- [ ] 使用手冊
- [ ] 開發文件

#### 5.2 專案交接
- [ ] 程式碼審核
- [ ] 知識轉移
- [ ] 維護文件

## 📈 專案里程碑

| 里程碑 | 時間點 | 主要成果 |
|--------|--------|----------|
| M1: 基礎完成 | 第 3 週 | 後端/前端基礎架構建立 |
| M2: 核心功能 | 第 8 週 | 所有主要功能實現 |
| M3: 通知系統 | 第 11 週 | 完整通知功能 |
| M4: 部署就緒 | 第 13 週 | 生產環境部署 |
| M5: 專案交付 | 第 14 週 | 完整專案交付 |

## 🔧 開發工具與環境

### 開發環境
- **Node.js**: 18+ LTS
- **MongoDB**: 6.0+
- **Docker**: 24.0+
- **Git**: 2.40+

### 開發工具
- **IDE**: VS Code
- **API 測試**: Postman/Insomnia
- **版本控制**: Git + GitHub
- **CI/CD**: GitHub Actions
- **容器化**: Docker + Docker Compose

### 第三方服務
- **Binance API**: 市場數據
- **LINE Messaging API**: 通知推送
- **Google OAuth API**: 使用者認證
- **OpenRouter API**: AI 分析
- **TradingView Widgets**: 圖表顯示

## 📋 品質保證

### 程式碼品質
- **ESLint**: 程式碼風格檢查
- **Prettier**: 程式碼格式化
- **JSDoc**: 程式碼文件
- **Git Hooks**: 提交前檢查

### 測試策略
- **單元測試**: Jest (覆蓋率 > 80%)
- **整合測試**: Supertest
- **E2E 測試**: Cypress
- **手動測試**: 完整功能驗證

### 效能指標
- **首屏載入**: < 2 秒
- **API 響應**: < 500ms
- **WebSocket 延遲**: < 100ms
- **記憶體使用**: < 512MB

## 🚨 風險管理

### 技術風險
1. **第三方 API 穩定性**: 建立備用方案和錯誤處理
2. **即時數據壓力**: 實現有效的節流和快取機制
3. **跨瀏覽器相容性**: 定期測試主流瀏覽器

### 專案風險
1. **時程延遲**: 每週進度檢討，及時調整計畫
2. **需求變更**: 建立變更管理流程
3. **人力資源**: 建立完整文件和知識分享

## 📊 成功指標

### 技術指標
- [x] 程式碼覆蓋率 > 80%
- [x] 建置時間 < 5 分鐘
- [x] 部署時間 < 10 分鐘
- [x] 錯誤率 < 1%

### 業務指標
- [x] 功能完整性 100%
- [x] 效能提升 > 30%
- [x] 維護成本降低 > 50%
- [x] 部署複雜度降低 > 60%

## 🔄 後續維護

### 長期規劃
1. **功能擴展**: 根據使用者回饋持續優化
2. **技術升級**: 定期更新依賴和技術棧
3. **安全強化**: 持續安全性檢測和改進
4. **效能優化**: 監控和優化系統效能

---

**最後更新**: 2025-06-16  
**版本**: 1.0  
**負責人**: 開發團隊  
**審核人**: 專案經理