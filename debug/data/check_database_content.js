/**
 * 檢查資料庫中的實際分析結果
 */

require('dotenv').config();
const mongoose = require('mongoose');
const AIAnalysisResult = require('./src/models/AIAnalysisResult');

async function checkDatabaseContent() {
  console.log('🔍 檢查資料庫中的分析結果\n');
  
  try {
    // 連接資料庫
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexustrade');
    console.log('✅ 資料庫連接成功');
    
    const today = new Date().toISOString().split('T')[0];
    
    console.log('\n=== 查詢 ETHUSDT 今日分析記錄 ===');
    const ethResults = await AIAnalysisResult.find({
      analysisType: 'single_currency',
      symbol: 'ETHUSDT',
      analysisDate: today
    }).sort({ createdAt: -1 }).limit(3);
    
    console.log(`找到 ${ethResults.length} 條 ETHUSDT 記錄`);
    
    ethResults.forEach((result, index) => {
      console.log(`\n--- 記錄 ${index + 1} (${result.createdAt}) ---`);
      console.log('ID:', result._id);
      console.log('Williams %R:', {
        value: result.analysis?.technicalAnalysis?.williamsR?.value,
        interpretation: result.analysis?.technicalAnalysis?.williamsR?.interpretation?.substring(0, 50) + '...',
        signal: result.analysis?.technicalAnalysis?.williamsR?.signal
      });
      console.log('市場情緒:', {
        score: result.analysis?.marketSentiment?.score,
        label: result.analysis?.marketSentiment?.label,
        summary: result.analysis?.marketSentiment?.summary?.substring(0, 50) + '...'
      });
      console.log('分析模型:', result.dataSources?.analysisModel);
    });
    
    console.log('\n=== 查詢 BTCUSDT 今日分析記錄 ===');
    const btcResults = await AIAnalysisResult.find({
      analysisType: 'single_currency',
      symbol: 'BTCUSDT',
      analysisDate: today
    }).sort({ createdAt: -1 }).limit(3);
    
    console.log(`找到 ${btcResults.length} 條 BTCUSDT 記錄`);
    
    btcResults.forEach((result, index) => {
      console.log(`\n--- 記錄 ${index + 1} (${result.createdAt}) ---`);
      console.log('ID:', result._id);
      console.log('Williams %R:', {
        value: result.analysis?.technicalAnalysis?.williamsR?.value,
        interpretation: result.analysis?.technicalAnalysis?.williamsR?.interpretation?.substring(0, 50) + '...',
        signal: result.analysis?.technicalAnalysis?.williamsR?.signal
      });
      console.log('市場情緒:', {
        score: result.analysis?.marketSentiment?.score,
        label: result.analysis?.marketSentiment?.label,
        summary: result.analysis?.marketSentiment?.summary?.substring(0, 50) + '...'
      });
      console.log('分析模型:', result.dataSources?.analysisModel);
    });
    
    // 檢查是否有預設分析特徵
    console.log('\n=== 檢查預設分析特徵 ===');
    const defaultFeatures = await AIAnalysisResult.find({
      analysisType: 'single_currency',
      analysisDate: today,
      $or: [
        { 'analysis.technicalAnalysis.williamsR.interpretation': '數據分析中' },
        { 'analysis.marketSentiment.summary': '市場情緒分析暫時不可用' },
        { 'analysis.technicalAnalysis.williamsR.value': -50 },
        { 'analysis.marketSentiment.score': 50 }
      ]
    });
    
    console.log(`發現 ${defaultFeatures.length} 條包含預設分析特徵的記錄`);
    
    defaultFeatures.forEach((result, index) => {
      console.log(`\n預設特徵記錄 ${index + 1}:`, {
        symbol: result.symbol,
        id: result._id,
        hasDefaultWilliamsR: result.analysis?.technicalAnalysis?.williamsR?.interpretation === '數據分析中',
        hasDefaultSentiment: result.analysis?.marketSentiment?.summary === '市場情緒分析暫時不可用',
        williamsValue: result.analysis?.technicalAnalysis?.williamsR?.value,
        sentimentScore: result.analysis?.marketSentiment?.score
      });
    });
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 資料庫連接已關閉');
  }
}

checkDatabaseContent().catch(console.error);