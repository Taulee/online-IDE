const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authenticateToken, signUserToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = await User.findOne({ username }).select('+passwordHash');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: '用户名或密码错误，或账号已停用' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: '用户名或密码错误，或账号已停用' });
    }

    const token = signUserToken(user);

    return res.json({
      success: true,
      token,
      user: user.toPublicJSON()
    });
  } catch (error) {
    return res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user.toPublicJSON()
  });
});

module.exports = router;
