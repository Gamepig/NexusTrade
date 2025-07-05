/**
 * 測試 4000 tokens 是否足夠完成 DeepSeek R1 回應
 */

require('dotenv').config();

async function test4000Tokens() {
  console.log('🧪 測試 4000 tokens 限制下的 DeepSeek R1 回應...\n');
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nexustrade.com',
        'X-Title': 'NexusTrade 4000 Token Test'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-0528:free',
        messages: [
          {
            role: 'system',
            content: '你是一位專業的加密貨幣技術分析師。請根據提供的技術指標數據進行快速分析，直接輸出 JSON 格式的分析結果。請保持簡潔，不要過度推理，直接給出結論。使用繁體中文填寫分析內容。'
          },
          {
            role: 'user',
            content: `請根據以下 BTCUSDT 的技術數據，提供專業的日線分析：

## 基本資訊
交易對: BTCUSDT
當前價格: $105500
24小時變化: 2.5%

## 技術指標
RSI: 53.5 (中性)
移動平均線 MA7: $103850
價格位置: 價格位於移動平均線上方

請提供 JSON 格式的分析結果：

{
  "trend": {
    "direction": "bullish",
    "confidence": 75,
    "summary": "基於技術指標，價格趨勢看漲"
  },
  "technicalAnalysis": {
    "rsi": {"value": 53.5, "signal": "持有", "interpretation": "中性"},
    "macd": {"value": 0.5, "signal": "持有", "interpretation": "MACD指標中性"},
    "movingAverage": {"signal": "看漲", "interpretation": "價格位於移動平均線上方"},
    "bollingerBands": {"signal": "等待突破", "interpretation": "中軌附近"},
    "volume": {"signal": "中性", "interpretation": "成交量正常"}
  },
  "marketSentiment": {
    "score": 65,
    "label": "neutral", 
    "summary": "市場情緒中性"
  }
}

請根據實際數據調整並只回應JSON：`
          }
        ],
        max_tokens: 4000,
        temperature: 0.2,
        include_reasoning: true
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      
      console.log('=== API 回應分析 ===');
      console.log('Model:', result.model);
      console.log('Usage:', JSON.stringify(result.usage, null, 2));
      console.log('Finish Reason:', result.finish_reason);
      
      const message = result.choices?.[0]?.message;
      if (message) {
        console.log('\n=== Content 和 Reasoning 長度 ===');
        console.log('Content 長度:', message.content?.length || 0);
        console.log('Reasoning 長度:', message.reasoning?.length || 0);
        
        console.log('\n=== Content 完整內容 ===');
        if (message.content) {
          console.log(message.content);
          
          // 檢查是否為完整的JSON
          if (message.content.trim().endsWith('}')) {
            console.log('✅ Content 看起來是完整的JSON');
            
            try {
              const parsed = JSON.parse(message.content);
              console.log('✅ JSON 解析成功');
              console.log('趨勢信心度:', parsed.trend?.confidence);
              console.log('RSI值:', parsed.technicalAnalysis?.rsi?.value);
              
              // 檢查是否有真實值
              if (parsed.trend?.confidence !== 50 || parsed.technicalAnalysis?.rsi?.value !== 50) {
                console.log('🎉 包含真實分析值，非預設值！');
              }
              
            } catch (parseError) {
              console.log('❌ JSON 解析失敗:', parseError.message);
            }
            
          } else {
            console.log('⚠️ Content 可能被截斷（不以}結尾）');
          }
        } else {
          console.log('❌ Content 為空');
        }
        
        // 檢查 finish_reason
        if (result.finish_reason === 'length') {
          console.log('⚠️ 回應因達到 token 限制而被截斷');
          console.log('建議：進一步增加 max_tokens 或簡化提示詞');
        } else if (result.finish_reason === 'stop') {
          console.log('✅ 回應正常完成');
        }
      }
      
    } else {
      console.log('❌ API 請求失敗:', response.status, await response.text());
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

test4000Tokens().catch(console.error);