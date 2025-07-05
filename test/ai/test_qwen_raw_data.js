#!/usr/bin/env node

/**
 * 測試 Qwen 模型的原始回應數據結構
 * 詳細分析 API 回應格式，以便制定正確的解析策略
 */

require('dotenv').config();

async function testQwenRawData() {
  console.log('🔍 測試 Qwen 模型原始回應數據');
  console.log('========================================');

  const models = [
    'qwen/qwq-32b:free',
    'qwen/qwen3-30b-a3b-04-28:free'
  ];

  const simplePrompt = `分析 BTCUSDT，價格 $97000，變化 +2.5%

技術指標：RSI: 65, MACD: 150

JSON回應：{"trend": {"direction": "bullish", "confidence": 75}}`;

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
          'X-Title': 'NexusTrade Test'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: '你是專業分析師，直接返回JSON格式結果。'
            },
            {
              role: 'user',
              content: simplePrompt
            }
          ],
          max_tokens: 500,
          temperature: 0.1
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        console.log('✅ API 請求成功');
        console.log('📊 回應統計:', {
          model: result.model,
          promptTokens: result.usage?.prompt_tokens,
          completionTokens: result.usage?.completion_tokens,
          totalTokens: result.usage?.total_tokens
        });
        
        // 完整顯示原始回應結構
        console.log('\n🔍 完整 API 回應結構:');
        console.log('='.repeat(80));
        console.log(JSON.stringify(result, null, 2));
        console.log('='.repeat(80));
        
        // 詳細分析 message 結構
        const message = result.choices?.[0]?.message;
        if (message) {
          console.log('\n📝 Message 結構詳細分析:');
          console.log('─'.repeat(40));
          console.log('欄位檢查:');
          console.log('  - role:', JSON.stringify(message.role));
          console.log('  - content 存在:', !!message.content);
          console.log('  - content 類型:', typeof message.content);
          console.log('  - content 長度:', message.content?.length || 0);
          console.log('  - reasoning 存在:', !!message.reasoning);
          console.log('  - reasoning 類型:', typeof message.reasoning);
          console.log('  - reasoning 長度:', message.reasoning?.length || 0);
          console.log('  - 其他欄位:', Object.keys(message).filter(k => !['role', 'content', 'reasoning'].includes(k)));
          
          // 顯示 content 內容
          if (message.content) {
            console.log('\n📄 Content 內容:');
            console.log('─'.repeat(40));
            console.log('完整 content:', JSON.stringify(message.content));
            console.log('content 原始文字:');
            console.log(message.content);
          }
          
          // 顯示 reasoning 內容
          if (message.reasoning) {
            console.log('\n🧠 Reasoning 內容:');
            console.log('─'.repeat(40));
            console.log('reasoning 前200字符:', message.reasoning.substring(0, 200));
            if (message.reasoning.length > 200) {
              console.log('reasoning 最後200字符:', message.reasoning.substring(message.reasoning.length - 200));
            }
          }
          
          // JSON 提取測試
          console.log('\n🧪 JSON 提取測試:');
          console.log('─'.repeat(40));
          
          const contentToTest = message.content || message.reasoning || '';
          if (contentToTest) {
            // 測試多種 JSON 提取策略
            const strategies = [
              {
                name: '直接解析完整內容',
                regex: null,
                process: (text) => JSON.parse(text)
              },
              {
                name: '提取 {} 對象',
                regex: /\{[\s\S]*\}/,
                process: (text, match) => JSON.parse(match[0])
              },
              {
                name: '提取 markdown JSON',
                regex: /```json\s*(\{[\s\S]*?\})\s*```/,
                process: (text, match) => JSON.parse(match[1])
              },
              {
                name: '提取 ``` 包裝',
                regex: /```(\{[\s\S]*?\})```/,
                process: (text, match) => JSON.parse(match[1])
              },
              {
                name: '從 trend 開始',
                regex: /"trend"[\s\S]*?\}\s*\}/,
                process: (text, match) => JSON.parse('{' + match[0])
              }
            ];
            
            for (const strategy of strategies) {
              try {
                let jsonResult;
                if (strategy.regex) {
                  const match = contentToTest.match(strategy.regex);
                  if (match) {
                    jsonResult = strategy.process(contentToTest, match);
                  } else {
                    console.log(`❌ ${strategy.name}: 無匹配`);
                    continue;
                  }
                } else {
                  jsonResult = strategy.process(contentToTest);
                }
                
                console.log(`✅ ${strategy.name}: 成功`);
                console.log('  解析結果:', JSON.stringify(jsonResult));
                break; // 成功後停止嘗試
                
              } catch (error) {
                console.log(`❌ ${strategy.name}: ${error.message}`);
              }
            }
          } else {
            console.log('❌ 無內容可供 JSON 提取');
          }
          
        } else {
          console.log('❌ 無有效 message 結構');
        }
        
      } else {
        const errorText = await response.text();
        console.log('❌ API 請求失敗:', response.status, response.statusText);
        console.log('錯誤內容:', errorText);
      }

    } catch (error) {
      console.log('❌ 請求異常:', error.message);
    }

    // 等待避免速率限制
    if (models.indexOf(model) < models.length - 1) {
      console.log('\n⏳ 等待 3 秒避免速率限制...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

// 執行測試
testQwenRawData().then(() => {
  console.log('\n🏁 Qwen 原始數據測試完成');
  process.exit(0);
}).catch(error => {
  console.error('💥 測試失敗:', error);
  process.exit(1);
});