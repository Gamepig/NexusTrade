/**
 * 修復使用者的會員制度欄位
 */

// 載入環境變數
require('dotenv').config();

async function fixMembershipFields() {
  console.log('🔧 修復使用者的會員制度欄位...\n');

  try {
    // 連接資料庫
    const { initializeDatabase } = require('./src/config/database');
    await initializeDatabase();
    
    console.log('✅ 資料庫連接成功\n');

    // 載入使用者模型
    const User = require('./src/models/User.model');
    
    // 查找目標使用者
    const targetUser = await User.findById('6867bc852b8316e0d4b7f2ca');
    
    if (!targetUser) {
      throw new Error('未找到目標使用者');
    }
    
    console.log('✅ 找到目標使用者:', targetUser.email);
    
    // 檢查是否已有會員制度欄位
    console.log('\n🔍 檢查現有會員制度欄位...');
    console.log('會員等級:', targetUser.membershipLevel || '未設定');
    console.log('警報配額:', targetUser.alertQuota || '未設定');
    console.log('付費功能:', targetUser.premiumFeatures || '未設定');
    
    // 添加會員制度欄位
    const membershipFields = {
      membershipLevel: 'free',
      membershipExpiry: null,
      alertQuota: {
        used: 4, // 目前已使用數量
        limit: 1 // 免費會員限制
      },
      premiumFeatures: {
        technicalIndicators: false,
        unlimitedAlerts: false,
        prioritySupport: false
      }
    };
    
    // 使用 MongoDB 原生操作更新
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    const updateResult = await usersCollection.updateOne(
      { _id: targetUser._id },
      { 
        $set: membershipFields
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log('\n✅ 會員制度欄位已添加');
    } else {
      console.log('\n⚠️ 會員制度欄位可能已存在');
    }
    
    // 驗證更新結果
    console.log('\n🧪 驗證更新結果...');
    const updatedUser = await User.findById('6867bc852b8316e0d4b7f2ca');
    
    console.log('更新後的會員等級:', updatedUser.membershipLevel);
    console.log('更新後的警報配額:', updatedUser.alertQuota);
    console.log('更新後的付費功能:', updatedUser.premiumFeatures);
    
    // 測試會員制度 API
    console.log('\n📡 測試會員制度 API...');
    const fetch = (await import('node-fetch')).default;
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODY3YmM4NTJiODMxNmUwZDRiN2YyY2EiLCJlbWFpbCI6ImxpbmVfdWU1Y2MxODhlMWQyY2RiYWM1Y2ZkYTJhYmI2ZjZhMzRiQGV4YW1wbGUuY29tIiwiaWF0IjoxNzUxNjI4OTMzLCJleHAiOjE3NTIyMzM3MzN9.7z719d45nrOFIdGRm6ZqO7WQYVw7m6O7ZInPzAguVQE';
    
    const membershipResponse = await fetch('http://localhost:3000/api/notifications/membership', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (membershipResponse.ok) {
      const membershipData = await membershipResponse.json();
      console.log('✅ 會員制度 API 測試成功');
      console.log('API 回應:', JSON.stringify(membershipData, null, 2));
    } else {
      console.log('❌ 會員制度 API 測試失敗');
      console.log('狀態碼:', membershipResponse.status);
      const errorText = await membershipResponse.text();
      console.log('錯誤:', errorText);
    }
    
    // 測試創建新警報時的配額檢查
    console.log('\n🔔 測試警報配額檢查...');
    const alertResponse = await fetch('http://localhost:3000/api/notifications/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        symbol: 'ETHUSDT',
        alertType: 'price_above',
        targetPrice: 5000,
        notificationMethods: {
          lineMessaging: {
            enabled: true
          }
        }
      })
    });
    
    const alertResult = await alertResponse.json();
    
    if (alertResponse.ok) {
      console.log('❌ 配額檢查失敗！應該要被阻擋但卻成功創建了');
      console.log('警報 ID:', alertResult.data.alert.id);
    } else {
      console.log('✅ 配額檢查正常運作');
      console.log('錯誤回應:', JSON.stringify(alertResult, null, 2));
    }
    
    // 檢查每日 AI 分析
    console.log('\n🤖 檢查每日 AI 分析服務...');
    
    // 檢查 AI 分析排程器
    try {
      const aiScheduler = require('./src/services/daily-ai-scheduler.service');
      console.log('AI 排程器已載入');
      
      // 檢查是否有 AI 分析訂閱
      const PriceAlert = require('./src/models/PriceAlert');
      const aiSubscriptions = await PriceAlert.find({
        'aiAnalysisSubscription.enabled': true
      });
      
      console.log(`找到 ${aiSubscriptions.length} 個 AI 分析訂閱`);
      aiSubscriptions.forEach((alert, index) => {
        console.log(`${index + 1}. ${alert.symbol} - 訂閱時間: ${alert.aiAnalysisSubscription.subscribedAt}`);
      });
      
    } catch (error) {
      console.log('❌ AI 排程器檢查失敗:', error.message);
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
fixMembershipFields();