# 更新日誌 (Changelog)

## [2.0.0] - 2024-02-15
### 新增功能 🚀
- 全新關注清單（Watchlist）功能
- 支持最多 30 個交易對的關注清單管理
- 新增 API 端點：
  - `GET /api/watchlist`
  - `POST /api/watchlist`
  - `DELETE /api/watchlist/:symbol`
  - `GET /api/watchlist/status/:symbol`
  - `PUT /api/watchlist/:symbol`
  - `GET /api/watchlist/stats`

### 技術改進 🛠️
- 重構資料模型，使用獨立的 Watchlist 模型
- 實作完整的後端驗證和錯誤處理
- 新增前端整合測試
- 支持交易對的優先級和分類管理

### 驗證與限制 🔒
- 每個用戶限制 30 個關注清單項目
- 支持的交易對格式：USDT, BTC, ETH, BNB, BUSD, FDUSD
- 即時價格資料整合

### 測試覆蓋 🧪
- 後端模型單元測試
- 控制器整合測試
- 前端組件測試
- 完整的錯誤場景覆蓋

## [1.x.x] - 之前版本
- 初始版本，未提供關注清單功能 