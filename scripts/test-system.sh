#!/bin/bash

# NexusTrade 系統整合測試腳本
# 自動化測試所有核心功能

set -e

echo "🚀 NexusTrade 系統整合測試"
echo "=========================="

BASE_URL="http://localhost:3000"
TIMEOUT=30

# 顏色設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 測試函數
test_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    local description=$3
    
    echo -n "  測試 $endpoint... "
    
    if response=$(curl -s -w "%{http_code}" -o /tmp/response.json --max-time $TIMEOUT "$BASE_URL$endpoint"); then
        http_code=${response: -3}
        if [ "$http_code" -eq "$expected_status" ]; then
            echo -e "${GREEN}✅ 通過${NC} ($http_code)"
            return 0
        else
            echo -e "${RED}❌ 失敗${NC} (期望: $expected_status, 實際: $http_code)"
            return 1
        fi
    else
        echo -e "${RED}❌ 連接失敗${NC}"
        return 1
    fi
}

# 檢查服務是否運行
check_service() {
    echo "📊 檢查服務狀態..."
    
    if ! pgrep -f "src/server.js" > /dev/null; then
        echo -e "${RED}❌ NexusTrade 服務未運行${NC}"
        echo "請先啟動服務: npm start 或 pm2 start nexustrade-api"
        exit 1
    fi
    
    echo -e "${GREEN}✅ NexusTrade 服務運行中${NC}"
}

# 基本健康檢查
test_health() {
    echo ""
    echo "🏥 健康檢查測試..."
    test_endpoint "/health" 200 "基本健康檢查"
}

# API 端點測試
test_apis() {
    echo ""
    echo "🔌 API 端點測試..."
    
    # 通知系統
    test_endpoint "/api/notifications/status" 200 "通知系統狀態"
    
    # 市場數據
    test_endpoint "/api/market/symbols" 200 "市場交易對列表"
    test_endpoint "/api/market/ticker" 200 "即時價格數據"
    
    # 認證系統
    test_endpoint "/api/auth/login" 405 "登入端點 (方法檢查)"
    test_endpoint "/api/auth/register" 405 "註冊端點 (方法檢查)"
}

# 前端資源測試
test_frontend() {
    echo ""
    echo "🎨 前端資源測試..."
    
    test_endpoint "/" 200 "主頁面"
    test_endpoint "/css/main.css" 200 "主樣式表"
    test_endpoint "/js/app.js" 200 "主應用程式"
    test_endpoint "/js/lib/api.js" 200 "API 客戶端"
    test_endpoint "/js/lib/router.js" 200 "路由系統"
    test_endpoint "/js/state/store.js" 200 "狀態管理"
}

# WebSocket 測試
test_websocket() {
    echo ""
    echo "🔌 WebSocket 測試..."
    
    # 簡單的 WebSocket 連接測試
    if command -v wscat >/dev/null 2>&1; then
        echo -n "  測試 WebSocket 連接... "
        if timeout 5 wscat -c ws://localhost:3000/ws -x '{"type":"ping"}' >/dev/null 2>&1; then
            echo -e "${GREEN}✅ 通過${NC}"
        else
            echo -e "${YELLOW}⚠️  無法測試 (連接超時)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  跳過 WebSocket 測試 (wscat 未安裝)${NC}"
    fi
}

# 性能測試
test_performance() {
    echo ""
    echo "⚡ 性能測試..."
    
    echo -n "  測試 API 回應時間... "
    total_time=$(curl -w "%{time_total}" -s -o /dev/null "$BASE_URL/health")
    
    if (( $(echo "$total_time < 0.5" | bc -l) )); then
        echo -e "${GREEN}✅ 優秀${NC} (${total_time}s)"
    elif (( $(echo "$total_time < 1.0" | bc -l) )); then
        echo -e "${YELLOW}⚠️  可接受${NC} (${total_time}s)"
    else
        echo -e "${RED}❌ 需要優化${NC} (${total_time}s)"
    fi
}

# 生成測試報告
generate_report() {
    echo ""
    echo "📊 測試報告"
    echo "============"
    echo "測試時間: $(date)"
    echo "測試服務: $BASE_URL"
    echo ""
    
    # 系統資訊
    echo "📋 系統資訊:"
    echo "- Node.js: $(node --version)"
    echo "- npm: $(npm --version)"
    echo "- 作業系統: $(uname -s)"
    echo ""
    
    # 服務狀態
    echo "🚀 服務狀態:"
    if pgrep -f "src/server.js" > /dev/null; then
        echo "- NexusTrade API: ✅ 運行中"
    else
        echo "- NexusTrade API: ❌ 停止"
    fi
    
    if pgrep -f "mongod" > /dev/null; then
        echo "- MongoDB: ✅ 運行中"
    else
        echo "- MongoDB: ⚠️  未檢測到"
    fi
    
    if pgrep -f "redis-server" > /dev/null; then
        echo "- Redis: ✅ 運行中"
    else
        echo "- Redis: ⚠️  未檢測到"
    fi
    
    echo ""
    echo "✅ 系統整合測試完成"
}

# 主要測試流程
main() {
    echo "開始時間: $(date)"
    echo ""
    
    # 檢查必要工具
    if ! command -v curl >/dev/null 2>&1; then
        echo -e "${RED}❌ curl 未安裝${NC}"
        exit 1
    fi
    
    if ! command -v bc >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  bc 未安裝，跳過性能測試${NC}"
    fi
    
    # 執行測試
    check_service
    test_health
    test_apis
    test_frontend
    test_websocket
    
    if command -v bc >/dev/null 2>&1; then
        test_performance
    fi
    
    generate_report
}

# 執行主流程
main "$@"