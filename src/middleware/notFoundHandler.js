/**
 * NexusTrade 404 錯誤處理中介軟體
 * 
 * 處理未找到的路由和資源
 */

const { ApiErrorFactory } = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * 404 錯誤處理中介軟體
 */
const notFoundHandler = (req, res, next) => {
  // 記錄 404 請求
  logger.warn('404 - 路由未找到', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString()
  });

  // 建立 404 錯誤
  const error = ApiErrorFactory.notFound(
    `路由 ${req.method} ${req.originalUrl} 未找到`,
    'ROUTE_NOT_FOUND',
    {
      method: req.method,
      path: req.originalUrl,
      availableRoutes: getSuggestedRoutes(req.originalUrl)
    }
  );

  // 傳遞給錯誤處理中介軟體
  next(error);
};

/**
 * 取得建議的路由 (基於相似度)
 */
const getSuggestedRoutes = (requestedPath) => {
  const commonRoutes = [
    '/health',
    '/health/status',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/market/symbols',
    '/api/market/ticker',
    '/api/users/profile',
    '/api/notifications/rules',
    '/api/notifications/send'
  ];

  // 簡單的相似度計算
  const suggestions = commonRoutes
    .map(route => ({
      route,
      similarity: calculateSimilarity(requestedPath.toLowerCase(), route.toLowerCase())
    }))
    .filter(item => item.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)
    .map(item => item.route);

  return suggestions;
};

/**
 * 計算字串相似度 (簡化版本)
 */
const calculateSimilarity = (str1, str2) => {
  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);
  
  if (maxLen === 0) return 1;
  
  let matches = 0;
  const minLen = Math.min(len1, len2);
  
  for (let i = 0; i < minLen; i++) {
    if (str1[i] === str2[i]) {
      matches++;
    }
  }
  
  return matches / maxLen;
};

/**
 * API 專用 404 處理器
 */
const apiNotFoundHandler = (req, res, next) => {
  logger.warn('API 端點未找到', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous'
  });

  const error = ApiErrorFactory.notFound(
    `API 端點 ${req.method} ${req.originalUrl} 不存在`,
    'API_ENDPOINT_NOT_FOUND',
    {
      method: req.method,
      path: req.originalUrl,
      apiVersion: 'v1',
      documentation: '/api/docs'
    }
  );

  next(error);
};

/**
 * 靜態檔案 404 處理器
 */
const staticFileNotFoundHandler = (req, res, next) => {
  logger.warn('靜態檔案未找到', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  const error = ApiErrorFactory.notFound(
    `檔案 ${req.originalUrl} 未找到`,
    'STATIC_FILE_NOT_FOUND',
    {
      path: req.originalUrl,
      type: 'static_file'
    }
  );

  next(error);
};

module.exports = {
  notFoundHandler,
  apiNotFoundHandler,
  staticFileNotFoundHandler
};