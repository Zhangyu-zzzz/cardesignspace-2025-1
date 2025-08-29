const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');

// 创建Redis客户端（如果可用）
let redis = null;
try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
} catch (error) {
  console.log('Redis连接失败，使用内存存储');
}

// 内存存储（备用方案）
const memoryStore = new Map();

// 检测恶意User-Agent
const maliciousUserAgents = [
  /bot/i, /crawler/i, /spider/i, /scraper/i, /scanner/i, /probe/i,
  /wget/i, /curl/i, /python/i, /java/i, /perl/i, /ruby/i, /php/i,
  /asp/i, /jsp/i, /semrush/i, /ahrefs/i, /mj12bot/i, /dotbot/i,
  /blexbot/i, /rogerbot/i, /exabot/i, /ia_archiver/i
];

// 检测恶意IP
const maliciousIPs = new Set();

// 基础频率限制
const basicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: {
    error: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redis ? undefined : undefined // 使用默认内存存储
});

// API频率限制
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 50, // 限制每个IP 15分钟内最多50个API请求
  message: {
    error: 'API请求过于频繁，请稍后再试',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 登录频率限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 限制每个IP 15分钟内最多5次登录尝试
  message: {
    error: '登录尝试过于频繁，请15分钟后再试',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 检测恶意User-Agent
const detectMaliciousUserAgent = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  
  // 检查是否包含恶意标识
  const isMalicious = maliciousUserAgents.some(pattern => pattern.test(userAgent));
  
  if (isMalicious) {
    console.log('🚫 检测到恶意User-Agent:', {
      userAgent: userAgent.substring(0, 100),
      ip: req.ip,
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    });
    
    // 将IP加入黑名单
    maliciousIPs.add(req.ip);
    
    return res.status(403).json({
      error: '访问被拒绝',
      code: 'MALICIOUS_USER_AGENT'
    });
  }
  
  next();
};

// 检测恶意IP
const detectMaliciousIP = (req, res, next) => {
  if (maliciousIPs.has(req.ip)) {
    console.log('🚫 阻止恶意IP访问:', {
      ip: req.ip,
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      error: 'IP已被封禁',
      code: 'IP_BANNED'
    });
  }
  
  next();
};

// 检测异常请求模式
const detectAnomalousRequests = (req, res, next) => {
  const suspiciousPatterns = [
    /wp-admin/i, /wp-login/i, /wp-signup/i, /admin/i, /administrator/i,
    /phpmyadmin/i, /mysql/i, /database/i, /db/i, /config/i, /setup/i,
    /install/i, /test/i, /debug/i, /api-docs/i, /swagger/i
  ];
  
  const url = req.originalUrl;
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));
  
  if (isSuspicious) {
    console.log('🚫 检测到可疑请求:', {
      url: url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    // 将IP加入黑名单
    maliciousIPs.add(req.ip);
    
    return res.status(403).json({
      error: '访问被拒绝',
      code: 'SUSPICIOUS_REQUEST'
    });
  }
  
  next();
};

// 请求日志记录
const logRequests = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: duration,
      timestamp: new Date().toISOString()
    };
    
    // 记录异常请求
    if (res.statusCode >= 400 || duration > 5000) {
      console.log('⚠️ 异常请求:', logData);
    }
  });
  
  next();
};

module.exports = {
  basicLimiter,
  apiLimiter,
  loginLimiter,
  detectMaliciousUserAgent,
  detectMaliciousIP,
  detectAnomalousRequests,
  logRequests
};
