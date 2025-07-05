/**
 * 專門調試 DeepSeek R1 的回應格式
 */

require('dotenv').config();

async function debugDeepSeekResponse() {
  console.log('🔍 調試 DeepSeek R1 回應格式...\n');
  
  try {
    console.log('=== 測試 DeepSeek R1 原始回應 ===');
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nexustrade.com',
        'X-Title': 'NexusTrade Debug'
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
24小時成交量: 21,500

## 技術指標
RSI: 53.5 (中性)
移動平均線 MA7: $103850
價格位置: 價格位於移動平均線上方

請提供 JSON 格式的分析結果，必須包含以下結構：

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

請根據上述數據填寫實際分析結果，只回應 JSON，不要其他內容：`
          }
        ],
        max_tokens: 2000,
        temperature: 0.2,
        include_reasoning: true
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      
      console.log('=== 完整 API 回應結構 ===');
      console.log('Model:', result.model);
      console.log('Usage:', JSON.stringify(result.usage, null, 2));
      console.log('Choices 數量:', result.choices?.length);
      
      if (result.choices?.[0]?.message) {
        const message = result.choices[0].message;
        
        console.log('\n=== Message 結構分析 ===');
        console.log('Message keys:', Object.keys(message));
        console.log('Role:', message.role);
        console.log('Content 長度:', message.content?.length || 0);
        console.log('Reasoning 長度:', message.reasoning?.length || 0);
        
        console.log('\n=== Content 內容 ===');
        if (message.content) {
          console.log('Content 前500字符:');
          console.log(message.content.substring(0, 500));
          console.log('\nContent 最後200字符:');
          console.log(message.content.substring(Math.max(0, message.content.length - 200)));
        } else {
          console.log('❌ Content 為空');
        }
        
        console.log('\n=== Reasoning 內容 ===');
        if (message.reasoning) {
          console.log('Reasoning 前500字符:');
          console.log(message.reasoning.substring(0, 500));
          console.log('\nReasoning 最後500字符:');
          console.log(message.reasoning.substring(Math.max(0, message.reasoning.length - 500)));
        } else {
          console.log('❌ Reasoning 為空');
        }
        
        console.log('\n=== JSON 提取測試 ===');
        
        // 測試我們的 JSON 提取邏輯
        const aiResponse = message.content || message.reasoning || '';
        
        console.log('總回應長度:', aiResponse.length);
        
        // 策略1: 尋找 ```json 代碼塊格式
        const codeBlockMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          console.log('✅ 策略1成功：找到代碼塊格式');
          console.log('提取的JSON:', codeBlockMatch[1].substring(0, 200) + '...');
        } else {
          console.log('❌ 策略1失敗：未找到代碼塊格式');
        }
        
        // 策略2: 尋找包含特定欄位的完整JSON
        const complexJsonMatch = aiResponse.match(/\{[\s\S]*?"trend"[\s\S]*?"technicalAnalysis"[\s\S]*?"marketSentiment"[\s\S]*?\}/);
        if (complexJsonMatch) {
          console.log('✅ 策略2成功：找到完整JSON結構');
          console.log('提取的JSON:', complexJsonMatch[0].substring(0, 200) + '...');
          
          // 嘗試解析
          try {
            const parsed = JSON.parse(complexJsonMatch[0]);
            console.log('✅ JSON 解析成功');
            console.log('趨勢:', parsed.trend);
            console.log('RSI值:', parsed.technicalAnalysis?.rsi?.value);
          } catch (parseError) {
            console.log('❌ JSON 解析失敗:', parseError.message);
          }
          
        } else {
          console.log('❌ 策略2失敗：未找到完整JSON結構');
        }
        
        // 檢查是否包含推理標籤
        if (aiResponse.includes('<think>')) {
          console.log('✅ 檢測到推理標籤 <think>');
          const afterThinkMatch = aiResponse.match(/<\/think>\s*([\s\S]*)/);
          if (afterThinkMatch) {
            console.log('推理後內容長度:', afterThinkMatch[1].length);
            console.log('推理後內容前200字符:', afterThinkMatch[1].substring(0, 200));
          }
        } else {
          console.log('❌ 未檢測到推理標籤');
        }
      }
      
    } else {
      console.log('❌ API 請求失敗:', response.status, await response.text());
    }
    
  } catch (error) {
    console.error('❌ 調試失敗:', error.message);
  }
}

debugDeepSeekResponse().catch(console.error);