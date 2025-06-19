/**
 * 新聞跑馬燈組件
 * 
 * 功能：
 * - 顯示最新 10 則新聞標題
 * - 自動滾動效果
 * - 點擊可跳轉到原始新聞連結
 * - 響應式設計
 */

class NewsTicker {
  constructor(container) {
    this.container = container;
    this.news = [];
    this.currentIndex = 0;
    this.intervalId = null;
    this.isAnimating = false;
    this.scrollSpeed = 3000; // 3秒切換一則新聞
    
    this.init();
  }

  async init() {
    this.createTickerHTML();
    await this.loadNews();
    this.startAnimation();
    this.setupEventListeners();
  }

  createTickerHTML() {
    this.container.innerHTML = `
      <div class="news-ticker-wrapper">
        <div class="news-ticker-label">
          <i class="news-icon">📰</i>
          <span>最新消息</span>
        </div>
        <div class="news-ticker-content">
          <div class="news-ticker-track">
            <div class="news-ticker-item loading">
              載入最新新聞中...
            </div>
          </div>
        </div>
        <div class="news-ticker-controls">
          <button class="ticker-btn ticker-prev" title="上一則新聞">‹</button>
          <button class="ticker-btn ticker-next" title="下一則新聞">›</button>
          <button class="ticker-btn ticker-pause" title="暫停/播放">⏸</button>
        </div>
      </div>
    `;

    this.track = this.container.querySelector('.news-ticker-track');
    this.prevBtn = this.container.querySelector('.ticker-prev');
    this.nextBtn = this.container.querySelector('.ticker-next');
    this.pauseBtn = this.container.querySelector('.ticker-pause');
  }

  async loadNews() {
    try {
      const response = await fetch('/api/news/latest?limit=10');
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        this.news = result.data;
        this.renderNews();
      } else {
        this.showError('暫無新聞資料');
      }
    } catch (error) {
      console.error('❌ 載入新聞失敗:', error);
      this.showError('載入新聞失敗');
    }
  }

  renderNews() {
    if (this.news.length === 0) {
      this.showError('暫無新聞資料');
      return;
    }

    console.log(`📊 跑馬燈: 渲染 ${this.news.length} 則新聞`);

    this.track.innerHTML = this.news.map((news, index) => `
      <div class="news-ticker-item ${index === 0 ? 'active' : ''}" 
           data-index="${index}" 
           data-link="${news.link}"
           data-news-id="${news.id}">
        <span class="news-time">${this.formatTime(news.publishedAt)}</span>
        <span class="news-title">${this.escapeHtml(news.title)}</span>
        <span class="news-source">[${news.source}]</span>
      </div>
    `).join('');

    // 重置當前索引
    this.currentIndex = 0;
    this.isAnimating = false;

    // 更新控制按鈕狀態
    this.updateControlButtons();
    
    console.log(`✅ 跑馬燈: 渲染完成，當前索引: ${this.currentIndex}`);
  }

  formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes}分鐘前`;
    if (hours < 24) return `${hours}小時前`;
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    this.track.innerHTML = `
      <div class="news-ticker-item error">
        <span class="error-icon">⚠️</span>
        <span>${message}</span>
      </div>
    `;
  }

  startAnimation() {
    if (this.news.length <= 1) {
      console.log('📰 跑馬燈: 新聞數量不足，無法啟動動畫 (需要 > 1 則)');
      return;
    }
    
    console.log('🎬 跑馬燈: 啟動自動滾動 (速度:', this.scrollSpeed + 'ms)');
    
    this.intervalId = setInterval(() => {
      if (!this.isAnimating) {
        console.log('⏭️ 跑馬燈: 切換到下一則新聞');
        this.nextNews();
      } else {
        console.log('⏸️ 跑馬燈: 動畫進行中，跳過這次切換');
      }
    }, this.scrollSpeed);
  }

  stopAnimation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  nextNews() {
    if (this.news.length <= 1) return;
    
    const oldIndex = this.currentIndex;
    this.currentIndex = (this.currentIndex + 1) % this.news.length;
    console.log(`🔄 跑馬燈: 從索引 ${oldIndex} 切換到 ${this.currentIndex} (共 ${this.news.length} 則新聞)`);
    this.showNews(this.currentIndex);
  }

  prevNews() {
    if (this.news.length <= 1) return;
    
    this.currentIndex = (this.currentIndex - 1 + this.news.length) % this.news.length;
    this.showNews(this.currentIndex);
  }

  showNews(index) {
    if (this.isAnimating || !this.news.length) {
      console.log('🚫 跑馬燈: 無法顯示新聞 - 動畫中或無新聞');
      return;
    }
    
    this.isAnimating = true;
    
    const items = this.track.querySelectorAll('.news-ticker-item');
    console.log(`🎯 跑馬燈: 找到 ${items.length} 個新聞項目`);
    
    // 確保索引範圍正確
    if (index < 0) index = this.news.length - 1;
    if (index >= this.news.length) index = 0;
    
    // 移除所有 active 類別
    items.forEach((item, i) => {
      item.classList.remove('active');
      console.log(`📋 移除項目 ${i} 的 active 類別`);
    });
    
    // 添加新的 active 類別
    const newItem = items[index];
    if (newItem) {
      newItem.classList.add('active');
      console.log(`✅ 為項目 ${index} 添加 active 類別:`, newItem.querySelector('.news-title')?.textContent?.substring(0, 50));
    } else {
      console.error(`❌ 找不到索引 ${index} 的新聞項目`);
    }
    
    // 更新當前索引
    this.currentIndex = index;
    
    // 動畫完成後重置標誌
    setTimeout(() => {
      this.isAnimating = false;
      console.log('🎬 跑馬燈: 動畫完成，重置標誌');
    }, 200);  // 縮短動畫時間
    
    this.updateControlButtons();
  }

  updateControlButtons() {
    if (this.news.length <= 1) {
      this.prevBtn.disabled = true;
      this.nextBtn.disabled = true;
    } else {
      this.prevBtn.disabled = false;
      this.nextBtn.disabled = false;
    }
  }

  togglePause() {
    if (this.intervalId) {
      this.stopAnimation();
      this.pauseBtn.innerHTML = '▶';
      this.pauseBtn.title = '播放';
    } else {
      this.startAnimation();
      this.pauseBtn.innerHTML = '⏸';
      this.pauseBtn.title = '暫停';
    }
  }

  setupEventListeners() {
    // 控制按鈕事件
    this.prevBtn.addEventListener('click', () => {
      this.prevNews();
    });

    this.nextBtn.addEventListener('click', () => {
      this.nextNews();
    });

    this.pauseBtn.addEventListener('click', () => {
      this.togglePause();
    });

    // 新聞項目點擊事件
    this.track.addEventListener('click', (e) => {
      const newsItem = e.target.closest('.news-ticker-item');
      if (newsItem && newsItem.dataset.link) {
        const newsId = newsItem.dataset.newsId;
        
        // 追蹤點擊
        if (newsId) {
          // 透過後端追蹤並重導向
          window.open(`/api/news/${newsId}/click`, '_blank');
        } else {
          // 直接開啟原始連結
          window.open(newsItem.dataset.link, '_blank');
        }
      }
    });

    // 滑鼠懸停時暫停動畫
    this.container.addEventListener('mouseenter', () => {
      if (this.intervalId) {
        this.stopAnimation();
      }
    });

    this.container.addEventListener('mouseleave', () => {
      if (!this.pauseBtn.innerHTML.includes('▶')) {
        this.startAnimation();
      }
    });

    // 響應式處理
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  handleResize() {
    // 在小螢幕上調整顯示
    const isMobile = window.innerWidth <= 768;
    const controls = this.container.querySelector('.news-ticker-controls');
    
    if (isMobile) {
      controls.style.display = 'none';
    } else {
      controls.style.display = 'flex';
    }
  }

  // 公開方法：重新載入新聞
  async refresh() {
    this.stopAnimation();
    await this.loadNews();
    this.currentIndex = 0;
    this.startAnimation();
  }

  // 公開方法：銷毀組件
  destroy() {
    this.stopAnimation();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// CSS 樣式
const newsTickerStyles = `
.news-ticker-wrapper {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid #0d7377;
  border-radius: 8px;
  padding: 12px 16px;
  margin: 16px 0;
  min-height: 60px;
  box-shadow: 0 2px 10px rgba(13, 115, 119, 0.2);
  overflow: hidden;
}

.news-ticker-label {
  display: flex;
  align-items: center;
  color: #14a085;
  font-weight: 600;
  margin-right: 16px;
  min-width: 90px;
  font-size: 14px;
}

.news-ticker-label .news-icon {
  margin-right: 6px;
  font-size: 16px;
}

.news-ticker-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  height: 36px;
}

.news-ticker-track {
  position: relative;
  height: 100%;
  width: 100%;
}

.news-ticker-item {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  color: #e2e8f0;
  font-size: 14px;
  line-height: 1.4;
  padding: 8px 0;
  cursor: pointer;
  transition: all 0.4s ease-in-out;
  opacity: 0;
  transform: translateY(10px);
  min-height: 36px;
  white-space: nowrap;
  overflow: hidden;
}

.news-ticker-item.active {
  opacity: 1;
  transform: translateY(0);
  z-index: 1;
}

.news-ticker-item:hover {
  color: #14a085;
}

.news-ticker-item.loading {
  color: #a0aec0;
  cursor: default;
  opacity: 1;
  transform: translateY(0);
}

.news-ticker-item.error {
  color: #f56565;
  cursor: default;
  opacity: 1;
  transform: translateY(0);
}

.news-time {
  color: #a0aec0;
  font-size: 12px;
  margin-right: 12px;
  min-width: 60px;
}

.news-title {
  flex: 1;
  margin-right: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.news-source {
  color: #14a085;
  font-size: 12px;
  font-weight: 500;
  margin-left: auto;
}

.news-ticker-controls {
  display: flex;
  align-items: center;
  margin-left: 16px;
  gap: 4px;
}

.ticker-btn {
  background: rgba(20, 160, 133, 0.1);
  border: 1px solid #14a085;
  color: #14a085;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;
}

.ticker-btn:hover:not(:disabled) {
  background: rgba(20, 160, 133, 0.2);
  transform: translateY(-1px);
}

.ticker-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-icon {
  margin-right: 8px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .news-ticker-wrapper {
    padding: 8px 12px;
    margin: 8px 0;
  }
  
  .news-ticker-label {
    min-width: 70px;
    font-size: 13px;
  }
  
  .news-ticker-item {
    font-size: 13px;
  }
  
  .news-time {
    display: none;
  }
  
  .news-ticker-controls {
    display: none;
  }
}

@media (max-width: 480px) {
  .news-ticker-wrapper {
    padding: 6px 8px;
    flex-direction: column;
    align-items: flex-start;
    min-height: auto;
  }
  
  .news-ticker-label {
    margin-right: 0;
    margin-bottom: 8px;
  }
  
  .news-ticker-content {
    width: 100%;
  }
}
`;

// 注入樣式
const styleSheet = document.createElement('style');
styleSheet.textContent = newsTickerStyles;
document.head.appendChild(styleSheet);

// 導出類別
window.NewsTicker = NewsTicker;