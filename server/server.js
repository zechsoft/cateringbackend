require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const connectDB = require('./config/database');
const multer = require('multer');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Route imports
const menuRoutes = require('./routes/menuRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const eventRoutes = require('./routes/eventRoutes');
const blogRoutes = require('./routes/blogRoutes');
const serviceVideoRoutes = require('./routes/serviceVideoRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ================== SECURITY MIDDLEWARE ==================
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// ================== CORS CONFIGURATION ==================
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://catering-backend-6dyl.onrender.com',
  'https://your-production-domain.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin in development
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin) || 
        origin?.includes('localhost') || 
        origin?.includes('127.0.0.1')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// ================== PREFLIGHT HANDLER ==================
// Global OPTIONS handler - MUST come before routes
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || allowedOrigins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(204).end();
});

// ================== MIDDLEWARE ==================
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ================== FILE UPLOAD CONFIG ==================
const dirs = [
  '../uploads/images',
  '../uploads/videos',
  '../uploads/images/events',
  '../uploads/images/blogs',
  '../uploads/service-videos'
];

// Create upload directories
dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;
    
    if (req.baseUrl.includes('/blogs')) {
      uploadPath = path.join(__dirname, '../uploads/images/blogs');
    } else if (req.baseUrl.includes('/service-videos')) {
      uploadPath = path.join(__dirname, '../uploads/service-videos');
    } else {
      const isImage = file.mimetype.startsWith('image');
      uploadPath = isImage 
        ? path.join(__dirname, '../uploads/images')
        : path.join(__dirname, '../uploads/videos');
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/mpeg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// ================== ROUTES ==================
app.use('/api/menu', menuRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/service-videos', serviceVideoRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ================== ERROR HANDLING ==================
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: 'File upload error',
      error: err.message
    });
  }
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      message: 'CORS policy violation',
      allowedOrigins: allowedOrigins
    });
  }
  
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// ================== DATABASE & SERVER START ==================
connectDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
    });
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });