const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/mysql');

const VehicleVote = sequelize.define('VehicleVote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  vehicleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '载具ID'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '投票用户ID'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP地址'
  },
  voteType: {
    type: DataTypes.ENUM('like', 'dislike'),
    allowNull: false,
    comment: '投票类型'
  }
}, {
  tableName: 'vehicle_votes',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false,
  indexes: [
    {
      unique: true,
      fields: ['vehicleId', 'userId', 'ipAddress'],
      name: 'unique_vote'
    },
    {
      fields: ['vehicleId']
    },
    {
      fields: ['userId']
    }
  ]
});

module.exports = VehicleVote;


