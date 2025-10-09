const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
const logger = require('../../utils/logger');

// 加载环境变量
require('dotenv').config({ path: '../../.env' });

const sequelize = new Sequelize(
  process.env.DB_NAME,  // 数据库名称
  process.env.DB_USER,  // 用户名
  process.env.DB_PASSWORD, // 密码
  {
    host: process.env.DB_HOST,  // 服务器IP地址
    port: parseInt(process.env.DB_PORT),   // MySQL端口
    dialect: 'mysql',
    logging: msg => logger.debug(msg),
    pool: {
      max: 20,        // 增加最大连接数
      min: 5,         // 保持最小连接数
      acquire: 60000, // 增加获取连接超时时间
      idle: 30000,    // 增加空闲连接超时时间
      evict: 1000,    // 连接回收间隔
      handleDisconnects: true
    },
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      supportBigNumbers: true,
      bigNumberStrings: true
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: false
    }
  }
);

// 创建原生MySQL连接池
const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 20,    // 增加连接数限制
  queueLimit: 0,
  acquireTimeout: 60000,  // 获取连接超时
  timeout: 60000,         // 查询超时
  reconnect: true,        // 自动重连
  idleTimeout: 30000,     // 空闲超时
  maxReconnects: 3        // 最大重连次数
});

const connectMySQL = async () => {
  try {
    await sequelize.authenticate();
    logger.info('MySQL database connection has been established successfully.');
  } catch (error) {
    logger.error('Unable to connect to the MySQL database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  connectMySQL,
  getConnection: () => mysqlPool.getConnection()
}; 