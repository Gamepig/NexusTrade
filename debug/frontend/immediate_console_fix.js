// 🚀 立即修復腳本 - 請在瀏覽器 Console 中貼上並執行
console.log('🚀 NexusTrade LINE 狀態立即修復腳本');
console.log('='.repeat(50));

// 第一步：診斷當前狀態
console.log('📋 步驟 1: 診斷當前認證狀態');
const currentToken = localStorage.getItem('nexustrade_token') || sessionStorage.getItem('nexustrade_token');
const currentUser = localStorage.getItem('nexustrade_user') || sessionStorage.getItem('nexustrade_user');

console.log('當前 Token:', currentToken ? '✅ 存在' : '❌ 不存在');
console.log('當前 User:', currentUser ? '✅ 存在' : '❌ 不存在');

if (currentUser) {
  try {
    const userData = JSON.parse(currentUser);
    console.log('User ID:', userData.id || userData._id || '❌ 無 ID');
    console.log('LINE ID:', userData.lineId || '❌ 無 LINE ID');
  } catch (e) {
    console.log('❌ 使用者資料解析失敗');
  }
}

// 第二步：清除所有認證資料
console.log('\n📋 步驟 2: 清除所有認證資料');
localStorage.removeItem('nexustrade_token');
localStorage.removeItem('nexustrade_user');
sessionStorage.removeItem('nexustrade_token');
sessionStorage.removeItem('nexustrade_user');

// 清除全域狀態
if (window.currentUser) {
  window.currentUser = null;
}

console.log('✅ 認證資料已清除');

// 第三步：重置狀態管理器
console.log('\n📋 步驟 3: 重置狀態管理器');
if (window.authStateManager) {
  try {
    // 觸發狀態更新
    window.authStateManager.triggerAuthStateUpdate();
    console.log('✅ 狀態管理器已重置');
  } catch (e) {
    console.log('❌ 狀態管理器重置失敗:', e.message);
  }
} else {
  console.log('⚠️ 狀態管理器不存在');
}

// 第四步：重置價格警報模態框
console.log('\n📋 步驟 4: 重置價格警報模態框');
if (window.priceAlertModal) {
  window.priceAlertModal.isLineConnected = false;
  
  // 如果模態框正在顯示，重新渲染
  if (window.priceAlertModal.isVisible) {
    try {
      window.priceAlertModal.render();
      window.priceAlertModal.setupEventListeners();
      console.log('✅ 價格警報模態框已重新渲染');
    } catch (e) {
      console.log('❌ 模態框重新渲染失敗:', e.message);
    }
  } else {
    console.log('✅ 價格警報模態框狀態已重置');
  }
} else {
  console.log('⚠️ 價格警報模態框不存在');
}

// 第五步：完成修復
console.log('\n📋 步驟 5: 修復完成');
console.log('✅ 立即修復執行完成！');
console.log('');
console.log('📝 請按照以下步驟操作：');
console.log('1. 如果價格警報設定視窗還開著，請關閉它');
console.log('2. 重新點擊任一貨幣的「通知設定」按鈕');
console.log('3. 現在應該顯示「需要連結 LINE 帳戶」');
console.log('4. 點擊「連結 LINE 帳戶」進行登入');
console.log('5. 完成 OAuth 登入後，系統會自動同步狀態');

console.log('\n🔧 如果問題仍然存在，請執行：');
console.log('location.reload(); // 重新整理頁面');

console.log('\n='.repeat(50));
console.log('🎯 修復腳本執行完成');