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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 配置请求日志
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: '服务运行正常' });
});

// API路由
app.use('/api/brands', require('./routes/brandRoutes'));
app.use('/api/models', require('./routes/modelRoutes'));
app.use('/api/series', require('./routes/seriesRoutes'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/forum', require('./routes/forumRoutes'));
app.use('/api/search', require('./routes/searchRoutes'));
app.use('/api/image', require('./routes/mattingRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

console.log('所有API路由已加载完成');

// 在路由之后添加全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('全局错误处理捕获到错误:', err);
  logger.error(`全局错误处理: ${err.message}\n${err.stack}`);
  res.status(err.status || 500).json({
    success: false,
    message: '服务器内部错误',
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