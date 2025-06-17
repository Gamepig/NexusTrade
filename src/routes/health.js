/**
 * NexusTrade 健康檢查路由
 * 
 * 提供系統健康狀態、版本資訊和診斷端點
 */

const express = require('express');
const { checkConnectionStatus, healthCheck, getDatabaseStats } = require('../config/database');
const logger = require('../utils/logger');
const { asyncErrorHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * 基本健康檢查
 * GET /health
 */
router.get('/', asyncErrorHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'NexusTrade',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      responseTime: Date.now() - startTime
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error('健康檢查失敗', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}));

/**
 * 詳細系統狀態檢查
 * GET /health/status
 */
router.get('/status', asyncErrorHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    // 檢查資料庫連接
    const dbHealth = await healthCheck();
    const dbConnection = checkConnectionStatus();
    
    // 檢查記憶體使用情況
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    };

    // 系統資源檢查
    const cpuUsage = process.cpuUsage();
    
    const systemStatus = {
      status: dbHealth.status === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      service: {
        name: 'NexusTrade',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      system: {
        uptime: process.uptime(),
        memory: memoryUsageMB,
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        platform: process.platform,
        nodeVersion: process.version
      },
      database: {
        status: dbHealth.status,
        connection: dbConnection,
        ...(dbHealth.error && { error: dbHealth.error })
      },
      responseTime: Date.now() - startTime
    };

    const statusCode = systemStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(systemStatus);
    
  } catch (error) {
    logger.error('系統狀態檢查失敗', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime: Date.now() - startTime
    });
  }
}));

/**
 * 資料庫詳細統計
 * GET /health/database
 */
router.get('/database', asyncErrorHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    const dbHealth = await healthCheck();
    const dbConnection = checkConnectionStatus();
    let dbStats = null;
    
    // 只有在連接正常時才取得統計資料
    if (dbConnection.isConnected) {
      try {
        dbStats = await getDatabaseStats();
      } catch (statsError) {
        logger.warn('無法取得資料庫統計', statsError);
      }
    }

    const databaseStatus = {
      status: dbHealth.status,
      timestamp: new Date().toISOString(),
      connection: dbConnection,
      health: dbHealth,
      ...(dbStats && { statistics: dbStats }),
      responseTime: Date.now() - startTime
    };

    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(databaseStatus);
    
  } catch (error) {
    logger.error('資料庫狀態檢查失敗', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime: Date.now() - startTime
    });
  }
}));

/**
 * 服務準備就緒檢查 (Kubernetes readiness probe)
 * GET /health/ready
 */
router.get('/ready', asyncErrorHandler(async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    
    if (dbHealth.status === 'healthy') {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Database not healthy'
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      reason: error.message
    });
  }
}));

/**
 * 服務存活檢查 (Kubernetes liveness probe)
 * GET /health/live
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * 版本資訊
 * GET /health/version
 */
router.get('/version', (req, res) => {
  const packageInfo = {
    name: process.env.npm_package_name || 'nexustrade',
    version: process.env.npm_package_version || '1.0.0',
    description: process.env.npm_package_description || 'NexusTrade - 加密貨幣交易追蹤平台',
    buildDate: process.env.BUILD_DATE || new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  };

  res.status(200).json(packageInfo);
});

/**
 * 依賴服務檢查
 * GET /health/dependencies
 */
router.get('/dependencies', asyncErrorHandler(async (req, res) => {
  const dependencies = [];
  
  // 檢查資料庫
  try {
    const dbHealth = await healthCheck();
    dependencies.push({
      name: 'MongoDB',
      status: dbHealth.status,
      responseTime: '< 50ms',
      version: 'MongoDB 7.0',
      ...(dbHealth.error && { error: dbHealth.error })
    });
  } catch (error) {
    dependencies.push({
      name: 'MongoDB',
      status: 'unhealthy',
      error: error.message
    });
  }

  // 檢查外部 API 服務 (模擬檢查)
  dependencies.push({
    name: 'Binance API',
    status: 'not_configured',
    note: 'API Key 尚未設定'
  });

  dependencies.push({
    name: 'LINE Messaging API',
    status: 'not_configured',
    note: 'Channel Access Token 尚未設定'
  });

  dependencies.push({
    name: 'OpenRouter AI API',
    status: 'not_configured',
    note: 'API Key 尚未設定'
  });

  const overallStatus = dependencies.some(dep => dep.status === 'unhealthy') ? 'degraded' : 'healthy';
  
  res.status(overallStatus === 'healthy' ? 200 : 503).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    dependencies
  });
}));

/**
 * 系統指標監控
 * GET /health/metrics
 */
router.get('/metrics', asyncErrorHandler(async (req, res) => {
  const startTime = Date.now();

  try {
    // 記憶體使用情況 (MB)
    const memoryUsage = process.memoryUsage();
    const memoryMetrics = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapUtilization: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    };

    // CPU 使用情況
    const cpuUsage = process.cpuUsage();
    
    // 系統運行時間
    const uptimeSeconds = process.uptime();
    const uptimeFormatted = {
      days: Math.floor(uptimeSeconds / 86400),
      hours: Math.floor((uptimeSeconds % 86400) / 3600),
      minutes: Math.floor((uptimeSeconds % 3600) / 60),
      seconds: Math.floor(uptimeSeconds % 60)
    };

    // 資料庫指標
    let dbMetrics = null;
    try {
      const dbStats = await getDatabaseStats();
      if (dbStats) {
        dbMetrics = {
          collections: dbStats.collections,
          documents: dbStats.documents,
          dataSize: Math.round(dbStats.dataSize / 1024 / 1024), // MB
          storageSize: Math.round(dbStats.storageSize / 1024 / 1024), // MB
          indexes: dbStats.indexes,
          indexSize: Math.round(dbStats.indexSize / 1024 / 1024) // MB
        };
      }
    } catch (error) {
      logger.warn('無法取得資料庫指標', error);
    }

    const metrics = {
      timestamp: new Date().toISOString(),
      application: {
        name: 'NexusTrade',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      },
      system: {
        platform: process.platform,
        uptime: uptimeFormatted,
        uptimeSeconds: Math.round(uptimeSeconds)
      },
      memory: memoryMetrics,
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      database: dbMetrics,
      responseTime: Date.now() - startTime
    };

    res.status(200).json(metrics);

  } catch (error) {
    logger.error('系統指標檢查失敗', error);
    res.status(503).json({
      status: 'error',
      message: '無法取得系統指標',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    });
  }
}));

/**
 * 應用程式配置資訊
 * GET /health/config
 */
router.get('/config', (req, res) => {
  const config = {
    timestamp: new Date().toISOString(),
    application: {
      name: process.env.APP_NAME || 'NexusTrade',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    },
    server: {
      port: process.env.PORT || 3000,
      corsOrigin: process.env.CORS_ORIGIN,
      logLevel: process.env.LOG_LEVEL || 'info'
    },
    features: {
      swaggerEnabled: process.env.SWAGGER_ENABLED === 'true',
      debugMode: process.env.DEBUG !== undefined,
      emailVerificationRequired: false, // 根據實際配置調整
      fileUploadEnabled: true
    },
    limits: {
      uploadMaxSize: process.env.UPLOAD_MAX_SIZE || '10MB',
      maxNotificationsPerUser: process.env.MAX_NOTIFICATIONS_PER_USER || 50,
      cacheTTL: process.env.CACHE_TTL || 3600
    }
  };

  res.status(200).json(config);
});

module.exports = router;