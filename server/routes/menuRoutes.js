const express = require('express');
const router = express.Router();
const MenuItem = require('../models/menuModel');

// Create a new menu item
router.post('/', async (req, res) => {
    try {
        // Validate required fields
        if (!req.body.name || !req.body.category || !req.body.price) {
            return res.status(400).json({ 
                message: 'Name, category, and price are required fields' 
            });
        }

        // Create and save the new menu item
        const menuItem = new MenuItem({
            name: req.body.name,
            category: req.body.category,
            subcategory: req.body.subcategory || '',
            description: req.body.description || '',
            price: req.body.price,
            ingredients: req.body.ingredients || [],
            isAvailable: req.body.isAvailable !== false,
            tags: req.body.tags || []
        });

        const savedItem = await menuItem.save();
        res.status(201).json(savedItem);
    } catch (error) {
        res.status(400).json({ 
            message: 'Failed to create menu item',
            error: error.message 
        });
    }
});

// Get all menu items with filtering and sorting
router.get('/', async (req, res) => {
    try {
        // Build query based on request parameters
        const query = {};
        
        // Filter by category if provided
        if (req.query.category) {
            query.category = req.query.category;
        }
        
        // Filter by availability if provided
        if (req.query.available) {
            query.isAvailable = req.query.available === 'true';
        }

        // Sorting options
        const sort = {};
        if (req.query.sortBy) {
            sort[req.query.sortBy] = req.query.sortOrder === 'desc' ? -1 : 1;
        } else {
            sort.name = 1; // Default sort by name ascending
        }

        const menuItems = await MenuItem.find(query)
            .sort(sort)
            .select('-__v'); // Exclude version key

        res.json({
            count: menuItems.length,
            items: menuItems
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Failed to retrieve menu items',
            error: error.message 
        });
    }
});

// Get menu items by category
router.get('/category/:category', async (req, res) => {
    try {
        const menuItems = await MenuItem.find({ 
            category: req.params.category,
            isAvailable: true 
        }).sort({ name: 1 });

        if (!menuItems.length) {
            return res.status(404).json({ 
                message: 'No items found in this category' 
            });
        }

        res.json({
            category: req.params.category,
            count: menuItems.length,
            items: menuItems
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error retrieving category items',
            error: error.message 
        });
    }
});

// Get a single menu item
router.get('/:id', async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id)
            .select('-__v');

        if (!menuItem) {
            return res.status(404).json({ 
                message: 'Menu item not found' 
            });
        }

        res.json(menuItem);
    } catch (error) {
        res.status(500).json({ 
            message: 'Error retrieving menu item',
            error: error.message 
        });
    }
});

// Update a menu item
router.put('/:id', async (req, res) => {
    try {
        // Validate at least one field is being updated
        if (!Object.keys(req.body).length) {
            return res.status(400).json({ 
                message: 'No update data provided' 
            });
        }

        const updatedItem = await MenuItem.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { 
                new: true,
                runValidators: true // Ensure updates pass schema validation
            }
        ).select('-__v');

        if (!updatedItem) {
            return res.status(404).json({ 
                message: 'Menu item not found' 
            });
        }

        res.json({
            message: 'Menu item updated successfully',
            item: updatedItem
        });
    } catch (error) {
        res.status(400).json({ 
            message: 'Failed to update menu item',
            error: error.message 
        });
    }
});

// Delete a menu item
router.delete('/:id', async (req, res) => {
    try {
        const deletedItem = await MenuItem.findByIdAndDelete(req.params.id)
            .select('-__v');

        if (!deletedItem) {
            return res.status(404).json({ 
                message: 'Menu item not found' 
            });
        }

        res.json({
            message: 'Menu item deleted successfully',
            item: deletedItem
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Error deleting menu item',
            error: error.message 
        });
    }
});

module.exports = router;