/**
 * 修復警報記錄的 userId 格式
 * 將舊的字串 ID 更新為新的 ObjectId 格式
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { connectDB, disconnectDB } = require('./src/config/database');
const PriceAlert = require('./src/models/PriceAlert');

async function fixAlertUserId() {
    try {
        console.log('🔧 修復警報記錄的 userId 格式...');
        
        // 連接資料庫
        await connectDB();
        console.log('✅ 資料庫連接成功');
        
        // 更新 Vic Huang 的警報記錄
        const oldUserId = 'ue5cc188e1d2cdbac5cfda2abb6f6a34b';
        const newUserId = '6867bc852b8316e0d4b7f2ca';
        
        console.log(`🔄 將 ${oldUserId} 更新為 ${newUserId}`);
        
        const result = await PriceAlert.updateMany(
            { userId: oldUserId },
            { $set: { userId: newUserId } }
        );
        
        console.log('📊 更新結果:', result);
        console.log(`✅ 成功更新 ${result.modifiedCount} 個警報記錄`);
        
        // 驗證更新結果
        const updatedAlerts = await PriceAlert.find({ userId: newUserId });
        console.log(`🔍 驗證: 找到 ${updatedAlerts.length} 個使用新 ID 格式的警報`);
        
        if (updatedAlerts.length > 0) {
            console.log('\n📋 更新後的警報列表:');
            updatedAlerts.forEach((alert, index) => {
                console.log(`   ${index + 1}. ${alert.symbol} - ${alert.alertType} (ID: ${alert._id})`);
            });
        }
        
        // 斷開連接
        await disconnectDB();
        console.log('\n🔌 資料庫連接已關閉');
        
    } catch (error) {
        console.error('❌ 修復失敗:', error);
        process.exit(1);
    }
}

// 執行修復
fixAlertUserId()
    .then(() => {
        console.log('\n🎉 修復完成！');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 執行失敗:', error);
        process.exit(1);
    });