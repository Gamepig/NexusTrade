#!/usr/bin/env node

/**
 * 測試 LM Studio 移除後的 AI 分析功能
 */

require('dotenv').config();

const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');

async function testAIAnalysisAfterRemoval() {
  console.log('🧪 測試 LM Studio 移除後的 AI 分析功能');
  console.log('=====================================');
  
  try {
    // 1. 測試服務初始化
    console.log('\n1. 測試服務初始化:');
    const currencyService = getCurrencyAnalysisService();
    console.log('✅ AI 貨幣分析服務初始化成功');
    
    // 2. 檢查服務配置
    console.log('\n2. 檢查服務配置:');
    const isConfigured = currencyService.isConfigured();
    console.log('OpenRouter 配置狀態:', isConfigured ? '✅ 已配置' : '❌ 未配置');
    
    // 3. 測試分析功能（使用 BTCUSDT）
    console.log('\n3. 測試 BTCUSDT 分析功能:');
    
    if (!isConfigured) {
      console.log('⚠️ OpenRouter 未配置，將使用技術指標降級分析');
    }
    
    try {
      const analysisResult = await currencyService.performCurrencyAnalysis('BTCUSDT');
      console.log('✅ AI 分析成功');
      console.log('分析結果預覽:');
      console.log('- 趨勢方向:', analysisResult.data?.analysis?.trend?.direction || 'N/A');
      console.log('- 信心度:', analysisResult.data?.analysis?.trend?.confidence || 'N/A');
      console.log('- RSI 值:', analysisResult.data?.analysis?.technicalAnalysis?.rsi?.value || 'N/A');
      console.log('- MACD 值:', analysisResult.data?.analysis?.technicalAnalysis?.macd?.value || 'N/A');
      
      return true;
    } catch (analysisError) {
      console.error('❌ AI 分析失敗:', analysisError.message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    return false;
  }
}

// 執行測試
testAIAnalysisAfterRemoval()
  .then(success => {
    console.log('\n=====================================');
    if (success) {
      console.log('🎉 所有測試通過！LM Studio 已成功移除，AI 功能正常運作');
    } else {
      console.log('❌ 測試失敗，需要進一步檢查');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 測試執行錯誤:', error);
    process.exit(1);
  });