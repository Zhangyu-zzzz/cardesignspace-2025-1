const { DataTypes } = require('sequelize');
const { sequelize } = require("../../config/mysql");
const Brand = require('./Brand');
// 添加Image模型引用
// const Image = require('./Image'); // 避免循环引用

const Model = sequelize.define('Model', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  brandId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Brand,
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('轿车', 'SUV', 'MPV', 'WAGON', 'SHOOTINGBRAKE', '皮卡', '跑车', '其他'),
    defaultValue: '其他'
  },
  price: {
    type: DataTypes.DECIMAL(12, 2)
  },
  specs: {
    type: DataTypes.JSON
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  description: {
    type: DataTypes.TEXT
  },
  year: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'models',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// 定义外键关系 - 移至 index.js 中统一处理
// Model.belongsTo(Brand, { foreignKey: 'brandId' });
// Brand.hasMany(Model, { foreignKey: 'brandId' });

// 在index.js文件中统一处理关联关系以避免循环引用
// Model.hasMany(Image, { foreignKey: 'modelId', as: 'Images' });

module.exports = Model; 