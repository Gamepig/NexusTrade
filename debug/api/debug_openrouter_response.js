#!/usr/bin/env node

/**
 * 深度診斷 OpenRouter 回應內容為空的問題
 */

require('dotenv').config();

async function debugOpenRouterResponse() {
  try {
    console.log('🔍 深度診斷 OpenRouter 回應問題');
    console.log('=====================================');

    const models = [
      'meta-llama/llama-4-scout:free',
      'meta-llama/llama-4-maverick:free',
      'google/gemini-2.0-flash-exp:free'
    ];

    for (const model of models) {
      console.log(`\n📋 測試模型: ${model}`);
      console.log('─'.repeat(50));

      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://nexustrade.com',
            'X-Title': 'NexusTrade Currency Analysis'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'system',
                content: '你是專業的加密貨幣分析師，請根據數據提供JSON格式的技術分析。'
              },
              {
                role: 'user',
                content: `請分析 BTCUSDT，當前價格 $97000，24h變化 +2.5%。請提供JSON格式：
                {
                  "trend": {"direction": "bullish", "confidence": 75, "summary": "分析總結"},
                  "technicalAnalysis": {
                    "rsi": {"value": 65, "signal": "持有", "interpretation": "RSI接近超買"},
                    "macd": {"value": 150, "signal": "買入", "interpretation": "MACD正向交叉"}
                  },
                  "marketSentiment": {"score": 70, "label": "greed", "summary": "市場情緒偏樂觀"}
                }`
              }
            ],
            max_tokens: 1000,
            temperature: 0.1
          })
        });

        if (response.ok) {
          const result = await response.json();
          
          console.log('✅ HTTP 狀態: 成功');
          console.log('📊 使用模型:', result.model || model);
          console.log('🔢 Token 使用:', result.usage?.total_tokens || '未知');
          
          // 檢查回應結構
          const message = result.choices?.[0]?.message;
          if (message) {
            console.log('📝 回應結構:');
            console.log('  - content 長度:', message.content?.length || 0);
            console.log('  - content 類型:', typeof message.content);
            console.log('  - 是否有 reasoning:', !!message.reasoning);
            
            if (message.reasoning) {
              console.log('  - reasoning 長度:', message.reasoning.length);
            }
            
            // 顯示回應內容
            if (message.content && message.content.length > 0) {
              console.log('📄 回應內容 (前200字):');
              console.log(JSON.stringify(message.content.substring(0, 200)));
            } else if (message.reasoning && message.reasoning.length > 0) {
              console.log('🧠 推理內容 (前200字):');
              console.log(JSON.stringify(message.reasoning.substring(0, 200)));
            } else {
              console.log('❌ 無內容：content 和 reasoning 都為空');
              console.log('完整 message 結構:', JSON.stringify(message, null, 2));
            }
          } else {
            console.log('❌ 無有效回應結構');
            console.log('完整回應:', JSON.stringify(result, null, 2));
          }
          
        } else {
          const errorText = await response.text();
          console.log('❌ HTTP 錯誤:', response.status, response.statusText);
          console.log('錯誤內容:', errorText.substring(0, 300));
          
          // 檢查頭部資訊
          if (response.status === 429) {
            console.log('📈 Rate limit 資訊:');
            console.log('  - Retry-After:', response.headers.get('retry-after'));
            console.log('  - X-RateLimit-Remaining:', response.headers.get('x-ratelimit-remaining'));
            console.log('  - X-RateLimit-Reset:', response.headers.get('x-ratelimit-reset'));
          }
        }

      } catch (error) {
        console.log('❌ 請求異常:', error.message);
      }

      // 等待一秒避免速率限制
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 測試最簡單的請求
    console.log('\n🧪 測試最簡單的請求');
    console.log('─'.repeat(50));
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout:free',
          messages: [
            { role: 'user', content: 'Hello' }
          ],
          max_tokens: 10
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 簡單請求成功');
        console.log('回應內容:', JSON.stringify(result.choices[0].message.content));
      } else {
        console.log('❌ 簡單請求失敗:', response.status);
      }
    } catch (error) {
      console.log('❌ 簡單請求異常:', error.message);
    }

  } catch (error) {
    console.error('❌ 診斷過程發生錯誤:', error.message);
  }
}

// 執行診斷
debugOpenRouterResponse().then(() => {
  console.log('\n🏁 OpenRouter 回應診斷完成');
  process.exit(0);
}).catch(error => {
  console.error('💥 診斷失敗:', error);
  process.exit(1);
});