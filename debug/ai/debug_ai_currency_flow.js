#!/usr/bin/env node

/**
 * AI 貨幣分析流程診斷工具
 * 診斷為什麼 AI 分析仍在使用 technical-indicators 而非 AI 模型
 */

require('dotenv').config();

console.log('🔍 AI 貨幣分析流程診斷');
console.log('====================================');

async function diagnoseCurrencyAnalysisFlow() {
  try {
    // 1. 檢查環境變數配置
    console.log('\n1. 環境變數檢查:');
    console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? `已配置 (${process.env.OPENROUTER_API_KEY.length} 字符)` : '❌ 未配置');
    console.log('OPENROUTER_DEFAULT_MODEL:', process.env.OPENROUTER_DEFAULT_MODEL || '❌ 未配置');

    // 2. 測試 OpenRouter 連接
    console.log('\n2. OpenRouter API 測試:');
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_DEFAULT_MODEL,
          messages: [{ role: 'user', content: '測試連接' }],
          max_tokens: 10
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ OpenRouter API 連接成功');
        console.log('使用模型:', result.model || process.env.OPENROUTER_DEFAULT_MODEL);
      } else {
        const errorText = await response.text();
        console.log('❌ OpenRouter API 連接失敗:', response.status, response.statusText);
        console.log('錯誤詳情:', errorText.substring(0, 200));
      }
    } catch (error) {
      console.log('❌ OpenRouter API 測試異常:', error.message);
    }

    // 3. 測試 LM Studio 連接
    console.log('\n3. LM Studio 服務測試:');
    try {
      const response = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen2.5-14b-instruct-mlx',
          messages: [{ role: 'user', content: '測試連接' }],
          max_tokens: 10
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ LM Studio 服務連接成功');
        console.log('回應內容:', result.choices?.[0]?.message?.content?.substring(0, 50) || '無內容');
      } else {
        console.log('❌ LM Studio 服務連接失敗:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('❌ LM Studio 服務測試異常:', error.message);
    }

    // 4. 檢查 AI 分析服務實例
    console.log('\n4. AI 分析服務檢查:');
    try {
      const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service.js');
      const service = getCurrencyAnalysisService();
      
      console.log('服務已配置:', service.isConfigured());
      console.log('主要模型:', service.model);
      console.log('備用模型:', service.fallbackModel);
      console.log('模型備援鏈:', JSON.stringify(service.modelFallbackChain));
      
    } catch (error) {
      console.log('❌ AI 分析服務載入失敗:', error.message);
    }

    // 5. 檢查 MongoDB 快取
    console.log('\n5. MongoDB 快取檢查:');
    try {
      const mongoose = require('mongoose');
      await mongoose.connect(process.env.MONGODB_URI);
      
      const AIAnalysisResult = require('./src/models/AIAnalysisResult.js');
      const today = new Date().toISOString().split('T')[0];
      
      const todayAnalysis = await AIAnalysisResult.findOne({
        analysisType: 'single_currency',
        symbol: 'BTCUSDT',
        analysisDate: today
      });
      
      if (todayAnalysis) {
        console.log('✅ 找到今日 BTCUSDT 分析快取');
        console.log('分析模型:', todayAnalysis.dataSources?.analysisModel);
        console.log('分析時間:', todayAnalysis.createdAt);
        console.log('是否來自快取:', !await AIAnalysisResult.needsAnalysis('single_currency', 'BTCUSDT'));
      } else {
        console.log('❌ 未找到今日 BTCUSDT 分析快取');
        console.log('需要重新分析:', await AIAnalysisResult.needsAnalysis('single_currency', 'BTCUSDT'));
      }
      
      await mongoose.disconnect();
    } catch (error) {
      console.log('❌ MongoDB 檢查失敗:', error.message);
    }

    // 6. 測試完整分析流程
    console.log('\n6. 完整分析流程測試:');
    try {
      const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service.js');
      const service = getCurrencyAnalysisService();
      
      console.log('開始執行 BTCUSDT 分析...');
      const startTime = Date.now();
      
      const result = await service.performCurrencyAnalysis('BTCUSDT');
      
      const processingTime = Date.now() - startTime;
      console.log('✅ 分析完成！處理時間:', processingTime, 'ms');
      console.log('使用的分析模型:', result.dataSources?.analysisModel);
      console.log('分析信心度:', result.qualityMetrics?.confidence);
      console.log('數據完整性:', result.qualityMetrics?.dataCompleteness);
      
    } catch (error) {
      console.log('❌ 完整分析流程測試失敗:', error.message);
      console.log('錯誤詳情:', error.stack?.substring(0, 500));
    }

  } catch (error) {
    console.error('❌ 診斷過程發生錯誤:', error.message);
  }
}

// 執行診斷
diagnoseCurrencyAnalysisFlow().then(() => {
  console.log('\n🏁 診斷完成');
  process.exit(0);
}).catch(error => {
  console.error('💥 診斷失敗:', error);
  process.exit(1);
});