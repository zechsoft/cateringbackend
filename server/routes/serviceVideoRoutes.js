const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');

// Define ServiceVideo Schema
const serviceVideoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    filename: { type: String, required: true },
    description: { type: String },
    service: { type: String, required: true }, // e.g., "catering", "events", "cooking"
    featured: { type: Boolean, default: false },
    uploadDate: { type: Date, default: Date.now }
});

const ServiceVideo = mongoose.model('ServiceVideo', serviceVideoSchema);

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads/service-videos'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['video/mp4', 'video/mpeg', 'video/webm', 'video/quicktime'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only video files are allowed.'));
        }
    },
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB max file size
    }
});

// Upload service video
router.post('/upload', upload.single('video'), async (req, res) => {
    try {
        // Validate request
        if (!req.file) {
            return res.status(400).json({ message: 'No video file uploaded' });
        }

        if (!req.body.title || !req.body.service) {
            return res.status(400).json({ message: 'Title and service fields are required' });
        }

        // Create new service video entry
        const serviceVideo = new ServiceVideo({
            title: req.body.title,
            filename: req.file.filename,
            description: req.body.description || '',
            service: req.body.service,
            featured: req.body.featured === 'true'
        });

        const savedVideo = await serviceVideo.save();
        res.status(201).json(savedVideo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get all service videos
router.get('/', async (req, res) => {
    try {
        const videos = await ServiceVideo.find().sort({ uploadDate: -1 });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get videos by service type
router.get('/service/:serviceType', async (req, res) => {
    try {
        const videos = await ServiceVideo.find({ service: req.params.serviceType }).sort({ uploadDate: -1 });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get featured videos
router.get('/featured', async (req, res) => {
    try {
        const videos = await ServiceVideo.find({ featured: true }).sort({ uploadDate: -1 });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update video details
router.put('/:id', async (req, res) => {
    try {
        const updates = {
            title: req.body.title,
            description: req.body.description,
            service: req.body.service,
            featured: req.body.featured
        };
        
        // Remove undefined fields
        Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);
        
        const updatedVideo = await ServiceVideo.findByIdAndUpdate(
            req.params.id, 
            updates,
            { new: true }
        );
        
        if (!updatedVideo) {
            return res.status(404).json({ message: 'Video not found' });
        }
        
        res.json(updatedVideo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a video
router.delete('/:id', async (req, res) => {
    try {
        const video = await ServiceVideo.findByIdAndDelete(req.params.id);
        
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }
        
        // Note: You may want to add file system cleanup here to delete the actual file
        
        res.json({ message: 'Video deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;