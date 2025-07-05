/**
 * 檢查價格警報監控服務狀態
 */

// 載入環境變數
require('dotenv').config();

async function checkAlertMonitorStatus() {
  console.log('🔍 檢查價格警報監控服務狀態...\n');

  try {
    // 檢查服務狀態 API
    const fetch = (await import('node-fetch')).default;
    
    console.log('📡 檢查健康狀況...');
    const healthResponse = await fetch('http://localhost:3000/api/health');
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ 服務健康狀況:', JSON.stringify(healthData, null, 2));
    } else {
      console.log('❌ 健康檢查失敗:', healthResponse.status);
    }
    
    // 檢查價格警報監控服務
    console.log('\n🔔 檢查價格警報監控服務...');
    
    // 連接資料庫檢查警報
    const { initializeDatabase } = require('./src/config/database');
    await initializeDatabase();
    
    const PriceAlert = require('./src/models/PriceAlert');
    
    // 查詢所有警報
    const allAlerts = await PriceAlert.find({}).sort({ createdAt: -1 });
    console.log(`\n📊 總共有 ${allAlerts.length} 個警報:`);
    
    allAlerts.forEach((alert, index) => {
      console.log(`${index + 1}. ${alert.symbol} - ${alert.alertType}`);
      console.log(`   狀態: ${alert.status}`);
      console.log(`   目標價格: ${alert.targetPrice}`);
      console.log(`   觸發次數: ${alert.triggerCount}`);
      console.log(`   最後觸發: ${alert.lastTriggered || '從未觸發'}`);
      console.log(`   LINE 通知: ${alert.notificationMethods?.lineMessaging?.enabled ? '已啟用' : '未啟用'}`);
      
      if (alert.notificationMethods?.lineMessaging?.enabled) {
        console.log(`   LINE User ID: ${alert.notificationMethods.lineMessaging.userId}`);
      }
      console.log('');
    });
    
    // 檢查已觸發但未發送通知的警報
    console.log('🚨 檢查已觸發的警報...');
    const triggeredAlerts = await PriceAlert.find({
      status: 'triggered',
      triggerCount: { $gt: 0 }
    });
    
    console.log(`找到 ${triggeredAlerts.length} 個已觸發的警報:`);
    
    for (const alert of triggeredAlerts) {
      console.log(`\n⚠️ 警報 ${alert.symbol}:`);
      console.log(`   觸發時間: ${alert.lastTriggered}`);
      console.log(`   LINE 通知: ${alert.notificationMethods?.lineMessaging?.enabled ? '已啟用' : '未啟用'}`);
      
      if (alert.notificationMethods?.lineMessaging?.enabled) {
        console.log(`   LINE User ID: ${alert.notificationMethods.lineMessaging.userId}`);
        
        // 嘗試重新發送通知
        console.log('   🔄 嘗試重新發送通知...');
        
        try {
          const lineMessagingService = require('./src/services/line-messaging.service');
          
          const alertMessage = `🚨 NexusTrade 價格警報
          
💰 ${alert.symbol}
📈 觸發條件: 價格高於 $${alert.targetPrice.toLocaleString()}
📊 警報類型: ${alert.alertType}

⏰ 觸發時間: ${alert.lastTriggered}
📱 來自 NexusTrade 智能警報系統

🎉 您的價格警報已觸發！`;

          const result = await lineMessagingService.sendTextMessage(
            alert.notificationMethods.lineMessaging.userId,
            alertMessage
          );
          
          if (result.success) {
            console.log('   ✅ 重新發送成功，Message ID:', result.messageId);
          } else {
            console.log('   ❌ 重新發送失敗:', result.error);
          }
          
        } catch (error) {
          console.log('   ❌ 重新發送過程失敗:', error.message);
        }
      }
    }
    
    // 檢查價格警報監控服務是否正在運行
    console.log('\n🔧 檢查價格警報監控服務...');
    
    try {
      // 嘗試載入監控服務
      const PriceAlertMonitorService = require('./src/services/price-alert-monitor.service');
      
      if (PriceAlertMonitorService && typeof PriceAlertMonitorService.getStats === 'function') {
        const stats = PriceAlertMonitorService.getStats();
        console.log('✅ 監控服務統計:', JSON.stringify(stats, null, 2));
        
        if (stats.lastCheck) {
          const timeSinceLastCheck = Date.now() - new Date(stats.lastCheck).getTime();
          console.log(`⏰ 距離上次檢查: ${Math.round(timeSinceLastCheck / 1000)} 秒前`);
          
          if (timeSinceLastCheck > 300000) { // 5 分鐘
            console.log('⚠️ 監控服務可能已停止，上次檢查時間過久');
          }
        } else {
          console.log('⚠️ 監控服務可能從未運行');
        }
      } else {
        console.log('❌ 無法載入監控服務或獲取統計');
      }
    } catch (error) {
      console.log('❌ 檢查監控服務失敗:', error.message);
    }
    
    // 檢查每日 AI 分析
    console.log('\n🤖 檢查每日 AI 分析...');
    
    const aiSubscriptions = await PriceAlert.find({
      'aiAnalysisSubscription.enabled': true
    });
    
    console.log(`找到 ${aiSubscriptions.length} 個 AI 分析訂閱:`);
    
    aiSubscriptions.forEach((alert, index) => {
      console.log(`${index + 1}. ${alert.symbol} - 訂閱時間: ${alert.aiAnalysisSubscription.subscribedAt}`);
      
      // 檢查是否應該發送分析
      const subscribeTime = new Date(alert.aiAnalysisSubscription.subscribedAt);
      const now = new Date();
      const timeDiff = now.getTime() - subscribeTime.getTime();
      const hoursDiff = timeDiff / (1000 * 3600);
      
      console.log(`   訂閱了 ${Math.round(hoursDiff)} 小時`);
      
      if (hoursDiff >= 24) {
        console.log(`   ⚠️ 已超過 24 小時，應該已發送 AI 分析`);
      } else {
        console.log(`   ⏰ 尚未滿 24 小時，等待發送`);
      }
    });
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
    console.error(error.stack);
  } finally {
    // 關閉資料庫連接
    const { disconnectDB } = require('./src/config/database');
    await disconnectDB();
    process.exit(0);
  }
}

// 執行檢查
checkAlertMonitorStatus();