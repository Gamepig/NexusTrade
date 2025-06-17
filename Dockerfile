# NexusTrade Dockerfile
# 多階段建置以最佳化映像大小和安全性

# ========================
# Stage 1: Build Stage
# ========================
FROM node:20-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 建立非 root 使用者
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nexus -u 1001

# 複製 package 檔案
COPY package*.json ./

# 安裝生產依賴
RUN npm ci --only=production --silent && \
    npm cache clean --force

# ========================
# Stage 2: Production Stage
# ========================
FROM node:20-alpine AS production

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=3000

# 安裝 dumb-init 以處理信號
RUN apk add --no-cache dumb-init

# 建立應用程式目錄
WORKDIR /app

# 建立非 root 使用者
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nexus -u 1001

# 從 builder 階段複製 node_modules
COPY --from=builder --chown=nexus:nodejs /app/node_modules ./node_modules

# 複製應用程式檔案
COPY --chown=nexus:nodejs . .

# 建立日誌目錄
RUN mkdir -p logs && \
    chown -R nexus:nodejs logs

# 設定檔案權限
RUN chmod +x scripts/*.sh || true

# 切換到非 root 使用者
USER nexus

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:$PORT/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# 暴露端口
EXPOSE 3000

# 啟動應用程式
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]