const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/database');

// Routes
const mediaRoutes = require('./routes/mediaRoutes');
// ... other routes

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure upload directories exist
const uploadDirs = [
    path.join(__dirname, '../uploads/images'),
    path.join(__dirname, '../uploads/videos')
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Database Connection
connectDB();

// Routes
app.use('/api/media', mediaRoutes);
// ... other routes

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        uploads: {
            images: fs.existsSync(path.join(__dirname, '../uploads/images')),
            videos: fs.existsSync(path.join(__dirname, '../uploads/videos'))
        }
    });
});

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: err.message || 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});