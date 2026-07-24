import { Dish, UserPreference, Nutrition, DailyMenu, Meal } from '../types';

// 营养目标配置 - 基于中国居民膳食指南
export const NUTRITION_TARGETS = {
  male: {
    calories: 2150,
    proteinPercent: 20,
    carbsPercent: 50,
    fatPercent: 30,
    proteinMin: 10,
    proteinMax: 35,
    carbsMin: 45,
    carbsMax: 65,
    fatMin: 20,
    fatMax: 35,
  },
  female: {
    calories: 1700,
    proteinPercent: 20,
    carbsPercent: 50,
    fatPercent: 30,
    proteinMin: 10,
    proteinMax: 35,
    carbsMin: 45,
    carbsMax: 65,
    fatMin: 20,
    fatMax: 35,
  }
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function logit(p: number): number {
  const bounded = clamp(p, 0.001, 0.999);
  return Math.log(bounded / (1 - bounded));
}

function daysSince(date?: string): number {
  if (!date) return 21;
  const delta = Date.now() - new Date(date).getTime();
  return Math.max(0, delta / (1000 * 60 * 60 * 24));
}

function looseIncludes(a: string, b: string): boolean {
  return a.includes(b) || b.includes(a);
}

function getMealTargetRatio(category: Dish['category']): number {
  switch (category) {
    case 'breakfast':
      return 0.26;
    case 'lunch':
      return 0.37;
    case 'dinner':
      return 0.32;
    case 'snack':
    default:
      return 0.12;
  }
}

function countMatches(source: string[], targets: string[]): number {
  return targets.filter(target => source.some(item => looseIncludes(item, target))).length;
}

function getMacroPenaltySquare(actual: number, target: number, tolerance: number): number {
  return Math.pow((actual - target) / tolerance, 2);
}

// 计算宏量营养素百分比
export const calculateMacroPercentages = (nutrition: Nutrition, targetCalories: number) => {
  const totalCalories = Math.max(1, nutrition.calories || targetCalories);

  return {
    protein: (nutrition.protein * 4 / totalCalories) * 100,
    carbs: (nutrition.carbs * 4 / totalCalories) * 100,
    fat: (nutrition.fat * 9 / totalCalories) * 100,
  };
};

function calculateNutritionFit(dish: Dish, preferences: UserPreference): number {
  const macros = calculateMacroPercentages(dish.nutrition, preferences.targetCalories);
  const macroLoss =
    0.38 * getMacroPenaltySquare(macros.protein, preferences.macroTargets.proteinPercent, 12) +
    0.27 * getMacroPenaltySquare(macros.carbs, preferences.macroTargets.carbsPercent, 18) +
    0.35 * getMacroPenaltySquare(macros.fat, preferences.macroTargets.fatPercent, 12);

  const mealCaloriesTarget = preferences.targetCalories * getMealTargetRatio(dish.category);
  const calorieLoss = Math.pow((dish.nutrition.calories - mealCaloriesTarget) / Math.max(120, mealCaloriesTarget * 0.6), 2);

  const proteinDensity = dish.nutrition.protein / Math.max(1, dish.nutrition.calories / 100);
  const vegetableCount = dish.ingredients.filter(item => item.category === 'vegetable').length;
  const fruitCount = dish.ingredients.filter(item => item.category === 'fruit').length;
  const fiberSignal = dish.nutrition.fiber ?? 0;

  const proteinDensityScore = sigmoid((proteinDensity - 6.2) / 0.9);
  const produceScore = sigmoid((vegetableCount + fruitCount * 0.7 + fiberSignal / 4 - 1.4) / 0.8);
  const fatPenalty = sigmoid((macros.fat - (preferences.macroTargets.fatPercent + 8)) / 4);

  let goalBias = 0;
  if (preferences.healthGoals.some(goal => goal.includes('减脂') || goal.includes('减肥'))) {
    goalBias += sigmoid((proteinDensity - 6.8) / 0.8) * 0.12;
    goalBias -= sigmoid((macros.fat - 32) / 3.5) * 0.16;
  }
  if (preferences.healthGoals.some(goal => goal.includes('增肌'))) {
    goalBias += sigmoid((dish.nutrition.protein - 24) / 4) * 0.16;
  }
  if (preferences.healthGoals.some(goal => goal.includes('养胃') || goal.includes('脾胃'))) {
    const gentleScore =
      (dish.tags.includes('清爽') ? 0.12 : 0) +
      (dish.tags.includes('汤品') ? 0.1 : 0) +
      (dish.tags.includes('蒸菜') ? 0.08 : 0);
    goalBias += gentleScore;
  }
  if (preferences.healthGoals.some(goal => goal.includes('控糖'))) {
    goalBias -= sigmoid((dish.nutrition.carbs - 34) / 6) * 0.14;
  }

  const nutritionScore =
    0.46 * Math.exp(-macroLoss) +
    0.22 * Math.exp(-calorieLoss) +
    0.18 * proteinDensityScore +
    0.14 * produceScore -
    0.2 * fatPenalty +
    goalBias;

  return clamp(nutritionScore, 0.02, 0.98);
}

function calculatePreferenceFit(dish: Dish, preferences: UserPreference): number {
  const latentPreference = sigmoid(((dish.recommendationScore ?? 50) - 50) / 10);
  const ingredientNames = dish.ingredients.map(item => item.name);
  const likedIngredientHits = countMatches(ingredientNames, preferences.likedIngredients);
  const dislikedIngredientHits = countMatches(ingredientNames, preferences.dislikedIngredients);
  const likedTagHits = countMatches(dish.tags || [], preferences.likedTags);
  const dislikedTagHits = countMatches(dish.tags || [], preferences.dislikedTags);
  const likedDishHit = preferences.likedDishes.some(name => looseIncludes(dish.name, name)) ? 1 : 0;

  const raw =
    1.05 * logit(latentPreference) +
    0.82 * likedDishHit +
    0.28 * likedIngredientHits +
    0.22 * likedTagHits -
    0.58 * dislikedIngredientHits -
    0.32 * dislikedTagHits;

  return clamp(sigmoid(raw), 0.02, 0.98);
}

function calculateRecencyOpportunity(dish: Dish): number {
  const baseDays = dish.lastRecommendedDate ? daysSince(dish.lastRecommendedDate) : Math.max(12, daysSince(dish.addedDate));
  return clamp(1 - Math.exp(-baseDays / 10), 0.05, 0.98);
}

export function calculateRecommendationBreakdown(
  dish: Dish,
  preferences: UserPreference,
  recentDishes: Dish[] = []
) {
  const nutritionFit = calculateNutritionFit(dish, preferences);
  const preferenceFit = calculatePreferenceFit(dish, preferences);
  const recencyFit = calculateRecencyOpportunity(dish);

  const diversityPenalty = recentDishes.some(recentDish => recentDish.name === dish.name) ? 0.72 : 1;
  const recencyInput = clamp(0.1 + 0.9 * recencyFit, 0.05, 0.98);
  const appetitePotential =
    Math.pow(clamp(preferenceFit, 0.02, 0.98), 0.72) *
    Math.pow(recencyInput, 0.38 + 1.22 * preferenceFit);

  const finalNormalized = clamp(
    Math.pow(nutritionFit, 1.35) * appetitePotential * diversityPenalty,
    0.01,
    0.99
  );

  return {
    nutritionFit,
    preferenceFit,
    recencyFit,
    finalScore: Math.round(finalNormalized * 100),
  };
}

// 计算推荐分数 (0-100)
export const calculateNutritionScore = (dish: Dish, preferences: UserPreference, recentDishes: Dish[]): number => {
  return calculateRecommendationBreakdown(dish, preferences, recentDishes).finalScore;
};

// 根据推荐度进行概率选择，分高的概率更大，但不是必出
export const selectDishByScore = (dishes: Dish[], excludeIds: Set<string> = new Set()): Dish | null => {
  const eligibleDishes = dishes.filter(d => !excludeIds.has(d.id));
  if (eligibleDishes.length === 0) return null;

  const weights = eligibleDishes.map(dish => Math.exp(((dish.recommendationScore ?? 50) - 50) / 14));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (let index = 0; index < eligibleDishes.length; index++) {
    random -= weights[index];
    if (random <= 0) {
      return eligibleDishes[index];
    }
  }

  return eligibleDishes[eligibleDishes.length - 1];
};

// 分析用户的营养摄入情况，给出建议
export const analyzeNutritionTrend = (weekMenu: DailyMenu[]) => {
  const dailyStats = weekMenu.map(day => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    (Object.values(day.meals) as Array<Meal | undefined>).forEach(meal => {
      if (meal?.dishes?.length) {
        meal.dishes.forEach((dish: Dish) => {
          totalCalories += dish.nutrition.calories;
          totalProtein += dish.nutrition.protein;
          totalCarbs += dish.nutrition.carbs;
          totalFat += dish.nutrition.fat;
        });
      }
    });

    return {
      day: day.dayName,
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
    };
  });

  const avgCalories = dailyStats.reduce((sum, d) => sum + d.calories, 0) / dailyStats.length;
  const avgProtein = dailyStats.reduce((sum, d) => sum + d.protein, 0) / dailyStats.length;

  return {
    dailyStats,
    avgCalories,
    avgProtein,
    recommendations: [
      avgCalories < 1600 ? '建议适当增加热量摄入' : null,
      avgCalories > 2500 ? '建议控制热量摄入' : null,
      avgProtein < 50 ? '建议增加蛋白质摄入' : null,
    ].filter(Boolean) as string[],
  };
};

// 为菜品生成智能标签
export const generateSmartTags = (dish: Dish): string[] => {
  const tags = [...dish.tags];

  if (dish.nutrition.protein > 20) {
    tags.push('高蛋白');
  }

  if (dish.nutrition.fat < 10) {
    tags.push('低脂');
  }

  if (dish.timeNeeded < 30) {
    tags.push('快手菜');
  }

  if (!dish.ingredients.some(i => i.category === 'meat')) {
    tags.push('素食');
  }

  return Array.from(new Set(tags));
};
