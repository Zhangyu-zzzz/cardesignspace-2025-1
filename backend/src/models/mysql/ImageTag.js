const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

// 图片-标签 关联表（多对多）
const ImageTag = sequelize.define(
  'ImageTag',
  {
    imageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    tagId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    weight: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    source: {
      type: DataTypes.ENUM('ai', 'manual', 'system'),
      allowNull: false,
      defaultValue: 'manual',
    },
    addedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'createdAt',
    },
  },
  {
    tableName: 'image_tags',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['imageId', 'tagId'] },
      { fields: ['tagId', 'imageId'] },
      { fields: ['source'] },
    ],
  }
);

module.exports = ImageTag;


