
console.log('=== 檢查瀏覽器狀態 ===');
console.log('Current user:', window.currentUser);
console.log('Token:', localStorage.getItem('nexustrade_token'));
console.log('User data:', localStorage.getItem('nexustrade_user'));

// 手動檢查 LINE 狀態
const token = localStorage.getItem('nexustrade_token');
if (token) {
  fetch('/api/line/bind/status', {
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log('=== LINE 狀態檢查結果 ===');
    console.log(data);
  })
  .catch(error => {
    console.error('LINE 狀態檢查失敗:', error);
  });
} else {
  console.log('沒有找到 token');
}

