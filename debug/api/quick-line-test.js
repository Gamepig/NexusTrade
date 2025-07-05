/**
 * 快速 LINE Webhook 測試工具
 * 
 * 模擬 LINE Platform 發送的 Webhook 事件
 * 用於測試我們的處理邏輯是否正常
 */

const axios = require('axios');

const testEvent = {
  "events": [
    {
      "type": "message",
      "id": "test-message-123",
      "timestamp": Date.now(),
      "source": {
        "userId": "U4af4980629ba4a81234567890abcdef0",
        "type": "user"
      },
      "message": {
        "id": "test-msg-456",
        "type": "text",
        "text": "測試訊息"
      },
      "replyToken": "test-reply-token-789"
    }
  ]
};

const testFollowEvent = {
  "events": [
    {
      "type": "follow",
      "id": "test-follow-123",
      "timestamp": Date.now(),
      "source": {
        "userId": "U4af4980629ba4a81234567890abcdef0",
        "type": "user"
      },
      "replyToken": "test-follow-token-789"
    }
  ]
};

async function testWebhook() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 快速 LINE Webhook 測試');
  console.log('============================');
  
  try {
    // 測試 GET 端點
    console.log('\n1. 測試 GET /api/line/webhook...');
    const getResponse = await axios.get(`${baseUrl}/api/line/webhook`);
    console.log('✅ GET 請求成功:', getResponse.data.message);
    
    // 測試 POST 端點 - 訊息事件
    console.log('\n2. 測試 POST /api/line/webhook (訊息事件)...');
    const postResponse = await axios.post(`${baseUrl}/api/line/webhook`, testEvent, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ POST 請求成功:', postResponse.data.message);
    
    // 測試 POST 端點 - 關注事件
    console.log('\n3. 測試 POST /api/line/webhook (關注事件)...');
    const followResponse = await axios.post(`${baseUrl}/api/line/webhook`, testFollowEvent, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ 關注事件測試成功:', followResponse.data.message);
    
    console.log('\n🎉 所有測試通過！Webhook 端點運作正常。');
    console.log('\n📋 如果您在 LINE 應用程式中發送訊息後仍看不到事件：');
    console.log('   1. 檢查 LINE Developers Console 中的 Webhook 設定');
    console.log('   2. 確認 ngrok URL 正確且可訪問');
    console.log('   3. 檢查機器人是否已加為好友');
    console.log('   4. 確認 "Use webhook" 選項已啟用');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    if (error.response) {
      console.error('回應狀態:', error.response.status);
      console.error('回應內容:', error.response.data);
    }
  }
}

// 執行測試
testWebhook();