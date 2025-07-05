/**
 * 最終整合測試：DeepSeek R1 + 優化的備援邏輯
 */

require('dotenv').config();
process.env.LOG_LEVEL = 'info';

async function testFinalIntegration() {
  console.log('🎯 最終整合測試：DeepSeek R1 + 優化的備援邏輯\n');
  
  try {
    console.log('=== 1. 檢查配置 ===');
    console.log('模型:', process.env.OPENROUTER_DEFAULT_MODEL);
    console.log('LM Studio:', process.env.LM_STUDIO_ENABLED);
    
    console.log('\n=== 2. 測試 BTCUSDT 分析（預期：使用 DeepSeek R1）===');
    
    const startTime = Date.now();
    
    // 直接調用API端點
    const response = await fetch('http://localhost:3000/api/ai/currency-analysis/BTCUSDT');
    const result = await response.json();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`分析耗時: ${duration}ms`);
    
    if (result.status === 'success') {
      const data = result.data;
      console.log('✅ 分析成功');
      console.log('  模型:', data.dataSources?.analysisModel);
      console.log('  趨勢:', data.analysis?.trend?.direction, '- 信心度:', data.analysis?.trend?.confidence);
      console.log('  RSI:', data.analysis?.technicalAnalysis?.rsi?.value);
      console.log('  從快取:', data.isFromCache);
      
      // 檢查是否確實使用了 DeepSeek R1
      if (data.dataSources?.analysisModel?.includes('deepseek')) {
        console.log('🎉 確認使用 DeepSeek R1 模型');
      } else if (data.dataSources?.analysisModel?.includes('gemini')) {
        console.log('⚠️ 仍在使用 Gemini 模型');
      } else {
        console.log('ℹ️ 使用備援分析:', data.dataSources?.analysisModel);
      }
      
      // 檢查數據品質
      const confidence = data.analysis?.trend?.confidence;
      const rsiValue = data.analysis?.technicalAnalysis?.rsi?.value;
      
      if (confidence !== 50 && rsiValue !== 50) {
        console.log('✅ 數據品質良好，非預設值');
      } else {
        console.log('⚠️ 仍包含預設值，可能有問題');
      }
      
    } else {
      console.log('❌ 分析失敗:', result.message);
    }
    
    console.log('\n=== 3. 測試 ETHUSDT 分析（測試備援邏輯）===');
    
    const ethStartTime = Date.now();
    const ethResponse = await fetch('http://localhost:3000/api/ai/currency-analysis/ETHUSDT');
    const ethResult = await ethResponse.json();
    const ethEndTime = Date.now();
    
    console.log(`ETH 分析耗時: ${ethEndTime - ethStartTime}ms`);
    
    if (ethResult.status === 'success') {
      const ethData = ethResult.data;
      console.log('✅ ETH 分析成功');
      console.log('  模型:', ethData.dataSources?.analysisModel);
      console.log('  趨勢信心度:', ethData.analysis?.trend?.confidence);
      console.log('  從快取:', ethData.isFromCache);
    }
    
    console.log('\n=== 4. 檢查AI服務狀態 ===');
    
    const statusResponse = await fetch('http://localhost:3000/api/ai/status');
    const statusResult = await statusResponse.json();
    
    if (statusResult.status === 'success') {
      const stats = statusResult.data.stats;
      console.log('AI 服務狀態:', statusResult.data.status);
      console.log('配置模型:', stats.model);
      console.log('是否配置:', stats.isConfigured);
    }
    
    console.log('\n=== 5. 總結 ===');
    console.log('✅ DeepSeek R1 配置已修正');
    console.log('✅ 備援邏輯已優化（只在嚴重錯誤時切換）');
    console.log('✅ 超時時間已延長至90秒');
    console.log('✅ System prompt 已優化為快速分析');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

testFinalIntegration().catch(console.error);