const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Media = require('../models/mediaModel');

// Configure storage with absolute paths for production
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const basePath = path.join(__dirname, '../uploads');
        const uploadPath = file.mimetype.startsWith('image') 
            ? path.join(basePath, 'images')
            : path.join(basePath, 'videos');
        
        // Ensure directory exists
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '-');
        cb(null, `${Date.now()}-${sanitizedName}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 1 // Single file upload
    },
    fileFilter: (req, file, cb) => {
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
            cb(new Error(`Invalid file type. Only ${allowedTypes.join(', ')} are allowed.`));
        }
    }
});

// Upload media with enhanced error handling
router.post('/upload', upload.single('media'), async (req, res) => {
    try {
        // Validate file exists
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Validate required fields
        if (!req.body.title) {
            // Clean up uploaded file if validation fails
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({
                success: false,
                message: 'Title is required'
            });
        }

        const mediaType = req.file.mimetype.startsWith('image') ? 'image' : 'video';
        const media = new Media({
            type: mediaType,
            filename: req.file.filename,
            path: req.file.path,
            title: req.body.title,
            description: req.body.description || '',
            size: req.file.size,
            mimetype: req.file.mimetype
        });

        const savedMedia = await media.save();
        
        res.status(201).json({
            success: true,
            message: 'Media uploaded successfully',
            media: savedMedia
        });
    } catch (error) {
        // Clean up uploaded file if error occurs
        if (req.file) {
            fs.unlink(req.file.path, () => {});
        }
        
        res.status(400).json({
            success: false,
            message: 'Failed to upload media',
            error: error.message
        });
    }
});

// Get all media with filtering and pagination
router.get('/', async (req, res) => {
    try {
        const { type, limit, page } = req.query;
        const filter = {};
        
        if (type) filter.type = type;
        
        const options = {
            limit: parseInt(limit) || 20,
            page: parseInt(page) || 1,
            sort: { createdAt: -1 },
            select: '-__v -path' // Exclude internal fields
        };

        const result = await Media.paginate(filter, options);
        
        res.json({
            success: true,
            totalItems: result.totalDocs,
            totalPages: result.totalPages,
            currentPage: result.page,
            media: result.docs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve media',
            error: error.message
        });
    }
});

// Get media by type with enhanced response
router.get('/:type', async (req, res) => {
    try {
        const validTypes = ['image', 'video'];
        if (!validTypes.includes(req.params.type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid media type. Must be either "image" or "video"'
            });
        }

        const media = await Media.find({ type: req.params.type })
            .sort({ createdAt: -1 })
            .select('-__v -path');
            
        res.json({
            success: true,
            count: media.length,
            media
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve media',
            error: error.message
        });
    }
});

// Delete media by ID
router.delete('/:id', async (req, res) => {
    try {
        const media = await Media.findByIdAndDelete(req.params.id);
        
        if (!media) {
            return res.status(404).json({
                success: false,
                message: 'Media not found'
            });
        }
        
        // Delete the associated file
        fs.unlink(media.path, (err) => {
            if (err) console.error('Error deleting media file:', err);
        });
        
        res.json({
            success: true,
            message: 'Media deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete media',
            error: error.message
        });
    }
});

module.exports = router;