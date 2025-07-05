/**
 * 專門調試 AI 回應內容
 */

require('dotenv').config();

async function testOpenRouterDirectly() {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
  const model = 'deepseek/deepseek-r1-0528:free';
  
  const prompt = `
請根據以下市場數據，提供加密貨幣市場的大趨勢分析：

## 市場數據 (主要10個貨幣)
總交易量: 3,091,805,787 USDT
平均價格變化: -0.17%
上漲貨幣數: 4
下跌貨幣數: 6

主要貨幣表現:
BTCUSDT: $106,960 (-0.01%)
ETHUSDT: $2,450 (-1.43%)
BNBUSDT: $646 (+0.63%)

請提供以下格式的分析結果 (請用 JSON 格式回應)：

{
  "trend": {
    "direction": "neutral",
    "confidence": 50,
    "summary": "市場趨勢總結"
  },
  "technicalAnalysis": {
    "rsi": {
      "value": 50,
      "interpretation": "中性",
      "signal": "持有"
    },
    "macd": {
      "value": 0,
      "signal": "持有",
      "interpretation": "無明確訊號"
    },
    "movingAverage": {
      "ma20": 45000,
      "ma50": 43000,
      "position": "價格位於移動平均線上方",
      "signal": "看漲"
    },
    "bollingerBands": {
      "position": "中軌",
      "squeeze": false,
      "signal": "等待"
    },
    "volume": {
      "trend": "平穩",
      "interpretation": "成交量正常",
      "signal": "中性"
    }
  },
  "marketSentiment": {
    "score": 50,
    "label": "neutral",
    "factors": [],
    "summary": "市場情緒分析總結"
  },
  "timeframeAnalysis": {
    "daily": {
      "trend": "中性",
      "key_levels": [],
      "summary": "日線分析總結"
    },
    "weekly": {
      "trend": "中性",
      "key_levels": [],
      "summary": "週線分析總結"
    },
    "monthly": {
      "trend": "中性",
      "key_levels": [],
      "summary": "月線分析總結"
    }
  }
}

請確保回應是有效的 JSON 格式，數字範圍在合理區間內。
`;

  try {
    console.log('🚀 直接測試 OpenRouter API...\n');
    
    const response = await fetch(openRouterUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nexustrade.com',
        'X-Title': 'NexusTrade AI Analysis'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: '你是一位專業的加密貨幣市場分析師，專門提供準確的市場趨勢分析和技術指標解讀。請用繁體中文回答。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API 錯誤: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log('=== OpenRouter 原始回應 ===');
    console.log('狀態:', response.status);
    console.log('模型:', result.model);
    console.log('Token 使用:', result.usage);
    
    const message = result.choices[0].message;
    console.log('\n=== 訊息結構 ===');
    console.log('角色:', message.role);
    console.log('content 存在:', !!message.content);
    console.log('reasoning 存在:', !!message.reasoning);
    
    // DeepSeek R1 模型使用 reasoning 欄位儲存實際回應內容
    const aiResponse = message.reasoning || message.content || '';
    
    console.log('\n=== AI 實際回應內容 ===');
    console.log('回應長度:', aiResponse.length);
    console.log('前 1000 字符:');
    console.log('---');
    console.log(aiResponse.substring(0, 1000));
    console.log('---');
    
    if (aiResponse.length > 1000) {
      console.log('\n後 500 字符:');
      console.log('---');
      console.log(aiResponse.substring(aiResponse.length - 500));
      console.log('---');
    }
    
    console.log('\n=== JSON 提取測試 ===');
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.log('找到 JSON 匹配');
      console.log('JSON 長度:', jsonMatch[0].length);
      console.log('JSON 前 500 字符:');
      console.log('---');
      console.log(jsonMatch[0].substring(0, 500));
      console.log('---');
      
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('\n✅ JSON 解析成功');
        console.log('解析結果結構:');
        console.log('- trend:', !!parsed.trend);
        console.log('- technicalAnalysis:', !!parsed.technicalAnalysis);
        console.log('- marketSentiment:', !!parsed.marketSentiment);
        console.log('- timeframeAnalysis:', !!parsed.timeframeAnalysis);
      } catch (parseError) {
        console.log('\n❌ JSON 解析失敗:', parseError.message);
        console.log('錯誤位置:', parseError.message.match(/position (\d+)/)?.[1] || '未知');
      }
    } else {
      console.log('❌ 未找到 JSON 格式內容');
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

testOpenRouterDirectly().catch(console.error);