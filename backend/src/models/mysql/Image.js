const { DataTypes } = require('sequelize');
const { sequelize } = require("../../config/mysql");
// 移除循环引用
// const Model = require('./Model');

const Image = sequelize.define('Image', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  modelId: {
    type: DataTypes.INTEGER,
    allowNull: false
    // 移除外键引用
    // references: {
    //   model: Model,
    //   key: 'id'
    // }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  title: {
    type: DataTypes.STRING(255)
  },
  description: {
    type: DataTypes.TEXT
  },
  url: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  fileSize: {
    type: DataTypes.INTEGER
  },
  fileType: {
    type: DataTypes.STRING(50)
  },
  category: {
    type: DataTypes.STRING(50)
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  uploadDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '图片标签数组'
  }
}, {
  tableName: 'images',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// 移除循环关联
// Image.belongsTo(Model, { foreignKey: 'modelId' });
// Model.hasMany(Image, { foreignKey: 'modelId', as: 'Images' });

module.exports = Image; 