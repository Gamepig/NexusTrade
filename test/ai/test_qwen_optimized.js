#!/usr/bin/env node

/**
 * 優化 Qwen 模型提示詞和參數，解決 JSON 輸出問題
 */

require('dotenv').config();

async function testQwenOptimized() {
  console.log('🔍 測試優化的 Qwen 模型配置');
  console.log('=====================================');

  const models = [
    'qwen/qwq-32b:free'  // 只測試最佳模型
  ];

  // 策略1：強制要求在 content 中回應，禁用推理
  const strategy1 = {
    name: '策略1：禁用推理，直接回應',
    system: '你是專業的加密貨幣分析師。請直接回應JSON格式結果，不要進行思考推理過程。立即輸出最終答案。',
    user: `分析 BTCUSDT：價格 $97000，變化 +2.5%，RSI: 65，MACD: 150

請立即回應JSON（不要推理過程）：
{"trend": {"direction": "bullish/bearish/neutral", "confidence": 75, "summary": "簡短總結"}}`,
    maxTokens: 200,
    temperature: 0.0
  };

  // 策略2：明確要求完整 JSON
  const strategy2 = {
    name: '策略2：明確結構要求',
    system: '你是專業分析師。回應必須是完整的有效JSON格式，以{開始，以}結束。',
    user: `BTCUSDT 分析：價格 $97000，+2.5%，RSI: 65，MACD: 150

返回完整JSON：
{"trend": {"direction": "bullish", "confidence": 75, "summary": "趨勢總結"}, "technicalAnalysis": {"rsi": {"signal": "持有", "interpretation": "RSI分析"}}}`,
    maxTokens: 300,
    temperature: 0.1
  };

  // 策略3：簡化請求
  const strategy3 = {
    name: '策略3：最簡化請求',
    system: '只返回JSON，無其他文字。',
    user: 'BTCUSDT 分析結果JSON：',
    maxTokens: 100,
    temperature: 0.0
  };

  const strategies = [strategy1, strategy2, strategy3];

  for (const model of models) {
    console.log(`\n📋 測試模型: ${model}`);
    console.log('─'.repeat(60));

    for (const strategy of strategies) {
      console.log(`\n🧪 ${strategy.name}`);
      console.log('─'.repeat(40));

      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://nexustrade.com',
            'X-Title': 'NexusTrade Optimized Test'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'system',
                content: strategy.system
              },
              {
                role: 'user',
                content: strategy.user
              }
            ],
            max_tokens: strategy.maxTokens,
            temperature: strategy.temperature
          })
        });

        if (response.ok) {
          const result = await response.json();
          
          console.log('✅ API 請求成功');
          console.log('Token 使用:', result.usage?.total_tokens);
          console.log('完成原因:', result.choices[0].finish_reason);
          
          const message = result.choices[0].message;
          console.log('\n📊 回應分析:');
          console.log('content 長度:', message.content?.length || 0);
          console.log('reasoning 長度:', message.reasoning?.length || 0);
          
          // 優先檢查 content
          let finalContent = '';
          if (message.content && message.content.trim() !== '') {
            finalContent = message.content;
            console.log('✅ 使用 content 欄位');
          } else if (message.reasoning && message.reasoning.trim() !== '') {
            finalContent = message.reasoning;
            console.log('🔄 使用 reasoning 欄位');
          }
          
          if (finalContent) {
            console.log('\n📄 最終內容:');
            console.log(finalContent);
            
            // JSON 解析測試
            console.log('\n🧪 JSON 解析測試:');
            try {
              // 嘗試多種提取方法
              const jsonPatterns = [
                { name: '直接解析', extract: (text) => text },
                { name: '提取{}', extract: (text) => (text.match(/\{[\s\S]*\}/) || [])[0] },
                { name: '提取JSON塊', extract: (text) => (text.match(/```json\s*(\{[\s\S]*?\})\s*```/) || [])[1] },
                { name: '提取```塊', extract: (text) => (text.match(/```(\{[\s\S]*?\})```/) || [])[1] }
              ];
              
              let parsed = null;
              for (const pattern of jsonPatterns) {
                try {
                  const extracted = pattern.extract(finalContent);
                  if (extracted) {
                    parsed = JSON.parse(extracted);
                    console.log(`✅ ${pattern.name}: 成功`);
                    console.log('解析結果:', JSON.stringify(parsed, null, 2));
                    break;
                  }
                } catch (e) {
                  console.log(`❌ ${pattern.name}: ${e.message}`);
                }
              }
              
              if (!parsed) {
                console.log('❌ 所有解析策略都失敗');
              }
              
            } catch (error) {
              console.log('❌ JSON 解析失敗:', error.message);
            }
          } else {
            console.log('❌ 無有效內容');
          }
          
        } else {
          const errorText = await response.text();
          console.log('❌ API 失敗:', response.status, errorText.substring(0, 200));
        }

      } catch (error) {
        console.log('❌ 請求異常:', error.message);
      }

      // 策略間等待
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // 測試完全不同的方法：使用英文
  console.log('\n🌍 測試英文策略');
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
          {
            role: 'system',
            content: 'You are a crypto analyst. Return only JSON format response, no reasoning.'
          },
          {
            role: 'user',
            content: 'Analyze BTCUSDT: price $97000, change +2.5%, RSI 65, MACD 150. Return JSON: {"trend": {"direction": "bullish", "confidence": 75}}'
          }
        ],
        max_tokens: 150,
        temperature: 0.0
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ 英文測試成功');
      console.log('Content:', JSON.stringify(result.choices[0].message.content));
      console.log('Reasoning length:', result.choices[0].message.reasoning?.length || 0);
    } else {
      console.log('❌ 英文測試失敗:', response.status);
    }
  } catch (error) {
    console.log('❌ 英文測試異常:', error.message);
  }
}

// 執行測試
testQwenOptimized().then(() => {
  console.log('\n🏁 Qwen 優化測試完成');
  process.exit(0);
}).catch(error => {
  console.error('💥 測試失敗:', error);
  process.exit(1);
});