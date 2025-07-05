/**
 * 簡化版價格警報功能測試
 * 
 * 測試核心功能：
 * 1. 價格警報建立和查詢
 * 2. AI 分析訂閱功能
 * 3. LINE 訊息模板生成
 */

const mongoose = require('mongoose');
const PriceAlert = require('./src/models/PriceAlert');
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

async function testPriceAlertSystem() {
  console.log('🚀 開始價格警報系統測試');
  console.log('=' .repeat(50));
  
  const testUserId = 'test_user_notifications';
  
  try {
    // 測試 1: 建立價格警報
    console.log('\n📋 測試 1: 建立價格警報');
    
    const alertData = {
      userId: testUserId,
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
      }
    };

    const priceAlert = new PriceAlert(alertData);
    await priceAlert.save();
    
    console.log('✅ 價格警報建立成功:', {
      id: priceAlert._id.toString(),
      symbol: priceAlert.symbol,
      targetPrice: priceAlert.targetPrice,
      aiSubscribed: priceAlert.aiAnalysisSubscription?.enabled
    });

    // 測試 2: 查詢價格警報
    console.log('\n📋 測試 2: 查詢價格警報');
    
    const userAlerts = await PriceAlert.find({ 
      userId: testUserId,
      status: 'active' 
    });
    
    console.log(`✅ 找到 ${userAlerts.length} 個活躍警報`);
    
    // 測試 3: AI 訂閱查詢
    console.log('\n📋 測試 3: AI 訂閱查詢');
    
    const subscribedSymbols = await PriceAlert.getAISubscribedSymbols();
    console.log('✅ AI 訂閱貨幣:', subscribedSymbols);
    
    const alertStats = await PriceAlert.getAlertStats(testUserId);
    console.log('✅ 警報統計:', alertStats);

    // 測試 4: LINE 訊息模板
    console.log('\n📋 測試 4: LINE 訊息模板生成');
    
    // 模擬觸發價格警報的情況
    const mockAlertData = {
      symbol: 'BTCUSDT',
      currentPrice: '105100.50',
      targetPrice: '105000.00',
      changePercent: 2.5,
      alertType: 'above',
      timestamp: new Date()
    };
    
    // 生成 Flex Message
    const flexMessage = lineMessageTemplates.templates.flex.priceAlert(mockAlertData);
    console.log('✅ Flex Message 模板生成成功');
    console.log('📄 模板結構驗證:', {
      type: flexMessage.type,
      hasHeader: !!flexMessage.header,
      hasBody: !!flexMessage.body,
      hasFooter: !!flexMessage.footer,
      headerTitle: flexMessage.header?.contents?.[0]?.text,
      symbolInBody: flexMessage.body?.contents?.[0]?.text
    });
    
    // 生成文字訊息
    const textMessage = lineMessageTemplates.templates.text.priceAlert(mockAlertData);
    console.log('✅ 文字訊息模板生成成功');
    console.log('📄 文字內容預覽:', textMessage.split('\n').slice(0, 3).join('\n') + '...');
    
    // 測試 5: 模擬價格檢查邏輯
    console.log('\n📋 測試 5: 模擬價格檢查邏輯');
    
    const currentPrice = 105100; // 模擬當前價格
    
    for (const alert of userAlerts) {
      const isTriggered = (alert.alertType === 'price_above' && currentPrice >= alert.targetPrice) ||
                         (alert.alertType === 'price_below' && currentPrice <= alert.targetPrice);
      
      if (isTriggered) {
        console.log(`🚨 警報觸發! ${alert.symbol} 當前價格 $${currentPrice} ${alert.alertType === 'price_above' ? '超過' : '低於'} 目標 $${alert.targetPrice}`);
        
        // 模擬標記警報為已觸發
        alert.status = 'triggered';
        alert.triggeredAt = new Date();
        alert.triggeredPrice = currentPrice;
        await alert.save();
        
        console.log(`📝 警報狀態已更新為: ${alert.status}`);
        
        // 如果啟用 AI 分析訂閱，顯示相關資訊
        if (alert.aiAnalysisSubscription?.enabled) {
          console.log(`🤖 此警報已訂閱 AI 分析，將在每日 7:00 AM 收到 ${alert.symbol} 的技術分析報告`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 價格警報系統測試完成!');
    
    // 統計測試結果
    const finalStats = await PriceAlert.getAlertStats(testUserId);
    const totalAlerts = finalStats.reduce((sum, stat) => sum + stat.count, 0);
    
    console.log('\n📊 測試結果統計:');
    console.log(`- 總警報數量: ${totalAlerts}`);
    console.log(`- 活躍警報: ${finalStats.find(s => s._id === 'active')?.count || 0}`);
    console.log(`- 觸發警報: ${finalStats.find(s => s._id === 'triggered')?.count || 0}`);
    console.log(`- AI 訂閱貨幣: ${subscribedSymbols.length}`);
    
  } catch (error) {
    console.error('❌ 測試執行失敗:', error.message);
  } finally {
    // 清理測試數據
    console.log('\n🧹 清理測試數據...');
    try {
      await PriceAlert.deleteMany({ userId: testUserId });
      console.log('✅ 測試數據清理完成');
    } catch (error) {
      console.error('❌ 清理失敗:', error.message);
    }
    
    // 關閉資料庫連接
    await mongoose.connection.close();
    console.log('✅ 資料庫連接已關閉');
  }
}

// 執行測試
connectDatabase().then(() => {
  testPriceAlertSystem();
}).catch(error => {
  console.error('❌ 測試執行失敗:', error);
  process.exit(1);
});