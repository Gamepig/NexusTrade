/**
 * 檢查用戶資料
 */

// 載入環境變數
require('dotenv').config();

async function checkUserData() {
  console.log('🔍 檢查資料庫中的用戶資料...\n');

  try {
    // 使用 API 端點查詢用戶資料
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: 'ue5cc188e1d2cdbac5cfda2abb6f6a34b', email: 'vic.huang.tw@gmail.com' }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    const fetch = (await import('node-fetch')).default;
    
    // 檢查認證端點
    console.log('📡 檢查認證狀態...');
    const verifyResponse = await fetch('http://localhost:3000/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (verifyResponse.ok) {
      const userData = await verifyResponse.json();
      console.log('✅ 認證成功');
      console.log('👤 用戶資料:', userData.data);
      
      const user = userData.data.user;
      console.log('\n📊 詳細資料:');
      console.log('  用戶 ID:', user.id);
      console.log('  Email:', user.email);
      console.log('  Google ID:', user.googleId || '未設定');
      console.log('  LINE ID:', user.lineId || '未設定');
      console.log('  LINE User ID:', user.lineUserId || '未設定');
      console.log('  Provider:', user.provider || '未設定');
      console.log('  創建時間:', user.createdAt);
      
      // 檢查是否需要更新 LINE User ID
      if (user.lineId && user.lineId !== 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b') {
        console.log('\n⚠️  注意: LINE ID 與預期不符');
        console.log('   現有:', user.lineId);
        console.log('   預期:', 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b');
      } else if (!user.lineId) {
        console.log('\n❌ LINE ID 未設定，需要修復');
      } else {
        console.log('\n✅ LINE ID 正確');
      }
      
    } else {
      console.log('❌ 認證失敗');
      const errorData = await verifyResponse.text();
      console.log('錯誤:', errorData);
    }

  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
  }
}

// 執行檢查
checkUserData();