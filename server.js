require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const { sequelize, User } = require('./src/models');
const apiRoutes = require('./src/routes/api');
const authRoutes = require('./src/routes/auth');

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

app.use('/api', apiRoutes);

// Socket Events
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

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

// Connect to DB and Start Server
async function startServer() {
  try {
    // Sync models
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully');
    
    await initAdmin();
    
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

startServer();
