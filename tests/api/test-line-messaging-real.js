/**
 * LINE Messaging 實際訊息發送測試
 * 
 * 用於測試實際的 LINE 訊息發送功能
 * ⚠️ 注意：此腳本會發送真實的 LINE 訊息
 * 
 * 使用方法：
 * node test-line-messaging-real.js YOUR_LINE_USER_ID
 * 
 * @author NexusTrade 開發團隊
 * @version 1.0.0
 */

require('dotenv').config();

// 檢查命令列參數
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('❌ 錯誤：請提供 LINE 使用者 ID');
  console.log('');
  console.log('使用方法：');
  console.log('  node test-line-messaging-real.js YOUR_LINE_USER_ID');
  console.log('');
  console.log('💡 如何取得 LINE 使用者 ID：');
  console.log('  1. 將機器人加為好友');
  console.log('  2. 發送任何訊息給機器人');
  console.log('  3. 在 Webhook 日誌中找到 userId');
  console.log('  4. 或使用 LINE Developers Console 的測試功能');
  process.exit(1);
}

const REAL_USER_ID = args[0];

console.log('🚀 LINE Messaging 實際訊息發送測試');
console.log('===============================================');
console.log(`📱 目標使用者 ID: ${REAL_USER_ID.substring(0, 8)}...`);
console.log('⚠️  注意：此測試會發送真實的 LINE 訊息');
console.log('');

/**
 * 等待用戶確認
 */
function waitForConfirmation() {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('是否繼續執行實際測試？(y/N): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * 測試 1: 直接使用模組發送文字訊息
 */
async function testModuleTextMessage() {
  console.log('💬 測試 1: 直接使用模組發送文字訊息');
  
  try {
    const lineMessagingModule = require('./src/services/line-messaging');
    
    const result = await lineMessagingModule.sendMessage(
      REAL_USER_ID,
      '🧪 這是來自 NexusTrade LINE Messaging 模組的測試訊息！\n\n✅ 如果您收到這則訊息，表示模組運作正常。\n\n時間：' + new Date().toLocaleString('zh-TW')
    );
    
    if (result.success) {
      console.log('✅ 文字訊息發送成功');
      console.log('   - 訊息 ID:', result.messageId || '未提供');
      console.log('   - 發送時間:', result.timestamp);
      console.log('   - 訊息類型:', result.messageType);
    } else {
      console.log('❌ 文字訊息發送失敗:', result.error.message);
    }
  } catch (error) {
    console.log('❌ 文字訊息發送錯誤:', error.message);
  }
  
  console.log('');
}

/**
 * 測試 2: 使用文字模板發送歡迎訊息
 */
async function testWelcomeTemplate() {
  console.log('🎉 測試 2: 使用文字模板發送歡迎訊息');
  
  try {
    const lineMessagingModule = require('./src/services/line-messaging');
    
    const result = await lineMessagingModule.sendTemplateMessage(
      REAL_USER_ID,
      'welcome',
      {
        username: '測試用戶',
        platform: 'NexusTrade'
      }
    );
    
    if (result.success) {
      console.log('✅ 歡迎模板訊息發送成功');
      console.log('   - 發送時間:', result.timestamp);
    } else {
      console.log('❌ 歡迎模板訊息發送失敗:', result.error.message);
    }
  } catch (error) {
    console.log('❌ 歡迎模板訊息發送錯誤:', error.message);
  }
  
  console.log('');
}

/**
 * 測試 3: 發送價格警報 Flex Message
 */
async function testPriceAlertFlex() {
  console.log('📈 測試 3: 發送價格警報 Flex Message');
  
  try {
    const flexTemplates = require('./src/services/line-messaging/templates/flex-templates');
    const lineMessagingModule = require('./src/services/line-messaging');
    
    const flexMessage = flexTemplates.priceAlert({
      symbol: 'BTCUSDT',
      currentPrice: '102500.50',
      targetPrice: '100000.00',
      alertType: 'above',
      changePercent: 2.5,
      timestamp: new Date().toLocaleString('zh-TW')
    });
    
    const result = await lineMessagingModule.sendMessage(
      REAL_USER_ID,
      flexMessage
    );
    
    if (result.success) {
      console.log('✅ 價格警報 Flex Message 發送成功');
      console.log('   - 發送時間:', result.timestamp);
      console.log('   - Alt Text:', flexMessage.altText);
    } else {
      console.log('❌ 價格警報 Flex Message 發送失敗:', result.error.message);
    }
  } catch (error) {
    console.log('❌ 價格警報 Flex Message 發送錯誤:', error.message);
  }
  
  console.log('');
}

/**
 * 測試 4: 發送市場摘要 Flex Message
 */
async function testMarketSummaryFlex() {
  console.log('📊 測試 4: 發送市場摘要 Flex Message');
  
  try {
    const flexTemplates = require('./src/services/line-messaging/templates/flex-templates');
    const lineMessagingModule = require('./src/services/line-messaging');
    
    const flexMessage = flexTemplates.marketSummary({
      trending: [
        { symbol: 'BTC', price: '102500.50', change: 2.5 },
        { symbol: 'ETH', price: '3850.25', change: -1.2 },
        { symbol: 'SOL', price: '245.80', change: 5.3 }
      ],
      totalMarketCap: '2.5T',
      btcDominance: '42.3',
      fearGreedIndex: 65,
      timestamp: new Date().toLocaleString('zh-TW')
    });
    
    const result = await lineMessagingModule.sendMessage(
      REAL_USER_ID,
      flexMessage
    );
    
    if (result.success) {
      console.log('✅ 市場摘要 Flex Message 發送成功');
      console.log('   - 發送時間:', result.timestamp);
      console.log('   - Alt Text:', flexMessage.altText);
    } else {
      console.log('❌ 市場摘要 Flex Message 發送失敗:', result.error.message);
    }
  } catch (error) {
    console.log('❌ 市場摘要 Flex Message 發送錯誤:', error.message);
  }
  
  console.log('');
}

/**
 * 測試 5: 使用核心 Messenger 直接發送
 */
async function testCoreMessenger() {
  console.log('🔧 測試 5: 使用核心 Messenger 直接發送');
  
  try {
    const LineCoreMessenger = require('./src/services/line-messaging/core/messenger');
    const messenger = new LineCoreMessenger();
    
    // 檢查配置狀態
    const status = messenger.getStatus();
    console.log('   配置狀態:', status.isConfigured);
    
    if (!status.isConfigured) {
      console.log('❌ 核心 Messenger 未正確配置');
      return;
    }
    
    const result = await messenger.sendTextMessage(
      REAL_USER_ID,
      '🔧 這是來自核心 Messenger 的直接測試訊息。\n\n如果您收到這則訊息，表示底層發送機制運作正常。'
    );
    
    if (result.success) {
      console.log('✅ 核心 Messenger 訊息發送成功');
      console.log('   - 訊息 ID:', result.messageId);
      console.log('   - 發送時間:', result.timestamp);
    } else {
      console.log('❌ 核心 Messenger 訊息發送失敗');
    }
  } catch (error) {
    console.log('❌ 核心 Messenger 測試錯誤:', error.message);
  }
  
  console.log('');
}

/**
 * 測試 6: 測試 LINE API 連線
 */
async function testLineApiConnection() {
  console.log('🌐 測試 6: 測試 LINE API 連線');
  
  try {
    const LineCoreMessenger = require('./src/services/line-messaging/core/messenger');
    const messenger = new LineCoreMessenger();
    
    const connectionResult = await messenger.testConnection();
    
    if (connectionResult.success) {
      console.log('✅ LINE API 連線測試成功');
      console.log('   - 配額資訊:', connectionResult.quota || '未提供');
      console.log('   - 測試時間:', connectionResult.timestamp);
    } else {
      console.log('❌ LINE API 連線測試失敗:', connectionResult.error);
    }
  } catch (error) {
    console.log('❌ LINE API 連線測試錯誤:', error.message);
  }
  
  console.log('');
}

/**
 * 主要測試流程
 */
async function runRealTests() {
  // 檢查環境設定
  console.log('🔧 環境檢查:');
  console.log('   - LINE_ACCESS_TOKEN:', process.env.LINE_ACCESS_TOKEN ? '已設定' : '❌ 未設定');
  console.log('   - LINE_MESSAGING_CHANNEL_SECRET:', process.env.LINE_MESSAGING_CHANNEL_SECRET ? '已設定' : '❌ 未設定');
  console.log('');
  
  if (!process.env.LINE_ACCESS_TOKEN || !process.env.LINE_MESSAGING_CHANNEL_SECRET) {
    console.log('❌ 環境變數未正確設定，無法進行實際測試');
    console.log('請檢查 .env 檔案中的 LINE 相關設定');
    return;
  }
  
  // 等待用戶確認
  const confirmed = await waitForConfirmation();
  if (!confirmed) {
    console.log('❌ 測試已取消');
    return;
  }
  
  console.log('🚀 開始實際測試...\n');
  
  // 執行所有測試
  await testModuleTextMessage();
  await new Promise(resolve => setTimeout(resolve, 2000)); // 等待 2 秒
  
  await testWelcomeTemplate();
  await new Promise(resolve => setTimeout(resolve, 2000)); // 等待 2 秒
  
  await testPriceAlertFlex();
  await new Promise(resolve => setTimeout(resolve, 2000)); // 等待 2 秒
  
  await testMarketSummaryFlex();
  await new Promise(resolve => setTimeout(resolve, 2000)); // 等待 2 秒
  
  await testCoreMessenger();
  await new Promise(resolve => setTimeout(resolve, 2000)); // 等待 2 秒
  
  await testLineApiConnection();
  
  // 測試總結
  console.log('===============================================');
  console.log('🏁 LINE Messaging 實際測試完成');
  console.log('');
  console.log('📱 請檢查您的 LINE 應用程式：');
  console.log('   - 應該收到 4-5 則測試訊息');
  console.log('   - 包含文字訊息和 Flex Message');
  console.log('   - 如果都收到了，表示模組完全正常！');
  console.log('');
  console.log('🎉 如果測試成功，您的 LINE Messaging 模組已經可以正式使用了！');
}

// 執行測試
runRealTests().catch(error => {
  console.error('❌ 實際測試執行失敗:', error.message);
  console.error(error.stack);
  process.exit(1);
});