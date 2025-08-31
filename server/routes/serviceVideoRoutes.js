// routes/serviceVideoRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { serviceVideoUpload, cloudinary } = require('../config/cloudinary');

// Define ServiceVideo Schema
const serviceVideoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    filename: { type: String, required: true }, // Cloudinary public_id
    videoUrl: { type: String, required: true }, // Cloudinary secure_url
    description: { type: String },
    service: { type: String, required: true }, // e.g., "catering", "events", "cooking"
    featured: { type: Boolean, default: false },
    uploadDate: { type: Date, default: Date.now }
});

const ServiceVideo = mongoose.model('ServiceVideo', serviceVideoSchema);

// Upload service video
router.post('/upload', serviceVideoUpload.single('video'), async (req, res) => {
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
            filename: req.file.public_id,
            videoUrl: req.file.secure_url,
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
        const video = await ServiceVideo.findById(req.params.id);
        
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }
        
        // Delete from Cloudinary
        try {
            await cloudinary.uploader.destroy(video.filename, { resource_type: 'video' });
        } catch (cloudinaryError) {
            console.error('Error deleting from Cloudinary:', cloudinaryError);
        }
        
        // Delete from database
        await ServiceVideo.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Video deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;