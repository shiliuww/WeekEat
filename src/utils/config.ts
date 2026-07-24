export type Provider = 'openai' | 'deepseek' | 'glm' | 'kimi' | 'qwen';

import { loadJson, saveJson } from './storage';

export interface AppConfig {
  provider: Provider;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
}

export const PROVIDERS: Record<Provider, {
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
  supportsVision: boolean;
  description: string;
}> = {
  openai: {
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    supportsVision: true,
    description: '支持完整功能（图像识别、菜谱生成、聊天）',
  },
  deepseek: {
    name: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    supportsVision: false,
    description: '性价比高，不支持图像识别',
  },
  glm: {
    name: '智谱 AI (GLM)',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4',
    supportsVision: true,
    description: '国产模型，支持图像识别',
  },
  kimi: {
    name: 'Kimi',
    defaultBaseUrl: 'https://api.moonshot.ai/v1',
    defaultModel: 'kimi-k2.5',
    supportsVision: false,
    description: 'Moonshot AI，OpenAI 兼容接口，适合中文与长上下文',
  },
  qwen: {
    name: '通义千问 (Qwen)',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    supportsVision: false,
    description: '阿里云通义系列，支持文本模型与可选视觉模型',
  },
};

export const defaultConfig: AppConfig = {
  provider: 'openai',
  apiKey: '',
  baseUrl: PROVIDERS.openai.defaultBaseUrl,
  model: PROVIDERS.openai.defaultModel,
  temperature: 0.7,
};

const CONFIG_KEY = 'recipe_app_config';

export const loadConfig = (): AppConfig => {
  try {
    const parsed = loadJson<Partial<AppConfig> | null>(CONFIG_KEY, null);
    if (parsed) {
      if (!parsed.provider) {
        return { ...defaultConfig, ...parsed, provider: 'openai' };
      }
      return { ...defaultConfig, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
  return defaultConfig;
};

export const saveConfig = (config: Partial<AppConfig>) => {
  const current = loadConfig();
  const updated = { ...current, ...config };
  saveJson(CONFIG_KEY, updated);
  return updated;
};

export const validateConfig = (config: AppConfig): boolean => {
  return config.apiKey.length > 0 && config.baseUrl.length > 0 && config.model.length > 0;
};

export const supportsVision = (config: AppConfig): boolean => {
  if (PROVIDERS[config.provider].supportsVision) {
    return true;
  }

  if (config.provider === 'qwen') {
    const model = config.model.toLowerCase();
    return model.includes('vl') || model.includes('omni') || model.includes('qvq');
  }

  return false;
};
