const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sub: {
    type: DataTypes.STRING,
  },
  iconName: {
    type: DataTypes.STRING,
  },
  color: {
    type: DataTypes.STRING,
  },
  iconColor: {
    type: DataTypes.STRING,
  }
}, {
  timestamps: true,
});

module.exports = Category;
