const express = require("express");
const router = express.Router();
const { executeCode } = require("../services/dockerService");
const { generateAiGuidance } = require("../services/aiTutorService");
const { authenticateToken, requirePermission } = require("../middleware/auth");

router.use(authenticateToken);

const validLanguages = ["python", "cpp", "nodejs"];

function validateExecutionPayload(req, res) {
    const { code, language } = req.body;

    if (typeof code !== "string") {
        res.status(400).json({ error: "code 字段必须是字符串" });
        return false;
    }

    if (!language) {
        res.status(400).json({ error: "language 字段不能为空" });
        return false;
    }

    if (!validLanguages.includes(language)) {
        res.status(400).json({
            error: `不支持的语言：${language}。支持：${validLanguages.join(", ")}`,
        });
        return false;
    }

    return true;
}

router.post("/guidance", requirePermission("canRunCode"), async (req, res) => {
    try {
        if (!validateExecutionPayload(req, res)) return;

        const { code, language, stdin, executionResult } = req.body;
        if (!executionResult || typeof executionResult !== "object") {
            return res
                .status(400)
                .json({ error: "executionResult 字段不能为空" });
        }

        if (executionResult.success) {
            return res
                .status(400)
                .json({ error: "只有代码运行失败时才能生成 AI 教学指导" });
        }

        const aiGuidance = await generateAiGuidance({
            code,
            language,
            stdin: stdin || "",
            executionResult: {
                success: false,
                output: executionResult.output || "",
                error: executionResult.error || "",
                exitCode: executionResult.exitCode,
            },
        });

        if (!aiGuidance) {
            return res.status(400).json({
                error: "系统尚未配置 AI API，请先让老师在 AI 设置中配置",
            });
        }

        return res.json({
            success: true,
            guidance: aiGuidance,
        });
    } catch (error) {
        console.error("AI guidance error:", error);
        return res
            .status(500)
            .json({ error: error.message || "AI 教学指导生成失败" });
    }
});

// 执行代码
router.post("/", requirePermission("canRunCode"), async (req, res) => {
    try {
        if (!validateExecutionPayload(req, res)) return;

        const { code, language, stdin } = req.body;
        const normalizedStdin = stdin || "";
        const result = await executeCode(code, language, normalizedStdin);
        res.json(result);
    } catch (error) {
        console.error("Execution error:", error);
        res.status(500).json({
            success: false,
            error: "服务器内部错误",
        });
    }
});

module.exports = router;
