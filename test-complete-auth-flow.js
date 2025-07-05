#!/usr/bin/env node

/**
 * 完整認證流程測試
 * 測試從資料庫到前端的完整認證流程
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function testCompleteAuthFlow() {
  console.log('🧪 開始完整認證流程測試...');
  
  try {
    // 1. 連接 MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexustrade';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB 連接成功');
    
    // 2. 檢查資料庫中的 Vic Huang 使用者
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    const vicUser = await usersCollection.findOne({
      _id: 'ue5cc188e1d2cdbac5cfda2abb6f6a34b'
    });
    
    if (!vicUser) {
      console.log('❌ 沒有找到 Vic Huang 使用者');
      return;
    }
    
    console.log('✅ 資料庫中的 Vic Huang 使用者:');
    console.log(`  Name: ${vicUser.profile?.displayName}`);
    console.log(`  Email: ${vicUser.email}`);
    console.log(`  Provider: line`);
    console.log(`  LINE ID: ${vicUser.lineId || '❌ 缺少'}`);
    console.log(`  LINE User ID: ${vicUser.lineUserId || '❌ 缺少'}`);
    
    // 3. 使用 MockUser 類別測試
    const { MockUser } = require('./src/controllers/auth.controller.mock');
    
    const mockUser = await MockUser.findById('ue5cc188e1d2cdbac5cfda2abb6f6a34b');
    
    if (mockUser) {
      console.log('\n✅ MockUser 查詢結果:');
      console.log(`  Name: ${mockUser.profile?.displayName}`);
      console.log(`  Email: ${mockUser.email}`);
      console.log(`  LINE ID: ${mockUser.lineId || '❌ 缺少'}`);
      console.log(`  LINE User ID: ${mockUser.lineUserId || '❌ 缺少'}`);
      
      // 4. 測試前端認證邏輯
      console.log('\n🔍 測試前端認證邏輯:');
      
      // 模擬前端的 getCurrentUser 方法
      const frontendUser = {
        name: mockUser.profile?.displayName,
        email: mockUser.email,
        provider: 'line',
        lineUserId: mockUser.lineUserId,
        lineId: mockUser.lineId
      };
      
      const token = 'mock_token_12345';
      const isAuthenticated = !!(token && frontendUser);
      console.log(`  認證狀態: ${isAuthenticated ? '✅ 已認證' : '❌ 未認證'}`);
      
      // 模擬 LINE 連接狀態檢查
      const isLineConnected = !!(frontendUser.lineUserId || frontendUser.lineId || (frontendUser.provider === 'line'));
      console.log(`  LINE 連接: ${isLineConnected ? '✅ 已連接' : '❌ 未連接'}`);
      
      // 模擬 PriceAlertModal 邏輯
      let expectedBehavior = '';
      if (!isAuthenticated) {
        expectedBehavior = '🔐 顯示登入提示';
      } else if (!isLineConnected) {
        expectedBehavior = '📱 顯示 LINE 連接選項';
      } else {
        expectedBehavior = '✅ 顯示完整警報表單';
      }
      
      console.log(`  預期行為: ${expectedBehavior}`);
      
      // 5. 測試 API 回應格式
      console.log('\n📡 測試 API 回應格式:');
      
      // 模擬 verify API 的回應
      const apiResponse = {
        id: mockUser._id,
        email: mockUser.email,
        username: mockUser.username,
        profile: mockUser.profile,
        emailVerified: mockUser.emailVerified,
        status: mockUser.status,
        lastLoginAt: mockUser.lastLoginAt,
        googleId: mockUser.googleId,
        lineId: mockUser.lineId,
        lineUserId: mockUser.lineUserId,
        provider: mockUser.profile?.provider || (mockUser.googleId ? 'google' : mockUser.lineId ? 'line' : null)
      };
      
      console.log('  API 回應將包含:');
      console.log(`    lineId: ${apiResponse.lineId || '❌ 缺少'}`);
      console.log(`    lineUserId: ${apiResponse.lineUserId || '❌ 缺少'}`);
      console.log(`    provider: ${apiResponse.provider || '❌ 缺少'}`);
      
      // 6. 建議修復步驟
      console.log('\n💡 建議給使用者的修復步驟:');
      console.log('1. 訪問 http://localhost:3000/force-auth-sync.html');
      console.log('2. 點擊 "從伺服器強制同步"');
      console.log('3. 驗證同步結果');
      console.log('4. 回到主頁面測試 "設定通知" 功能');
      
      if (!mockUser.lineUserId) {
        console.log('\n🚨 警告: 使用者仍然缺少 lineUserId，需要修復資料庫');
        
        // 嘗試自動修復
        if (mockUser.lineId) {
          mockUser.lineUserId = mockUser.lineId;
          await mockUser.save();
          console.log('✅ 已自動修復 lineUserId');
        } else if (mockUser.email && mockUser.email.includes('line_')) {
          const lineIdMatch = mockUser.email.match(/line_([^@]+)@/);
          if (lineIdMatch) {
            mockUser.lineUserId = lineIdMatch[1];
            mockUser.lineId = lineIdMatch[1];
            await mockUser.save();
            console.log('✅ 已從 email 提取並修復 lineUserId');
          }
        }
      }
      
    } else {
      console.log('❌ MockUser 查詢失敗');
    }
    
  } catch (error) {
    console.error('❌ 測試過程發生錯誤:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 已斷開 MongoDB 連接');
  }
}

// 執行測試
testCompleteAuthFlow()
  .then(() => {
    console.log('\n✅ 完整認證流程測試完成');
    console.log('\n📋 下一步操作:');
    console.log('1. 請使用者訪問 http://localhost:3000/force-auth-sync.html');
    console.log('2. 執行強制同步');
    console.log('3. 測試設定通知功能');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 測試失敗:', error);
    process.exit(1);
  });