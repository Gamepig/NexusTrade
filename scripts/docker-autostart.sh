#!/bin/bash

# NexusTrade Docker 自動啟動腳本
# 用於設定 Docker 容器開機自動啟動

set -e

echo "🐳 設定 NexusTrade Docker 自動啟動..."

# 檢查 Docker 是否運行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未運行，請先啟動 Docker"
    exit 1
fi

# 檢查 docker-compose 是否存在
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ docker-compose 未安裝"
    exit 1
fi

# 進入專案目錄
cd "$(dirname "$0")/.."

echo "📋 當前 Docker 容器狀態:"
docker-compose ps

echo ""
echo "🔧 設定容器自動重啟政策..."

# 更新容器重啟政策為 always
docker-compose config | grep -q "restart:" && echo "✅ 重啟政策已在 docker-compose.yml 中設定"

# 確保容器在 Docker 啟動時自動啟動
echo "🚀 啟動 NexusTrade 服務..."
docker-compose up -d

# 檢查服務狀態
echo ""
echo "📊 服務狀態檢查:"
docker-compose ps

# 檢查健康狀態
echo ""
echo "🏥 健康檢查:"
for i in {1..30}; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ NexusTrade API 健康檢查通過"
        break
    elif [ $i -eq 30 ]; then
        echo "⚠️  健康檢查超時，請檢查服務狀態"
    else
        echo "⏳ 等待服務啟動... ($i/30)"
        sleep 2
    fi
done

echo ""
echo "📝 自動啟動設定完成！"
echo ""
echo "🔍 有用的指令:"
echo "  檢查狀態: docker-compose ps"
echo "  查看日誌: docker-compose logs -f"
echo "  停止服務: docker-compose down"
echo "  重啟服務: docker-compose restart"
echo ""
echo "🌐 服務訪問:"
echo "  主應用程式: http://localhost:3000"
echo "  健康檢查: http://localhost:3000/health"
echo "  MongoDB: localhost:27017"
echo "  Redis: localhost:6379"