/**
 * 清理測試警報資料並檢查通知問題
 */

// 載入環境變數
require('dotenv').config();

async function cleanupTestAlerts() {
  console.log('🧹 清理測試警報資料...\n');

  try {
    // 連接資料庫
    const { initializeDatabase } = require('./src/config/database');
    await initializeDatabase();
    
    console.log('✅ 資料庫連接成功\n');

    const PriceAlert = require('./src/models/PriceAlert');
    
    // 1. 統計當前警報
    console.log('📊 統計當前警報資料...');
    const totalAlerts = await PriceAlert.countDocuments();
    const testAlerts = await PriceAlert.countDocuments({
      'notificationMethods.lineMessaging.userId': /^test_line_/
    });
    const realUserAlerts = await PriceAlert.countDocuments({
      'notificationMethods.lineMessaging.userId': 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b'
    });
    
    console.log(`總警報數: ${totalAlerts}`);
    console.log(`測試警報數: ${testAlerts}`);
    console.log(`真實用戶警報數: ${realUserAlerts}`);
    
    // 2. 顯示真實用戶的警報
    console.log('\n📋 真實用戶的警報清單:');
    const userAlerts = await PriceAlert.find({
      'notificationMethods.lineMessaging.userId': 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b'
    }).sort({ createdAt: -1 });
    
    userAlerts.forEach((alert, index) => {
      console.log(`${index + 1}. ${alert.symbol} ${alert.alertType} ${alert.targetPrice}`);
      console.log(`   狀態: ${alert.status}, 觸發次數: ${alert.triggerCount}`);
      console.log(`   LINE 通知: ${alert.notificationMethods?.lineMessaging?.enabled ? '已啟用' : '未啟用'}`);
      console.log(`   創建時間: ${alert.createdAt}`);
      if (alert.lastTriggered) {
        console.log(`   最後觸發: ${alert.lastTriggered}`);
      }
      console.log('');
    });
    
    // 3. 檢查已觸發但未發送通知的警報
    const triggeredUserAlerts = userAlerts.filter(alert => 
      alert.status === 'triggered' && 
      alert.notificationMethods?.lineMessaging?.enabled &&
      alert.triggerCount > 0
    );
    
    console.log(`🚨 已觸發但需要重新發送通知的警報: ${triggeredUserAlerts.length} 個`);
    
    if (triggeredUserAlerts.length > 0) {
      console.log('\n📱 重新發送 LINE 通知...');
      
      const lineMessagingService = require('./src/services/line-messaging.service');
      
      for (const alert of triggeredUserAlerts) {
        console.log(`\n發送 ${alert.symbol} 警報通知...`);
        
        try {
          const alertMessage = `🚨 NexusTrade 價格警報

💰 ${alert.symbol}
📈 觸發條件: 價格${alert.alertType === 'price_above' ? '高於' : '低於'} $${alert.targetPrice?.toLocaleString()}
📊 警報類型: ${alert.alertType}

⏰ 觸發時間: ${alert.lastTriggered}
📱 來自 NexusTrade 智能警報系統

🎉 您的價格警報已觸發！`;

          const result = await lineMessagingService.sendTextMessage(
            alert.notificationMethods.lineMessaging.userId,
            alertMessage
          );
          
          if (result.success) {
            console.log(`✅ ${alert.symbol} 通知發送成功，Message ID: ${result.messageId}`);
          } else {
            console.log(`❌ ${alert.symbol} 通知發送失敗: ${result.error}`);
          }
          
        } catch (error) {
          console.log(`❌ ${alert.symbol} 通知發送錯誤: ${error.message}`);
        }
        
        // 避免發送太快
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 4. 詢問是否清理測試資料
    console.log('\n🗑️ 清理測試資料...');
    console.log('開始清理測試 LINE ID 的警報...');
    
    const deleteResult = await PriceAlert.deleteMany({
      'notificationMethods.lineMessaging.userId': /^test_line_/
    });
    
    console.log(`✅ 已刪除 ${deleteResult.deletedCount} 個測試警報`);
    
    // 5. 清理無效的警報 (沒有 LINE User ID 的)
    console.log('\n🧹 清理無效警報...');
    const invalidAlerts = await PriceAlert.deleteMany({
      $or: [
        { 'notificationMethods.lineMessaging.userId': { $exists: false } },
        { 'notificationMethods.lineMessaging.userId': null },
        { 'notificationMethods.lineMessaging.userId': undefined },
        { 'notificationMethods.lineMessaging.userId': '' }
      ],
      'notificationMethods.lineMessaging.enabled': true
    });
    
    console.log(`✅ 已刪除 ${invalidAlerts.deletedCount} 個無效警報`);
    
    // 6. 最終統計
    console.log('\n📊 清理後統計:');
    const finalTotal = await PriceAlert.countDocuments();
    const finalUserAlerts = await PriceAlert.countDocuments({
      'notificationMethods.lineMessaging.userId': 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b'
    });
    
    console.log(`剩餘總警報數: ${finalTotal}`);
    console.log(`真實用戶警報數: ${finalUserAlerts}`);
    
    // 7. 檢查價格警報監控服務
    console.log('\n🔧 檢查價格警報監控服務...');
    
    try {
      // 檢查監控服務是否有啟動方法
      const monitorService = require('./src/services/price-alert-monitor.service');
      
      if (monitorService && typeof monitorService.start === 'function') {
        console.log('📡 價格警報監控服務已找到');
        
        // 檢查是否正在運行
        if (typeof monitorService.isRunning === 'boolean') {
          console.log(`狀態: ${monitorService.isRunning ? '運行中' : '已停止'}`);
        }
        
        if (typeof monitorService.getStats === 'function') {
          const stats = monitorService.getStats();
          console.log('統計資料:', JSON.stringify(stats, null, 2));
        }
        
        // 如果沒有運行，嘗試啟動
        if (!monitorService.isRunning) {
          console.log('🚀 嘗試啟動價格警報監控服務...');
          try {
            monitorService.start();
            console.log('✅ 價格警報監控服務已啟動');
          } catch (startError) {
            console.log('❌ 啟動失敗:', startError.message);
          }
        }
      } else {
        console.log('❌ 價格警報監控服務載入失敗或缺少 start 方法');
      }
    } catch (error) {
      console.log('❌ 檢查監控服務失敗:', error.message);
    }
    
    // 8. 檢查每日 AI 分析
    console.log('\n🤖 檢查每日 AI 分析訂閱...');
    const aiSubscriptions = await PriceAlert.find({
      'aiAnalysisSubscription.enabled': true
    });
    
    console.log(`找到 ${aiSubscriptions.length} 個 AI 分析訂閱:`);
    aiSubscriptions.forEach((alert, index) => {
      const subscribeTime = new Date(alert.aiAnalysisSubscription.subscribedAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - subscribeTime.getTime()) / (1000 * 3600);
      
      console.log(`${index + 1}. ${alert.symbol} - 訂閱了 ${Math.round(hoursDiff)} 小時`);
      
      if (hoursDiff >= 24) {
        console.log(`   ⚠️ 已超過 24 小時，應該已發送 AI 分析`);
      }
    });
    
  } catch (error) {
    console.error('❌ 清理失敗:', error.message);
    console.error(error.stack);
  } finally {
    // 關閉資料庫連接
    const { disconnectDB } = require('./src/config/database');
    await disconnectDB();
    process.exit(0);
  }
}

// 執行清理
cleanupTestAlerts();