/**
 * 檢查環境變數
 */

console.log('🔍 檢查 LINE 相關環境變數:\n');

console.log('LINE_ACCESS_TOKEN:', process.env.LINE_ACCESS_TOKEN ? '已設定' : '未設定');
console.log('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN:', process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ? '已設定' : '未設定');
console.log('LINE_MESSAGING_CHANNEL_SECRET:', process.env.LINE_MESSAGING_CHANNEL_SECRET ? '已設定' : '未設定');

console.log('\n📝 實際值:');
console.log('LINE_ACCESS_TOKEN:', process.env.LINE_ACCESS_TOKEN?.substring(0, 20) + '...');
console.log('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN:', process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN?.substring(0, 20) + '...');
console.log('LINE_MESSAGING_CHANNEL_SECRET:', process.env.LINE_MESSAGING_CHANNEL_SECRET);

// 測試 LINE Messaging 服務初始化
const lineMessagingService = require('./src/services/line-messaging.service');
console.log('\n🔧 LINE Messaging 服務狀態:');
console.log('channelAccessToken:', lineMessagingService.channelAccessToken ? '已設定' : '未設定');
console.log('channelSecret:', lineMessagingService.channelSecret ? '已設定' : '未設定');
console.log('isConfigured:', lineMessagingService.isConfigured);