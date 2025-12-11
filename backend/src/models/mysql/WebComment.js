const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const WebComment = sequelize.define('WebComment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '优化意见内容'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '用户ID(匿名用户为null)'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '用户代理信息'
  },
  pageUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '提交意见时的页面URL'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP地址'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'resolved', 'closed'),
    defaultValue: 'pending',
    comment: '处理状态'
  },
  reply: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '管理员回复'
  },
  repliedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '回复时间'
  },
  repliedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '回复人ID'
  }
}, {
  tableName: 'web-comments',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = WebComment;

