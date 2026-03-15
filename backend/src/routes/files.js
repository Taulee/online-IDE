const express = require('express');
const router = express.Router();
const File = require('../models/File');
const { authenticateToken, requirePermission } = require('../middleware/auth');

router.use(authenticateToken);

// Get all files
router.get('/', async (req, res) => {
  try {
    const files = await File.find({ owner: req.user._id }).sort({ updatedAt: -1 });
    res.json({ success: true, files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single file
router.get('/:id', async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json({ success: true, file });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create file
router.post('/', requirePermission('canSaveFiles'), async (req, res) => {
  try {
    const { name, content, language } = req.body;
    
    if (!name || !language) {
      return res.status(400).json({ error: 'Name and language are required' });
    }

    const file = new File({
      owner: req.user._id,
      name,
      content,
      language
    });
    await file.save();
    res.status(201).json({ success: true, file });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update file
router.put('/:id', requirePermission('canSaveFiles'), async (req, res) => {
  try {
    const { name, content, language } = req.body;
    
    const file = await File.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { name, content, language, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json({ success: true, file });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete file
router.delete('/:id', requirePermission('canSaveFiles'), async (req, res) => {
  try {
    const file = await File.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
