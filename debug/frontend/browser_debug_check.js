/**
 * 瀏覽器 LINE 狀態診斷腳本
 * 請在瀏覽器 Console 中貼上並執行此腳本
 */

async function debugLineStatus() {
  console.log('🔍 開始 LINE 狀態診斷...');
  console.log('='.repeat(50));
  
  // 1. 檢查本地儲存
  console.log('📱 檢查本地儲存狀態:');
  const localToken = localStorage.getItem('nexustrade_token') || sessionStorage.getItem('nexustrade_token');
  const localUser = localStorage.getItem('nexustrade_user') || sessionStorage.getItem('nexustrade_user');
  
  console.log('Token:', localToken ? `${localToken.substring(0, 20)}...` : '❌ 未找到');
  console.log('User:', localUser || '❌ 未找到');
  
  if (localUser) {
    try {
      const user = JSON.parse(localUser);
      console.log('User ID:', user.id || user._id || '❌ 無 ID');
      console.log('LINE ID:', user.lineId || '❌ 無 LINE ID');
      console.log('Email:', user.email || '❌ 無 Email');
    } catch (e) {
      console.log('❌ 使用者資料解析失敗:', e.message);
    }
  }
  
  // 2. 檢查認證狀態
  console.log('\n🔐 檢查認證狀態:');
  if (!localToken) {
    console.log('❌ 沒有認證 token，需要重新登入');
    return;
  }
  
  // 3. 測試 API 連接
  console.log('\n🌐 測試 API 連接:');
  try {
    const response = await fetch('/api/line/bind/status', {
      headers: {
        'Authorization': `Bearer ${localToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API 狀態碼:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API 回應成功:', data);
      console.log('LINE 綁定狀態:', data.data?.isBound ? '✅ 已連結' : '❌ 未連結');
    } else {
      const errorData = await response.json().catch(() => ({ message: '無法解析錯誤' }));
      console.log('❌ API 錯誤:', errorData);
      
      if (response.status === 401) {
        console.log('🔒 認證過期，需要重新登入');
        // 清除過期的認證資訊
        localStorage.removeItem('nexustrade_token');
        localStorage.removeItem('nexustrade_user');
        sessionStorage.removeItem('nexustrade_token');
        sessionStorage.removeItem('nexustrade_user');
        console.log('🗑️ 已清除過期認證資訊');
      }
    }
  } catch (error) {
    console.log('❌ 網路錯誤:', error.message);
  }
  
  // 4. 檢查狀態管理器
  console.log('\n🔧 檢查狀態管理器:');
  if (window.authStateManager) {
    console.log('✅ AuthStateManager 已載入');
    const authState = window.authStateManager.getLocalAuthState();
    console.log('本地認證狀態:', authState);
    
    console.log('🔄 嘗試強制重新整理狀態...');
    try {
      const refreshResult = await window.authStateManager.forceAuthStateRefresh();
      console.log('狀態重新整理結果:', refreshResult ? '✅ 成功' : '❌ 失敗');
    } catch (error) {
      console.log('❌ 狀態重新整理失敗:', error.message);
    }
  } else {
    console.log('❌ AuthStateManager 未載入');
  }
  
  // 5. 檢查 PriceAlertModal
  console.log('\n🔔 檢查 PriceAlertModal:');
  if (window.priceAlertModal) {
    console.log('✅ PriceAlertModal 已載入');
    console.log('當前 LINE 連接狀態:', window.priceAlertModal.isLineConnected);
    
    console.log('🔄 重新檢查 LINE 連接狀態...');
    try {
      await window.priceAlertModal.checkLineConnectionStatus();
      console.log('重新檢查後狀態:', window.priceAlertModal.isLineConnected);
    } catch (error) {
      console.log('❌ 重新檢查失敗:', error.message);
    }
  } else {
    console.log('❌ PriceAlertModal 未載入');
  }
  
  // 6. 建議修復步驟
  console.log('\n💡 建議修復步驟:');
  if (!localToken) {
    console.log('1. 點擊「連結 LINE 帳戶」重新登入');
    console.log('2. 完成 OAuth 流程');
    console.log('3. 返回頁面後狀態應該會自動更新');
  } else {
    console.log('1. 執行: localStorage.clear(); sessionStorage.clear();');
    console.log('2. 重新整理頁面: location.reload();');
    console.log('3. 重新登入 LINE 帳戶');
  }
  
  console.log('\n='.repeat(50));
  console.log('🏁 診斷完成');
}

// 自動執行診斷
debugLineStatus();