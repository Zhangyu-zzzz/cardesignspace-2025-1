const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

// 精选信息表（单条记录对应一张图片，主键为 image_id）
const ImageCuration = sequelize.define('ImageCuration', {
  imageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    field: 'image_id'
  },
  isCurated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_curated'
  },
  curationScore: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    field: 'curation_score'
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
    allowNull: true,
    field: 'valid_until'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'updated_at'
  }
}, {
  tableName: 'image_curation',
  timestamps: false,
  indexes: [
    { name: 'idx_image_curation_imageId', fields: ['image_id'] },
    { name: 'idx_image_curation_isCurated', fields: ['is_curated'] },
    { name: 'idx_image_curation_score', fields: ['curation_score'] },
    { name: 'idx_image_curation_validUntil', fields: ['valid_until'] }
  ]
});

module.exports = ImageCuration;
