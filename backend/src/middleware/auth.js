const jwt = require("jsonwebtoken");
const User = require("../models/User");

function getJwtSecret() {
    return process.env.JWT_SECRET || "online-ide-dev-secret-change-me";
}

async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: "未授权，请先登录" });
    }

    try {
        const payload = jwt.verify(token, getJwtSecret());
        const user = await User.findById(payload.userId);

        if (!user || !user.isActive) {
            return res
                .status(401)
                .json({ error: "登录状态无效或账号已被停用" });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: "登录状态已失效，请重新登录" });
    }
}

function requirePermission(permissionKey) {
    return (req, res, next) => {
        const permissions = req.user?.permissions?.toObject
            ? req.user.permissions.toObject()
            : req.user?.permissions;
        if (!permissions?.[permissionKey]) {
            return res.status(403).json({ error: "当前账号没有该操作权限" });
        }
        next();
    };
}

function signUserToken(user) {
    return jwt.sign(
        {
            userId: user._id.toString(),
            username: user.username,
            role: user.role,
        },
        getJwtSecret(),
        { expiresIn: "12h" },
    );
}

module.exports = {
    authenticateToken,
    requirePermission,
    signUserToken,
};
