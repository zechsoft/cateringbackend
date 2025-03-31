const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Media = require('../models/mediaModel');

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = file.mimetype.startsWith('image')
            ? path.join(__dirname, '../../uploads/images')  // Fix path to use absolute path
            : path.join(__dirname, '../../uploads/videos'); // Fix path to use absolute path
        
        // Ensure directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Create a safer filename
        const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '-');
        cb(null, safeName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/mpeg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, MP4, and MPEG are allowed.'));
        }
    }
});

// Upload media with better error handling
router.post('/upload', (req, res) => {
    upload.single('media')(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ message: err.message });
        }
        
        // Check if file exists in request
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        try {
            const mediaType = req.file.mimetype.startsWith('image') ? 'image' : 'video';
            const media = new Media({
                type: mediaType,
                filename: req.file.filename,
                title: req.body.title || '',
                description: req.body.description || ''
            });
            
            media.save()
                .then(savedMedia => {
                    res.status(201).json(savedMedia);
                })
                .catch(error => {
                    console.error('Database save error:', error);
                    res.status(500).json({ message: error.message });
                });
        } catch (error) {
            console.error('Processing error:', error);
            res.status(500).json({ message: error.message });
        }
    });
});

// Get all media
router.get('/', async (req, res) => {
    try {
        const media = await Media.find().sort({ createdAt: -1 }); // Sort by newest first
        res.json(media);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get media by type
router.get('/type/:type', async (req, res) => {
    try {
        const media = await Media.find({ type: req.params.type }).sort({ createdAt: -1 });
        res.json(media);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Edit media (update metadata)
router.put('/:id', async (req, res) => {
    try {
        const { title, description } = req.body;
        const updatedMedia = await Media.findByIdAndUpdate(
            req.params.id,
            { title, description },
            { new: true }
        );
        
        if (!updatedMedia) {
            return res.status(404).json({ message: 'Media not found' });
        }
        
        res.json(updatedMedia);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete media
router.delete('/:id', async (req, res) => {
    try {
        const media = await Media.findById(req.params.id);
        
        if (!media) {
            return res.status(404).json({ message: 'Media not found' });
        }
        
        // Delete the file from the filesystem
        const filePath = path.join(
            __dirname, 
            '../../uploads', 
            media.type === 'image' ? 'images' : 'videos', 
            media.filename
        );
        
        // Check if file exists before attempting to delete
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`File deleted: ${filePath}`);
        } else {
            console.log(`File not found: ${filePath}`);
        }
        
        // Remove from database
        await Media.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Media deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;