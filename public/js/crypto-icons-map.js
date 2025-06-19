/**
 * 加密貨幣圖標映射文件
 * 自動生成於 2025-06-19T09:53:47.316Z
 * 包含 43 個本地圖標
 */

// 本地圖標映射
window.CryptoIconsLocal = {
  "btc": "/images/crypto/btc.png",
  "eth": "/images/crypto/eth.png",
  "bnb": "/images/crypto/bnb.png",
  "sol": "/images/crypto/sol.png",
  "ada": "/images/crypto/ada.png",
  "xrp": "/images/crypto/xrp.png",
  "doge": "/images/crypto/doge.png",
  "dot": "/images/crypto/dot.png",
  "avax": "/images/crypto/avax.png",
  "matic": "/images/crypto/matic.png",
  "link": "/images/crypto/link.png",
  "ltc": "/images/crypto/ltc.png",
  "usdt": "/images/crypto/usdt.png",
  "usdc": "/images/crypto/usdc.png",
  "busd": "/images/crypto/busd.png",
  "fdusd": "/images/crypto/fdusd.png",
  "dai": "/images/crypto/dai.png",
  "uni": "/images/crypto/uni.png",
  "sui": "/images/crypto/sui.png",
  "pepe": "/images/crypto/pepe.png",
  "trx": "/images/crypto/trx.png",
  "ton": "/images/crypto/ton.png",
  "shib": "/images/crypto/shib.png",
  "near": "/images/crypto/near.png",
  "icp": "/images/crypto/icp.png",
  "xlm": "/images/crypto/xlm.png",
  "bch": "/images/crypto/bch.png",
  "etc": "/images/crypto/etc.png",
  "atom": "/images/crypto/atom.png",
  "fil": "/images/crypto/fil.png",
  "hbar": "/images/crypto/hbar.png",
  "vet": "/images/crypto/vet.png",
  "theta": "/images/crypto/theta.png",
  "algo": "/images/crypto/algo.png",
  "egld": "/images/crypto/egld.png",
  "xtz": "/images/crypto/xtz.png",
  "miota": "/images/crypto/miota.png",
  "eos": "/images/crypto/eos.png",
  "mkr": "/images/crypto/mkr.png",
  "comp": "/images/crypto/comp.png",
  "aave": "/images/crypto/aave.png",
  "snx": "/images/crypto/snx.png",
  "crv": "/images/crypto/crv.png"
};

// 加密貨幣顏色映射 (保持原有)
window.CryptoColors = {
  'btc': '#f7931a', 'eth': '#627eea', 'bnb': '#f0b90b', 'ada': '#0033ad',
  'sol': '#9945ff', 'xrp': '#00aae4', 'doge': '#c2a633', 'dot': '#e6007a',
  'avax': '#e84142', 'matic': '#8247e5', 'link': '#375bd2', 'ltc': '#bfbbbb',
  'bch': '#8dc351', 'uni': '#ff007a', 'xlm': '#7d00ff', 'usdc': '#2775ca',
  'usdt': '#26a17b', 'fdusd': '#f0b90b', 'sui': '#4da2ff', 'pepe': '#4caf50',
  'trx': '#ff0013', 'ton': '#0088cc', 'shib': '#ffa409', 'near': '#00c08b',
  'icp': '#f15a24', 'busd': '#f0b90b', 'dai': '#f5ac37', 'etc': '#4ea29a',
  'atom': '#2e3148', 'fil': '#0090ff', 'hbar': '#000000', 'vet': '#15bdff',
  'theta': '#2ab8e6', 'algo': '#000000', 'egld': '#1b46c2', 'xtz': '#2c7df7',
  'miota': '#131f37', 'eos': '#443f54', 'mkr': '#1aab9b', 'comp': '#00d395',
  'aave': '#b6509e', 'snx': '#5fcec7', 'yfi': '#006ae3', 'crv': '#f5f5f5'
};

// 獲取加密貨幣圖標 HTML - 優先使用本地圖標
window.getCryptoIcon = function(symbol, size = 32) {
  const baseSymbol = symbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '').toLowerCase();
  const localIcon = window.CryptoIconsLocal[baseSymbol];
  const color = window.CryptoColors[baseSymbol] || '#666666';
  
  if (localIcon) {
    // 使用本地圖標
    return `<img src="${localIcon}" alt="${baseSymbol.toUpperCase()}" width="${size}" height="${size}" class="crypto-icon" style="border-radius: 50%; background: white; padding: 2px;">`;
  } else {
    // 使用純文字圖標作為後備
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
  }
};
