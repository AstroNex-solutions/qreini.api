require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const { sequelize, User } = require('./src/models');
const apiRoutes = require('./src/routes/api');
const authRoutes = require('./src/routes/auth');
const customerAuthRoutes = require('./src/routes/customerAuth');

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

// Middleware
app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: false })); // To allow image loading from other origins
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));

// Socket.io injection
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Initialize Cron Jobs
require('./src/cron/sampleCron');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerAuthRoutes);
app.use('/api', apiRoutes);

// Socket Events
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4500;

async function initAdmin() {
  const adminEmail = 'admin@qreini.com';
  const existingAdmin = await User.findOne({ where: { email: adminEmail } });
  
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    await User.create({
      name: 'أدمن النظام',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin'
    });
    console.log('Default admin created: admin@qreini.com / admin123');
  }
}

async function autoSeedIfEmpty() {
  const { Product, Offer, Setting, Customer } = require('./src/models');
  const count = await Product.count();
  if (count === 0) {
    console.log('Seeding initial Qreini products and offers...');
    await Product.bulkCreate([
      {
        name: 'زي مدرسي فاخر - طقم كامل للمرحلة المتوسطة والثانوية',
        description: 'طقم زي مدرسي مصنع من أجود خامات القطن والبوليستر المقاوم للتجعد والبهتان، متوافق مع معايير وزارة التعليم.',
        price: 35.00,
        sku: 'SCH-UNIF-001',
        stock: 150,
        sourceType: 'internal',
        category: 'زي مدرسي',
        salesCount: 142,
        image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'سكراب طبي مضاد للميكروبات (Medical Scrub Set)',
        description: 'زي طبي مريح وأنيق للأطباء والتمريض، مصمم بقماش مرن مضاد للسوائل والبكتيريا ومزود بجيوب متفرقة.',
        price: 25.00,
        sku: 'MED-SCRUB-002',
        stock: 220,
        sourceType: 'internal',
        category: 'زي مستشفيات',
        salesCount: 290,
        image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'لاب كوت أطباء أبيض فاخر (Lab Coat Premium)',
        description: 'معطف أطباء أبيض ناصع بخامة قطنية 100% مسامية وخياطة مزدوجة عالية التحمل.',
        price: 18.00,
        sku: 'MED-COAT-003',
        stock: 180,
        sourceType: 'internal',
        category: 'زي مستشفيات',
        salesCount: 210,
        image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'بدلة حراسات أمنية تكتيكية مخصصة',
        description: 'بدلة أمنية عالية التحمل للمؤسسات والشركات الأمنية، تشمل القميص والبناطيل مع مكان شارات وكتفيات.',
        price: 48.00,
        sku: 'SEC-SUIT-004',
        stock: 90,
        sourceType: 'internal',
        category: 'زي أمني',
        salesCount: 88,
        image: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'طقم الشيف والشيف المساعد لقطاع الفنادق والمطاعم',
        description: 'جاكيت شيف ابيض مضاد للحرارة والبقع مع بنطال ومريول ومريلة مطبخ احترافية.',
        price: 32.00,
        sku: 'HTL-CHEF-005',
        stock: 110,
        sourceType: 'internal',
        category: 'زي فنادق',
        salesCount: 160,
        image: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'زي استقبال وفندقة فاخر (Hospitality Reception Uniform)',
        description: 'بليزر وبنطال رسميان لموظفي الاستقبال بالفنادق والمؤسسات مع إمكانية مطابقة الألوان وتطريز الشعار.',
        price: 55.00,
        sku: 'HTL-RCP-006',
        stock: 75,
        sourceType: 'internal',
        category: 'زي فنادق',
        salesCount: 64,
        image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'مريول مدرسي ابتدائي كحلي + قميص أبيض',
        description: 'تصميم مريح وأنيق للصغيرات بخامات قطنية تناسب الاستخدام اليومي والحركة.',
        price: 22.00,
        sku: 'SCH-PUPIL-007',
        stock: 300,
        sourceType: 'internal',
        category: 'زي مدرسي',
        salesCount: 310,
        image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80'
      },
      {
        name: 'قماش يونيفرم بوليستر قطن ممتاز (لفة 50 متر)',
        description: 'أقمشة القريني المعززة ومقاومة الانكماش مخصصة لمعامل التفصيل والمؤسسات الكبرى.',
        price: 95.00,
        sku: 'FAB-ROLL-008',
        stock: 45,
        sourceType: 'internal',
        category: 'أخرى',
        salesCount: 38,
        image: 'https://images.unsplash.com/photo-1528458876861-544fd1761a91?w=600&auto=format&fit=crop&q=80'
      }
    ]);

    await Offer.bulkCreate([
      {
        title: 'عرض المدارس والجامعات 2026',
        description: 'خصم 20% عند طلب 50 قطعة فأكثر لمؤسستك التعليمية مع تطريز الشعار مجاناً.',
        discountCode: 'SCHOOL20',
        discountPercentage: 20,
        expiryDate: '2026-12-31'
      },
      {
        title: 'عرض التجهيزات الطبية الكبرى',
        description: 'شحن مجاني وتوصيل سريع للمستشفيات والمستوصفات على كافة الموديلات.',
        discountCode: 'MEDFREE',
        discountPercentage: 15,
        expiryDate: '2026-12-31'
      }
    ]);

    await Setting.bulkCreate([
      { key: 'storeName', value: 'شركة القريني للزي الموحد والأقمشة' },
      { key: 'phone', value: '+962 6 5000000' },
      { key: 'email', value: 'sales@qreini.com' },
      { key: 'address', value: 'عمان - المملكة الأردنية الهاشمية' },
      { key: 'announcement', value: '🎉 عروض الموسم: خصم 20% على طلبات الزي المدرسي والطبي المؤسسي + شحن مجاني للطلبات فوق 50 د.أ!' }
    ]);

    await Customer.bulkCreate([
      { name: 'مدارس الرواد الأهلية', email: 'info@alrowad.edu.sa', phone: '0501234567', totalPurchases: 15400.00 },
      { name: 'مستشفى الشفاء التخصصي', email: 'procurement@alshifa.com', phone: '0559876543', totalPurchases: 28900.00 },
      { name: 'مجموعة الفنادق العربية', email: 'purchasing@arabianhotels.com', phone: '0541112233', totalPurchases: 9400.00 }
    ]);

    console.log('Initial seed completed successfully!');
  }
}

async function ensureDatabaseExists() {
  const mysql = require('mysql2/promise');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'qreini_db'}\`;`);
    await connection.end();
    console.log(`MySQL Database '${process.env.DB_NAME || 'qreini_db'}' verified/created successfully`);
  } catch (err) {
    console.warn('MySQL Database initialization check notice:', err.message);
  }
}

// Connect to DB and Start Server
async function startServer() {
  try {
    await ensureDatabaseExists();
    
    // Authenticate and sync Sequelize models with MySQL
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('MySQL Database connected and synced via Sequelize successfully');
    
    await initAdmin();
    await autoSeedIfEmpty();
    
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the MySQL database:', error);
  }
}

startServer();
