# 🚀 LINE 連接狀態問題快速修復指南

## 📋 問題現象
在價格警報設定中顯示「需要連結 LINE 帳戶」，即使之前已經連結過。

## 🔧 立即修復步驟

### 方法 1: 瀏覽器 Console 快速修復

1. **打開瀏覽器開發工具**
   - 按 `F12` 或 `Cmd+Option+I` (Mac)
   - 切換到 "Console" 標籤

2. **執行診斷腳本**
   ```javascript
   // 貼上並執行以下程式碼
   async function quickFix() {
     console.log('🚀 執行快速修復...');
     
     // 清除所有認證資訊
     localStorage.clear();
     sessionStorage.clear();
     
     // 重新整理頁面
     location.reload();
   }
   
   quickFix();
   ```

3. **重新登入**
   - 頁面重新載入後
   - 點擊任一貨幣的「通知設定」
   - 點擊「連結 LINE 帳戶」
   - 完成 OAuth 登入流程

### 方法 2: 使用除錯頁面

1. **訪問除錯頁面**
   ```
   http://localhost:3001/test_auth_debug.html
   ```

2. **執行診斷**
   - 點擊「🔄 重新檢查認證狀態」
   - 查看認證狀態報告

3. **執行修復**
   - 點擊「🔧 手動修復」
   - 返回主頁面重新測試

### 方法 3: 手動清除瀏覽器資料

1. **清除 localStorage**
   - 開發工具 → Application → Local Storage
   - 刪除 `nexustrade_token` 和 `nexustrade_user`

2. **清除 sessionStorage**
   - 開發工具 → Application → Session Storage
   - 刪除所有 NexusTrade 相關項目

3. **重新整理頁面**
   - 按 `F5` 或 `Cmd+R`

## 🔍 深度診斷 (如果上述方法無效)

### 檢查認證狀態
```javascript
// 在 Console 中執行
console.log('Token:', localStorage.getItem('nexustrade_token'));
console.log('User:', localStorage.getItem('nexustrade_user'));
console.log('AuthManager:', window.authStateManager);
console.log('PriceModal:', window.priceAlertModal);
```

### 測試 API 連接
```javascript
// 在 Console 中執行
async function testAPI() {
  const token = localStorage.getItem('nexustrade_token');
  if (!token) {
    console.log('❌ 沒有 token');
    return;
  }
  
  try {
    const response = await fetch('/api/line/bind/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('API 狀態:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('LINE 狀態:', data.data?.isBound);
    }
  } catch (e) {
    console.log('API 錯誤:', e.message);
  }
}

testAPI();
```

## 🎯 預期結果

修復成功後，你應該看到：

1. **未登入時**: 顯示「需要連結 LINE 帳戶」按鈕
2. **登入後**: 
   - 如果未綁定：顯示「連結 LINE 帳戶」按鈕
   - 如果已綁定：顯示完整的價格警報設定表單

## 🆘 如果問題持續存在

1. **清除所有瀏覽器資料**
   ```javascript
   // 完全重置
   localStorage.clear();
   sessionStorage.clear();
   // 清除 cookies (如果有)
   document.cookie.split(";").forEach(c => {
     document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
   });
   location.reload();
   ```

2. **檢查網路連接**
   - 確保伺服器正在運行 (port 3000 和 3001)
   - 檢查 API 端點是否正常回應

3. **重新啟動伺服器**
   ```bash
   # 停止伺服器 (Ctrl+C)
   # 重新啟動
   npm run dev
   ```

## 📞 技術支援

如果以上方法都無法解決問題，請提供以下資訊：

1. 瀏覽器 Console 中的錯誤訊息
2. 除錯頁面的完整輸出
3. 是否之前成功連結過 LINE
4. 使用的瀏覽器和版本

---

*最後更新: 2025-06-29*