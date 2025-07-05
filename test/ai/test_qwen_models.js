#!/usr/bin/env node

/**
 * 測試 Qwen 模型的結構化 JSON 輸出能力
 * 測試模型：qwen/qwq-32b:free 和 qwen/qwen3-30b-a3b-04-28:free
 */

require('dotenv').config();

async function testQwenModels() {
  console.log('🔍 測試 Qwen 模型的 JSON 輸出能力');
  console.log('=============================================');

  const models = [
    'qwen/qwq-32b:free',
    'qwen/qwen3-30b-a3b-04-28:free'
  ];

  const testPrompt = `分析 BTCUSDT 加密貨幣，當前價格 $97000，24h變化 +2.5%

技術指標：
RSI: 65.2
MACD: 150.3
MA7: 96500
Williams %R: -25.8

請提供JSON格式分析：
{
  "trend": {"direction": "bullish/bearish/neutral", "confidence": 75, "summary": "趨勢總結"},
  "technicalAnalysis": {
    "rsi": {"signal": "買入/賣出/持有", "interpretation": "RSI分析"},
    "macd": {"signal": "買入/賣出/持有", "interpretation": "MACD分析"},
    "movingAverage": {"signal": "看漲/看跌/持有", "interpretation": "均線分析"},
    "bollingerBands": {"signal": "買入/賣出/等待突破", "interpretation": "布林帶分析"},
    "volume": {"signal": "觀望/積極/謹慎", "interpretation": "成交量分析"},
    "williamsR": {"signal": "買入/賣出/持有", "interpretation": "威廉指標分析"}
  },
  "marketSentiment": {"score": 65, "label": "neutral", "summary": "情緒評估"}
}

只回應JSON：`;

  for (const model of models) {
    console.log(`\n📋 測試模型: ${model}`);
    console.log('─'.repeat(60));

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
              content: '你是專業的加密貨幣分析師，請根據提供的技術指標數據提供JSON格式的分析結果。直接返回JSON，不要添加額外說明。'
            },
            {
              role: 'user',
              content: testPrompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.1
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        console.log('✅ API 請求成功');
        console.log('📊 使用模型:', result.model || model);
        console.log('🔢 Token 使用:', JSON.stringify(result.usage || {}));
        
        // 檢查回應結構
        const message = result.choices?.[0]?.message;
        if (message) {
          console.log('📝 回應結構分析:');
          console.log('  - content 長度:', message.content?.length || 0);
          console.log('  - content 類型:', typeof message.content);
          console.log('  - 有 reasoning 欄位:', !!message.reasoning);
          
          let responseContent = message.content;
          if (message.reasoning && (!responseContent || responseContent.trim() === '')) {
            console.log('🔄 使用 reasoning 欄位內容');
            responseContent = message.reasoning;
          }
          
          if (responseContent && responseContent.length > 0) {
            console.log('📄 回應內容 (前300字):');
            console.log(responseContent.substring(0, 300));
            
            // 嘗試解析 JSON
            console.log('\n🧪 JSON 解析測試:');
            try {
              // 嘗試多種 JSON 提取策略
              const jsonPatterns = [
                /\{[\s\S]*\}/,                    // 完整 JSON 對象
                /```json\s*(\{[\s\S]*?\})\s*```/, // markdown 包裝
                /```(\{[\s\S]*?\})```/,           // 簡單 ``` 包裝
                /"trend"[\s\S]*?\}\s*\}/          // 從 trend 開始
              ];
              
              let parsedJson = null;
              let usedPattern = null;
              
              for (let i = 0; i < jsonPatterns.length; i++) {
                const pattern = jsonPatterns[i];
                const match = responseContent.match(pattern);
                if (match) {
                  try {
                    const jsonText = match[1] || match[0];
                    parsedJson = JSON.parse(jsonText);
                    usedPattern = i + 1;
                    break;
                  } catch (e) {
                    continue;
                  }
                }
              }
              
              if (parsedJson) {
                console.log(`✅ JSON 解析成功 (策略 ${usedPattern})`);
                console.log('🎯 解析結果結構:');
                console.log('  - 有 trend:', !!parsedJson.trend);
                console.log('  - 有 technicalAnalysis:', !!parsedJson.technicalAnalysis);
                console.log('  - 有 marketSentiment:', !!parsedJson.marketSentiment);
                
                if (parsedJson.technicalAnalysis) {
                  const indicators = Object.keys(parsedJson.technicalAnalysis);
                  console.log('  - 技術指標數量:', indicators.length);
                  console.log('  - 指標清單:', indicators.join(', '));
                }
                
                console.log('📋 完整解析結果:');
                console.log(JSON.stringify(parsedJson, null, 2));
                
              } else {
                console.log('❌ JSON 解析失敗 - 無法提取有效 JSON');
              }
              
            } catch (error) {
              console.log('❌ JSON 解析異常:', error.message);
            }
            
          } else {
            console.log('❌ 無回應內容：content 和 reasoning 都為空');
            console.log('完整 message 結構:', JSON.stringify(message, null, 2));
          }
          
        } else {
          console.log('❌ 無有效回應結構');
          console.log('完整回應:', JSON.stringify(result, null, 2));
        }
        
      } else {
        const errorText = await response.text();
        console.log('❌ API 請求失敗:', response.status, response.statusText);
        console.log('錯誤內容:', errorText.substring(0, 300));
        
        if (response.status === 429) {
          console.log('🚨 遇到速率限制');
          console.log('  - Retry-After:', response.headers.get('retry-after'));
          console.log('  - X-RateLimit-Remaining:', response.headers.get('x-ratelimit-remaining'));
        }
      }

    } catch (error) {
      console.log('❌ 請求異常:', error.message);
    }

    // 等待避免速率限制
    if (models.indexOf(model) < models.length - 1) {
      console.log('\n⏳ 等待 2 秒避免速率限制...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // 測試簡單英文請求
  console.log('\n🧪 測試英文簡單請求 (qwen/qwq-32b:free)');
  console.log('─'.repeat(60));
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwq-32b:free',
        messages: [
          { role: 'user', content: 'Provide a simple JSON: {"status": "ok", "message": "test"}' }
        ],
        max_tokens: 50
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ 英文簡單請求成功');
      console.log('回應內容:', JSON.stringify(result.choices[0].message.content));
    } else {
      console.log('❌ 英文簡單請求失敗:', response.status);
    }
  } catch (error) {
    console.log('❌ 英文簡單請求異常:', error.message);
  }
}

// 執行測試
testQwenModels().then(() => {
  console.log('\n🏁 Qwen 模型測試完成');
  process.exit(0);
}).catch(error => {
  console.error('💥 測試失敗:', error);
  process.exit(1);
});