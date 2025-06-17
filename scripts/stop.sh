#!/bin/bash
# NexusTrade 停止腳本
# Namespace: NexusTrade

echo "⏹️ 停止 NexusTrade (Namespace: NexusTrade)..."
pm2 stop nexustrade-api nexustrade-static 2>/dev/null || true
echo "✅ NexusTrade 已停止"