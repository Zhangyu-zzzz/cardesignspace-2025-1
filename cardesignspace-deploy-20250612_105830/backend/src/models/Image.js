const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Model = require('./Model');

const Image = sequelize.define('Image', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  modelId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Model,
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  originalUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  thumbnailUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mediumUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  largeUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  width: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  format: {
    type: DataTypes.STRING,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('exterior', 'interior', 'detail', 'other'),
    defaultValue: 'other'
  },
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  downloadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'images',
  timestamps: true,
  indexes: [
    {
      name: 'idx_image_model',
      fields: ['modelId']
    },
    {
      name: 'idx_image_type',
      fields: ['type']
    },
    {
      name: 'idx_image_featured',
      fields: ['featured']
    }
  ]
});

// 定义关联关系
Image.belongsTo(Model, { foreignKey: 'modelId', as: 'Model' });
Model.hasMany(Image, { foreignKey: 'modelId', as: 'Images' });

module.exports = Image; 