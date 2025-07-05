#!/usr/bin/env node

/**
 * NexusTrade 資料庫使用者資料檢查工具
 * 檢查實際資料庫中的使用者資料結構
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkDatabaseUsers() {
  console.log('🔍 開始檢查資料庫中的使用者資料...');
  
  try {
    // 連接 MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexustrade';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB 連接成功');
    
    // 檢查 users 集合
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // 獲取所有使用者
    const users = await usersCollection.find({}).toArray();
    console.log(`📊 找到 ${users.length} 個使用者`);
    
    if (users.length === 0) {
      console.log('⚠️ 資料庫中沒有使用者資料');
      return;
    }
    
    // 分析每個使用者的資料結構
    users.forEach((user, index) => {
      console.log(`\n👤 使用者 ${index + 1}:`);
      console.log(`  ID: ${user._id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Username: ${user.username || '無'}`);
      console.log(`  名稱: ${user.profile?.displayName || user.profile?.firstName + ' ' + user.profile?.lastName || '無'}`);
      console.log(`  提供者: ${user.profile?.provider || '無'}`);
      console.log(`  Google ID: ${user.googleId || '無'}`);
      console.log(`  LINE ID: ${user.lineId || '無'}`);
      console.log(`  LINE User ID: ${user.lineUserId || '❌ 缺少'}`);
      console.log(`  最後登入: ${user.lastLoginAt || '無'}`);
      console.log(`  最後登入 IP: ${user.lastLoginIP || '無'}`);
      
      // 檢查是否為 LINE 使用者但缺少 lineUserId
      if (user.email && user.email.includes('line_') && !user.lineUserId) {
        console.log(`  🚨 問題: LINE 使用者缺少 lineUserId 欄位！`);
        
        // 嘗試從 email 提取 LINE User ID
        const lineIdMatch = user.email.match(/line_([^@]+)@/);
        if (lineIdMatch) {
          const extractedLineId = lineIdMatch[1];
          console.log(`  💡 可從 email 提取的 LINE ID: ${extractedLineId}`);
        }
      }
      
      // 顯示完整資料結構（供參考）
      console.log(`  完整資料:`, JSON.stringify(user, null, 2));
    });
    
    // 檢查特定的 Vic Huang 使用者
    console.log('\n🔍 搜尋 Vic Huang 使用者...');
    const vicUser = await usersCollection.findOne({
      $or: [
        { 'profile.displayName': 'Vic Huang' },
        { email: /vic/i },
        { email: /line_.*@/ }
      ]
    });
    
    if (vicUser) {
      console.log('✅ 找到 Vic Huang 使用者:');
      console.log(JSON.stringify(vicUser, null, 2));
      
      // 檢查是否需要修復
      if (vicUser.email && vicUser.email.includes('line_') && !vicUser.lineUserId) {
        console.log('\n🔧 正在修復 Vic Huang 的 lineUserId...');
        
        const lineIdMatch = vicUser.email.match(/line_([^@]+)@/);
        if (lineIdMatch) {
          const lineUserId = lineIdMatch[1];
          
          await usersCollection.updateOne(
            { _id: vicUser._id },
            { 
              $set: { 
                lineUserId: lineUserId,
                lineId: lineUserId // 確保兩個欄位都存在
              }
            }
          );
          
          console.log(`✅ 已為 Vic Huang 添加 lineUserId: ${lineUserId}`);
          
          // 驗證修復結果
          const updatedUser = await usersCollection.findOne({ _id: vicUser._id });
          console.log('✅ 修復後的使用者資料:');
          console.log(JSON.stringify(updatedUser, null, 2));
        }
      }
    } else {
      console.log('❌ 沒有找到 Vic Huang 使用者');
    }
    
  } catch (error) {
    console.error('❌ 檢查過程發生錯誤:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 已斷開 MongoDB 連接');
  }
}

// 執行檢查
checkDatabaseUsers()
  .then(() => {
    console.log('\n✅ 資料庫檢查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 資料庫檢查失敗:', error);
    process.exit(1);
  });