/**
 * 檢查警報記錄的 userId 格式
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { connectDB, disconnectDB } = require('./src/config/database');
const PriceAlert = require('./src/models/PriceAlert');

async function debugAlertsUserId() {
    try {
        console.log('🔍 檢查警報記錄的 userId 格式...');
        
        // 連接資料庫
        await connectDB();
        console.log('✅ 資料庫連接成功');
        
        // 查找所有警報
        const alerts = await PriceAlert.find({}).select('userId symbol alertType createdAt');
        
        console.log(`📊 找到 ${alerts.length} 個警報記錄`);
        
        alerts.forEach((alert, index) => {
            console.log(`\n📋 警報 ${index + 1}:`);
            console.log(`   ID: ${alert._id}`);
            console.log(`   User ID: ${alert.userId} (類型: ${typeof alert.userId})`);
            console.log(`   Symbol: ${alert.symbol}`);
            console.log(`   Alert Type: ${alert.alertType}`);
            console.log(`   Created: ${alert.createdAt}`);
        });
        
        // 特別檢查 Vic Huang 的警報
        console.log('\n🔍 查找 Vic Huang 的警報...');
        
        // 方法 1: 使用 ObjectId 格式
        const alertsObjectId = await PriceAlert.find({ 
            userId: '6867bc852b8316e0d4b7f2ca' 
        });
        console.log(`📊 使用 ObjectId 格式找到 ${alertsObjectId.length} 個警報`);
        
        // 方法 2: 使用舊的字串 ID
        const alertsStringId = await PriceAlert.find({ 
            userId: 'ue5cc188e1d2cdbac5cfda2abb6f6a34b' 
        });
        console.log(`📊 使用字串 ID 格式找到 ${alertsStringId.length} 個警報`);
        
        // 方法 3: 查找所有可能的格式
        const allPossibleAlerts = await PriceAlert.find({
            $or: [
                { userId: '6867bc852b8316e0d4b7f2ca' },
                { userId: 'ue5cc188e1d2cdbac5cfda2abb6f6a34b' },
                { userId: 'Ue5cc188e1d2cdbac5cfda2abb6f6a34b' }
            ]
        });
        console.log(`📊 總共找到 ${allPossibleAlerts.length} 個可能的警報`);
        
        if (allPossibleAlerts.length > 0) {
            console.log('\n📋 找到的警報詳細資料:');
            allPossibleAlerts.forEach((alert, index) => {
                console.log(`   ${index + 1}. ${alert.symbol} - ${alert.alertType} (User: ${alert.userId})`);
            });
        }
        
        // 斷開連接
        await disconnectDB();
        console.log('\n🔌 資料庫連接已關閉');
        
    } catch (error) {
        console.error('❌ 檢查失敗:', error);
        process.exit(1);
    }
}

// 執行檢查
debugAlertsUserId()
    .then(() => {
        console.log('\n🎉 檢查完成！');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 執行失敗:', error);
        process.exit(1);
    });