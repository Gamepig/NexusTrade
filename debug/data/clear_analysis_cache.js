/**
 * 清理分析快取
 */

require('dotenv').config();
const mongoose = require('mongoose');
const AIAnalysisResult = require('./src/models/AIAnalysisResult');

async function clearAnalysisCache() {
  console.log('🗑️ 清理分析快取...\n');
  
  try {
    // 連接資料庫
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexustrade');
    console.log('✅ 資料庫連接成功');
    
    // 刪除 ETHUSDT 的所有分析記錄
    const result = await AIAnalysisResult.deleteMany({ symbol: 'ETHUSDT' });
    console.log(`🗑️ 刪除了 ${result.deletedCount} 條 ETHUSDT 分析記錄`);
    
    // 也可以刪除所有今天的分析記錄，強制重新分析
    const today = new Date().toISOString().split('T')[0];
    const todayResult = await AIAnalysisResult.deleteMany({ analysisDate: today });
    console.log(`🗑️ 刪除了 ${todayResult.deletedCount} 條今日分析記錄`);
    
    console.log('✅ 快取清理完成');
    
  } catch (error) {
    console.error('❌ 清理失敗:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 資料庫連接已關閉');
  }
}

clearAnalysisCache().catch(console.error);