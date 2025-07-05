/**
 * 測試配額計算邏輯
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { connectDB, disconnectDB } = require('./src/config/database');
const PriceAlert = require('./src/models/PriceAlert');

async function testQuotaCalculation() {
    try {
        console.log('🧪 測試配額計算邏輯...');
        
        // 連接資料庫
        await connectDB();
        console.log('✅ 資料庫連接成功');
        
        const userId = '6867bc852b8316e0d4b7f2ca'; // Vic Huang
        
        // 查詢所有警報
        const allAlerts = await PriceAlert.find({ userId });
        console.log(`📊 總警報數: ${allAlerts.length}`);
        
        // 依狀態分組
        const alertsByStatus = {};
        allAlerts.forEach(alert => {
            if (!alertsByStatus[alert.status]) {
                alertsByStatus[alert.status] = [];
            }
            alertsByStatus[alert.status].push(alert);
        });
        
        console.log('\n📋 警報狀態分布:');
        for (const status in alertsByStatus) {
            console.log(`   ${status}: ${alertsByStatus[status].length} 個`);
        }
        
        // 計算活躍警報數量 (應該計入配額)
        const activeAlertsCount = await PriceAlert.countDocuments({
            userId: userId,
            status: { $in: ['active', 'paused'] }
        });
        
        console.log(`\n🎯 應計入配額的警報數: ${activeAlertsCount}`);
        
        // 計算非活躍警報數量 (不計入配額)
        const inactiveAlertsCount = await PriceAlert.countDocuments({
            userId: userId,
            status: { $in: ['triggered', 'expired', 'cancelled'] }
        });
        
        console.log(`🔕 不計入配額的警報數: ${inactiveAlertsCount}`);
        
        // 免費會員限制
        const freeLimit = 1;
        console.log(`\n💎 免費會員限制: ${freeLimit} 個`);
        console.log(`📈 當前使用: ${activeAlertsCount} 個`);
        console.log(`✅ 是否可建立新警報: ${activeAlertsCount < freeLimit ? '是' : '否'}`);
        
        if (activeAlertsCount >= freeLimit) {
            console.log('⚠️  需要升級會員或刪除現有活躍警報');
        }
        
        // 斷開連接
        await disconnectDB();
        console.log('\n🔌 資料庫連接已關閉');
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
        process.exit(1);
    }
}

// 執行測試
testQuotaCalculation()
    .then(() => {
        console.log('\n🎉 測試完成！');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 執行失敗:', error);
        process.exit(1);
    });