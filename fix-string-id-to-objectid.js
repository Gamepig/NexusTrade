/**
 * 修復字串 ID 為 ObjectId 的問題
 * 將 MockUser 的字串 ID 轉換為正確的 MongoDB ObjectId
 */

// 載入環境變數
require('dotenv').config();

async function fixStringIdToObjectId() {
  console.log('🔧 修復字串 ID 為 ObjectId...\n');

  try {
    // 連接資料庫
    const { initializeDatabase } = require('./src/config/database');
    await initializeDatabase();
    
    console.log('✅ 資料庫連接成功\n');

    // 直接使用 MongoDB 原生操作
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // 查找有字串 ID 的使用者
    console.log('🔍 查找有字串 ID 的使用者...');
    const stringIdUsers = await usersCollection.find({
      _id: { $type: "string" }
    }).toArray();
    
    console.log(`找到 ${stringIdUsers.length} 個使用字串 ID 的使用者`);
    
    for (const user of stringIdUsers) {
      console.log(`\n🔧 修復使用者: ${user.email}`);
      console.log(`舊 ID (字串): ${user._id}`);
      
      // 創建新的 ObjectId
      const ObjectId = mongoose.Types.ObjectId;
      const newId = new ObjectId();
      
      console.log(`新 ID (ObjectId): ${newId}`);
      
      // 保存舊 ID 作為參考
      const oldStringId = user._id;
      
      // 移除舊文檔
      await usersCollection.deleteOne({ _id: oldStringId });
      
      // 創建新文檔並設定正確的 _id
      const newUser = {
        ...user,
        _id: newId,
        oldStringId: oldStringId, // 保存舊 ID 作為參考
        migratedAt: new Date()
      };
      
      await usersCollection.insertOne(newUser);
      
      console.log(`✅ 使用者 ${user.email} 已修復`);
      
      // 如果這是我們的目標使用者，生成 JWT token 並進行全面測試
      if (user.lineId === 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b') {
        console.log('\n🎯 這是目標使用者，進行全面測試...');
        
        // 驗證 Mongoose 查詢
        console.log('\n🧪 驗證 Mongoose 查詢...');
        const User = require('./src/models/User.model');
        
        const verifyUser = await User.findById(newId);
        if (verifyUser) {
          console.log('✅ Mongoose 查詢成功');
          console.log('使用者 ID:', verifyUser._id);
          console.log('Email:', verifyUser.email);
          console.log('LINE ID:', verifyUser.lineId);
        } else {
          console.log('❌ Mongoose 查詢失敗');
        }
        
        // 生成新的 JWT Token
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
        console.log('Token:', token);
        
        // 測試認證中介軟體
        console.log('\n📡 測試認證中介軟體...');
        const fetch = (await import('node-fetch')).default;
        
        const verifyResponse = await fetch('http://localhost:3000/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (verifyResponse.ok) {
          const userData = await verifyResponse.json();
          console.log('✅ 認證中介軟體測試成功');
          console.log('回應使用者 ID:', userData.data.user.id);
          console.log('回應使用者 Email:', userData.data.user.email);
          console.log('回應使用者 LINE ID:', userData.data.user.lineId);
        } else {
          console.log('❌ 認證中介軟體測試失敗');
          console.log('狀態碼:', verifyResponse.status);
          const errorText = await verifyResponse.text();
          console.log('錯誤:', errorText);
        }
        
        // 測試價格警報創建
        console.log('\n🔔 測試價格警報創建...');
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
          console.log('LINE 通知已啟用:', alertResult.data.alert.notificationMethods.lineMessaging.enabled);
        } else {
          console.log('❌ 價格警報創建失敗');
          console.log('狀態碼:', alertResponse.status);
          console.log('錯誤詳情:', JSON.stringify(alertResult, null, 2));
        }
        
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
        
        if (testResponse.ok) {
          console.log('✅ LINE 通知測試成功');
          console.log('測試結果:', JSON.stringify(testResult.data.results, null, 2));
        } else {
          console.log('❌ LINE 通知測試失敗');
          console.log('錯誤:', JSON.stringify(testResult, null, 2));
        }
        
        // 輸出前端使用的資訊
        console.log('\n📋 前端使用資訊:');
        console.log(`新的使用者 ID: ${newId.toString()}`);
        console.log(`JWT Token: ${token}`);
        console.log(`\n前端修復步驟:`);
        console.log(`1. 在瀏覽器中清除 localStorage`);
        console.log(`2. 設定新的認證資訊:`);
        console.log(`   localStorage.setItem('nexustrade_token', '${token}');`);
        console.log(`   localStorage.setItem('nexustrade_user', '${JSON.stringify({
          id: newId.toString(),
          email: user.email,
          lineId: user.lineId,
          lineUserId: user.lineUserId
        })}');`);
      }
    }
    
    console.log('\n🎉 所有使用者 ID 修復完成！');
    
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
fixStringIdToObjectId();