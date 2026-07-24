import { Dish, DailyMenu, Meal, ShoppingItem } from '../types';
import { fruitsList } from '../data/recipes';
import { aiService } from './aiService';
import { getDishes, upsertDish, boostRecommendationScore, updateRecommendationScores, getPreferences, updateDish } from './database';
import { calculateNutritionScore, selectDishByScore, generateSmartTags } from './nutritionEngine';

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const ROUND_WANTED_TAG = '本轮想吃';

function parseQuantity(qty: string): number {
  const match = qty.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 1;
}

function getDefaultUnit(name: string): string {
  const unitMap: Record<string, string> = {
    '番茄': '个', '鸡蛋': '个', '土豆': '个', '青椒': '个',
    '西兰花': '颗', '芹菜': '棵', '豆腐': '盒', '米饭': '碗',
    '吐司': '片', '牛奶': '盒', '燕麦': '克',
  };
  return unitMap[name] || '适量';
}

function getCategoryName(category: string): string {
  const map: Record<string, string> = {
    'vegetable': '蔬菜', 'meat': '肉类', 'seasoning': '调料',
    'grain': '主食', 'fruit': '水果', 'other': '其他',
  };
  return map[category] || '其他';
}

function isPerishable(name: string): boolean {
  const perishables = ['生菜', '番茄', '黄瓜', '草莓', '蓝莓', '香蕉', '青菜', '空心菜'];
  return perishables.some(p => name.includes(p));
}

function getRandomFromArray<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function isMeatDish(dish: Dish): boolean {
  return dish.ingredients.some(ing => ing.category === 'meat');
}

function hasVegetableIngredient(dish: Dish): boolean {
  return dish.ingredients.some(ing => ing.category === 'vegetable');
}

function isHealthyBreakfast(dish: Dish): boolean {
  const forbidden = ['面', '吐司', '三明治', '包子', '饼', '油条', '馒头'];
  return dish.category === 'breakfast' && !forbidden.some(keyword => dish.name.includes(keyword));
}

function createMeal(type: Meal['type'], dishes: Dish[]): Meal {
  return { type, dishes };
}

function cloneMenu(menu: DailyMenu[]): DailyMenu[] {
  return menu.map(day => ({
    ...day,
    meals: {
      breakfast: day.meals.breakfast ? { ...day.meals.breakfast, dishes: [...day.meals.breakfast.dishes] } : undefined,
      lunch: day.meals.lunch ? { ...day.meals.lunch, dishes: [...day.meals.lunch.dishes] } : undefined,
      dinner: day.meals.dinner ? { ...day.meals.dinner, dishes: [...day.meals.dinner.dishes] } : undefined,
    },
  }));
}

function chooseCompanionDish(baseDish: Dish, dishes: Dish[], usedIds: Set<string>, usedNames: Set<string>): Dish | null {
  const candidates = dishes.filter(d => !usedIds.has(d.id) && !usedNames.has(d.name) && d.id !== baseDish.id);
  if (candidates.length === 0) return null;

  if (isMeatDish(baseDish)) {
    const vegetableCandidates = candidates.filter(hasVegetableIngredient);
    if (vegetableCandidates.length > 0) {
      return selectDishByScore(vegetableCandidates);
    }
  }

  if (!isMeatDish(baseDish) || !hasVegetableIngredient(baseDish)) {
    const proteinCandidates = candidates.filter(isMeatDish);
    if (proteinCandidates.length > 0) {
      return selectDishByScore(proteinCandidates);
    }
  }

  return selectDishByScore(candidates);
}

function withRoundWantedTag(dish: Dish): Dish {
  return {
    ...dish,
    isUserInput: true,
    tags: Array.from(new Set([...(dish.tags || []), ROUND_WANTED_TAG])),
    recommendationScore: Math.min(100, (dish.recommendationScore || 0) + 35),
  };
}

function isWantedDish(dish: Dish, wantedDishIds: Set<string>): boolean {
  return wantedDishIds.has(dish.id);
}

export async function updateRecipeLibrary(
  userDishes: Dish[],
  desiredIngredients: string[],
  desiredDishes: string[]
): Promise<Dish[]> {
  const newDishes: Dish[] = [...userDishes];
  const desiredDishIds = new Set<string>();
  
  for (const dishName of desiredDishes) {
    const existing = getDishes().find(d => 
      d.name.includes(dishName) || dishName.includes(d.name)
    );
    
    if (existing) {
      updateDish(existing.id, {
        recommendationScore: Math.min(100, existing.recommendationScore + 40),
      });
      desiredDishIds.add(existing.id);
    } else {
      try {
        const aiDish = await aiService.generateDishFromName(dishName);
        const persistedDish = upsertDish(aiDish);
        newDishes.push(persistedDish);
        desiredDishIds.add(persistedDish.id);
      } catch (e) {
        console.warn('⚠️ 生成菜谱失败，跳过:', dishName);
      }
    }
  }
  
  const inputDishIds = newDishes.map(d => d.id);
  const ingredientRelatedIds = getDishes()
    .filter(d =>
      d.ingredients.some(ing =>
        desiredIngredients.some(desired =>
          ing.name.includes(desired) || desired.includes(ing.name)
        )
      )
    )
    .map(d => d.id);

  boostRecommendationScore(Array.from(new Set([...desiredDishIds, ...inputDishIds])), 28);
  boostRecommendationScore(Array.from(new Set(ingredientRelatedIds)), 12);
  
  return newDishes;
}

function selectBreakfastDish(
  mustHaveDish: Dish | undefined,
  breakfastDishes: Dish[],
  usedIds: Set<string>,
  usedNames: Set<string>
): Dish[] {
  if (mustHaveDish && !usedIds.has(mustHaveDish.id) && !usedNames.has(mustHaveDish.name)) {
    return [mustHaveDish];
  }

  const freshBreakfasts = breakfastDishes.filter(d => !usedIds.has(d.id) && !usedNames.has(d.name));
  if (freshBreakfasts.length > 0) {
    const selected = selectDishByScore(freshBreakfasts);
    return selected ? [selected] : [getRandomFromArray(freshBreakfasts)];
  }

  return breakfastDishes.length > 0 ? [getRandomFromArray(breakfastDishes)] : [];
}

function selectDishesForMainMeal(
  mustHaveDish: Dish | undefined,
  availableDishes: Dish[],
  usedIds: Set<string>,
  usedNames: Set<string>
): Dish[] {
  const freshDishes = availableDishes.filter(d => !usedIds.has(d.id) && !usedNames.has(d.name));
  const pool = freshDishes.length > 0 ? freshDishes : availableDishes;

  if (mustHaveDish && !usedIds.has(mustHaveDish.id) && !usedNames.has(mustHaveDish.name)) {
    if (mustHaveDish.isCompleteMeal) {
      return [mustHaveDish];
    }
    const companion = chooseCompanionDish(mustHaveDish, pool, usedIds, usedNames);
    return companion ? [mustHaveDish, companion] : [mustHaveDish];
  }

  const completeMealCandidates = pool.filter(d => d.isCompleteMeal);
  if (completeMealCandidates.length > 0 && Math.random() > 0.55) {
    const completeMeal = selectDishByScore(completeMealCandidates);
    return completeMeal ? [completeMeal] : [getRandomFromArray(completeMealCandidates)];
  }

  const proteinCandidates = pool.filter(d => isMeatDish(d) && !d.isCompleteMeal);
  const vegetableCandidates = pool.filter(d => hasVegetableIngredient(d) && !d.isCompleteMeal);

  const primary = selectDishByScore(proteinCandidates.length > 0 ? proteinCandidates : pool);
  if (!primary) return [];
  if (primary.isCompleteMeal) return [primary];

  const companion = chooseCompanionDish(primary, vegetableCandidates.length > 0 ? vegetableCandidates : pool, usedIds, usedNames);
  return companion ? [primary, companion] : [primary];
}

function assignMeal(
  dayMenu: DailyMenu,
  mealType: Meal['type'],
  dishes: Dish[],
  selectedDishIds: Set<string>,
  selectedDishNames: Set<string>,
  recentDishes: Dish[]
) {
  if (dishes.length === 0) return;
  dayMenu.meals[mealType] = createMeal(mealType, dishes);
  dishes.forEach(dish => {
    selectedDishIds.add(dish.id);
    selectedDishNames.add(dish.name);
    recentDishes.push(dish);
  });
}

function menuContainsDish(menu: DailyMenu[], targetDish: Dish): boolean {
  return menu.some(day =>
    Object.values(day.meals).some(meal =>
      meal?.dishes.some(dish =>
        dish.id === targetDish.id ||
        dish.name === targetDish.name ||
        dish.name.includes(targetDish.name) ||
        targetDish.name.includes(dish.name)
      )
    )
  );
}

function collectDishIdsFromMenu(menu: DailyMenu[]): string[] {
  const ids = new Set<string>();

  menu.forEach(day => {
    Object.values(day.meals).forEach(meal => {
      meal?.dishes.forEach(dish => ids.add(dish.id));
    });
  });

  return Array.from(ids);
}

function pickPriorityDish(
  remainingWanted: Dish[],
  predicate: (dish: Dish) => boolean
): Dish | undefined {
  const matches = remainingWanted.filter(predicate);
  if (matches.length === 0) {
    return undefined;
  }

  const selected = selectDishByScore(matches) || matches[0];
  const index = remainingWanted.findIndex(dish => dish.id === selected.id);
  if (index >= 0) {
    remainingWanted.splice(index, 1);
  }
  return selected;
}

function tryAppendDishToMeal(meal: Meal | undefined, dish: Dish): boolean {
  if (!meal) {
    return true;
  }

  if (dish.isCompleteMeal) {
    return false;
  }

  if (meal.dishes.some(existingDish => existingDish.isCompleteMeal)) {
    return false;
  }

  return meal.dishes.length < 2;
}

function findReplacementSlot(
  menu: DailyMenu[],
  dish: Dish,
  wantedDishIds: Set<string>
): { dayIndex: number; mealType: Meal['type']; replaceIndex: number } | null {
  const candidateMealTypes: Meal['type'][] = dish.category === 'breakfast' ? ['breakfast'] : ['lunch', 'dinner'];
  let bestCandidate: { dayIndex: number; mealType: Meal['type']; replaceIndex: number; score: number } | null = null;

  menu.forEach((day, dayIndex) => {
    candidateMealTypes.forEach(mealType => {
      const meal = day.meals[mealType];
      if (!meal) return;

      meal.dishes.forEach((currentDish, replaceIndex) => {
        if (isWantedDish(currentDish, wantedDishIds)) {
          return;
        }

        const score = currentDish.recommendationScore ?? 0;
        if (!bestCandidate || score < bestCandidate.score) {
          bestCandidate = { dayIndex, mealType, replaceIndex, score };
        }
      });
    });
  });

  return bestCandidate;
}

function placeWantedDishInMenu(
  menu: DailyMenu[],
  dish: Dish,
  wantedDishIds: Set<string>,
  startOffset: number
): boolean {
  const targetMealTypes: Meal['type'][] = dish.category === 'breakfast' ? ['breakfast'] : ['lunch', 'dinner'];
  const totalDays = menu.length;

  for (let offset = 0; offset < totalDays; offset++) {
    const dayIndex = (startOffset + offset) % totalDays;
    const dayMenu = menu[dayIndex];

    for (const mealType of targetMealTypes) {
      const currentMeal = dayMenu.meals[mealType];
      if (!tryAppendDishToMeal(currentMeal, dish)) {
        continue;
      }

      if (!currentMeal) {
        dayMenu.meals[mealType] = createMeal(mealType, [dish]);
      } else {
        currentMeal.dishes.push(dish);
      }
      return true;
    }
  }

  const replacement = findReplacementSlot(menu, dish, wantedDishIds);
  if (!replacement) {
    return false;
  }

  const targetMeal = menu[replacement.dayIndex].meals[replacement.mealType];
  if (!targetMeal) {
    return false;
  }

  if (dish.isCompleteMeal) {
    targetMeal.dishes = [dish];
  } else {
    targetMeal.dishes[replacement.replaceIndex] = dish;
  }

  return true;
}

function ensureRequiredDishesInMenu(
  menu: DailyMenu[],
  requiredDishes: Dish[],
  wantedDishIds: Set<string>
): DailyMenu[] {
  const normalizedMenu = cloneMenu(menu);
  const missingDishes = requiredDishes.filter(dish => !menuContainsDish(normalizedMenu, dish));

  if (missingDishes.length === 0) {
    return normalizedMenu;
  }

  console.warn('⚠️ 仍有想吃菜未入选，正在分散回补:', missingDishes.map(dish => dish.name));

  missingDishes.forEach((dish, index) => {
    const placed = placeWantedDishInMenu(normalizedMenu, dish, wantedDishIds, index);
    if (!placed) {
      const dayIndex = Math.max(0, normalizedMenu.length - 1 - (index % normalizedMenu.length));
      patchMissingRequiredDish(normalizedMenu[dayIndex], dish);
    }
  });

  return normalizedMenu;
}

async function applyAiOptimization(
  weeklyMenu: DailyMenu[],
  userDishes: Dish[],
  desiredIngredients: string[],
  desiredDishes: string[],
  wantedDishIds: Set<string>
): Promise<DailyMenu[]> {
  try {
    const replacements = await aiService.optimizeWeeklyMenu(
      weeklyMenu,
      userDishes,
      desiredIngredients,
      desiredDishes
    );

    if (!replacements.length) {
      return weeklyMenu;
    }

    const optimizedMenu = cloneMenu(weeklyMenu);
    const library = getDishes();

    for (const replacement of replacements) {
      const targetDay = optimizedMenu[replacement.dayIndex];
      const targetMeal = targetDay?.meals[replacement.mealType];
      if (!targetMeal) continue;

      let nextDish =
        library.find(d => d.name.includes(replacement.suggestion) || replacement.suggestion.includes(d.name)) || null;

      if (!nextDish) {
        try {
          nextDish = upsertDish(await aiService.generateDishFromName(replacement.suggestion));
        } catch (error) {
          console.warn('⚠️ AI优化建议生成失败，跳过:', replacement.suggestion, error);
          continue;
        }
      }

      const replaceIndex = targetMeal.dishes.findIndex(d =>
        d.name.includes(replacement.replaceDishName) || replacement.replaceDishName.includes(d.name)
      );

      if (replaceIndex >= 0 && isWantedDish(targetMeal.dishes[replaceIndex], wantedDishIds)) {
        console.log('🛡️ 跳过AI替换用户想吃的菜:', targetMeal.dishes[replaceIndex].name);
        continue;
      }

      if (replaceIndex >= 0) {
        targetMeal.dishes[replaceIndex] = nextDish;
      } else if (targetMeal.dishes.length > 0) {
        targetMeal.dishes[0] = nextDish;
      }
    }

    return optimizedMenu;
  } catch (error) {
    console.warn('⚠️ AI菜单优化跳过，使用本地结果:', error);
    return weeklyMenu;
  }
}

function patchMissingRequiredDish(dayMenu: DailyMenu, missingDish: Dish) {
  if (!dayMenu.meals.dinner) {
    dayMenu.meals.dinner = createMeal('dinner', [missingDish]);
    return;
  }

  if (
    dayMenu.meals.dinner.dishes.length < 2 &&
    !dayMenu.meals.dinner.dishes.some(d => d.isCompleteMeal)
  ) {
    dayMenu.meals.dinner.dishes.push(missingDish);
    return;
  }

  if (!dayMenu.meals.lunch) {
    dayMenu.meals.lunch = createMeal('lunch', [missingDish]);
    return;
  }

  if (
    dayMenu.meals.lunch.dishes.length < 2 &&
    !dayMenu.meals.lunch.dishes.some(d => d.isCompleteMeal)
  ) {
    dayMenu.meals.lunch.dishes.push(missingDish);
    return;
  }

  if (dayMenu.meals.dinner) {
    dayMenu.meals.dinner.dishes = [missingDish];
  }
}

export async function generateWeeklyMenu(
  userDishes: Dish[],
  desiredIngredients: string[],
  desiredDishes: string[]
): Promise<DailyMenu[]> {
  console.log('🔄 开始生成周菜单...');
  console.log('📝 用户指定的菜:', desiredDishes);
  console.log('🥬 用户指定的食材:', desiredIngredients);
  
  await updateRecipeLibrary(userDishes, desiredIngredients, desiredDishes);
  
  const weeklyMenu: DailyMenu[] = [];
  const selectedDishIds = new Set<string>();
  const selectedDishNames = new Set<string>();
  const recentDishes: Dish[] = [];
  
  const preferenceSnapshot = getPreferences();
  let dishes = getDishes();
  console.log('📚 本地菜谱库数量:', dishes.length);

  dishes = dishes.map(dish => ({
    ...dish,
    recommendationScore: calculateNutritionScore(dish, preferenceSnapshot, recentDishes)
  }));
  
  const userWantedDishes: Dish[] = [];
  const wantedNames = new Set<string>();
  
  for (const desiredName of desiredDishes) {
    const matches = dishes.filter(d => 
      d.name.includes(desiredName) || desiredName.includes(d.name)
    );
    if (matches.length > 0) {
      console.log('✅ 找到用户指定的菜:', matches[0].name);
      if (!wantedNames.has(matches[0].name)) {
        userWantedDishes.push(withRoundWantedTag(matches[0]));
        wantedNames.add(matches[0].name);
      }
    } else {
      console.log('❌ 未找到用户指定的菜，寻找相似菜:', desiredName);
    }
  }
  
  for (const userDish of userDishes) {
    if (!wantedNames.has(userDish.name)) {
      userWantedDishes.push(withRoundWantedTag(userDish));
      wantedNames.add(userDish.name);
    }
  }
  
  console.log('⭐ 本轮想吃标签菜:', userWantedDishes.map(d => d.name));
  
  const remainingWanted = [...userWantedDishes];
  const wantedDishIds = new Set(userWantedDishes.map(d => d.id));
  
  const breakfastDishes = dishes.filter(isHealthyBreakfast);
  console.log('🥞 早餐类:', breakfastDishes.length);
  
  const lunchDishes = dishes.filter(d => d.category === 'lunch' || d.category === 'dinner');
  console.log('🍱 午餐类:', lunchDishes.length);
  
  const dinnerDishes = dishes.filter(d => d.category === 'dinner' || d.category === 'lunch');
  console.log('🍽️  晚餐类:', dinnerDishes.length);
  
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const date = new Date(Date.now() + dayIndex * 24 * 60 * 60 * 1000);
    const dayMenu: DailyMenu = {
      date: date.toISOString().split('T')[0],
      dayName: dayNames[dayIndex],
      meals: {}
    };
    
    console.log(`📅 ${dayMenu.dayName} (${dayMenu.date}):`);
    
    const breakfastMustHave = pickPriorityDish(
      remainingWanted,
      d => d.category === 'breakfast' && !selectedDishIds.has(d.id)
    );
    const breakfastSelection = selectBreakfastDish(
      breakfastMustHave,
      breakfastDishes,
      selectedDishIds,
      selectedDishNames
    );
    assignMeal(dayMenu, 'breakfast', breakfastSelection, selectedDishIds, selectedDishNames, recentDishes);
    console.log('  早餐:', breakfastSelection.map(d => d.name).join(' + '));

    const lunchMustHave = pickPriorityDish(
      remainingWanted,
      d => d.category !== 'breakfast' && !selectedDishIds.has(d.id)
    );
    const lunchSelection = selectDishesForMainMeal(
      lunchMustHave,
      lunchDishes,
      selectedDishIds,
      selectedDishNames
    );
    assignMeal(dayMenu, 'lunch', lunchSelection, selectedDishIds, selectedDishNames, recentDishes);
    console.log('  午餐:', lunchSelection.map(d => d.name).join(' + '));

    const dinnerMustHave = pickPriorityDish(
      remainingWanted,
      d => d.category !== 'breakfast' && !selectedDishIds.has(d.id)
    );
    const dinnerSelection = selectDishesForMainMeal(
      dinnerMustHave,
      dinnerDishes,
      selectedDishIds,
      selectedDishNames
    );
    assignMeal(dayMenu, 'dinner', dinnerSelection, selectedDishIds, selectedDishNames, recentDishes);
    console.log('  晚餐:', dinnerSelection.map(d => d.name).join(' + '));
    
    weeklyMenu.push(dayMenu);
  }
  
  const finalMissing = remainingWanted.filter(d => !selectedDishIds.has(d.id));
  
  if (finalMissing.length > 0) {
    console.warn('⚠️ 首轮排布后仍有想吃菜未被放入，开始跨天重新分配:', finalMissing.map(d => d.name));
    finalMissing.forEach((missing, index) => {
      const placed = placeWantedDishInMenu(weeklyMenu, missing, wantedDishIds, index);
      if (!placed) {
        const lastDay = weeklyMenu[6];
        console.warn('⚠️ 分散回补失败，才使用最后一天兜底:', missing.name);
        patchMissingRequiredDish(lastDay, missing);
      }
      selectedDishIds.add(missing.id);
      selectedDishNames.add(missing.name);
    });
  }
  
  for (const desiredName of desiredDishes) {
    const found = weeklyMenu.some(day =>
      Object.values(day.meals).some(meal => 
        meal?.dishes.some(dish => dish.name.includes(desiredName) || desiredName.includes(dish.name))
      )
    );
    if (!found) {
      console.error('❌ 用户指定的菜未包含:', desiredName);
    } else {
      console.log('✅ 用户指定的菜已包含:', desiredName);
    }
  }
  
  const optimizedMenu = await applyAiOptimization(
    weeklyMenu,
    userDishes,
    desiredIngredients,
    desiredDishes,
    wantedDishIds
  );
  const finalMenu = ensureRequiredDishesInMenu(optimizedMenu, userWantedDishes, wantedDishIds);
  const finalSelectedDishIds = collectDishIdsFromMenu(finalMenu);

  updateRecommendationScores(finalSelectedDishIds);
  
  console.log('✅ 周菜单生成完成！');
  return finalMenu;
}

export async function generateShoppingList(weeklyMenu: DailyMenu[]): Promise<ShoppingItem[]> {
  try {
    const aiList = await aiService.generateShoppingList(weeklyMenu);
    return aiList;
  } catch (e) {
    console.warn('⚠️ AI生成采购清单失败，使用本地生成');
    return generateLocalShoppingList(weeklyMenu);
  }
}

function generateLocalShoppingList(weeklyMenu: DailyMenu[]): ShoppingItem[] {
  const ingredientMap = new Map<string, { quantity: number; unit: string; category: string }>();

  weeklyMenu.forEach(day => {
    Object.values(day.meals).forEach(meal => {
      if (meal?.dishes?.length) {
        meal.dishes.forEach(dish => {
          dish.ingredients.forEach(ing => {
            const key = ing.name;
            const qty = parseQuantity(ing.quantity);

            if (ingredientMap.has(key)) {
              ingredientMap.get(key)!.quantity += qty;
            } else {
              ingredientMap.set(key, {
                quantity: qty,
                unit: ing.unit || getDefaultUnit(ing.name),
                category: getCategoryName(ing.category),
              });
            }
          });
        });
      }
    });
  });

  const fruit = fruitsList[Math.floor(Math.random() * fruitsList.length)];
  ingredientMap.set(fruit.name, {
    quantity: 7,
    unit: fruit.unit,
    category: '水果',
  });

  ingredientMap.set('大米', {
    quantity: 1,
    unit: '袋',
    category: '主食',
  });

  const shoppingList: ShoppingItem[] = Array.from(ingredientMap.entries()).map(([name, data]) => ({
    name,
    quantity: data.quantity,
    unit: data.unit,
    category: data.category,
    isSameDay: isPerishable(name),
  }));

  return shoppingList.sort((a, b) => a.category.localeCompare(b.category));
}

export async function analyzeImage(image: File): Promise<Dish> {
  const dish = await aiService.analyzeImage(image);
  
  const enhancedDish: Dish = {
    ...dish,
    tags: generateSmartTags(dish),
    category: dish.category || 'dinner',
    difficulty: dish.difficulty || 'medium',
    timeNeeded: dish.timeNeeded || 30,
    recommendationScore: 95,
    addedFrom: 'image',
    addedDate: new Date().toISOString().split('T')[0]
  };
  
  return upsertDish(enhancedDish);
}
