const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Event = require('../models/eventModel');

// Multer storage configuration for event images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/images/events');
    },
    filename: (req, file, cb) => {
        cb(null, 'event-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
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
        const eventData = {
            title: req.body.title,
            description: req.body.description,
            date: new Date(req.body.date),
            time: req.body.time,
            location: req.body.location,
            maxAttendees: req.body.maxAttendees || null,
            status: req.body.status || 'upcoming'
        };

        // Add image if uploaded
        if (req.file) {
            eventData.image = req.file.filename;
        }

        const event = new Event(eventData);
        const savedEvent = await event.save();
        res.status(201).json(savedEvent);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get all events
router.get('/', async (req, res) => {
    try {
        // Filter by status if provided
        const filter = {};
        if (req.query.status) {
            filter.status = req.query.status;
        }

        // Sort by date
        const events = await Event.find(filter).sort({ date: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get upcoming events
router.get('/upcoming', async (req, res) => {
    try {
        const currentDate = new Date();
        const events = await Event.find({
            date: { $gte: currentDate },
            status: 'upcoming'
        }).sort({ date: 1 });
        
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single event by ID
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update event
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const eventData = {
            title: req.body.title,
            description: req.body.description,
            date: new Date(req.body.date),
            time: req.body.time,
            location: req.body.location,
            maxAttendees: req.body.maxAttendees || null,
            status: req.body.status
        };

        // Add image if uploaded
        if (req.file) {
            eventData.image = req.file.filename;
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id, 
            eventData, 
            { new: true }
        );
        
        if (!updatedEvent) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        res.json(updatedEvent);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete event
router.delete('/:id', async (req, res) => {
    try {
        const deletedEvent = await Event.findByIdAndDelete(req.params.id);
        
        if (!deletedEvent) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Register for event (increment attendee count)
router.post('/:id/register', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        // Check if maximum attendees limit is reached
        if (event.maxAttendees && event.registeredAttendees >= event.maxAttendees) {
            return res.status(400).json({ message: 'Event is fully booked' });
        }
        
        // Increment the registeredAttendees count
        event.registeredAttendees += 1;
        await event.save();
        
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;