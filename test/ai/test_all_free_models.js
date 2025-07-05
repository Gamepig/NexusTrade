#!/usr/bin/env node

/**
 * 測試所有可用的免費模型
 * 找到最適合 JSON 輸出的模型
 */

require('dotenv').config();

async function testAllFreeModels() {
  console.log('🔍 測試所有免費模型的 JSON 輸出能力');
  console.log('========================================');

  // 包含更多免費模型
  const models = [
    // Qwen 系列
    'qwen/qwen-2.5-72b-instruct:free',
    'qwen/qwen-2.5-32b-instruct:free', 
    'qwen/qwen-2.5-7b-instruct:free',
    
    // Llama 系列
    'meta-llama/llama-3.1-8b-instruct:free',
    'meta-llama/llama-3.1-70b-instruct:free',
    'meta-llama/llama-3.2-1b-instruct:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    
    // Google 系列
    'google/gemini-flash-1.5:free',
    'google/gemini-2.0-flash-exp:free',
    
    // Mistral 系列
    'mistralai/mistral-7b-instruct:free',
    'mistralai/mistral-nemo:free',
    
    // 其他廠商
    'microsoft/phi-3-mini-4k-instruct:free',
    'microsoft/phi-3-medium-4k-instruct:free',
    'huggingfaceh4/zephyr-7b-beta:free',
    'openchat/openchat-7b:free',
    'gryphe/mythomist-7b:free'
  ];

  const testPrompt = `分析 BTCUSDT：價格 $97000，+2.5%，RSI: 65，MACD: 150

JSON回應：{"trend": {"direction": "bullish", "confidence": 75}}`;

  const results = [];

  for (const model of models) {
    console.log(`\n📋 測試: ${model}`);
    console.log('─'.repeat(50));

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://nexustrade.com',
          'X-Title': 'NexusTrade Free Model Test'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: '你是專業分析師。直接返回JSON，不要額外文字。'
            },
            {
              role: 'user',
              content: testPrompt
            }
          ],
          max_tokens: 200,
          temperature: 0.1
        })
      });

      if (response.ok) {
        const result = await response.json();
        const message = result.choices[0].message;
        
        let score = 0;
        let jsonParsed = null;
        const notes = [];
        
        // 評分標準
        if (message.content && message.content.trim() !== '') {
          score += 30; // content 有內容
          notes.push('✅ Content 有內容');
          
          // 嘗試解析 JSON
          try {
            const jsonMatch = message.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              jsonParsed = JSON.parse(jsonMatch[0]);
              score += 40; // 可解析 JSON
              notes.push('✅ JSON 解析成功');
              
              // 檢查結構完整性
              if (jsonParsed.trend?.direction && jsonParsed.trend?.confidence) {
                score += 20; // 結構完整
                notes.push('✅ 結構完整');
                
                if (typeof jsonParsed.trend.confidence === 'number') {
                  score += 10; // 數據類型正確
                  notes.push('✅ 數據類型正確');
                }
              } else {
                notes.push('❌ 結構不完整');
              }
            } else {
              notes.push('❌ 未找到 JSON');
            }
          } catch (e) {
            notes.push('❌ JSON 解析失敗');
          }
        } else {
          notes.push('❌ Content 為空');
        }
        
        // 檢查是否有 reasoning (推理型模型扣分)
        if (message.reasoning) {
          score -= 20;
          notes.push('⚠️ 有 reasoning (推理型)');
        } else {
          score += 10;
          notes.push('✅ 非推理型');
        }
        
        results.push({
          model,
          score,
          tokens: result.usage?.total_tokens || 0,
          content: message.content || '',
          json: jsonParsed,
          notes
        });
        
        console.log(`評分: ${score}/100`);
        console.log(`Token: ${result.usage?.total_tokens || 0}`);
        console.log(`備註: ${notes.join(', ')}`);
        
        if (jsonParsed) {
          console.log(`結果: ${JSON.stringify(jsonParsed)}`);
        }
        
      } else {
        const status = response.status;
        console.log(`❌ 失敗: ${status}`);
        
        results.push({
          model,
          score: -1,
          error: status,
          notes: status === 404 ? ['模型不存在'] : status === 429 ? ['速率限制'] : ['其他錯誤']
        });
      }

    } catch (error) {
      console.log(`❌ 異常: ${error.message}`);
      results.push({
        model,
        score: -1,
        error: error.message,
        notes: ['請求異常']
      });
    }

    // 等待避免速率限制
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // 排序和總結
  console.log('\n🏆 測試結果排行榜');
  console.log('='.repeat(80));
  
  const validResults = results.filter(r => r.score >= 0);
  validResults.sort((a, b) => b.score - a.score);
  
  console.log('\n📊 TOP 5 推薦模型:');
  validResults.slice(0, 5).forEach((result, index) => {
    console.log(`${index + 1}. ${result.model}`);
    console.log(`   評分: ${result.score}/100`);
    console.log(`   Token: ${result.tokens}`);
    console.log(`   備註: ${result.notes.join(', ')}`);
    if (result.json) {
      console.log(`   JSON: ${JSON.stringify(result.json)}`);
    }
    console.log('');
  });
  
  console.log('\n❌ 失敗的模型:');
  const failedResults = results.filter(r => r.score < 0);
  failedResults.forEach(result => {
    console.log(`- ${result.model}: ${result.notes.join(', ')}`);
  });
  
  // 推薦配置
  if (validResults.length > 0) {
    console.log('\n🎯 推薦配置:');
    console.log(`主要模型: ${validResults[0].model} (評分: ${validResults[0].score})`);
    if (validResults[1]) {
      console.log(`備用模型: ${validResults[1].model} (評分: ${validResults[1].score})`);
    }
  }
}

// 執行測試
testAllFreeModels().then(() => {
  console.log('\n🏁 所有免費模型測試完成');
  process.exit(0);
}).catch(error => {
  console.error('💥 測試失敗:', error);
  process.exit(1);
});