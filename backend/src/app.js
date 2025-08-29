require('dotenv').config();
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

// 创建Express应用实例
const app = express();

// 配置CORS
const corsOptions = {
  origin: function (origin, callback) {
    // 默认允许的源列表（包含生产环境域名）
    const defaultOrigins = [
      'http://localhost:8080',
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

// 应用防爬虫中间件 - 开发环境临时禁用
if (process.env.NODE_ENV !== 'development') {
  app.use(detectMaliciousUserAgent);
  app.use(detectMaliciousIP);
  app.use(detectAnomalousRequests);
  app.use(logRequests);
  app.use(basicLimiter);
} else {
  console.log('🔧 开发环境：防爬虫中间件已禁用');
}

// 配置请求日志
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: '服务运行正常' });
});

// API路由（应用频率限制）
app.use('/api/brands', apiLimiter, require('./routes/brandRoutes'));
app.use('/api/models', apiLimiter, require('./routes/modelRoutes'));
app.use('/api/series', apiLimiter, require('./routes/seriesRoutes'));
app.use('/api/upload', apiLimiter, require('./routes/upload'));
app.use('/api/auth', loginLimiter, require('./routes/auth'));
app.use('/api/forum', apiLimiter, require('./routes/forumRoutes'));
app.use('/api/search', apiLimiter, require('./routes/searchRoutes'));
app.use('/api/notifications', apiLimiter, require('./routes/notificationRoutes'));
app.use('/api/articles', apiLimiter, require('./routes/articleRoutes'));
app.use('/api/inspiration', apiLimiter, require('./routes/inspirationRoutes'));
app.use('/api/image-tags', apiLimiter, require('./routes/imageTagRoutes'));
app.use('/api/image-gallery', apiLimiter, require('./routes/imageGalleryRoutes'));

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
  app.listen(PORT, () => {
    logger.info(`服务器运行在端口 ${PORT}`);
    console.log(`服务器运行在端口 ${PORT}`);
  });
}).catch(err => {
  logger.error('无法启动服务器，数据库连接失败:', err);
  process.exit(1);
});

module.exports = app; 