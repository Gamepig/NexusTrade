#!/usr/bin/env node

/**
 * 測試非推理型的替代模型
 * 尋找能直接在 content 中返回 JSON 的模型
 */

require('dotenv').config();

async function testAlternativeModels() {
  console.log('🔍 測試非推理型替代模型');
  console.log('============================');

  // 非推理型的免費模型
  const models = [
    'qwen/qwen-2.5-72b-instruct:free',
    'google/gemini-flash-1.5:free', 
    'meta-llama/llama-3.1-8b-instruct:free',
    'microsoft/phi-3-medium-4k-instruct:free',
    'mistralai/mistral-7b-instruct:free'
  ];

  const testPrompt = `分析 BTCUSDT：價格 $97000，變化 +2.5%，RSI: 65，MACD: 150

回傳 JSON：{"trend": {"direction": "bullish", "confidence": 75, "summary": "簡短分析"}}`;

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
          'X-Title': 'NexusTrade Model Test'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system', 
              content: '你是專業分析師。直接返回JSON格式結果，不要推理過程。'
            },
            {
              role: 'user',
              content: testPrompt
            }
          ],
          max_tokens: 300,
          temperature: 0.1
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        console.log('✅ API 請求成功');
        console.log('Token 使用:', result.usage?.total_tokens);
        console.log('完成原因:', result.choices[0].finish_reason);
        
        const message = result.choices[0].message;
        console.log('\n📊 回應結構:');
        console.log('- content 長度:', message.content?.length || 0);
        console.log('- reasoning 存在:', !!message.reasoning);
        console.log('- reasoning 長度:', message.reasoning?.length || 0);
        
        if (message.content && message.content.trim() !== '') {
          console.log('\n📄 Content 內容:');
          console.log(message.content);
          
          // JSON 解析測試
          console.log('\n🧪 JSON 解析測試:');
          try {
            // 嘗試提取 JSON
            const jsonMatch = message.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              console.log('✅ JSON 解析成功');
              console.log('結構完整性:', {
                trend: !!parsed.trend,
                direction: !!parsed.trend?.direction,
                confidence: typeof parsed.trend?.confidence === 'number'
              });
              console.log('解析結果:', JSON.stringify(parsed, null, 2));
            } else {
              console.log('❌ 未找到 JSON 結構');
            }
          } catch (error) {
            console.log('❌ JSON 解析失敗:', error.message);
          }
        } else {
          console.log('❌ Content 為空');
          if (message.reasoning) {
            console.log('⚠️ 內容在 reasoning 中（推理型模型）');
          }
        }
        
      } else {
        const errorText = await response.text();
        console.log('❌ API 失敗:', response.status);
        if (response.status === 429) {
          console.log('🚨 速率限制');
        } else if (response.status === 404) {
          console.log('🚨 模型不存在');
        } else {
          console.log('錯誤:', errorText.substring(0, 100));
        }
      }

    } catch (error) {
      console.log('❌ 請求異常:', error.message);
    }

    // 等待避免速率限制
    if (models.indexOf(model) < models.length - 1) {
      console.log('\n⏳ 等待 2 秒...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // 總結最佳模型
  console.log('\n📊 測試總結');
  console.log('='.repeat(60));
  console.log('尋找符合以下條件的模型：');
  console.log('1. ✅ Content 有完整 JSON 回應');
  console.log('2. ✅ 不使用 reasoning 欄位');
  console.log('3. ✅ 可以直接解析 JSON');
  console.log('4. ✅ 支援中文技術分析');
}

// 執行測試
testAlternativeModels().then(() => {
  console.log('\n🏁 替代模型測試完成');
  process.exit(0);
}).catch(error => {
  console.error('💥 測試失敗:', error);
  process.exit(1);
});