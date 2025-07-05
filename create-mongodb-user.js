/**
 * 創建正式的 MongoDB 使用者資料
 * 將 MockUser 資料轉移到正式的 MongoDB User 模型
 */

// 載入環境變數
require('dotenv').config();

async function createMongoDBUser() {
  console.log('🔧 創建正式的 MongoDB 使用者資料...\n');

  try {
    // 連接資料庫
    const { initializeDatabase } = require('./src/config/database');
    await initializeDatabase();
    
    console.log('✅ 資料庫連接成功\n');

    // 載入使用者模型
    const User = require('./src/models/User.model');
    
    // 檢查是否已存在用戶 (使用 LINE ID 查找)
    const existingUser = await User.findOne({ 
      lineId: 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b'
    });
    
    let finalUser = null;
    
    if (existingUser) {
      console.log('✅ 用戶已存在');
      console.log('用戶 ID:', existingUser._id);
      console.log('Email:', existingUser.email);
      console.log('LINE ID:', existingUser.lineId);
      finalUser = existingUser;
      
    } else {
      console.log('🔄 創建新用戶...');
      
      // 創建新用戶 (讓 MongoDB 自動生成 ObjectId)
      const newUser = new User({
        email: 'line_ue5cc188e1d2cdbac5cfda2abb6f6a34b@example.com',
        username: 'vic_huang',
        displayName: 'Vic Huang',
        avatar: 'https://profile.line-scdn.net/0he27Lgff1Oh0aNRC2EBlEYmplOXc5RGMPN1FwKS8yZH0vAypDZQF2K3o9NChzA3VKY1NyfSZiZSsWJk17BGPGKR0FZywmA31OMVV9-A',
        lineId: 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b',
        // 第三方登入用戶不需要密碼
        preferences: {
          language: 'zh-TW',
          timezone: 'Asia/Taipei',
          currency: 'TWD',
          notifications: {
            email: true,
            line: true,
            push: true
          }
        },
        status: 'active',
        emailVerified: true,
        lastLogin: new Date()
      });
      
      await newUser.save();
      
      console.log('✅ 新用戶創建成功');
      console.log('用戶 ID:', newUser._id);
      console.log('Email:', newUser.email);
      console.log('LINE ID:', newUser.lineId);
      finalUser = newUser;
    }
    
    if (!finalUser) {
      throw new Error('無法找到或創建用戶');
    }
    
    // 測試查詢
    console.log('\n🧪 測試用戶查詢...');
    const testUser = await User.findById(finalUser._id);
    
    if (testUser) {
      console.log('✅ 查詢成功');
      console.log('找到用戶:', testUser.displayName);
      console.log('LINE ID:', testUser.lineId);
      console.log('狀態:', testUser.status);
    } else {
      console.log('❌ 查詢失敗，未找到用戶');
    }
    
    // 生成測試 JWT Token (使用正確的 MongoDB ObjectId)
    console.log('\n🔑 生成測試 JWT Token...');
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        userId: finalUser._id.toString(),
        email: finalUser.email
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    console.log('✅ JWT Token 已生成');
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
      console.log('API 回應:', JSON.stringify(userData.data, null, 2));
    } else {
      console.log('❌ API 認證失敗');
      console.log('狀態碼:', verifyResponse.status);
      const errorText = await verifyResponse.text();
      console.log('錯誤:', errorText);
    }
    
    console.log('\n🎉 MongoDB 使用者建立完成！');
    console.log('\n📋 下一步測試：');
    console.log('1. 使用新的 JWT Token 測試價格警報 API');
    console.log('2. 測試 LINE 通知功能');
    console.log('3. 驗證前端登入狀態');
    
  } catch (error) {
    console.error('❌ 操作失敗:', error.message);
    console.error(error.stack);
  } finally {
    // 關閉資料庫連接
    const { disconnectDB } = require('./src/config/database');
    await disconnectDB();
    process.exit(0);
  }
}

// 執行創建
createMongoDBUser();