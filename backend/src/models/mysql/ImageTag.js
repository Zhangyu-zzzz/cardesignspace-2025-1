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
      field: 'image_id',
    },
    tagId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'tag_id',
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
      field: 'added_by',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
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


