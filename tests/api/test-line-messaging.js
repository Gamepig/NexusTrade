/**
 * LINE Messaging 模組功能測試腳本
 * 
 * 用於驗證 LINE Messaging 模組的各項功能是否正常運作
 * 
 * 使用方法：
 * node test-line-messaging.js
 * 
 * @author NexusTrade 開發團隊
 * @version 1.0.0
 */

require('dotenv').config();
const axios = require('axios');

// 測試設定
const API_BASE_URL = 'http://localhost:3000/api/line-messaging';
const TEST_USER_ID = 'test_user_id_123'; // 測試用的 LINE 使用者 ID

console.log('🧪 LINE Messaging 模組功能測試開始');
console.log('===============================================\n');

/**
 * 測試服務狀態
 */
async function testServiceStatus() {
  console.log('📊 測試 1: 檢查服務狀態');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/status`);
    
    if (response.data.success) {
      console.log('✅ 服務狀態正常');
      console.log('   - 模組已配置:', response.data.data.isConfigured);
      console.log('   - 可用端點數量:', Object.keys(response.data.data.endpoints).length);
      console.log('   - 可用模板:', {
        text: response.data.data.availableTemplates.text.length,
        flex: response.data.data.availableTemplates.flex.length
      });
    } else {
      console.log('❌ 服務狀態異常:', response.data.error);
    }
  } catch (error) {
    console.log('❌ 服務狀態檢查失敗:', error.message);
  }
  
  console.log('');
}

/**
 * 測試模板列表
 */
async function testTemplatesList() {
  console.log('📋 測試 2: 取得可用模板列表');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/templates`);
    
    if (response.data.success) {
      console.log('✅ 模板列表取得成功');
      console.log('   - 文字模板:', response.data.data.text.map(t => t.name).join(', '));
      console.log('   - Flex 模板:', response.data.data.flex.map(t => t.name).join(', '));
    } else {
      console.log('❌ 模板列表取得失敗:', response.data.error);
    }
  } catch (error) {
    console.log('❌ 模板列表請求失敗:', error.message);
  }
  
  console.log('');
}

/**
 * 測試文字訊息發送
 */
async function testTextMessage() {
  console.log('💬 測試 3: 發送文字訊息');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/send`, {
      userId: TEST_USER_ID,
      message: 'Hello from NexusTrade LINE Messaging 模組測試！\n\n這是一則測試訊息，用來驗證文字訊息發送功能是否正常運作。',
      messageType: 'text'
    });
    
    if (response.data.success) {
      console.log('✅ 文字訊息發送成功');
      console.log('   - 訊息 ID:', response.data.data.messageId || '未提供');
      console.log('   - 發送時間:', response.data.data.timestamp);
    } else {
      console.log('❌ 文字訊息發送失敗:', response.data.error.message);
    }
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('❌ 文字訊息發送失敗:', error.response.data.error.message);
    } else {
      console.log('❌ 文字訊息發送請求失敗:', error.message);
    }
  }
  
  console.log('');
}

/**
 * 測試模板訊息發送 - 歡迎訊息
 */
async function testWelcomeTemplate() {
  console.log('🎉 測試 4: 發送歡迎模板訊息');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/template`, {
      userId: TEST_USER_ID,
      templateName: 'welcome',
      templateData: {
        username: '測試用戶',
        platform: 'NexusTrade'
      }
    });
    
    if (response.data.success) {
      console.log('✅ 歡迎模板訊息發送成功');
      console.log('   - 發送時間:', response.data.data.timestamp);
    } else {
      console.log('❌ 歡迎模板訊息發送失敗:', response.data.error.message);
    }
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('❌ 歡迎模板訊息發送失敗:', error.response.data.error.message);
    } else {
      console.log('❌ 歡迎模板訊息發送請求失敗:', error.message);
    }
  }
  
  console.log('');
}

/**
 * 測試價格警報訊息
 */
async function testPriceAlertTemplate() {
  console.log('📈 測試 5: 發送價格警報模板訊息');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/template`, {
      userId: TEST_USER_ID,
      templateName: 'priceAlert',
      templateData: {
        symbol: 'BTCUSDT',
        currentPrice: '102500.50',
        targetPrice: '100000.00',
        alertType: 'above',
        changePercent: 2.5,
        timestamp: new Date().toLocaleString('zh-TW')
      }
    });
    
    if (response.data.success) {
      console.log('✅ 價格警報模板訊息發送成功');
      console.log('   - 發送時間:', response.data.data.timestamp);
    } else {
      console.log('❌ 價格警報模板訊息發送失敗:', response.data.error.message);
    }
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('❌ 價格警報模板訊息發送失敗:', error.response.data.error.message);
    } else {
      console.log('❌ 價格警報模板訊息發送請求失敗:', error.message);
    }
  }
  
  console.log('');
}

/**
 * 測試批量訊息發送
 */
async function testBatchMessage() {
  console.log('📤 測試 6: 批量發送訊息');
  
  const testUserIds = [TEST_USER_ID, 'test_user_2', 'test_user_3'];
  
  try {
    const response = await axios.post(`${API_BASE_URL}/batch`, {
      userIds: testUserIds,
      message: '這是一則批量測試訊息，用來驗證批量發送功能。',
      messageType: 'text',
      options: {
        batchSize: 2,
        batchDelay: 100
      }
    });
    
    if (response.data.success) {
      console.log('✅ 批量訊息發送完成');
      console.log('   - 總使用者數:', response.data.data.totalUsers);
      console.log('   - 成功批次:', response.data.data.successfulBatches);
      console.log('   - 失敗批次:', response.data.data.failedBatches);
    } else {
      console.log('❌ 批量訊息發送失敗:', response.data.error.message);
    }
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('❌ 批量訊息發送失敗:', error.response.data.error.message);
    } else {
      console.log('❌ 批量訊息發送請求失敗:', error.message);
    }
  }
  
  console.log('');
}

/**
 * 測試快速價格警報
 */
async function testQuickPriceAlert() {
  console.log('⚡ 測試 7: 快速價格警報');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/quick/price-alert`, {
      userId: TEST_USER_ID,
      alertData: {
        symbol: 'ETHUSDT',
        currentPrice: '3850.25',
        targetPrice: '4000.00',
        alertType: 'above',
        changePercent: 3.75
      }
    });
    
    if (response.data.success) {
      console.log('✅ 快速價格警報發送成功');
      console.log('   - 發送時間:', response.data.data.timestamp);
    } else {
      console.log('❌ 快速價格警報發送失敗:', response.data.error.message);
    }
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('❌ 快速價格警報發送失敗:', error.response.data.error.message);
    } else {
      console.log('❌ 快速價格警報發送請求失敗:', error.message);
    }
  }
  
  console.log('');
}

/**
 * 測試 Webhook 簽名驗證
 */
async function testWebhookSignature() {
  console.log('🔐 測試 8: Webhook 簽名驗證');
  
  try {
    const testBody = JSON.stringify({ test: 'webhook validation' });
    const testSignature = 'sha256=test_signature';
    
    const response = await axios.post(`${API_BASE_URL}/webhook/verify`, {
      body: testBody,
      signature: testSignature
    });
    
    if (response.data.success) {
      console.log('✅ Webhook 簽名驗證功能正常');
      console.log('   - 驗證結果:', response.data.data.isValid ? '有效' : '無效');
    } else {
      console.log('❌ Webhook 簽名驗證失敗:', response.data.error.message);
    }
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('❌ Webhook 簽名驗證失敗:', error.response.data.error.message);
    } else {
      console.log('❌ Webhook 簽名驗證請求失敗:', error.message);
    }
  }
  
  console.log('');
}

/**
 * 測試輸入驗證
 */
async function testInputValidation() {
  console.log('🛡️ 測試 9: 輸入驗證功能');
  
  // 測試無效的使用者 ID
  try {
    const response = await axios.post(`${API_BASE_URL}/send`, {
      userId: '', // 空的使用者 ID
      message: 'Test message'
    });
    
    console.log('❌ 輸入驗證未正常運作 - 應該拒絕空的使用者 ID');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ 輸入驗證正常 - 正確拒絕無效輸入');
    } else {
      console.log('❌ 輸入驗證測試失敗:', error.message);
    }
  }
  
  console.log('');
}

/**
 * 執行所有測試
 */
async function runAllTests() {
  console.log(`🔧 測試環境設定:`);
  console.log(`   - API 基礎 URL: ${API_BASE_URL}`);
  console.log(`   - 測試使用者 ID: ${TEST_USER_ID}`);
  console.log(`   - LINE Channel ID: ${process.env.LINE_CHANNEL_ID || '未設定'}`);
  console.log(`   - LINE Access Token: ${process.env.LINE_ACCESS_TOKEN ? '已設定' : '未設定'}`);
  console.log('');
  
  await testServiceStatus();
  await testTemplatesList();
  await testTextMessage();
  await testWelcomeTemplate();
  await testPriceAlertTemplate();
  await testBatchMessage();
  await testQuickPriceAlert();
  await testWebhookSignature();
  await testInputValidation();
  
  console.log('===============================================');
  console.log('🏁 LINE Messaging 模組功能測試完成');
  console.log('');
  console.log('📝 測試結果摘要:');
  console.log('   - 如果看到 ✅ 表示該功能正常');
  console.log('   - 如果看到 ❌ 表示該功能需要檢查');
  console.log('   - 實際的 LINE 訊息發送需要有效的使用者 ID');
  console.log('');
  console.log('💡 下一步建議:');
  console.log('   1. 確認 LINE Bot 已加為好友');
  console.log('   2. 使用真實的 LINE 使用者 ID 進行測試');
  console.log('   3. 檢查 LINE Developers Console 的 Webhook 設定');
  console.log('   4. 監控伺服器日誌以了解詳細運作情況');
}

// 執行測試
runAllTests().catch(error => {
  console.error('❌ 測試執行失敗:', error.message);
  process.exit(1);
});