const SystemSetting = require("../models/SystemSetting");

const AI_TUTOR_SETTING_KEY = "aiTutor";
const DEFAULT_PROVIDER = "siliconflow";
const DEFAULT_API_BASE_URL = "https://api.siliconflow.cn/v1";
const DEFAULT_MODEL = "deepseek-ai/DeepSeek-V3";
const DEFAULT_AI_TIMEOUT_MS = 60000;
const TUTOR_CONTEXT_LIMITS = {
    code: 3000,
    stdin: 800,
    stdout: 800,
    stderr: 1600,
};
const TUTOR_MAX_OUTPUT_TOKENS = 500;

function normalizeApiBaseUrl(apiBaseUrl) {
    return String(apiBaseUrl || DEFAULT_API_BASE_URL)
        .trim()
        .replace(/\/+$/, "");
}

function normalizeModel(model) {
    return String(model || DEFAULT_MODEL).trim();
}

function normalizeProvider(provider) {
    return String(provider || DEFAULT_PROVIDER).trim() || DEFAULT_PROVIDER;
}

function getDefaultApiBaseUrl() {
    return normalizeApiBaseUrl(
        process.env.AI_API_BASE_URL || DEFAULT_API_BASE_URL,
    );
}

function getDefaultModel() {
    return normalizeModel(process.env.AI_MODEL || DEFAULT_MODEL);
}

function getAiTimeoutMs() {
    const value = Number(process.env.AI_TIMEOUT_MS || DEFAULT_AI_TIMEOUT_MS);
    if (!Number.isFinite(value) || value <= 0) {
        return DEFAULT_AI_TIMEOUT_MS;
    }
    return value;
}

function maskApiKey(apiKey) {
    if (!apiKey) return "";
    if (apiKey.length <= 8) return "已配置";
    return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

function isValidHeaderToken(value) {
    return /^[\x21-\x7E]+$/.test(value);
}

function assertValidApiKey(apiKey) {
    if (!apiKey) {
        throw new Error("API 密钥不能为空");
    }

    if (!isValidHeaderToken(apiKey)) {
        throw new Error(
            "AI API 密钥格式不正确，请只粘贴平台提供的 Key，不要包含中文、空格或换行",
        );
    }
}

async function getAiSettings() {
    const setting = await SystemSetting.findOne({ key: AI_TUTOR_SETTING_KEY });
    const value = setting?.value || {};
    const apiKeyPreview =
        value.apiKeyPreview || maskApiKey(value.apiKey || "") || "";

    return {
        configured: Boolean(value.apiKey),
        apiKeyPreview,
        provider: value.provider || DEFAULT_PROVIDER,
        model: value.model || getDefaultModel(),
        apiBaseUrl: value.apiBaseUrl || getDefaultApiBaseUrl(),
        updatedAt: setting?.updatedAt || null,
    };
}

async function getRuntimeSettings() {
    const setting = await SystemSetting.findOne({ key: AI_TUTOR_SETTING_KEY });
    const value = setting?.value || {};
    let apiKey = String(value.apiKey || "").trim();

    if (!apiKey) return "";

    assertValidApiKey(apiKey);

    return {
        apiKey,
        provider: value.provider || DEFAULT_PROVIDER,
        apiBaseUrl: value.apiBaseUrl || getDefaultApiBaseUrl(),
        model: value.model || getDefaultModel(),
    };
}

async function saveAiSettings({ apiKey, provider, apiBaseUrl, model }) {
    const existing = await SystemSetting.findOne({ key: AI_TUTOR_SETTING_KEY });
    const existingValue = existing?.value || {};
    const existingApiKey = String(existingValue.apiKey || "").trim();
    const normalizedApiKey = typeof apiKey === "string" ? apiKey.trim() : "";
    const nextValue = {
        provider: normalizeProvider(provider),
        apiBaseUrl: normalizeApiBaseUrl(apiBaseUrl),
        model: normalizeModel(model),
        apiKey: existingApiKey,
        apiKeyPreview:
            existingValue.apiKeyPreview || maskApiKey(existingApiKey),
    };

    if (!nextValue.apiBaseUrl) {
        throw new Error("API 地址不能为空");
    }

    if (!nextValue.model) {
        throw new Error("模型名称不能为空");
    }

    if (normalizedApiKey) {
        assertValidApiKey(normalizedApiKey);
        nextValue.apiKey = normalizedApiKey;
        nextValue.apiKeyPreview = maskApiKey(normalizedApiKey);
    } else if (!existingApiKey) {
        throw new Error("首次配置时 API 密钥不能为空");
    }

    await SystemSetting.findOneAndUpdate(
        { key: AI_TUTOR_SETTING_KEY },
        { $set: { value: nextValue } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return getAiSettings();
}

async function clearAiApiKey() {
    await SystemSetting.findOneAndUpdate(
        { key: AI_TUTOR_SETTING_KEY },
        {
            $set: {
                value: {
                    provider: DEFAULT_PROVIDER,
                    apiBaseUrl: getDefaultApiBaseUrl(),
                    model: getDefaultModel(),
                },
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return getAiSettings();
}

function truncateText(text, maxLength) {
    const normalized = String(text || "");
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength)}\n...（内容过长，已截断）`;
}

function buildTutorPrompt({ code, language, stdin, executionResult }) {
    return `请根据下面的代码运行错误，给学生一份简短中文教学指导。

要求：
1. 用清晰、友好、简洁、专业的教学口吻。
2. 必须包含三个小标题：出错原因、涉及的知识点、更正样例。
3. 更正样例优先给关键修改片段，必要时再给可运行的 ${language} 代码。
4. 如果错误和输入有关，请说明输入格式或边界问题。
5. 不要编造不存在的报错。
6. 输出不要包含 markdown 符号，控制在 500 字以内。

语言：${language}
退出码：${executionResult.exitCode}

代码：
\`\`\`${language}
${truncateText(code, TUTOR_CONTEXT_LIMITS.code)}
\`\`\`

标准输入 stdin：
\`\`\`text
${truncateText(stdin, TUTOR_CONTEXT_LIMITS.stdin)}
\`\`\`

标准输出 stdout：
\`\`\`text
${truncateText(executionResult.output, TUTOR_CONTEXT_LIMITS.stdout)}
\`\`\`

错误输出 stderr：
\`\`\`text
${truncateText(executionResult.error, TUTOR_CONTEXT_LIMITS.stderr)}
\`\`\``;
}

async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeout);
    }
}

async function generateAiGuidance({ code, language, stdin, executionResult }) {
    const settings = await getRuntimeSettings();
    if (!settings?.apiKey) {
        return null;
    }

    let response;
    try {
        response = await fetchWithTimeout(
            `${settings.apiBaseUrl}/chat/completions`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${settings.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: settings.model,
                    temperature: 0.2,
                    max_tokens: TUTOR_MAX_OUTPUT_TOKENS,
                    messages: [
                        {
                            role: "system",
                            content:
                                "你是一名编程教师，擅长把编译错误、运行错误和输入问题解释成学生能理解的学习指导。",
                        },
                        {
                            role: "user",
                            content: buildTutorPrompt({
                                code,
                                language,
                                stdin,
                                executionResult,
                            }),
                        },
                    ],
                }),
            },
            getAiTimeoutMs(),
        );
    } catch (error) {
        if (
            error.name === "AbortError" ||
            /aborted/i.test(error.message || "")
        ) {
            throw new Error(
                `AI 服务响应超时（>${Math.round(getAiTimeoutMs() / 1000)} 秒），请稍后重试或在 AI 设置中换用响应更快的模型`,
            );
        }
        throw error;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message =
            data?.error?.message ||
            `AI 服务请求失败（HTTP ${response.status}）`;
        throw new Error(message);
    }

    return (data?.choices?.[0]?.message?.content || "").trim();
}

module.exports = {
    clearAiApiKey,
    generateAiGuidance,
    getAiSettings,
    saveAiSettings,
};
