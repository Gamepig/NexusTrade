/**
 * NexusTrade 資料庫連接配置
 * 
 * 使用 Mongoose 連接 MongoDB
 * 包含連接池管理、錯誤處理和連接監控
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * MongoDB 連接選項配置
 */
const getConnectionOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    // 連接池設定
    maxPoolSize: isProduction ? 10 : 5, // 最大連接數
    minPoolSize: isProduction ? 2 : 1,  // 最小連接數
    maxIdleTimeMS: 30000,               // 連接閒置時間
    
    // 超時設定
    serverSelectionTimeoutMS: 5000,     // 伺服器選擇超時
    socketTimeoutMS: 45000,             // Socket 超時
    connectTimeoutMS: 10000,            // 連接超時
    
    // 心跳設定
    heartbeatFrequencyMS: 30000,        // 心跳頻率
    
    // 重試設定
    retryWrites: true,
    retryReads: true
  };
};

/**
 * 取得資料庫連接 URI
 */
const getConnectionURI = () => {
  const isTest = process.env.NODE_ENV === 'test';
  
  if (isTest) {
    return process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/nexustrade_test';
  }
  
  return process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexustrade';
};

/**
 * 連接到 MongoDB
 */
const connectDB = async () => {
  // 開發模式可跳過 MongoDB 連接
  if (process.env.SKIP_MONGODB === 'true') {
    logger.info('跳過 MongoDB 連接 (開發模式)');
    return null;
  }
  
  try {
    const uri = getConnectionURI();
    const options = getConnectionOptions();
    
    logger.info('正在連接 MongoDB...', { 
      uri: uri.replace(/\/\/.*@/, '//***:***@'), // 隱藏認證資訊
      environment: process.env.NODE_ENV 
    });

    // 建立連接
    const connection = await mongoose.connect(uri, options);
    
    logger.info('MongoDB 連接成功', {
      host: connection.connection.host,
      port: connection.connection.port,
      database: connection.connection.name,
      readyState: connection.connection.readyState
    });

    return connection;
  } catch (error) {
    logger.error('MongoDB 連接失敗:', error);
    throw error;
  }
};

/**
 * 斷開資料庫連接
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB 連接已關閉');
  } catch (error) {
    logger.error('MongoDB 斷開連接時發生錯誤:', error);
    throw error;
  }
};

/**
 * 設定 Mongoose 連接事件監聽器
 */
const setupConnectionEventListeners = () => {
  const connection = mongoose.connection;

  // 連接成功
  connection.on('connected', () => {
    logger.logSystemEvent('database_connected', {
      host: connection.host,
      port: connection.port,
      database: connection.name
    });
  });

  // 連接錯誤
  connection.on('error', (error) => {
    logger.error('MongoDB 連接錯誤:', error);
  });

  // 連接斷開
  connection.on('disconnected', () => {
    logger.logSystemEvent('database_disconnected');
  });

  // 重新連接
  connection.on('reconnected', () => {
    logger.logSystemEvent('database_reconnected');
  });

  // 緩衝區滿
  connection.on('fullsetup', () => {
    logger.logSystemEvent('database_fullsetup');
  });

  // MongoDB 驅動程式事件
  connection.on('close', () => {
    logger.logSystemEvent('database_connection_closed');
  });
};

/**
 * 檢查資料庫連接狀態
 */
const checkConnectionStatus = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return {
    state: states[state] || 'unknown',
    isConnected: state === 1,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    database: mongoose.connection.name
  };
};

/**
 * 資料庫健康檢查
 */
const healthCheck = async () => {
  try {
    const status = checkConnectionStatus();
    
    if (!status.isConnected) {
      throw new Error(`資料庫未連接，當前狀態: ${status.state}`);
    }

    // 執行簡單查詢測試連接
    await mongoose.connection.db.admin().ping();
    
    return {
      status: 'healthy',
      connection: status,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('資料庫健康檢查失敗:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      connection: checkConnectionStatus(),
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * 資料庫統計資訊
 */
const getDatabaseStats = async () => {
  try {
    if (!mongoose.connection.readyState === 1) {
      throw new Error('資料庫未連接');
    }

    const stats = await mongoose.connection.db.stats();
    
    return {
      database: stats.db,
      collections: stats.collections,
      documents: stats.objects,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexes: stats.indexes,
      indexSize: stats.indexSize,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('取得資料庫統計失敗:', error);
    throw error;
  }
};

/**
 * 初始化資料庫設定
 */
const initializeDatabase = async () => {
  try {
    // 設定 Mongoose 全域選項
    mongoose.set('strictQuery', true);
    mongoose.set('sanitizeFilter', true);
    
    // 設定事件監聽器
    setupConnectionEventListeners();
    
    // 連接資料庫
    await connectDB();
    
    logger.info('資料庫初始化完成');
    
  } catch (error) {
    logger.error('資料庫初始化失敗:', error);
    throw error;
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  initializeDatabase,
  checkConnectionStatus,
  healthCheck,
  getDatabaseStats,
  
  // 匯出資料庫實例
  get connection() {
    return mongoose.connection;
  },
  
  get mongoose() {
    return mongoose;
  }
};