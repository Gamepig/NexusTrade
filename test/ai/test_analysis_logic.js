/**
 * 直接測試分析邏輯，不依賴MongoDB
 */

require('dotenv').config();
process.env.LOG_LEVEL = 'debug';

const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');

async function testAnalysisLogic() {
  console.log('🧪 直接測試分析邏輯...\n');
  
  try {
    const service = getCurrencyAnalysisService();
    const symbol = 'BTCUSDT';
    
    console.log('=== 1. 檢查OpenRouter配置和額度 ===');
    console.log('OpenRouter API Key:', process.env.OPENROUTER_API_KEY ? `${process.env.OPENROUTER_API_KEY.substring(0, 20)}...` : '未設置');
    console.log('OpenRouter Model:', process.env.OPENROUTER_DEFAULT_MODEL || service.model);
    
    // 直接測試OpenRouter API
    console.log('\n=== 2. 直接測試OpenRouter API額度 ===');
    try {
      const testResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://nexustrade.com',
          'X-Title': 'NexusTrade Test'
        },
        body: JSON.stringify({
          model: service.model,
          messages: [
            { role: 'user', content: '簡單測試：回應 "OK"' }
          ],
          max_tokens: 10,
          include_reasoning: true
        })
      });
      
      const headers = {
        'x-ratelimit-limit': testResponse.headers.get('x-ratelimit-limit'),
        'x-ratelimit-remaining': testResponse.headers.get('x-ratelimit-remaining'),
        'x-ratelimit-reset': testResponse.headers.get('x-ratelimit-reset')
      };
      
      console.log('OpenRouter API 測試結果:');
      console.log('  - 狀態碼:', testResponse.status);
      console.log('  - 限制信息:', headers);
      
      if (testResponse.ok) {
        const result = await testResponse.json();
        console.log('  - 回應正常，usage:', result.usage);
      } else {
        const errorText = await testResponse.text();
        console.log('  - 錯誤內容:', errorText);
      }
      
    } catch (apiError) {
      console.log('❌ OpenRouter API 測試失敗:', apiError.message);
    }
    
    console.log('\n=== 3. 收集市場數據 ===');
    const currencyData = await service.collectCurrencyData(symbol);
    
    console.log('3.1 數據收集成功:');
    console.log('  - 當前價格:', currencyData.currentPrice?.price);
    console.log('  - 24h變化:', currencyData.ticker24h?.priceChangePercent, '%');
    console.log('  - RSI計算值:', currencyData.technicalIndicators?.rsi?.value);
    console.log('  - MA7計算值:', currencyData.technicalIndicators?.movingAverages?.ma7);
    
    console.log('\n=== 4. 測試AI分析（不保存到數據庫）===');
    
    try {
      // 直接調用AI分析，不經過數據庫檢查
      const aiResult = await service.performAIAnalysis(symbol, currencyData);
      
      console.log('4.1 AI分析成功:');
      console.log('  - 提供者:', aiResult.provider);
      console.log('  - 模型:', aiResult.model);
      console.log('  - 趨勢方向:', aiResult.analysis?.trend?.direction);
      console.log('  - 趨勢信心度:', aiResult.analysis?.trend?.confidence);
      console.log('  - RSI信號:', aiResult.analysis?.technicalAnalysis?.rsi?.signal);
      console.log('  - Token使用:', aiResult.tokensUsed);
      
      // 檢查是否為真實數據
      const isRealData = (
        aiResult.analysis?.trend?.confidence !== 50 ||
        aiResult.analysis?.technicalAnalysis?.rsi?.value !== 50
      );
      
      if (isRealData) {
        console.log('✅ 分析結果包含真實計算數據');
      } else {
        console.log('⚠️ 分析結果可能為預設值');
      }
      
      console.log('\n4.2 完整分析結果:');
      console.log(JSON.stringify(aiResult.analysis, null, 2));
      
    } catch (aiError) {
      console.log('❌ AI分析失敗:', aiError.message);
      
      // 如果是OpenRouter失敗，檢查是否真的是429錯誤
      if (aiError.message.includes('429')) {
        console.log('⚠️ 確認是429錯誤，但您說配額應該足夠...');
        console.log('可能的原因:');
        console.log('  1. 免費模型的特殊限制');
        console.log('  2. 短時間內請求過於頻繁');
        console.log('  3. 特定模型的額度限制');
      } else if (aiError.message.includes('OpenRouter API')) {
        console.log('⚠️ OpenRouter API 其他錯誤，不是429');
      }
    }
    
    console.log('\n=== 5. 測試降級分析 ===');
    
    // 直接測試降級分析邏輯
    const fallbackResult = service.generateFallbackAnalysis(symbol, currencyData);
    
    console.log('5.1 降級分析結果:');
    console.log('  - 提供者:', fallbackResult.provider);
    console.log('  - 趨勢信心度:', fallbackResult.analysis?.trend?.confidence);
    console.log('  - RSI值:', fallbackResult.analysis?.technicalAnalysis?.rsi?.value);
    console.log('  - 使用真實RSI:', currencyData.technicalIndicators?.rsi?.value);
    
    // 檢查降級分析是否使用了真實數據
    const rsiFromIndicators = currencyData.technicalIndicators?.rsi?.value;
    const rsiFromFallback = fallbackResult.analysis?.technicalAnalysis?.rsi?.value;
    
    if (Math.abs(rsiFromIndicators - rsiFromFallback) < 0.1) {
      console.log('✅ 降級分析正確使用了真實RSI數據');
    } else {
      console.log('❌ 降級分析沒有使用真實RSI數據');
      console.log('  實際RSI:', rsiFromIndicators);
      console.log('  降級RSI:', rsiFromFallback);
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error('錯誤堆疊:', error.stack);
  }
}

testAnalysisLogic().catch(console.error);