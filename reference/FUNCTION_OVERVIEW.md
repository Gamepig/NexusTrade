# MarketPro 功能總覽

MarketPro 是一個加密貨幣市場分析與通知平台，旨在提供用戶即時市場數據、新聞資訊、技術分析和自訂通知。

**主要功能模組：**

1.  **即時市場數據與圖表 (已完成)**
    *   **熱門資產列表 (`AssetsList`)**:
        *   透過 WebSocket 展示即時數據中熱門度最高的前 200 種加密貨幣。
        *   支援分頁瀏覽。
        *   提供多種排序方式（例如：價格、漲跌幅、熱度）。
        *   列表更新頻率透過節流控制（最多 1.5 秒一次）。
        *   點選任一資產可導覽至資產詳情頁。
    *   **TradingView 圖表整合**:
        *   **K 線圖 (`TradingViewChartWidget`)**: 顯示完整的 K 線圖，包含各種技術指標。
        *   **交易對資訊 (`TradingViewSymbolWidget`)**: 顯示市場基本資料（如開盤價、最高價、最低價、成交量）。
        *   **技術分析 (`TradingViewTechnicalWidget`)**: 顯示基於多種技術指標的綜合評級（買入/賣出/中立）。
    *   **加密貨幣熱力圖 (`CryptoHeatmapWidget`)**: 視覺化展示市場整體表現和資金流向。
    *   **市場概況頁面 (`Markets`)**: (文件提及，但需確認前端檔案是否存在) 提供整體市場指標和趨勢。

2.  **新聞資訊 (已完成)**
    *   **滾動新聞條 (`NewsTicker`, `NewsMarquee`)**: 在頁面頂部或側邊顯示最新加密貨幣新聞標題。
    *   **新聞頁面 (`NewsPage`)**: 以卡片式佈局展示來自多個來源的加密貨幣新聞，提供詳細內容預覽。
    *   **新聞 API 服務 (`news-api`)**: 後端負責爬取、快取及提供新聞數據。

3.  **使用者認證與管理 (已完成)**
    *   **第三方登入**: 支援 Google 和 LINE OAuth 登入。
    *   **電子郵件登入/註冊**: (技術文件提及，需確認 UI 實作) 提供傳統帳號密碼登入方式。
    *   **登入狀態管理**: 全域 `AuthContext` 管理用戶登入狀態。
    *   **登入彈窗 (`LoginModal`)**: 提供統一的登入入口。

4.  **觀察清單 (Watchlist) (已完成)**
    *   **加入/移除**: 使用者可在 `AssetsList` 中點擊星號圖示，將感興趣的交易對加入觀察清單 (上限 10 個)。
    *   **觀察清單頁面 (`WatchlistPage`)**: 顯示用戶已加入的所有觀察項目。
    *   **登入後重定向**: 登入成功後自動跳轉至觀察清單頁面。

5.  **通知系統 (部分完成，核心監控與發送進行中)**
    *   **通知設定 (前端 UI/API 完成)**:
        *   可在觀察清單或資產詳情頁針對特定交易對設定通知規則。
        *   **彈出式設定視窗 (`NotificationModal`)**:
            *   **時間條件**: 可選擇基於 1 小時、4 小時、24 小時的時間框架進行分析觸發 (前端 UI 完成)。
            *   **價格條件**: 可設定價格達到、上穿或下穿特定數值時觸發 (前端 UI 完成)。
            *   **單次通知**: 規則觸發一次後可自動停用 (前端 UI 完成)。
            *   **到期時間**: 可設定規則的有效期限 (前端 UI 完成)。
    *   **通知規則管理 (前端 UI/API 完成)**:
        *   **列表 (`NotificationList`)**: 顯示用戶所有已設定的通知規則。
        *   **操作**: 可啟用/禁用或刪除規則。
    *   **後端通知規則管理 (已完成)**:
        *   提供 API 進行通知規則的創建、讀取、更新、刪除 (CRUD)。
        *   資料庫儲存用戶設定的規則。
    *   **通知監控引擎 (Golang - 進行中)**:
        *   **核心功能 (進行中)**: 定期檢查所有用戶的通知規則是否滿足觸發條件 (包括時間和價格)。
        *   **價格獲取 (已完成)**: 從 Binance API 獲取即時價格數據。
        *   **條件檢查 (部分完成)**: 實現價格和時間條件的檢查邏輯。
    *   **LINE 通知發送 (進行中)**:
        *   **LINE 帳號連接 (OAuth 完成)**: 用戶可透過 LINE OAuth 將 MarketPro 與其 LINE 帳號連接。
        *   **訊息發送 (進行中)**: 當監控引擎判斷條件觸發時，透過 LINE Messaging API 將通知發送給用戶。
        *   **訊息模板 (待辦)**: 設計不同觸發條件下的通知訊息內容。
    *   **AI 分析整合 (待辦)**:
        *   將 AI 分析結果整合進通知內容中，提供更豐富的市場洞察。
        *   用戶可設定接收 AI 分析通知的頻率與時間範圍。

6.  **AI 趨勢分析 (部分完成)**
    *   **AI 分析元件 (`AiTrendAnalysis`)**: 在資產詳情頁顯示由 AI 模型生成的趨勢預測和分析。
    *   **AI API 服務 (`ai-api`)**: 後端負責調用 AI 模型 (OpenRouter) 並快取分析結果。
    *   **整合通知 (待辦)**: 將 AI 分析結果納入 LINE 通知。

7.  **技術指標與分析 (已完成)**
    *   **支撐阻力位表格 (`SupportResistanceTable`)**: 在資產詳情頁顯示透過多種方法計算出的關鍵價格水平。
    *   **技術指標計算服務 (`technicalIndicators.js`)**: 前端服務，可能用於計算或格式化某些指標數據。 

## Watchlist API 功能文檔

### 1. 關注清單 API 端點

#### 1.1 取得關注清單
- **端點**: `GET /api/watchlist`
- **說明**: 取得用戶的完整關注清單
- **參數**:
  - `page` (可選): 分頁參數，預設為 1
  - `limit` (可選): 每頁顯示數量，預設為 10
- **回應**:
  ```json
  {
    "watchlist": [
      {
        "symbol": "BTCUSDT",
        "priority": 1,
        "category": "Top Cryptocurrencies",
        "currentPrice": 50000.00,
        "priceChange": "+2.5%"
      }
    ],
    "total": 15,
    "page": 1,
    "totalPages": 2
  }
  ```

#### 1.2 新增關注項目
- **端點**: `POST /api/watchlist`
- **說明**: 新增交易對到關注清單
- **請求體**:
  ```json
  {
    "symbol": "ETHUSDT",
    "priority": 2,
    "category": "Altcoins"
  }
  ```
- **驗證規則**:
  - 限制 30 個交易對
  - 僅支持特定交易對格式
  - 優先級範圍：1-5

#### 1.3 移除關注項目
- **端點**: `DELETE /api/watchlist/:symbol`
- **說明**: 從關注清單移除特定交易對
- **回應**:
  ```json
  {
    "message": "Successfully removed ETHUSDT from watchlist"
  }
  ```

#### 1.4 檢查關注狀態
- **端點**: `GET /api/watchlist/status/:symbol`
- **說明**: 檢查特定交易對是否在關注清單中
- **回應**:
  ```json
  {
    "isWatchlisted": true,
    "details": {
      "symbol": "BTCUSDT",
      "priority": 1
    }
  }
  ```

#### 1.5 更新關注項目
- **端點**: `PUT /api/watchlist/:symbol`
- **說明**: 更新關注清單中的交易對
- **請求體**:
  ```json
  {
    "priority": 3,
    "category": "Updated Category"
  }
  ```

#### 1.6 關注清單統計
- **端點**: `GET /api/watchlist/stats`
- **說明**: 取得關注清單的統計資訊
- **回應**:
  ```json
  {
    "totalWatchlistItems": 15,
    "topCategories": [
      {"name": "Top Cryptocurrencies", "count": 5},
      {"name": "Altcoins", "count": 10}
    ],
    "averagePriority": 2.5
  }
  ```

### 2. 錯誤處理

#### 常見錯誤碼
- `400 BAD_REQUEST`: 無效的交易對或超過關注清單限制
- `404 NOT_FOUND`: 找不到指定的關注清單項目
- `409 CONFLICT`: 已達到關注清單上限

### 3. 最佳實踐
- 定期整理關注清單
- 使用優先級功能管理重要交易對
- 監控關注清單中的交易對變化 