/**
 * NexusTrade 通知系統路由
 * 
 * 處理價格警報和 AI 分析訂閱相關的路由
 */

const express = require('express');
const priceAlertController = require('../controllers/price-alert.controller');
const { validatePriceAlert, validatePriceAlertUpdate } = require('../middleware/validation.middleware');
const { authenticateToken } = require('../middleware/auth.middleware');
const { 
  checkAlertQuota, 
  checkTechnicalIndicatorPermission,
  getMembershipInfo 
} = require('../middleware/membership.middleware');

const router = express.Router();

/**
 * 價格警報管理路由
 */

// 建立價格警報 (整合會員制度檢查)
router.post('/alerts', 
  authenticateToken,
  validatePriceAlert,
  checkAlertQuota,
  checkTechnicalIndicatorPermission,
  priceAlertController.createAlert
);

// 取得使用者的警報清單
router.get('/alerts', authenticateToken, priceAlertController.getUserAlerts);

// 取得特定貨幣的警報
router.get('/alerts/:symbol', authenticateToken, priceAlertController.getSymbolAlerts);

// 更新價格警報
router.put('/alerts/:id', authenticateToken, validatePriceAlertUpdate, priceAlertController.updateAlert);

// 刪除價格警報
router.delete('/alerts/:id', authenticateToken, priceAlertController.deleteAlert);

/**
 * 通知測試路由
 */

// 測試通知發送
router.post('/test', authenticateToken, priceAlertController.testNotification);

/**
 * 會員制度路由
 */

// 取得會員資訊
router.get('/membership', authenticateToken, getMembershipInfo);

/**
 * 統計和狀態路由
 */

// 取得警報統計
router.get('/stats', async (req, res) => {
  try {
    const PriceAlert = require('../models/PriceAlert');
    const userId = req.userId || 'mock_user_001';
    
    const stats = await PriceAlert.getAlertStats(userId);
    const subscribedSymbols = await PriceAlert.getAISubscribedSymbols();
    
    // 計算統計數據
    const totalAlerts = stats.reduce((sum, stat) => sum + stat.count, 0);
    const activeAlerts = stats.find(s => s._id === 'active')?.count || 0;
    const triggeredAlerts = stats.find(s => s._id === 'triggered')?.count || 0;
    
    res.json({
      status: 'success',
      data: {
        totalAlerts,
        activeAlerts,
        triggeredAlerts,
        aiSubscribedSymbols: subscribedSymbols.length,
        breakdown: stats
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '取得統計資料失敗'
    });
  }
});

module.exports = router;