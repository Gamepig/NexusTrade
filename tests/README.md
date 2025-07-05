# 測試和除錯檔案目錄結構

## 📂 目錄說明

### tests/ - 測試檔案
- **auth/** - 認證相關測試
- **api/** - API 接口測試  
- **integration/** - 整合測試
- **unit/** - 單元測試
- **e2e/** - 端到端測試

### debug/ - 除錯檔案
- **auth/** - 認證除錯腳本
- **data/** - 資料庫和快取除錯
- **frontend/** - 前端除錯和測試頁面
- **api/** - API 除錯工具
- **integration/** - 整合除錯
- **performance/** - 效能測試

## 🧪 執行測試

### 認證系統測試
```bash
npm run test -- tests/auth
```

### API 測試  
```bash
npm run test -- tests/api
```

### 整合測試
```bash
npm run test -- tests/integration
```

## 🔧 除錯工具

### 認證除錯
```bash
node debug/auth/fix-auth-state-init.js
```

### 資料除錯
```bash
node debug/data/check_database_content.js
```

### 前端除錯
訪問: http://localhost:3001/debug/frontend/ 中的測試頁面

## 📝 測試報告

最後更新: 2025-06-29T17:18:49.364Z
檔案整理統計: 40/41 個檔案已整理
