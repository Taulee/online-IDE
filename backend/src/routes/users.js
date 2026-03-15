const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const File = require('../models/File');
const Submission = require('../models/Submission');
const { buildPermissions } = require('../utils/permissions');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(requirePermission('canManageUsers'));

router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      users: users.map((user) => user.toPublicJSON())
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const password = req.body.password || '';
    const role = req.body.role === 'teacher' ? 'teacher' : 'student';
    const name = (req.body.name || username).trim();
    const permissions = buildPermissions(role, req.body.permissions || {});

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      name,
      passwordHash,
      role,
      permissions
    });

    return res.status(201).json({
      success: true,
      user: user.toPublicJSON()
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const role = req.body.role === 'teacher' ? 'teacher' : (req.body.role === 'student' ? 'student' : user.role);
    user.role = role;
    user.name = typeof req.body.name === 'string' ? req.body.name.trim() : user.name;
    user.isActive = typeof req.body.isActive === 'boolean' ? req.body.isActive : user.isActive;
    const currentPermissions = user.permissions?.toObject ? user.permissions.toObject() : user.permissions;
    user.permissions = buildPermissions(role, req.body.permissions || currentPermissions);

    if (typeof req.body.password === 'string' && req.body.password.trim()) {
      user.passwordHash = await bcrypt.hash(req.body.password.trim(), 10);
    }

    await user.save();

    return res.json({
      success: true,
      user: user.toPublicJSON()
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete current logged-in user' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await File.deleteMany({ owner: user._id });
    await Submission.deleteMany({
      $or: [{ student: user._id }, { teacher: user._id }]
    });

    return res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
