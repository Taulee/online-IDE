const express = require('express');
const router = express.Router();
const { executeCode } = require('../services/dockerService');
const { authenticateToken, requirePermission } = require('../middleware/auth');

router.use(authenticateToken);

// Execute code
router.post('/', requirePermission('canRunCode'), async (req, res) => {
  try {
    const { code, language, stdin } = req.body;

    if (typeof code !== 'string') {
      return res.status(400).json({ error: 'code 字段必须是字符串' });
    }

    if (!language) {
      return res.status(400).json({ error: 'language 字段不能为空' });
    }

    const validLanguages = ['python', 'cpp', 'nodejs'];
    if (!validLanguages.includes(language)) {
      return res.status(400).json({ 
        error: `不支持的语言：${language}。支持：${validLanguages.join(', ')}` 
      });
    }

    const result = await executeCode(code, language, stdin || '');
    res.json(result);

  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({ 
      success: false,
      error: '服务器内部错误'
    });
  }
});

module.exports = router;
