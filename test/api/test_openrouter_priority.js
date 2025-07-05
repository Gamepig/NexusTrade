#!/usr/bin/env node

/**
 * 測試 OpenRouter 優先順序和模型切換功能
 */

require('dotenv').config();

async function testOpenRouterPriority() {
  try {
    console.log('🔍 測試 OpenRouter 優先順序和模型切換');
    console.log('================================================');

    // 1. 暫時停用 LM Studio 模擬 OpenRouter 優先
    console.log('\n1. 測試環境設定:');
    console.log('LM_STUDIO_ENABLED:', process.env.LM_STUDIO_ENABLED);
    console.log('OPENROUTER_DEFAULT_MODEL:', process.env.OPENROUTER_DEFAULT_MODEL);
    
    // 2. 載入並測試分析服務
    const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service.js');
    const service = getCurrencyAnalysisService();
    
    console.log('\n2. 服務配置檢查:');
    console.log('OpenRouter 已配置:', service.isConfigured());
    console.log('主要模型:', service.model);
    console.log('備用模型:', service.fallbackModel);
    console.log('模型備援鏈:', service.modelFallbackChain);

    // 3. 測試 OpenRouter 直接連接
    console.log('\n3. OpenRouter 直接測試:');
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_DEFAULT_MODEL,
          messages: [
            { role: 'system', content: '你是專業的加密貨幣分析師，請直接提供JSON格式回應。' },
            { role: 'user', content: '請分析BTCUSDT，只需簡短JSON: {"trend": {"direction": "bullish", "confidence": 75}}' }
          ],
          max_tokens: 100,
          temperature: 0.1
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ OpenRouter API 成功');
        console.log('使用模型:', result.model);
        console.log('回應長度:', result.choices[0].message.content.length);
        console.log('Token 使用:', result.usage?.total_tokens || '未知');
        
        // 檢查是否有 429 限制
        if (result.choices[0].message.content.includes('rate limit') || 
            result.choices[0].message.content.includes('limit exceeded')) {
          console.log('⚠️ 可能遇到速率限制');
        }
      } else {
        const errorText = await response.text();
        console.log('❌ OpenRouter API 失敗:', response.status);
        console.log('錯誤內容:', errorText.substring(0, 200));
        
        if (response.status === 429) {
          console.log('🚨 確認遇到 429 速率限制');
        }
      }
    } catch (error) {
      console.log('❌ OpenRouter 連接異常:', error.message);
    }

    // 4. 如果我們想強制使用 OpenRouter，暫時停用 LM Studio
    console.log('\n4. 測試強制使用 OpenRouter (暫時停用 LM Studio):');
    
    // 暫時修改環境變數
    const originalLMStudioEnabled = process.env.LM_STUDIO_ENABLED;
    process.env.LM_STUDIO_ENABLED = 'false';
    
    try {
      // 清除今日快取以強制重新分析
      const mongoose = require('mongoose');
      await mongoose.connect(process.env.MONGODB_URI);
      
      const AIAnalysisResult = require('./src/models/AIAnalysisResult.js');
      const today = new Date().toISOString().split('T')[0];
      
      await AIAnalysisResult.deleteMany({
        analysisType: 'single_currency',
        symbol: 'ETHUSDT',
        analysisDate: today
      });
      
      console.log('✅ 已清除 ETHUSDT 快取，強制重新分析');
      
      // 重新創建服務實例以載入新的環境變數
      const newService = new (require('./src/services/ai-currency-analysis.service.js').AICurrencyAnalysisService)();
      
      console.log('新服務 LM Studio 狀態:', process.env.LM_STUDIO_ENABLED);
      console.log('OpenRouter 配置狀態:', newService.isConfigured());
      
      // 執行分析測試
      const result = await newService.performCurrencyAnalysis('ETHUSDT');
      
      console.log('✅ 強制 OpenRouter 分析完成');
      console.log('使用的模型:', result.dataSources?.analysisModel);
      console.log('處理時間:', result.qualityMetrics?.processingTime, 'ms');
      console.log('分析信心度:', result.qualityMetrics?.confidence);
      
      await mongoose.disconnect();
      
    } catch (error) {
      console.log('❌ 強制 OpenRouter 測試失敗:', error.message);
    } finally {
      // 恢復原始環境變數
      process.env.LM_STUDIO_ENABLED = originalLMStudioEnabled;
    }

  } catch (error) {
    console.error('❌ 測試過程發生錯誤:', error.message);
  }
}

// 執行測試
testOpenRouterPriority().then(() => {
  console.log('\n🏁 OpenRouter 優先順序測試完成');
  process.exit(0);
}).catch(error => {
  console.error('💥 測試失敗:', error);
  process.exit(1);
});