const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Event = require('../models/eventModel');

// Configure storage with absolute paths
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads/images/events');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `event-${Date.now()}${ext}`;
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, and GIF images are allowed'));
        }
    }
});

// Create new event
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { title, description, date, time, location, maxAttendees } = req.body;
        
        if (!title || !date || !location) {
            throw new Error('Title, date, and location are required');
        }

        const eventData = {
            title,
            description: description || '',
            date: new Date(date),
            time: time || '19:00',
            location,
            maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
            status: 'upcoming',
            registeredAttendees: 0
        };

        if (req.file) {
            eventData.image = req.file.filename;
        }

        const event = new Event(eventData);
        const savedEvent = await event.save();
        
        res.status(201).json({
            success: true,
            event: savedEvent
        });
    } catch (error) {
        if (req.file) {
            fs.unlink(req.file.path, () => {});
        }
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Get all events with filtering
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        
        if (status) {
            filter.status = status;
        }

        const events = await Event.find(filter)
            .sort({ date: 1 })
            .select('-__v');
            
        res.json({
            success: true,
            count: events.length,
            events
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch events'
        });
    }
});

// Get upcoming events
router.get('/upcoming', async (req, res) => {
    try {
        const currentDate = new Date();
        const events = await Event.find({
            date: { $gte: currentDate },
            status: 'upcoming'
        })
        .sort({ date: 1 })
        .select('-__v');
        
        res.json({
            success: true,
            count: events.length,
            events
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch upcoming events'
        });
    }
});

// Get single event
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .select('-__v');
            
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        res.json({
            success: true,
            event
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch event'
        });
    }
});

// Update event
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const updates = {
            title: req.body.title,
            description: req.body.description,
            date: req.body.date ? new Date(req.body.date) : undefined,
            time: req.body.time,
            location: req.body.location,
            maxAttendees: req.body.maxAttendees ? parseInt(req.body.maxAttendees) : null,
            status: req.body.status
        };

        if (req.file) {
            updates.image = req.file.filename;
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).select('-__v');
        
        if (!updatedEvent) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        res.json({
            success: true,
            event: updatedEvent
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Delete event
router.delete('/:id', async (req, res) => {
    try {
        const deletedEvent = await Event.findByIdAndDelete(req.params.id);
        
        if (!deletedEvent) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete event'
        });
    }
});

// Register for event
router.post('/:id/register', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        if (event.maxAttendees && event.registeredAttendees >= event.maxAttendees) {
            return res.status(400).json({
                success: false,
                message: 'Event is fully booked'
            });
        }
        
        event.registeredAttendees += 1;
        await event.save();
        
        res.json({
            success: true,
            registeredAttendees: event.registeredAttendees,
            maxAttendees: event.maxAttendees
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to register for event'
        });
    }
});

module.exports = router;