/**
 * 調試 MongoDB 使用者查詢問題
 */

// 載入環境變數
require('dotenv').config();

async function debugMongoDBUser() {
  console.log('🔍 調試 MongoDB 使用者查詢...\n');

  try {
    // 連接資料庫
    const { initializeDatabase } = require('./src/config/database');
    await initializeDatabase();
    
    console.log('✅ 資料庫連接成功\n');

    // 載入使用者模型
    const User = require('./src/models/User.model');
    
    // 列出所有使用者
    console.log('📋 查詢所有使用者...');
    const allUsers = await User.find({}).limit(10);
    
    console.log(`找到 ${allUsers.length} 個使用者:`);
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   LINE ID: ${user.lineId || '未設定'}`);
      console.log(`   顯示名稱: ${user.displayName || '未設定'}`);
      console.log('');
    });
    
    // 專門查找 LINE ID
    console.log('🔍 查找特定 LINE ID...');
    const lineUser = await User.findOne({ 
      lineId: 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b'
    });
    
    if (lineUser) {
      console.log('✅ 找到 LINE 使用者:');
      console.log('ID:', lineUser._id);
      console.log('Email:', lineUser.email);
      console.log('LINE ID:', lineUser.lineId);
      console.log('完整物件:', JSON.stringify(lineUser.toJSON(), null, 2));
    } else {
      console.log('❌ 未找到 LINE 使用者');
      
      // 嘗試查找相似的 LINE ID
      console.log('\n🔍 查找相似的 LINE ID...');
      const similarUsers = await User.find({
        lineId: { $regex: 'e5cc188e1d2cdbac5cfda2abb6f6a34b', $options: 'i' }
      });
      
      console.log(`找到 ${similarUsers.length} 個相似的使用者:`);
      similarUsers.forEach(user => {
        console.log(`- ID: ${user._id}, LINE ID: ${user.lineId}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 調試失敗:', error.message);
    console.error(error.stack);
  } finally {
    // 關閉資料庫連接
    const { disconnectDB } = require('./src/config/database');
    await disconnectDB();
    process.exit(0);
  }
}

// 執行調試
debugMongoDBUser();