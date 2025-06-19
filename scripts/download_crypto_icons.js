/**
 * 從 CryptoLogos.cc 下載加密貨幣圖標到本地
 * 支援批量下載和自動重試機制
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 設定下載目錄
const DOWNLOAD_DIR = path.join(__dirname, '../public/images/crypto');
const ICONS_MAP_FILE = path.join(__dirname, '../public/js/crypto-icons-map.js');

// 常見的加密貨幣清單（優先下載）
const CRYPTO_LIST = [
  // 主要貨幣
  'bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano', 'ripple',
  'dogecoin', 'polkadot', 'avalanche-2', 'polygon', 'chainlink', 'litecoin',
  
  // 穩定幣
  'tether', 'usd-coin', 'binance-usd', 'first-digital-usd', 'dai',
  
  // DeFi 和新興幣
  'uniswap', 'sui', 'pepe', 'tron', 'the-open-network', 'shiba-inu',
  'near', 'internet-computer', 'stellar', 'bitcoin-cash', 'ethereum-classic',
  
  // 其他熱門
  'cosmos', 'filecoin', 'hedera', 'vechain', 'theta', 'algorand',
  'elrond-erd-2', 'tezos', 'iota', 'eos', 'maker', 'compound',
  'aave', 'synthetix', 'yearn-finance', 'curve-dao-token'
];

// 符號映射（CryptoLogos ID 到交易符號）
const SYMBOL_MAPPING = {
  'bitcoin': 'btc',
  'ethereum': 'eth',
  'binancecoin': 'bnb', 
  'solana': 'sol',
  'cardano': 'ada',
  'ripple': 'xrp',
  'dogecoin': 'doge',
  'polkadot': 'dot',
  'avalanche-2': 'avax',
  'polygon': 'matic',
  'chainlink': 'link',
  'litecoin': 'ltc',
  'tether': 'usdt',
  'usd-coin': 'usdc',
  'binance-usd': 'busd',
  'first-digital-usd': 'fdusd',
  'dai': 'dai',
  'uniswap': 'uni',
  'sui': 'sui',
  'pepe': 'pepe',
  'tron': 'trx',
  'the-open-network': 'ton',
  'shiba-inu': 'shib',
  'near': 'near',
  'internet-computer': 'icp',
  'stellar': 'xlm',
  'bitcoin-cash': 'bch',
  'ethereum-classic': 'etc',
  'cosmos': 'atom',
  'filecoin': 'fil',
  'hedera': 'hbar',
  'vechain': 'vet',
  'theta': 'theta',
  'algorand': 'algo',
  'elrond-erd-2': 'egld',
  'tezos': 'xtz',
  'iota': 'miota',
  'eos': 'eos',
  'maker': 'mkr',
  'compound': 'comp',
  'aave': 'aave',
  'synthetix': 'snx',
  'yearn-finance': 'yfi',
  'curve-dao-token': 'crv'
};

class CryptoIconDownloader {
  constructor() {
    this.downloadStats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0
    };
    this.iconMapping = {};
    this.ensureDirectoryExists();
  }

  ensureDirectoryExists() {
    if (!fs.existsSync(DOWNLOAD_DIR)) {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
      console.log(`📁 創建目錄: ${DOWNLOAD_DIR}`);
    }
  }

  /**
   * 下載單個圖標
   */
  async downloadIcon(cryptoId, symbol, size = 64, retries = 3) {
    const fileName = `${symbol}.png`;
    const filePath = path.join(DOWNLOAD_DIR, fileName);
    
    // 檢查文件是否已存在
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  跳過 ${symbol} (已存在)`);
      this.downloadStats.skipped++;
      this.iconMapping[symbol] = `/images/crypto/${fileName}`;
      return true;
    }

    // 嘗試多個不同的圖標來源
    const iconUrls = [
      `https://cryptologos.cc/logos/${cryptoId}-${symbol}-logo.png`,
      `https://cryptologos.cc/logos/${cryptoId}-logo.png`,
      `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`,
      `https://coin-images.coingecko.com/coins/images/1/large/${cryptoId}.png`
    ];

    for (let attempt = 0; attempt < retries; attempt++) {
      for (const url of iconUrls) {
        try {
          const success = await this.downloadFromUrl(url, filePath);
          if (success) {
            console.log(`✅ 下載成功: ${symbol} (${url})`);
            this.downloadStats.success++;
            this.iconMapping[symbol] = `/images/crypto/${fileName}`;
            return true;
          }
        } catch (error) {
          console.log(`⚠️  URL失敗: ${url} - ${error.message}`);
        }
      }
      
      if (attempt < retries - 1) {
        console.log(`🔄 重試 ${symbol} (第 ${attempt + 2} 次)`);
        await this.delay(1000); // 等待1秒再重試
      }
    }

    console.log(`❌ 下載失敗: ${symbol} (已嘗試所有URL)`);
    this.downloadStats.failed++;
    return false;
  }

  /**
   * 從指定URL下載文件
   */
  downloadFromUrl(url, filePath) {
    return new Promise((resolve, reject) => {
      const request = https.get(url, (response) => {
        // 檢查HTTP狀態碼
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        // 檢查內容類型
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.startsWith('image/')) {
          reject(new Error(`無效的內容類型: ${contentType}`));
          return;
        }

        // 創建文件寫入流
        const fileStream = fs.createWriteStream(filePath);
        
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          // 檢查文件大小
          const stats = fs.statSync(filePath);
          if (stats.size < 100) { // 小於100字節可能是錯誤頁面
            fs.unlinkSync(filePath);
            reject(new Error('文件太小，可能下載失敗'));
          } else {
            resolve(true);
          }
        });

        fileStream.on('error', (error) => {
          fs.unlink(filePath, () => {}); // 刪除部分下載的文件
          reject(error);
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.setTimeout(10000, () => {
        request.abort();
        reject(new Error('請求超時'));
      });
    });
  }

  /**
   * 延遲執行
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 批量下載所有圖標
   */
  async downloadAll() {
    console.log(`🚀 開始下載 ${CRYPTO_LIST.length} 個加密貨幣圖標...`);
    console.log(`📁 下載目錄: ${DOWNLOAD_DIR}`);
    
    this.downloadStats.total = CRYPTO_LIST.length;

    for (let i = 0; i < CRYPTO_LIST.length; i++) {
      const cryptoId = CRYPTO_LIST[i];
      const symbol = SYMBOL_MAPPING[cryptoId];
      
      if (!symbol) {
        console.log(`⚠️  跳過 ${cryptoId} (無符號映射)`);
        this.downloadStats.skipped++;
        continue;
      }

      console.log(`📥 [${i + 1}/${CRYPTO_LIST.length}] 下載: ${symbol.toUpperCase()}`);
      
      try {
        await this.downloadIcon(cryptoId, symbol);
        // 下載間隔，避免觸發速率限制
        await this.delay(500);
      } catch (error) {
        console.error(`❌ 下載 ${symbol} 時發生錯誤:`, error.message);
        this.downloadStats.failed++;
      }
    }

    this.generateIconMapping();
    this.printStats();
  }

  /**
   * 生成圖標映射文件
   */
  generateIconMapping() {
    const iconMapContent = `/**
 * 加密貨幣圖標映射文件
 * 自動生成於 ${new Date().toISOString()}
 * 包含 ${Object.keys(this.iconMapping).length} 個本地圖標
 */

// 本地圖標映射
window.CryptoIconsLocal = ${JSON.stringify(this.iconMapping, null, 2)};

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
    return \`<img src="\${localIcon}" alt="\${baseSymbol.toUpperCase()}" width="\${size}" height="\${size}" class="crypto-icon" style="border-radius: 50%; background: white; padding: 2px;">\`;
  } else {
    // 使用純文字圖標作為後備
    return \`<div class="crypto-icon-text" style="
      width: \${size}px; 
      height: \${size}px; 
      background: \${color}; 
      color: white; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      border-radius: 50%; 
      font-weight: bold; 
      font-size: \${Math.floor(size * 0.35)}px;
      border: 2px solid rgba(255,255,255,0.2);
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">\${baseSymbol.substring(0, 3).toUpperCase()}</div>\`;
  }
};
`;

    fs.writeFileSync(ICONS_MAP_FILE, iconMapContent);
    console.log(`📝 圖標映射文件已生成: ${ICONS_MAP_FILE}`);
  }

  /**
   * 顯示下載統計
   */
  printStats() {
    console.log('\n📊 下載統計:');
    console.log(`總計: ${this.downloadStats.total}`);
    console.log(`✅ 成功: ${this.downloadStats.success}`);
    console.log(`⏭️  跳過: ${this.downloadStats.skipped}`);
    console.log(`❌ 失敗: ${this.downloadStats.failed}`);
    console.log(`📁 本地圖標: ${Object.keys(this.iconMapping).length} 個`);
    
    const successRate = ((this.downloadStats.success + this.downloadStats.skipped) / this.downloadStats.total * 100).toFixed(1);
    console.log(`\n🎯 覆蓋率: ${successRate}%`);
    
    if (this.downloadStats.failed > 0) {
      console.log('\n⚠️  部分圖標下載失敗，將使用文字圖標作為後備');
    }
  }
}

// 執行下載
async function main() {
  console.log('🏗️  CryptoLogos.cc 圖標下載工具');
  console.log('===============================');
  
  const downloader = new CryptoIconDownloader();
  await downloader.downloadAll();
  
  console.log('\n🎉 下載完成！');
  console.log('\n使用方式:');
  console.log('1. 將 crypto-icons-map.js 引入到 HTML 頁面');
  console.log('2. 使用 window.getCryptoIcon(symbol, size) 函數顯示圖標');
}

// 如果直接執行此腳本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = CryptoIconDownloader;