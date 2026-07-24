export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
  category: 'vegetable' | 'meat' | 'seasoning' | 'grain' | 'fruit' | 'other';
  isPerishable?: boolean;
}

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
}

export interface Dish {
  id: string;
  name: string;
  ingredients: Ingredient[];
  instructions: string[];
  nutrition: Nutrition;
  isUserInput?: boolean;
  // 新增字段
  imageUrl?: string;
  tutorialUrl?: string; // 做法教程链接
  tags: string[]; // 标签：如"高蛋白"、"快手菜"、"素食"、"一人食"
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  difficulty: 'easy' | 'medium' | 'hard';
  timeNeeded: number; // 分钟
  isFavorite?: boolean;
  isCompleteMeal?: boolean; // 是否是完整一餐（如煲仔饭、炒饭等）
  // 推荐度系统
  recommendationScore: number; // 0-100
  lastRecommendedDate?: string; // 上次推荐日期
  // 来源追踪
  addedFrom: 'manual' | 'image' | 'ai' | 'preset';
  addedDate: string;
}

export interface Meal {
  type: 'breakfast' | 'lunch' | 'dinner';
  dishes: Dish[];
  isUserChoice?: boolean;
}

export interface DailyMenu {
  date: string;
  dayName: string;
  meals: {
    breakfast?: Meal;
    lunch?: Meal;
    dinner?: Meal;
  };
}

export interface ShoppingItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  isSameDay: boolean;
  checked?: boolean;
}

export interface UserPreference {
  dislikedIngredients: string[];
  dietaryRestrictions: string[];
  likedIngredients: string[];
  likedDishes: string[];
  likedTags: string[];
  dislikedTags: string[];
  healthGoals: string[];
  preferenceSummary: string;
  servingSize: number;
  targetCalories: number; // 每日目标卡路里
  macroTargets: {
    proteinPercent: number; // 目标蛋白质比例 10-35
    carbsPercent: number; // 目标碳水比例 45-65
    fatPercent: number; // 目标脂肪比例 20-35
  };
}

export interface AppConfig {
  provider: 'openai' | 'deepseek' | 'glm';
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
}
