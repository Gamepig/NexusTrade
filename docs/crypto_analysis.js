const CoinGecko = require('coingecko-api');
const CoinGeckoClient = new CoinGecko();
const { Configuration, OpenAIApi } = require("openai");

// 配置 OpenRouter
const configuration = new Configuration({
  apiKey: "your_openrouter_api_key", // 請替換為您的 OpenRouter API 金鑰
  basePath: "https://openrouter.ai/api/v1"
});
const openai = new OpenAIApi(configuration);

// 獲取虛擬貨幣數據
async function getCryptoData() {
  try {
    const data = await CoinGeckoClient.coins.fetchMarketChart('bitcoin', { days: '30' });
    return data.data;
  } catch (error) {
    console.error("獲取數據失敗:", error);
    throw error;
  }
}

// 使用 AI 分析數據
async function analyzeData(data) {
  const prompt = `以下是比特幣過去 30 天的每日價格數據：${JSON.stringify(data.prices)}。請進行技術分析，告訴我當前趨勢以及任何潛在的買賣信號。`;
  
  try {
    const completion = await openai.createCompletion({
      model: "text-davinci-003", // 可根據需要選擇其他模型
      prompt: prompt,
      max_tokens: 1000,
    });
    console.log("AI 分析結果:", completion.data.choices[0].text);
  } catch (error) {
    console.error("AI 分析失敗:", error);
    throw error;
  }
}

// 運行程式
getCryptoData()
  .then(data => analyzeData(data))
  .catch(error => console.error("程式執行失敗:", error));