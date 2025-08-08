const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

// 精选信息表（单条记录对应一张图片）
const ImageCuration = sequelize.define('ImageCuration', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  imageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  isCurated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  curationScore: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  curator: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  validUntil: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'image_curation',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    { name: 'idx_image_curation_imageId', fields: ['imageId'] },
    { name: 'idx_image_curation_isCurated', fields: ['isCurated'] },
    { name: 'idx_image_curation_score', fields: ['curationScore'] },
    { name: 'idx_image_curation_validUntil', fields: ['validUntil'] }
  ]
});

module.exports = ImageCuration;
