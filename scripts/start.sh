#!/bin/bash
# NexusTrade 啟動腳本
# Namespace: NexusTrade

cd "$(dirname "$0")/.."
echo "🚀 啟動 NexusTrade (Namespace: NexusTrade)..."
pm2 start ecosystem.config.js
pm2 save
echo "✅ NexusTrade 已啟動並保存 PM2 配置"