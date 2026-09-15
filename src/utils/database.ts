import { Dish, UserPreference } from '../types';
import { recipeDatabase } from '../data/recipes';
import { appStorage, loadJson, saveJson } from './storage';

const DB_KEYS = {
  DISHES: 'recipe_dishes',
  PREFERENCES: 'recipe_preferences',
  GENERATION_HISTORY: 'recipe_generation_history',
  PRESET_VERSION: 'recipe_preset_version',
};

const PRESET_LIBRARY_VERSION = 'weekeat-preset-20260808';

const DEFAULT_PREFERENCES: UserPreference = {
  dislikedIngredients: [],
  dietaryRestrictions: [],
  likedIngredients: [],
  likedDishes: [],
  likedTags: [],
  dislikedTags: [],
  healthGoals: [],
  preferenceSummary: '',
  servingSize: 1,
  targetCalories: 1900,
  macroTargets: {
    proteinPercent: 20,
    carbsPercent: 50,
    fatPercent: 30,
  },
};

type PreferenceProfileInput = Partial<Pick<
  UserPreference,
  'likedIngredients' | 'likedDishes' | 'likedTags' | 'dislikedIngredients' | 'dislikedTags' | 'healthGoals' | 'preferenceSummary'
>> & {
  recommendedIngredients?: string[];
  recommendedDishes?: string[];
  avoidIngredients?: string[];
  shouldRebalanceAllScores?: boolean;
};

function uniqueStrings(items: string[] = []): string[] {
  return Array.from(new Set(items.map(item => item.trim()).filter(Boolean)));
}

function normalizePreferences(prefs?: Partial<UserPreference>): UserPreference {
  return {
    ...DEFAULT_PREFERENCES,
    ...prefs,
    dislikedIngredients: uniqueStrings(prefs?.dislikedIngredients ?? DEFAULT_PREFERENCES.dislikedIngredients),
    dietaryRestrictions: uniqueStrings(prefs?.dietaryRestrictions ?? DEFAULT_PREFERENCES.dietaryRestrictions),
    likedIngredients: uniqueStrings(prefs?.likedIngredients ?? DEFAULT_PREFERENCES.likedIngredients),
    likedDishes: uniqueStrings(prefs?.likedDishes ?? DEFAULT_PREFERENCES.likedDishes),
    likedTags: uniqueStrings(prefs?.likedTags ?? DEFAULT_PREFERENCES.likedTags),
    dislikedTags: uniqueStrings(prefs?.dislikedTags ?? DEFAULT_PREFERENCES.dislikedTags),
    healthGoals: uniqueStrings(prefs?.healthGoals ?? DEFAULT_PREFERENCES.healthGoals),
    preferenceSummary: prefs?.preferenceSummary?.trim() ?? DEFAULT_PREFERENCES.preferenceSummary,
  };
}

export function clampScore(score: number): number {
  return Math.max(8, Math.min(98, Math.round(score)));
}

export function liftScore(score: number, amount: number): number {
  const normalized = 100 - (100 - score) * Math.exp(-amount / 28);
  return clampScore(normalized);
}

export function pullScoreDown(score: number, amount: number): number {
  const normalized = 8 + (score - 8) * Math.exp(-amount / 18);
  return clampScore(normalized);
}

export function regressToNeutral(score: number, rate: number): number {
  return clampScore(50 + (score - 50) * Math.exp(-rate));
}

export function recoverScoreWhenSkipped(score: number): number {
  const rate = score < 50 ? 0.22 : 0.12;
  return regressToNeutral(score, rate);
}

export function decayScoreAfterSelection(score: number): number {
  return clampScore(regressToNeutral(score, 1.02) - 12);
}

function includesLoose(haystack: string, needle: string): boolean {
  return haystack.includes(needle) || needle.includes(haystack);
}

function dedupeDishes(dishes: Dish[]): Dish[] {
  const seenIds = new Set<string>();
  const deduped: Dish[] = [];

  for (const dish of dishes) {
    if (seenIds.has(dish.id)) {
      continue;
    }
    seenIds.add(dish.id);
    deduped.push(dish);
  }

  return deduped;
}

function mergePresetDish(presetDish: Dish, existingDish?: Dish): Dish {
  if (!existingDish) {
    return presetDish;
  }

  return {
    ...presetDish,
    ...existingDish,
    tags: presetDish.tags,
    id: existingDish.id || presetDish.id,
    name: existingDish.name || presetDish.name,
    addedFrom: 'preset',
    addedDate: existingDish.addedDate || presetDish.addedDate,
  };
}

function mergePresetDishWithReset(presetDish: Dish, existingDish?: Dish): Dish {
  if (!existingDish) {
    return presetDish;
  }

  return {
    ...presetDish,
    ...existingDish,
    tags: presetDish.tags,
    recommendationScore: presetDish.recommendationScore,
    lastRecommendedDate: undefined,
    id: existingDish.id || presetDish.id,
    name: existingDish.name || presetDish.name,
    addedFrom: 'preset',
    addedDate: existingDish.addedDate || presetDish.addedDate,
  };
}

// 数据库初始化
export const initDatabase = (): void => {
  const shouldRefreshPresetState = appStorage.getItem(DB_KEYS.PRESET_VERSION) !== PRESET_LIBRARY_VERSION;

  // 初始化菜谱库
  if (!appStorage.getItem(DB_KEYS.DISHES)) {
    saveDishes(recipeDatabase);
  } else {
    const existingDishes = getDishes();
    const matchedExistingIds = new Set<string>();

    const mergedPresetDishes = recipeDatabase.map((presetDish: Dish) => {
      const existingDish = existingDishes.find(dish =>
        dish.id === presetDish.id ||
        (dish.addedFrom === 'preset' && dish.name === presetDish.name)
      );

      if (existingDish) {
        matchedExistingIds.add(existingDish.id);
      }

      return shouldRefreshPresetState
        ? mergePresetDishWithReset(presetDish, existingDish)
        : mergePresetDish(presetDish, existingDish);
    });

    const remainingDishes = existingDishes.filter(dish => !matchedExistingIds.has(dish.id));
    saveDishes(dedupeDishes([...mergedPresetDishes, ...remainingDishes]));
  }
  
  // 初始化用户偏好
  if (!appStorage.getItem(DB_KEYS.PREFERENCES)) {
    savePreferences(DEFAULT_PREFERENCES);
  }

  if (shouldRefreshPresetState) {
    appStorage.removeItem(DB_KEYS.GENERATION_HISTORY);
    appStorage.setItem(DB_KEYS.PRESET_VERSION, PRESET_LIBRARY_VERSION);
  }
};

// 获取所有菜谱
export const getDishes = (): Dish[] => {
  return loadJson<Dish[]>(DB_KEYS.DISHES, []);
};

// 保存所有菜谱
export const saveDishes = (dishes: Dish[]): void => {
  saveJson(DB_KEYS.DISHES, dedupeDishes(dishes));
};

// 添加单个菜谱
export const addDish = (dish: Dish): void => {
  const dishes = getDishes();
  dishes.push(dish);
  saveDishes(dishes);
};

// 添加或更新单个菜谱，避免 AI 多次生成同名菜后出现重复记录
export const upsertDish = (dish: Dish): Dish => {
  const dishes = getDishes();
  const index = dishes.findIndex(existing => existing.id === dish.id || existing.name === dish.name);

  if (index === -1) {
    dishes.push(dish);
    saveDishes(dishes);
    return dish;
  }

  const existing = dishes[index];
  const mergedDish: Dish = {
    ...existing,
    ...dish,
    id: existing.id,
    name: existing.name,
    addedDate: existing.addedDate || dish.addedDate,
    addedFrom: existing.addedFrom || dish.addedFrom,
    recommendationScore: Math.max(existing.recommendationScore ?? 0, dish.recommendationScore ?? 0),
    lastRecommendedDate: existing.lastRecommendedDate || dish.lastRecommendedDate,
  };

  dishes[index] = mergedDish;
  saveDishes(dishes);
  return mergedDish;
};

// 更新单个菜谱
export const updateDish = (id: string, updates: Partial<Dish>): void => {
  const dishes = getDishes();
  const index = dishes.findIndex(d => d.id === id);
  if (index !== -1) {
    dishes[index] = { ...dishes[index], ...updates };
    saveDishes(dishes);
  }
};

// 删除菜谱
export const deleteDish = (id: string): void => {
  const dishes = getDishes();
  const filtered = dishes.filter(d => d.id !== id);
  saveDishes(filtered);
};

// 获取用户偏好
export const getPreferences = (): UserPreference => {
  return normalizePreferences(loadJson<Partial<UserPreference>>(DB_KEYS.PREFERENCES, DEFAULT_PREFERENCES));
};

// 保存用户偏好
export const savePreferences = (prefs: UserPreference): void => {
  saveJson(DB_KEYS.PREFERENCES, normalizePreferences(prefs));
};

export const mergePreferences = (updates: Partial<UserPreference>): UserPreference => {
  const current = getPreferences();
  const next = normalizePreferences({
    ...current,
    ...updates,
    dislikedIngredients: uniqueStrings([...(current.dislikedIngredients || []), ...(updates.dislikedIngredients || [])]),
    dietaryRestrictions: uniqueStrings([...(current.dietaryRestrictions || []), ...(updates.dietaryRestrictions || [])]),
    likedIngredients: uniqueStrings([...(current.likedIngredients || []), ...(updates.likedIngredients || [])]),
    likedDishes: uniqueStrings([...(current.likedDishes || []), ...(updates.likedDishes || [])]),
    likedTags: uniqueStrings([...(current.likedTags || []), ...(updates.likedTags || [])]),
    dislikedTags: uniqueStrings([...(current.dislikedTags || []), ...(updates.dislikedTags || [])]),
    healthGoals: uniqueStrings([...(current.healthGoals || []), ...(updates.healthGoals || [])]),
    preferenceSummary: updates.preferenceSummary?.trim() || current.preferenceSummary,
  });
  savePreferences(next);
  return next;
};

export const applyDietPreferenceProfile = (profile: PreferenceProfileInput): UserPreference => {
  const nextPreferences = mergePreferences({
    likedIngredients: uniqueStrings([...(profile.likedIngredients || []), ...(profile.recommendedIngredients || [])]),
    likedDishes: uniqueStrings([...(profile.likedDishes || []), ...(profile.recommendedDishes || [])]),
    likedTags: uniqueStrings(profile.likedTags || []),
    dislikedIngredients: uniqueStrings([...(profile.dislikedIngredients || []), ...(profile.avoidIngredients || [])]),
    dislikedTags: uniqueStrings(profile.dislikedTags || []),
    healthGoals: uniqueStrings(profile.healthGoals || []),
    preferenceSummary: profile.preferenceSummary || '',
  });

  const dishes = getDishes();
  const likedIngredients = nextPreferences.likedIngredients;
  const likedDishes = nextPreferences.likedDishes;
  const likedTags = nextPreferences.likedTags;
  const dislikedIngredients = nextPreferences.dislikedIngredients;
  const dislikedTags = nextPreferences.dislikedTags;

  const updatedDishes = dishes.map(dish => {
    let nextScore = dish.recommendationScore ?? 50;

    const ingredientNames = dish.ingredients.map(ingredient => ingredient.name);
    const tagNames = dish.tags || [];

    const likedDishHit = likedDishes.some(name => includesLoose(dish.name, name));
    const likedIngredientHits = likedIngredients.filter(name =>
      ingredientNames.some(ingredientName => includesLoose(ingredientName, name))
    ).length;
    const likedTagHits = likedTags.filter(tag =>
      tagNames.some(dishTag => includesLoose(dishTag, tag))
    ).length;

    const dislikedIngredientHits = dislikedIngredients.filter(name =>
      ingredientNames.some(ingredientName => includesLoose(ingredientName, name))
    ).length;
    const dislikedTagHits = dislikedTags.filter(tag =>
      tagNames.some(dishTag => includesLoose(dishTag, tag))
    ).length;

    if (likedDishHit) {
      nextScore = liftScore(nextScore, 24);
    }
    if (likedIngredientHits > 0) {
      nextScore = liftScore(nextScore, likedIngredientHits * 9);
    }
    if (likedTagHits > 0) {
      nextScore = liftScore(nextScore, likedTagHits * 7);
    }
    if (dislikedIngredientHits > 0) {
      nextScore = pullScoreDown(nextScore, dislikedIngredientHits * 18);
    }
    if (dislikedTagHits > 0) {
      nextScore = pullScoreDown(nextScore, dislikedTagHits * 12);
    }

    if (profile.shouldRebalanceAllScores) {
      nextScore = regressToNeutral(nextScore, 0.08);
    }

    return {
      ...dish,
      recommendationScore: nextScore,
    };
  });

  saveDishes(updatedDishes);
  return nextPreferences;
};

// 批量更新推荐度（用于生成本周菜谱后）
export const updateRecommendationScores = (selectedDishIds: string[]): void => {
  const dishes = getDishes();
  const today = new Date().toISOString().split('T')[0];
  
  const updatedDishes = dishes.map(dish => {
    if (selectedDishIds.includes(dish.id)) {
      return {
        ...dish,
        recommendationScore: decayScoreAfterSelection(dish.recommendationScore ?? 50),
        lastRecommendedDate: today,
      };
    } else {
      return {
        ...dish,
        recommendationScore: recoverScoreWhenSkipped(dish.recommendationScore ?? 50),
      };
    }
  });
  
  saveDishes(updatedDishes);
};

// 提升特定菜谱的推荐度（本轮用户输入相关的菜）
export const boostRecommendationScore = (dishIds: string[], boostAmount: number = 50): void => {
  const dishes = getDishes();
  
  const updatedDishes = dishes.map(dish => {
    if (dishIds.includes(dish.id)) {
      return {
        ...dish,
        recommendationScore: liftScore(dish.recommendationScore ?? 50, boostAmount),
      };
    }
    return dish;
  });
  
  saveDishes(updatedDishes);
};

// 对话动作按菜名调整喜爱度；只处理当前本地库中已有的菜。
export const adjustRecommendationScoresByName = (
  adjustments: { dishName: string; delta: number }[]
): string[] => {
  const requested = new Map<string, number>();
  adjustments.forEach(({ dishName, delta }) => {
    if (!dishName?.trim() || !Number.isFinite(delta) || delta === 0) return;
    requested.set(dishName.trim(), (requested.get(dishName.trim()) || 0) + delta);
  });

  const appliedNames: string[] = [];
  const updatedDishes = getDishes().map(dish => {
    const delta = requested.get(dish.name);
    if (!delta) return dish;

    appliedNames.push(dish.name);
    return {
      ...dish,
      recommendationScore: delta > 0
        ? liftScore(dish.recommendationScore ?? 50, delta)
        : pullScoreDown(dish.recommendationScore ?? 50, Math.abs(delta)),
    };
  });

  if (appliedNames.length > 0) saveDishes(updatedDishes);
  return appliedNames;
};
