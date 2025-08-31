// routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const { eventImageUpload, cloudinary } = require('../config/cloudinary');
const Event = require('../models/eventModel');

// Create new event
router.post('/', eventImageUpload.single('image'), async (req, res) => {
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
            eventData.imageUrl = req.file.secure_url;
            eventData.imagePublicId = req.file.public_id;
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
router.put('/:id', eventImageUpload.single('image'), async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Update event fields
        event.title = req.body.title || event.title;
        event.description = req.body.description || event.description;
        event.date = req.body.date ? new Date(req.body.date) : event.date;
        event.time = req.body.time || event.time;
        event.location = req.body.location || event.location;
        event.maxAttendees = req.body.maxAttendees || event.maxAttendees;
        event.status = req.body.status || event.status;

        // Handle image update
        if (req.file) {
            // Delete old image from Cloudinary if it exists
            if (event.imagePublicId) {
                try {
                    await cloudinary.uploader.destroy(event.imagePublicId);
                } catch (cloudinaryError) {
                    console.error('Error deleting old image from Cloudinary:', cloudinaryError);
                }
            }
            
            event.imageUrl = req.file.secure_url;
            event.imagePublicId = req.file.public_id;
        }

        const updatedEvent = await event.save();
        res.json(updatedEvent);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete event
router.delete('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        // Delete associated image from Cloudinary if it exists
        if (event.imagePublicId) {
            try {
                await cloudinary.uploader.destroy(event.imagePublicId);
            } catch (cloudinaryError) {
                console.error('Error deleting image from Cloudinary:', cloudinaryError);
            }
        }
        
        await Event.findByIdAndDelete(req.params.id);
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