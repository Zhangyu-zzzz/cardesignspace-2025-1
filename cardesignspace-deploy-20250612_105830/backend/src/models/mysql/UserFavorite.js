const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const UserFavorite = sequelize.define('UserFavorite', {
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
  }
}, {
  tableName: 'user_favorites',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = UserFavorite; 