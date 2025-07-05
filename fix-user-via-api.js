/**
 * 通過 API 修復用戶 LINE ID
 */

// 載入環境變數
require('dotenv').config();

async function fixUserViaAPI() {
  console.log('🔧 通過 API 修復用戶 LINE ID...\n');

  const userId = 'ue5cc188e1d2cdbac5cfda2abb6f6a34b';
  const correctLineId = 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b';

  try {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: userId, email: 'vic.huang.tw@gmail.com' }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    const fetch = (await import('node-fetch')).default;

    // 方法 1: 直接使用 MongoDB 更新 (如果使用 MongoDB)
    const mongoose = require('mongoose');
    
    if (process.env.MONGODB_URI && !process.env.SKIP_MONGODB) {
      console.log('🗄️ 嘗試連接 MongoDB...');
      
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB 連接成功');
        
        // 查找並更新用戶
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        const user = await usersCollection.findOne({ _id: userId });
        
        if (user) {
          console.log('✅ 找到用戶:', user.email);
          console.log('現有 LINE ID:', user.lineId);
          
          // 更新 LINE ID
          const updateResult = await usersCollection.updateOne(
            { _id: userId },
            { 
              $set: { 
                lineId: correctLineId,
                lineUserId: correctLineId,
                updatedAt: new Date()
              }
            }
          );
          
          if (updateResult.modifiedCount > 0) {
            console.log('✅ MongoDB 用戶資料已更新');
            
            // 驗證更新
            const updatedUser = await usersCollection.findOne({ _id: userId });
            console.log('新的 LINE ID:', updatedUser.lineId);
            console.log('新的 LINE User ID:', updatedUser.lineUserId);
          } else {
            console.log('❌ MongoDB 更新失敗');
          }
        } else {
          console.log('❌ MongoDB 中未找到用戶');
        }
        
        await mongoose.disconnect();
        
      } catch (mongoError) {
        console.log('❌ MongoDB 操作失敗:', mongoError.message);
      }
    }

    // 方法 2: 驗證修復結果
    console.log('\n🧪 驗證修復結果...');
    const verifyResponse = await fetch('http://localhost:3000/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (verifyResponse.ok) {
      const userData = await verifyResponse.json();
      const user = userData.data.user;
      
      console.log('📊 修復後的用戶資料:');
      console.log('  LINE ID:', user.lineId);
      console.log('  LINE User ID:', user.lineUserId);
      
      if (user.lineId === correctLineId) {
        console.log('✅ 修復成功！');
        
        // 測試 LINE 通知
        console.log('\n📱 測試 LINE 通知...');
        const testResponse = await fetch('http://localhost:3000/api/notifications/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            method: 'line',
            symbol: 'BTCUSDT'
          })
        });
        
        const testResult = await testResponse.json();
        
        if (testResult.status === 'success') {
          console.log('✅ LINE 通知測試成功！');
          console.log('請檢查您的 LINE 是否收到測試訊息');
        } else {
          console.log('❌ LINE 通知測試失敗');
          console.log('錯誤:', testResult.message);
        }
        
      } else {
        console.log('❌ 修復失敗，LINE ID 仍不正確');
      }
    }

  } catch (error) {
    console.error('❌ 修復失敗:', error.message);
  }
}

// 執行修復
fixUserViaAPI();