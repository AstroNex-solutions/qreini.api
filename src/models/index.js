const sequelize = require('../config/database');
const Product = require('./Product');
const Customer = require('./Customer');
const Order = require('./Order');
const User = require('./User');
const Offer = require('./Offer');
const Design = require('./Design');
const Notification = require('./Notification');
const Conversation = require('./Conversation');
const Message = require('./Message');
const Setting = require('./Setting');
const Sample = require('./Sample');

// Define Relationships

// A Product can have many Samples
Product.hasMany(Sample, { foreignKey: 'productId' });
Sample.belongsTo(Product, { foreignKey: 'productId' });

// A Customer can have many Orders
Customer.hasMany(Order, { foreignKey: 'customerId' });
Order.belongsTo(Customer, { foreignKey: 'customerId' });

// An Order can have many Products (OrderItems would be better, but for simplicity we'll just link directly or just assume structure)
// Since an order has many products and a product can be in many orders, we need a Many-to-Many relationship (OrderItems)
const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: require('sequelize').DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  quantity: {
    type: require('sequelize').DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  priceAtPurchase: {
    type: require('sequelize').DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
});

Order.belongsToMany(Product, { through: OrderItem });
Product.belongsToMany(Order, { through: OrderItem });

Conversation.hasMany(Message, { foreignKey: 'conversationId' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

module.exports = {
  sequelize,
  Product,
  Customer,
  Order,
  OrderItem,
  User,
  Offer,
  Design,
  Notification,
  Conversation,
  Message,
  Setting,
  Sample
};
