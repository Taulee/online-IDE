const express = require("express");
const { authenticateToken, requirePermission } = require("../middleware/auth");
const {
    clearAiApiKey,
    getAiSettings,
    saveAiSettings,
} = require("../services/aiTutorService");

const router = express.Router();

router.use(authenticateToken);
router.use(requirePermission("canManageAiSettings"));

router.get("/", async (req, res) => {
    try {
        const settings = await getAiSettings();
        res.json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ error: "获取 AI 设置失败" });
    }
});

router.put("/", async (req, res) => {
    try {
        const settings = await saveAiSettings({
            apiKey: req.body.apiKey,
            provider: req.body.provider,
            apiBaseUrl: req.body.apiBaseUrl,
            model: req.body.model,
        });
        res.json({ success: true, settings });
    } catch (error) {
        res.status(400).json({ error: error.message || "保存 AI 设置失败" });
    }
});

router.delete("/", async (req, res) => {
    try {
        const settings = await clearAiApiKey();
        res.json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ error: "清除 AI 设置失败" });
    }
});

module.exports = router;
