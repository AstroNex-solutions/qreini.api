const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const B2BRequest = sequelize.define('B2BRequest', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  contactName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  itemType: {
    type: DataTypes.STRING, // e.g. school, medical, security, hotel
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
  },
  estimatedTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('new', 'reviewed', 'completed', 'rejected'),
    defaultValue: 'new',
  }
}, {
  timestamps: true,
});

module.exports = B2BRequest;
