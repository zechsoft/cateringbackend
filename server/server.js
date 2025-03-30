require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const multer = require('multer');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// Database Configuration
// ======================
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
};

// ======================
// Middleware
// ======================
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// ======================
// File Upload Configuration
// ======================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = file.mimetype.startsWith('image') 
            ? path.join(__dirname, 'uploads/images')
            : path.join(__dirname, 'uploads/videos');
        
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 
        'image/png', 
        'image/gif',
        'video/mp4',
        'video/mpeg',
        'video/quicktime'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
    }
};

const upload = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// ======================
// Models
// ======================
const EventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    date: { type: Date, required: true },
    time: String,
    location: String,
    image: String,
    maxAttendees: Number,
    registeredAttendees: { type: Number, default: 0 },
    status: { type: String, enum: ['upcoming', 'ongoing', 'past'], default: 'upcoming' },
    createdAt: { type: Date, default: Date.now }
});

const Event = mongoose.model('Event', EventSchema);

const MediaSchema = new mongoose.Schema({
    type: { type: String, enum: ['image', 'video'], required: true },
    filename: { type: String, required: true },
    path: { type: String, required: true },
    title: String,
    description: String,
    size: Number,
    mimetype: String,
    uploadedAt: { type: Date, default: Date.now }
});

const Media = mongoose.model('Media', MediaSchema);

// ======================
// Routes
// ======================

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        uploads: {
            images: fs.existsSync(path.join(__dirname, 'uploads/images')),
            videos: fs.existsSync(path.join(__dirname, 'uploads/videos'))
        }
    });
});

// Media Routes
app.post('/api/media/upload', upload.single('media'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const media = new Media({
            type: req.file.mimetype.startsWith('image') ? 'image' : 'video',
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype,
            title: req.body.title,
            description: req.body.description
        });

        await media.save();
        res.status(201).json(media);
    } catch (error) {
        // Clean up uploaded file if error occurs
        if (req.file) fs.unlink(req.file.path, () => {});
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/media', async (req, res) => {
    try {
        const { type } = req.query;
        const query = type ? { type } : {};
        const media = await Media.find(query).sort({ uploadedAt: -1 });
        res.json(media);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Event Routes
app.get('/api/events', async (req, res) => {
    try {
        const { status, page = 1, limit = 10, search } = req.query;
        
        const query = {};
        if (status && status !== 'all') query.status = status;
        if (search) query.title = { $regex: search, $options: 'i' };

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { date: 1 }
        };

        const events = await Event.paginate(query, options);
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/events', async (req, res) => {
    try {
        const event = new Event(req.body);
        await event.save();
        res.status(201).json(event);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.post('/api/events/:id/register', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.maxAttendees && event.registeredAttendees >= event.maxAttendees) {
            return res.status(400).json({ message: 'Event is fully booked' });
        }

        event.registeredAttendees += 1;
        await event.save();
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Static Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ======================
// Server Initialization
// ======================
const startServer = async () => {
    try {
        await connectDB();
        
        // Ensure upload directories exist
        ['images', 'videos'].forEach(dir => {
            const dirPath = path.join(__dirname, 'uploads', dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Server startup failed:', error);
        process.exit(1);
    }
};

startServer();

// Handle shutdown gracefully
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
});