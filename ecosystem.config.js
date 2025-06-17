/**
 * PM2 部署配置檔案 - NexusTrade
 * 
 * 提供完整的 PM2 部署和管理設定
 * Namespace: NexusTrade
 */

module.exports = {
  apps: [
    {
      // 應用程式基本設定
      name: 'nexustrade-api',
      namespace: 'NexusTrade',
      script: 'src/server.js',
      cwd: './',
      
      // 執行環境設定
      node_args: '--max-old-space-size=1024',
      interpreter: 'node',
      interpreter_args: '',
      
      // 實例設定
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
      
      // 監控設定
      watch: process.env.NODE_ENV === 'development',
      watch_delay: 1000,
      ignore_watch: [
        'node_modules',
        'logs',
        'memory-bank',
        'docs',
        'test_frontend.html',
        '.git',
        '*.log'
      ],
      
      // 自動重啟設定
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',
      max_memory_restart: '500M',
      
      // 環境變數
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        APP_NAME: 'NexusTrade',
        LOG_LEVEL: 'debug',
        PM2_SERVE_PATH: './public',
        PM2_SERVE_PORT: 3001,
        PM2_SERVE_SPA: 'true'
      },
      
      // 生產環境變數
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        APP_NAME: 'NexusTrade',
        LOG_LEVEL: 'info',
        instances: 'max',
        exec_mode: 'cluster'
      },
      
      // 測試環境變數
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
        APP_NAME: 'NexusTrade-Staging',
        LOG_LEVEL: 'debug'
      },
      
      // 日誌設定
      log_file: './logs/nexustrade-combined.log',
      out_file: './logs/nexustrade-out.log',
      error_file: './logs/nexustrade-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // 進程管理
      pid_file: './logs/nexustrade.pid',
      
      // 時間設定
      time: true,
      
      // 來源映射支援
      source_map_support: true,
      
      // 實例間負載平衡
      instance_var: 'INSTANCE_ID',
      
      // 優雅關閉
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // 自訂 PM2 標籤
      pmx: true,
      
      // 額外設定
      vizion: false,
      automation: false,
      
      // 健康檢查設定
      health_check_grace_time: 3000,
      
      // 自訂 metadata
      metadata: {
        namespace: 'NexusTrade',
        project_type: 'cryptocurrency-trading-platform',
        maintainer: 'NexusTrade Development Team',
        version: '1.0.0',
        build_date: '2025-06-17',
        api_categories: [
          'system-monitoring',
          'authentication', 
          'user-management',
          'market-data',
          'notification-system',
          'ai-analysis'
        ]
      }
    },
    
    // 靜態檔案伺服器 (可選)
    {
      name: 'nexustrade-static',
      namespace: 'NexusTrade',
      script: 'serve',
      args: 'public -s -l 3001',
      env: {
        NODE_ENV: 'development',
        PM2_SERVE_PATH: './public',
        PM2_SERVE_PORT: 3001,
        PM2_SERVE_SPA: 'true'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      log_file: './logs/nexustrade-static.log',
      merge_logs: true,
      metadata: {
        namespace: 'NexusTrade',
        component: 'static-server',
        purpose: 'serve-frontend-assets'
      }
    }
  ],
  
  // 部署設定
  deploy: {
    // 生產環境部署
    production: {
      namespace: 'NexusTrade',
      user: 'deploy',
      host: ['nexustrade.example.com'],
      ref: 'origin/main',
      repo: 'https://github.com/Gamepig/NexusTrade.git',
      path: '/var/www/nexustrade',
      'pre-setup': 'apt update && apt install -y nodejs npm mongodb',
      'post-setup': 'ls -la',
      'pre-deploy-local': 'echo "本地預部署檢查"',
      'pre-deploy': 'git fetch --all',
      'post-deploy': [
        'npm install',
        'npm run build',
        'pm2 reload ecosystem.config.js --env production',
        'pm2 save'
      ].join(' && '),
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        namespace: 'NexusTrade'
      }
    },
    
    // 測試環境部署  
    staging: {
      namespace: 'NexusTrade',
      user: 'deploy',
      host: ['staging.nexustrade.example.com'],
      ref: 'origin/develop',
      repo: 'https://github.com/Gamepig/NexusTrade.git',
      path: '/var/www/nexustrade-staging',
      'post-deploy': [
        'npm install',
        'pm2 reload ecosystem.config.js --env staging',
        'pm2 save'
      ].join(' && '),
      env: {
        NODE_ENV: 'staging',
        PORT: 3000,
        namespace: 'NexusTrade'
      }
    }
  }
};

/**
 * PM2 使用說明
 * 
 * 基本命令：
 * pm2 start ecosystem.config.js                    # 啟動所有應用程式
 * pm2 start ecosystem.config.js --only nexustrade-api  # 只啟動 API 伺服器
 * pm2 start ecosystem.config.js --env production   # 使用生產環境變數啟動
 * 
 * 管理命令：
 * pm2 list                                         # 列出所有進程
 * pm2 show nexustrade-api                          # 顯示應用程式詳細資訊
 * pm2 logs nexustrade-api                          # 查看日誌
 * pm2 monit                                        # 監控介面
 * pm2 restart nexustrade-api                       # 重啟應用程式
 * pm2 reload nexustrade-api                        # 零停機重載
 * pm2 stop nexustrade-api                          # 停止應用程式
 * pm2 delete nexustrade-api                        # 刪除應用程式
 * 
 * 部署命令：
 * pm2 deploy production setup                      # 初始化生產環境
 * pm2 deploy production                            # 部署到生產環境
 * pm2 deploy staging                               # 部署到測試環境
 * 
 * 持久化和還原：
 * pm2 save                                         # 保存當前進程列表
 * pm2 resurrect                                    # 還原保存的進程列表
 * pm2 startup                                      # 生成開機自啟動腳本
 * 
 * 監控和日誌：
 * pm2 logs --lines 200                            # 查看最近 200 行日誌
 * pm2 flush                                        # 清空所有日誌
 * pm2 install pm2-logrotate                       # 安裝日誌輪轉模組
 */