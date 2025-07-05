/**
 * 修復用戶警報配額問題
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { connectDB, disconnectDB } = require('./src/config/database');
const User = require('./src/models/User.model');

async function fixUserQuota() {
    try {
        console.log('🔧 修復用戶警報配額...');
        
        // 連接資料庫
        await connectDB();
        console.log('✅ 資料庫連接成功');
        
        // 找到 Vic Huang 用戶
        const user = await User.findById('6867bc852b8316e0d4b7f2ca');
        
        if (!user) {
            console.log('❌ 用戶不存在');
            return;
        }
        
        console.log('👤 找到用戶:', user.profile?.displayName || user.username);
        console.log('📊 當前配額狀態:', user.alertQuota);
        
        // 使用 MongoDB 直接更新，避免驗證問題
        const result = await User.updateOne(
            { _id: '6867bc852b8316e0d4b7f2ca' },
            { 
                $set: {
                    'alertQuota.used': 0,
                    'alertQuota.limit': 1,
                    'membershipLevel': 'free'
                }
            }
        );
        
        console.log('🔄 更新結果:', result);
        
        console.log('✅ 用戶配額已修復');
        console.log('📊 新配額狀態:', user.alertQuota);
        console.log('🏆 會員等級:', user.membershipLevel);
        
        // 斷開連接
        await disconnectDB();
        console.log('🔌 資料庫連接已關閉');
        
    } catch (error) {
        console.error('❌ 修復失敗:', error);
        process.exit(1);
    }
}

// 執行修復
fixUserQuota()
    .then(() => {
        console.log('🎉 修復完成！');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 執行失敗:', error);
        process.exit(1);
    });