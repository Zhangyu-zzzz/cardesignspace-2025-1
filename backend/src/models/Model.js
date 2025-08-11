const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/mysql');
const Series = require('./Series');
const Brand = require('./Brand');

const Model = sequelize.define('Model', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  seriesId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Series,
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  coverUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  engine: {
    type: DataTypes.STRING,
    allowNull: true
  },
  transmission: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fuelType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bodyType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  specifications: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('specifications');
      return rawValue ? JSON.parse(rawValue) : null;
    },
    set(value) {
      this.setDataValue('specifications', JSON.stringify(value));
    }
  },
  popular: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'models',
  timestamps: true,
  indexes: [
    {
      name: 'idx_model_series',
      fields: ['seriesId']
    },
    {
      name: 'idx_model_year',
      fields: ['year']
    },
    {
      name: 'idx_model_popular',
      fields: ['popular']
    }
  ]
});

// 定义关联关系
Model.belongsTo(Series, { foreignKey: 'seriesId', as: 'series' });
Series.hasMany(Model, { foreignKey: 'seriesId', as: 'models' });
Model.belongsTo(Brand, { foreignKey: 'brandId', as: 'Brand' });
Brand.hasMany(Model, { foreignKey: 'brandId', as: 'Models' });

module.exports = Model; 