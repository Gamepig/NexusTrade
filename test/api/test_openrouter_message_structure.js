/**
 * 測試 OpenRouter API 回應中 message 物件結構問題
 */

require('dotenv').config();

async function testOpenRouterMessage() {
  console.log('🔍 測試 OpenRouter Message 結構\n');
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.log('❌ 缺少 OPENROUTER_API_KEY');
    return;
  }
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'NexusTrade',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen-2.5-72b-instruct:free',
        messages: [
          {
            role: 'system',
            content: '你是加密貨幣分析專家。請只回應 JSON 格式，不要其他文字。'
          },
          {
            role: 'user',
            content: '分析 BTCUSDT，請返回簡單的 JSON：{"test": "value", "number": 123}'
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      console.log('❌ API 請求失敗:', response.status, response.statusText);
      return;
    }
    
    const result = await response.json();
    
    console.log('=== 1. API 回應基本資訊 ===');
    console.log('choices 存在:', !!result.choices);
    console.log('choices 長度:', result.choices?.length || 0);
    
    if (result.choices && result.choices[0]) {
      const choice = result.choices[0];
      console.log('第一個 choice 鍵值:', Object.keys(choice));
      
      if (choice.message) {
        const message = choice.message;
        console.log('\n=== 2. Message 物件結構分析 ===');
        console.log('message 類型:', typeof message);
        console.log('message 是否為陣列:', Array.isArray(message));
        console.log('message 鍵值:', Object.keys(message));
        console.log('message JSON:', JSON.stringify(message, null, 2));
        
        console.log('\n=== 3. 各屬性詳細檢查 ===');
        console.log('message.role:', JSON.stringify(message.role));
        console.log('message.content 存在:', !!message.content);
        console.log('message.content 類型:', typeof message.content);
        if (message.content) {
          console.log('message.content 長度:', message.content.length);
          console.log('message.content 前100字符:', message.content.substring(0, 100));
        }
        
        console.log('\n=== 4. 數字鍵值檢查 ===');
        console.log('message["0"]:', JSON.stringify(message["0"]));
        console.log('message["1"]:', JSON.stringify(message["1"]));
        console.log('message[0]:', JSON.stringify(message[0]));
        console.log('message[1]:', JSON.stringify(message[1]));
        
        console.log('\n=== 5. 測試 JSON 解析 ===');
        if (message.content) {
          try {
            const parsed = JSON.parse(message.content);
            console.log('✅ message.content 直接解析成功:', parsed);
          } catch (e) {
            console.log('❌ message.content 解析失敗:', e.message);
          }
        }
        
        // 測試強制修復邏輯中使用的 message[1]
        if (message[1]) {
          try {
            const parsed = JSON.parse(message[1]);
            console.log('✅ message[1] 解析成功:', parsed);
          } catch (e) {
            console.log('❌ message[1] 解析失敗:', e.message);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

testOpenRouterMessage().catch(console.error);