import { appStorage } from './storage';

const UPDATE_MANIFEST_URL =
  'https://cdn.jsdelivr.net/gh/shiliuww/WeekEat@main/public/version.json';
const UPDATE_DISMISS_KEY = 'weekeat_update_dismissed_version';

export const CURRENT_APP_VERSION = __APP_VERSION__;

export type UpdateManifest = {
  version: string;
  releaseNotes?: string[] | string;
  releaseUrl?: string;
  publishedAt?: string;
  title?: string;
  forceUpdate?: boolean;
};

export type AvailableUpdate = UpdateManifest & {
  currentVersion: string;
  releaseNotes: string[];
};

declare global {
  interface Window {
    recipeAppShell?: {
      openExternal: (url: string) => void;
    };
  }
}

function normalizeVersion(version: string): number[] {
  return version
    .trim()
    .replace(/^v/i, '')
    .split('-')[0]
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

export function compareVersions(a: string, b: string): number {
  const left = normalizeVersion(a);
  const right = normalizeVersion(b);
  const maxLength = Math.max(left.length, right.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = left[index] ?? 0;
    const rightPart = right[index] ?? 0;

    if (leftPart > rightPart) {
      return 1;
    }

    if (leftPart < rightPart) {
      return -1;
    }
  }

  return 0;
}

function normalizeReleaseNotes(notes?: string[] | string): string[] {
  if (Array.isArray(notes)) {
    return notes.map((item) => item.trim()).filter(Boolean);
  }

  if (typeof notes === 'string') {
    return notes
      .split(/\r?\n/)
      .map((item) => item.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);
  }

  return [];
}

export function dismissUpdateReminder(version: string): void {
  appStorage.setItem(UPDATE_DISMISS_KEY, version);
}

export function clearDismissedUpdateReminder(): void {
  appStorage.removeItem(UPDATE_DISMISS_KEY);
}

export function openUpdateLink(url?: string): void {
  if (!url || typeof window === 'undefined') {
    return;
  }

  if (window.recipeAppShell) {
    window.recipeAppShell.openExternal(url);
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function checkForAppUpdate(): Promise<AvailableUpdate | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`更新清单请求失败: ${response.status}`);
    }

    const manifest = (await response.json()) as UpdateManifest;
    const remoteVersion = manifest.version?.trim();

    if (!remoteVersion) {
      return null;
    }

    if (compareVersions(remoteVersion, CURRENT_APP_VERSION) <= 0) {
      return null;
    }

    const dismissedVersion = appStorage.getItem(UPDATE_DISMISS_KEY);
    if (!manifest.forceUpdate && dismissedVersion === remoteVersion) {
      return null;
    }

    return {
      ...manifest,
      version: remoteVersion,
      currentVersion: CURRENT_APP_VERSION,
      releaseNotes: normalizeReleaseNotes(manifest.releaseNotes),
    };
  } catch (error) {
    console.warn('检查更新失败，已跳过本次自动提醒:', error);
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
