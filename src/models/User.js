const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'sales', 'support'),
    defaultValue: 'support',
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
  },
  permissions: {
    type: DataTypes.JSON,
    defaultValue: {
      orders: { view: false, edit: false, delete: false },
      products: { view: false, edit: false, delete: false },
      customers: { view: false, edit: false, delete: false },
      reports: { view: false },
      offers: { view: false, edit: false, delete: false },
      chat: { view: false },
      settings: { edit: false },
      users: { view: false, edit: false },
      samples: { view: false, edit: false, delete: false },
    },
  },
}, {
  timestamps: true,
});

module.exports = User;
