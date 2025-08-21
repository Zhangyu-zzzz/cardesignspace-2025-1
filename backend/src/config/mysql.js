const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
const logger = require('../../utils/logger');

// 加载环境变量
require('dotenv').config();

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
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
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
  connectionLimit: 10,
  queueLimit: 0
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