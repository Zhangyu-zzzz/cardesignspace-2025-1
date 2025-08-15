const { DataTypes } = require('sequelize');
const { sequelize } = require("../../config/mysql");

const ArticleLike = sequelize.define('ArticleLike', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  articleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'articles',
      key: 'id'
    },
    comment: '文章ID'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: '点赞用户ID'
  },
  type: {
    type: DataTypes.ENUM('like', 'dislike'),
    defaultValue: 'like',
    comment: '点赞类型'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP地址'
  }
}, {
  tableName: 'article_likes',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      name: 'idx_like_article',
      fields: ['articleId']
    },
    {
      name: 'idx_like_user',
      fields: ['userId']
    },
    {
      name: 'idx_like_unique',
      fields: ['articleId', 'userId'],
      unique: true
    },
    {
      name: 'idx_like_type',
      fields: ['type']
    }
  ]
});

module.exports = ArticleLike; 