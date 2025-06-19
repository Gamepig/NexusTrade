/**
 * 加密貨幣圖標映射和工具函數
 * 使用本地圖標和文字後備方案
 */

// 加密貨幣圖標映射
window.CryptoIcons = {
  'btc': '/images/crypto/btc.png'
};

// 加密貨幣顏色映射
window.CryptoColors = {
  'btc': '#f7931a',
  'eth': '#627eea', 
  'bnb': '#f0b90b',
  'ada': '#0033ad',
  'sol': '#9945ff',
  'xrp': '#00aae4',
  'doge': '#c2a633',
  'dot': '#e6007a',
  'avax': '#e84142',
  'matic': '#8247e5',
  'link': '#375bd2',
  'ltc': '#bfbbbb',
  'bch': '#8dc351',
  'uni': '#ff007a',
  'xlm': '#7d00ff',
  'usdc': '#2775ca',
  'usdt': '#26a17b',
  'fdusd': '#f0b90b',
  'sui': '#4da2ff',
  'pepe': '#4caf50',
  'trx': '#ff0013',
  'ton': '#0088cc',
  'shib': '#ffa409',
  'near': '#00c08b',
  'icp': '#f15a24'
};

// 獲取加密貨幣圖標 HTML - 純文字版本，不使用背景圖片
window.getCryptoIcon = function(symbol, size = 32) {
  const baseSymbol = symbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '').toLowerCase();
  const color = window.CryptoColors[baseSymbol] || '#666666';
  
  // 使用純文字圖標，避免破圖問題
  return `<div class="crypto-icon-text" style="
    width: ${size}px; 
    height: ${size}px; 
    background: ${color}; 
    color: white; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    border-radius: 50%; 
    font-weight: bold; 
    font-size: ${Math.floor(size * 0.35)}px;
    border: 2px solid rgba(255,255,255,0.2);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  ">${baseSymbol.substring(0, 3).toUpperCase()}</div>`;
};