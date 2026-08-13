import { appStorage } from './storage';

const LATEST_RELEASE_API_URL =
  'https://api.github.com/repos/shiliuww/WeekEat/releases/latest';
const DEFAULT_RELEASE_URL = 'https://github.com/shiliuww/WeekEat/releases/latest';
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

type GitHubReleaseResponse = {
  tag_name?: string;
  name?: string;
  body?: string;
  html_url?: string;
  published_at?: string;
  draft?: boolean;
  prerelease?: boolean;
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

function normalizePublishedAt(dateString?: string): string | undefined {
  if (!dateString) {
    return undefined;
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function parseGitHubRelease(payload: GitHubReleaseResponse): UpdateManifest | null {
  if (payload.draft || payload.prerelease) {
    return null;
  }

  const version = payload.tag_name?.trim().replace(/^v/i, '');
  if (!version) {
    return null;
  }

  return {
    version,
    title: payload.name?.trim() || `WeekEat v${version}`,
    releaseNotes: normalizeReleaseNotes(payload.body),
    releaseUrl: payload.html_url?.trim() || DEFAULT_RELEASE_URL,
    publishedAt: normalizePublishedAt(payload.published_at),
    forceUpdate: false,
  };
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

export async function checkForAppUpdate(options?: {
  ignoreDismissedVersion?: boolean;
  throwOnError?: boolean;
}): Promise<AvailableUpdate | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${LATEST_RELEASE_API_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub Release 请求失败: ${response.status}`);
    }

    const manifest = parseGitHubRelease((await response.json()) as GitHubReleaseResponse);
    if (!manifest) {
      return null;
    }

    const remoteVersion = manifest.version?.trim();

    if (!remoteVersion) {
      return null;
    }

    if (compareVersions(remoteVersion, CURRENT_APP_VERSION) <= 0) {
      return null;
    }

    const dismissedVersion = appStorage.getItem(UPDATE_DISMISS_KEY);
    if (
      !options?.ignoreDismissedVersion &&
      !manifest.forceUpdate &&
      dismissedVersion === remoteVersion
    ) {
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
    if (options?.throwOnError) {
      throw error;
    }
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
