const crypto = require('crypto');
const SystemSetting = require('../models/SystemSetting');

const AI_TUTOR_SETTING_KEY = 'aiTutor';
const DEFAULT_PROVIDER = 'siliconflow';
const DEFAULT_API_BASE_URL = 'https://api.siliconflow.cn/v1';
const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V3';
const SECRET_ALGORITHM = 'aes-256-gcm';
const SECRET_IV_BYTES = 12;
const DEFAULT_AI_TIMEOUT_MS = 60000;

function normalizeApiBaseUrl(apiBaseUrl) {
  return String(apiBaseUrl || DEFAULT_API_BASE_URL).trim().replace(/\/+$/, '');
}

function normalizeModel(model) {
  return String(model || DEFAULT_MODEL).trim();
}

function normalizeProvider(provider) {
  return String(provider || DEFAULT_PROVIDER).trim() || DEFAULT_PROVIDER;
}

function getDefaultApiBaseUrl() {
  return normalizeApiBaseUrl(process.env.AI_API_BASE_URL || DEFAULT_API_BASE_URL);
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

function getEncryptionKey() {
  const secret = process.env.AI_CONFIG_SECRET || process.env.JWT_SECRET || 'online-ide-ai-config-secret';
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptSecret(plainText) {
  const iv = crypto.randomBytes(SECRET_IV_BYTES);
  const cipher = crypto.createCipheriv(SECRET_ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    encrypted: encrypted.toString('base64')
  };
}

function decryptSecret(payload) {
  if (!payload?.iv || !payload?.authTag || !payload?.encrypted) {
    return '';
  }

  const decipher = crypto.createDecipheriv(
    SECRET_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(payload.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(payload.encrypted, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

function maskApiKey(apiKey) {
  if (!apiKey) return '';
  if (apiKey.length <= 8) return '已配置';
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

function isValidHeaderToken(value) {
  return /^[\x21-\x7E]+$/.test(value);
}

function assertValidApiKey(apiKey) {
  if (!apiKey) {
    throw new Error('API 密钥不能为空');
  }

  if (!isValidHeaderToken(apiKey)) {
    throw new Error('AI API 密钥格式不正确，请只粘贴平台提供的 Key，不要包含中文、空格或换行');
  }
}

async function getAiSettings() {
  const setting = await SystemSetting.findOne({ key: AI_TUTOR_SETTING_KEY });
  const value = setting?.value || {};

  return {
    configured: Boolean(value.encryptedApiKey),
    apiKeyPreview: value.apiKeyPreview || '',
    provider: value.provider || DEFAULT_PROVIDER,
    model: value.model || getDefaultModel(),
    apiBaseUrl: value.apiBaseUrl || getDefaultApiBaseUrl(),
    updatedAt: setting?.updatedAt || null
  };
}

async function getRuntimeSettings() {
  const setting = await SystemSetting.findOne({ key: AI_TUTOR_SETTING_KEY });
  const value = setting?.value || {};
  const encryptedApiKey = value.encryptedApiKey;
  if (!encryptedApiKey) return '';

  let apiKey = '';
  try {
    apiKey = decryptSecret(encryptedApiKey);
  } catch (error) {
    throw new Error('AI API 密钥解密失败，请重新保存密钥');
  }
  assertValidApiKey(apiKey);

  return {
    apiKey,
    provider: value.provider || DEFAULT_PROVIDER,
    apiBaseUrl: value.apiBaseUrl || getDefaultApiBaseUrl(),
    model: value.model || getDefaultModel()
  };
}

async function saveAiSettings({ apiKey, provider, apiBaseUrl, model }) {
  const existing = await SystemSetting.findOne({ key: AI_TUTOR_SETTING_KEY });
  const existingValue = existing?.value || {};
  const normalizedApiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
  const nextValue = {
    ...existingValue,
    provider: normalizeProvider(provider),
    apiBaseUrl: normalizeApiBaseUrl(apiBaseUrl),
    model: normalizeModel(model)
  };

  if (!nextValue.apiBaseUrl) {
    throw new Error('API 地址不能为空');
  }

  if (!nextValue.model) {
    throw new Error('模型名称不能为空');
  }

  if (normalizedApiKey) {
    assertValidApiKey(normalizedApiKey);
    nextValue.encryptedApiKey = encryptSecret(normalizedApiKey);
    nextValue.apiKeyPreview = maskApiKey(normalizedApiKey);
  } else if (!existingValue.encryptedApiKey) {
    throw new Error('首次配置时 API 密钥不能为空');
  }

  await SystemSetting.findOneAndUpdate(
    { key: AI_TUTOR_SETTING_KEY },
    { $set: { value: nextValue } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
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
          model: getDefaultModel()
        }
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return getAiSettings();
}

function truncateText(text, maxLength) {
  const normalized = String(text || '');
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}\n...（内容过长，已截断）`;
}

function buildTutorPrompt({ code, language, stdin, executionResult }) {
  return `请根据下面的代码运行错误，给学生一份中文教学指导。

要求：
1. 用清晰、友好、简介、专业的教学口吻，不要只给结论。
2. 必须包含三个小标题：出错原因、涉及的知识点、更正样例。
3. 更正样例要给出可运行的 ${language} 代码或关键修改片段。
4. 如果错误和输入有关，请说明输入格式或边界问题。
5. 不要编造不存在的报错。
6. 输出不要包含 markdown 符号。

语言：${language}
退出码：${executionResult.exitCode}

代码：
\`\`\`${language}
${truncateText(code, 6000)}
\`\`\`

标准输入 stdin：
\`\`\`text
${truncateText(stdin, 2000)}
\`\`\`

标准输出 stdout：
\`\`\`text
${truncateText(executionResult.output, 2000)}
\`\`\`

错误输出 stderr：
\`\`\`text
${truncateText(executionResult.error, 4000)}
\`\`\``;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
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
    response = await fetchWithTimeout(`${settings.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: settings.model,
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          {
            role: 'system',
            content: '你是一名编程教师，擅长把编译错误、运行错误和输入问题解释成学生能理解的学习指导。'
          },
          {
            role: 'user',
            content: buildTutorPrompt({ code, language, stdin, executionResult })
          }
        ]
      })
    }, getAiTimeoutMs());
  } catch (error) {
    if (error.name === 'AbortError' || /aborted/i.test(error.message || '')) {
      throw new Error(`AI 服务响应超时（>${Math.round(getAiTimeoutMs() / 1000)} 秒），请稍后重试或在 AI 设置中换用响应更快的模型`);
    }
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `AI 服务请求失败（HTTP ${response.status}）`;
    throw new Error(message);
  }

  return (data?.choices?.[0]?.message?.content || '').trim();
}

module.exports = {
  clearAiApiKey,
  generateAiGuidance,
  getAiSettings,
  saveAiSettings
};
