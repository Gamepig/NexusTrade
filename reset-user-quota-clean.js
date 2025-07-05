/**
 * 清理用戶警報配額
 * 刪除部分警報以便測試
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { connectDB, disconnectDB } = require('./src/config/database');
const PriceAlert = require('./src/models/PriceAlert');

async function resetUserQuotaClean() {
    try {
        console.log('🧹 清理用戶警報配額...');
        
        // 連接資料庫
        await connectDB();
        console.log('✅ 資料庫連接成功');
        
        const userId = '6867bc852b8316e0d4b7f2ca'; // Vic Huang
        
        // 查詢所有警報
        const allAlerts = await PriceAlert.find({ userId });
        console.log(`📊 找到 ${allAlerts.length} 個警報`);
        
        if (allAlerts.length > 0) {
            console.log('\n📋 現有警報:');
            allAlerts.forEach((alert, index) => {
                console.log(`   ${index + 1}. ${alert.symbol} - ${alert.alertType} (${alert.status})`);
            });
        }
        
        // 選項 1: 刪除所有 active 狀態的警報，保留 triggered 狀態
        console.log('\n🎯 刪除所有 active 狀態的警報...');
        const deleteResult = await PriceAlert.deleteMany({
            userId: userId,
            status: 'active'
        });
        
        console.log(`✅ 刪除了 ${deleteResult.deletedCount} 個 active 警報`);
        
        // 驗證結果
        const remainingAlerts = await PriceAlert.find({ userId });
        console.log(`📊 剩餘警報數: ${remainingAlerts.length}`);
        
        const activeCount = await PriceAlert.countDocuments({
            userId: userId,
            status: { $in: ['active', 'paused'] }
        });
        
        console.log(`🎯 剩餘活躍警報數 (計入配額): ${activeCount}`);
        console.log(`✅ 現在可以建立新警報: ${activeCount < 1 ? '是' : '否'}`);
        
        // 斷開連接
        await disconnectDB();
        console.log('\n🔌 資料庫連接已關閉');
        
    } catch (error) {
        console.error('❌ 清理失敗:', error);
        process.exit(1);
    }
}

// 執行清理
resetUserQuotaClean()
    .then(() => {
        console.log('\n🎉 清理完成！');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 執行失敗:', error);
        process.exit(1);
    });