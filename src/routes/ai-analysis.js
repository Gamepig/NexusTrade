/**
 * AI 分析路由
 * 
 * 處理所有 AI 分析相關的路由
 */

const express = require('express');
const router = express.Router();
const aiAnalysisController = require('../controllers/ai-analysis.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { body, query } = require('express-validator');

/**
 * 獲取 AI 服務狀態
 * GET /api/ai/status
 */
router.get('/status', aiAnalysisController.getStatus);

/**
 * 趨勢分析
 * POST /api/ai/trend-analysis
 */
router.post('/trend-analysis', 
  authenticateToken,
  [
    body('symbol')
      .notEmpty()
      .withMessage('交易對代號不能為空')
      .isString()
      .withMessage('交易對代號必須是字串')
      .toUpperCase(),
    body('timeframe')
      .optional()
      .isIn(['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'])
      .withMessage('無效的時間框架')
  ],
  validateRequest,
  aiAnalysisController.analyzeTrend
);

/**
 * 技術指標分析
 * POST /api/ai/technical-analysis
 */
router.post('/technical-analysis',
  authenticateToken,
  [
    body('symbol')
      .notEmpty()
      .withMessage('交易對代號不能為空')
      .isString()
      .withMessage('交易對代號必須是字串')
      .toUpperCase(),
    body('timeframe')
      .optional()
      .isIn(['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'])
      .withMessage('無效的時間框架')
  ],
  validateRequest,
  aiAnalysisController.analyzeTechnicalIndicators
);

/**
 * 投資建議生成
 * POST /api/ai/investment-advice
 */
router.post('/investment-advice',
  authenticateToken,
  [
    body('symbol')
      .notEmpty()
      .withMessage('交易對代號不能為空')
      .isString()
      .withMessage('交易對代號必須是字串')
      .toUpperCase(),
    body('riskLevel')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('風險等級必須是 low, medium 或 high'),
    body('investmentHorizon')
      .optional()
      .isIn(['short', 'medium', 'long'])
      .withMessage('投資期限必須是 short, medium 或 long')
  ],
  validateRequest,
  aiAnalysisController.generateInvestmentAdvice
);

/**
 * 風險評估
 * POST /api/ai/risk-assessment
 */
router.post('/risk-assessment',
  authenticateToken,
  [
    body('symbol')
      .notEmpty()
      .withMessage('交易對代號不能為空')
      .isString()
      .withMessage('交易對代號必須是字串')
      .toUpperCase(),
    body('portfolioData')
      .optional()
      .isObject()
      .withMessage('投資組合數據必須是物件')
  ],
  validateRequest,
  aiAnalysisController.assessRisk
);

/**
 * 綜合分析報告
 * POST /api/ai/comprehensive-analysis
 */
router.post('/comprehensive-analysis',
  authenticateToken,
  [
    body('symbol')
      .notEmpty()
      .withMessage('交易對代號不能為空')
      .isString()
      .withMessage('交易對代號必須是字串')
      .toUpperCase(),
    body('timeframe')
      .optional()
      .isIn(['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'])
      .withMessage('無效的時間框架'),
    body('riskLevel')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('風險等級必須是 low, medium 或 high'),
    body('investmentHorizon')
      .optional()
      .isIn(['short', 'medium', 'long'])
      .withMessage('投資期限必須是 short, medium 或 long'),
    body('includeRisk')
      .optional()
      .isBoolean()
      .withMessage('includeRisk 必須是布林值')
  ],
  validateRequest,
  aiAnalysisController.generateComprehensiveAnalysis
);

/**
 * 批量分析 (暫時註釋，待實現)
 * POST /api/ai/batch-analysis
 */
/* 
router.post('/batch-analysis',
  authenticateToken,
  [
    body('symbols')
      .isArray({ min: 1, max: 10 })
      .withMessage('symbols 必須是包含 1-10 個元素的陣列'),
    body('symbols.*')
      .isString()
      .withMessage('每個交易對代號必須是字串')
      .toUpperCase(),
    body('analysisType')
      .optional()
      .isIn(['trend', 'technical', 'risk'])
      .withMessage('分析類型必須是 trend, technical 或 risk'),
    body('timeframe')
      .optional()
      .isIn(['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'])
      .withMessage('無效的時間框架'),
    body('maxConcurrent')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('maxConcurrent 必須是 1-5 之間的整數')
  ],
  validateRequest,
  aiAnalysisController.batchAnalysis
);
*/

/**
 * 清理快取
 * DELETE /api/ai/cache
 */
router.delete('/cache',
  authenticateToken,
  aiAnalysisController.clearCache
);

/**
 * 獲取首頁大趨勢分析 (新架構)
 * GET /api/ai/homepage-analysis
 */
router.get('/homepage-analysis', 
  aiAnalysisController.getHomepageAnalysis
);

/**
 * 強制重新分析首頁
 * POST /api/ai/homepage-analysis/refresh
 */
router.post('/homepage-analysis/refresh',
  authenticateToken,
  aiAnalysisController.refreshHomepageAnalysis
);

/**
 * 獲取單一貨幣分析 (新架構)
 * GET /api/ai/currency-analysis/:symbol
 */
router.get('/currency-analysis/:symbol',
  [
    require('express-validator').param('symbol')
      .notEmpty()
      .withMessage('交易對代號不能為空')
      .isString()
      .withMessage('交易對代號必須是字串')
      .toUpperCase()
  ],
  aiAnalysisController.getCurrencyAnalysis
);

/**
 * 強制重新分析單一貨幣
 * POST /api/ai/currency-analysis/:symbol/refresh
 */
router.post('/currency-analysis/:symbol/refresh',
  authenticateToken,
  [
    require('express-validator').param('symbol')
      .notEmpty()
      .withMessage('交易對代號不能為空')
      .isString()
      .withMessage('交易對代號必須是字串')
      .toUpperCase()
  ],
  aiAnalysisController.refreshCurrencyAnalysis
);

module.exports = router;