type StorageBridge = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

declare global {
  interface Window {
    recipeAppStorage?: StorageBridge;
  }
}

function getStorageBridge(): StorageBridge | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (window.recipeAppStorage) {
    return window.recipeAppStorage;
  }

  return window.localStorage;
}

export const appStorage = {
  getItem(key: string): string | null {
    try {
      return getStorageBridge()?.getItem(key) ?? null;
    } catch (error) {
      console.error('读取本地存储失败:', error);
      return null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      getStorageBridge()?.setItem(key, value);
    } catch (error) {
      console.error('写入本地存储失败:', error);
    }
  },

  removeItem(key: string): void {
    try {
      getStorageBridge()?.removeItem(key);
    } catch (error) {
      console.error('删除本地存储失败:', error);
    }
  },
};

export function loadJson<T>(key: string, fallback: T): T {
  const raw = appStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`解析存储数据失败: ${key}`, error);
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): void {
  appStorage.setItem(key, JSON.stringify(value));
}
