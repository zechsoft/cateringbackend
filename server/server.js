const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/database');

// Import routes
const menuRoutes = require('./routes/menuRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const eventRoutes = require('./routes/eventRoutes');
const blogRoutes = require('./routes/blogRoutes');
const serviceVideoRoutes = require('./routes/serviceVideoRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced CORS configuration
app.use(cors({
    origin: [
        'http://localhost:3000', // Development
        'https://your-frontend-domain.com' // Production
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure upload directories exist
const uploadDirs = [
    path.join(__dirname, 'uploads/images'),
    path.join(__dirname, 'uploads/videos'),
    path.join(__dirname, 'uploads/images/events'),
    path.join(__dirname, 'uploads/images/blogs'),
    path.join(__dirname, 'uploads/service-videos')
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Database connection
connectDB();

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Mount routes
app.use('/api/menu', menuRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/service-videos', serviceVideoRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Endpoint not found: ${req.originalUrl}`
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});