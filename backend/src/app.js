require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// 检查logs目录是否存在，不存在则创建
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 引入日志配置
const logger = require('./config/logger');

// 引入数据库连接
const { connectMySQL } = require('./config/mysql');

// 引入防爬虫中间件
const {
  basicLimiter,
  apiLimiter,
  loginLimiter,
  detectMaliciousUserAgent,
  detectMaliciousIP,
  detectAnomalousRequests,
  logRequests
} = require('./middleware/antiCrawler');

// 引入rate-limit
const rateLimit = require('express-rate-limit');

// 创建Express应用实例
const app = express();

// 配置CORS
const corsOptions = {
  origin: function (origin, callback) {
    // 默认允许的源列表（包含生产环境域名）
    const defaultOrigins = [
      'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:3000',
      'http://www.cardesignspace.com',
      'https://www.cardesignspace.com'
    ];
    
    // 从环境变量读取额外允许的源
    const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
    const allowedOrigins = [...defaultOrigins, ...envOrigins];
    
    // 在开发环境或生产环境中允许无origin的请求（如Postman、curl等）
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // 记录被拒绝的origin以便调试
      logger.warn(`CORS拒绝的origin: ${origin}`);
      callback(null, true); // 临时允许所有origin用于调试
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// 配置中间件
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // 增加JSON请求体大小限制到10MB
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // 增加URL编码请求体大小限制到10MB

// 应用防爬虫中间件 - 临时完全禁用
// TODO: 生产环境问题解决后重新启用
console.log('🔧 临时禁用所有防爬虫中间件（生产环境问题修复中）');

/*
if (process.env.NODE_ENV === 'production') {
  // 生产环境：启用优化的防爬虫保护
  app.use(detectMaliciousUserAgent);
  app.use(detectMaliciousIP);
  app.use(detectAnomalousRequests);
  app.use(logRequests);
  // 生产环境使用更宽松的频率限制
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 200, // 每个IP 15分钟内最多200个请求
    message: {
      error: '请求过于频繁，请稍后再试',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
  }));
  console.log('🛡️ 生产环境：防爬虫中间件已启用（优化配置）');
} else {
  // 开发环境：禁用防爬虫
  console.log('🔧 开发环境：防爬虫中间件已禁用');
}
*/

// 配置请求日志
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: '服务运行正常' });
});

// API路由（临时移除频率限制）
app.use('/api/brands', require('./routes/brandRoutes'));
app.use('/api/models', require('./routes/modelRoutes'));
app.use('/api/series', require('./routes/seriesRoutes'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/forum', require('./routes/forumRoutes'));
app.use('/api/search', require('./routes/searchRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
// 统一与去重后的路由挂载
app.use('/api/images', require('./routes/imageRoutes'));
app.use('/api/images', require('./routes/imageTagRoutes'));
app.use('/api/tags', require('./routes/tagRoutes'));
app.use('/api/curation', require('./routes/curationRoutes'));
app.use('/api/articles', require('./routes/articleRoutes'));
app.use('/api/inspiration', require('./routes/inspirationRoutes'));
app.use('/api/image-tags', require('./routes/imageTagRoutes'));
app.use('/api/image-gallery', require('./routes/imageGalleryRoutes'));
// 图片变体路由
app.use('/api/image-variants', require('./routes/imageVariantRoutes'));
// 缓存管理路由
app.use('/api/cache', require('./routes/cacheRoutes'));
// 变体后台处理器路由
app.use('/api/variant-processor', require('./routes/variantProcessorRoutes'));
// 摄取路由（特性开关控制，默认 404）
app.use('/api/ingest', require('./routes/ingestRoutes'));

// 反馈API路由
app.use('/api/feedback', require('./routes/feedback'));

// 画了个车API路由
app.use('/api/draw-car', require('./routes/vehicle'));

console.log('所有API路由已加载完成');

// 在路由之后添加全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('全局错误处理捕获到错误:', err);
  logger.error(`全局错误处理: ${err.message}\n${err.stack}`);
  
  // 特殊处理不同类型的错误
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: '请求内容过大，请减少内容大小后重试',
      error: 'Payload too large'
    });
  }
  
  if (err.name === 'PayloadTooLargeError') {
    return res.status(413).json({
      success: false,
      message: '请求内容过大，请减少内容大小后重试',
      error: 'Payload too large'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.status === 401 ? '认证失败' : '服务器内部错误',
    error: process.env.NODE_ENV === 'production' ? '内部错误' : err.message
  });
});

// 处理404
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: '未找到请求的资源'
  });
});

// 连接数据库
connectMySQL().then(() => {
  // 启动服务器
  const PORT = process.env.PORT || 3000;
  // 启动队列 Worker（受特性开关控制）
  try {
    const { bootIngestWorkers } = require('./workers/ingestWorkers');
    bootIngestWorkers();
  } catch (err) {
    console.warn('启动 ingest workers 失败（可能是未启用队列或依赖缺失）:', err && err.message);
  }

  // 启动变体后台处理器
  try {
    const variantProcessor = require('./services/variantBackgroundProcessor');
    logger.info('变体后台处理器已启动');
  } catch (err) {
    logger.error('启动变体后台处理器失败:', err);
  }
  app.listen(PORT, () => {
    logger.info(`服务器运行在端口 ${PORT}`);
    console.log(`服务器运行在端口 ${PORT}`);
  });
}).catch(err => {
  logger.error('无法启动服务器，数据库连接失败:', err);
  process.exit(1);
});

module.exports = app; 