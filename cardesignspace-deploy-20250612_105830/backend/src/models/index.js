const Brand = require('./Brand');
const Series = require('./Series');
const Model = require('./Model');
const Image = require('./Image');
const User = require('./User');
const { sequelize } = require('../config/database');

// 同步所有模型到数据库
const syncModels = async () => {
  try {
    // 同步所有定义的模型到数据库中
    await sequelize.sync({ alter: true });
    console.log('数据库表同步完成');
    return true;
  } catch (error) {
    console.error('数据库表同步失败:', error);
    return false;
  }
};

module.exports = {
  Brand,
  Series,
  Model,
  Image,
  User,
  syncModels
}; 