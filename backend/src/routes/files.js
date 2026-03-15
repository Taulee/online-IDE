const express = require('express');
const router = express.Router();
const File = require('../models/File');
const { authenticateToken, requirePermission } = require('../middleware/auth');

router.use(authenticateToken);
const VALID_LANGUAGES = ['python', 'cpp', 'nodejs'];

// Get all files
router.get('/', async (req, res) => {
  try {
    const files = await File.find({ owner: req.user._id }).sort({ updatedAt: -1 });
    res.json({ success: true, files });
  } catch (error) {
    res.status(500).json({ error: '获取文件列表失败' });
  }
});

// Get single file
router.get('/:id', async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) {
      return res.status(404).json({ error: '文件不存在' });
    }
    res.json({ success: true, file });
  } catch (error) {
    res.status(500).json({ error: '读取文件失败' });
  }
});

// Create file
router.post('/', requirePermission('canSaveFiles'), async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const { content, language } = req.body;

    if (!name || !language) {
      return res.status(400).json({ error: '文件名和语言不能为空' });
    }
    if (!VALID_LANGUAGES.includes(language)) {
      return res.status(400).json({ error: '不支持的语言类型' });
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
    res.status(500).json({ error: '创建文件失败' });
  }
});

// Update file
router.put('/:id', requirePermission('canSaveFiles'), async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const { content, language } = req.body;

    if (!name || !language) {
      return res.status(400).json({ error: '文件名和语言不能为空' });
    }
    if (!VALID_LANGUAGES.includes(language)) {
      return res.status(400).json({ error: '不支持的语言类型' });
    }

    const file = await File.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { name, content, language, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!file) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    res.json({ success: true, file });
  } catch (error) {
    res.status(500).json({ error: '更新文件失败' });
  }
});

// Delete file
router.delete('/:id', requirePermission('canSaveFiles'), async (req, res) => {
  try {
    const file = await File.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    
    if (!file) {
      return res.status(404).json({ error: '文件不存在' });
    }
    
    res.json({ success: true, message: '文件已删除' });
  } catch (error) {
    res.status(500).json({ error: '删除文件失败' });
  }
});

module.exports = router;
