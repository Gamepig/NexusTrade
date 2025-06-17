/**
 * NexusTrade OAuth 認證控制器
 * 
 * 處理 Google 和 LINE OAuth 認證流程
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LineStrategy = require('passport-line').Strategy;
const { generateToken, generateRefreshToken } = require('../utils/jwt');
const { MockUser } = require('./auth.controller.mock');
const { ApiErrorFactory, BusinessErrorFactory } = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * 設定 Passport 策略
 */
const configurePassport = () => {
  // 序列化使用者
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // 反序列化使用者
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await MockUser.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth 策略
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // 查找是否已有此 Google 帳戶
        let user = await MockUser.findOne({ googleId: profile.id });
        
        if (user) {
          // 更新使用者資訊
          user.profile.avatar = profile.photos?.[0]?.value || user.profile.avatar;
          user.lastLoginAt = new Date();
          await user.save();
          
          logger.logUserAction(user._id, 'oauth_login', {
            provider: 'google',
            ip: null // 在 callback 中會更新
          });
          
          return done(null, user);
        }

        // 檢查是否已有相同 email 的帳戶
        const existingUser = await MockUser.findOne({ email: profile.emails?.[0]?.value });
        if (existingUser) {
          // 連結 Google 帳戶到現有使用者
          existingUser.googleId = profile.id;
          existingUser.profile.avatar = profile.photos?.[0]?.value || existingUser.profile.avatar;
          existingUser.lastLoginAt = new Date();
          await existingUser.save();
          
          logger.logUserAction(existingUser._id, 'oauth_link', {
            provider: 'google',
            ip: null
          });
          
          return done(null, existingUser);
        }

        // 建立新使用者
        const newUser = new MockUser({
          email: profile.emails?.[0]?.value || `google_${profile.id}@example.com`,
          googleId: profile.id,
          username: profile.username || profile.displayName?.replace(/\s+/g, '').toLowerCase() || `google_user_${profile.id}`,
          profile: {
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            displayName: profile.displayName || '',
            avatar: profile.photos?.[0]?.value || ''
          },
          emailVerified: true, // Google 帳戶預設已驗證
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

        await newUser.save();

        logger.logUserAction(newUser._id, 'oauth_register', {
          provider: 'google',
          email: newUser.email,
          ip: null
        });

        return done(null, newUser);
      } catch (error) {
        logger.error('Google OAuth 錯誤', { error: error.message, profile: profile.id });
        return done(error, null);
      }
    }));
  }

  // LINE Login 策略
  if (process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET) {
    passport.use(new LineStrategy({
      channelID: process.env.LINE_CHANNEL_ID,
      channelSecret: process.env.LINE_CHANNEL_SECRET,
      callbackURL: process.env.LINE_CALLBACK_URL || '/auth/line/callback'
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // 查找是否已有此 LINE 帳戶
        let user = await MockUser.findOne({ lineId: profile.id });
        
        if (user) {
          // 更新使用者資訊
          user.profile.avatar = profile.pictureUrl || user.profile.avatar;
          user.lastLoginAt = new Date();
          await user.save();
          
          logger.logUserAction(user._id, 'oauth_login', {
            provider: 'line',
            ip: null
          });
          
          return done(null, user);
        }

        // 檢查是否已有相同 email 的帳戶（如果 LINE 提供 email）
        if (profile.email) {
          const existingUser = await MockUser.findOne({ email: profile.email });
          if (existingUser) {
            // 連結 LINE 帳戶到現有使用者
            existingUser.lineId = profile.id;
            existingUser.profile.avatar = profile.pictureUrl || existingUser.profile.avatar;
            existingUser.lastLoginAt = new Date();
            await existingUser.save();
            
            logger.logUserAction(existingUser._id, 'oauth_link', {
              provider: 'line',
              ip: null
            });
            
            return done(null, existingUser);
          }
        }

        // 建立新使用者
        const newUser = new MockUser({
          email: profile.email || `line_${profile.id}@example.com`,
          lineId: profile.id,
          username: profile.displayName?.replace(/\s+/g, '').toLowerCase() || `line_user_${profile.id}`,
          profile: {
            firstName: '',
            lastName: '',
            displayName: profile.displayName || '',
            avatar: profile.pictureUrl || ''
          },
          emailVerified: !!profile.email, // 如果 LINE 提供 email 則視為已驗證
          settings: {
            notifications: {
              email: false,
              line: true
            },
            preferences: {
              language: 'zh-TW',
              timezone: 'Asia/Taipei',
              currency: 'USD'
            }
          }
        });

        await newUser.save();

        logger.logUserAction(newUser._id, 'oauth_register', {
          provider: 'line',
          email: newUser.email,
          ip: null
        });

        return done(null, newUser);
      } catch (error) {
        logger.error('LINE OAuth 錯誤', { error: error.message, profile: profile.id });
        return done(error, null);
      }
    }));
  }
};

/**
 * Google OAuth 登入初始化
 */
const googleLogin = (req, res, next) => {
  logger.info('開始 Google OAuth 登入', { ip: req.ip });
  
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
};

/**
 * Google OAuth 回調處理
 */
const googleCallback = (req, res, next) => {
  passport.authenticate('google', { 
    failureRedirect: '/login?error=google_auth_failed',
    session: false 
  }, async (err, user, info) => {
    try {
      if (err) {
        logger.error('Google OAuth 回調錯誤', { error: err.message, ip: req.ip });
        return res.redirect('/login?error=oauth_error');
      }

      if (!user) {
        logger.warn('Google OAuth 失敗 - 無使用者', { info, ip: req.ip });
        return res.redirect('/login?error=oauth_failed');
      }

      // 更新 IP 記錄
      user.lastLoginIP = req.ip;
      await user.save();

      // 生成 JWT Token
      const token = generateToken(user, '7d');
      const refreshToken = generateRefreshToken(user, '30d');

      logger.logUserAction(user._id, 'oauth_success', {
        provider: 'google',
        email: user.email,
        ip: req.ip
      });

      // 重定向到前端，並在 URL 中帶上 token
      const redirectURL = new URL('/', req.get('origin') || 'http://localhost:3000');
      redirectURL.searchParams.set('token', token);
      redirectURL.searchParams.set('refreshToken', refreshToken);
      redirectURL.searchParams.set('oauth', 'success');
      redirectURL.searchParams.set('provider', 'google');

      res.redirect(redirectURL.toString());

    } catch (error) {
      logger.error('Google OAuth 回調處理錯誤', { error: error.message, ip: req.ip });
      res.redirect('/login?error=oauth_processing_error');
    }
  })(req, res, next);
};

/**
 * LINE Login 初始化
 */
const lineLogin = (req, res, next) => {
  logger.info('開始 LINE Login', { ip: req.ip });
  
  passport.authenticate('line', {
    scope: ['profile', 'openid', 'email']
  })(req, res, next);
};

/**
 * LINE Login 回調處理
 */
const lineCallback = (req, res, next) => {
  passport.authenticate('line', { 
    failureRedirect: '/login?error=line_auth_failed',
    session: false 
  }, async (err, user, info) => {
    try {
      if (err) {
        logger.error('LINE Login 回調錯誤', { error: err.message, ip: req.ip });
        return res.redirect('/login?error=oauth_error');
      }

      if (!user) {
        logger.warn('LINE Login 失敗 - 無使用者', { info, ip: req.ip });
        return res.redirect('/login?error=oauth_failed');
      }

      // 更新 IP 記錄
      user.lastLoginIP = req.ip;
      await user.save();

      // 生成 JWT Token
      const token = generateToken(user, '7d');
      const refreshToken = generateRefreshToken(user, '30d');

      logger.logUserAction(user._id, 'oauth_success', {
        provider: 'line',
        email: user.email,
        ip: req.ip
      });

      // 重定向到前端，並在 URL 中帶上 token
      const redirectURL = new URL('/', req.get('origin') || 'http://localhost:3000');
      redirectURL.searchParams.set('token', token);
      redirectURL.searchParams.set('refreshToken', refreshToken);
      redirectURL.searchParams.set('oauth', 'success');
      redirectURL.searchParams.set('provider', 'line');

      res.redirect(redirectURL.toString());

    } catch (error) {
      logger.error('LINE Login 回調處理錯誤', { error: error.message, ip: req.ip });
      res.redirect('/login?error=oauth_processing_error');
    }
  })(req, res, next);
};

/**
 * 連結 OAuth 帳戶到現有使用者 (需要已登入)
 */
const linkOAuthAccount = async (req, res) => {
  const { provider } = req.params;
  const userId = req.userId;

  try {
    if (!['google', 'line'].includes(provider)) {
      throw ApiErrorFactory.badRequest('不支援的 OAuth 提供者', 'UNSUPPORTED_OAUTH_PROVIDER');
    }

    const user = await MockUser.findById(userId);
    if (!user) {
      throw BusinessErrorFactory.userNotFound(userId);
    }

    // 檢查是否已經連結
    if (
      (provider === 'google' && user.googleId) ||
      (provider === 'line' && user.lineId)
    ) {
      throw ApiErrorFactory.conflict(
        `${provider.toUpperCase()} 帳戶已連結`,
        'OAUTH_ALREADY_LINKED'
      );
    }

    // 存儲待連結的使用者 ID，用於 OAuth 回調
    req.session = req.session || {};
    req.session.linkAccountUserId = userId;
    req.session.linkAccountProvider = provider;

    // 重定向到 OAuth 提供者
    if (provider === 'google') {
      return googleLogin(req, res);
    } else if (provider === 'line') {
      return lineLogin(req, res);
    }

  } catch (error) {
    logger.error('連結 OAuth 帳戶失敗', {
      userId,
      provider,
      error: error.message
    });
    throw error;
  }
};

/**
 * 取消連結 OAuth 帳戶
 */
const unlinkOAuthAccount = async (req, res) => {
  const { provider } = req.params;
  const userId = req.userId;

  try {
    if (!['google', 'line'].includes(provider)) {
      throw ApiErrorFactory.badRequest('不支援的 OAuth 提供者', 'UNSUPPORTED_OAUTH_PROVIDER');
    }

    const user = await MockUser.findById(userId);
    if (!user) {
      throw BusinessErrorFactory.userNotFound(userId);
    }

    // 檢查是否已連結
    const isLinked = 
      (provider === 'google' && user.googleId) ||
      (provider === 'line' && user.lineId);

    if (!isLinked) {
      throw ApiErrorFactory.badRequest(
        `${provider.toUpperCase()} 帳戶未連結`,
        'OAUTH_NOT_LINKED'
      );
    }

    // 檢查是否為唯一登入方式
    const hasPassword = !!user.password;
    const hasOtherOAuth = 
      (provider === 'google' && user.lineId) ||
      (provider === 'line' && user.googleId);

    if (!hasPassword && !hasOtherOAuth) {
      throw ApiErrorFactory.badRequest(
        '無法取消連結唯一的登入方式，請先設定密碼',
        'CANNOT_UNLINK_ONLY_AUTH_METHOD'
      );
    }

    // 取消連結
    if (provider === 'google') {
      user.googleId = undefined;
    } else if (provider === 'line') {
      user.lineId = undefined;
    }

    await user.save();

    logger.logUserAction(user._id, 'oauth_unlink', {
      provider,
      ip: req.ip
    });

    res.status(200).json({
      status: 'success',
      message: `${provider.toUpperCase()} 帳戶取消連結成功`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('取消連結 OAuth 帳戶失敗', {
      userId,
      provider,
      error: error.message
    });
    throw error;
  }
};

/**
 * 取得使用者的 OAuth 連結狀態
 */
const getOAuthStatus = async (req, res) => {
  try {
    const user = await MockUser.findById(req.userId);
    if (!user) {
      throw BusinessErrorFactory.userNotFound(req.userId);
    }

    const oauthStatus = {
      google: {
        linked: !!user.googleId,
        id: user.googleId || null
      },
      line: {
        linked: !!user.lineId,
        id: user.lineId || null
      }
    };

    res.status(200).json({
      status: 'success',
      message: '取得 OAuth 狀態成功',
      data: {
        oauth: oauthStatus
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('取得 OAuth 狀態失敗', {
      userId: req.userId,
      error: error.message
    });
    throw error;
  }
};

module.exports = {
  configurePassport,
  googleLogin,
  googleCallback,
  lineLogin,
  lineCallback,
  linkOAuthAccount,
  unlinkOAuthAccount,
  getOAuthStatus
};