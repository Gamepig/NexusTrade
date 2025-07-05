/**
 * AI 分析數據除錯腳本
 * 用於檢查輸入給 AI 的原始數據和 AI 回傳的原始數據
 */

// 確保載入 .env 檔案
require('dotenv').config();

// 設定 debug 日誌級別以顯示詳細信息
process.env.LOG_LEVEL = 'debug';

const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');
const { getBinanceService } = require('./src/services/binance.service');

async function debugAIAnalysisData() {
  console.log('🔍 開始 AI 分析數據除錯...\n');
  
  try {
    const service = getCurrencyAnalysisService();
    const symbol = 'BTCUSDT';
    
    console.log('=== 1. 檢查服務配置 ===');
    console.log('OpenRouter 配置:', service.isConfigured());
    console.log('LM Studio 啟用:', process.env.LM_STUDIO_ENABLED);
    console.log('主要模型:', service.model);
    console.log('備用模型:', service.fallbackModel);
    console.log('模型備援鏈:', service.modelFallbackChain);
    console.log('API 金鑰長度:', process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.length : 'Not set');
    console.log('');
    
    console.log('=== 2. 收集原始市場數據 ===');
    const currencyData = await service.collectCurrencyData(symbol);
    
    console.log('2.1 當前價格數據:');
    console.log(JSON.stringify(currencyData.currentPrice, null, 2));
    console.log('');
    
    console.log('2.2 24小時數據:');
    console.log(JSON.stringify(currencyData.ticker24h, null, 2));
    console.log('');
    
    console.log('2.3 K線數據樣本 (最近3天):');
    if (currencyData.weeklyKlines && currencyData.weeklyKlines.length > 0) {
      console.log(`K線數據總數: ${currencyData.weeklyKlines.length}`);
      currencyData.weeklyKlines.slice(-3).forEach((kline, index) => {
        console.log(`第${index + 1}天:`, {
          close: parseFloat(kline.close),
          high: parseFloat(kline.high),
          low: parseFloat(kline.low),
          volume: parseFloat(kline.volume)
        });
      });
    } else {
      console.log('⚠️ 無K線數據');
    }
    console.log('');
    
    console.log('2.4 計算的技術指標:');
    console.log(JSON.stringify(currencyData.technicalIndicators, null, 2));
    console.log('');
    
    console.log('=== 3. 檢查數據中的潛在問題 ===');
    
    // 檢查是否有 undefined 或 NaN 值
    function checkForBadValues(obj, path = '') {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (value === undefined) {
          console.log(`❌ 發現 undefined: ${currentPath}`);
        } else if (value === null) {
          console.log(`⚠️ 發現 null: ${currentPath}`);
        } else if (typeof value === 'number' && isNaN(value)) {
          console.log(`❌ 發現 NaN: ${currentPath}`);
        } else if (typeof value === 'object' && value !== null) {
          checkForBadValues(value, currentPath);
        }
      }
    }
    
    checkForBadValues(currencyData.technicalIndicators, 'technicalIndicators');
    console.log('');
    
    console.log('=== 4. 建立 AI 分析提示詞 ===');
    const prompt = service.buildAnalysisPrompt(symbol, currencyData);
    console.log('提示詞長度:', prompt.length);
    console.log('提示詞前500字符:');
    console.log(prompt.substring(0, 500));
    console.log('...');
    console.log('提示詞最後200字符:');
    console.log(prompt.substring(prompt.length - 200));
    console.log('');
    
    console.log('=== 5. 測試 OpenRouter 直接 API 調用 ===');
    try {
      console.log('5.1 測試 include_reasoning 參數...');
      const testResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://nexustrade.com',
          'X-Title': 'NexusTrade Test'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:free',
          messages: [
            {
              role: 'user',
              content: '請分析 BTC 價格：當前$98500，24h變化-2.5%。請以JSON格式回應：{"trend":"bullish/bearish/neutral","confidence":75,"summary":"簡短分析"}'
            }
          ],
          max_tokens: 1000,
          temperature: 0.1
        })
      });
      
      if (testResponse.ok) {
        const testResult = await testResponse.json();
        console.log('✅ OpenRouter Gemini 直接測試成功');
        console.log('回應結構:', {
          hasChoices: !!testResult.choices,
          model: testResult.model,
          messageKeys: testResult.choices?.[0]?.message ? Object.keys(testResult.choices[0].message) : [],
          usage: testResult.usage
        });
        
        if (testResult.choices?.[0]?.message) {
          const msg = testResult.choices[0].message;
          console.log('Content 長度:', msg.content?.length || 0);
          console.log('Content 前200字符:', msg.content?.substring(0, 200) || '無內容');
          if (msg.reasoning) {
            console.log('Reasoning 長度:', msg.reasoning.length);
          }
        }
      } else {
        console.log('❌ OpenRouter 直接測試失敗:', testResponse.status, testResponse.statusText);
        const errorText = await testResponse.text();
        console.log('錯誤內容:', errorText);
      }
      
    } catch (directTestError) {
      console.log('❌ OpenRouter 直接測試異常:', directTestError.message);
    }
    
    console.log('');
    console.log('=== 6. 嘗試完整 AI 分析 ===');
    try {
      const aiResult = await service.performAIAnalysis(symbol, currencyData);
      
      console.log('6.1 AI 分析成功結果:');
      console.log('提供者:', aiResult.provider);
      console.log('模型:', aiResult.model);
      console.log('成功:', aiResult.success);
      console.log('');
      
      console.log('6.2 分析結果結構:');
      console.log('分析結果鍵:', Object.keys(aiResult.analysis || {}));
      
      if (aiResult.analysis) {
        console.log('趨勢:', aiResult.analysis.trend);
        console.log('技術分析鍵:', Object.keys(aiResult.analysis.technicalAnalysis || {}));
        console.log('市場情緒:', aiResult.analysis.marketSentiment);
      }
      console.log('');
      
      if (aiResult.tokensUsed) {
        console.log('Token 使用量:', aiResult.tokensUsed);
      }
      
    } catch (aiError) {
      console.log('❌ AI 分析失敗:', aiError.message);
      console.log('錯誤堆疊:', aiError.stack);
    }
    
  } catch (error) {
    console.error('❌ 除錯過程發生錯誤:', error.message);
    console.error('錯誤堆疊:', error.stack);
  }
}

// 執行除錯
debugAIAnalysisData().catch(console.error);