/**
 * LINE Webhook 事件即時監控器
 * 
 * 監控 LINE Webhook 事件並擷取使用者 ID
 * 用於實際測試時取得 LINE 使用者 ID
 */

const express = require('express');
const app = express();
app.use(express.json());

console.log('🔍 LINE Webhook 事件監控器啟動');
console.log('===========================================');
console.log('');
console.log('📱 請在 LINE 應用程式中：');
console.log('   1. 搜尋並加入機器人：@769tzgjc');
console.log('   2. 發送任何訊息給機器人（例如：測試）');
console.log('');
console.log('⏳ 正在等待 LINE 事件...');
console.log('');

// 簡單的事件紀錄
const capturedEvents = [];

// 監聽 port 3002 以避免與主服務衝突
const PORT = 3002;

// 臨時 Webhook 接收器
app.post('/webhook', (req, res) => {
  const events = req.body.events || [];
  
  console.log(`📥 收到 ${events.length} 個 LINE 事件`);
  
  events.forEach((event, index) => {
    const userId = event.source?.userId;
    const eventType = event.type;
    const timestamp = new Date().toLocaleString('zh-TW');
    
    if (userId) {
      console.log('');
      console.log('🎉 找到使用者 ID！');
      console.log('==========================================');
      console.log(`   事件類型: ${eventType}`);
      console.log(`   使用者 ID: ${userId}`);
      console.log(`   時間: ${timestamp}`);
      console.log('==========================================');
      console.log('');
      console.log('✅ 您可以使用以下指令進行實際測試：');
      console.log(`   node test-line-messaging-real.js ${userId}`);
      console.log('');
      
      capturedEvents.push({
        userId,
        eventType,
        timestamp,
        fullEvent: event
      });
    }
    
    if (event.type === 'message' && event.message?.text) {
      console.log(`💬 收到訊息: "${event.message.text}"`);
    }
  });
  
  res.status(200).json({ success: true });
});

// 狀態查詢端點
app.get('/status', (req, res) => {
  res.json({
    success: true,
    capturedEvents: capturedEvents.length,
    events: capturedEvents.map(e => ({
      userId: e.userId.substring(0, 8) + '...',
      eventType: e.eventType,
      timestamp: e.timestamp
    }))
  });
});

app.listen(PORT, () => {
  console.log(`🚀 監控器運行在 http://localhost:${PORT}/webhook`);
  console.log('');
  console.log('💡 如果您已經加機器人為好友並發送訊息，');
  console.log('   但沒有看到事件，請檢查 LINE Developers Console');
  console.log('   中的 Webhook URL 設定是否正確。');
  console.log('');
  console.log('⏹️  按 Ctrl+C 停止監控');
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n\n📊 監控總結:');
  console.log(`   總共擷取 ${capturedEvents.length} 個事件`);
  
  if (capturedEvents.length > 0) {
    console.log('\n🎯 可用的使用者 ID:');
    capturedEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.userId} (${event.eventType})`);
    });
    
    console.log('\n✅ 測試指令:');
    const latestUserId = capturedEvents[capturedEvents.length - 1].userId;
    console.log(`   node test-line-messaging-real.js ${latestUserId}`);
  }
  
  console.log('\n👋 監控器已停止');
  process.exit(0);
});