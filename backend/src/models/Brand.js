const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/mysql');

const Brand = sequelize.define('Brand', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true
  },
  foundYear: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  website: {
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
  tableName: 'brands',
  timestamps: true,
  indexes: [
    {
      name: 'idx_brand_name',
      fields: ['name']
    },
    {
      name: 'idx_brand_popular',
      fields: ['popular']
    }
  ]
});

module.exports = Brand; 