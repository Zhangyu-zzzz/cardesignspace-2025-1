const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

// 标签表
const Tag = sequelize.define(
  'Tag',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('manual', 'ai', 'system'),
      allowNull: false,
      defaultValue: 'manual',
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    synonyms: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    lang: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    popularity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('active', 'disabled'),
      allowNull: false,
      defaultValue: 'active',
    },
  },
  {
    tableName: 'tags',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      { name: 'uniq_tag_name', unique: true, fields: ['name'] },
      { fields: ['category'] },
      { fields: ['popularity'] },
    ],
  }
);

module.exports = Tag;


