#!/bin/bash
# NexusTrade 日誌查看腳本
# Namespace: NexusTrade

if [[ "$1" == "follow" ]] || [[ "$1" == "-f" ]]; then
    echo "📄 NexusTrade 即時日誌 (Namespace: NexusTrade)..."
    pm2 logs nexustrade-api --lines 100
elif [[ "$1" == "error" ]] || [[ "$1" == "-e" ]]; then
    echo "🔴 NexusTrade 錯誤日誌 (Namespace: NexusTrade)..."
    pm2 logs nexustrade-api --err --lines "${2:-50}"
else
    echo "📋 NexusTrade 日誌 (最近 ${1:-50} 行)..."
    pm2 logs nexustrade-api --lines "${1:-50}"
fi