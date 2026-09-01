const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { Product, Customer, Order, OrderItem, Design, Conversation, Message, User } = require('../models');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Products Routes
router.get('/products', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router.put('/products/:id', async (req, res) => {
  try {
    await Product.update(req.body, { where: { id: req.params.id } });
    const product = await Product.findByPk(req.params.id);
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await Product.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Customers Routes
router.get('/customers', async (req, res) => {
  try {
    const customers = await Customer.findAll();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/customers', async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router.put('/customers/:id', async (req, res) => {
  try {
    await Customer.update(req.body, { where: { id: req.params.id } });
    const customer = await Customer.findByPk(req.params.id);
    res.json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/customers/:id', async (req, res) => {
  try {
    await Customer.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Orders Routes
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.findAll({ 
      include: [
        Customer,
        { model: Product }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const { items, ...orderData } = req.body;
    let totalAmount = 0;

    // Calculate total amount if items exist
    if (items && items.length > 0) {
      for (const item of items) {
        const product = await Product.findByPk(item.productId);
        if (product) {
          totalAmount += Number(product.price) * Number(item.quantity || 1);
        }
      }
      orderData.totalAmount = totalAmount;
    }

    const order = await Order.create(orderData);

    // Create OrderItems
    if (items && items.length > 0) {
      for (const item of items) {
        const product = await Product.findByPk(item.productId);
        if (product) {
          await OrderItem.create({
            OrderId: order.id,
            ProductId: product.id,
            quantity: item.quantity || 1,
            priceAtPurchase: product.price
          });

          // Deduct stock for internal products
          if (product.sourceType === 'internal' && product.stock >= (item.quantity || 1)) {
            await product.update({ stock: product.stock - (item.quantity || 1) });
          }
        }
      }
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router.put('/orders/:id/status', async (req, res) => {
  try {
    await Order.update({ status: req.body.status }, { where: { id: req.params.id } });
    const order = await Order.findByPk(req.params.id);
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/orders/:id', async (req, res) => {
  try {
    await Order.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Users Route (Admin only ideally, but keeping simple for now)
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] } });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || '123456', salt);
    
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'خدمة العملاء'
    });
    
    // Return user without password
    const userWithoutPassword = user.toJSON();
    delete userWithoutPassword.password;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, role, status, password } = req.body;
    const updateData = { name, email, role, status };
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    
    await User.update(updateData, { where: { id: req.params.id } });
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await User.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Offers Route
router.get('/offers', async (req, res) => {
  try {
    const { Offer } = require('../models');
    const offers = await Offer.findAll();
    res.json(offers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/offers', async (req, res) => {
  try {
    const { Offer } = require('../models');
    const offer = await Offer.create(req.body);
    res.status(201).json(offer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/offers/:id', async (req, res) => {
  try {
    const { Offer } = require('../models');
    await Offer.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings Route
router.get('/settings', async (req, res) => {
  try {
    const { Setting } = require('../models');
    const settings = await Setting.findAll();
    
    // Convert array of {key, value} to object
    const settingsObj = {};
    settings.forEach(s => settingsObj[s.key] = s.value);
    
    res.json(settingsObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { Setting } = require('../models');
    const settingsData = req.body; // Expecting { storeName: '...', email: '...' }
    
    // Update or Create
    for (const [key, value] of Object.entries(settingsData)) {
      const existing = await Setting.findOne({ where: { key } });
      if (existing) {
        await existing.update({ value });
      } else {
        await Setting.create({ key, value });
      }
    }
    
    res.json({ message: 'Settings saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  // Construct URL
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// Designs Route
router.get('/designs', async (req, res) => {
  try {
    const designs = await Design.findAll();
    res.json(designs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/designs', async (req, res) => {
  try {
    const design = await Design.create(req.body);
    res.status(201).json(design);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Chat Routes
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await Conversation.findAll({
      order: [['updatedAt', 'DESC']]
    });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/conversations', async (req, res) => {
  try {
    const conversation = await Conversation.create(req.body);
    res.status(201).json(conversation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: { conversationId: req.params.id },
      order: [['createdAt', 'ASC']]
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const message = await Message.create({
      conversationId: req.params.id,
      text: req.body.text,
      sender: req.body.sender || 'admin'
    });
    
    // Update conversation unread/timestamp
    await Conversation.update(
      { updatedAt: new Date() },
      { where: { id: req.params.id } }
    );

    // Emit event via Socket.io
    if (req.io) {
      req.io.emit('new_message', message);
    }
    
    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Notifications Route
router.get('/notifications', async (req, res) => {
  try {
    const { Notification } = require('../models');
    const notifs = await Notification.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(notifs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/notifications/read-all', async (req, res) => {
  try {
    const { Notification } = require('../models');
    await Notification.update({ isRead: true }, { where: { isRead: false } });
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard Stats Route
router.get('/dashboard-stats', async (req, res) => {
  try {
    const totalProducts = await Product.count();
    const totalCustomers = await Customer.count();
    const totalOrders = await Order.count();
    const totalSales = await Order.sum('totalAmount') || 0;

    res.json({
      totalProducts,
      totalCustomers,
      totalOrders,
      totalSales
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard Recent Orders Route
router.get('/dashboard/recent-orders', async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [Customer],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard Top Products Route
router.get('/dashboard/top-products', async (req, res) => {
  try {
    const products = await Product.findAll({
      order: [['salesCount', 'DESC']],
      limit: 5
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard Sales Chart Route
router.get('/dashboard/sales-chart', async (req, res) => {
  try {
    // To keep it simple and dialect-agnostic, we fetch all orders of current year and group in JS.
    // For a real large app, use DB aggregation.
    const orders = await Order.findAll();
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const salesByMonth = {};
    
    // Initialize months
    months.forEach(m => salesByMonth[m] = 0);

    orders.forEach(order => {
      const date = new Date(order.createdAt);
      if (date.getFullYear() === new Date().getFullYear()) {
        const monthName = months[date.getMonth()];
        salesByMonth[monthName] += Number(order.totalAmount);
      }
    });

    const data = months.map(name => ({
      name,
      value: salesByMonth[name]
    }));

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard Category Chart Route
router.get('/dashboard/category-chart', async (req, res) => {
  try {
    const products = await Product.findAll();
    const salesByCategory = {};
    let totalSales = 0;

    products.forEach(p => {
      const cat = p.category || 'أخرى';
      if (!salesByCategory[cat]) salesByCategory[cat] = 0;
      salesByCategory[cat] += Number(p.salesCount);
      totalSales += Number(p.salesCount);
    });

    const colors = ['#3b82f6', '#6C4F3D', '#d4a373', '#9ca3af', '#10b981', '#ef4444'];
    let colorIndex = 0;

    const data = Object.keys(salesByCategory).map(name => {
      const percentage = totalSales > 0 ? Math.round((salesByCategory[name] / totalSales) * 100) : 0;
      const color = colors[colorIndex % colors.length];
      colorIndex++;
      return {
        name,
        value: percentage,
        color,
        rawValue: salesByCategory[name]
      };
    }).filter(d => d.value > 0);

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Samples Routes
router.use('/samples', require('./samples'));

module.exports = router;
