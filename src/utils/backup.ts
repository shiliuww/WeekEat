import { appStorage } from './storage';
import { CURRENT_APP_VERSION } from './updateChecker';

export const BACKUP_SCHEMA_VERSION = 1;

const BACKUP_STORAGE_KEYS = [
  'recipe_dishes',
  'recipe_preferences',
  'recipe_generation_history',
  'recipe_preset_version',
  'recipe_app_state_v1',
  'weekeat_generation_history_v1',
  'weekeat_update_dismissed_version',
] as const;

type BackupStorageKey = (typeof BACKUP_STORAGE_KEYS)[number];

export type AppBackupSnapshot = {
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  payload: Partial<Record<BackupStorageKey, string | null>>;
};

function buildBackupFileName(): string {
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
    date.getDate()
  ).padStart(2, '0')}`;
  return `weekeat-backup-${datePart}.json`;
}

function isValidBackupSnapshot(value: unknown): value is AppBackupSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const snapshot = value as Partial<AppBackupSnapshot>;
  return (
    typeof snapshot.schemaVersion === 'number' &&
    typeof snapshot.appVersion === 'string' &&
    typeof snapshot.exportedAt === 'string' &&
    !!snapshot.payload &&
    typeof snapshot.payload === 'object'
  );
}

export function createBackupSnapshot(): AppBackupSnapshot {
  const payload: Partial<Record<BackupStorageKey, string | null>> = {};

  BACKUP_STORAGE_KEYS.forEach((key) => {
    payload[key] = appStorage.getItem(key);
  });

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: CURRENT_APP_VERSION,
    exportedAt: new Date().toISOString(),
    payload,
  };
}

export function downloadBackupSnapshot(): string {
  const snapshot = createBackupSnapshot();
  const content = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const fileName = buildBackupFileName();

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);

  return fileName;
}

export async function parseBackupFile(file: File): Promise<AppBackupSnapshot> {
  const text = await file.text();
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error('备份文件不是有效的 JSON。');
  }

  if (!isValidBackupSnapshot(parsed)) {
    throw new Error('备份文件格式不正确。');
  }

  if (parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error('备份文件版本暂不支持导入。');
  }

  return parsed;
}

export function restoreBackupSnapshot(snapshot: AppBackupSnapshot): void {
  BACKUP_STORAGE_KEYS.forEach((key) => {
    const value = snapshot.payload[key];

    if (typeof value === 'string') {
      appStorage.setItem(key, value);
    } else {
      appStorage.removeItem(key);
    }
  });
}
