/**
 * 新聞頁面組件
 * 
 * 功能：
 * - 卡片式響應式新聞顯示
 * - 分頁載入
 * - 搜尋功能
 * - 分類篩選
 * - 滾動式載入
 */

class NewsPage {
  constructor() {
    this.currentPage = 1;
    this.totalPages = 1;
    this.newsPerPage = 10;
    this.currentCategory = 'all';
    this.currentSearch = '';
    this.isLoading = false;
    this.isLoadMoreMode = true; // 預設滾動載入模式
    
    this.newsGrid = null;
    this.pagination = null;
    this.loadMore = null;
    
    this.init();
  }

  init() {
    console.log('🏗️ 初始化 NewsPage 組件...');
    
    // 延遲執行，確保DOM已經載入和頁面已切換
    setTimeout(() => {
      this.initializeDOM();
    }, 100);
  }

  initializeDOM() {
    this.newsGrid = document.getElementById('news-grid');
    this.pagination = document.getElementById('news-pagination');
    this.loadMore = document.getElementById('load-more');
    
    console.log('🎯 DOM 元素:', {
      newsGrid: !!this.newsGrid,
      pagination: !!this.pagination,
      loadMore: !!this.loadMore
    });
    
    if (!this.newsGrid) {
      console.error('❌ 找不到 news-grid 元素，稍後重試...');
      // 重試機制
      setTimeout(() => {
        this.initializeDOM();
      }, 500);
      return;
    }
    
    this.setupEventListeners();
    this.loadNews();
  }

  setupEventListeners() {
    // 搜尋功能
    const searchInput = document.getElementById('news-search');
    const searchBtn = document.getElementById('search-btn');
    
    searchBtn.addEventListener('click', () => {
      this.performSearch();
    });
    
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });
    
    // 清除搜尋 (ESC 鍵)
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        this.currentSearch = '';
        this.resetAndLoadNews();
      }
    });

    // 分類篩選
    const categorySelect = document.getElementById('news-category');
    categorySelect.addEventListener('change', (e) => {
      this.currentCategory = e.target.value;
      this.resetAndLoadNews();
    });

    // 重新整理按鈕
    const refreshBtn = document.getElementById('refresh-news');
    refreshBtn.addEventListener('click', () => {
      this.refreshNews();
    });

    // 分頁控制
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    prevBtn.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.loadNews();
      }
    });
    
    nextBtn.addEventListener('click', () => {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.loadNews();
      }
    });

    // 載入更多按鈕
    const loadMoreBtn = document.getElementById('load-more-btn');
    loadMoreBtn.addEventListener('click', () => {
      this.loadMoreNews();
    });

    // 滾動檢測 (無限滾動)
    window.addEventListener('scroll', () => {
      if (this.isLoadMoreMode && !this.isLoading) {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        if (scrollTop + clientHeight >= scrollHeight - 1000) {
          this.loadMoreNews();
        }
      }
    });

    // 初始化為滾動載入模式
    this.setLoadMoreMode();
  }

  setLoadMoreMode() {
    // 隱藏分頁控制
    if (this.pagination) {
      this.pagination.style.display = 'none';
    }
    
    // 顯示滾動載入按鈕
    if (this.loadMore) {
      this.loadMore.style.display = 'block';
    }
  }

  async performSearch() {
    const searchInput = document.getElementById('news-search');
    this.currentSearch = searchInput.value.trim();
    this.resetAndLoadNews();
  }

  resetAndLoadNews() {
    this.currentPage = 1;
    this.newsGrid.innerHTML = this.getLoadingHTML();
    this.loadNews();
  }

  async loadNews() {
    if (this.isLoading) return;
    
    console.log('🔄 載入新聞中...', { page: this.currentPage, category: this.currentCategory });
    
    this.isLoading = true;
    this.updateLoadingState(true);
    
    try {
      let url = `/api/news?limit=${this.newsPerPage}&page=${this.currentPage}`;
      
      if (this.currentCategory !== 'all') {
        url += `&category=${this.currentCategory}`;
      }
      
      // 如果有搜尋關鍵字，使用搜尋 API
      if (this.currentSearch) {
        url = `/api/news/search?q=${encodeURIComponent(this.currentSearch)}&limit=${this.newsPerPage}&page=${this.currentPage}`;
      }
      
      console.log('📡 請求 URL:', url);
      
      const response = await fetch(url);
      console.log('📡 回應狀態:', response.status);
      
      const result = await response.json();
      console.log('📡 API 回應:', result);
      
      if (result.success) {
        // 使用 API 返回的分頁資訊，如果沒有則模擬
        const pagination = result.pagination || {
          currentPage: this.currentPage,
          totalPages: Math.ceil(100 / this.newsPerPage),
          hasNextPage: result.data.length === this.newsPerPage,
          hasPrevPage: this.currentPage > 1
        };
        
        // 更新總頁數
        this.totalPages = pagination.totalPages;
        
        console.log('✅ 渲染新聞:', result.data.length, '則, 分頁:', pagination);
        this.renderNews(result.data, pagination);
        this.updatePagination(pagination);
      } else {
        console.error('❌ API 返回錯誤:', result);
        this.showError('載入新聞失敗: ' + (result.message || '未知錯誤'));
      }
    } catch (error) {
      console.error('❌ 載入新聞異常:', error);
      this.showError('載入新聞失敗，請稍後再試: ' + error.message);
    } finally {
      this.isLoading = false;
      this.updateLoadingState(false);
    }
  }

  async loadMoreNews() {
    if (this.isLoading || this.currentPage >= this.totalPages) return;
    
    this.currentPage++;
    this.isLoading = true;
    
    const loadMoreBtn = document.getElementById('load-more-btn');
    const originalText = loadMoreBtn.textContent;
    loadMoreBtn.textContent = '載入中...';
    loadMoreBtn.disabled = true;
    
    try {
      let url = `/api/news?limit=${this.newsPerPage}&page=${this.currentPage}`;
      
      if (this.currentCategory !== 'all') {
        url += `&category=${this.currentCategory}`;
      }
      
      if (this.currentSearch) {
        url = `/api/news/search?q=${encodeURIComponent(this.currentSearch)}&limit=${this.newsPerPage}&page=${this.currentPage}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        // 使用 API 返回的分頁資訊
        const pagination = result.pagination || {
          currentPage: this.currentPage,
          totalPages: Math.ceil(100 / this.newsPerPage),
          hasNextPage: result.data.length === this.newsPerPage,
          hasPrevPage: this.currentPage > 1
        };
        
        // 更新總頁數
        this.totalPages = pagination.totalPages;
        
        console.log('✅ 載入更多新聞:', result.data.length, '則, 分頁:', pagination);
        this.appendNews(result.data, pagination);
        this.updateLoadMoreButton(pagination);
      } else {
        this.currentPage--; // 回復頁數
        console.error('載入更多新聞失敗:', result.message || '未知錯誤');
      }
    } catch (error) {
      this.currentPage--; // 回復頁數
      console.error('❌ 載入更多新聞失敗:', error);
    } finally {
      this.isLoading = false;
      loadMoreBtn.textContent = originalText;
      loadMoreBtn.disabled = false;
    }
  }

  async refreshNews() {
    try {
      // 重新整理快取
      await fetch('/api/news/refresh', { method: 'POST' });
      
      // 重新載入新聞
      this.resetAndLoadNews();
      
      // 顯示成功提示
      if (window.store) {
        window.store.dispatch({
          type: 'UI_SHOW_NOTIFICATION',
          payload: {
            type: 'success',
            message: '新聞已重新整理'
          }
        });
      }
    } catch (error) {
      console.error('❌ 重新整理新聞失敗:', error);
      this.showError('重新整理失敗');
    }
  }

  renderNews(newsArray, pagination) {
    if (!newsArray || newsArray.length === 0) {
      this.newsGrid.innerHTML = `
        <div class="no-news">
          <div class="no-news-icon">📰</div>
          <h3>暫無新聞</h3>
          <p>目前沒有符合條件的新聞，請稍後再試</p>
        </div>
      `;
      return;
    }

    this.newsGrid.innerHTML = newsArray.map(news => this.createNewsCard(news)).join('');
    this.totalPages = pagination.totalPages;
  }

  appendNews(newsArray, pagination) {
    if (!newsArray || newsArray.length === 0) return;
    
    const loadingElement = this.newsGrid.querySelector('.news-loading');
    if (loadingElement) {
      loadingElement.remove();
    }
    
    const newsHTML = newsArray.map(news => this.createNewsCard(news)).join('');
    this.newsGrid.insertAdjacentHTML('beforeend', newsHTML);
    this.totalPages = pagination.totalPages;
  }

  createNewsCard(news) {
    const timeAgo = this.getTimeAgo(news.publishedAt);
    const hasImage = news.imageUrl && news.imageUrl !== 'null';
    
    return `
      <article class="news-card" data-news-id="${news.id}">
        <div class="news-image">
          <img src="${hasImage ? news.imageUrl : '/images/news-placeholder.svg'}" 
               alt="${this.escapeHtml(news.title)}"
               loading="lazy"
               onerror="this.src='/images/news-placeholder.svg'">
        </div>
        
        <div class="news-content">
          <div class="news-meta">
            <span class="news-source">${news.source}</span>
            <span class="news-time">${timeAgo}</span>
          </div>
          
          <h3 class="news-title">
            <a href="${news.link}" 
               target="_blank" 
               rel="noopener noreferrer"
               onclick="this.closest('.news-card').classList.add('visited')">
              ${this.escapeHtml(news.title)}
            </a>
          </h3>
          
          ${news.description ? `
            <p class="news-description">
              ${this.escapeHtml(news.description)}
            </p>
          ` : ''}
          
          <div class="news-actions">
            <a href="${news.link}" 
               target="_blank" 
               rel="noopener noreferrer"
               class="read-more-btn"
               onclick="this.closest('.news-card').classList.add('visited')">
              閱讀全文 →
            </a>
            <div class="news-tags">
              ${this.renderPriorityBadge(news.sourcePriority)}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  renderPriorityBadge(priority) {
    const badges = {
      1: '<span class="priority-badge high">重要</span>',
      2: '<span class="priority-badge medium">一般</span>',
      3: '<span class="priority-badge low">參考</span>'
    };
    
    return badges[priority] || badges[2];
  }

  getTimeAgo(dateString) {
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

  updatePagination(pagination) {
    if (!pagination) return;
    
    this.totalPages = pagination.totalPages;
    
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    
    prevBtn.disabled = !pagination.hasPrevPage;
    nextBtn.disabled = !pagination.hasNextPage;
    pageInfo.textContent = `第 ${pagination.currentPage} / ${pagination.totalPages} 頁`;
    
    if (this.isLoadMoreMode) {
      this.updateLoadMoreButton(pagination);
    }
  }

  updateLoadMoreButton(pagination) {
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    if (pagination.hasNextPage) {
      this.loadMore.style.display = 'block';
      loadMoreBtn.disabled = false;
    } else {
      this.loadMore.style.display = 'none';
    }
  }

  updateLoadingState(isLoading) {
    const refreshBtn = document.getElementById('refresh-news');
    
    if (isLoading) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = '載入中...';
    } else {
      refreshBtn.disabled = false;
      refreshBtn.textContent = '重新整理';
    }
  }

  getLoadingHTML() {
    return `
      <div class="news-loading">
        <div class="loading-spinner"></div>
        <p>載入新聞中...</p>
      </div>
    `;
  }

  showError(message) {
    this.newsGrid.innerHTML = `
      <div class="news-error">
        <div class="error-icon">⚠️</div>
        <h3>載入失敗</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="newsPage.loadNews()">重試</button>
      </div>
    `;
  }

  // 公開方法：銷毀組件
  destroy() {
    // 移除事件監聽器等清理工作
    window.removeEventListener('scroll', this.scrollHandler);
  }
}

// 導出類別
window.NewsPage = NewsPage;