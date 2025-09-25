const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

// 图片变体资产表：存储一图多版本（thumb/small/medium/large/webp）
const ImageAsset = sequelize.define(
  'ImageAsset',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    imageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    variant: {
      type: DataTypes.ENUM('thumb', 'small', 'medium', 'large', 'webp'),
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    size: {
      // bytes
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: 'image_assets',
    timestamps: true,
    indexes: [
      { name: 'idx_image_assets_image', fields: ['imageId'] },
      { name: 'uniq_image_variant', unique: true, fields: ['imageId', 'variant'] },
    ],
  }
);

module.exports = ImageAsset;


