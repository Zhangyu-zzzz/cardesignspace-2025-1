const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const Vehicle = sequelize.define('Vehicle', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    defaultValue: '未命名载具',
    comment: '载具名称'
  },
  imageData: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    comment: '载具图片数据(base64)'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '创建者ID(可为空，允许匿名)'
  },
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '点赞数'
  },
  dislikes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '拉踩数'
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '得分(点赞-拉踩)'
  },
  status: {
    type: DataTypes.ENUM('active', 'reported', 'deleted'),
    defaultValue: 'active',
    comment: '状态'
  }
}, {
  tableName: 'vehicles',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['score']
    },
    {
      fields: ['status']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = Vehicle;

