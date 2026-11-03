const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { Product, Customer, Order, OrderItem, Design, Conversation, Message, User } = require('../models');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

// Create uploads directory if it doesn't exist (for fallback)
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Memory storage to stream directly to Cloudinary or write to disk as fallback
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf'
  ];
  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم. يرجى رفع صورة بصيغة (JPG, PNG, WEBP, SVG, GIF) أو ملف PDF'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max
  },
  fileFilter: fileFilter
});

// Products Routes
// Auto-sync Product schema to ensure new columns exist in database
Product.sync({ alter: true }).catch(() => {});

router.get('/products', async (req, res) => {
  try {
    const where = {};
    if (req.query.isQreini === 'true') {
      where.isQreiniProduct = true;
    } else if (req.query.isQreini === 'false') {
      where.isQreiniProduct = false;
    }
    const products = await Product.findAll({ where, order: [['createdAt', 'DESC']] });
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
// Auto-sync Order schema to ensure paymentMethod and notes columns exist
Order.sync({ alter: true }).catch(() => {});

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
    } else if (req.body.totalAmount) {
      orderData.totalAmount = Number(req.body.totalAmount);
    }

    // Assign payment method & notes
    orderData.paymentMethod = req.body.paymentMethod || 'cash_on_delivery';
    orderData.notes = req.body.notes || null;

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
    const { name, email, password, role, status, permissions } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || '123456', salt);
    
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'support',
      status: status || 'active',
      permissions: permissions || null,
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
    const { name, email, role, status, password, permissions } = req.body;
    const updateData = { name, email, role, status };
    
    if (permissions !== undefined) {
      updateData.permissions = permissions;
    }
    
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

// Categories Route
router.get('/categories', async (req, res) => {
  try {
    const { Category } = require('../models');
    await Category.sync();
    let categories = await Category.findAll();
    
    // Seed initial categories if completely empty
    if (!categories || categories.length === 0) {
      const defaultCategories = [
        {
          label: 'الزي المدرسي',
          sub: 'للمدارس والجامعات',
          iconName: 'GraduationCap',
          image: '/cat_school.jpg',
          color: 'from-amber-600/10 to-amber-900/5',
          iconColor: 'text-amber-700'
        },
        {
          label: 'السكراب الطبي',
          sub: 'للقطاع الصحي والمستشفيات',
          iconName: 'Stethoscope',
          image: '/cat_medical.jpg',
          color: 'from-emerald-600/10 to-emerald-900/5',
          iconColor: 'text-emerald-700'
        },
        {
          label: 'الزي الأمني',
          sub: 'للحراسات والأمن الخاص',
          iconName: 'ShieldCheck',
          image: '/cat_security.jpg',
          color: 'from-blue-600/10 to-blue-900/5',
          iconColor: 'text-blue-700'
        },
        {
          label: 'طقم الشيف',
          sub: 'للمطاعم والضيافة والفنادق',
          iconName: 'UtensilsCrossed',
          image: '/cat_chef.jpg',
          color: 'from-orange-600/10 to-orange-900/5',
          iconColor: 'text-orange-700'
        }
      ];
      try {
        await Category.bulkCreate(defaultCategories);
        categories = await Category.findAll();
      } catch (e) {
        return res.json(defaultCategories.map((c, idx) => ({ id: idx + 1, ...c })));
      }
    }
    
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { Category } = require('../models');
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const { Category } = require('../models');
    await Category.update(req.body, { where: { id: req.params.id } });
    const category = await Category.findByPk(req.params.id);
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const { Category } = require('../models');
    await Category.destroy({ where: { id: req.params.id } });
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
router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'حجم الملف كبير جداً. الحد الأقصى المسموح به هو 25 ميجابايت' });
      }
      return res.status(400).json({ error: `خطأ في رفع الملف: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message || 'فشل في رفع الملف' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'لم يتم استلام أي ملف للرفع' });
    }

    // 1. Check if Cloudinary is configured
    if (isCloudinaryConfigured()) {
      const rawExt = path.extname(req.file.originalname || '');
      const cleanName = path.basename(req.file.originalname, rawExt).replace(/[^a-zA-Z0-9_-]/g, '_');
      const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E6);
      const publicId = `${cleanName}_${uniqueSuffix}`;

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'qreini_uniforms',
          public_id: publicId,
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return res.status(500).json({ error: `فشل الرفع إلى Cloudinary: ${error.message}` });
          }

          return res.json({
            url: result.secure_url,
            path: result.secure_url,
            filename: result.public_id,
            public_id: result.public_id,
            size: result.bytes || req.file.size,
            mimetype: req.file.mimetype,
            storage: 'cloudinary'
          });
        }
      );

      uploadStream.end(req.file.buffer);
    } else {
      // 2. Graceful Fallback: write to local disk if Cloudinary credentials are not configured
      const rawExt = path.extname(req.file.originalname || '');
      const cleanExt = (rawExt ? rawExt.toLowerCase() : '.png').replace(/[^a-z0-9.]/gi, '');
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `${uniqueSuffix}${cleanExt}`;
      const filePath = path.join(uploadsDir, filename);

      try {
        fs.writeFileSync(filePath, req.file.buffer);
      } catch (fsErr) {
        console.error('Disk write error:', fsErr);
        return res.status(500).json({ error: 'فشل حفظ الملف على الخادم المحلي' });
      }

      // Determine correct protocol (HTTPS vs HTTP)
      const forwardedProto = req.headers['x-forwarded-proto'];
      const host = req.get('host') || '';
      const isProductionHost = !host.includes('localhost') && !host.includes('127.0.0.1');
      const isHttps = forwardedProto === 'https' || req.protocol === 'https' || isProductionHost;
      const protocol = isHttps ? 'https' : 'http';

      const baseUrl = process.env.APP_URL 
        ? process.env.APP_URL.replace(/\/$/, '') 
        : `${protocol}://${host}`;

      const fileUrl = `${baseUrl}/uploads/${filename}`;
      const relativePath = `/uploads/${filename}`;

      return res.json({
        url: fileUrl,
        path: relativePath,
        filename: filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        storage: 'local'
      });
    }
  });
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
    const payload = {
      ...req.body,
      title: req.body.title || req.body.name || 'طلب تصميم مخصص',
      image: req.body.image || req.body.logo || null,
      status: req.body.status || 'قيد المراجعة',
      author: req.body.author || req.body.clientName || 'عميل'
    };
    const design = await Design.create(payload);
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

// B2B Pricing Settings Route
router.get('/b2b/settings', async (req, res) => {
  try {
    const { Setting } = require('../models');
    // Fetch only B2B settings
    const settings = await Setting.findAll({
      where: {
        key: ['b2b_school_price', 'b2b_medical_price', 'b2b_security_price', 'b2b_hotel_price', 'b2b_discount_50', 'b2b_discount_200', 'b2b_discount_500']
      }
    });
    const settingsObj = {};
    settings.forEach(s => settingsObj[s.key] = s.value);
    res.json(settingsObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/b2b/settings', async (req, res) => {
  try {
    const { Setting } = require('../models');
    const settingsData = req.body;
    for (const [key, value] of Object.entries(settingsData)) {
      const existing = await Setting.findOne({ where: { key } });
      if (existing) {
        await existing.update({ value: String(value) });
      } else {
        await Setting.create({ key, value: String(value) });
      }
    }
    res.json({ message: 'B2B Settings saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// B2B Requests Routes
router.post('/b2b/requests', async (req, res) => {
  try {
    const { B2BRequest } = require('../models');
    const request = await B2BRequest.create(req.body);
    res.status(201).json(request);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/b2b/requests', async (req, res) => {
  try {
    const { B2BRequest } = require('../models');
    const requests = await B2BRequest.findAll({ order: [['createdAt', 'DESC']] });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/b2b/requests/:id/status', async (req, res) => {
  try {
    const { B2BRequest } = require('../models');
    await B2BRequest.update({ status: req.body.status }, { where: { id: req.params.id } });
    res.json({ message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/b2b/requests/:id', async (req, res) => {
  try {
    const { B2BRequest } = require('../models');
    await B2BRequest.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Samples Routes
router.use('/samples', require('./samples'));

// Partners Routes
router.get('/partners', async (req, res) => {
  try {
    const { Partner } = require('../models');
    await Partner.sync();
    let partners = await Partner.findAll({ order: [['order', 'ASC'], ['id', 'ASC']] });
    
    // Seed default partners if completely empty
    if (!partners || partners.length === 0) {
      const defaultPartners = [
        { name: 'مستشفى الشميساني التخصصي', image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300&auto=format&fit=crop&q=80', link: 'https://alshmaisani.com', order: 1 },
        { name: 'مدارس الكلية العلمية الإسلامية', image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=300&auto=format&fit=crop&q=80', link: 'https://islamic-college.edu.jo', order: 2 },
        { name: 'فندق وأجنحة لاند مارك عمان', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300&auto=format&fit=crop&q=80', link: 'https://landmarkamman.com', order: 3 },
        { name: 'شركة النسر للأمن والحماية', image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=300&auto=format&fit=crop&q=80', link: 'https://eaglesecurity.jo', order: 4 },
        { name: 'سلسلة مطاعم ورد الشام', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80', link: 'https://wardalsham.com', order: 5 },
        { name: 'أكاديمية رواد المستقبل الدولية', image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=300&auto=format&fit=crop&q=80', link: 'https://futureleaders.edu.jo', order: 6 }
      ];
      try {
        await Partner.bulkCreate(defaultPartners);
        partners = await Partner.findAll({ order: [['order', 'ASC'], ['id', 'ASC']] });
      } catch (e) {
        return res.json(defaultPartners.map((p, idx) => ({ id: idx + 1, ...p })));
      }
    }
    
    res.json(partners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/partners', async (req, res) => {
  try {
    const { Partner } = require('../models');
    await Partner.sync();
    const partner = await Partner.create(req.body);
    res.status(201).json(partner);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/partners/:id', async (req, res) => {
  try {
    const { Partner } = require('../models');
    await Partner.sync();
    await Partner.update(req.body, { where: { id: req.params.id } });
    const updated = await Partner.findByPk(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/partners/:id', async (req, res) => {
  try {
    const { Partner } = require('../models');
    await Partner.sync();
    await Partner.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Testimonials Routes
router.get('/testimonials', async (req, res) => {
  try {
    const { Testimonial } = require('../models');
    await Testimonial.sync();
    
    // For admin with query ?all=true, return all; otherwise return active
    const whereClause = req.query.all === 'true' ? {} : { isActive: true };
    let testimonials = await Testimonial.findAll({ 
      where: whereClause,
      order: [['order', 'ASC'], ['createdAt', 'DESC']] 
    });
    
    // Seed default testimonials if completely empty
    if (!testimonials || testimonials.length === 0) {
      const defaultTestimonials = [
        {
          name: 'فندق جراند بالاس عمان',
          role: 'إدارة الضيافة والمشتريات',
          comment: 'تعاملنا مع شركة القريني لتجهيز زي الاستقبال والشيفات، وكانت الخامة ممتازة والتفصيل دقيقاً جداً وبمستوى فندقي عالمي.',
          rating: 5,
          badge: 'قطاع الضيافة والفنادق',
          image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&auto=format&fit=crop&q=80',
          isActive: true,
          order: 1
        },
        {
          name: 'مستشفى الشميساني التخصصي',
          role: 'رئاسة التمريض والعمليات',
          comment: 'السكراب الطبي مريح للغاية في نوبات العمل الطويلة، قماش بارد ولا ينكمش مع الغسيل والتعقيم المتكرر، نشكركم على الاحترافية.',
          rating: 5,
          badge: 'القطاع الصحي والمستشفيات',
          image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=200&auto=format&fit=crop&q=80',
          isActive: true,
          order: 2
        },
        {
          name: 'مدارس الرواد الدولية',
          role: 'قسم شؤون الطلبة والهوية المدرسية',
          comment: 'جودة استثنائية للزي المدرسي والرياضي لطلابنا، التزام تام بمواعيد التسليم قبل بدء العام الدراسي وتطريز الشعار متقن جداً.',
          rating: 5,
          badge: 'القطاع التعليمي والمدارس',
          image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200&auto=format&fit=crop&q=80',
          isActive: true,
          order: 3
        },
        {
          name: 'شركة الحراسات الأمنية الحديثة',
          role: 'إدارة العمليات الميدانية',
          comment: 'البدلات الميدانية قوية وعملية وتتحمل أقصى ظروف العمل، والأهم من ذلك المظهر المهني المهيب الذي منحته لحراسنا.',
          rating: 5,
          badge: 'الأمن والحراسات',
          image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=200&auto=format&fit=crop&q=80',
          isActive: true,
          order: 4
        }
      ];
      try {
        await Testimonial.bulkCreate(defaultTestimonials);
        testimonials = await Testimonial.findAll({ 
          where: whereClause,
          order: [['order', 'ASC'], ['createdAt', 'DESC']] 
        });
      } catch (e) {
        return res.json(defaultTestimonials.map((t, idx) => ({ id: idx + 1, ...t })));
      }
    }
    
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/testimonials', async (req, res) => {
  try {
    const { Testimonial } = require('../models');
    await Testimonial.sync();
    const testimonial = await Testimonial.create(req.body);
    res.status(201).json(testimonial);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/testimonials/:id', async (req, res) => {
  try {
    const { Testimonial } = require('../models');
    await Testimonial.sync();
    await Testimonial.update(req.body, { where: { id: req.params.id } });
    const updated = await Testimonial.findByPk(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/testimonials/:id', async (req, res) => {
  try {
    const { Testimonial } = require('../models');
    await Testimonial.sync();
    await Testimonial.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
