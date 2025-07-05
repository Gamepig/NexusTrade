/**
 * LINE Messaging 模組獨立測試
 * 
 * 直接測試模組功能，不需要啟動完整的伺服器
 * 
 * @author NexusTrade 開發團隊
 * @version 1.0.0
 */

require('dotenv').config();

console.log('🧪 LINE Messaging 模組獨立測試');
console.log('===============================================\n');

// 檢查環境變數
console.log('🔧 環境變數檢查:');
console.log('   - LINE_MESSAGING_CHANNEL_ACCESS_TOKEN:', process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ? '已設定' : '未設定');
console.log('   - LINE_MESSAGING_CHANNEL_SECRET:', process.env.LINE_MESSAGING_CHANNEL_SECRET ? '已設定' : '未設定');
console.log('   - LINE_ACCESS_TOKEN:', process.env.LINE_ACCESS_TOKEN ? '已設定' : '未設定');
console.log('');

// 測試模組載入
console.log('📦 測試模組載入:');
try {
  const lineMessagingModule = require('./src/services/line-messaging');
  console.log('✅ LINE Messaging 模組載入成功');
  
  // 測試模組狀態
  const status = lineMessagingModule.getStatus();
  console.log('📊 模組狀態:');
  console.log('   - 已配置:', status.data.isConfigured);
  console.log('   - 模組名稱:', status.data.module.name);
  console.log('   - 模組版本:', status.data.module.version);
  console.log('   - 可用模板:');
  console.log('     * 文字模板:', status.data.availableTemplates.text.length, '個');
  console.log('     * Flex 模板:', status.data.availableTemplates.flex.length, '個');
  console.log('');
  
  // 測試模板列表
  console.log('📋 可用模板詳情:');
  const templates = lineMessagingModule.getAvailableTemplates();
  console.log('   文字模板:');
  templates.data.text.forEach(template => {
    console.log(`     - ${template.name}: ${template.description}`);
  });
  console.log('   Flex 模板:');
  templates.data.flex.forEach(template => {
    console.log(`     - ${template.name}: ${template.description}`);
  });
  console.log('');
  
  // 測試文字模板生成
  console.log('💬 測試文字模板生成:');
  try {
    const textTemplates = require('./src/services/line-messaging/templates/text-templates');
    
    // 測試歡迎訊息
    const welcomeMessage = textTemplates.welcome({
      username: '測試用戶',
      platform: 'NexusTrade'
    });
    console.log('✅ 歡迎訊息模板生成成功');
    console.log('   內容預覽:', welcomeMessage.substring(0, 50) + '...');
    
    // 測試價格警報訊息
    const priceAlertMessage = textTemplates.priceAlert({
      symbol: 'BTCUSDT',
      currentPrice: '102500.50',
      targetPrice: '100000.00',
      alertType: 'above',
      changePercent: 2.5
    });
    console.log('✅ 價格警報模板生成成功');
    console.log('   內容預覽:', priceAlertMessage.substring(0, 50) + '...');
    
  } catch (error) {
    console.log('❌ 文字模板測試失敗:', error.message);
  }
  console.log('');
  
  // 測試 Flex 模板生成
  console.log('🎨 測試 Flex 模板生成:');
  try {
    const flexTemplates = require('./src/services/line-messaging/templates/flex-templates');
    
    // 測試歡迎 Flex Message
    const welcomeFlex = flexTemplates.welcome({
      username: '測試用戶',
      platform: 'NexusTrade'
    });
    console.log('✅ 歡迎 Flex 模板生成成功');
    console.log('   類型:', welcomeFlex.type);
    console.log('   Alt Text:', welcomeFlex.altText);
    
    // 測試價格警報 Flex Message
    const priceAlertFlex = flexTemplates.priceAlert({
      symbol: 'BTCUSDT',
      currentPrice: '102500.50',
      targetPrice: '100000.00',
      alertType: 'above',
      changePercent: 2.5
    });
    console.log('✅ 價格警報 Flex 模板生成成功');
    console.log('   類型:', priceAlertFlex.type);
    console.log('   Alt Text:', priceAlertFlex.altText);
    
  } catch (error) {
    console.log('❌ Flex 模板測試失敗:', error.message);
  }
  console.log('');
  
  // 測試核心 Messenger
  console.log('🚀 測試核心 Messenger:');
  try {
    const LineCoreMessenger = require('./src/services/line-messaging/core/messenger');
    const messenger = new LineCoreMessenger();
    const messengerStatus = messenger.getStatus();
    
    console.log('✅ 核心 Messenger 初始化成功');
    console.log('   已配置:', messengerStatus.isConfigured);
    console.log('   API URL:', messengerStatus.apiUrl);
    console.log('   Access Token:', messengerStatus.hasAccessToken ? '已設定' : '未設定');
    console.log('   Channel Secret:', messengerStatus.hasChannelSecret ? '已設定' : '未設定');
    
  } catch (error) {
    console.log('❌ 核心 Messenger 測試失敗:', error.message);
  }
  console.log('');
  
  // 測試輸入驗證
  console.log('🛡️ 測試輸入驗證:');
  try {
    const validator = require('./src/services/line-messaging/core/validator');
    
    // 測試有效輸入
    try {
      validator.validateSendInput('valid_user_id_123', 'Test message');
      console.log('✅ 有效輸入驗證通過');
    } catch (error) {
      console.log('❌ 有效輸入驗證失敗:', error.message);
    }
    
    // 測試無效輸入
    try {
      validator.validateSendInput('', 'Test message');
      console.log('❌ 無效輸入驗證未正常運作');
    } catch (error) {
      console.log('✅ 無效輸入正確被拒絕:', error.message);
    }
    
  } catch (error) {
    console.log('❌ 輸入驗證測試失敗:', error.message);
  }
  console.log('');
  
  // 如果已正確配置，測試實際的訊息發送（模擬）
  if (status.data.isConfigured) {
    console.log('⚡ 測試實際訊息發送 (模擬):');
    try {
      // 注意：這裡只是模擬測試，不會真正發送訊息
      console.log('✅ 模組已正確配置，可以進行實際的訊息發送');
      console.log('   提示：如需測試實際發送，請提供有效的 LINE 使用者 ID');
    } catch (error) {
      console.log('❌ 訊息發送測試失敗:', error.message);
    }
  } else {
    console.log('⚠️ 模組未完整配置，跳過實際發送測試');
  }
  
} catch (error) {
  console.log('❌ 模組載入失敗:', error.message);
  console.log(error.stack);
}

console.log('');
console.log('===============================================');
console.log('🏁 LINE Messaging 模組獨立測試完成');
console.log('');
console.log('📝 測試結果摘要:');
console.log('   - 此測試驗證了模組的核心功能');
console.log('   - 如果所有項目都顯示 ✅，表示模組運作正常');
console.log('   - 下一步可以整合到完整的 API 服務中');
console.log('');