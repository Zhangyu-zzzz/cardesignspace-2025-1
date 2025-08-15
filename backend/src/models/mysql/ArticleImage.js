const { DataTypes } = require('sequelize');
const { sequelize } = require("../../config/mysql");

const ArticleImage = sequelize.define('ArticleImage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  articleId: {
    type: DataTypes.INTEGER,
    allowNull: true, // 允许为空，因为编辑时可能还没有关联文章
    comment: '关联的文章ID'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '上传用户ID'
  },
  url: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '图片URL地址'
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '原始文件名'
  },
  cosKey: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '腾讯云COS存储键'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    comment: '文件大小（字节）'
  },
  fileType: {
    type: DataTypes.STRING(50),
    comment: '文件MIME类型'
  },
  imageType: {
    type: DataTypes.ENUM('cover', 'content', 'thumbnail'),
    allowNull: false,
    defaultValue: 'content',
    comment: '图片类型：cover-封面图，content-内容图，thumbnail-缩略图'
  },
  alt: {
    type: DataTypes.STRING(255),
    comment: '图片alt描述'
  },
  caption: {
    type: DataTypes.TEXT,
    comment: '图片说明文字'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序顺序'
  },
  status: {
    type: DataTypes.ENUM('active', 'deleted'),
    defaultValue: 'active',
    comment: '状态：active-正常，deleted-已删除'
  },
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '上传时间'
  }
}, {
  tableName: 'article_images',
  timestamps: true,
  indexes: [
    {
      fields: ['articleId']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['imageType']
    },
    {
      fields: ['status']
    },
    {
      fields: ['uploadedAt']
    }
  ]
});

module.exports = ArticleImage; 