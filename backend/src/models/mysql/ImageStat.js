const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

// 统计/聚合表（可用作按时间桶）
const ImageStat = sequelize.define(
  'ImageStat',
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
    timeBucket: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      defaultValue: 'daily',
    },
    bucketDate: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: '该时间桶的起始日期',
    },
    view: { type: DataTypes.INTEGER, defaultValue: 0 },
    like: { type: DataTypes.INTEGER, defaultValue: 0 },
    pin: { type: DataTypes.INTEGER, defaultValue: 0 },
    share: { type: DataTypes.INTEGER, defaultValue: 0 },
    trendingScore: { type: DataTypes.FLOAT, allowNull: true },
  },
  {
    tableName: 'image_stats',
    timestamps: true,
    indexes: [
      { name: 'idx_stats_image_bucket', fields: ['imageId', 'timeBucket', 'bucketDate'] },
    ],
  }
);

module.exports = ImageStat;


