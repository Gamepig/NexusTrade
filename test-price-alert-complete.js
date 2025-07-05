/**
 * 完整測試價格警報功能
 */

// 載入環境變數
require('dotenv').config();

const jwt = require('jsonwebtoken');

async function testPriceAlertComplete() {
  console.log('🔔 完整測試價格警報功能...\n');

  const testUserId = 'ue5cc188e1d2cdbac5cfda2abb6f6a34b';
  const testEmail = 'vic.huang.tw@gmail.com';
  
  // 生成測試 token
  const token = jwt.sign(
    { userId: testUserId, email: testEmail }, 
    process.env.JWT_SECRET, 
    { expiresIn: '1h' }
  );

  try {
    console.log('👤 測試用戶:', testUserId.substring(0, 10) + '...');
    
    // 步驟 1: 創建價格警報
    console.log('\n📝 步驟 1: 創建價格警報');
    const alertData = {
      symbol: 'BTCUSDT',
      alertType: 'price_above',
      targetPrice: 50000,
      notificationMethods: {
        lineMessaging: { enabled: true }
      }
    };

    const fetch = (await import('node-fetch')).default;
    
    const createResponse = await fetch('http://localhost:3000/api/notifications/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(alertData)
    });

    const createResult = await createResponse.json();
    
    if (createResult.status === 'success') {
      console.log('✅ 價格警報創建成功');
      console.log('警報 ID:', createResult.data.alert.id);
      
      const alertId = createResult.data.alert.id;
      
      // 步驟 2: 驗證警報
      console.log('\n🔍 步驟 2: 驗證警報創建');
      const listResponse = await fetch('http://localhost:3000/api/notifications/alerts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const listResult = await listResponse.json();
      console.log('✅ 當前警報數量:', listResult.data.alerts.length);
      
      if (listResult.data.alerts.length > 0) {
        const alert = listResult.data.alerts[0];
        console.log('📊 警報詳情:');
        console.log('  - 交易對:', alert.symbol);
        console.log('  - 類型:', alert.alertType);
        console.log('  - 目標價格:', alert.targetPrice);
        console.log('  - 狀態:', alert.status);
        console.log('  - LINE 通知:', alert.notificationMethods?.lineMessaging?.enabled ? '啟用' : '停用');
      }
      
      // 步驟 3: 測試 LINE 通知
      console.log('\n📱 步驟 3: 測試 LINE 通知');
      const testResponse = await fetch('http://localhost:3000/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          method: 'line',
          symbol: 'BTCUSDT'
        })
      });
      
      const testResult = await testResponse.json();
      
      if (testResult.status === 'success') {
        console.log('✅ LINE 通知測試成功');
        console.log('測試結果:', testResult.data.results);
      } else {
        console.log('❌ LINE 通知測試失敗');
        console.log('錯誤:', testResult.message);
      }
      
      // 步驟 4: 清理測試數據 (可選)
      console.log('\n🧹 步驟 4: 清理測試數據');
      const deleteResponse = await fetch(`http://localhost:3000/api/notifications/alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (deleteResponse.ok) {
        console.log('✅ 測試警報已刪除');
      }
      
    } else {
      console.log('❌ 價格警報創建失敗');
      console.log('錯誤:', createResult.message);
      console.log('詳情:', createResult.details || createResult);
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }

  console.log('\n🎉 測試完成！');
}

// 執行測試
testPriceAlertComplete();