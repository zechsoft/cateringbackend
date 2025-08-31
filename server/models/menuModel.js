// models/menuModel.js
const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    category: { type: String, required: true },
    subcategory: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);