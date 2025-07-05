/**
 * NexusTrade 會員制度中介軟體
 * 
 * 處理會員配額檢查和權限驗證
 */

const { ApiErrorFactory, BusinessErrorFactory } = require('../utils/ApiError');
const User = require('../models/User.model');
const PriceAlert = require('../models/PriceAlert');
const logger = require('../utils/logger');

/**
 * 檢查價格警報數量配額
 */
const checkAlertQuota = async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return next(ApiErrorFactory.unauthorized('需要認證', 'AUTHENTICATION_REQUIRED'));
    }

    // 取得用戶資訊
    const user = await User.findById(userId);
    if (!user) {
      return next(BusinessErrorFactory.userNotFound(userId));
    }

    // 免費會員需要檢查配額
    if (user.membershipLevel === 'free') {
      // 查詢資料庫中實際的活躍警報數量 (排除 triggered 狀態)
      const activeAlertsCount = await PriceAlert.countDocuments({
        userId: userId,
        status: { $in: ['active', 'paused'] } // 只計算活躍和暫停的警報
      });
      
      logger.info('會員配額檢查', {
        userId,
        membershipLevel: user.membershipLevel,
        activeAlertsCount,
        limit: user.alertQuota.limit,
        excludedStatuses: ['triggered', 'expired', 'cancelled']
      });
      
      if (activeAlertsCount >= user.alertQuota.limit) {
        return res.status(403).json({
          status: 'error',
          code: 'QUOTA_EXCEEDED',
          message: '已達免費會員警報上限',
          upgradeRequired: true,
          quota: { 
            used: activeAlertsCount, 
            limit: user.alertQuota.limit,
            membershipLevel: user.membershipLevel
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    // 將用戶資訊附加到請求中
    req.user = user;
    next();

  } catch (error) {
    logger.error('檢查警報配額失敗:', error.message);
    next(error);
  }
};

/**
 * 檢查技術指標權限
 */
const checkTechnicalIndicatorPermission = async (req, res, next) => {
  try {
    const { alertType } = req.body;
    const userId = req.userId;

    // 技術指標類型清單
    const technicalIndicatorTypes = [
      'rsi_above', 'rsi_below', 'rsi_overbought', 'rsi_oversold',
      'macd_bullish_crossover', 'macd_bearish_crossover', 
      'macd_above_zero', 'macd_below_zero',
      'ma_cross_above', 'ma_cross_below', 'ma_golden_cross', 'ma_death_cross',
      'ma_support_bounce', 'ma_resistance_reject',
      'bb_upper_touch', 'bb_lower_touch', 'bb_squeeze', 'bb_expansion',
      'bb_middle_cross', 'bb_bandwidth_alert',
      'williams_overbought', 'williams_oversold', 'williams_above', 'williams_below'
    ];

    // 如果不是技術指標警報，直接通過
    if (!technicalIndicatorTypes.includes(alertType)) {
      return next();
    }

    // 取得用戶資訊
    const user = req.user || await User.findById(userId);
    if (!user) {
      return next(BusinessErrorFactory.userNotFound(userId));
    }

    // 檢查用戶是否有技術指標權限
    if (!user.premiumFeatures.technicalIndicators) {
      return res.status(403).json({
        status: 'error',
        code: 'PREMIUM_FEATURE_REQUIRED',
        message: '技術指標警報需要付費會員',
        upgradeRequired: true,
        feature: {
          name: '技術指標警報',
          type: 'technical_indicators',
          membershipRequired: 'premium'
        },
        currentMembership: user.membershipLevel,
        timestamp: new Date().toISOString()
      });
    }

    // 權限檢查通過
    req.user = user;
    next();

  } catch (error) {
    logger.error('檢查技術指標權限失敗:', error.message);
    next(error);
  }
};

/**
 * 檢查會員級別權限
 */
const requireMembership = (requiredLevel) => {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      const user = req.user || await User.findById(userId);

      if (!user) {
        return next(BusinessErrorFactory.userNotFound(userId));
      }

      const membershipLevels = {
        'free': 0,
        'premium': 1,
        'enterprise': 2
      };

      const userLevel = membershipLevels[user.membershipLevel] || 0;
      const requiredLevelValue = membershipLevels[requiredLevel] || 1;

      if (userLevel < requiredLevelValue) {
        return res.status(403).json({
          status: 'error',
          code: 'INSUFFICIENT_MEMBERSHIP',
          message: `此功能需要 ${requiredLevel} 會員`,
          upgradeRequired: true,
          currentLevel: user.membershipLevel,
          requiredLevel: requiredLevel,
          timestamp: new Date().toISOString()
        });
      }

      req.user = user;
      next();

    } catch (error) {
      logger.error('檢查會員級別權限失敗:', error.message);
      next(error);
    }
  };
};

/**
 * 更新用戶警報配額使用量
 */
const updateAlertQuotaUsage = async (userId, increment = 1) => {
  try {
    const user = await User.findById(userId);
    if (user) {
      user.alertQuota.used = Math.max(0, user.alertQuota.used + increment);
      await user.save();
      
      logger.info(`用戶警報配額更新:`, {
        userId,
        used: user.alertQuota.used,
        limit: user.alertQuota.limit,
        increment
      });
      
      return user.alertQuota;
    }
    return null;
  } catch (error) {
    logger.error('更新警報配額失敗:', error.message);
    return null;
  }
};

/**
 * 取得用戶會員資訊
 */
const getMembershipInfo = async (req, res, next) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return next(BusinessErrorFactory.userNotFound(userId));
    }

    const membershipInfo = {
      level: user.membershipLevel,
      expiry: user.membershipExpiry,
      alertQuota: user.alertQuota,
      premiumFeatures: user.premiumFeatures,
      isActive: user.membershipLevel !== 'free' && 
                (!user.membershipExpiry || new Date() < new Date(user.membershipExpiry))
    };

    res.status(200).json({
      status: 'success',
      message: '取得會員資訊成功',
      data: {
        membership: membershipInfo
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('取得會員資訊失敗:', error.message);
    next(error);
  }
};

/**
 * 模擬會員升級 (開發用)
 */
const simulateUpgrade = async (req, res) => {
  try {
    const userId = req.userId;
    const { targetLevel = 'premium' } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: '使用者不存在',
        timestamp: new Date().toISOString()
      });
    }

    // 更新會員級別
    user.membershipLevel = targetLevel;
    user.membershipExpiry = targetLevel !== 'free' ? 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null; // 30天
    user.alertQuota.limit = user.getMembershipLimit(targetLevel);
    user.premiumFeatures = {
      technicalIndicators: targetLevel !== 'free',
      unlimitedAlerts: targetLevel !== 'free',
      prioritySupport: targetLevel === 'enterprise'
    };

    await user.save();

    logger.info(`模擬會員升級:`, {
      userId,
      fromLevel: 'free',
      toLevel: targetLevel,
      expiry: user.membershipExpiry
    });

    res.status(200).json({
      status: 'success',
      message: `成功升級到 ${targetLevel} 會員 (模擬)`,
      data: {
        membershipLevel: user.membershipLevel,
        membershipExpiry: user.membershipExpiry,
        alertQuota: user.alertQuota,
        premiumFeatures: user.premiumFeatures
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('模擬會員升級失敗:', error.message);
    res.status(500).json({
      status: 'error',
      message: '升級失敗',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  checkAlertQuota,
  checkTechnicalIndicatorPermission,
  requireMembership,
  updateAlertQuotaUsage,
  getMembershipInfo,
  simulateUpgrade
};