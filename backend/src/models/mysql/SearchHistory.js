const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const SearchHistory = sequelize.define('SearchHistory', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '用户ID（如果已登录）'
  },
  session_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '会话ID（未登录用户识别）'
  },
  query: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '搜索关键词'
  },
  translated_query: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '翻译后的查询'
  },
  brand_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '识别到的品牌ID'
  },
  results_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '返回结果数量'
  },
  search_type: {
    type: DataTypes.ENUM('smart', 'normal', 'tag'),
    defaultValue: 'smart',
    comment: '搜索类型'
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP地址'
  },
  user_agent: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '用户代理'
  },
  referrer: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '来源页面'
  },
  device_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '设备类型（mobile/desktop/tablet）'
  },
  search_duration_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '搜索耗时（毫秒）'
  },
  is_successful: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '搜索是否成功'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误信息（如果失败）'
  }
}, {
  tableName: 'search_history',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // 搜索历史不需要更新时间
  indexes: [
    { fields: ['user_id'] },
    { fields: ['session_id'] },
    { fields: ['query'] },
    { fields: ['brand_id'] },
    { fields: ['search_type'] },
    { fields: ['created_at'] },
    { fields: ['ip_address'] }
  ]
});

module.exports = SearchHistory;

