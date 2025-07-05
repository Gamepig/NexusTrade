/**
 * 直接測試 AI 回應，跳過我們的解析邏輯
 */

require('dotenv').config();

async function testDirectAIResponse() {
  console.log('🔍 直接測試 AI 回應\n');
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.log('❌ 缺少 OPENROUTER_API_KEY');
    return;
  }
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'NexusTrade',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen-2.5-72b-instruct:free',
        messages: [
          {
            role: 'system',
            content: '你是加密貨幣分析專家。請只回應 JSON 格式，不要其他文字。'
          },
          {
            role: 'user',
            content: `分析 ETHUSDT 加密貨幣，當前價格 $2407.59，24h變化 -1.23%

技術指標：
RSI: 50.04
MACD: 11.40
MA7: 2373.62
Williams %R: -35.48

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
        temperature: 0.3,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      console.log('❌ API 請求失敗:', response.status, response.statusText);
      return;
    }
    
    const result = await response.json();
    
    if (result.choices && result.choices[0] && result.choices[0].message) {
      const aiResponse = result.choices[0].message.content;
      
      console.log('=== 1. 原始 AI 回應 ===');
      console.log('回應長度:', aiResponse.length);
      console.log('回應類型:', typeof aiResponse);
      console.log('是否以 { 開始:', aiResponse.trim().startsWith('{'));
      console.log('是否以 } 結束:', aiResponse.trim().endsWith('}'));
      console.log('\n完整回應:');
      console.log(aiResponse);
      
      console.log('\n=== 2. 測試直接解析 ===');
      try {
        const parsed = JSON.parse(aiResponse);
        console.log('✅ 直接解析成功');
        console.log('結構鍵值:', Object.keys(parsed));
        
        if (parsed.technicalAnalysis?.williamsR) {
          console.log('\nWilliams %R:', parsed.technicalAnalysis.williamsR);
        }
        
        if (parsed.marketSentiment) {
          console.log('\n市場情緒:', {
            score: parsed.marketSentiment.score,
            label: parsed.marketSentiment.label,
            summary: parsed.marketSentiment.summary?.substring(0, 50) + '...'
          });
        }
        
      } catch (error) {
        console.log('❌ 直接解析失敗:', error.message);
        console.log('錯誤位置:', error.message.match(/position (\d+)/)?.[1]);
        
        const errorPos = parseInt(error.message.match(/position (\d+)/)?.[1] || '0');
        console.log('\n問題位置前後內容:');
        console.log('"' + aiResponse.substring(Math.max(0, errorPos - 30), errorPos + 30) + '"');
        
        console.log('\n=== 3. 測試清理策略 ===');
        const cleaned = aiResponse
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字符
          .replace(/,(\s*[}\]])/g, '$1') // 移除尾隨逗號
          .trim();
        
        console.log('清理後長度:', cleaned.length);
        try {
          const cleanedParsed = JSON.parse(cleaned);
          console.log('✅ 清理後解析成功');
          console.log('清理後結構鍵值:', Object.keys(cleanedParsed));
        } catch (cleanError) {
          console.log('❌ 清理後仍然失敗:', cleanError.message);
          
          // 檢查問題字符
          const chars = aiResponse.split('');
          const problematicChars = [];
          chars.forEach((char, index) => {
            const code = char.charCodeAt(0);
            if (code < 32 || code > 126) {
              problematicChars.push({ char, code, index });
            }
          });
          
          if (problematicChars.length > 0) {
            console.log('\n發現問題字符:', problematicChars.slice(0, 10));
          } else {
            console.log('\n未發現控制字符，可能是 JSON 結構問題');
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

testDirectAIResponse().catch(console.error);