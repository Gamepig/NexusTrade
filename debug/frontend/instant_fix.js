/**
 * 立即修復腳本 - 請在瀏覽器 Console 中執行
 * 
 * 這個腳本會：
 * 1. 診斷當前認證狀態
 * 2. 清除無效的認證資訊
 * 3. 重置 LINE 連接狀態
 * 4. 重新渲染價格警報模態框
 */

async function instantFix() {
  console.log('🚀 開始立即修復 LINE 連接狀態問題...');
  console.log('='.repeat(50));
  
  // 1. 檢查當前狀態
  console.log('📋 步驟 1: 檢查當前狀態');
  const token = localStorage.getItem('nexustrade_token') || sessionStorage.getItem('nexustrade_token');
  const user = localStorage.getItem('nexustrade_user') || sessionStorage.getItem('nexustrade_user');
  
  console.log('Token 存在:', !!token);
  console.log('User 存在:', !!user);
  
  // 2. 如果有 token，測試其有效性
  let isTokenValid = false;
  if (token) {
    console.log('📋 步驟 2: 測試 Token 有效性');
    try {
      const response = await fetch('/api/line/bind/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      isTokenValid = response.ok;
      console.log('Token 有效性:', isTokenValid ? '✅ 有效' : '❌ 無效');
      
      if (response.ok) {
        const data = await response.json();
        console.log('LINE 綁定狀態:', data.data?.isBound ? '✅ 已綁定' : '❌ 未綁定');
        
        // 如果 token 有效且已綁定，直接更新 UI
        if (data.data?.isBound && window.priceAlertModal) {
          console.log('✅ 檢測到已綁定狀態，直接更新 UI');
          window.priceAlertModal.isLineConnected = true;
          if (window.priceAlertModal.isVisible) {
            window.priceAlertModal.render();
            window.priceAlertModal.setupEventListeners();
          }
          console.log('🎉 修復完成！請重新打開價格警報設定查看結果。');
          return;
        }
      }
    } catch (error) {
      console.log('❌ Token 測試失敗:', error.message);
      isTokenValid = false;
    }
  }
  
  // 3. 清除無效的認證資訊
  if (!isTokenValid) {
    console.log('📋 步驟 3: 清除無效認證資訊');
    localStorage.removeItem('nexustrade_token');
    localStorage.removeItem('nexustrade_user');
    sessionStorage.removeItem('nexustrade_token');
    sessionStorage.removeItem('nexustrade_user');
    
    // 清除全域使用者狀態
    if (window.currentUser) {
      window.currentUser = null;
    }
    
    console.log('🗑️ 已清除無效認證資訊');
  }
  
  // 4. 重置狀態管理器
  console.log('📋 步驟 4: 重置狀態管理器');
  if (window.authStateManager) {
    try {
      // 強制觸發狀態更新
      window.authStateManager.triggerAuthStateUpdate();
      console.log('✅ 狀態管理器已重置');
    } catch (error) {
      console.log('❌ 狀態管理器重置失敗:', error.message);
    }
  } else {
    console.log('⚠️ 狀態管理器不存在');
  }
  
  // 5. 重置 PriceAlertModal
  console.log('📋 步驟 5: 重置 PriceAlertModal');
  if (window.priceAlertModal) {
    // 設定為未連接狀態
    window.priceAlertModal.isLineConnected = false;
    
    // 如果模態框正在顯示，重新渲染
    if (window.priceAlertModal.isVisible) {
      try {
        window.priceAlertModal.render();
        window.priceAlertModal.setupEventListeners();
        console.log('✅ PriceAlertModal 已重新渲染');
      } catch (error) {
        console.log('❌ PriceAlertModal 重新渲染失敗:', error.message);
      }
    }
  } else {
    console.log('⚠️ PriceAlertModal 不存在');
  }
  
  // 6. 完成修復
  console.log('📋 步驟 6: 修復完成');
  console.log('✅ 立即修復執行完成！');
  console.log('');
  console.log('📝 接下來請執行以下操作：');
  console.log('1. 關閉目前的價格警報設定（如果有開啟）');
  console.log('2. 重新點擊「通知設定」按鈕');
  console.log('3. 應該會顯示「需要連結 LINE 帳戶」');
  console.log('4. 點擊「連結 LINE 帳戶」進行 OAuth');
  console.log('5. 完成後返回，狀態應該會正確顯示');
  console.log('');
  console.log('🔧 如果問題仍然存在，請執行：');
  console.log('location.reload(); // 重新整理頁面');
  
  console.log('='.repeat(50));
}

// 自動執行
instantFix();