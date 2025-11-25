const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const CrawlHistory = sequelize.define('CrawlHistory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  pageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '监控页面ID'
  },
  status: {
    type: DataTypes.ENUM('success', 'failed', 'no_change'),
    defaultValue: 'success',
    comment: '抓取状态'
  },
  itemsFound: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '发现的新内容数量'
  },
  itemsUploaded: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '成功上传的数量'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误信息'
  },
  contentHash: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: '内容哈希值'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '额外元数据'
  }
}, {
  tableName: 'crawl_history',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      fields: ['pageId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = CrawlHistory;




