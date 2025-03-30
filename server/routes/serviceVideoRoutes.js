const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Enhanced ServiceVideo Schema
const serviceVideoSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    filename: { 
        type: String, 
        required: true,
        unique: true
    },
    path: {
        type: String,
        required: true
    },
    description: { 
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    service: { 
        type: String, 
        required: [true, 'Service type is required'],
        enum: ['catering', 'events', 'cooking', 'other']
    },
    featured: { 
        type: Boolean, 
        default: false 
    },
    duration: {
        type: Number // in seconds
    },
    size: {
        type: Number // in bytes
    },
    mimetype: {
        type: String
    },
    uploadDate: { 
        type: Date, 
        default: Date.now 
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

const ServiceVideo = mongoose.model('ServiceVideo', serviceVideoSchema);

// Configure storage with absolute paths for Render
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads/service-videos');
        fs.mkdirSync(uploadPath, { recursive: true }); // Ensure directory exists
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '-');
        cb(null, `${Date.now()}-${sanitizedName}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'video/mp4', 
            'video/mpeg', 
            'video/webm', 
            'video/quicktime',
            'video/x-msvideo' // avi
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type. Only ${allowedTypes.join(', ')} are allowed.`));
        }
    },
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
    }
});

// Upload service video
router.post('/upload', upload.single('video'), async (req, res) => {
    try {
        // Validate request
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                message: 'No video file uploaded' 
            });
        }

        if (!req.body.title || !req.body.service) {
            // Clean up uploaded file if validation fails
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({ 
                success: false,
                message: 'Title and service fields are required' 
            });
        }

        // Create new service video entry
        const serviceVideo = new ServiceVideo({
            title: req.body.title,
            filename: req.file.filename,
            path: req.file.path,
            description: req.body.description || '',
            service: req.body.service,
            featured: req.body.featured === 'true',
            size: req.file.size,
            mimetype: req.file.mimetype
            // Note: You might want to add duration extraction using a library like ffprobe
        });

        const savedVideo = await serviceVideo.save();
        
        res.status(201).json({
            success: true,
            message: 'Video uploaded successfully',
            video: savedVideo
        });
    } catch (error) {
        // Clean up uploaded file if error occurs
        if (req.file) {
            fs.unlink(req.file.path, () => {});
        }
        
        res.status(400).json({ 
            success: false,
            message: 'Failed to upload video',
            error: error.message 
        });
    }
});

// Get all service videos with filtering
router.get('/', async (req, res) => {
    try {
        const { service, featured, limit } = req.query;
        const filter = {};
        
        if (service) filter.service = service;
        if (featured) filter.featured = featured === 'true';
        
        const queryLimit = parseInt(limit) || 20;
        
        const videos = await ServiceVideo.find(filter)
            .sort({ createdAt: -1 })
            .limit(queryLimit)
            .select('-__v -path'); // Exclude sensitive/irrelevant fields
            
        res.json({
            success: true,
            count: videos.length,
            videos
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve videos',
            error: error.message 
        });
    }
});

// Get video by ID
router.get('/:id', async (req, res) => {
    try {
        const video = await ServiceVideo.findById(req.params.id)
            .select('-__v -path');
            
        if (!video) {
            return res.status(404).json({ 
                success: false,
                message: 'Video not found' 
            });
        }
        
        res.json({
            success: true,
            video
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve video',
            error: error.message 
        });
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
        
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'No valid fields to update' 
            });
        }
        
        const updatedVideo = await ServiceVideo.findByIdAndUpdate(
            req.params.id, 
            updates,
            { 
                new: true,
                runValidators: true
            }
        ).select('-__v -path');
        
        if (!updatedVideo) {
            return res.status(404).json({ 
                success: false,
                message: 'Video not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Video updated successfully',
            video: updatedVideo
        });
    } catch (error) {
        res.status(400).json({ 
            success: false,
            message: 'Failed to update video',
            error: error.message 
        });
    }
});

// Delete a video
router.delete('/:id', async (req, res) => {
    try {
        const video = await ServiceVideo.findByIdAndDelete(req.params.id);
        
        if (!video) {
            return res.status(404).json({ 
                success: false,
                message: 'Video not found' 
            });
        }
        
        // Delete the associated file
        fs.unlink(video.path, (err) => {
            if (err) console.error('Error deleting video file:', err);
        });
        
        res.json({ 
            success: true,
            message: 'Video deleted successfully',
            deletedVideo: {
                id: video._id,
                title: video.title
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete video',
            error: error.message 
        });
    }
});

module.exports = router;