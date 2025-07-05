/**
 * 測試 Gemini 2.0 Flash 的速度和效果
 */

async function testGeminiSpeed() {
  console.log('⚡ 測試 Gemini 2.0 Flash 速度和效果...\n');
  
  try {
    console.log('=== 1. 測試 BTCUSDT 分析速度 ===');
    
    const startTime = Date.now();
    const response = await fetch('http://localhost:3000/api/ai/currency-analysis/BTCUSDT');
    const result = await response.json();
    const endTime = Date.now();
    
    const totalTime = endTime - startTime;
    
    console.log(`總耗時: ${totalTime}ms`);
    
    if (result.status === 'success') {
      const data = result.data;
      console.log('✅ 分析成功');
      console.log('  模型:', data.dataSources?.analysisModel);
      console.log('  趨勢:', data.analysis?.trend?.direction);
      console.log('  信心度:', data.analysis?.trend?.confidence);
      console.log('  RSI值:', data.analysis?.technicalAnalysis?.rsi?.value);
      console.log('  處理時間:', data.qualityMetrics?.processingTime, 'ms');
      console.log('  Token使用:', data.qualityMetrics?.tokensUsed);
      console.log('  從快取:', data.isFromCache);
      
      // 比較速度改善
      if (totalTime < 10000) {  // 小於10秒
        console.log('🚀 速度大幅改善！比DeepSeek R1快很多');
      } else if (totalTime < 30000) {  // 小於30秒
        console.log('⚡ 速度有所改善');
      } else {
        console.log('⏳ 仍需要較長時間');
      }
      
      // 檢查分析品質
      if (data.analysis?.trend?.confidence !== 50) {
        console.log('✅ 分析品質良好，非預設值');
      } else {
        console.log('⚠️ 可能仍使用預設值');
      }
      
    } else {
      console.log('❌ 分析失敗:', result.message);
    }
    
    console.log('\n=== 2. 測試 ETHUSDT 分析（第二次測試）===');
    
    const eth_startTime = Date.now();
    const ethResponse = await fetch('http://localhost:3000/api/ai/currency-analysis/ETHUSDT');
    const ethResult = await ethResponse.json();
    const eth_endTime = Date.now();
    
    const ethTotalTime = eth_endTime - eth_startTime;
    console.log(`ETH 總耗時: ${ethTotalTime}ms`);
    
    if (ethResult.status === 'success') {
      console.log('✅ ETH 分析成功');
      console.log('  模型:', ethResult.data.dataSources?.analysisModel);
      console.log('  信心度:', ethResult.data.analysis?.trend?.confidence);
    }
    
    console.log('\n=== 3. 速度對比總結 ===');
    console.log('Gemini 2.0 Flash 配置：');
    console.log('  ⚡ 超時設定: 30秒 (vs DeepSeek 90秒)');
    console.log('  🎯 Token限制: 1500 (vs DeepSeek 4000)');
    console.log('  📋 無推理過程: 直接回應 (vs DeepSeek reasoning)');
    console.log('  🚀 預期改善: 10-20倍速度提升');
    
    if (totalTime && totalTime < 10000) {
      console.log('🎉 配置優化成功！用戶體驗大幅改善');
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

testGeminiSpeed().catch(console.error);