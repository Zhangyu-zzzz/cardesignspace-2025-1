const { DataTypes } = require('sequelize');
const { sequelize } = require("../../config/mysql");

const Article = sequelize.define('Article', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '文章标题'
  },
  subtitle: {
    type: DataTypes.STRING(300),
    allowNull: true,
    comment: '文章副标题'
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    comment: '文章内容（HTML格式）'
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '文章摘要'
  },
  authorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: '作者ID'
  },
  category: {
    type: DataTypes.ENUM(
      '新车发布', 
      '试驾评测', 
      '行业资讯', 
      '技术解析', 
      '汽车文化', 
      '改装案例',
      '购车指南',
      '维修保养',
      '政策法规',
      '其他'
    ),
    defaultValue: '其他',
    comment: '文章分类'
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '文章标签'
  },
  coverImage: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '封面图片URL'
  },
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '文章内图片列表'
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '阅读次数'
  },
  likeCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '点赞次数'
  },
  commentCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '评论次数'
  },
  shareCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '分享次数'
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived', 'deleted'),
    defaultValue: 'draft',
    comment: '文章状态'
  },
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否为推荐文章'
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '发布时间'
  },
  seoTitle: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'SEO标题'
  },
  seoDescription: {
    type: DataTypes.STRING(300),
    allowNull: true,
    comment: 'SEO描述'
  },
  seoKeywords: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'SEO关键词'
  },
  readingTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '预计阅读时间（分钟）'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序顺序'
  }
}, {
  tableName: 'articles',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      name: 'idx_article_author',
      fields: ['authorId']
    },
    {
      name: 'idx_article_category',
      fields: ['category']
    },
    {
      name: 'idx_article_status',
      fields: ['status']
    },
    {
      name: 'idx_article_featured',
      fields: ['featured']
    },
    {
      name: 'idx_article_published',
      fields: ['publishedAt']
    },
    {
      name: 'idx_article_views',
      fields: ['viewCount']
    },
    {
      name: 'idx_article_sort',
      fields: ['sortOrder']
    }
  ]
});

module.exports = Article; 