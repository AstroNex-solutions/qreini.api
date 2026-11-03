
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const { sequelize, User } = require('./src/models');
const apiRoutes = require('./src/routes/api');
const authRoutes = require('./src/routes/auth');
const customerAuthRoutes = require('./src/routes/customerAuth');

const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// CORS Configuration
const corsOptions = {
  origin: [
    'https://qreiniuniform.com',
    'https://www.qreiniuniform.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With'
  ],
  credentials: true,
  optionsSuccessStatus: 204
};

// Apply CORS BEFORE other middleware and routes
app.use(cors(corsOptions));

// Handle preflight requests
app.options(/.*/, cors(corsOptions));

// Security
app.use(helmet({
  crossOriginResourcePolicy: false
}));

app.use(morgan('dev'));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({
  limit: '50mb',
  extended: true
}));

// Static file serving for uploads with CORS, absolute path, and fallback support
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

const serveUploads = express.static(uploadsPath, {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
});

app.use('/uploads', serveUploads);
app.use('/api/uploads', serveUploads);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: [
      'https://qreiniuniform.com',
      'https://www.qreiniuniform.com'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Cron Jobs
require('./src/cron/sampleCron');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerAuthRoutes);
app.use('/api', apiRoutes);

// Socket Events
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

async function initAdmin() {
  const adminEmail = 'admin@qreini.com';

  const existingAdmin = await User.findOne({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await User.create({
      name: 'أدمن النظام',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin'
    });

    console.log('Default admin created');
  }
}

async function startServer() {
  try {
    await sequelize.authenticate();

    await sequelize.sync({ alter: false });

    console.log('MySQL Database connected successfully');

    await initAdmin();

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Unable to connect to MySQL:', error);
  }
}

startServer();
