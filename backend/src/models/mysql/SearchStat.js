const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const SearchStat = sequelize.define('SearchStat', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  query: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '搜索关键词'
  },
  count: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: '搜索次数'
  },
  last_searched_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '最后搜索时间'
  }
}, {
  tableName: 'search_stats',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['query']
    },
    {
      fields: ['count']
    },
    {
      fields: ['last_searched_at']
    }
  ]
});

module.exports = SearchStat;

