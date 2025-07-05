/**
 * 測試最簡單的 JSON 提示詞
 */

require('dotenv').config();

async function testSimpleJsonPrompt() {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
  const model = 'deepseek/deepseek-r1-0528:free';
  
  const prompt = `根據以下數據回應一個JSON：

市場總交易量: 3,091,805,787 USDT
平均價格變化: -0.17%
上漲貨幣數: 4
下跌貨幣數: 6

請回應這個格式的JSON，不要包含任何其他文字：
{"trend": {"direction": "neutral", "confidence": 50, "summary": "市場微跌"}}`;

  try {
    console.log('🚀 測試簡單 JSON 提示詞...\n');
    
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
            content: 'Output only JSON. No reasoning. No text. Only JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API 錯誤: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const message = result.choices[0].message;
    const aiResponse = message.reasoning || message.content || '';
    
    console.log('=== AI 回應內容 ===');
    console.log('回應長度:', aiResponse.length);
    console.log('內容:');
    console.log('---');
    console.log(aiResponse);
    console.log('---');
    
    console.log('\n=== JSON 解析測試 ===');
    try {
      const parsed = JSON.parse(aiResponse);
      console.log('✅ JSON 解析成功');
      console.log('解析結果:', parsed);
    } catch (parseError) {
      console.log('❌ JSON 解析失敗:', parseError.message);
      
      // 嘗試提取 JSON 部分
      const jsonMatch = aiResponse.match(/\{[^{}]*\}/);
      if (jsonMatch) {
        console.log('找到 JSON 片段:', jsonMatch[0]);
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('✅ 片段解析成功:', parsed);
        } catch (err) {
          console.log('❌ 片段解析失敗:', err.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

testSimpleJsonPrompt().catch(console.error);