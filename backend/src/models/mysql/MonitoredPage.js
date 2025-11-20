const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const MonitoredPage = sequelize.define('MonitoredPage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  url: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '监控的网页URL'
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '页面名称/描述'
  },
  selector: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '内容选择器'
  },
  articleSelector: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '列表页文章链接选择器'
  },
  imageSelector: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '图片选择器'
  },
  textSelector: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '文字内容选择器'
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用监控'
  },
  interval: {
    type: DataTypes.INTEGER,
    defaultValue: 3600,
    comment: '抓取间隔（秒）'
  },
  lastCrawledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后抓取时间'
  },
  lastContentHash: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: '最后内容哈希'
  },
  config: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '额外配置（headers、cookies等）'
  }
}, {
  tableName: 'monitored_pages',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    { fields: ['enabled'] },
    { fields: ['url'] }
  ]
});

module.exports = MonitoredPage;
