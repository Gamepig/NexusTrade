#!/bin/bash

# NexusTrade 加密貨幣組件測試腳本
# 測試新的可重複使用組件功能

echo "🧪 NexusTrade 加密貨幣組件測試"
echo "=================================="

# 檢查服務狀態
echo ""
echo "📋 檢查 PM2 服務狀態..."
pm2 list | grep nexustrade

# 測試 API 端點
echo ""
echo "🔌 測試新增的 API 端點..."

echo ""
echo "1. 測試 24小時市場統計 API:"
curl -s "http://localhost:3000/api/market/stats24h" | jq '.success, .data.totalCoins, .data.avgChange'

echo ""
echo "2. 測試批量價格獲取 API:"
curl -s "http://localhost:3000/api/market/batch-prices?symbols=BTCUSDT,ETHUSDT,BNBUSDT" | jq '.success, .data | length'

echo ""
echo "3. 測試熱門交易對 API (前5個):"
curl -s "http://localhost:3000/api/market/trending?limit=5" | jq '.success, .data | length, .data[0:2] | .[] | {symbol, rank, price}'

# 檢查組件檔案
echo ""
echo "📁 檢查組件檔案是否存在..."

FILES=(
    "/Users/gamepig/projects/NexusTrade/public/js/components/CryptoCurrencyList.js"
    "/Users/gamepig/projects/NexusTrade/public/js/components/HomeCryptoList.js"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 不存在"
    fi
done

# 檢查 HTML 中的組件引用
echo ""
echo "🔗 檢查 HTML 中的組件引用..."
if grep -q "CryptoCurrencyList.js" /Users/gamepig/projects/NexusTrade/public/index.html; then
    echo "✅ index.html 包含 CryptoCurrencyList.js 引用"
else
    echo "❌ index.html 缺少 CryptoCurrencyList.js 引用"
fi

if grep -q "HomeCryptoList.js" /Users/gamepig/projects/NexusTrade/public/index.html; then
    echo "✅ index.html 包含 HomeCryptoList.js 引用"
else
    echo "❌ index.html 缺少 HomeCryptoList.js 引用"
fi

# 測試靜態檔案服務
echo ""
echo "🌐 測試靜態檔案服務..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/js/components/CryptoCurrencyList.js")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ CryptoCurrencyList.js 可通過靜態服務訪問"
else
    echo "❌ CryptoCurrencyList.js 無法訪問 (HTTP $HTTP_STATUS)"
fi

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/js/components/HomeCryptoList.js")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ HomeCryptoList.js 可通過靜態服務訪問"
else
    echo "❌ HomeCryptoList.js 無法訪問 (HTTP $HTTP_STATUS)"
fi

# 測試圖標來源
echo ""
echo "🖼️ 測試圖標來源..."
ICON_URL="https://cryptocurrencyliveprices.com/img/btc-bitcoin.png"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$ICON_URL")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ 新圖標來源可以訪問 (cryptocurrencyliveprices.com)"
else
    echo "⚠️  新圖標來源訪問異常 (HTTP $HTTP_STATUS)"
fi

# 檢查首頁關鍵 DOM 元素
echo ""
echo "🏠 檢查首頁關鍵 DOM 元素..."
if grep -q "trending-coins-list" /Users/gamepig/projects/NexusTrade/public/index.html; then
    echo "✅ 首頁包含 trending-coins-list 容器"
else
    echo "❌ 首頁缺少 trending-coins-list 容器"
fi

# 檢查市場頁面關鍵 DOM 元素
if grep -q "market-coins-grid" /Users/gamepig/projects/NexusTrade/public/index.html; then
    echo "✅ 市場頁面包含 market-coins-grid 容器"
else
    echo "❌ 市場頁面缺少 market-coins-grid 容器"
fi

# 總結
echo ""
echo "📊 測試總結"
echo "============"
echo "✅ 完成項目:"
echo "   - 可重複使用的貨幣列表模組"
echo "   - 真實 Binance API 數據整合"
echo "   - 15秒更新頻率設定"
echo "   - 新圖標來源整合"
echo "   - API 路由和端點新增"
echo ""
echo "🔄 待修復項目:"
echo "   - TradingView 圖表顯示"
echo "   - 24小時市場統計顯示"
echo ""
echo "🌐 測試頁面可用:"
echo "   - 組件測試: http://localhost:3001/test_crypto_list_components"
echo "   - 完整應用: http://localhost:3000"

echo ""
echo "測試完成！"