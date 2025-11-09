const { DataTypes } = require('sequelize');
const { sequelize } = require("../../config/mysql");

const Brand = sequelize.define('Brand', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  chineseName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '品牌中文名称'
  },
  country: {
    type: DataTypes.STRING(50)
  },
  logo: {
    type: DataTypes.STRING(255)
  },
  founded_year: {
    type: DataTypes.INTEGER
  },
  description: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'brands',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = Brand; 