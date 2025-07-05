/**
 * 測試 DeepSeek R1 模型配置和穩定性
 */

require('dotenv').config();
process.env.LOG_LEVEL = 'debug';

const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');

async function testDeepSeekR1() {
  console.log('🤖 測試 DeepSeek R1 模型配置和穩定性...\n');
  
  try {
    const service = getCurrencyAnalysisService();
    
    console.log('=== 1. 檢查模型配置 ===');
    console.log('環境變數模型:', process.env.OPENROUTER_DEFAULT_MODEL);
    console.log('服務實例模型:', service.model);
    console.log('API 金鑰配置:', service.isConfigured());
    
    console.log('\n=== 2. 直接測試 DeepSeek R1 API ===');
    
    // 連續測試多次，檢查穩定性
    for (let i = 1; i <= 3; i++) {
      console.log(`\n第 ${i} 次測試:`);
      
      try {
        const testResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://nexustrade.com',
            'X-Title': 'NexusTrade DeepSeek Test'
          },
          body: JSON.stringify({
            model: 'deepseek/deepseek-r1-0528:free',
            messages: [
              {
                role: 'user',
                content: '請分析BTC：價格$105000，24h+2.5%，RSI:55。回應JSON格式：{"trend":"bullish","confidence":75,"summary":"簡述"}'
              }
            ],
            max_tokens: 800,
            temperature: 0.2,
            include_reasoning: true
          })
        });
        
        console.log(`  狀態碼: ${testResponse.status}`);
        
        const headers = {
          'x-ratelimit-limit': testResponse.headers.get('x-ratelimit-limit'),
          'x-ratelimit-remaining': testResponse.headers.get('x-ratelimit-remaining'),
          'x-ratelimit-reset': testResponse.headers.get('x-ratelimit-reset'),
          'retry-after': testResponse.headers.get('retry-after')
        };
        console.log('  限制資訊:', headers);
        
        if (testResponse.ok) {
          const result = await testResponse.json();
          console.log('  ✅ 成功');
          console.log('  Usage:', result.usage);
          console.log('  Model:', result.model);
          
          // 檢查回應格式
          const message = result.choices?.[0]?.message;
          if (message) {
            console.log('  Content 長度:', message.content?.length || 0);
            console.log('  Reasoning 長度:', message.reasoning?.length || 0);
            
            // 嘗試解析 JSON
            const content = message.content || message.reasoning || '';
            if (content.includes('{') && content.includes('trend')) {
              console.log('  ✅ 包含預期的 JSON 格式');
            } else {
              console.log('  ⚠️ 未包含預期的 JSON 格式');
              console.log('  實際內容:', content.substring(0, 200));
            }
          }
          
        } else {
          const errorText = await testResponse.text();
          console.log('  ❌ 失敗');
          console.log('  錯誤:', errorText);
          
          // 檢查是否為 429 錯誤
          if (testResponse.status === 429) {
            console.log('  ⚠️ 這是 429 錯誤，會導致切換到本地端');
            break; // 停止測試避免更多 429
          }
        }
        
        // 短暫延遲避免觸發限制
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`  ❌ 測試 ${i} 異常:`, error.message);
      }
    }
    
    console.log('\n=== 3. 測試完整分析流程 ===');
    
    // 收集數據
    const currencyData = await service.collectCurrencyData('BTCUSDT');
    console.log('數據收集完成，RSI:', currencyData.technicalIndicators?.rsi?.value);
    
    // 測試分析（可能會觸發切換邏輯）
    console.log('\n執行完整分析...');
    const analysisResult = await service.performAIAnalysis('BTCUSDT', currencyData);
    
    console.log('分析結果:');
    console.log('  提供者:', analysisResult.provider);
    console.log('  模型:', analysisResult.model);
    console.log('  趨勢信心度:', analysisResult.analysis?.trend?.confidence);
    
    if (analysisResult.provider === 'openrouter') {
      console.log('✅ OpenRouter 分析成功，無需切換');
    } else {
      console.log('⚠️ 切換到備援方案:', analysisResult.provider);
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

testDeepSeekR1().catch(console.error);