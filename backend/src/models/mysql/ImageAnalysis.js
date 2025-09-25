const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

// 结构化图像分析表
const ImageAnalysis = sequelize.define(
  'ImageAnalysis',
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
    dominantColors: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '如 [{hex:#112233, ratio:0.42}]',
    },
    brightness: { type: DataTypes.FLOAT, allowNull: true },
    contrast: { type: DataTypes.FLOAT, allowNull: true },
    sharpness: { type: DataTypes.FLOAT, allowNull: true },
    aspectRatio: { type: DataTypes.FLOAT, allowNull: true },
    compositionType: {
      type: DataTypes.ENUM('symmetric', 'golden_ratio', 'center', 'dynamic', 'other'),
      allowNull: true,
    },
    technicalScore: { type: DataTypes.FLOAT, allowNull: true },
    aestheticScore: { type: DataTypes.FLOAT, allowNull: true },
    overallScore: { type: DataTypes.FLOAT, allowNull: true },
    extractorVersion: { type: DataTypes.STRING(50), allowNull: true },
    updatedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'image_analysis',
    timestamps: false,
    indexes: [{ name: 'idx_image_analysis_image', fields: ['imageId'] }],
  }
);

module.exports = ImageAnalysis;


