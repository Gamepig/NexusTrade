/**
 * 清除測試數據腳本
 */

const PriceAlert = require('./src/models/PriceAlert');

async function clearTestData() {
  console.log('🧹 正在清除測試數據...\n');

  try {
    // 檢查是否使用 Mock 模式
    if (process.env.SKIP_MONGODB === 'true' || PriceAlert.constructor.name === 'MockPriceAlert') {
      console.log('🗂️ Mock 模式 - 清除內存存儲');
      if (PriceAlert.store) {
        const count = PriceAlert.store.size;
        PriceAlert.store.clear();
        console.log(`✅ 已清除 ${count} 個 Mock 警報`);
      }
    } else {
      // MongoDB 模式
      console.log('🏢 MongoDB 模式 - 清除資料庫');
      
      // 刪除所有警報
      const result = await PriceAlert.deleteMany({});
      console.log(`✅ 已刪除 ${result.deletedCount} 個警報`);
    }

    console.log('\n🎉 測試數據清除完成！');

  } catch (error) {
    console.error('❌ 清除失敗:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

// 執行清除
clearTestData();