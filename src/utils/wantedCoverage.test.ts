import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dish } from '../types';
import { aiService } from './aiService';
import { initDatabase, getDishes } from './database';
import { generateWeeklyMenu } from './recipeGenerator';

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

  clear(): void {
    this.store.clear();
  }
}

function flattenMenuDishes(menu: Awaited<ReturnType<typeof generateWeeklyMenu>>): Dish[] {
  return menu.flatMap(day =>
    Object.values(day.meals).flatMap(meal => meal?.dishes ?? [])
  );
}

function flattenMenuEntries(menu: Awaited<ReturnType<typeof generateWeeklyMenu>>) {
  return menu.flatMap(day =>
    Object.entries(day.meals).flatMap(([mealType, meal]) =>
      (meal?.dishes ?? []).map(dish => ({
        dayName: day.dayName,
        mealType,
        dish,
      }))
    )
  );
}

function menuCoversDish(menu: Awaited<ReturnType<typeof generateWeeklyMenu>>, wantedDishName: string): boolean {
  return flattenMenuDishes(menu).some(
    dish => dish.name.includes(wantedDishName) || wantedDishName.includes(dish.name)
  );
}

function menuCoversIngredient(menu: Awaited<ReturnType<typeof generateWeeklyMenu>>, wantedIngredient: string): boolean {
  return flattenMenuDishes(menu).some(dish =>
    dish.ingredients.some(
      ingredient =>
        ingredient.name.includes(wantedIngredient) || wantedIngredient.includes(ingredient.name)
    )
  );
}

const cleanRoomDishRegistry: Record<string, Partial<Dish>> = {
  '椒麻排骨南瓜煲': {
    name: '椒麻排骨南瓜煲',
    ingredients: [
      { name: '排骨', quantity: '180', unit: '克', category: 'meat' },
      { name: '南瓜', quantity: '160', unit: '克', category: 'vegetable' },
      { name: '青椒', quantity: '40', unit: '克', category: 'vegetable' },
    ],
    category: 'dinner',
    isCompleteMeal: false,
  },
  '羊排家常菜': {
    name: '香煎南瓜羊排',
    ingredients: [
      { name: '羊排', quantity: '180', unit: '克', category: 'meat' },
      { name: '南瓜', quantity: '120', unit: '克', category: 'vegetable' },
      { name: '迷迭香', quantity: '2', unit: '克', category: 'seasoning' },
    ],
    category: 'dinner',
    isCompleteMeal: false,
  },
  '酸菜鱼': {
    name: '酸菜鱼',
    ingredients: [
      { name: '黑鱼片', quantity: '180', unit: '克', category: 'meat' },
      { name: '酸菜', quantity: '120', unit: '克', category: 'vegetable' },
      { name: '金针菇', quantity: '80', unit: '克', category: 'vegetable' },
    ],
    category: 'dinner',
    isCompleteMeal: false,
  },
  '南瓜燕麦酸奶碗': {
    name: '南瓜燕麦酸奶碗',
    ingredients: [
      { name: '南瓜', quantity: '120', unit: '克', category: 'vegetable' },
      { name: '燕麦', quantity: '45', unit: '克', category: 'grain' },
      { name: '酸奶', quantity: '150', unit: '克', category: 'other' },
    ],
    category: 'breakfast',
    isCompleteMeal: true,
  },
};

function createMockAiDish(dishName: string, ingredientHints: string[] = []): Dish {
  const registryMatch = cleanRoomDishRegistry[dishName];
  const mainIngredient =
    ingredientHints[0] ||
    (dishName.includes('排骨') ? '排骨' : dishName.includes('南瓜') ? '南瓜' : '鸡胸肉');
  const normalizedName = registryMatch?.name ||
    (dishName.includes('家常菜') ? `${mainIngredient}家常煲` : dishName);
  const category = registryMatch?.category || (dishName.includes('酸奶碗') ? 'breakfast' : 'dinner');

  return {
    id: `mock-${normalizedName}`,
    name: normalizedName,
    ingredients: registryMatch?.ingredients || [
      { name: mainIngredient, quantity: '180', unit: '克', category: mainIngredient.includes('南瓜') ? 'vegetable' : 'meat' },
      { name: mainIngredient.includes('南瓜') ? '鸡腿肉' : '南瓜', quantity: '120', unit: '克', category: mainIngredient.includes('南瓜') ? 'meat' : 'vegetable' },
      { name: '洋葱', quantity: '40', unit: '克', category: 'vegetable' },
    ],
    instructions: ['步骤1', '步骤2', '步骤3'],
    nutrition: {
      calories: 430,
      protein: 30,
      carbs: 24,
      fat: 14,
      fiber: 5,
    },
    tags: ['家常', '有食欲', '高蛋白'],
    category,
    difficulty: 'easy',
    timeNeeded: 25,
    isCompleteMeal: registryMatch?.isCompleteMeal || false,
    recommendationScore: 95,
    addedFrom: 'ai',
    addedDate: '2026-07-24',
    isUserInput: true,
  };
}

describe('wanted coverage regression', () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    vi.stubGlobal('window', { localStorage: storage });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
        text: async () => '',
      } as Response)
    );
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    vi.spyOn(aiService, 'optimizeWeeklyMenu').mockResolvedValue([]);
    vi.spyOn(aiService, 'generateDishFromName').mockImplementation(async (dishName, shouldNormalize, ingredientHints = []) => {
      void shouldNormalize;
      return createMockAiDish(dishName, ingredientHints);
    });

    initDatabase();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('库内已有菜名时，不应触发中间AI生成也必须覆盖', async () => {
    const menu = await generateWeeklyMenu([], [], ['黑椒牛肉彩椒']);

    expect(menuCoversDish(menu, '黑椒牛肉彩椒')).toBe(true);
    expect(aiService.generateDishFromName).not.toHaveBeenCalled();
  });

  it('库内已有食材时，会被当成必须覆盖目标而不是弱加权', async () => {
    const menu = await generateWeeklyMenu([], ['南瓜'], []);

    expect(menuCoversIngredient(menu, '南瓜')).toBe(true);
    expect(flattenMenuDishes(menu).some(dish => dish.isUserInput)).toBe(true);
    expect(aiService.generateDishFromName).not.toHaveBeenCalled();
  });

  it('多个库内已有的用户指定项都会稳定保留在最终周菜单里', async () => {
    const menu = await generateWeeklyMenu([], [], ['苹果桂花小米粥', '香菇鸡肉焖饭', '糖醋排骨']);

    expect(menuCoversDish(menu, '苹果桂花小米粥')).toBe(true);
    expect(menuCoversDish(menu, '香菇鸡肉焖饭')).toBe(true);
    expect(menuCoversDish(menu, '糖醋排骨')).toBe(true);
    expect(aiService.generateDishFromName).not.toHaveBeenCalled();
  });

  it('库里没有的菜名会通过中间AI结果补库并进入本周菜单', async () => {
    const wantedDishName = '椒麻排骨南瓜煲';
    const menu = await generateWeeklyMenu([], [], [wantedDishName]);

    expect(aiService.generateDishFromName).toHaveBeenCalledWith(wantedDishName);
    expect(menuCoversDish(menu, wantedDishName)).toBe(true);
    expect(getDishes().some(dish => dish.name === wantedDishName)).toBe(true);
  });

  it('库里没有的食材也会通过中间AI结果补成新菜并保证覆盖', async () => {
    const menu = await generateWeeklyMenu([], ['羊排'], []);

    expect(aiService.generateDishFromName).toHaveBeenCalledWith('羊排家常菜', false, ['羊排']);
    expect(menuCoversIngredient(menu, '羊排')).toBe(true);
    expect(getDishes().some(dish => dish.ingredients.some(ingredient => ingredient.name.includes('羊排')))).toBe(true);
  });

  it('菜名和食材混合输入时，两边都要被最终菜单覆盖', async () => {
    const menu = await generateWeeklyMenu([], ['南瓜'], ['糖醋排骨']);

    expect(menuCoversDish(menu, '糖醋排骨')).toBe(true);
    expect(menuCoversIngredient(menu, '南瓜')).toBe(true);
    expect(aiService.generateDishFromName).not.toHaveBeenCalled();
  });

  it('clean-room 中间输出带有餐型约束时，最终落位也不能乱放', async () => {
    const menu = await generateWeeklyMenu([], [], ['南瓜燕麦酸奶碗', '酸菜鱼']);
    const entries = flattenMenuEntries(menu);

    const breakfastWanted = entries.find(entry => entry.dish.name === '南瓜燕麦酸奶碗');
    const dinnerWanted = entries.find(entry => entry.dish.name === '酸菜鱼');

    expect(breakfastWanted?.mealType).toBe('breakfast');
    expect(dinnerWanted?.mealType).not.toBe('breakfast');
    expect(menuCoversDish(menu, '南瓜燕麦酸奶碗')).toBe(true);
    expect(menuCoversDish(menu, '酸菜鱼')).toBe(true);
  });
});
