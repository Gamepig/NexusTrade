const express = require('express');
const router = express.Router();
const newsController = require('../controllers/news.controller');

// 獲取最新新聞 (跑馬燈用)
router.get('/latest', newsController.getLatestNews);

// 分頁獲取新聞
router.get('/', newsController.getNews);

// 搜尋新聞
router.get('/search', newsController.searchNews);

// 獲取新聞來源列表
router.get('/sources', newsController.getNewsSources);

// 重新整理新聞快取
router.post('/refresh', newsController.refreshNews);

// 獲取新聞統計資訊
router.get('/stats', newsController.getNewsStats);

// 新聞點擊追蹤 (重導向到原始連結)
router.get('/:newsId/click', newsController.trackNewsClick);

module.exports = router;