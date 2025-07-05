// 清除所有 AI 分析快取

require('dotenv').config();
const mongoose = require('mongoose');

async function clearCache() {
  try {
    console.log('🗑️ 清除 AI 分析快取...');
    
    // 連接 MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 連接成功');
    
    // 清除 AI 分析結果
    const AIAnalysisResult = require('./src/models/AIAnalysisResult.js');
    const result = await AIAnalysisResult.deleteMany({});
    console.log(`✅ 已清除 ${result.deletedCount} 個 AI 分析快取記錄`);
    
    // 斷開連接
    await mongoose.disconnect();
    console.log('✅ MongoDB 連接已關閉');
    
  } catch (error) {
    console.error('❌ 清除快取失敗:', error.message);
  }
}

clearCache().then(() => {
  console.log('🏁 快取清除完成');
  process.exit(0);
}).catch(error => {
  console.error('💥 清除失敗:', error);
  process.exit(1);
});