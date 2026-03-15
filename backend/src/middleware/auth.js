const jwt = require('jsonwebtoken');
const User = require('../models/User');

function getJwtSecret() {
  return process.env.JWT_SECRET || 'online-ide-dev-secret-change-me';
}

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const user = await User.findById(payload.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (!req.user?.permissions?.[permissionKey]) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function signUserToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      username: user.username,
      role: user.role
    },
    getJwtSecret(),
    { expiresIn: '12h' }
  );
}

module.exports = {
  authenticateToken,
  requirePermission,
  signUserToken
};
