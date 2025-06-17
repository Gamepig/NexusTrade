#!/bin/bash
# NexusTrade 狀態檢查腳本
# Namespace: NexusTrade

echo "=== NexusTrade PM2 進程狀態 (Namespace: NexusTrade) ==="
pm2 list | grep -E "(nexustrade|id.*name)"
echo ""
echo "=== NexusTrade 健康檢查 ==="
if curl -f http://localhost:3000/health >/dev/null 2>&1; then
    echo "✅ API 服務正常 (http://localhost:3000)"
    API_STATUS=$(curl -s http://localhost:3000/health | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
    echo "   狀態: $API_STATUS"
else
    echo "❌ API 服務異常 (http://localhost:3000)"
fi