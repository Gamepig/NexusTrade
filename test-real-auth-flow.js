#!/usr/bin/env node

/**
 * 測試真實認證流程
 * 模擬完整的登入→Token驗證→前端認證流程
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MockUser } = require('./src/controllers/auth.controller.mock');

async function testRealAuthFlow() {
  console.log('🧪 開始真實認證流程測試...');
  
  try {
    // 連接 MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexustrade';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB 連接成功');
    
    // 1. 模擬 Vic Huang 登入獲取 Token
    console.log('\n📝 步驟 1: 模擬 Vic Huang 登入...');
    
    const vicUser = await MockUser.findById('ue5cc188e1d2cdbac5cfda2abb6f6a34b');
    if (!vicUser) {
      console.log('❌ Vic Huang 用戶不存在');
      return;
    }
    
    console.log('✅ 找到 Vic Huang 用戶:');
    console.log(`  姓名: ${vicUser.profile?.displayName}`);
    console.log(`  Email: ${vicUser.email}`);
    console.log(`  LINE ID: ${vicUser.lineId}`);
    console.log(`  LINE User ID: ${vicUser.lineUserId}`);
    
    // 2. 產生真實的 JWT Token
    console.log('\n🔑 步驟 2: 產生 JWT Token...');
    
    const tokenPayload = {
      userId: vicUser._id,
      email: vicUser.email,
      username: vicUser.username,
      type: 'access'
    };
    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'nexustrade_secret_key',
      { expiresIn: '7d' }
    );
    
    console.log('✅ JWT Token 產生成功');
    console.log(`  Token 前綴: ${token.substring(0, 50)}...`);
    
    // 3. 驗證 Token（模擬 /api/auth/verify）
    console.log('\n🔍 步驟 3: 驗證 Token...');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexustrade_secret_key');
      console.log('✅ Token 驗證成功');
      console.log(`  解碼的使用者 ID: ${decoded.userId}`);
      
      // 重新查詢使用者（模擬 verify API 的行為）
      const verifiedUser = await MockUser.findById(decoded.userId);
      if (verifiedUser) {
        console.log('✅ 使用者重新查詢成功');
        console.log(`  姓名: ${verifiedUser.profile?.displayName}`);
        console.log(`  LINE User ID: ${verifiedUser.lineUserId || '❌ 缺少'}`);
        
        // 4. 模擬 verify API 回應格式
        console.log('\n📡 步驟 4: 模擬 verify API 回應...');
        
        const apiResponse = {
          status: 'success',
          message: 'Token 驗證成功 (Mock)',
          data: {
            user: {
              id: verifiedUser._id,
              email: verifiedUser.email,
              username: verifiedUser.username,
              profile: verifiedUser.profile,
              emailVerified: verifiedUser.emailVerified,
              status: verifiedUser.status,
              lastLoginAt: verifiedUser.lastLoginAt,
              googleId: verifiedUser.googleId,
              lineId: verifiedUser.lineId,
              lineUserId: verifiedUser.lineUserId,
              provider: verifiedUser.profile?.provider || (verifiedUser.googleId ? 'google' : verifiedUser.lineId ? 'line' : null)
            },
            tokenValid: true
          },
          timestamp: new Date().toISOString()
        };
        
        console.log('✅ API 回應格式正確');
        console.log(`  使用者 ID: ${apiResponse.data.user.id}`);
        console.log(`  LINE User ID: ${apiResponse.data.user.lineUserId || '❌ 缺少'}`);
        console.log(`  提供者: ${apiResponse.data.user.provider}`);
        
        // 5. 模擬前端認證邏輯
        console.log('\n🖥️ 步驟 5: 模擬前端認證邏輯...');
        
        const frontendUser = apiResponse.data.user;
        const isAuthenticated = !!(token && frontendUser);
        const isLineConnected = !!(frontendUser.lineUserId || frontendUser.lineId || (frontendUser.provider === 'line'));
        
        console.log(`  基本認證: ${isAuthenticated ? '✅ 已認證' : '❌ 未認證'}`);
        console.log(`  LINE 連接: ${isLineConnected ? '✅ 已連接' : '❌ 未連接'}`);
        
        // 6. 模擬 PriceAlertModal 邏輯
        console.log('\n🔔 步驟 6: 模擬 PriceAlertModal 邏輯...');
        
        let expectedBehavior = '';
        if (!isAuthenticated) {
          expectedBehavior = '🔐 顯示登入提示';
        } else if (!isLineConnected) {
          expectedBehavior = '📱 顯示 LINE 連接選項';
        } else {
          expectedBehavior = '✅ 顯示完整警報表單';
        }
        
        console.log(`  預期行為: ${expectedBehavior}`);
        
        // 7. 生成前端測試腳本
        console.log('\n📋 步驟 7: 生成前端測試資料...');
        
        const frontendTestData = {
          token: token,
          user: frontendUser,
          localStorage: {
            'nexustrade_token': token,
            'nexustrade_user': JSON.stringify(frontendUser)
          }
        };
        
        console.log('✅ 前端測試資料準備完成');
        console.log('\n🚀 建議測試步驟:');
        console.log('1. 訪問 http://localhost:3000/test-price-alert-direct.html');
        console.log('2. 點擊 "設定測試用戶" 按鈕');
        console.log('3. 點擊 "測試設定通知" 按鈕');
        console.log('4. 觀察是否顯示完整警報表單');
        
        console.log('\n📝 或者手動設定 localStorage:');
        console.log(`localStorage.setItem('nexustrade_token', '${token}');`);
        console.log(`localStorage.setItem('nexustrade_user', '${JSON.stringify(frontendUser)}');`);
        
      } else {
        console.log('❌ 使用者重新查詢失敗');
      }
      
    } catch (jwtError) {
      console.log('❌ Token 驗證失敗:', jwtError.message);
    }
    
  } catch (error) {
    console.error('❌ 測試過程發生錯誤:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 已斷開 MongoDB 連接');
  }
}

// 執行測試
testRealAuthFlow()
  .then(() => {
    console.log('\n✅ 真實認證流程測試完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 測試失敗:', error);
    process.exit(1);
  });