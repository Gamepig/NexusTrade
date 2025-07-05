/**
 * LINE 使用者 ID 擷取工具
 * 
 * 監聽下一個 LINE 事件並提取使用者 ID
 */

const express = require('express');
const app = express();

app.use(express.json());

console.log('🔍 LINE 使用者 ID 擷取工具');
console.log('============================');
console.log('');
console.log('📱 請在 LINE 應用程式中發送任何訊息給 Gamepig 機器人');
console.log('   (例如：發送 "ID" 或任何文字)');
console.log('');
console.log('⏳ 等待 LINE 事件...');
console.log('');

let userIdFound = false;

// 臨時 Webhook 端點 (監聽 3001 port)
app.post('/webhook', (req, res) => {
  res.status(200).end();
  
  const events = req.body.events || [];
  
  events.forEach(event => {
    const userId = event.source?.userId;
    
    if (userId && !userIdFound) {
      userIdFound = true;
      
      console.log('');
      console.log('🎉 =================================');
      console.log('🎉 找到您的 LINE 使用者 ID！');
      console.log('🎉 =================================');
      console.log('');
      console.log(`完整使用者 ID: ${userId}`);
      console.log(`事件類型: ${event.type}`);
      console.log(`時間: ${new Date().toISOString()}`);
      console.log('');
      console.log('✅ 現在您可以執行以下指令進行完整測試：');
      console.log(`   node test-line-messaging-real.js ${userId}`);
      console.log('');
      console.log('🎉 =================================');
      
      // 自動停止監聽
      setTimeout(() => {
        console.log('✅ 使用者 ID 已取得，監聽器將自動關閉。');
        process.exit(0);
      }, 2000);
    }
    
    if (event.message?.text) {
      console.log(`💬 收到訊息: "${event.message.text}"`);
    }
  });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🚀 監聽器運行在 port ${PORT}`);
  console.log('');
  console.log('💡 如果長時間沒有收到事件：');
  console.log('   1. 確認機器人已加為好友');
  console.log('   2. 確認已發送訊息給機器人');
  console.log('   3. 檢查 LINE Developers Console 的 Webhook 設定');
  console.log('');
  console.log('⏹️  按 Ctrl+C 手動停止');
});

// 30 秒後自動停止
setTimeout(() => {
  if (!userIdFound) {
    console.log('');
    console.log('⏰ 30 秒內未收到事件，自動停止監聽。');
    console.log('');
    console.log('🔍 請確認：');
    console.log('   - LINE Developers Console 的 Webhook URL 是否正確');
    console.log('   - 是否已將機器人加為好友');
    console.log('   - 是否已發送訊息給機器人');
    process.exit(1);
  }
}, 30000);