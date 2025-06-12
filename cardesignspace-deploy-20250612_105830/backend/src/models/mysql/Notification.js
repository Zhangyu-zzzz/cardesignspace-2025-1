const { DataTypes } = require('sequelize');
const { sequelize } = require("../../config/mysql");

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  // 接收通知的用户ID
  receiverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // 触发通知的用户ID
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // 通知类型：like(点赞), comment(评论), follow(关注), system(系统通知)
  type: {
    type: DataTypes.ENUM('like', 'comment', 'follow', 'system'),
    allowNull: false
  },
  // 相关的帖子ID
  postId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'posts',
      key: 'id'
    }
  },
  // 相关的评论ID
  commentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'comments',
      key: 'id'
    }
  },
  // 通知标题
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  // 通知内容
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // 是否已读
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // 额外数据（JSON格式）
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      fields: ['receiverId', 'isRead']
    },
    {
      fields: ['receiverId', 'createdAt']
    },
    {
      fields: ['type']
    }
  ]
});

module.exports = Notification; 