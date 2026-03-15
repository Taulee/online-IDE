const express = require('express');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();
const VALID_LANGUAGES = ['python', 'cpp', 'nodejs'];

function sanitizeFileName(filename) {
  return filename.replace(/[^\w.\-]/g, '_');
}

router.use(authenticateToken);

router.get('/teachers', async (req, res) => {
  try {
    const teachers = await User.find({
      role: 'teacher',
      isActive: true
    }).sort({ username: 1 });

    res.json({
      success: true,
      teachers: teachers.map((teacher) => ({
        _id: teacher._id,
        username: teacher.username,
        name: teacher.name
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requirePermission('canSubmitCode'), async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only student users can submit code' });
    }

    const { teacherId, fileName, language, content } = req.body;
    const cleanName = sanitizeFileName((fileName || '').trim());

    if (!teacherId || !cleanName || !language) {
      return res.status(400).json({ error: 'teacherId, fileName and language are required' });
    }
    if (!VALID_LANGUAGES.includes(language)) {
      return res.status(400).json({ error: 'Invalid language' });
    }

    const teacher = await User.findOne({ _id: teacherId, role: 'teacher', isActive: true });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const submittedFileName = `${req.user.username}_${cleanName}`;

    const submission = await Submission.create({
      student: req.user._id,
      teacher: teacher._id,
      originalFileName: cleanName,
      submittedFileName,
      language,
      content: content || ''
    });

    res.status(201).json({
      success: true,
      submission
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/mine', requirePermission('canSubmitCode'), async (req, res) => {
  try {
    const submissions = await Submission.find({ student: req.user._id })
      .populate('teacher', 'username name')
      .sort({ createdAt: -1 });

    res.json({ success: true, submissions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/received', requirePermission('canReviewSubmissions'), async (req, res) => {
  try {
    const submissions = await Submission.find({ teacher: req.user._id })
      .populate('student', 'username name')
      .sort({ createdAt: -1 });

    res.json({ success: true, submissions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
