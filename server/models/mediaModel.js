
const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  type: { type: String, enum: ['image', 'video'], required: true },
  title: { type: String },
  filename: { type: String, required: true },
  description: { type: String },
  uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Media', mediaSchema);