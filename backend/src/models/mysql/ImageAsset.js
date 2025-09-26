const { DataTypes } = require('sequelize');
const { sequelize } = require("../../config/mysql");

const ImageAsset = sequelize.define('ImageAsset', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  imageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联的图片ID'
  },
  variant: {
    type: DataTypes.ENUM('thumb', 'small', 'medium', 'large', 'webp'),
    allowNull: false,
    comment: '变体类型'
  },
  url: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '变体图片URL'
  },
  width: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '变体图片宽度'
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '变体图片高度'
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '变体图片文件大小（字节）'
  }
}, {
  tableName: 'image_assets',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      name: 'idx_image_assets_image',
      fields: ['imageId']
    },
    {
      name: 'uniq_image_variant',
      unique: true,
      fields: ['imageId', 'variant']
    }
  ]
});

module.exports = ImageAsset;
