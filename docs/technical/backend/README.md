# 後端架構技術文件

## 📋 目錄結構

```
src/
├── config/                 # 配置文件
├── controllers/            # API 控制器
├── middleware/             # 中介軟體
├── models/                # 資料模型
├── routes/                # 路由定義
├── services/              # 業務邏輯服務
└── server.js              # 應用程式入口
```

## 📚 詳細文件

### 核心系統
- **[server.js](./server.md)** - 應用程式啟動與配置
- **[database.js](./database.md)** - 資料庫連接與配置

### API 控制器
- **[auth.controller.md](./controllers/auth.controller.md)** - 認證控制器
- **[market.controller.md](./controllers/market.controller.md)** - 市場數據控制器  
- **[oauth.controller.md](./controllers/oauth.controller.md)** - OAuth 控制器
- **[price-alert.controller.md](./controllers/price-alert.controller.md)** - 價格警報控制器
- **[watchlist.controller.md](./controllers/watchlist.controller.md)** - 觀察清單控制器

### 中介軟體
- **[auth.middleware.md](./middleware/auth.middleware.md)** - 認證中介軟體
- **[membership.middleware.md](./middleware/membership.middleware.md)** - 會員權限中介軟體
- **[validation.middleware.md](./middleware/validation.middleware.md)** - 輸入驗證中介軟體

### 資料模型
- **[User.model.md](./models/User.model.md)** - 使用者資料模型
- **[PriceAlert.model.md](./models/PriceAlert.model.md)** - 價格警報資料模型
- **[Watchlist.model.md](./models/Watchlist.model.md)** - 觀察清單資料模型

### 業務服務
- **[binance.service.md](./services/binance.service.md)** - Binance API 服務
- **[line-messaging.service.md](./services/line-messaging.service.md)** - LINE 通知服務
- **[websocket.service.md](./services/websocket.service.md)** - WebSocket 即時服務
- **[ai-analysis.service.md](./services/ai-analysis.service.md)** - AI 分析服務

### 路由系統
- **[auth.routes.md](./routes/auth.routes.md)** - 認證路由
- **[market.routes.md](./routes/market.routes.md)** - 市場數據路由
- **[notifications.routes.md](./routes/notifications.routes.md)** - 通知路由
- **[watchlist.routes.md](./routes/watchlist.routes.md)** - 觀察清單路由

## 🔧 技術規範

### 程式碼風格
- ESLint 配置基於 `eslint:recommended`
- 使用單引號和分號
- 2 空格縮排
- 最大行長度 80 字元

### 錯誤處理
- 統一錯誤響應格式
- Try-catch 包裝異步操作
- 結構化錯誤日誌

### API 設計
- RESTful API 設計原則
- 一致的響應格式
- 適當的 HTTP 狀態碼
- 詳細的錯誤訊息

---

*詳細的實作細節請參考各個子文件。*