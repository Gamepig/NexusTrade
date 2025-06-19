/**
 * 下載加密貨幣圖標腳本
 * 從多個來源下載常用的加密貨幣圖標到本地
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 常用加密貨幣列表
const cryptoList = [
  { symbol: 'btc', name: 'bitcoin' },
  { symbol: 'eth', name: 'ethereum' },
  { symbol: 'bnb', name: 'binancecoin' },
  { symbol: 'ada', name: 'cardano' },
  { symbol: 'sol', name: 'solana' },
  { symbol: 'xrp', name: 'ripple' },
  { symbol: 'doge', name: 'dogecoin' },
  { symbol: 'dot', name: 'polkadot' },
  { symbol: 'avax', name: 'avalanche-2' },
  { symbol: 'matic', name: 'matic-network' },
  { symbol: 'link', name: 'chainlink' },
  { symbol: 'ltc', name: 'litecoin' },
  { symbol: 'bch', name: 'bitcoin-cash' },
  { symbol: 'uni', name: 'uniswap' },
  { symbol: 'xlm', name: 'stellar' },
  { symbol: 'etc', name: 'ethereum-classic' },
  { symbol: 'algo', name: 'algorand' },
  { symbol: 'vet', name: 'vechain' },
  { symbol: 'icp', name: 'internet-computer' },
  { symbol: 'fil', name: 'filecoin' }
];

// 圖標來源
const iconSources = [
  {
    name: 'CoinGecko',
    urlTemplate: (name) => `https://assets.coingecko.com/coins/images/1/large/${name}.png`,
    size: 'large'
  },
  {
    name: 'CryptoLogos',
    urlTemplate: (symbol) => `https://cryptologos.cc/logos/${symbol}-${symbol}-logo.png`,
    size: 'medium'
  }
];

// 確保目錄存在
const iconsDir = path.join(__dirname, 'public', 'images', 'crypto');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 下載圖標函數
async function downloadIcon(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else {
        file.close();
        fs.unlink(filePath, () => {}); // 刪除失敗的文件
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      fs.unlink(filePath, () => {}); // 刪除失敗的文件
      reject(err);
    });
  });
}

// 主要下載邏輯
async function downloadAllIcons() {
  console.log('🚀 開始下載加密貨幣圖標...');
  
  for (const crypto of cryptoList) {
    console.log(`📥 下載 ${crypto.symbol.toUpperCase()} 圖標...`);
    
    let downloaded = false;
    
    // 嘗試多個來源
    for (const source of iconSources) {
      try {
        const url = source.name === 'CoinGecko' 
          ? source.urlTemplate(crypto.name)
          : source.urlTemplate(crypto.symbol);
        
        const filePath = path.join(iconsDir, `${crypto.symbol}.png`);
        
        console.log(`  嘗試 ${source.name}: ${url}`);
        await downloadIcon(url, filePath);
        
        console.log(`  ✅ ${crypto.symbol.toUpperCase()} 下載成功 (${source.name})`);
        downloaded = true;
        break;
        
      } catch (error) {
        console.log(`  ❌ ${source.name} 失敗: ${error.message}`);
      }
    }
    
    if (!downloaded) {
      console.log(`  ⚠️ ${crypto.symbol.toUpperCase()} 所有來源都失敗`);
    }
    
    // 添加延遲避免被限制
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('🎉 圖標下載完成！');
}

// 生成圖標映射文件
function generateIconMapping() {
  const mapping = {};
  
  cryptoList.forEach(crypto => {
    const iconPath = path.join(iconsDir, `${crypto.symbol}.png`);
    if (fs.existsSync(iconPath)) {
      mapping[crypto.symbol] = `/images/crypto/${crypto.symbol}.png`;
    }
  });
  
  const mappingFile = path.join(__dirname, 'public', 'js', 'crypto-icons.js');
  const content = `// 加密貨幣圖標映射
window.CryptoIcons = ${JSON.stringify(mapping, null, 2)};`;
  
  fs.writeFileSync(mappingFile, content);
  console.log('📝 已生成圖標映射文件: crypto-icons.js');
}

// 執行下載
downloadAllIcons()
  .then(() => {
    generateIconMapping();
    console.log('✅ 所有任務完成！');
  })
  .catch((error) => {
    console.error('❌ 下載過程中發生錯誤:', error);
  });