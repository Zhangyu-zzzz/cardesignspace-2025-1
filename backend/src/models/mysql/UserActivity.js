const { DataTypes } = require('sequelize');
const { sequelize } = require("../../config/mysql");

const UserActivity = sequelize.define('UserActivity', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM(
      'register', 
      'login', 
      'logout', 
      'upload', 
      'download', 
      'remove_bg', 
      'crop_tranparent', 
      'points', 
      'achievement', 
      'other', 
      'password_change', 
      'profile_update', 
      'delete'
    ),
    allowNull: false,
    comment: '活动类型：注册、登录、登出、上传、下载、去除背景、裁剪透明、积分、成就、其他、密码修改、资料更新、删除'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '活动标题'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '活动描述'
  },
  relatedId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '关联的ID（如图片ID、成就ID等）'
  },
  relatedType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '关联的类型（如image、achievement等）'
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '涉及的积分变化'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '额外的元数据'
  }
}, {
  tableName: 'user_activities',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      name: 'idx_user_activities_user_id',
      fields: ['userId']
    },
    {
      name: 'idx_user_activities_type',
      fields: ['type']
    },
    {
      name: 'idx_user_activities_created_at',
      fields: ['createdAt']
    }
  ]
});

module.exports = UserActivity; 