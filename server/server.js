const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const connectDB = require('./config/database');
const menuRoutes = require('./routes/menuRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const eventRoutes = require('./routes/eventRoutes');
const blogRoutes = require('./routes/blogRoutes');
const serviceVideoRoutes = require('./routes/serviceVideoRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*', // Be more specific in production
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (keep for other static content like CSS, JS, etc.)
app.use(express.static(path.join(__dirname, '../public')));

// Database Connection
connectDB();

// Routes
app.use('/api/menu', menuRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/service-videos', serviceVideoRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Handle Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large' });
    }
    
    // Handle Cloudinary errors
    if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({ message: err.message });
    }
    
    res.status(500).send({
        message: 'Something went wrong!',
        error: err.message
    });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Cloudinary integration active - all media uploads will be stored in the cloud');
});