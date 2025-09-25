const jwt = require('jsonwebtoken');
const { createRemoteJWKSet, jwtVerify } = require('jose');
const { URL } = require('url');
const { User } = require('../models/mysql');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

// 允许通过特性开关启用 OIDC
const OIDC_ENABLED = process.env.OIDC_ENABLED === 'true';
const OIDC_ISSUER = process.env.OIDC_ISSUER;
const OIDC_AUDIENCE = process.env.OIDC_AUDIENCE;
const OIDC_JWKS_URI = process.env.OIDC_JWKS_URI || (OIDC_ISSUER ? new URL('/.well-known/jwks.json', OIDC_ISSUER).toString() : undefined);

let jwks;
if (OIDC_ENABLED && OIDC_JWKS_URI) {
  try {
    jwks = createRemoteJWKSet(new URL(OIDC_JWKS_URI));
  } catch (err) {
    console.error('初始化 OIDC JWKS 失败:', err);
  }
}

async function verifyOidcToken(token) {
  if (!OIDC_ENABLED || !jwks) return null;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: OIDC_ISSUER,
      audience: OIDC_AUDIENCE
    });
    return payload;
  } catch (err) {
    return null;
  }
}

// 双通道认证：优先用现有 JWT_SECRET 校验；失败则尝试 OIDC
const dualAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: '缺少访问令牌' });
    }

    let decoded;
    // 1) 先尝试老的本地 JWT
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (_) {
      // 2) 再尝试 OIDC 验证
      decoded = await verifyOidcToken(token);
    }

    if (!decoded) {
      return res.status(401).json({ success: false, message: '无效的访问令牌' });
    }

    // 兼容两种负载：{ userId } 或 OIDC 的 sub/email
    const userId = decoded.userId || decoded.id || decoded.sub;
    let user = null;

    if (userId && String(userId).match(/^\d+$/)) {
      user = await User.findByPk(userId);
    } else if (decoded.email) {
      user = await User.findOne({ where: { email: decoded.email } });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在或未激活' });
    }
    if (user.status !== 'active') {
      return res.status(401).json({ success: false, message: '账号已被禁用' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('dualAuthenticate 失败:', error);
    return res.status(401).json({ success: false, message: '认证失败' });
  }
};

const dualOptional = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();
  try {
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (_) {
      decoded = await verifyOidcToken(token);
    }
    if (!decoded) return next();

    const userId = decoded.userId || decoded.id || decoded.sub;
    let user = null;
    if (userId && String(userId).match(/^\d+$/)) {
      user = await User.findByPk(userId);
    } else if (decoded.email) {
      user = await User.findOne({ where: { email: decoded.email } });
    }
    if (user && user.status === 'active') {
      req.user = user;
    }
  } catch (_) {
    // ignore
  }
  next();
};

module.exports = { dualAuthenticate, dualOptional };


