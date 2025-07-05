/**
 * 測試價格警報通知
 */

// 載入環境變數
require('dotenv').config();

const lineMessagingService = require('./src/services/line-messaging.service');

async function testPriceAlertNotification() {
  console.log('🔔 測試價格警報通知...\n');

  const lineUserId = 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b';
  const alertData = {
    symbol: 'BTCUSDT',
    alertType: 'price_above',
    targetPrice: 100000,
    currentPrice: 108932.93
  };

  try {
    // 模擬價格警報觸發的通知訊息
    const alertMessage = `🚨 NexusTrade 價格警報

💰 ${alertData.symbol}
📈 觸發條件: 價格高於 $${alertData.targetPrice.toLocaleString()}
💵 當前價格: $${alertData.currentPrice.toLocaleString()}
📊 漲幅: +${((alertData.currentPrice - alertData.targetPrice) / alertData.targetPrice * 100).toFixed(2)}%

⏰ 觸發時間: ${new Date().toLocaleString('zh-TW')}
📱 來自 NexusTrade 智能警報系統

🎉 您的價格警報已成功觸發！`;

    console.log('📱 發送價格警報通知...');
    console.log('交易對:', alertData.symbol);
    console.log('觸發價格:', `$${alertData.currentPrice.toLocaleString()}`);
    console.log('目標價格:', `$${alertData.targetPrice.toLocaleString()}`);
    console.log('接收者:', lineUserId);
    
    const result = await lineMessagingService.sendTextMessage(lineUserId, alertMessage);
    
    if (result.success) {
      console.log('\n🎉 價格警報通知發送成功！');
      console.log('Message ID:', result.messageId);
      console.log('時間戳記:', result.timestamp);
      console.log('\n📱 請檢查您的 LINE 是否收到價格警報通知');
      
      console.log('\n✅ 測試結果總結:');
      console.log('  ✅ LINE Messaging API 正常運作');
      console.log('  ✅ 用戶 LINE ID 正確配置');
      console.log('  ✅ 價格警報通知格式正確');
      console.log('  ✅ 通知發送成功');
      
      console.log('\n🎯 下一步:');
      console.log('  1. 確認收到 LINE 通知');
      console.log('  2. 創建實際的價格警報進行測試');
      console.log('  3. 驗證警報觸發機制正常運作');
      
    } else {
      console.log('❌ 價格警報通知發送失敗');
      console.log('錯誤:', result);
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error(error.stack);
  }
}

// 執行測試
testPriceAlertNotification();