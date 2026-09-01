const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Offer = sequelize.define('Offer', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  discount: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING, // e.g., 'percentage', 'fixed'
    defaultValue: 'percentage',
  },
  status: {
    type: DataTypes.STRING, // 'active', 'expired'
    defaultValue: 'active',
  },
  expiry: {
    type: DataTypes.STRING, // Date string or 'مستمر'
    allowNull: false,
  }
}, {
  timestamps: true,
});

module.exports = Offer;
