const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Media = require('../models/mediaModel');

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = file.mimetype.startsWith('image') 
            ? './uploads/images' 
            : './uploads/videos';
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/mpeg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Upload media
router.post('/upload', upload.single('media'), async (req, res) => {
    try {
        const mediaType = req.file.mimetype.startsWith('image') ? 'image' : 'video';
        const media = new Media({
            type: mediaType,
            filename: req.file.filename,
            title: req.body.title || '',
            description: req.body.description || ''
        });
        
        const savedMedia = await media.save();
        res.status(201).json(savedMedia);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get all media
router.get('/', async (req, res) => {
    try {
        const media = await Media.find();
        res.json(media);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get media by type
router.get('/:type', async (req, res) => {
    try {
        const media = await Media.find({ type: req.params.type });
        res.json(media);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;