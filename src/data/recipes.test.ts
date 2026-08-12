import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recipeDatabase } from './recipes';
import { getDishes, initDatabase } from '../utils/database';

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

describe('preset recipe library', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: new MemoryStorage() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the expanded preset library at 266 dishes without duplicate ids', () => {
    expect(recipeDatabase).toHaveLength(266);

    const ids = recipeDatabase.map(dish => dish.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('builds representative new dishes with the expected tags and ingredient metadata', () => {
    const duckMeal = recipeDatabase.find(dish => dish.name === '芋头鸭块焖饭');
    const lambDish = recipeDatabase.find(dish => dish.name === '白萝卜炖羊肉');
    const steamVegetable = recipeDatabase.find(dish => dish.name === '剁椒蒸金针菇');

    expect(duckMeal?.tags).toContain('完整一餐');
    expect(duckMeal?.tags).toContain('荤菜');
    expect(duckMeal?.ingredients.some(item => item.name === '鸭腿肉' && item.quantity === '160' && item.unit === '克')).toBe(true);

    expect(lambDish?.tags).toContain('荤菜');
    expect(lambDish?.tags).toContain('家常');
    expect(lambDish?.ingredients.some(item => item.name === '羊肉' && item.quantity === '150' && item.unit === '克')).toBe(true);

    expect(steamVegetable?.tags).toContain('素菜');
    expect(steamVegetable?.tags).toContain('蒸菜');
    expect(steamVegetable?.ingredients.some(item => item.name === '剁椒')).toBe(true);
  });

  it('initializes local storage with the full refreshed preset library', () => {
    initDatabase();

    const dishes = getDishes();
    const names = new Set(dishes.map(dish => dish.name));

    expect(dishes).toHaveLength(recipeDatabase.length);
    expect(names.has('子姜炒鸭片')).toBe(true);
    expect(names.has('葱爆羊肉')).toBe(true);
    expect(names.has('家常豆腐')).toBe(true);
  });
});
