const { DataTypes } = require('sequelize');
const { sequelize } = require("../../config/mysql");
const Brand = require('./Brand');

const Series = sequelize.define('Series', {
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
  year: {
    type: DataTypes.INTEGER
  },
  description: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'series',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// 定义外键关系 - 移至 index.js 中统一处理
// Series.belongsTo(Brand, { foreignKey: 'brandId' });
// Brand.hasMany(Series, { foreignKey: 'brandId' });

module.exports = Series; 