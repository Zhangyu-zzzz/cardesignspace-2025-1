module.exports = {
  apps: [{
    name: 'cardesignspace-backend',
    script: 'src/app.js',
    cwd: '/root/cardesignspace-2025/backend',
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