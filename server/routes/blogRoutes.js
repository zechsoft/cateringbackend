const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Blog = require('../models/blogModel');

// Set up multer for blog image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads/images/blogs');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
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

// Get all blogs
router.get('/', async (req, res) => {
    try {
        const blogs = await Blog.find(req.query.published === 'true' ? { published: true } : {})
            .sort({ createdAt: -1 });
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get a single blog by ID
router.get('/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        res.json(blog);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new blog post with image upload
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const blogData = {
            title: req.body.title,
            content: req.body.content,
            author: req.body.author,
            tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
            published: req.body.published === 'true'
        };

        if (req.file) {
            blogData.imageUrl = `/uploads/images/blogs/${req.file.filename}`;
        }

        const blog = new Blog(blogData);
        const savedBlog = await blog.save();
        res.status(201).json(savedBlog);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a blog post
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        // Update blog fields
        blog.title = req.body.title || blog.title;
        blog.content = req.body.content || blog.content;
        blog.author = req.body.author || blog.author;
        blog.published = req.body.published === 'true';
        
        if (req.body.tags) {
            blog.tags = req.body.tags.split(',').map(tag => tag.trim());
        }
        
        // Handle image update
        if (req.file) {
            // Delete old image if it exists
            if (blog.imageUrl) {
                const oldImagePath = path.join(__dirname, '../../', blog.imageUrl);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            blog.imageUrl = `/uploads/images/blogs/${req.file.filename}`;
        }

        const updatedBlog = await blog.save();
        res.json(updatedBlog);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a blog post
router.delete('/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        // Delete associated image if it exists
        if (blog.imageUrl) {
            const imagePath = path.join(__dirname, '../../', blog.imageUrl);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await Blog.findByIdAndDelete(req.params.id);
        res.json({ message: 'Blog deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;