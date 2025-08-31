// ===== CLOUDINARY CONFIGURATION =====
// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Generic storage configuration
const createCloudinaryStorage = (folder, allowedFormats) => {
    return new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: folder,
            allowed_formats: allowedFormats,
            transformation: [
                { quality: 'auto', fetch_format: 'auto' }
            ]
        }
    });
};

// Image storage
const imageStorage = createCloudinaryStorage('restaurant/images', ['jpg', 'jpeg', 'png', 'gif']);

// Video storage
const videoStorage = createCloudinaryStorage('restaurant/videos', ['mp4', 'mpeg', 'webm', 'mov']);

// Blog image storage
const blogImageStorage = createCloudinaryStorage('restaurant/blogs', ['jpg', 'jpeg', 'png', 'gif']);

// Event image storage
const eventImageStorage = createCloudinaryStorage('restaurant/events', ['jpg', 'jpeg', 'png', 'gif']);

// Service video storage
const serviceVideoStorage = createCloudinaryStorage('restaurant/service-videos', ['mp4', 'mpeg', 'webm', 'mov']);

// Create upload middleware
const createUpload = (storage, fileSize = 10 * 1024 * 1024) => {
    return multer({
        storage: storage,
        limits: {
            fileSize: fileSize
        }
    });
};

// Export configurations
module.exports = {
    cloudinary,
    imageUpload: createUpload(imageStorage),
    videoUpload: createUpload(videoStorage, 100 * 1024 * 1024), // 100MB for videos
    blogImageUpload: createUpload(blogImageStorage),
    eventImageUpload: createUpload(eventImageStorage),
    serviceVideoUpload: createUpload(serviceVideoStorage, 100 * 1024 * 1024)
};
