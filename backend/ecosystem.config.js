// 加载环境变量
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
// 如果上面的路径不存在，尝试backend目录下的.env
if (!process.env.TENCENT_SECRET_ID && !process.env.COS_BUCKET) {
  require('dotenv').config({ path: require('path').join(__dirname, '.env') });
}

module.exports = {
  apps: [{
    name: 'cardesignspace-backend',
    script: 'src/app.js',
    // 支持多个可能的部署路径
    cwd: process.env.PM2_CWD || '/opt/auto-gallery/backend' || '/root/cardesignspace-2025/backend',
    // 使用env_file让PM2自动加载.env文件
    env_file: '.env',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DB_HOST: process.env.DB_HOST || 'localhost',
      DB_PORT: process.env.DB_PORT || 3306,
      DB_NAME: process.env.DB_NAME || 'cardesignspace',
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD,
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN: '7d',
      // COS配置 - 从环境变量读取
      TENCENT_SECRET_ID: process.env.TENCENT_SECRET_ID,
      TENCENT_SECRET_KEY: process.env.TENCENT_SECRET_KEY,
      COS_BUCKET: process.env.COS_BUCKET,
      COS_REGION: process.env.COS_REGION || 'ap-shanghai',
      COS_DOMAIN: process.env.COS_DOMAIN,
      LOG_LEVEL: 'info',
      LOG_MAX_SIZE: '20m',
      LOG_MAX_FILES: '14d'
    },
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    restart_delay: 4000,
    min_uptime: '10s',
    max_restarts: 5
  }]
}; 