/**
 * 檢查原始 MongoDB 資料
 */

// 載入環境變數
require('dotenv').config();

async function checkRawMongoDB() {
  console.log('🔍 檢查原始 MongoDB 資料...\n');

  try {
    // 連接資料庫
    const { initializeDatabase } = require('./src/config/database');
    await initializeDatabase();
    
    console.log('✅ 資料庫連接成功\n');

    // 直接使用 MongoDB 原生操作
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // 查找特定使用者的原始資料
    console.log('🔍 查找特定使用者的原始資料...');
    const rawUser = await usersCollection.findOne({
      lineId: 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b'
    });
    
    if (rawUser) {
      console.log('✅ 找到原始使用者資料:');
      console.log('原始 _id 類型:', typeof rawUser._id);
      console.log('原始 _id 值:', rawUser._id);
      console.log('Email:', rawUser.email);
      console.log('LINE ID:', rawUser.lineId);
      
      // 嘗試使用這個 _id 進行 Mongoose 查詢
      console.log('\n🧪 測試 Mongoose 查詢...');
      const User = require('./src/models/User.model');
      
      // 測試不同的查詢方式
      console.log('1. 使用原始 _id 查詢:');
      const userById = await User.findById(rawUser._id);
      console.log('結果:', userById ? `找到使用者 ${userById.email}` : '未找到');
      
      console.log('\n2. 使用 _id.toString() 查詢:');
      const userByStringId = await User.findById(rawUser._id.toString());
      console.log('結果:', userByStringId ? `找到使用者 ${userByStringId.email}` : '未找到');
      
      console.log('\n3. 使用 lineId 查詢:');
      const userByLineId = await User.findOne({ lineId: 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b' });
      console.log('結果:', userByLineId ? `找到使用者，_id: ${userByLineId._id}` : '未找到');
      
      // 如果找到使用者，生成 JWT token 並測試
      if (userByLineId && userByLineId._id) {
        console.log('\n🔑 生成 JWT Token...');
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
          { 
            userId: userByLineId._id.toString(),
            email: userByLineId.email
          }, 
          process.env.JWT_SECRET, 
          { expiresIn: '7d' }
        );
        
        console.log('✅ JWT Token 已生成');
        console.log('使用者 ID:', userByLineId._id.toString());
        console.log('Token:', token.substring(0, 50) + '...');
        
        // 測試認證 API
        console.log('\n📡 測試認證 API...');
        const fetch = (await import('node-fetch')).default;
        
        const verifyResponse = await fetch('http://localhost:3000/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (verifyResponse.ok) {
          const userData = await verifyResponse.json();
          console.log('✅ 認證 API 成功');
          console.log('認證用戶 ID:', userData.data.user.id);
          console.log('認證用戶 Email:', userData.data.user.email);
          console.log('認證用戶 LINE ID:', userData.data.user.lineId);
        } else {
          console.log('❌ 認證 API 失敗');
          console.log('狀態碼:', verifyResponse.status);
          const errorText = await verifyResponse.text();
          console.log('錯誤:', errorText);
        }
        
        // 測試價格警報 API
        console.log('\n🔔 測試價格警報創建 API...');
        const alertResponse = await fetch('http://localhost:3000/api/notifications/alerts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            symbol: 'BTCUSDT',
            alertType: 'price_above',
            targetPrice: 100000,
            notificationMethods: {
              lineMessaging: {
                enabled: true
              }
            }
          })
        });
        
        const alertResult = await alertResponse.json();
        
        if (alertResponse.ok) {
          console.log('✅ 價格警報創建成功');
          console.log('警報 ID:', alertResult.data.alert.id);
        } else {
          console.log('❌ 價格警報創建失敗');
          console.log('狀態碼:', alertResponse.status);
          console.log('錯誤:', JSON.stringify(alertResult, null, 2));
        }
      }
      
    } else {
      console.log('❌ 未找到原始使用者資料');
    }
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
    console.error(error.stack);
  } finally {
    // 關閉資料庫連接
    const { disconnectDB } = require('./src/config/database');
    await disconnectDB();
    process.exit(0);
  }
}

// 執行檢查
checkRawMongoDB();