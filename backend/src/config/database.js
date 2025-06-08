const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');
const logger = require('./logger');

// 加载环境变量
require('dotenv').config();

// MySQL连接配置 - 从环境变量读取
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

// 测试MySQL连接
const testMySQLConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('MySQL连接成功');
    return true;
  } catch (error) {
    logger.error('MySQL连接失败:', error);
    return false;
  }
};

// MongoDB连接配置
const connectMongoDB = async () => {
  try {
    const mongoURI = `mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DATABASE}`;
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    logger.info('MongoDB连接成功');
    return true;
  } catch (error) {
    logger.error('MongoDB连接失败:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  testMySQLConnection,
  connectMongoDB
}; 