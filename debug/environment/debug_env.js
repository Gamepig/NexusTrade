/**
 * 環境變數除錯腳本
 */

// 確保載入 .env 檔案
require('dotenv').config();

console.log('🔍 檢查環境變數設定...\n');

const envVars = {
  'OPENROUTER_API_KEY': process.env.OPENROUTER_API_KEY,
  'OPENROUTER_DEFAULT_MODEL': process.env.OPENROUTER_DEFAULT_MODEL,
  'LM_STUDIO_ENABLED': process.env.LM_STUDIO_ENABLED,
  'LM_STUDIO_BASE_URL': process.env.LM_STUDIO_BASE_URL,
  'NODE_ENV': process.env.NODE_ENV
};

console.log('=== 環境變數狀態 ===');
for (const [key, value] of Object.entries(envVars)) {
  if (key === 'OPENROUTER_API_KEY') {
    // 隱藏 API 金鑰內容，只顯示前後幾個字符
    const masked = value ? `${value.substring(0, 8)}...${value.substring(value.length - 8)}` : 'undefined';
    console.log(`${key}: ${masked} (長度: ${value ? value.length : 0})`);
  } else {
    console.log(`${key}: ${value || 'undefined'}`);
  }
}

console.log('\n=== 服務檢查 ===');

// 測試 OpenRouter 配置
const openRouterConfigured = !!process.env.OPENROUTER_API_KEY;
console.log('OpenRouter 配置狀態:', openRouterConfigured);

// 測試 LM Studio 配置  
const lmStudioEnabled = process.env.LM_STUDIO_ENABLED === 'true';
console.log('LM Studio 啟用狀態:', lmStudioEnabled);

// 測試服務實例
console.log('\n=== 服務實例測試 ===');

try {
  const { getCurrencyAnalysisService } = require('./src/services/ai-currency-analysis.service');
  const service = getCurrencyAnalysisService();
  
  console.log('服務實例創建: ✅');
  console.log('服務配置檢查:', service.isConfigured());
  console.log('服務使用的模型:', service.model);
  console.log('服務 API 金鑰長度:', service.openRouterApiKey ? service.openRouterApiKey.length : 0);
  
} catch (error) {
  console.log('❌ 服務實例創建失敗:', error.message);
}

console.log('\n=== OpenRouter API 直接測試 ===');

async function testOpenRouterAPI() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.log('⚠️ OpenRouter API 金鑰未設定，跳過直接測試');
    return;
  }
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const models = await response.json();
      console.log('✅ OpenRouter API 連接成功');
      console.log('可用模型數量:', models.data ? models.data.length : 0);
      
      // 檢查我們使用的模型是否存在
      const targetModel = process.env.OPENROUTER_DEFAULT_MODEL;
      if (models.data) {
        const modelExists = models.data.some(model => model.id === targetModel);
        console.log(`模型 ${targetModel} 是否存在:`, modelExists ? '✅' : '❌');
      }
    } else {
      console.log('❌ OpenRouter API 連接失敗:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.log('❌ OpenRouter API 測試錯誤:', error.message);
  }
}

testOpenRouterAPI().catch(console.error);