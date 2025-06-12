const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Brand = require('./Brand');

const Series = sequelize.define('Series', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  brandId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Brand,
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  coverUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.ENUM('SUV', '轿车', '跑车', 'MPV', '皮卡', '新能源'),
    allowNull: true
  },
  priceRange: {
    type: DataTypes.STRING,
    allowNull: true
  },
  popular: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'series',
  timestamps: true,
  indexes: [
    {
      name: 'idx_series_brand',
      fields: ['brandId']
    },
    {
      name: 'idx_series_category',
      fields: ['category']
    },
    {
      name: 'idx_series_popular',
      fields: ['popular']
    }
  ]
});

// 定义关联关系
Series.belongsTo(Brand, { foreignKey: 'brandId', as: 'brand' });
Brand.hasMany(Series, { foreignKey: 'brandId', as: 'series' });

module.exports = Series; 