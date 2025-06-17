/**
 * NexusTrade 認證控制器
 * 
 * 處理所有認證相關的業務邏輯
 */

const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const { ApiErrorFactory, BusinessErrorFactory, ValidationErrorFactory } = require('../utils/ApiError');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

/**
 * 使用者註冊
 */
const register = async (req, res) => {
  const { email, password, username, firstName, lastName } = req.body;

  try {
    // 驗證必填欄位
    if (!email || !password) {
      throw ValidationErrorFactory.missingRequiredFields(['email', 'password']);
    }

    // 檢查信箱是否已被使用
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw BusinessErrorFactory.userAlreadyExists(email);
    }

    // 檢查使用者名稱是否已被使用
    if (username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        throw BusinessErrorFactory.usernameAlreadyExists(username);
      }
    }

    // 建立新使用者
    const user = new User({
      email: email.toLowerCase(),
      password, // Mongoose pre-save hook 會處理密碼雜湊
      username: username || email.split('@')[0],
      profile: {
        firstName: firstName || '',
        lastName: lastName || '',
        displayName: firstName && lastName ? `${firstName} ${lastName}` : username || email.split('@')[0]
      },
      settings: {
        notifications: {
          email: true,
          line: false
        },
        preferences: {
          language: 'zh-TW',
          timezone: 'Asia/Taipei',
          currency: 'USD'
        }
      }
    });

    await user.save();

    // 產生 JWT Token
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // 記錄註冊事件
    logger.logUserAction(user._id, 'register', {
      email: user.email,
      method: 'email_password',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // 回傳使用者資料 (不包含敏感資訊)
    const userResponse = {
      id: user._id,
      email: user.email,
      username: user.username,
      profile: user.profile,
      emailVerified: user.emailVerified,
      status: user.status,
      createdAt: user.createdAt
    };

    res.status(201).json({
      status: 'success',
      message: '使用者註冊成功',
      data: {
        user: userResponse,
        token,
        refreshToken,
        expiresIn: '7d'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('使用者註冊失敗', {
      email,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * 使用者登入
 */
const login = async (req, res) => {
  const { email, password, remember = false } = req.body;

  try {
    // 驗證必填欄位
    if (!email || !password) {
      throw ValidationErrorFactory.missingRequiredFields(['email', 'password']);
    }

    // 查找使用者
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw BusinessErrorFactory.invalidCredentials();
    }

    // 檢查帳戶狀態
    if (user.status !== 'active') {
      throw BusinessErrorFactory.accountDisabled();
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // 記錄失敗的登入嘗試
      logger.logUserAction(user._id, 'login_failed', {
        email: user.email,
        reason: 'invalid_password',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      throw BusinessErrorFactory.invalidCredentials();
    }

    // 更新最後登入時間
    user.lastLoginAt = new Date();
    user.lastLoginIP = req.ip;
    await user.save();

    // 產生 JWT Token
    const tokenExpiry = remember ? '30d' : '7d';
    const token = generateToken(user, tokenExpiry);
    const refreshToken = generateRefreshToken(user, '30d');

    // 記錄成功登入
    logger.logUserAction(user._id, 'login_success', {
      email: user.email,
      method: 'email_password',
      remember,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // 回傳使用者資料
    const userResponse = {
      id: user._id,
      email: user.email,
      username: user.username,
      profile: user.profile,
      emailVerified: user.emailVerified,
      status: user.status,
      lastLoginAt: user.lastLoginAt
    };

    res.status(200).json({
      status: 'success',
      message: '登入成功',
      data: {
        user: userResponse,
        token,
        refreshToken,
        expiresIn: tokenExpiry
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('使用者登入失敗', {
      email,
      error: error.message,
      ip: req.ip
    });
    throw error;
  }
};

/**
 * 使用者登出
 */
const logout = async (req, res) => {
  try {
    const userId = req.userId;
    const token = req.token;

    // 記錄登出事件
    if (userId) {
      logger.logUserAction(userId, 'logout', {
        method: 'manual',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    // TODO: 將 Token 加入黑名單 (未來實現)
    // 目前 JWT 是無狀態的，只能等待 Token 過期

    res.status(200).json({
      status: 'success',
      message: '登出成功',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('使用者登出失敗', {
      userId: req.userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * 刷新 Token
 */
const refresh = async (req, res) => {
  const { refreshToken } = req.body;

  try {
    if (!refreshToken) {
      throw ValidationErrorFactory.missingRequiredFields(['refreshToken']);
    }

    // 驗證刷新 Token
    const user = await verifyRefreshToken(refreshToken);

    // 產生新的 Token
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // 記錄 Token 刷新
    logger.logUserAction(user._id, 'token_refresh', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      status: 'success',
      message: 'Token 刷新成功',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: '7d'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Token 刷新失敗', {
      error: error.message,
      ip: req.ip
    });
    throw ApiErrorFactory.unauthorized('刷新 Token 無效或已過期', 'REFRESH_TOKEN_INVALID');
  }
};

/**
 * 驗證 Token
 */
const verify = async (req, res) => {
  try {
    // Token 已在中介軟體中驗證，req.user 已設定
    const user = req.user;

    if (!user) {
      throw ApiErrorFactory.unauthorized('無效的 Token', 'INVALID_TOKEN');
    }

    const userResponse = {
      id: user._id,
      email: user.email,
      username: user.username,
      profile: user.profile,
      emailVerified: user.emailVerified,
      status: user.status,
      lastLoginAt: user.lastLoginAt
    };

    res.status(200).json({
      status: 'success',
      message: 'Token 驗證成功',
      data: {
        user: userResponse,
        tokenValid: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Token 驗證失敗', {
      error: error.message,
      ip: req.ip
    });
    throw error;
  }
};

/**
 * 取得當前使用者資訊
 */
const getMe = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      throw ApiErrorFactory.unauthorized('需要認證', 'AUTHENTICATION_REQUIRED');
    }

    // 取得完整的使用者資料
    const fullUser = await User.findById(user._id).populate('watchlist.items');

    const userResponse = {
      id: fullUser._id,
      email: fullUser.email,
      username: fullUser.username,
      profile: fullUser.profile,
      emailVerified: fullUser.emailVerified,
      status: fullUser.status,
      settings: fullUser.settings,
      watchlist: fullUser.watchlist,
      createdAt: fullUser.createdAt,
      lastLoginAt: fullUser.lastLoginAt,
      accountStats: {
        notificationRulesCount: fullUser.notificationRules?.length || 0,
        watchlistCount: fullUser.watchlist?.items?.length || 0
      }
    };

    res.status(200).json({
      status: 'success',
      message: '取得使用者資訊成功',
      data: {
        user: userResponse
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('取得使用者資訊失敗', {
      userId: req.userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * 更改密碼
 */
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // 驗證必填欄位
    if (!currentPassword || !newPassword) {
      throw ValidationErrorFactory.missingRequiredFields(['currentPassword', 'newPassword']);
    }

    const user = await User.findById(req.userId).select('+password');
    if (!user) {
      throw BusinessErrorFactory.userNotFound(req.userId);
    }

    // 驗證當前密碼
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw BusinessErrorFactory.invalidCredentials('當前密碼不正確');
    }

    // 檢查新密碼是否與當前密碼相同
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw ValidationErrorFactory.invalidInput('新密碼不能與當前密碼相同');
    }

    // 更新密碼
    user.password = newPassword; // Mongoose pre-save hook 會處理雜湊
    user.passwordChangedAt = new Date();
    await user.save();

    // 記錄密碼變更
    logger.logUserAction(user._id, 'password_change', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      status: 'success',
      message: '密碼更改成功',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('更改密碼失敗', {
      userId: req.userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * 忘記密碼 (發送重設郵件)
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      throw ValidationErrorFactory.missingRequiredFields(['email']);
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    // 無論使用者是否存在，都回傳成功訊息 (安全考量)
    // 但只有存在的使用者才會真正收到郵件

    if (user && user.status === 'active') {
      // TODO: 實現郵件發送功能
      // 產生重設 Token，設定過期時間，發送郵件

      logger.logUserAction(user._id, 'password_reset_request', {
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    res.status(200).json({
      status: 'success',
      message: '如果該信箱存在，將會收到密碼重設郵件',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('忘記密碼處理失敗', {
      email,
      error: error.message
    });
    throw error;
  }
};

/**
 * 重設密碼
 */
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || !newPassword) {
      throw ValidationErrorFactory.missingRequiredFields(['token', 'newPassword']);
    }

    // TODO: 實現密碼重設邏輯
    // 驗證重設 Token，更新密碼

    res.status(501).json({
      status: 'error',
      message: '密碼重設功能尚未完全實現',
      code: 'NOT_IMPLEMENTED',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('重設密碼失敗', {
      error: error.message
    });
    throw error;
  }
};

module.exports = {
  register,
  login,
  logout,
  refresh,
  verify,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword
};