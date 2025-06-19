/**
 * NexusTrade 主要伺服器入口檔案
 * 
 * 此檔案負責：
 * - 初始化 Express 應用程式
 * - 設定基本中介軟體
 * - 建立路由系統
 * - 啟動伺服器
 */

// 環境變數載入
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// 自訂模組
const logger = require('./utils/logger');
const { connectDB } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const { notFoundHandler } = require('./middleware/notFoundHandler');
const { getWebSocketService } = require('./services/websocket.service');

// 路由模組
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const apiRouter = require('./routes/api');

// 建立 Express 應用程式
const app = express();

// 基本設定
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * 安全性中介軟體設定
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://s3.tradingview.com", "https://www.tradingview.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      frameSrc: ["'self'", "https://www.tradingview.com", "https://www.tradingview-widget.com", "https://s.tradingview.com"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

/**
 * CORS 設定
 */
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

/**
 * 速率限制設定
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分鐘
  max: 100, // 每個IP最多100次請求
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 // 秒
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

/**
 * 基本中介軟體設定
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 壓縮回應
app.use(compression());

// 靜態檔案服務
app.use(express.static(path.join(__dirname, '../public')));

// 測試檔案服務 (僅開發環境)
if (NODE_ENV === 'development') {
  app.use('/tests', express.static(path.join(__dirname, '../tests')));
}

// Passport 初始化 (OAuth 認證)
const passport = require('passport');
const { configurePassport } = require('./controllers/oauth.controller');

app.use(passport.initialize());
configurePassport();

// 請求日誌 (僅在開發環境)
if (NODE_ENV === 'development') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

/**
 * 路由設定
 */
app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/api', apiRouter);

// 根路由 - 提供前端首頁
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/**
 * 錯誤處理中介軟體
 */
app.use(notFoundHandler);
app.use(errorHandler);

// SPA 支援 - 所有其他路由都返回 index.html (必須放在最後)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/**
 * 伺服器啟動函數
 */
const startServer = async () => {
  try {
    // 連接資料庫
    const dbConnection = await connectDB();
    if (dbConnection) {
      logger.info('資料庫連接成功');
    } else {
      logger.info('使用 Mock 模式運行 (跳過資料庫連接)');
    }

    // 啟動伺服器
    const server = app.listen(PORT, () => {
      logger.info(`NexusTrade 伺服器運行在 ${NODE_ENV} 模式`);
      logger.info(`伺服器地址: http://localhost:${PORT}`);
      logger.info(`健康檢查: http://localhost:${PORT}/health`);
      logger.info(`WebSocket 端點: ws://localhost:${PORT}/ws`);
    });

    // 初始化 WebSocket 服務
    const wsService = getWebSocketService();
    wsService.initialize(server);

    // 優雅關閉處理
    const gracefulShutdown = async (signal) => {
      logger.info(`收到 ${signal} 信號，開始優雅關閉伺服器...`);
      
      server.close(async () => {
        logger.info('HTTP 伺服器已關閉');
        
        // 關閉資料庫連接
        try {
          await require('mongoose').connection.close();
          logger.info('資料庫連接已關閉');
          process.exit(0);
        } catch (error) {
          logger.error('關閉資料庫連接失敗:', error.message);
          process.exit(1);
        }
      });

      // 強制關閉超時
      setTimeout(() => {
        logger.error('強制關閉伺服器');
        process.exit(1);
      }, 10000);
    };

    // 註冊信號處理器
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 未捕獲的異常處理
    process.on('uncaughtException', (error) => {
      logger.error('未捕獲的異常:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未處理的 Promise 拒絕:', reason);
      logger.error('Promise:', promise);
    });

    return server;

  } catch (error) {
    logger.error('伺服器啟動失敗:', error);
    process.exit(1);
  }
};

// 啟動伺服器
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };