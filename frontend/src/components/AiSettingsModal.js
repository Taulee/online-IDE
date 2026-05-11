import React, { useCallback, useEffect, useState } from "react";
import { clearAiApiKey, getAiSettings, saveAiSettings } from "../services/api";

const PROVIDER_PRESETS = {
    siliconflow: {
        label: "硅基流动",
        apiBaseUrl: "https://api.siliconflow.cn/v1",
        model: "deepseek-ai/DeepSeek-V3",
    },
    openai: {
        label: "OpenAI 兼容",
        apiBaseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
    },
    custom: {
        label: "自定义兼容接口",
        apiBaseUrl: "",
        model: "",
    },
};

function AiSettingsModal({ open, onClose }) {
    const [form, setForm] = useState({
        provider: "siliconflow",
        apiBaseUrl: PROVIDER_PRESETS.siliconflow.apiBaseUrl,
        model: PROVIDER_PRESETS.siliconflow.model,
        apiKey: "",
    });
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const loadSettings = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getAiSettings();
            const loadedSettings = data.settings || {};
            setSettings(loadedSettings);
            setForm({
                provider: loadedSettings.provider || "siliconflow",
                apiBaseUrl:
                    loadedSettings.apiBaseUrl ||
                    PROVIDER_PRESETS.siliconflow.apiBaseUrl,
                model:
                    loadedSettings.model || PROVIDER_PRESETS.siliconflow.model,
                apiKey: "",
            });
            setMessage("");
        } catch (error) {
            setMessage(error.response?.data?.error || "加载 AI 配置失败");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            loadSettings();
        }
    }, [loadSettings, open]);

    if (!open) return null;

    const updateField = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleProviderChange = (provider) => {
        const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom;
        setForm((prev) => ({
            ...prev,
            provider,
            apiBaseUrl: preset.apiBaseUrl || prev.apiBaseUrl,
            model: preset.model || prev.model,
        }));
    };

    const handleSave = async (event) => {
        event.preventDefault();
        try {
            setLoading(true);
            const data = await saveAiSettings({
                provider: form.provider,
                apiBaseUrl: form.apiBaseUrl.trim(),
                model: form.model.trim(),
                apiKey: form.apiKey.trim(),
            });
            setSettings(data.settings || null);
            setForm((prev) => ({ ...prev, apiKey: "" }));
            setMessage("AI 配置已保存，运行报错时会自动生成教学指导");
        } catch (error) {
            setMessage(error.response?.data?.error || "保存 AI 配置失败");
        } finally {
            setLoading(false);
        }
    };

    const handleClear = async () => {
        if (
            !window.confirm(
                "确定清除系统 AI API 密钥吗？清除后运行报错将不会生成 AI 教学指导。",
            )
        )
            return;

        try {
            setLoading(true);
            const data = await clearAiApiKey();
            setSettings(data.settings || null);
            setForm({
                provider: data.settings?.provider || "siliconflow",
                apiBaseUrl:
                    data.settings?.apiBaseUrl ||
                    PROVIDER_PRESETS.siliconflow.apiBaseUrl,
                model:
                    data.settings?.model || PROVIDER_PRESETS.siliconflow.model,
                apiKey: "",
            });
            setMessage("AI API 密钥已清除");
        } catch (error) {
            setMessage(error.response?.data?.error || "清除 AI API 密钥失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <form
                className="modal-card ai-settings-modal"
                onSubmit={handleSave}
            >
                <div className="modal-header">
                    <div>
                        <h3>AI API 配置</h3>
                        <span className="small-text">
                            系统级配置，对所有老师和学生生效。
                        </span>
                    </div>
                    <button
                        className="close-btn"
                        type="button"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <label>
                    服务商
                    <select
                        value={form.provider}
                        onChange={(e) => handleProviderChange(e.target.value)}
                    >
                        {Object.entries(PROVIDER_PRESETS).map(
                            ([key, preset]) => (
                                <option key={key} value={key}>
                                    {preset.label}
                                </option>
                            ),
                        )}
                    </select>
                </label>

                <label>
                    API 地址
                    <input
                        type="url"
                        value={form.apiBaseUrl}
                        onChange={(e) =>
                            updateField("apiBaseUrl", e.target.value)
                        }
                        placeholder="https://api.siliconflow.cn/v1"
                        required
                    />
                </label>

                <label>
                    模型名称
                    <input
                        type="text"
                        value={form.model}
                        onChange={(e) => updateField("model", e.target.value)}
                        placeholder="例如 deepseek-ai/DeepSeek-V3"
                        required
                    />
                </label>

                <label>
                    API 密钥
                    <input
                        type="password"
                        value={form.apiKey}
                        onChange={(e) => updateField("apiKey", e.target.value)}
                        placeholder={
                            settings?.configured
                                ? "留空则保持当前密钥不变"
                                : "请输入硅基流动 API Key"
                        }
                        autoComplete="off"
                    />
                </label>

                <div className="settings-summary">
                    <span>
                        状态：
                        {settings?.configured
                            ? `已配置（${settings.apiKeyPreview || "已隐藏"}）`
                            : "未配置"}
                    </span>
                    <span>
                        调用路径：
                        {form.apiBaseUrl
                            ? `${form.apiBaseUrl.replace(/\/+$/, "")}/chat/completions`
                            : "未填写"}
                    </span>
                </div>

                {message && <div className="inline-message">{message}</div>}

                <div className="modal-actions">
                    <button
                        className="btn btn-secondary danger-btn"
                        type="button"
                        onClick={handleClear}
                        disabled={loading || !settings?.configured}
                    >
                        清除密钥
                    </button>
                    <div className="row-actions">
                        <button
                            className="btn btn-secondary"
                            type="button"
                            onClick={onClose}
                        >
                            取消
                        </button>
                        <button
                            className="btn btn-primary"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? "保存中..." : "保存配置"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default AiSettingsModal;
