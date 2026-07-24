import { describe, expect, it, vi, afterEach } from 'vitest';
import { Dish, UserPreference } from '../types';
import { calculateRecommendationBreakdown } from './nutritionEngine';
import { decayScoreAfterSelection, recoverScoreWhenSkipped } from './database';

function reportScenario(name: string, payload: unknown): void {
  const maybeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  if (maybeProcess?.env?.SHOW_RECOMMENDATION_REPORT === '1') {
    console.info(name, JSON.stringify(payload, null, 2));
  }
}

const basePreferences: UserPreference = {
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

function makeDish(overrides: Partial<Dish> = {}): Dish {
  return {
    id: 'test-dish',
    name: '测试菜谱',
    ingredients: [
      { name: '鸡胸肉', quantity: '140', unit: '克', category: 'meat' },
      { name: '西兰花', quantity: '120', unit: '克', category: 'vegetable' },
      { name: '糙米饭', quantity: '1', unit: '碗', category: 'grain' },
    ],
    instructions: ['步骤1', '步骤2'],
    nutrition: {
      calories: 460,
      protein: 34,
      carbs: 42,
      fat: 12,
      fiber: 7,
    },
    tags: ['高蛋白', '清爽', '家常'],
    category: 'dinner',
    difficulty: 'easy',
    timeNeeded: 20,
    recommendationScore: 50,
    addedFrom: 'preset',
    addedDate: '2026-07-01',
    ...overrides,
  };
}

function makePreferences(overrides: Partial<UserPreference> = {}): UserPreference {
  return {
    ...basePreferences,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('recommendation model regression', () => {
  it('低喜好且不健康的菜不会因为间隔时间长突然冲到高推荐度', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T12:00:00Z'));

    const dish = makeDish({
      name: '重口肥牛焗饭',
      recommendationScore: 18,
      tags: ['下饭'],
      nutrition: {
        calories: 760,
        protein: 18,
        carbs: 74,
        fat: 36,
        fiber: 2,
      },
      lastRecommendedDate: '2026-06-01',
    });
    const preferences = makePreferences();

    const result = calculateRecommendationBreakdown(dish, preferences);
    reportScenario('low-pref unhealthy stale', result);
    expect(result.recencyFit).toBeGreaterThan(0.9);
    expect(result.preferenceFit).toBeLessThan(0.2);
    expect(result.nutritionFit).toBeLessThan(0.35);
    expect(result.finalScore).toBeLessThan(30);
  });

  it('高喜好且间隔时间长的健康菜应该比普通健康菜升得更快', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T12:00:00Z'));

    const neutralDish = makeDish({
      name: '清蒸鳕鱼',
      lastRecommendedDate: '2026-06-20',
      recommendationScore: 58,
      nutrition: {
        calories: 360,
        protein: 36,
        carbs: 24,
        fat: 10,
        fiber: 5,
      },
      tags: ['高蛋白', '蒸菜', '清爽'],
    });

    const lovedDish = makeDish({
      ...neutralDish,
      id: 'loved',
      name: '很喜欢的清蒸鳕鱼',
      recommendationScore: 76,
      lastRecommendedDate: '2026-06-20',
    });

    const neutralResult = calculateRecommendationBreakdown(neutralDish, makePreferences());
    const lovedResult = calculateRecommendationBreakdown(
      lovedDish,
      makePreferences({
        likedDishes: ['很喜欢的清蒸鳕鱼'],
        likedTags: ['清爽', '蒸菜'],
      })
    );
    reportScenario('healthy stale compare', { neutralResult, lovedResult });
    expect(lovedResult.recencyFit).toBeCloseTo(neutralResult.recencyFit, 3);
    expect(lovedResult.preferenceFit).toBeGreaterThan(neutralResult.preferenceFit);
    expect(lovedResult.finalScore - neutralResult.finalScore).toBeGreaterThanOrEqual(6);
  });

  it('很喜欢的菜如果刚连续吃过，推荐度应该明显掉下去', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T12:00:00Z'));

    const dish = makeDish({
      name: '常吃的照烧鸡排',
      recommendationScore: 88,
      lastRecommendedDate: '2026-07-23',
      tags: ['高蛋白', '家常', '下饭'],
    });

    const preferences = makePreferences({
      likedDishes: ['常吃的照烧鸡排'],
      likedTags: ['高蛋白', '家常'],
    });

    const result = calculateRecommendationBreakdown(dish, preferences);
    reportScenario('loved but just ate', result);
    expect(result.preferenceFit).toBeGreaterThan(0.9);
    expect(result.recencyFit).toBeLessThan(0.15);
    expect(result.finalScore).toBeLessThan(20);
  });

  it('连续多轮被选中后的高分菜会明显回落，而不是一直居高不下', () => {
    let score = 92;

    score = decayScoreAfterSelection(score);
    const round1 = score;
    score = decayScoreAfterSelection(score);
    const round2 = score;
    score = decayScoreAfterSelection(score);
    const round3 = score;
    reportScenario('selected decay rounds', { round1, round2, round3 });

    expect(round1).toBeLessThanOrEqual(55);
    expect(round2).toBeLessThan(round1);
    expect(round3).toBeLessThan(round2);
    expect(round3).toBeGreaterThanOrEqual(8);
  });

  it('低分菜在停止出现后会逐轮回升，但不会几轮就冲到高位', () => {
    let score = 22;

    const round1 = recoverScoreWhenSkipped(score);
    const round2 = recoverScoreWhenSkipped(round1);
    const round3 = recoverScoreWhenSkipped(round2);
    const round6 = recoverScoreWhenSkipped(recoverScoreWhenSkipped(recoverScoreWhenSkipped(round3)));
    reportScenario('skip recovery rounds', { round1, round2, round3, round6 });

    expect(round1).toBeGreaterThan(score);
    expect(round3).toBeLessThan(40);
    expect(round6).toBeLessThan(50);
    expect(round6).toBeGreaterThan(round3);
  });

  it('同样间隔时间长时，高喜好菜受到的间隔度加成应该高于低喜好菜', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T12:00:00Z'));

    const baseDish = makeDish({
      name: '番茄鸡肉杂粮碗',
      lastRecommendedDate: '2026-06-12',
      recommendationScore: 55,
    });

    const lowPreference = calculateRecommendationBreakdown(baseDish, makePreferences());
    const highPreference = calculateRecommendationBreakdown(
      { ...baseDish, id: 'fav', name: '偏爱的番茄鸡肉杂粮碗', recommendationScore: 72 },
      makePreferences({
        likedDishes: ['偏爱的番茄鸡肉杂粮碗'],
        likedIngredients: ['鸡胸肉', '番茄'],
        likedTags: ['高蛋白'],
      })
    );
    reportScenario('recency weighted by preference', { lowPreference, highPreference });
    expect(highPreference.recencyFit).toBeCloseTo(lowPreference.recencyFit, 3);
    expect(highPreference.finalScore).toBeGreaterThan(lowPreference.finalScore);
    expect(highPreference.finalScore - lowPreference.finalScore).toBeGreaterThanOrEqual(8);
  });

  it('非常喜欢但明显不健康的菜，最终推荐度仍应低于中等喜好但健康的菜', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T12:00:00Z'));

    const unhealthyLovedDish = makeDish({
      name: '偏爱的厚芝士焗饭',
      recommendationScore: 82,
      nutrition: {
        calories: 820,
        protein: 20,
        carbs: 78,
        fat: 38,
        fiber: 1,
      },
      tags: ['下饭'],
      lastRecommendedDate: '2026-06-18',
    });

    const healthyDish = makeDish({
      id: 'healthy',
      name: '普通喜欢的清蒸鱼配时蔬',
      recommendationScore: 61,
      nutrition: {
        calories: 390,
        protein: 34,
        carbs: 28,
        fat: 11,
        fiber: 6,
      },
      tags: ['高蛋白', '蒸菜', '清爽'],
      lastRecommendedDate: '2026-07-10',
    });

    const lovedResult = calculateRecommendationBreakdown(
      unhealthyLovedDish,
      makePreferences({
        likedDishes: ['偏爱的厚芝士焗饭'],
        likedTags: ['下饭'],
      })
    );

    const healthyResult = calculateRecommendationBreakdown(
      healthyDish,
      makePreferences({
        likedTags: ['高蛋白'],
      })
    );
    reportScenario('unhealthy loved vs healthy moderate', { lovedResult, healthyResult });
    expect(lovedResult.preferenceFit).toBeGreaterThan(healthyResult.preferenceFit);
    expect(lovedResult.nutritionFit).toBeLessThan(healthyResult.nutritionFit);
    expect(lovedResult.finalScore).toBeLessThan(healthyResult.finalScore);
  });
});
