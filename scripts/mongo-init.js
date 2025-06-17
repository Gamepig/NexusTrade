// NexusTrade MongoDB 初始化腳本
// 建立資料庫、使用者和基本索引

// 切換到 NexusTrade 資料庫
db = db.getSiblingDB('nexustrade');

// 建立應用程式使用者
db.createUser({
  user: 'nexustrade_app',
  pwd: 'nexustrade_app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'nexustrade'
    }
  ]
});

// 建立集合和索引
print('建立 users 集合和索引...');
db.createCollection('users');
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ googleId: 1 }, { sparse: true });
db.users.createIndex({ lineId: 1 }, { sparse: true });
db.users.createIndex({ username: 1 }, { unique: true, sparse: true });
db.users.createIndex({ createdAt: 1 });

print('建立 notificationrules 集合和索引...');
db.createCollection('notificationrules');
db.notificationrules.createIndex({ userId: 1 });
db.notificationrules.createIndex({ symbol: 1 });
db.notificationrules.createIndex({ status: 1 });
db.notificationrules.createIndex({ createdAt: 1 });
db.notificationrules.createIndex({ 
  userId: 1, 
  symbol: 1, 
  alertType: 1 
}, { unique: true });

print('建立 pricealerts 集合和索引...');
db.createCollection('pricealerts');
db.pricealerts.createIndex({ userId: 1 });
db.pricealerts.createIndex({ symbol: 1 });
db.pricealerts.createIndex({ status: 1 });
db.pricealerts.createIndex({ alertType: 1 });
db.pricealerts.createIndex({ createdAt: 1 });
db.pricealerts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

print('建立 notificationhistory 集合和索引...');
db.createCollection('notificationhistory');
db.notificationhistory.createIndex({ userId: 1 });
db.notificationhistory.createIndex({ ruleId: 1 });
db.notificationhistory.createIndex({ sentAt: 1 });
db.notificationhistory.createIndex({ status: 1 });

print('建立 aianalyses 集合和索引...');
db.createCollection('aianalyses');
db.aianalyses.createIndex({ symbol: 1 });
db.aianalyses.createIndex({ createdAt: 1 });
db.aianalyses.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 插入範例數據 (僅開發環境)
if (db.getMongo().getDBNames().indexOf('nexustrade_dev') !== -1 || 
    process.env.NODE_ENV === 'development') {
  
  print('插入開發環境範例數據...');
  
  // 範例使用者
  db.users.insertOne({
    email: 'test@nexustrade.com',
    username: 'testuser',
    displayName: 'Test User',
    role: 'user',
    isEmailVerified: true,
    preferences: {
      theme: 'dark',
      language: 'zh-TW',
      timezone: 'Asia/Taipei'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  print('MongoDB 初始化完成！');
} else {
  print('MongoDB 生產環境初始化完成！');
}