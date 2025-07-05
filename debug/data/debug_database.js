/**
 * 資料庫連接除錯腳本
 */

require('dotenv').config();
const { connectDB, checkConnectionStatus, healthCheck } = require('./src/config/database');
const mongoose = require('mongoose');

async function debugDatabase() {
  console.log('🔍 開始資料庫連接診斷...\n');
  
  try {
    console.log('=== 1. 環境變數檢查 ===');
    console.log('MONGODB_URI:', process.env.MONGODB_URI);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('SKIP_MONGODB:', process.env.SKIP_MONGODB);
    console.log('');
    
    console.log('=== 2. 初始連接狀態 ===');
    const initialStatus = checkConnectionStatus();
    console.log('初始狀態:', initialStatus);
    console.log('');
    
    console.log('=== 3. 嘗試連接資料庫 ===');
    const connection = await connectDB();
    
    if (connection) {
      console.log('✅ connectDB() 成功返回連接');
      console.log('連接詳情:', {
        host: connection.connection.host,
        port: connection.connection.port,
        database: connection.connection.name,
        readyState: connection.connection.readyState
      });
    } else {
      console.log('⚠️ connectDB() 返回 null (跳過模式)');
    }
    console.log('');
    
    console.log('=== 4. 連接後狀態檢查 ===');
    const postStatus = checkConnectionStatus();
    console.log('連接後狀態:', postStatus);
    console.log('');
    
    console.log('=== 5. 健康檢查 ===');
    const health = await healthCheck();
    console.log('健康檢查結果:', health);
    console.log('');
    
    if (postStatus.isConnected) {
      console.log('=== 6. 測試資料庫操作 ===');
      try {
        // 測試簡單查詢
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('資料庫集合數量:', collections.length);
        console.log('集合名稱:', collections.map(c => c.name));
        
        // 測試 AI 分析結果模型
        const AIAnalysisResult = require('./src/models/AIAnalysisResult');
        const count = await AIAnalysisResult.countDocuments();
        console.log('AI 分析結果文檔數量:', count);
        
        console.log('✅ 資料庫操作測試成功');
      } catch (queryError) {
        console.log('❌ 資料庫查詢測試失敗:', queryError.message);
      }
    }
    
    console.log('\n🎯 診斷完成');
    
  } catch (error) {
    console.error('\n❌ 診斷過程發生錯誤:', error.message);
    console.error('錯誤堆疊:', error.stack);
  } finally {
    // 清理連接
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 已斷開資料庫連接');
    }
    process.exit(0);
  }
}

debugDatabase();