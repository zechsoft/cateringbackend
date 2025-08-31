const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    location: { type: String, required: true },
    imageUrl: { type: String }, // Cloudinary secure_url
    imagePublicId: { type: String }, // Cloudinary public_id for deletion
    maxAttendees: { type: Number },
    registeredAttendees: { type: Number, default: 0 },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);