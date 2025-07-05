// 快速檢查當前頁面狀態
console.log('=== 當前頁面狀態檢查 ===');

// 檢查認證狀態
const token = localStorage.getItem('nexustrade_token') || sessionStorage.getItem('nexustrade_token');
const userStr = localStorage.getItem('nexustrade_user') || sessionStorage.getItem('nexustrade_user');
const user = userStr ? JSON.parse(userStr) : null;

console.log('1. Token 存在:', !!token);
console.log('2. Token 預覽:', token ? token.substring(0, 30) + '...' : 'null');
console.log('3. 使用者資料存在:', !!user);
console.log('4. 使用者資料:', user);
console.log('5. Window.currentUser:', window.currentUser);

// 檢查 PriceAlertModal 實例
console.log('6. PriceAlertModal 存在:', !!window.priceAlertModal);
if (window.priceAlertModal) {
  console.log('7. PriceAlertModal isLineConnected:', window.priceAlertModal.isLineConnected);
}

// 手動測試 LINE 狀態 API
if (token) {
  console.log('8. 正在測試 LINE 狀態 API...');
  fetch('/api/line/bind/status', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log('9. LINE 狀態 API 回應:', data);
    console.log('10. 是否綁定 LINE:', data.data?.isBound);
  })
  .catch(error => {
    console.error('LINE 狀態 API 錯誤:', error);
  });
} else {
  console.log('8. 無法測試 LINE 狀態 API - 沒有 token');
}

// 如果有 PriceAlertModal，手動觸發狀態檢查
if (window.priceAlertModal && token) {
  console.log('11. 手動觸發 PriceAlertModal 狀態檢查...');
  window.priceAlertModal.checkLineConnectionStatus().then(() => {
    console.log('12. 檢查完成，isLineConnected:', window.priceAlertModal.isLineConnected);
  });
}