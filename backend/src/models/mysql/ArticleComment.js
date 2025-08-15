const { DataTypes } = require('sequelize');
const { sequelize } = require("../../config/mysql");

const ArticleComment = sequelize.define('ArticleComment', {
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
    comment: '评论用户ID'
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'article_comments',
      key: 'id'
    },
    comment: '父评论ID（用于回复）'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '评论内容'
  },
  likeCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '点赞次数'
  },
  replyCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '回复次数'
  },
  status: {
    type: DataTypes.ENUM('active', 'deleted', 'hidden'),
    defaultValue: 'active',
    comment: '评论状态'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP地址'
  }
}, {
  tableName: 'article_comments',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      name: 'idx_comment_article',
      fields: ['articleId']
    },
    {
      name: 'idx_comment_user',
      fields: ['userId']
    },
    {
      name: 'idx_comment_parent',
      fields: ['parentId']
    },
    {
      name: 'idx_comment_status',
      fields: ['status']
    },
    {
      name: 'idx_comment_created',
      fields: ['createdAt']
    }
  ]
});

module.exports = ArticleComment; 