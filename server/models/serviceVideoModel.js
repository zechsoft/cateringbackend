// models/serviceVideoModel.js
const mongoose = require('mongoose');

const serviceVideoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    filename: { type: String, required: true }, // Cloudinary public_id
    videoUrl: { type: String, required: true }, // Cloudinary secure_url
    description: { type: String },
    service: { type: String, required: true }, // e.g., "catering", "events", "cooking"
    featured: { type: Boolean, default: false },
    uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ServiceVideo', serviceVideoSchema);
