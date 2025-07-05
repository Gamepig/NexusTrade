/**
 * 修復 MongoDB 使用者的 ObjectId 問題
 */

// 載入環境變數
require('dotenv').config();

async function fixMongoDBObjectId() {
  console.log('🔧 修復 MongoDB ObjectId 問題...\n');

  try {
    // 連接資料庫
    const { initializeDatabase } = require('./src/config/database');
    await initializeDatabase();
    
    console.log('✅ 資料庫連接成功\n');

    // 直接使用 MongoDB 原生操作
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // 查找有問題的使用者
    console.log('🔍 查找有問題的使用者...');
    const problematicUsers = await usersCollection.find({
      _id: { $exists: false }
    }).toArray();
    
    console.log(`找到 ${problematicUsers.length} 個沒有 _id 的使用者`);
    
    for (const user of problematicUsers) {
      console.log(`\n🔧 修復使用者: ${user.email}`);
      
      // 為使用者創建新的 ObjectId
      const ObjectId = mongoose.Types.ObjectId;
      const newId = new ObjectId();
      
      console.log(`新的 ObjectId: ${newId}`);
      
      // 移除舊文檔
      await usersCollection.deleteOne({ email: user.email });
      
      // 插入新文檔並設定正確的 _id
      const newUser = {
        ...user,
        _id: newId
      };
      
      await usersCollection.insertOne(newUser);
      
      console.log(`✅ 使用者 ${user.email} 已修復`);
      
      // 如果這是我們的目標使用者，生成 JWT token
      if (user.lineId === 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b') {
        console.log('\n🔑 生成新的 JWT Token...');
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
          { 
            userId: newId.toString(),
            email: user.email
          }, 
          process.env.JWT_SECRET, 
          { expiresIn: '7d' }
        );
        
        console.log('✅ JWT Token 已生成');
        console.log('新的使用者 ID:', newId.toString());
        console.log('Token:', token.substring(0, 50) + '...');
        
        // 測試 API 認證
        console.log('\n📡 測試 API 認證...');
        const fetch = (await import('node-fetch')).default;
        
        const verifyResponse = await fetch('http://localhost:3000/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (verifyResponse.ok) {
          const userData = await verifyResponse.json();
          console.log('✅ API 認證成功');
          console.log('使用者資料:', JSON.stringify(userData.data.user, null, 2));
        } else {
          console.log('❌ API 認證失敗');
          console.log('狀態碼:', verifyResponse.status);
          const errorText = await verifyResponse.text();
          console.log('錯誤:', errorText);
        }
        
        // 測試價格警報 API
        console.log('\n💡 測試價格警報 API...');
        const alertResponse = await fetch('http://localhost:3000/api/notifications/test', {
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
        
        const alertResult = await alertResponse.json();
        
        if (alertResponse.ok) {
          console.log('✅ 價格警報 API 測試成功');
          console.log('回應:', JSON.stringify(alertResult, null, 2));
        } else {
          console.log('❌ 價格警報 API 測試失敗');
          console.log('狀態碼:', alertResponse.status);
          console.log('錯誤:', JSON.stringify(alertResult, null, 2));
        }
      }
    }
    
    // 驗證修復結果
    console.log('\n📊 驗證修復結果...');
    const User = require('./src/models/User.model');
    const fixedUser = await User.findOne({ lineId: 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b' });
    
    if (fixedUser && fixedUser._id) {
      console.log('✅ 修復驗證成功');
      console.log('修復後的使用者 ID:', fixedUser._id);
      console.log('EMAIL:', fixedUser.email);
      console.log('LINE ID:', fixedUser.lineId);
    } else {
      console.log('❌ 修復驗證失敗');
    }
    
  } catch (error) {
    console.error('❌ 修復失敗:', error.message);
    console.error(error.stack);
  } finally {
    // 關閉資料庫連接
    const { disconnectDB } = require('./src/config/database');
    await disconnectDB();
    process.exit(0);
  }
}

// 執行修復
fixMongoDBObjectId();