const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Event = require('../models/eventModel');

// Configure storage with absolute paths for Render compatibility
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/images/events');
        fs.mkdirSync(uploadPath, { recursive: true }); // Ensure directory exists
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, 'event-' + Date.now() + path.extname(file.originalname));
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
            cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
        }
    }
});

// Create new event
router.post('/', upload.single('image'), async (req, res) => {
    try {
        // Validate required fields
        if (!req.body.title || !req.body.date || !req.body.location) {
            return res.status(400).json({ 
                message: 'Title, date and location are required fields' 
            });
        }

        const eventData = {
            title: req.body.title,
            description: req.body.description || '',
            date: new Date(req.body.date),
            time: req.body.time || '19:00',
            location: req.body.location,
            maxAttendees: parseInt(req.body.maxAttendees) || null,
            status: req.body.status || 'upcoming',
            registeredAttendees: 0,
            tags: req.body.tags ? req.body.tags.split(',') : []
        };

        // Add image if uploaded
        if (req.file) {
            eventData.image = {
                filename: req.file.filename,
                path: req.file.path,
                mimetype: req.file.mimetype,
                size: req.file.size
            };
        }

        const event = new Event(eventData);
        const savedEvent = await event.save();
        
        res.status(201).json({
            message: 'Event created successfully',
            event: savedEvent
        });
    } catch (error) {
        // Clean up uploaded file if error occurs
        if (req.file) {
            fs.unlink(req.file.path, () => {});
        }
        res.status(400).json({ 
            message: 'Failed to create event',
            error: error.message 
        });
    }
});

// Get all events with filtering
router.get('/', async (req, res) => {
    try {
        const filter = {};
        
        // Status filter
        if (req.query.status) {
            filter.status = req.query.status;
        }
        
        // Date range filter
        if (req.query.startDate && req.query.endDate) {
            filter.date = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }
        
        // Location filter
        if (req.query.location) {
            filter.location = new RegExp(req.query.location, 'i');
        }

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [events, total] = await Promise.all([
            Event.find(filter)
                .sort({ date: 1 })
                .skip(skip)
                .limit(limit)
                .select('-__v'),
            Event.countDocuments(filter)
        ]);

        res.json({
            total,
            page,
            pages: Math.ceil(total / limit),
            events
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Failed to retrieve events',
            error: error.message 
        });
    }
});

// Get upcoming events
router.get('/upcoming', async (req, res) => {
    try {
        const currentDate = new Date();
        const limit = parseInt(req.query.limit) || 5;
        
        const events = await Event.find({
            date: { $gte: currentDate },
            status: 'upcoming'
        })
        .sort({ date: 1 })
        .limit(limit)
        .select('title date time location image');

        res.json(events);
    } catch (error) {
        res.status(500).json({ 
            message: 'Failed to retrieve upcoming events',
            error: error.message 
        });
    }
});

// Get single event by ID
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .select('-__v');

        if (!event) {
            return res.status(404).json({ 
                message: 'Event not found' 
            });
        }

        res.json(event);
    } catch (error) {
        res.status(500).json({ 
            message: 'Failed to retrieve event',
            error: error.message 
        });
    }
});

// Update event
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        // Validate at least one field is being updated
        if (!Object.keys(req.body).length && !req.file) {
            return res.status(400).json({ 
                message: 'No update data provided' 
            });
        }

        const eventData = {
            title: req.body.title,
            description: req.body.description,
            date: req.body.date ? new Date(req.body.date) : undefined,
            time: req.body.time,
            location: req.body.location,
            maxAttendees: req.body.maxAttendees ? parseInt(req.body.maxAttendees) : undefined,
            status: req.body.status
        };

        // Add image if uploaded
        if (req.file) {
            eventData.image = {
                filename: req.file.filename,
                path: req.file.path,
                mimetype: req.file.mimetype,
                size: req.file.size
            };
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id, 
            eventData, 
            { 
                new: true,
                runValidators: true
            }
        ).select('-__v');

        if (!updatedEvent) {
            // Clean up uploaded file if event not found
            if (req.file) {
                fs.unlink(req.file.path, () => {});
            }
            return res.status(404).json({ 
                message: 'Event not found' 
            });
        }

        res.json({
            message: 'Event updated successfully',
            event: updatedEvent
        });
    } catch (error) {
        // Clean up uploaded file if error occurs
        if (req.file) {
            fs.unlink(req.file.path, () => {});
        }
        res.status(400).json({ 
            message: 'Failed to update event',
            error: error.message 
        });
    }
});

// Delete event
router.delete('/:id', async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);

        if (!event) {
            return res.status(404).json({ 
                message: 'Event not found' 
            });
        }

        // Delete associated image file if exists
        if (event.image && event.image.path) {
            fs.unlink(event.image.path, (err) => {
                if (err) console.error('Error deleting image file:', err);
            });
        }

        res.json({ 
            message: 'Event deleted successfully',
            deletedEvent: event 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Failed to delete event',
            error: error.message 
        });
    }
});

// Register for event
router.post('/:id/register', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ 
                message: 'Event not found' 
            });
        }
        
        // Check if maximum attendees limit is reached
        if (event.maxAttendees && event.registeredAttendees >= event.maxAttendees) {
            return res.status(400).json({ 
                message: 'Event is fully booked' 
            });
        }
        
        // Check if already registered (you might want to add user ID tracking)
        if (req.body.userId && event.attendees.includes(req.body.userId)) {
            return res.status(400).json({ 
                message: 'You are already registered for this event' 
            });
        }
        
        // Update registration
        event.registeredAttendees += 1;
        if (req.body.userId) {
            event.attendees.push(req.body.userId);
        }
        
        const updatedEvent = await event.save();
        
        res.json({
            message: 'Registration successful',
            registeredAttendees: updatedEvent.registeredAttendees,
            maxAttendees: updatedEvent.maxAttendees
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Failed to register for event',
            error: error.message 
        });
    }
});

module.exports = router;