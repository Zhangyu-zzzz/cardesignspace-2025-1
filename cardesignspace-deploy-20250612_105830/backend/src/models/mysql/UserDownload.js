const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const UserDownload = sequelize.define('UserDownload', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  image_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'images',
      key: 'id'
    }
  },
  resolution: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  download_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'user_downloads',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = UserDownload; 