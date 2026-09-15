import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKUP_SCHEMA_VERSION,
  createBackupSnapshot,
  parseBackupFile,
  restoreBackupSnapshot,
} from './backup';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

describe('backup helpers', () => {
  const storage = new MemoryStorage();

  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: storage });
    storage.setItem('recipe_dishes', JSON.stringify([{ id: '1', name: '测试菜' }]));
    storage.setItem('recipe_app_state_v1', JSON.stringify({ view: 'settings' }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a snapshot with the expected persisted keys', () => {
    const snapshot = createBackupSnapshot();

    expect(snapshot.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(snapshot.payload.recipe_dishes).toContain('测试菜');
    expect(snapshot.payload.recipe_app_state_v1).toContain('settings');
    expect('recipe_app_config' in snapshot.payload).toBe(false);
  });

  it('parses a valid backup file and restores stored values', async () => {
    const snapshot = createBackupSnapshot();
    storage.removeItem('recipe_dishes');
    storage.setItem('recipe_app_config', JSON.stringify({ provider: 'qwen' }));

    const file = new File([JSON.stringify(snapshot)], 'weekeat-backup.json', {
      type: 'application/json',
    });

    const parsed = await parseBackupFile(file);
    restoreBackupSnapshot(parsed);

    expect(storage.getItem('recipe_dishes')).toContain('测试菜');
    expect(storage.getItem('recipe_app_config')).toContain('qwen');
  });

  it('rejects malformed backup content', async () => {
    const file = new File(['{"bad":true}'], 'bad.json', { type: 'application/json' });

    await expect(parseBackupFile(file)).rejects.toThrow('备份文件格式不正确。');
  });
});
