# 部署指南

## 📋 概述

本文件提供 NexusTrade 的完整部署指南，涵蓋本地開發、測試環境、預備環境和生產環境的部署策略。支援 Docker 容器化部署和傳統伺服器部署兩種方式。

## 🏗️ 部署架構

### 生產環境架構
```
Internet
    ↓
[Load Balancer (Nginx)]
    ↓
[NexusTrade App (PM2 Cluster)]
    ↓
[MongoDB Replica Set] ←→ [Redis Cache]
    ↓
[External APIs: Binance, LINE, OpenRouter]
```

### 服務組件
- **Web 應用**: Node.js + Express (PM2 管理)
- **資料庫**: MongoDB 7.0+ (Replica Set)
- **快取**: Redis 7.2+ (可選)
- **反向代理**: Nginx (生產環境)
- **容器化**: Docker + Docker Compose

## 🚀 快速部署

### 方式一：Docker Compose (推薦)

#### 生產環境部署
```bash
# 1. 克隆專案
git clone https://github.com/Gamepig/NexusTrade.git
cd NexusTrade

# 2. 設定環境變數
cp .env.example .env
nano .env  # 編輯環境變數

# 3. 啟動生產服務
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d

# 4. 檢查服務狀態
docker-compose ps

# 5. 查看日誌
docker-compose logs -f nexustrade-app
```

#### 開發環境部署
```bash
# 啟動開發服務 (支援熱重載)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 進入開發容器
docker-compose exec nexustrade-app bash
```

### 方式二：傳統伺服器部署

#### 環境準備
```bash
# Ubuntu 22.04 LTS
# 1. 更新系統
sudo apt update && sudo apt upgrade -y

# 2. 安裝 Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 安裝 MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# 4. 安裝 PM2
sudo npm install -g pm2

# 5. 安裝 Nginx
sudo apt install -y nginx
```

#### 應用程式部署
```bash
# 1. 克隆並設定
git clone https://github.com/Gamepig/NexusTrade.git
cd NexusTrade
cp .env.example .env
nano .env

# 2. 安裝依賴
npm install --production

# 3. 啟動 MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# 4. 啟動應用
pm2 start ecosystem.config.js --env production

# 5. 設定開機自啟
pm2 startup
pm2 save
```

## ⚙️ 環境配置

### 環境變數設定

#### 必要環境變數
```env
# 基本設定
NODE_ENV=production
PORT=3000

# 資料庫
MONGODB_URI=mongodb://localhost:27017/nexustrade
# 或 Replica Set
MONGODB_URI=mongodb://mongo1:27017,mongo2:27017,mongo3:27017/nexustrade?replicaSet=rs0

# JWT 認證
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# OAuth 認證
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
LINE_CHANNEL_ID=your-line-channel-id
LINE_CHANNEL_SECRET=your-line-channel-secret

# LINE Messaging API
LINE_ACCESS_TOKEN=your-line-access-token

# AI 分析 (可選)
OPENROUTER_API_KEY=your-openrouter-api-key

# 外部 API (可選)
BINANCE_API_KEY=your-binance-api-key
BINANCE_API_SECRET=your-binance-api-secret
```

#### 進階配置
```env
# 快取設定
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# 日誌設定
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/nexustrade/app.log

# 安全設定
CORS_ORIGIN=https://nexustrade.com,https://www.nexustrade.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 監控設定
ENABLE_METRICS=true
METRICS_PORT=9090

# 郵件設定 (可選)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Docker Compose 配置

#### 生產環境 (docker-compose.production.yml)
```yaml
version: '3.8'

services:
  nexustrade-app:
    build: 
      context: .
      dockerfile: Dockerfile.production
    environment:
      - NODE_ENV=production
    networks:
      - nexustrade-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - nexustrade-app
    networks:
      - nexustrade-network
    restart: unless-stopped

  mongodb:
    image: mongo:7.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
      MONGO_INITDB_DATABASE: nexustrade
    volumes:
      - mongodb_data:/data/db
      - ./mongo/mongod.conf:/etc/mongod.conf:ro
      - ./mongo/init-replica.js:/docker-entrypoint-initdb.d/init-replica.js:ro
    networks:
      - nexustrade-network
    restart: unless-stopped
    command: mongod --config /etc/mongod.conf --replSet rs0

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - nexustrade-network
    restart: unless-stopped

  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 3600 --cleanup
    restart: unless-stopped

volumes:
  mongodb_data:
    driver: local
  redis_data:
    driver: local

networks:
  nexustrade-network:
    driver: bridge
```

#### 開發環境 (docker-compose.dev.yml)
```yaml
version: '3.8'

services:
  nexustrade-app:
    build: 
      context: .
      dockerfile: Dockerfile.dev
    environment:
      - NODE_ENV=development
      - CHOKIDAR_USEPOLLING=true
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

  mongodb:
    ports:
      - "27017:27017"
    
  redis:
    ports:
      - "6379:6379"
```

### PM2 配置

#### ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'nexustrade-api',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // 日誌設定
    log_file: 'logs/nexustrade-combined.log',
    error_file: 'logs/nexustrade-error.log',
    out_file: 'logs/nexustrade-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // 重啟策略
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    
    // 監控設定
    pmx: true,
    
    // 其他選項
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }],

  deploy: {
    production: {
      user: 'deploy',
      host: ['nexustrade.com'],
      ref: 'origin/main',
      repo: 'git@github.com:Gamepig/NexusTrade.git',
      path: '/var/www/nexustrade',
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install git -y'
    }
  }
};
```

### Nginx 配置

#### nginx.conf
```nginx
upstream nexustrade_backend {
    least_conn;
    server nexustrade-app:3000 max_fails=3 fail_timeout=30s;
    # 多實例時添加更多伺服器
    # server nexustrade-app-2:3000 max_fails=3 fail_timeout=30s;
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name nexustrade.com www.nexustrade.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS 主站
server {
    listen 443 ssl http2;
    server_name nexustrade.com www.nexustrade.com;

    # SSL 設定
    ssl_certificate /etc/nginx/ssl/nexustrade.crt;
    ssl_certificate_key /etc/nginx/ssl/nexustrade.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全標頭
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip 壓縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # 靜態檔案
    location /static/ {
        alias /var/www/nexustrade/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # WebSocket 代理
    location /ws {
        proxy_pass http://nexustrade_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API 代理
    location /api/ {
        proxy_pass http://nexustrade_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超時設定
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 緩衝設定
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # SPA 路由處理
    location / {
        proxy_pass http://nexustrade_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # SPA fallback
        try_files $uri $uri/ @fallback;
    }

    location @fallback {
        proxy_pass http://nexustrade_backend;
    }

    # 健康檢查
    location /nginx-health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

## 🗄️ 資料庫設定

### MongoDB Replica Set

#### 初始化腳本 (init-replica.js)
```javascript
// Docker 容器中執行的初始化腳本
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb:27017", priority: 1 },
    // 多節點時添加
    // { _id: 1, host: "mongodb-2:27017", priority: 0.5 },
    // { _id: 2, host: "mongodb-3:27017", priority: 0.5, arbiterOnly: true }
  ]
});

// 創建應用用戶
db = db.getSiblingDB('nexustrade');
db.createUser({
  user: 'nexustrade',
  pwd: 'strong-password-here',
  roles: [
    { role: 'readWrite', db: 'nexustrade' }
  ]
});

// 創建索引
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ googleId: 1 }, { unique: true, sparse: true });
db.users.createIndex({ lineId: 1 }, { unique: true, sparse: true });

db.priceAlerts.createIndex({ userId: 1, symbol: 1 });
db.priceAlerts.createIndex({ status: 1, enabled: 1 });
db.priceAlerts.createIndex({ symbol: 1, status: 1, enabled: 1 });

console.log('✅ MongoDB Replica Set 初始化完成');
```

#### MongoDB 配置 (mongod.conf)
```yaml
# 網路設定
net:
  port: 27017
  bindIp: 0.0.0.0

# 存儲設定
storage:
  dbPath: /data/db
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      journalCompressor: snappy
      directoryForIndexes: false
    collectionConfig:
      blockCompressor: snappy
    indexConfig:
      prefixCompression: true

# 複製設定
replication:
  replSetName: rs0

# 安全設定
security:
  authorization: enabled

# 系統日誌
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
  logRotate: rename

# 進程管理
processManagement:
  timeZoneInfo: /usr/share/zoneinfo

# 操作分析
operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100
```

## 📊 監控與日誌

### 應用程式監控

#### PM2 監控
```bash
# 基本監控
pm2 status
pm2 monit

# 日誌查看
pm2 logs nexustrade-api
pm2 logs --lines 1000

# 重新載入配置
pm2 reload ecosystem.config.js --env production

# 自動重啟 (記憶體超限)
pm2 restart nexustrade-api --max-memory-restart 1G
```

#### Docker 監控
```bash
# 容器狀態
docker-compose ps

# 資源使用
docker stats

# 日誌查看
docker-compose logs -f nexustrade-app
docker-compose logs --since 1h nexustrade-app

# 容器健康檢查
docker inspect nexustrade_nexustrade-app_1 | grep -A 10 Health
```

### 系統監控工具

#### Prometheus + Grafana
```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - nexustrade-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards
    networks:
      - nexustrade-network

volumes:
  prometheus_data:
  grafana_data:
```

#### 日誌聚合 (ELK Stack)
```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.9.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - nexustrade-network

  logstash:
    image: docker.elastic.co/logstash/logstash:8.9.0
    volumes:
      - ./elk/logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch
    networks:
      - nexustrade-network

  kibana:
    image: docker.elastic.co/kibana/kibana:8.9.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
    networks:
      - nexustrade-network

volumes:
  elasticsearch_data:
```

## 🔧 維護操作

### 常用維護指令

#### 應用程式重啟
```bash
# PM2 重啟
pm2 restart nexustrade-api

# 優雅重啟 (零停機)
pm2 reload nexustrade-api

# Docker 重啟
docker-compose restart nexustrade-app

# 完整重建
docker-compose down
docker-compose up -d --build
```

#### 資料庫維護
```bash
# MongoDB 備份
mongodump --uri="mongodb://localhost:27017/nexustrade" --out=/backup/$(date +%Y%m%d_%H%M%S)

# 壓縮備份
tar -czf /backup/nexustrade_$(date +%Y%m%d_%H%M%S).tar.gz /backup/$(date +%Y%m%d_%H%M%S)

# 索引重建
mongo nexustrade --eval "db.users.reIndex(); db.priceAlerts.reIndex();"

# 清理過期警報
mongo nexustrade --eval "db.priceAlerts.deleteMany({expiresAt: {\$lt: new Date()}})"
```

#### 日誌清理
```bash
# PM2 日誌清理
pm2 flush

# Docker 日誌清理
docker system prune -f

# 應用日誌清理
find /var/log/nexustrade -name "*.log" -mtime +30 -delete

# 輪轉日誌設定
logrotate -f /etc/logrotate.d/nexustrade
```

### 緊急恢復程序

#### 應用程式故障恢復
```bash
#!/bin/bash
# emergency-recovery.sh

echo "🚨 啟動緊急恢復程序..."

# 1. 檢查系統資源
free -h
df -h
top -bn1 | head -20

# 2. 重啟應用服務
echo "🔄 重啟應用服務..."
pm2 restart nexustrade-api

# 3. 檢查資料庫連接
echo "🗄️ 檢查資料庫連接..."
mongo --eval "db.adminCommand('ping')" nexustrade

# 4. 檢查外部 API
echo "🌐 檢查外部 API..."
curl -f https://api.binance.com/api/v3/ping

# 5. 健康檢查
echo "❤️ 執行健康檢查..."
curl -f http://localhost:3000/health

echo "✅ 緊急恢復程序完成"
```

#### 資料庫故障恢復
```bash
#!/bin/bash
# db-recovery.sh

echo "🗄️ 啟動資料庫恢復程序..."

# 1. 檢查 MongoDB 狀態
systemctl status mongod

# 2. 重啟 MongoDB
sudo systemctl restart mongod

# 3. 檢查複製集狀態
mongo --eval "rs.status()" nexustrade

# 4. 檢查資料完整性
mongo --eval "db.runCommand({dbStats: 1})" nexustrade

# 5. 從備份恢復 (如需要)
# mongorestore --uri="mongodb://localhost:27017/nexustrade" /backup/latest

echo "✅ 資料庫恢復程序完成"
```

## 🔄 CI/CD 設定

### GitHub Actions

#### .github/workflows/deploy.yml
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm run test
        
      - name: Run linter
        run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
        
      - name: Login to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/nexustrade
            docker-compose pull
            docker-compose up -d --no-deps nexustrade-app
            docker system prune -f
```

### 自動部署腳本

#### deploy.sh
```bash
#!/bin/bash
# Production deployment script

set -e

PROJECT_DIR="/var/www/nexustrade"
BACKUP_DIR="/var/backups/nexustrade"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚀 開始部署 NexusTrade..."

# 1. 創建備份
echo "💾 創建資料庫備份..."
mongodump --uri="mongodb://localhost:27017/nexustrade" --out="$BACKUP_DIR/$DATE"

# 2. 拉取最新代碼
echo "📥 拉取最新代碼..."
cd $PROJECT_DIR
git fetch --all
git reset --hard origin/main

# 3. 安裝依賴
echo "📦 安裝依賴..."
npm ci --production

# 4. 運行資料庫遷移 (如有)
echo "🗄️ 運行資料庫遷移..."
# npm run migrate:up

# 5. 重新載入 PM2
echo "🔄 重新載入應用..."
pm2 reload ecosystem.config.js --env production

# 6. 健康檢查
echo "❤️ 執行健康檢查..."
sleep 10
if curl -f http://localhost:3000/health; then
  echo "✅ 部署成功！"
else
  echo "❌ 健康檢查失敗，正在回滾..."
  git reset --hard HEAD~1
  pm2 reload ecosystem.config.js --env production
  exit 1
fi

echo "🎉 部署完成！"
```

---

*本文件涵蓋了 NexusTrade 的完整部署流程，從開發到生產的各種環境配置和維護操作。*