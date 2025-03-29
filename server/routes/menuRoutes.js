const express = require('express');
const router = express.Router();
const MenuItem = require('../models/menuModel');

// Create a new menu item
router.post('/', async (req, res) => {
    try {
        const menuItem = new MenuItem(req.body);
        const savedItem = await menuItem.save();
        res.status(201).json(savedItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get all menu items
router.get('/', async (req, res) => {
    try {
        const menuItems = await MenuItem.find();
        res.json(menuItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get menu items by category
router.get('/category/:category', async (req, res) => {
    try {
        const menuItems = await MenuItem.find({ category: req.params.category });
        res.json(menuItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update a menu item
router.put('/:id', async (req, res) => {
    try {
        const updatedItem = await MenuItem.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true }
        );
        res.json(updatedItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a menu item
// Add this method to your existing routes
// Delete a menu item
router.delete('/:id', async (req, res) => {
    try {
        const menuItem = await MenuItem.findByIdAndDelete(req.params.id);
        
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        res.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting menu item', error: error.message });
    }
});

module.exports = router;
