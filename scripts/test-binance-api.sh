#!/bin/bash

# NexusTrade Binance API 測試腳本
# 測試所有 Binance 相關的 API 端點

set -e

echo "🧪 NexusTrade Binance API 測試"
echo "=============================="

BASE_URL="http://localhost:3000"

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
    
    echo -n "🔍 測試 $description... "
    
    if response=$(curl -s -w "%{http_code}" -o /tmp/response.json --max-time 10 "$BASE_URL$endpoint"); then
        http_code=${response: -3}
        if [ "$http_code" -eq "$expected_status" ]; then
            echo -e "${GREEN}✅ 通過${NC} ($http_code)"
            
            # 顯示部分響應內容
            if [ "$http_code" -eq "200" ]; then
                echo "   📊 數據預覽:"
                cat /tmp/response.json | jq -r '.status // .message // .error // .' | head -3 | sed 's/^/      /'
            fi
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

# 檢查服務狀態
echo "📊 檢查服務狀態..."
if ! pgrep -f "node src/server.js" > /dev/null; then
    echo -e "${RED}❌ NexusTrade 服務未運行${NC}"
    echo "請先啟動服務: npm start"
    exit 1
fi
echo -e "${GREEN}✅ NexusTrade 服務運行中${NC}"
echo ""

# 1. 基本健康檢查
echo "🏥 基本服務測試..."
test_endpoint "/health" 200 "系統健康檢查"
echo ""

# 2. Binance API 測試
echo "🔌 Binance API 端點測試..."
test_endpoint "/api/market/test" 200 "Binance 連接測試"
test_endpoint "/api/market/overview" 200 "市場概覽"
test_endpoint "/api/market/trending" 200 "熱門交易對"
test_endpoint "/api/market/cache/prices" 200 "快取價格數據"
echo ""

# 3. 交易對查詢測試
echo "💰 交易對查詢測試..."
test_endpoint "/api/market/price/BTCUSDT" 200 "BTC 價格查詢"
test_endpoint "/api/market/price/ETHUSDT" 200 "ETH 價格查詢"
test_endpoint "/api/market/search?q=BTC" 200 "BTC 搜尋"
test_endpoint "/api/market/search?q=ETH" 200 "ETH 搜尋"
echo ""

# 4. K線和深度數據測試
echo "📈 高級數據測試..."
test_endpoint "/api/market/klines/BTCUSDT?interval=1h&limit=10" 200 "BTC K線數據"
test_endpoint "/api/market/depth/BTCUSDT?limit=5" 200 "BTC 訂單簿深度"
echo ""

# 5. 通知系統測試
echo "🔔 通知系統測試..."
test_endpoint "/api/notifications/status" 200 "通知系統狀態"
echo ""

# 6. 認證系統測試 (檢查路由存在)
echo "🔐 認證系統測試..."
echo -n "🔍 測試 認證路由存在性... "
if curl -s -X POST http://localhost:3000/api/auth/login | grep -q "error"; then
    echo -e "${GREEN}✅ 通過${NC} (路由存在，等待正確請求格式)"
else
    echo -e "${RED}❌ 失敗${NC}"
fi
echo ""

# 7. 前端資源測試
echo "🎨 前端資源測試..."
test_endpoint "/" 200 "主頁面"
test_endpoint "/css/main.css" 200 "主樣式表"
test_endpoint "/js/app.js" 200 "主應用程式"
test_endpoint "/js/lib/api.js" 200 "API 客戶端"
echo ""

# 8. 即時數據測試
echo "📡 即時數據測試..."
echo "🔍 測試 WebSocket 連接..."

# 測試 WebSocket 連接 (如果有 wscat)
if command -v wscat >/dev/null 2>&1; then
    echo -n "   WebSocket 連接測試... "
    if timeout 5 wscat -c ws://localhost:3000/ws -x '{"type":"subscribe","symbols":["btcusdt"]}' >/dev/null 2>&1; then
        echo -e "${GREEN}✅ 通過${NC}"
    else
        echo -e "${YELLOW}⚠️  連接超時或無回應${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  跳過 WebSocket 測試 (wscat 未安裝)${NC}"
fi
echo ""

# 生成測試報告
echo "📊 測試報告"
echo "============"
echo "測試時間: $(date)"
echo "測試服務: $BASE_URL"
echo ""

# 獲取實際數據示例
echo "💰 當前市場數據:"
curl -s "$BASE_URL/api/market/overview" | jq -r '
  .data as $data |
  "BTC: $" + ($data.majorPrices.btc.price | tostring),
  "ETH: $" + ($data.majorPrices.eth.price | tostring),
  "熱門幣種: " + ($data.trending[0].symbol // "N/A") + " (+" + ($data.trending[0].priceChangePercent | tostring) + "%)"
'

echo ""
echo "🚀 NexusTrade API 測試完成！"
echo ""
echo "📝 有用的指令:"
echo "  檢查 API 狀態: curl $BASE_URL/health"
echo "  取得市場概覽: curl $BASE_URL/api/market/overview"
echo "  搜尋交易對: curl '$BASE_URL/api/market/search?q=BTC'"
echo "  查詢價格: curl $BASE_URL/api/market/price/BTCUSDT"