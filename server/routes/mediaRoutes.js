const express = require('express');
const router = express.Router();
const { imageUpload, videoUpload, cloudinary } = require('../config/cloudinary');
const Media = require('../models/mediaModel');

// Upload media with dynamic multer based on file type
router.post('/upload', (req, res, next) => {
    // Determine upload type based on the file
    const uploadMiddleware = req.headers['content-type']?.includes('video') 
        ? videoUpload.single('media')
        : imageUpload.single('media');
    
    uploadMiddleware(req, res, next);
}, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const mediaType = req.file.resource_type === 'video' ? 'video' : 'image';
        
        const media = new Media({
            type: mediaType,
            filename: req.file.public_id,
            mediaUrl: req.file.secure_url,
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
        const media = await Media.find().sort({ uploadDate: -1 });
        res.json(media);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get media by type
router.get('/:type', async (req, res) => {
    try {
        const media = await Media.find({ type: req.params.type }).sort({ uploadDate: -1 });
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

        // Delete from Cloudinary
        try {
            const resourceType = media.type === 'video' ? 'video' : 'image';
            await cloudinary.uploader.destroy(media.filename, { resource_type: resourceType });
        } catch (cloudinaryError) {
            console.error('Error deleting from Cloudinary:', cloudinaryError);
        }

        // Remove from database
        await Media.findByIdAndDelete(req.params.id);

        res.json({ message: 'Media deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;