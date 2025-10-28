const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const Feedback = sequelize.define('Feedback', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.ENUM('feature', 'ui', 'performance', 'bug', 'other'),
      allowNull: false,
      comment: '反馈类型'
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      },
      comment: '满意度评分(1-5)'
    },
    contact: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '联系方式(邮箱或QQ)'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '反馈内容'
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
      comment: '提交反馈时的页面URL'
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
    tableName: 'feedbacks',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        fields: ['type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['rating']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

module.exports = Feedback;
