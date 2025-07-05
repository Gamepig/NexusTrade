/**
 * 測試 LINE Messaging API
 */

// 載入環境變數
require('dotenv').config();

const lineMessagingService = require('./src/services/line-messaging.service');

async function testLineMessaging() {
  console.log('📱 測試 LINE Messaging API...\n');

  try {
    // 檢查服務配置
    console.log('🔧 檢查 LINE Messaging 服務配置:');
    console.log('是否已配置:', lineMessagingService.isConfigured);
    
    if (!lineMessagingService.isConfigured) {
      console.log('❌ LINE Messaging 服務未正確配置');
      console.log('請檢查以下環境變數:');
      console.log('- LINE_ACCESS_TOKEN');
      console.log('- LINE_MESSAGING_CHANNEL_ACCESS_TOKEN');
      return;
    }

    // 使用您的 LINE User ID (從 .env 或 OAuth 記錄中獲取)
    const testLineUserId = 'ue5cc188e1d2cdbac5cfda2abb6f6a34b';
    
    console.log(`\n📤 發送測試訊息給 LINE 用戶: ${testLineUserId.substring(0, 8)}...`);
    
    const testMessage = `🚀 NexusTrade 系統測試

📱 這是一條測試訊息
⏰ 時間: ${new Date().toLocaleString('zh-TW')}
🔧 測試項目: LINE Messaging API 連線

如果您收到此訊息，表示 LINE 通知系統運作正常！

💡 接下來將測試價格警報功能。`;

    // 發送測試訊息
    const result = await lineMessagingService.sendTextMessage(testLineUserId, testMessage);
    
    if (result.success) {
      console.log('✅ LINE 訊息發送成功!');
      console.log('結果:', result);
      console.log('\n📱 請檢查您的 LINE 是否收到測試訊息');
    } else {
      console.log('❌ LINE 訊息發送失敗');
      console.log('錯誤:', result.error);
      console.log('詳細訊息:', result.details);
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error(error.stack);
  }
}

// 執行測試
testLineMessaging();