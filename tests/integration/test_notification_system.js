/**
 * NexusTrade 通知系統完整測試腳本
 * 
 * 測試項目：
 * 1. 價格警報建立
 * 2. AI 分析訂閱
 * 3. LINE 通知模板
 * 4. 系統整合測試
 */

const mongoose = require('mongoose');
const PriceAlert = require('./src/models/PriceAlert');
const LineUser = require('./src/models/LineUser');
const lineMessageTemplates = require('./src/services/line-message-templates.service');

async function connectDatabase() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/nexustrade');
    console.log('✅ 資料庫連接成功');
  } catch (error) {
    console.error('❌ 資料庫連接失敗:', error.message);
    process.exit(1);
  }
}

async function testPriceAlertCreation() {
  console.log('\n📋 測試 1: 價格警報建立');
  
  try {
    // 建立測試價格警報
    const alertData = {
      userId: 'test_user_001',
      symbol: 'BTCUSDT',
      alertType: 'price_above',
      targetPrice: 105000,
      enabled: true,
      status: 'active',
      notificationMethods: {
        lineMessaging: {
          enabled: true,
          template: 'price_alert_flex'
        }
      },
      aiAnalysisSubscription: {
        enabled: true,
        frequency: 'daily',
        subscribedAt: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const priceAlert = new PriceAlert(alertData);
    await priceAlert.save();
    
    console.log('✅ 價格警報建立成功:', {
      id: priceAlert._id,
      symbol: priceAlert.symbol,
      targetPrice: priceAlert.targetPrice,
      aiSubscribed: priceAlert.aiAnalysisSubscription.enabled
    });
    
    return priceAlert;
  } catch (error) {
    console.error('❌ 價格警報建立失敗:', error.message);
    return null;
  }
}

async function testAISubscriptionQuery() {
  console.log('\n📋 測試 2: AI 分析訂閱查詢');
  
  try {
    const subscribedSymbols = await PriceAlert.getAISubscribedSymbols();
    console.log('✅ AI 訂閱貨幣查詢成功:', subscribedSymbols);
    
    const alertStats = await PriceAlert.getAlertStats('test_user_001');
    console.log('✅ 警報統計查詢成功:', alertStats);
    
  } catch (error) {
    console.error('❌ 查詢失敗:', error.message);
  }
}

async function testLineMessageTemplates() {
  console.log('\n📋 測試 3: LINE 訊息模板');
  
  try {
    // 測試價格警報模板
    const alertTemplate = lineMessageTemplates.templates.flex.priceAlert({
      symbol: 'BTCUSDT',
      currentPrice: '104850.50',
      targetPrice: '105000.00',
      changePercent: 2.5,
      alertType: 'above',
      timestamp: new Date()
    });
    
    console.log('✅ 價格警報 Flex Message 模板生成成功');
    console.log('📄 模板結構:', {
      type: alertTemplate.type,
      hasHeader: !!alertTemplate.header,
      hasBody: !!alertTemplate.body,
      hasFooter: !!alertTemplate.footer
    });
    
    // 測試文字模板
    const textTemplate = lineMessageTemplates.templates.text.priceAlert({
      symbol: 'BTCUSDT',
      currentPrice: '104850.50',
      targetPrice: '105000.00',
      changePercent: 2.5,
      alertType: 'above'
    });
    
    console.log('✅ 價格警報文字訊息模板生成成功');
    console.log('📄 文字內容 (前100字元):', textTemplate.substring(0, 100) + '...');
    
  } catch (error) {
    console.error('❌ 訊息模板測試失敗:', error.message);
  }
}

async function testLineUserManagement() {
  console.log('\n📋 測試 4: LINE 使用者管理');
  
  try {
    // 建立測試 LINE 使用者
    const lineUser = new LineUser({
      lineUserId: 'U1234567890abcdef1234567890abcdef',
      nexusTradeUserId: 'test_user_001',
      displayName: '測試使用者',
      statusMessage: '正在使用 NexusTrade',
      pictureUrl: 'https://example.com/avatar.jpg',
      isBlocked: false,
      isConnected: true,
      createdAt: new Date(),
      lastMessageAt: new Date()
    });
    
    await lineUser.save();
    console.log('✅ LINE 使用者建立成功:', {
      lineUserId: lineUser.lineUserId.substring(0, 8) + '...',
      nexusTradeUserId: lineUser.nexusTradeUserId,
      displayName: lineUser.displayName
    });
    
    // 測試查詢功能
    const foundUser = await LineUser.findByNexusTradeUserId('test_user_001');
    console.log('✅ 使用者查詢成功:', {
      found: !!foundUser,
      isConnected: foundUser?.isConnected
    });
    
  } catch (error) {
    console.error('❌ LINE 使用者管理測試失敗:', error.message);
  }
}

async function testSystemIntegration() {
  console.log('\n📋 測試 5: 系統整合測試');
  
  try {
    // 模擬價格觸發警報的流程
    const alerts = await PriceAlert.find({ 
      symbol: 'BTCUSDT',
      status: 'active',
      enabled: true 
    });
    
    console.log(`✅ 找到 ${alerts.length} 個活躍的 BTCUSDT 警報`);
    
    for (const alert of alerts) {
      // 模擬檢查價格觸發條件
      const currentPrice = 105100; // 模擬當前價格
      const isTriggered = (alert.alertType === 'price_above' && currentPrice >= alert.targetPrice) ||
                         (alert.alertType === 'price_below' && currentPrice <= alert.targetPrice);
      
      if (isTriggered) {
        console.log(`🚨 警報觸發! ${alert.symbol} 當前價格 $${currentPrice} ${alert.alertType === 'price_above' ? '超過' : '低於'} 目標 $${alert.targetPrice}`);
        
        // 模擬 LINE 使用者查詢
        const lineUser = await LineUser.findByNexusTradeUserId(alert.userId);
        if (lineUser) {
          console.log(`📱 準備發送 LINE 通知到: ${lineUser.displayName} (${lineUser.lineUserId.substring(0, 8)}...)`);
        } else {
          console.log('⚠️ 未找到對應的 LINE 使用者');
        }
      }
    }
    
    // 檢查 AI 分析訂閱
    const aiSubscribedSymbols = await PriceAlert.getAISubscribedSymbols();
    console.log(`🤖 AI 分析訂閱貨幣數量: ${aiSubscribedSymbols.length}`);
    
    if (aiSubscribedSymbols.length > 0) {
      console.log('📊 訂閱清單:', aiSubscribedSymbols.map(s => s.symbol).join(', '));
    }
    
  } catch (error) {
    console.error('❌ 系統整合測試失敗:', error.message);
  }
}

async function cleanupTestData() {
  console.log('\n🧹 清理測試數據');
  
  try {
    await PriceAlert.deleteMany({ userId: 'test_user_001' });
    await LineUser.deleteMany({ nexusTradeUserId: 'test_user_001' });
    console.log('✅ 測試數據清理完成');
  } catch (error) {
    console.error('❌ 清理失敗:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 開始 NexusTrade 通知系統完整測試');
  console.log('=' .repeat(60));
  
  await connectDatabase();
  
  // 執行所有測試
  await testPriceAlertCreation();
  await testAISubscriptionQuery();
  await testLineMessageTemplates();
  await testLineUserManagement();
  await testSystemIntegration();
  
  // 清理測試數據
  await cleanupTestData();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 通知系統測試完成!');
  
  // 關閉資料庫連接
  await mongoose.connection.close();
  console.log('✅ 資料庫連接已關閉');
}

// 執行測試
runAllTests().catch(error => {
  console.error('❌ 測試執行失敗:', error);
  process.exit(1);
});