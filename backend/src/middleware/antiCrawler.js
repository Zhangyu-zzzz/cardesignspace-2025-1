const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');

// 创建Redis客户端（如果可用且队列启用）
let redis = null;
const isQueueEnabled = process.env.QUEUE_ENABLED === 'true';

if (isQueueEnabled) {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  } catch (error) {
    console.log('Redis连接失败，使用内存存储');
  }
} else {
  console.log('🔧 开发环境：队列功能已禁用，使用内存存储');
}

// 内存存储（备用方案）
const memoryStore = new Map();

// 正常浏览器User-Agent白名单
const trustedUserAgents = [
  /mozilla/i, /chrome/i, /safari/i, /firefox/i, /edge/i, /opera/i,
  /webkit/i, /gecko/i, /trident/i, /msie/i, /chromium/i
];

// 检测恶意User-Agent - 更精确的匹配
const maliciousUserAgents = [
  // 明确的爬虫标识
  /^bot$/i, /^crawler$/i, /^spider$/i, /^scraper$/i, /^scanner$/i, /^probe$/i,
  // 命令行工具
  /^wget\//i, /^curl\//i, /^python-requests\//i, /^java\//i, /^perl\//i, /^ruby\//i, /^php\//i,
  // 恶意爬虫
  /semrushbot/i, /ahrefsbot/i, /mj12bot/i, /dotbot/i, /blexbot/i, /rogerbot/i, /exabot/i, /ia_archiver/i,
  // 自动化工具
  /^python-requests\//i, /^requests\//i, /^urllib\//i, /^mechanize\//i,
  // 扫描工具
  /^nmap/i, /^sqlmap/i, /^nikto/i, /^dirb/i, /^gobuster/i,
  // 其他恶意工具
  /^masscan/i, /^zmap/i, /^hydra/i, /^medusa/i
];

// 检测恶意IP
const maliciousIPs = new Set();

// 标准化IP地址
const normalizeIP = (ip) => {
  // 将IPv6的localhost转换为IPv4格式
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  return ip;
};

// 开发环境清空黑名单
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 开发环境：清空IP黑名单');
  maliciousIPs.clear();
}

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
  const normalizedIP = normalizeIP(req.ip);
  
  // 首先检查是否是可信的浏览器User-Agent
  const isTrusted = trustedUserAgents.some(pattern => pattern.test(userAgent));
  
  if (isTrusted) {
    // 可信浏览器，直接通过
    return next();
  }
  
  // 检查是否包含恶意标识
  const isMalicious = maliciousUserAgents.some(pattern => pattern.test(userAgent));
  
  if (isMalicious) {
    console.log('🚫 检测到恶意User-Agent:', {
      userAgent: userAgent.substring(0, 100),
      ip: normalizedIP,
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    });
    
    // 将IP加入黑名单
    maliciousIPs.add(normalizedIP);
    
    return res.status(403).json({
      error: '访问被拒绝',
      code: 'MALICIOUS_USER_AGENT'
    });
  }
  
  // 既不是可信浏览器，也不是明显的恶意工具，记录但不阻止
  if (userAgent && !isTrusted && !isMalicious) {
    console.log('⚠️ 未知User-Agent:', {
      userAgent: userAgent.substring(0, 100),
      ip: normalizedIP,
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// 检测恶意IP
const detectMaliciousIP = (req, res, next) => {
  const normalizedIP = normalizeIP(req.ip);
  
  if (maliciousIPs.has(normalizedIP)) {
    console.log('🚫 阻止恶意IP访问:', {
      ip: normalizedIP,
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
  const url = req.originalUrl;
  
  // 跳过正常的API请求
  if (url.startsWith('/api/')) {
    return next();
  }
  
  // 只检测非API路径的可疑模式
  const suspiciousPatterns = [
    /wp-admin/i, /wp-login/i, /wp-signup/i, /admin/i, /administrator/i,
    /phpmyadmin/i, /mysql/i, /database/i, /db/i, /config/i, /setup/i,
    /install/i, /test/i, /debug/i, /api-docs/i, /swagger/i
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));
  
  if (isSuspicious) {
    const normalizedIP = normalizeIP(req.ip);
    console.log('🚫 检测到可疑请求:', {
      url: url,
      ip: normalizedIP,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    // 将IP加入黑名单
    maliciousIPs.add(normalizedIP);
    
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
