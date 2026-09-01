const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Design = sequelize.define('Design', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  image: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.STRING, // 'معتمد', 'قيد المراجعة', 'مسودة'
    defaultValue: 'مسودة',
  },
  author: {
    type: DataTypes.STRING,
  }
}, {
  timestamps: true,
});

module.exports = Design;
