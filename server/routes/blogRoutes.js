const express = require('express');
const router = express.Router();
const { blogImageUpload, cloudinary } = require('../config/cloudinary');
const Blog = require('../models/blogModel');

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
router.post('/', blogImageUpload.single('image'), async (req, res) => {
    try {
        const blogData = {
            title: req.body.title,
            content: req.body.content,
            author: req.body.author,
            tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
            published: req.body.published === 'true'
        };

        if (req.file) {
            blogData.imageUrl = req.file.secure_url;
            blogData.imagePublicId = req.file.public_id;
        }

        const blog = new Blog(blogData);
        const savedBlog = await blog.save();
        res.status(201).json(savedBlog);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a blog post
router.put('/:id', blogImageUpload.single('image'), async (req, res) => {
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
            // Delete old image from Cloudinary if it exists
            if (blog.imagePublicId) {
                try {
                    await cloudinary.uploader.destroy(blog.imagePublicId);
                } catch (cloudinaryError) {
                    console.error('Error deleting old image from Cloudinary:', cloudinaryError);
                }
            }
            
            blog.imageUrl = req.file.secure_url;
            blog.imagePublicId = req.file.public_id;
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

        // Delete associated image from Cloudinary if it exists
        if (blog.imagePublicId) {
            try {
                await cloudinary.uploader.destroy(blog.imagePublicId);
            } catch (cloudinaryError) {
                console.error('Error deleting image from Cloudinary:', cloudinaryError);
            }
        }

        await Blog.findByIdAndDelete(req.params.id);
        res.json({ message: 'Blog deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;