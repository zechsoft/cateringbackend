const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    date: { 
        type: Date, 
        required: true 
    },
    time: { 
        type: String, 
        required: true 
    },
    location: { 
        type: String, 
        required: true 
    },
    image: { 
        type: String 
    },
    maxAttendees: { 
        type: Number 
    },
    registeredAttendees: { 
        type: Number, 
        default: 0 
    },
    status: { 
        type: String, 
        enum: ['upcoming', 'ongoing', 'past', 'cancelled'], 
        default: 'upcoming' 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Event', eventSchema);