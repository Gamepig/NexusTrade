module.exports = {
  apps: [
    {
      name: 'NexusTrade',
      namespace: 'Nexus-Trade',
      script: 'src/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      // 健康檢查設定
      health_check_grace_period: 3000,
      // 重啟策略
      max_restarts: 10,
      min_uptime: '10s',
      // 日誌設定
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // 環境變數
      env_file: '.env'
    }
  ],

  // 部署設定 (可選)
  deploy: {
    production: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/nexustrade.git',
      path: '/var/www/nexustrade',
      'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production'
    }
  }
}; 