#!/usr/bin/env node

/**
 * 測試修復後的 AI 貨幣分析系統
 * 使用新的頂級免費模型
 */

require('dotenv').config();

async function testFixedSystem() {
  console.log('🔍 測試修復後的 AI 貨幣分析系統');
  console.log('====================================');

  try {
    // 0. 初始化資料庫連接 (關鍵：MongoDB 在 Docker 容器中運行)
    console.log('\n0. 初始化資料庫連接:');
    const { connectDB } = require('./src/config/database');
    try {
      await connectDB();
      console.log('✅ MongoDB 連接成功 (Docker 容器)');
    } catch (dbError) {
      console.log('⚠️ MongoDB 連接失敗:', dbError.message);
      console.log('注意：MongoDB 需要在 Docker 容器中運行');
    }
    
    // 1. 檢查環境配置
    console.log('\n1. 環境配置檢查:');
    console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? `✅ 已配置 (${process.env.OPENROUTER_API_KEY.length} 字符)` : '❌ 未配置');
    console.log('OPENROUTER_DEFAULT_MODEL:', process.env.OPENROUTER_DEFAULT_MODEL || '❌ 未配置');
    console.log('OPENROUTER_FALLBACK_MODEL:', process.env.OPENROUTER_FALLBACK_MODEL || '❌ 未配置');

    // 2. 載入分析服務
    console.log('\n2. 載入 AI 分析服務:');
    const { AICurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service.js');
    const service = new AICurrencyAnalysisService();
    
    console.log('服務已配置:', service.isConfigured());
    console.log('主要模型:', service.model);
    console.log('備用模型:', service.fallbackModel);
    console.log('模型備援鏈:', service.modelFallbackChain);

    // 3. 直接測試 OpenRouter API
    console.log('\n3. 直接測試主要模型:');
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://nexustrade.com',
          'X-Title': 'NexusTrade System Test'
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_DEFAULT_MODEL,
          messages: [
            {
              role: 'system',
              content: '你是專業的加密貨幣技術分析師。請根據提供的技術指標數據進行分析，直接輸出 JSON 格式的分析結果。'
            },
            {
              role: 'user',
              content: `分析 BTCUSDT 加密貨幣，當前價格 $97500，24h變化 +1.8%

技術指標：
RSI: 63.5
MACD: 125.3  
MA7: 96800
Williams %R: -28.4

請提供JSON格式分析：
{
  "trend": {"direction": "bullish/bearish/neutral", "confidence": 75, "summary": "趨勢總結"},
  "technicalAnalysis": {
    "rsi": {"signal": "買入/賣出/持有", "interpretation": "RSI分析"},
    "macd": {"signal": "買入/賣出/持有", "interpretation": "MACD分析"},
    "movingAverage": {"signal": "看漲/看跌/持有", "interpretation": "均線分析"},
    "bollingerBands": {"signal": "買入/賣出/等待突破", "interpretation": "布林帶分析"},
    "volume": {"signal": "觀望/積極/謹慎", "interpretation": "成交量分析"},
    "williamsR": {"signal": "買入/賣出/持有", "interpretation": "威廉指標分析"}
  },
  "marketSentiment": {"score": 65, "label": "neutral", "summary": "情緒評估"}
}

只回應JSON：`
            }
          ],
          max_tokens: 1500,
          temperature: 0.1
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 主要模型 API 測試成功');
        console.log('模型:', result.model);
        console.log('Token 使用:', result.usage);
        
        const message = result.choices[0].message;
        console.log('Content 長度:', message.content?.length || 0);
        console.log('有 reasoning:', !!message.reasoning);
        
        if (message.content) {
          console.log('\n📄 回應內容預覽:');
          console.log(message.content.substring(0, 300) + (message.content.length > 300 ? '...' : ''));
          
          // JSON 解析測試
          try {
            const jsonMatch = message.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              console.log('\n✅ JSON 解析成功');
              console.log('結構檢查:', {
                trend: !!parsed.trend,
                technicalAnalysis: !!parsed.technicalAnalysis,
                marketSentiment: !!parsed.marketSentiment
              });
            } else {
              console.log('❌ 未找到 JSON 結構');
            }
          } catch (e) {
            console.log('❌ JSON 解析失敗:', e.message);
          }
        }
        
      } else {
        console.log('❌ 主要模型 API 測試失敗:', response.status, await response.text());
      }
    } catch (error) {
      console.log('❌ 主要模型測試異常:', error.message);
    }

    // 4. 測試完整的貨幣分析流程
    console.log('\n4. 完整貨幣分析流程測試:');
    try {
      console.log('開始執行 BTCUSDT 完整分析...');
      const startTime = Date.now();
      
      const result = await service.performCurrencyAnalysis('BTCUSDT');
      
      const processingTime = Date.now() - startTime;
      console.log('✅ 完整分析成功！');
      console.log('處理時間:', processingTime, 'ms');
      console.log('使用的分析模型:', result.dataSources?.analysisModel);
      console.log('分析信心度:', result.qualityMetrics?.confidence);
      console.log('數據完整性:', result.qualityMetrics?.dataCompleteness);
      
      // 檢查分析結果結構
      console.log('\n📊 分析結果結構檢查:');
      console.log('- 趨勢方向:', result.analysis?.trend?.direction);
      console.log('- 趨勢信心度:', result.analysis?.trend?.confidence);
      console.log('- 技術分析指標數量:', Object.keys(result.analysis?.technicalAnalysis || {}).length);
      console.log('- 市場情緒評分:', result.analysis?.marketSentiment?.score);
      
    } catch (error) {
      console.log('❌ 完整分析流程失敗:', error.message);
      console.log('錯誤堆疊:', error.stack?.substring(0, 500));
    }

  } catch (error) {
    console.error('❌ 測試過程發生錯誤:', error.message);
  }
}

// 執行測試
testFixedSystem().then(() => {
  console.log('\n🏁 修復後系統測試完成');
  process.exit(0);
}).catch(error => {
  console.error('💥 測試失敗:', error);
  process.exit(1);
});