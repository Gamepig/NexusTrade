/**
 * 直接測試 LINE 訊息發送
 */

// 載入環境變數
require('dotenv').config();

const lineMessagingService = require('./src/services/line-messaging.service');

async function testDirectLineMessage() {
  console.log('📱 直接測試 LINE 訊息發送...\n');

  // 使用您的實際 LINE User ID
  const lineUserId = 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b';

  const testMessage = `🚀 NexusTrade 價格警報測試

📈 ETHUSDT 價格警報已觸發！

💰 當前價格: $3,500
🎯 觸發條件: 價格低於 $50,000
⏰ 觸發時間: ${new Date().toLocaleString('zh-TW')}

📱 來自 NexusTrade 智能警報系統
✅ 這是一個測試通知，請確認收到此訊息`;

  try {
    if (!lineMessagingService.isConfigured) {
      console.log('❌ LINE Messaging 服務未配置');
      return;
    }

    console.log('📤 發送測試訊息...');
    console.log('接收者 LINE User ID:', lineUserId);
    console.log('訊息長度:', testMessage.length, '字元');
    
    const result = await lineMessagingService.sendTextMessage(lineUserId, testMessage);
    
    if (result.success) {
      console.log('✅ LINE 訊息發送成功!');
      console.log('Message ID:', result.messageId);
      console.log('時間戳記:', result.timestamp);
      console.log('\n📱 請檢查您的 LINE 是否收到測試訊息');
    } else {
      console.log('❌ LINE 訊息發送失敗');
      console.log('錯誤詳情:', result);
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    
    // 提供詳細的錯誤診斷
    if (error.response) {
      console.error('HTTP 狀態:', error.response.status);
      console.error('回應數據:', error.response.data);
      
      if (error.response.status === 400) {
        console.log('\n💡 診斷建議:');
        console.log('- 檢查 LINE User ID 格式是否正確');
        console.log('- 確認用戶已加入您的 LINE 官方帳號為好友');
        console.log('- 驗證 LINE Channel Access Token 是否有效');
      }
    }
  }
}

// 執行測試
testDirectLineMessage();