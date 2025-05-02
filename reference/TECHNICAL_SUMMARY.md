# MarketPro 技術文件摘要

## 1. 系統架構

採用前後端分離微服務架構：

*   **前端 (`frontend`)**: React + Vite + CSS Modules，負責 UI/UX。
*   **認證 API (`auth-api` - Node.js)**: Express + Passport.js + MongoDB，處理 Google/LINE/Email 登入、Session 管理、用戶資料、觀察清單、通知規則 CRUD。
*   **Binance 代理 (`binance-proxy` - Node.js)**: Express + WebSocket，代理 Binance API 請求，提供市場數據，處理 WebSocket 連接。
*   **新聞 API (`news-api` - Node.js)**: Express，爬取和提供加密貨幣新聞。
*   **AI API (`ai-api` - Node.js)**: Express，調用 OpenRouter API，提供趨勢分析。
*   **通知監控服務 (`notification-service` - Golang)**: (開發中) 負責監控用戶設定的通知規則，檢查觸發條件，並調用 LINE API 發送通知。

## 2. 核心技術棧

*   **前端**: React (函數式組件 + Hooks), Vite, CSS Modules, React Router, Axios, TradingView Widgets。
*   **後端 (Node.js)**: Express, Mongoose, Passport.js, `ws` library, `dotenv`.
*   **後端 (Golang)**: 標準庫, Gorilla Mux (可能), MongoDB Driver, Go Cron (可能)。
*   **資料庫**: MongoDB。
*   **部署/管理**: PM2, Docker (規劃中)。

## 3. 重要資料模型 (MongoDB)

*   **User**: 存儲用戶基本資訊、Google/LINE ID、密碼雜湊 (若使用 Email)、觀察清單 (`watchlist`)、LINE 連接狀態 (`line`)、價格警報設定 (`priceAlerts`)、AI 通知設定 (`aiNotifications`)。
*   **NotificationRule**: 儲存用戶設定的通知規則詳情 (交易對、時間條件、價格條件、狀態、到期日等)。
*   **NotificationHistory**: (規劃中) 記錄已發送的通知歷史。
*   **AIAnalysis**: (可能存在) 快取 AI 分析結果。

## 4. 關鍵 API 端點

*   **認證**: `/auth/google`, `/auth/google/callback`, `/auth/line`, `/auth/line/callback`, `/auth/login`, `/auth/register`, `/auth/logout`, `/auth/status`
*   **用戶**: `/user/profile`, `/user/watchlist` (GET, POST - add/remove)
*   **通知規則**: `/api/notifications/rules` (POST, GET), `/api/notifications/rules/:id` (PUT, DELETE), `/api/notifications/rules/:id/status` (PATCH)
*   **Binance 數據**: (透過 `binance-proxy` 提供) `/api/proxy/kline`, `/api/proxy/ticker`, WebSocket 端點。
*   **新聞**: `/api/news`
*   **AI 分析**: `/api/ai/analyze`
*   **通知服務 (Golang)**: `/health` (健康檢查), `/api/test-notification` (測試用), (內部 API 用於觸發通知)

## 5. 開發與部署

*   **環境變數**: 使用根目錄 `.env` 檔案管理 API 金鑰、資料庫 URI、端口等。後端服務需正確配置 `dotenv` 路徑。
*   **啟動**: 使用 `npm run dev` (前端), `node <service_entry>.js` (後端開發) 或 `pm2 start ecosystem.config.js` (生產)。
*   **建構**: `npm run build` (前端)。
*   **規範**: 遵循 ESLint/Prettier，命名約定 (PascalCase for components, camelCase for functions/variables)。

## 6. 開發中/待辦事項

*   **Golang 通知服務**: 核心監控邏輯、LINE 訊息發送、模板、頻率控制、部署。
*   **AI 整合**: 設計通知專用 AI 端點，整合進監控流程，優化通知內容。
*   **測試**: 全面的單元、整合、負載測試。
*   **已知問題**: 修復 LINE 登入重定向 state 解析錯誤。 