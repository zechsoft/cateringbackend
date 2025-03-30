const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['image', 'video'], 
    required: true 
  },
  title: { 
    type: String, 
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  filename: { 
    type: String, 
    required: true,
    unique: true 
  },
  path: {  // Add storage path
    type: String,
    required: true
  },
  description: { 
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'] 
  },
  size: {  // File size in bytes
    type: Number,
    required: true
  },
  mimetype: {  // Store original MIME type
    type: String,
    required: true
  },
  dimensions: {  // For images
    width: Number,
    height: Number
  },
  duration: {  // For videos (in seconds)
    type: Number
  },
  uploadDate: { 
    type: Date, 
    default: Date.now 
  },
  lastAccessed: {  // Track usage
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,  // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add index for better query performance
mediaSchema.index({ type: 1, uploadDate: -1 });
mediaSchema.index({ filename: 1 }, { unique: true });

// Virtual for public URL (if using cloud storage)
mediaSchema.virtual('url').get(function() {
  return `/uploads/${this.type}s/${this.filename}`;
});

// Pre-save hook for additional processing
mediaSchema.pre('save', function(next) {
  this.lastAccessed = Date.now();
  next();
});

module.exports = mongoose.model('Media', mediaSchema);