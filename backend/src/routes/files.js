const express = require('express');
const router = express.Router();
const File = require('../models/File');

// Get all files
router.get('/', async (req, res) => {
  try {
    const files = await File.find().sort({ updatedAt: -1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single file
router.get('/:id', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create file
router.post('/', async (req, res) => {
  try {
    const { name, content, language } = req.body;
    
    if (!name || !language) {
      return res.status(400).json({ error: 'Name and language are required' });
    }

    const file = new File({ name, content, language });
    await file.save();
    res.status(201).json(file);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update file
router.put('/:id', async (req, res) => {
  try {
    const { name, content, language } = req.body;
    
    const file = await File.findByIdAndUpdate(
      req.params.id,
      { name, content, language, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete file
router.delete('/:id', async (req, res) => {
  try {
    const file = await File.findByIdAndDelete(req.params.id);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
