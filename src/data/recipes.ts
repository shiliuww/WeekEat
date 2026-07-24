import { Dish, Ingredient } from '../types';

type CookingStyle =
  | 'porridge'
  | 'bowl'
  | 'egg'
  | 'sandwich'
  | 'wrap'
  | 'complete'
  | 'stirfry'
  | 'steam'
  | 'braise'
  | 'bake'
  | 'cold'
  | 'soup';

type RecipeSeed = {
  id: string;
  name: string;
  style: CookingStyle;
  category: Dish['category'];
  difficulty: Dish['difficulty'];
  timeNeeded: number;
  tags: string[];
  ingredients: string[];
  isCompleteMeal?: boolean;
};

const EFFECTIVE_TAGS = [
  '早餐',
  '完整一餐',
  '荤菜',
  '素菜',
  '汤品',
  '高蛋白',
  '高纤维',
  '家常',
  '清爽',
  '快手',
  '下饭',
  '饱腹',
  '蒸菜',
  '三明治',
  '卷饼',
] as const;

const today = new Date().toISOString().split('T')[0];
function presetDish(
  dish: Omit<Dish, 'recommendationScore' | 'addedFrom' | 'addedDate' | 'tutorialUrl'> & { tutorialUrl?: string }
): Dish {
  return {
    ...dish,
    recommendationScore: 58,
    addedFrom: 'preset',
    addedDate: today,
  };
}

const ingredientMeta: Record<string, { quantity: string; unit: string; category: Ingredient['category'] }> = {
  小米: { quantity: '55', unit: '克', category: 'grain' },
  燕麦: { quantity: '45', unit: '克', category: 'grain' },
  燕麦片: { quantity: '45', unit: '克', category: 'grain' },
  藜麦: { quantity: '50', unit: '克', category: 'grain' },
  糙米饭: { quantity: '1', unit: '碗', category: 'grain' },
  米饭: { quantity: '1', unit: '碗', category: 'grain' },
  大米: { quantity: '70', unit: '克', category: 'grain' },
  玉米: { quantity: '1', unit: '根', category: 'grain' },
  玉米粒: { quantity: '60', unit: '克', category: 'grain' },
  红薯: { quantity: '120', unit: '克', category: 'grain' },
  紫薯: { quantity: '120', unit: '克', category: 'grain' },
  芋头: { quantity: '120', unit: '克', category: 'grain' },
  板栗: { quantity: '80', unit: '克', category: 'grain' },
  全麦吐司: { quantity: '2', unit: '片', category: 'grain' },
  吐司: { quantity: '2', unit: '片', category: 'grain' },
  全麦卷饼: { quantity: '1', unit: '张', category: 'grain' },
  全麦意面: { quantity: '70', unit: '克', category: 'grain' },
  意面: { quantity: '70', unit: '克', category: 'grain' },
  荞麦面: { quantity: '70', unit: '克', category: 'grain' },
  粉丝: { quantity: '40', unit: '克', category: 'grain' },
  鸡蛋: { quantity: '2', unit: '个', category: 'other' },
  鸡胸肉: { quantity: '140', unit: '克', category: 'meat' },
  鸡腿肉: { quantity: '160', unit: '克', category: 'meat' },
  鸡翅: { quantity: '6', unit: '个', category: 'meat' },
  鸡蓉: { quantity: '90', unit: '克', category: 'meat' },
  鸡丝: { quantity: '90', unit: '克', category: 'meat' },
  牛肉: { quantity: '140', unit: '克', category: 'meat' },
  牛柳: { quantity: '140', unit: '克', category: 'meat' },
  牛腩: { quantity: '160', unit: '克', category: 'meat' },
  肥牛: { quantity: '140', unit: '克', category: 'meat' },
  里脊肉: { quantity: '140', unit: '克', category: 'meat' },
  猪里脊: { quantity: '140', unit: '克', category: 'meat' },
  排骨: { quantity: '180', unit: '克', category: 'meat' },
  肉末: { quantity: '120', unit: '克', category: 'meat' },
  虾仁: { quantity: '120', unit: '克', category: 'meat' },
  虾滑: { quantity: '120', unit: '克', category: 'meat' },
  三文鱼: { quantity: '140', unit: '克', category: 'meat' },
  鳕鱼: { quantity: '140', unit: '克', category: 'meat' },
  龙利鱼: { quantity: '140', unit: '克', category: 'meat' },
  巴沙鱼: { quantity: '140', unit: '克', category: 'meat' },
  鲈鱼: { quantity: '1', unit: '条', category: 'meat' },
  多宝鱼: { quantity: '1', unit: '条', category: 'meat' },
  金枪鱼: { quantity: '100', unit: '克', category: 'meat' },
  猪肝: { quantity: '120', unit: '克', category: 'meat' },
  豆腐: { quantity: '200', unit: '克', category: 'other' },
  嫩豆腐: { quantity: '200', unit: '克', category: 'other' },
  北豆腐: { quantity: '200', unit: '克', category: 'other' },
  腐竹: { quantity: '60', unit: '克', category: 'other' },
  豆皮: { quantity: '80', unit: '克', category: 'other' },
  豆干: { quantity: '80', unit: '克', category: 'other' },
  豆浆: { quantity: '250', unit: '毫升', category: 'other' },
  牛奶: { quantity: '220', unit: '毫升', category: 'other' },
  酸奶: { quantity: '180', unit: '克', category: 'other' },
  希腊酸奶: { quantity: '180', unit: '克', category: 'other' },
  奶酪: { quantity: '20', unit: '克', category: 'other' },
  苹果: { quantity: '1', unit: '个', category: 'fruit' },
  香蕉: { quantity: '1', unit: '根', category: 'fruit' },
  蓝莓: { quantity: '50', unit: '克', category: 'fruit' },
  草莓: { quantity: '6', unit: '颗', category: 'fruit' },
  木瓜: { quantity: '120', unit: '克', category: 'fruit' },
  牛油果: { quantity: '半', unit: '个', category: 'fruit' },
  红枣: { quantity: '4', unit: '颗', category: 'fruit' },
  山楂: { quantity: '4', unit: '片', category: 'fruit' },
  桂花: { quantity: '少许', unit: '', category: 'seasoning' },
  奇亚籽: { quantity: '1', unit: '勺', category: 'other' },
  核桃: { quantity: '10', unit: '克', category: 'other' },
  腰果: { quantity: '15', unit: '克', category: 'other' },
  花生: { quantity: '12', unit: '克', category: 'other' },
  花生酱: { quantity: '1', unit: '勺', category: 'other' },
  黑芝麻: { quantity: '1', unit: '勺', category: 'other' },
  南瓜: { quantity: '150', unit: '克', category: 'vegetable' },
  山药: { quantity: '120', unit: '克', category: 'vegetable' },
  菠菜: { quantity: '100', unit: '克', category: 'vegetable' },
  西兰花: { quantity: '140', unit: '克', category: 'vegetable' },
  番茄: { quantity: '2', unit: '个', category: 'vegetable' },
  圣女果: { quantity: '8', unit: '颗', category: 'vegetable' },
  生菜: { quantity: '80', unit: '克', category: 'vegetable' },
  芦笋: { quantity: '100', unit: '克', category: 'vegetable' },
  口蘑: { quantity: '100', unit: '克', category: 'vegetable' },
  香菇: { quantity: '100', unit: '克', category: 'vegetable' },
  杏鲍菇: { quantity: '120', unit: '克', category: 'vegetable' },
  金针菇: { quantity: '100', unit: '克', category: 'vegetable' },
  丝瓜: { quantity: '1', unit: '根', category: 'vegetable' },
  冬瓜: { quantity: '200', unit: '克', category: 'vegetable' },
  黄瓜: { quantity: '1', unit: '根', category: 'vegetable' },
  木耳: { quantity: '80', unit: '克', category: 'vegetable' },
  青椒: { quantity: '1', unit: '个', category: 'vegetable' },
  彩椒: { quantity: '120', unit: '克', category: 'vegetable' },
  洋葱: { quantity: '80', unit: '克', category: 'vegetable' },
  豆角: { quantity: '120', unit: '克', category: 'vegetable' },
  荷兰豆: { quantity: '120', unit: '克', category: 'vegetable' },
  白菜: { quantity: '180', unit: '克', category: 'vegetable' },
  娃娃菜: { quantity: '180', unit: '克', category: 'vegetable' },
  上海青: { quantity: '180', unit: '克', category: 'vegetable' },
  油麦菜: { quantity: '180', unit: '克', category: 'vegetable' },
  空心菜: { quantity: '180', unit: '克', category: 'vegetable' },
  菜心: { quantity: '180', unit: '克', category: 'vegetable' },
  豆苗: { quantity: '150', unit: '克', category: 'vegetable' },
  茼蒿: { quantity: '150', unit: '克', category: 'vegetable' },
  苦菊: { quantity: '120', unit: '克', category: 'vegetable' },
  胡萝卜: { quantity: '80', unit: '克', category: 'vegetable' },
  土豆: { quantity: '120', unit: '克', category: 'vegetable' },
  莲藕: { quantity: '120', unit: '克', category: 'vegetable' },
  花菜: { quantity: '160', unit: '克', category: 'vegetable' },
  紫甘蓝: { quantity: '80', unit: '克', category: 'vegetable' },
  秋葵: { quantity: '120', unit: '克', category: 'vegetable' },
  海带: { quantity: '80', unit: '克', category: 'vegetable' },
  百合: { quantity: '60', unit: '克', category: 'vegetable' },
  莴笋: { quantity: '100', unit: '克', category: 'vegetable' },
  小白菜: { quantity: '180', unit: '克', category: 'vegetable' },
  西葫芦: { quantity: '150', unit: '克', category: 'vegetable' },
  菜花: { quantity: '160', unit: '克', category: 'vegetable' },
  海苔: { quantity: '2', unit: '片', category: 'other' },
  蛤蜊: { quantity: '150', unit: '克', category: 'meat' },
};

function exactIngredient(name: string): Ingredient | null {
  const meta = ingredientMeta[name];
  return meta ? { name, ...meta } : null;
}

function inferredIngredient(name: string): Ingredient {
  const exact = exactIngredient(name);
  if (exact) return exact;

  if (/鸡/.test(name) && !/鸡蛋/.test(name)) return { name, quantity: '140', unit: '克', category: 'meat' };
  if (/牛/.test(name)) return { name, quantity: '140', unit: '克', category: 'meat' };
  if (/猪|排骨|丸子|肉片|肉丝|肉卷|肉饼|里脊/.test(name)) return { name, quantity: '150', unit: '克', category: 'meat' };
  if (/虾|鱼|鲈|鳕|三文鱼|巴沙|龙利|蛤蜊|猪肝/.test(name)) return { name, quantity: '120', unit: '克', category: 'meat' };
  if (/豆腐|豆皮|豆干|腐竹|豆泡/.test(name)) return { name, quantity: '180', unit: '克', category: 'other' };
  if (/酸奶|牛奶|豆浆|豆乳/.test(name)) return { name, quantity: '200', unit: '毫升', category: 'other' };
  if (/吐司|卷饼|意面|荞麦面|米饭|大米|藜麦|小米|燕麦|红薯|紫薯|玉米|板栗|芋头/.test(name)) {
    return { name, quantity: '60', unit: '克', category: 'grain' };
  }
  if (/苹果|香蕉|蓝莓|草莓|木瓜|牛油果|红枣|山楂/.test(name)) {
    return { name, quantity: '1', unit: '份', category: 'fruit' };
  }
  if (/桂花|黑芝麻|奇亚籽|花生酱|蒜|黑胡椒/.test(name)) {
    return { name, quantity: '少许', unit: '', category: 'seasoning' };
  }
  if (/花生|核桃|腰果/.test(name)) return { name, quantity: '12', unit: '克', category: 'other' };
  return { name, quantity: '100', unit: '克', category: 'vegetable' };
}

function ingredientNames(ingredients: Ingredient[], count: number = 3): string {
  return ingredients.slice(0, count).map(item => item.name).join('、');
}

function buildInstructions(style: CookingStyle, ingredients: Ingredient[], name: string): string[] {
  const top = ingredientNames(ingredients);
  switch (style) {
    case 'porridge':
      return [
        `将${top}中耐煮的食材先清洗处理好，下锅加水煮开。`,
        '转小火煮到谷物软糯、食材熟透，期间适当搅拌避免糊底。',
        `最后按${name}的口味做轻调味，保持清爽顺口。`,
      ];
    case 'bowl':
      return [
        `先把${top}分别处理成熟，主食或底料提前准备好。`,
        '把处理好的食材分层装入碗中，尽量保证蛋白质和蔬菜都齐全。',
        '淋少量酱汁或撒坚果点缀后即可食用。',
      ];
    case 'egg':
      return [
        `把${top}中需要切配的食材准备好，鸡蛋打散备用。`,
        '将蔬菜或蛋白食材先快速处理，再与蛋液组合煎、炒或蒸熟。',
        '成型后趁热食用，口感会更嫩。',
      ];
    case 'sandwich':
      return [
        `先将${top}中的主料煎熟或煮熟，蔬菜擦干水分。`,
        '面包轻微加热后依次放入酱料、蔬菜和主料，注意湿润食材不要直接贴面包。',
        `压紧后对半切开，${name}更适合现做现吃。`,
      ];
    case 'wrap':
      return [
        `将${top}中的主料提前做熟，卷饼皮轻微加热。`,
        '依次铺上酱料、蔬菜和蛋白质食材，尽量把食材集中放在中间。',
        '卷紧后对切即可，适合便当或快速午餐。',
      ];
    case 'complete':
      return [
        `先准备好${top}中的主食和主料，主食煮熟备用。`,
        '蛋白质食材少油煎炒至断生，蔬菜另外处理到刚熟保留口感。',
        '把主食、蛋白质和蔬菜组合装盘，少量调味即可完成一餐。',
      ];
    case 'steam':
      return [
        `把${top}清洗切配后装盘或装碗。`,
        '按菜品风格铺上蒜蓉或简单调味，放入蒸锅蒸到熟透。',
        '出锅后补少量酱汁即可，尽量保留食材本味。',
      ];
    case 'braise':
      return [
        `将${top}中的主料先焯水或煎香，去掉多余腥味。`,
        '加入配菜和适量清水，小火焖煮到食材入味软熟。',
        '最后略微收汁，让味道集中但不要过咸过油。',
      ];
    case 'bake':
      return [
        `把${top}中的食材切配好，主料先做简单腌味。`,
        '送入烤箱或空气炸锅烤到表面微焦、内部熟透。',
        '出炉后搭配蔬菜或主食一起食用，口感更完整。',
      ];
    case 'cold':
      return [
        `把${top}需要焯水的食材先处理熟，剩余食材保持脆爽。`,
        '调一份清爽型凉拌汁，不要放太多油盐。',
        '把全部食材拌匀后静置片刻再食用，会更入味。',
      ];
    case 'soup':
      return [
        `锅中加水烧开，先下${top}里比较耐煮的食材。`,
        '煮到食材变软后，再加入易熟的蛋白质或蔬菜。',
        '最后轻调味即可，保持汤感清爽鲜甜。',
      ];
    case 'stirfry':
    default:
      return [
        `把${top}中的主料切配好，肉类可提前做轻腌制。`,
        '锅中少油，先炒主料再下配菜，保持大火快炒的清爽口感。',
        '全部食材断生后立刻出锅，避免炒老炒塌。',
      ];
  }
}

function estimateNutrition(style: CookingStyle, ingredients: Ingredient[], isCompleteMeal?: boolean) {
  let calories = 220;
  let protein = 12;
  let carbs = 12;
  let fat = 8;

  switch (style) {
    case 'porridge':
      calories = 300;
      protein = 14;
      carbs = 40;
      fat = 7;
      break;
    case 'bowl':
      calories = 320;
      protein = 18;
      carbs = 28;
      fat = 11;
      break;
    case 'egg':
      calories = 285;
      protein = 19;
      carbs = 13;
      fat = 13;
      break;
    case 'sandwich':
    case 'wrap':
      calories = 395;
      protein = 22;
      carbs = 34;
      fat = 14;
      break;
    case 'complete':
      calories = 520;
      protein = 28;
      carbs = 54;
      fat = 18;
      break;
    case 'steam':
      calories = 215;
      protein = 20;
      carbs = 9;
      fat = 8;
      break;
    case 'braise':
      calories = 305;
      protein = 22;
      carbs = 14;
      fat = 15;
      break;
    case 'bake':
      calories = 270;
      protein = 24;
      carbs = 10;
      fat = 11;
      break;
    case 'cold':
      calories = 110;
      protein = 5;
      carbs = 12;
      fat = 3;
      break;
    case 'soup':
      calories = 105;
      protein = 8;
      carbs = 8;
      fat = 3;
      break;
    case 'stirfry':
    default:
      calories = 245;
      protein = 18;
      carbs = 12;
      fat = 9;
      break;
  }

  const names = ingredients.map(item => item.name).join('、');
  const meatCount = ingredients.filter(item => item.category === 'meat').length;
  const grainCount = ingredients.filter(item => item.category === 'grain').length;
  const richCount = ingredients.filter(item => /牛油果|坚果|奶酪|花生酱|黑芝麻|核桃|腰果/.test(item.name)).length;
  const tofuEggCount = ingredients.filter(item => /豆腐|鸡蛋|酸奶|牛奶|豆浆|豆乳/.test(item.name)).length;

  protein += meatCount * 6 + tofuEggCount * 2;
  calories += grainCount * 55 + richCount * 35 + meatCount * 25;
  carbs += grainCount * 12;
  fat += richCount * 3;

  if (/虾|鱼|鲈|鳕|龙利|巴沙|三文鱼|金枪鱼/.test(names)) {
    protein += 4;
    fat = Math.max(4, fat - 1);
  }
  if (/排骨|牛腩|肥牛|猪肝/.test(names)) {
    fat += 3;
    calories += 20;
  }
  if (isCompleteMeal) {
    calories = Math.max(calories, 450);
    protein = Math.max(protein, 24);
    carbs = Math.max(carbs, 36);
  }

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

function hasMeatIngredient(ingredients: Ingredient[]): boolean {
  return ingredients.some(item => item.category === 'meat');
}

function hasVegetableIngredient(ingredients: Ingredient[]): boolean {
  return ingredients.some(item => item.category === 'vegetable');
}

function hasGrainIngredient(ingredients: Ingredient[]): boolean {
  return ingredients.some(item => item.category === 'grain');
}

function normalizePresetTags(
  seed: RecipeSeed,
  ingredients: Ingredient[],
  nutrition: Dish['nutrition']
): string[] {
  const normalized = new Set<string>();
  const rawTags = new Set(seed.tags);

  const add = (tag: (typeof EFFECTIVE_TAGS)[number]) => normalized.add(tag);

  if (seed.category === 'breakfast') add('早餐');
  if (seed.isCompleteMeal) add('完整一餐');

  if (seed.style === 'sandwich') add('三明治');
  if (seed.style === 'wrap') add('卷饼');
  if (seed.style === 'steam') add('蒸菜');
  if (seed.style === 'soup' || rawTags.has('汤品')) add('汤品');

  if (hasMeatIngredient(ingredients)) {
    add('荤菜');
  } else if (hasVegetableIngredient(ingredients) || rawTags.has('素菜')) {
    add('素菜');
  }

  if (nutrition.protein >= 22 || rawTags.has('高蛋白')) add('高蛋白');
  if (
    ingredients.filter(item => item.category === 'vegetable' || item.category === 'fruit').length >= 2 ||
    hasGrainIngredient(ingredients) ||
    rawTags.has('高纤维')
  ) {
    add('高纤维');
  }

  if (seed.timeNeeded <= 15 || rawTags.has('快手') || rawTags.has('便捷')) add('快手');
  if (
    rawTags.has('清爽') ||
    rawTags.has('凉菜') ||
    seed.style === 'cold' ||
    seed.style === 'steam' ||
    seed.style === 'soup'
  ) {
    add('清爽');
  }

  if (
    rawTags.has('家常') ||
    rawTags.has('经典') ||
    rawTags.has('家常经典') ||
    rawTags.has('经典家常') ||
    seed.style === 'stirfry' ||
    seed.style === 'braise'
  ) {
    add('家常');
  }

  if (
    rawTags.has('下饭') ||
    rawTags.has('有食欲') ||
    rawTags.has('经典硬菜') ||
    /糖醋|照烧|咖喱|黑椒|麻婆|茄汁|烧|焖|煲/.test(seed.name)
  ) {
    add('下饭');
  }

  if (
    rawTags.has('饱腹') ||
    seed.isCompleteMeal ||
    (seed.category === 'breakfast' && hasGrainIngredient(ingredients)) ||
    nutrition.calories >= 360
  ) {
    add('饱腹');
  }

  const priority = EFFECTIVE_TAGS.filter(tag => normalized.has(tag));
  return priority.slice(0, 4);
}

function buildDish(seed: RecipeSeed): Dish {
  const ingredients = seed.ingredients.map(inferredIngredient);
  const nutrition = estimateNutrition(seed.style, ingredients, seed.isCompleteMeal);
  return presetDish({
    id: seed.id,
    name: seed.name,
    ingredients,
    instructions: buildInstructions(seed.style, ingredients, seed.name),
    nutrition,
    tags: normalizePresetTags(seed, ingredients, nutrition),
    category: seed.category,
    difficulty: seed.difficulty,
    timeNeeded: seed.timeNeeded,
    isCompleteMeal: seed.isCompleteMeal,
  });
}

const breakfastSeeds: RecipeSeed[] = [
  { id: 'b-1', name: '苹果桂花小米粥', style: 'porridge', category: 'breakfast', difficulty: 'easy', timeNeeded: 20, tags: ['早餐', '暖胃', '家常'], ingredients: ['小米', '苹果', '红枣', '桂花'] },
  { id: 'b-2', name: '板栗山药燕麦粥', style: 'porridge', category: 'breakfast', difficulty: 'easy', timeNeeded: 22, tags: ['早餐', '饱腹', '温和'], ingredients: ['燕麦', '板栗', '山药', '牛奶'] },
  { id: 'b-3', name: '红枣莲子银耳羹', style: 'porridge', category: 'breakfast', difficulty: 'medium', timeNeeded: 28, tags: ['早餐', '润口', '清甜'], ingredients: ['红枣', '银耳', '莲子', '牛奶'] },
  { id: 'b-4', name: '玉米南瓜牛奶糊', style: 'porridge', category: 'breakfast', difficulty: 'easy', timeNeeded: 18, tags: ['早餐', '顺口', '快手'], ingredients: ['玉米', '南瓜', '牛奶'] },
  { id: 'b-5', name: '红豆薏米山药粥', style: 'porridge', category: 'breakfast', difficulty: 'medium', timeNeeded: 30, tags: ['早餐', '清爽', '家常'], ingredients: ['红豆', '薏米', '山药'] },
  { id: 'b-6', name: '藜麦苹果酸奶碗', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 10, tags: ['早餐', '高纤维', '清爽'], ingredients: ['藜麦', '苹果', '酸奶', '核桃'] },
  { id: 'b-7', name: '香蕉可可酸奶燕麦杯', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 8, tags: ['早餐', '便捷', '香甜'], ingredients: ['香蕉', '酸奶', '燕麦片', '奇亚籽'] },
  { id: 'b-8', name: '牛油果虾仁滑蛋碗', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 15, tags: ['早餐', '高蛋白', '有满足感'], ingredients: ['牛油果', '虾仁', '鸡蛋', '生菜'] },
  { id: 'b-9', name: '豆腐菠菜蒸蛋碗', style: 'egg', category: 'breakfast', difficulty: 'easy', timeNeeded: 15, tags: ['早餐', '嫩滑', '高蛋白'], ingredients: ['豆腐', '菠菜', '鸡蛋'] },
  { id: 'b-10', name: '番茄西兰花嫩蛋杯', style: 'egg', category: 'breakfast', difficulty: 'easy', timeNeeded: 12, tags: ['早餐', '家常', '颜色丰富'], ingredients: ['番茄', '西兰花', '鸡蛋'] },
  { id: 'b-11', name: '紫薯芋泥酸奶碗', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 16, tags: ['早餐', '高颜值', '饱腹'], ingredients: ['紫薯', '芋头', '酸奶', '蓝莓'] },
  { id: 'b-12', name: '黑芝麻核桃燕麦糊', style: 'porridge', category: 'breakfast', difficulty: 'easy', timeNeeded: 14, tags: ['早餐', '香浓', '顺口'], ingredients: ['燕麦', '黑芝麻', '核桃', '牛奶'] },
  { id: 'b-13', name: '山药小米鸡蓉粥', style: 'porridge', category: 'breakfast', difficulty: 'easy', timeNeeded: 24, tags: ['早餐', '暖胃', '高蛋白'], ingredients: ['山药', '小米', '鸡蓉'] },
  { id: 'b-14', name: '胡萝卜玉米鸡蛋杯', style: 'egg', category: 'breakfast', difficulty: 'easy', timeNeeded: 14, tags: ['早餐', '快手', '小朋友友好'], ingredients: ['胡萝卜', '玉米粒', '鸡蛋'] },
  { id: 'b-15', name: '菠菜玉米虾仁蒸蛋', style: 'egg', category: 'breakfast', difficulty: 'easy', timeNeeded: 16, tags: ['早餐', '高蛋白', '鲜味'], ingredients: ['菠菜', '玉米粒', '虾仁', '鸡蛋'] },
  { id: 'b-16', name: '南瓜鹰嘴豆酸奶碗', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 13, tags: ['早餐', '饱腹', '清爽'], ingredients: ['南瓜', '鹰嘴豆', '酸奶'] },
  { id: 'b-17', name: '苹果花生奇亚籽杯', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 8, tags: ['早餐', '便捷', '高纤维'], ingredients: ['苹果', '花生酱', '奇亚籽', '酸奶'] },
  { id: 'b-18', name: '蓝莓香蕉高蛋白奶昔碗', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 8, tags: ['早餐', '高蛋白', '顺口'], ingredients: ['蓝莓', '香蕉', '酸奶', '燕麦片'] },
  { id: 'b-19', name: '红薯鸡蛋生菜能量碗', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 15, tags: ['早餐', '饱腹', '家常'], ingredients: ['红薯', '鸡蛋', '生菜', '圣女果'] },
  { id: 'b-20', name: '金枪鱼玉米土豆沙拉碗', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 15, tags: ['早餐', '高蛋白', '便当感'], ingredients: ['金枪鱼', '玉米粒', '土豆', '黄瓜'] },
  { id: 'b-21', name: '口蘑芦笋滑蛋盘', style: 'egg', category: 'breakfast', difficulty: 'easy', timeNeeded: 12, tags: ['早餐', '快手', '轻盈'], ingredients: ['口蘑', '芦笋', '鸡蛋'] },
  { id: 'b-22', name: '山药牛肉蔬菜羹', style: 'soup', category: 'breakfast', difficulty: 'medium', timeNeeded: 20, tags: ['早餐', '暖胃', '硬菜感'], ingredients: ['山药', '牛肉', '胡萝卜'] },
  { id: 'b-23', name: '红枣燕麦牛奶杯', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 8, tags: ['早餐', '香甜', '便捷'], ingredients: ['红枣', '燕麦片', '牛奶', '核桃'] },
  { id: 'b-24', name: '木瓜酸奶坚果碗', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 8, tags: ['早餐', '清爽', '高颜值'], ingredients: ['木瓜', '酸奶', '腰果', '奇亚籽'] },
  { id: 'b-25', name: '菠菜奶酪炒蛋盘', style: 'egg', category: 'breakfast', difficulty: 'easy', timeNeeded: 10, tags: ['早餐', '高蛋白', '家常'], ingredients: ['菠菜', '奶酪', '鸡蛋'] },
  { id: 'b-26', name: '豆乳燕麦莓果杯', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 7, tags: ['早餐', '清爽', '便捷'], ingredients: ['豆乳', '燕麦片', '草莓', '蓝莓'] },
  { id: 'b-27', name: '香菇鸡丝小米粥', style: 'porridge', category: 'breakfast', difficulty: 'easy', timeNeeded: 22, tags: ['早餐', '家常', '暖胃'], ingredients: ['香菇', '鸡丝', '小米'] },
  { id: 'b-28', name: '南瓜藜麦鸡蛋碗', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 14, tags: ['早餐', '饱腹', '高蛋白'], ingredients: ['南瓜', '藜麦', '鸡蛋', '生菜'] },
  { id: 'b-29', name: '苹果南瓜烤燕麦', style: 'bake', category: 'breakfast', difficulty: 'easy', timeNeeded: 18, tags: ['早餐', '烘焙感', '温暖'], ingredients: ['苹果', '南瓜', '燕麦片', '牛奶'] },
  { id: 'b-30', name: '黑豆核桃豆浆碗', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 9, tags: ['早餐', '豆香', '顺口'], ingredients: ['黑豆', '核桃', '豆浆', '燕麦片'] },
  { id: 'b-31', name: '玉米鸡胸杂粮碗', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 14, tags: ['早餐', '高蛋白', '饱腹'], ingredients: ['玉米', '鸡胸肉', '藜麦', '生菜'] },
  { id: 'b-32', name: '牛油果番茄鸡蛋盘', style: 'egg', category: 'breakfast', difficulty: 'easy', timeNeeded: 10, tags: ['早餐', '高颜值', '轻盈'], ingredients: ['牛油果', '番茄', '鸡蛋'] },
  { id: 'b-33', name: '山楂苹果小米粥', style: 'porridge', category: 'breakfast', difficulty: 'easy', timeNeeded: 20, tags: ['早餐', '微酸开胃', '家常'], ingredients: ['山楂', '苹果', '小米'] },
  { id: 'b-34', name: '紫甘蓝鸡蛋土豆碗', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 15, tags: ['早餐', '颜色丰富', '饱腹'], ingredients: ['紫甘蓝', '鸡蛋', '土豆'] },
  { id: 'b-35', name: '虾仁豆腐海带汤早餐碗', style: 'soup', category: 'breakfast', difficulty: 'easy', timeNeeded: 15, tags: ['早餐', '鲜味', '清爽'], ingredients: ['虾仁', '豆腐', '海带'] },
  { id: 'b-36', name: '草莓酸奶麦片杯', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 6, tags: ['早餐', '便捷', '清爽'], ingredients: ['草莓', '酸奶', '燕麦片'] },
  { id: 'b-37', name: '芋头牛奶燕麦碗', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 12, tags: ['早餐', '绵密', '温和'], ingredients: ['芋头', '牛奶', '燕麦片'] },
  { id: 'b-38', name: '南瓜鸡肉杂蔬烘蛋', style: 'egg', category: 'breakfast', difficulty: 'medium', timeNeeded: 18, tags: ['早餐', '高蛋白', '有满足感'], ingredients: ['南瓜', '鸡胸肉', '鸡蛋', '西兰花'] },
  { id: 'b-39', name: '秋葵鸡蛋藜麦碗', style: 'bowl', category: 'breakfast', difficulty: 'easy', timeNeeded: 14, tags: ['早餐', '高纤维', '清爽'], ingredients: ['秋葵', '鸡蛋', '藜麦'] },
  { id: 'b-40', name: '芝麻菠菜豆腐蒸碗', style: 'steam', category: 'breakfast', difficulty: 'easy', timeNeeded: 15, tags: ['早餐', '嫩滑', '轻负担'], ingredients: ['黑芝麻', '菠菜', '豆腐', '鸡蛋'] },
];

const completeMealSeeds: RecipeSeed[] = [
  { id: 'm-1', name: '香菇鸡肉焖饭', style: 'complete', category: 'lunch', difficulty: 'easy', timeNeeded: 25, tags: ['完整一餐', '家常', '下饭'], ingredients: ['香菇', '鸡腿肉', '大米', '胡萝卜'], isCompleteMeal: true },
  { id: 'm-2', name: '番茄虾仁烩饭', style: 'complete', category: 'lunch', difficulty: 'easy', timeNeeded: 24, tags: ['完整一餐', '鲜甜', '快手'], ingredients: ['番茄', '虾仁', '大米', '菠菜'], isCompleteMeal: true },
  { id: 'm-3', name: '日式照烧鸡排饭', style: 'complete', category: 'dinner', difficulty: 'easy', timeNeeded: 22, tags: ['完整一餐', '经典', '有满足感'], ingredients: ['鸡腿肉', '米饭', '西兰花', '胡萝卜'], isCompleteMeal: true },
  { id: 'm-4', name: '土豆牛肉咖喱饭', style: 'complete', category: 'dinner', difficulty: 'medium', timeNeeded: 32, tags: ['完整一餐', '家常', '暖心'], ingredients: ['牛肉', '土豆', '胡萝卜', '米饭'], isCompleteMeal: true },
  { id: 'm-5', name: '洋葱肥牛饭轻油版', style: 'complete', category: 'lunch', difficulty: 'easy', timeNeeded: 18, tags: ['完整一餐', '便当感', '快手'], ingredients: ['肥牛', '洋葱', '米饭', '西兰花'], isCompleteMeal: true },
  { id: 'm-6', name: '香煎鳕鱼杂粮饭', style: 'complete', category: 'dinner', difficulty: 'easy', timeNeeded: 22, tags: ['完整一餐', '高蛋白', '清爽'], ingredients: ['鳕鱼', '糙米饭', '芦笋', '番茄'], isCompleteMeal: true },
  { id: 'm-7', name: '鸡腿时蔬焖饭', style: 'complete', category: 'dinner', difficulty: 'easy', timeNeeded: 28, tags: ['完整一餐', '家常', '省事'], ingredients: ['鸡腿肉', '大米', '香菇', '胡萝卜'], isCompleteMeal: true },
  { id: 'm-8', name: '虾仁玉米炒饭轻油版', style: 'complete', category: 'lunch', difficulty: 'easy', timeNeeded: 18, tags: ['完整一餐', '快手', '经典'], ingredients: ['虾仁', '米饭', '玉米粒', '鸡蛋'], isCompleteMeal: true },
  { id: 'm-9', name: '鸡蛋豆腐杂蔬盖饭', style: 'complete', category: 'lunch', difficulty: 'easy', timeNeeded: 17, tags: ['完整一餐', '轻负担', '家常'], ingredients: ['鸡蛋', '豆腐', '米饭', '西兰花'], isCompleteMeal: true },
  { id: 'm-10', name: '香菇牛肉糙米碗', style: 'complete', category: 'lunch', difficulty: 'easy', timeNeeded: 22, tags: ['完整一餐', '高蛋白', '便当'], ingredients: ['香菇', '牛肉', '糙米饭', '彩椒'], isCompleteMeal: true },
  { id: 'm-11', name: '番茄鸡肉意面', style: 'complete', category: 'dinner', difficulty: 'easy', timeNeeded: 20, tags: ['完整一餐', '常规西式', '不厚重'], ingredients: ['番茄', '鸡胸肉', '意面', '菠菜'], isCompleteMeal: true },
  { id: 'm-12', name: '虾仁菠菜全麦意面', style: 'complete', category: 'lunch', difficulty: 'easy', timeNeeded: 20, tags: ['完整一餐', '轻盈', '快手'], ingredients: ['虾仁', '菠菜', '全麦意面', '口蘑'], isCompleteMeal: true },
  { id: 'm-13', name: '黑椒牛肉烤蔬碗', style: 'complete', category: 'dinner', difficulty: 'easy', timeNeeded: 22, tags: ['完整一餐', '有食欲', '高蛋白'], ingredients: ['牛肉', '南瓜', '西兰花', '糙米饭'], isCompleteMeal: true },
  { id: 'm-14', name: '韩式鸡肉拌饭', style: 'complete', category: 'lunch', difficulty: 'medium', timeNeeded: 24, tags: ['完整一餐', '风味感', '颜色丰富'], ingredients: ['鸡胸肉', '米饭', '菠菜', '胡萝卜'], isCompleteMeal: true },
  { id: 'm-15', name: '咖喱南瓜鸡肉饭', style: 'complete', category: 'dinner', difficulty: 'easy', timeNeeded: 24, tags: ['完整一餐', '香浓', '温暖'], ingredients: ['鸡胸肉', '南瓜', '米饭', '花菜'], isCompleteMeal: true },
  { id: 'm-16', name: '菌菇鸡肉烩饭', style: 'complete', category: 'lunch', difficulty: 'medium', timeNeeded: 26, tags: ['完整一餐', '菌香', '一锅出'], ingredients: ['鸡腿肉', '口蘑', '大米', '菠菜'], isCompleteMeal: true },
  { id: 'm-17', name: '番茄牛肉土豆饭', style: 'complete', category: 'dinner', difficulty: 'medium', timeNeeded: 30, tags: ['完整一餐', '家常硬菜', '下饭'], ingredients: ['牛腩', '番茄', '土豆', '米饭'], isCompleteMeal: true },
  { id: 'm-18', name: '蒲烧豆腐饭', style: 'complete', category: 'lunch', difficulty: 'easy', timeNeeded: 18, tags: ['完整一餐', '素食友好', '有满足感'], ingredients: ['豆腐', '米饭', '黄瓜', '鸡蛋'], isCompleteMeal: true },
  { id: 'm-19', name: '三文鱼彩蔬荞麦面', style: 'complete', category: 'dinner', difficulty: 'easy', timeNeeded: 22, tags: ['完整一餐', '清爽', '高蛋白'], ingredients: ['三文鱼', '荞麦面', '黄瓜', '紫甘蓝'], isCompleteMeal: true },
  { id: 'm-20', name: '金枪鱼玉米烤土豆碗', style: 'complete', category: 'lunch', difficulty: 'easy', timeNeeded: 22, tags: ['完整一餐', '便当感', '饱腹'], ingredients: ['金枪鱼', '玉米粒', '土豆', '生菜'], isCompleteMeal: true },
  { id: 'm-21', name: '藜麦鸡肉能量沙拉碗', style: 'complete', category: 'lunch', difficulty: 'easy', timeNeeded: 16, tags: ['完整一餐', '清爽', '高蛋白'], ingredients: ['藜麦', '鸡胸肉', '生菜', '圣女果'], isCompleteMeal: true },
  { id: 'm-22', name: '鹰嘴豆烤蔬菜卷饼', style: 'wrap', category: 'lunch', difficulty: 'easy', timeNeeded: 15, tags: ['完整一餐', '卷饼', '高纤维'], ingredients: ['鹰嘴豆', '全麦卷饼', '生菜', '番茄'], isCompleteMeal: true },
  { id: 'm-23', name: '香煎虾仁牛油果卷饼', style: 'wrap', category: 'lunch', difficulty: 'easy', timeNeeded: 15, tags: ['完整一餐', '卷饼', '高蛋白'], ingredients: ['虾仁', '牛油果', '全麦卷饼', '生菜'], isCompleteMeal: true },
  { id: 'm-24', name: '鸡腿厚蛋三明治', style: 'sandwich', category: 'lunch', difficulty: 'easy', timeNeeded: 16, tags: ['完整一餐', '三明治', '便当'], ingredients: ['吐司', '鸡腿肉', '鸡蛋', '生菜'], isCompleteMeal: true },
  { id: 'm-25', name: '金枪鱼牛油果三明治', style: 'sandwich', category: 'lunch', difficulty: 'easy', timeNeeded: 12, tags: ['完整一餐', '三明治', '清爽'], ingredients: ['全麦吐司', '金枪鱼', '牛油果', '黄瓜'], isCompleteMeal: true },
  { id: 'm-26', name: '酸黄瓜牛肉三明治', style: 'sandwich', category: 'lunch', difficulty: 'easy', timeNeeded: 14, tags: ['完整一餐', '三明治', '有食欲'], ingredients: ['全麦吐司', '牛肉', '黄瓜', '生菜'], isCompleteMeal: true },
  { id: 'm-27', name: '鹰嘴豆黄瓜三明治', style: 'sandwich', category: 'lunch', difficulty: 'easy', timeNeeded: 10, tags: ['完整一餐', '三明治', '高纤维'], ingredients: ['全麦吐司', '鹰嘴豆', '黄瓜', '番茄'] , isCompleteMeal: true },
  { id: 'm-28', name: '鳕鱼芦笋三明治', style: 'sandwich', category: 'lunch', difficulty: 'easy', timeNeeded: 15, tags: ['完整一餐', '三明治', '高蛋白'], ingredients: ['全麦吐司', '鳕鱼', '芦笋', '番茄'], isCompleteMeal: true },
  { id: 'm-29', name: '烤南瓜鸡胸卷饼', style: 'wrap', category: 'lunch', difficulty: 'easy', timeNeeded: 15, tags: ['完整一餐', '卷饼', '便捷'], ingredients: ['南瓜', '鸡胸肉', '全麦卷饼', '生菜'], isCompleteMeal: true },
  { id: 'm-30', name: '香草豆腐彩蔬三明治', style: 'sandwich', category: 'lunch', difficulty: 'easy', timeNeeded: 12, tags: ['完整一餐', '三明治', '素食友好'], ingredients: ['全麦吐司', '豆腐', '彩椒', '生菜'], isCompleteMeal: true },
];

const proteinSeeds: RecipeSeed[] = [
  { id: 'p-1', name: '青椒杏鲍菇鸡丁', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 16, tags: ['荤菜', '家常', '快手'], ingredients: ['青椒', '杏鲍菇', '鸡胸肉'] },
  { id: 'p-2', name: '洋葱照烧鸡排', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 18, tags: ['荤菜', '有食欲', '下饭'], ingredients: ['洋葱', '鸡腿肉', '西兰花'] },
  { id: 'p-3', name: '菌菇鸡片', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 15, tags: ['荤菜', '菌香', '清爽'], ingredients: ['口蘑', '香菇', '鸡胸肉'] },
  { id: 'p-4', name: '西芹百合鸡柳', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '清爽', '高蛋白'], ingredients: ['西芹', '百合', '鸡柳'] },
  { id: 'p-5', name: '彩椒鸡胸条', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '快手', '颜色丰富'], ingredients: ['彩椒', '鸡胸肉', '洋葱'] },
  { id: 'p-6', name: '黑胡椒鸡腿肉', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 16, tags: ['荤菜', '经典', '下饭'], ingredients: ['鸡腿肉', '洋葱', '黑胡椒'] },
  { id: 'p-7', name: '番茄罗勒鸡胸', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 16, tags: ['荤菜', '清爽', '常规西式'], ingredients: ['番茄', '鸡胸肉', '罗勒'] },
  { id: 'p-8', name: '口蘑鸡肉丸', style: 'braise', category: 'dinner', difficulty: 'medium', timeNeeded: 24, tags: ['荤菜', '一人食友好', '嫩口'], ingredients: ['口蘑', '鸡肉丸', '菠菜'] },
  { id: 'p-9', name: '丝瓜鸡片', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '清甜', '家常'], ingredients: ['丝瓜', '鸡片', '胡萝卜'] },
  { id: 'p-10', name: '黄瓜木耳鸡丝', style: 'cold', category: 'dinner', difficulty: 'easy', timeNeeded: 12, tags: ['荤菜', '凉菜', '夏天友好'], ingredients: ['黄瓜', '木耳', '鸡丝'] },
  { id: 'p-11', name: '板栗烧鸡轻油版', style: 'braise', category: 'dinner', difficulty: 'medium', timeNeeded: 34, tags: ['荤菜', '家常硬菜', '秋冬感'], ingredients: ['板栗', '鸡腿肉', '香菇'] },
  { id: 'p-12', name: '青豆玉米鸡丁', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '家常', '小朋友友好'], ingredients: ['青豆', '玉米粒', '鸡胸肉'] },
  { id: 'p-13', name: '山药木耳鸡片', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 15, tags: ['荤菜', '脆嫩', '清爽'], ingredients: ['山药', '木耳', '鸡片'] },
  { id: 'p-14', name: '蒜香柠檬鸡翅', style: 'bake', category: 'dinner', difficulty: 'easy', timeNeeded: 22, tags: ['荤菜', '空气炸锅友好', '香气足'], ingredients: ['鸡翅', '柠檬', '大蒜'] },
  { id: 'p-15', name: '香菇蒸鸡腿', style: 'steam', category: 'dinner', difficulty: 'easy', timeNeeded: 20, tags: ['荤菜', '蒸菜', '嫩滑'], ingredients: ['香菇', '鸡腿肉', '姜片'] },
  { id: 'p-16', name: '芦笋鸡胸卷', style: 'steam', category: 'dinner', difficulty: 'medium', timeNeeded: 18, tags: ['荤菜', '高颜值', '高蛋白'], ingredients: ['芦笋', '鸡胸肉', '胡萝卜'] },
  { id: 'p-17', name: '洋葱胡萝卜鸡柳', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 15, tags: ['荤菜', '家常', '下饭'], ingredients: ['洋葱', '胡萝卜', '鸡柳'] },
  { id: 'p-18', name: '豆角鸡丁', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 16, tags: ['荤菜', '家常', '常规好吃'], ingredients: ['豆角', '鸡丁', '胡萝卜'] },
  { id: 'p-19', name: '菜花鸡胸粒', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 15, tags: ['荤菜', '轻油', '高蛋白'], ingredients: ['菜花', '鸡胸肉', '彩椒'] },
  { id: 'p-20', name: '南瓜鸡腿煲', style: 'braise', category: 'dinner', difficulty: 'medium', timeNeeded: 26, tags: ['荤菜', '温暖', '家常升级'], ingredients: ['南瓜', '鸡腿肉', '洋葱'] },
  { id: 'p-21', name: '葱烧牛肉轻油版', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 15, tags: ['荤菜', '葱香', '下饭'], ingredients: ['牛肉', '洋葱', '小葱'] },
  { id: 'p-22', name: '土豆炖牛腩清爽版', style: 'braise', category: 'dinner', difficulty: 'medium', timeNeeded: 38, tags: ['荤菜', '家常硬菜', '暖心'], ingredients: ['牛腩', '土豆', '番茄'] },
  { id: 'p-23', name: '黑椒牛肉彩椒', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 16, tags: ['荤菜', '经典', '快手'], ingredients: ['牛肉', '彩椒', '洋葱'] },
  { id: 'p-24', name: '洋葱芦笋牛肉', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 16, tags: ['荤菜', '清爽', '高蛋白'], ingredients: ['洋葱', '芦笋', '牛肉'] },
  { id: 'p-25', name: '西红柿牛肉滑蛋', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 15, tags: ['荤菜', '家常', '嫩口'], ingredients: ['番茄', '牛肉', '鸡蛋'] },
  { id: 'p-26', name: '菌菇牛柳', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 16, tags: ['荤菜', '菌香', '有食欲'], ingredients: ['牛柳', '口蘑', '香菇'] },
  { id: 'p-27', name: '香菜牛肉片', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '风味感', '快手'], ingredients: ['香菜', '牛肉', '洋葱'] },
  { id: 'p-28', name: '西兰花牛肉', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 16, tags: ['荤菜', '经典搭配', '高蛋白'], ingredients: ['西兰花', '牛肉', '胡萝卜'] },
  { id: 'p-29', name: '白萝卜牛腩', style: 'braise', category: 'dinner', difficulty: 'medium', timeNeeded: 36, tags: ['荤菜', '清炖感', '秋冬'], ingredients: ['白萝卜', '牛腩', '姜片'] },
  { id: 'p-30', name: '豆角牛肉末', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '家常', '拌饭友好'], ingredients: ['豆角', '牛肉', '胡萝卜'] },
  { id: 'p-31', name: '青椒牛肉丝', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '经典家常', '快手'], ingredients: ['青椒', '牛肉', '洋葱'] },
  { id: 'p-32', name: '香芹牛肉丝', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '清香', '家常'], ingredients: ['香芹', '牛肉', '胡萝卜'] },
  { id: 'p-33', name: '口蘑黑椒牛肉', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 15, tags: ['荤菜', '香气足', '有食欲'], ingredients: ['口蘑', '牛肉', '黑胡椒'] },
  { id: 'p-34', name: '番茄土豆牛肉煲', style: 'braise', category: 'dinner', difficulty: 'medium', timeNeeded: 32, tags: ['荤菜', '浓郁但不腻', '家常硬菜'], ingredients: ['番茄', '土豆', '牛肉'] },
  { id: 'p-35', name: '山药牛肉片', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 15, tags: ['荤菜', '脆嫩', '清爽'], ingredients: ['山药', '牛肉', '木耳'] },
  { id: 'p-36', name: '牛肉豆腐煲', style: 'braise', category: 'dinner', difficulty: 'medium', timeNeeded: 22, tags: ['荤菜', '嫩滑', '下饭'], ingredients: ['牛肉', '豆腐', '番茄'] },
  { id: 'p-37', name: '糖醋排骨轻糖版', style: 'braise', category: 'dinner', difficulty: 'medium', timeNeeded: 34, tags: ['荤菜', '经典硬菜', '酸甜'], ingredients: ['排骨', '洋葱', '芝麻'] },
  { id: 'p-38', name: '山药蒸排骨', style: 'steam', category: 'dinner', difficulty: 'medium', timeNeeded: 28, tags: ['荤菜', '蒸菜', '家常'], ingredients: ['排骨', '山药', '姜片'] },
  { id: 'p-39', name: '莲藕排骨轻炖', style: 'braise', category: 'dinner', difficulty: 'medium', timeNeeded: 34, tags: ['荤菜', '汤汁感', '秋冬'], ingredients: ['莲藕', '排骨', '胡萝卜'] },
  { id: 'p-40', name: '青椒肉丝', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '家常经典', '快手'], ingredients: ['青椒', '里脊肉', '胡萝卜'] },
  { id: 'p-41', name: '芹菜香干肉丝', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 15, tags: ['荤菜', '家常', '脆爽'], ingredients: ['芹菜', '豆干', '里脊肉'] },
  { id: 'p-42', name: '番茄里脊片', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 15, tags: ['荤菜', '酸甜清爽', '下饭'], ingredients: ['番茄', '里脊肉', '洋葱'] },
  { id: 'p-43', name: '木耳山药肉片', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 15, tags: ['荤菜', '脆嫩', '清爽'], ingredients: ['木耳', '山药', '肉片'] },
  { id: 'p-44', name: '西兰花里脊片', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 15, tags: ['荤菜', '经典搭配', '高蛋白'], ingredients: ['西兰花', '里脊肉', '胡萝卜'] },
  { id: 'p-45', name: '香菇肉末蒸蛋', style: 'steam', category: 'dinner', difficulty: 'easy', timeNeeded: 18, tags: ['荤菜', '嫩滑', '一人食'], ingredients: ['香菇', '肉末', '鸡蛋'] },
  { id: 'p-46', name: '冬瓜汆丸子', style: 'soup', category: 'dinner', difficulty: 'easy', timeNeeded: 18, tags: ['荤菜', '汤品', '清爽'], ingredients: ['冬瓜', '丸子', '小葱'] },
  { id: 'p-47', name: '肉末蒸豆腐', style: 'steam', category: 'dinner', difficulty: 'easy', timeNeeded: 16, tags: ['荤菜', '嫩滑', '家常'], ingredients: ['肉末', '豆腐', '香菇'] },
  { id: 'p-48', name: '荷兰豆肉片', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '脆嫩', '快手'], ingredients: ['荷兰豆', '肉片', '胡萝卜'] },
  { id: 'p-49', name: '豆角肉末', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '拌饭友好', '家常'], ingredients: ['豆角', '肉末', '胡萝卜'] },
  { id: 'p-50', name: '白菜肉卷', style: 'steam', category: 'dinner', difficulty: 'medium', timeNeeded: 20, tags: ['荤菜', '清爽', '造型感'], ingredients: ['白菜', '肉末', '胡萝卜'] },
  { id: 'p-51', name: '南瓜蒸肉饼', style: 'steam', category: 'dinner', difficulty: 'easy', timeNeeded: 20, tags: ['荤菜', '蒸菜', '家常'], ingredients: ['南瓜', '肉饼', '香菇'] },
  { id: 'p-52', name: '茄汁里脊片', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 15, tags: ['荤菜', '酸甜开胃', '下饭'], ingredients: ['番茄', '里脊肉', '彩椒'] },
  { id: 'p-53', name: '清蒸鲈鱼', style: 'steam', category: 'dinner', difficulty: 'medium', timeNeeded: 20, tags: ['荤菜', '清蒸', '高蛋白'], ingredients: ['鲈鱼', '姜片', '小葱'] },
  { id: 'p-54', name: '柠檬煎鳕鱼', style: 'bake', category: 'dinner', difficulty: 'easy', timeNeeded: 16, tags: ['荤菜', '清爽', '高蛋白'], ingredients: ['鳕鱼', '柠檬', '芦笋'] },
  { id: 'p-55', name: '番茄龙利鱼', style: 'braise', category: 'dinner', difficulty: 'easy', timeNeeded: 18, tags: ['荤菜', '嫩滑', '下饭'], ingredients: ['番茄', '龙利鱼', '洋葱'] },
  { id: 'p-56', name: '蒜蓉粉丝虾', style: 'steam', category: 'dinner', difficulty: 'easy', timeNeeded: 20, tags: ['荤菜', '蒸菜', '有食欲'], ingredients: ['虾仁', '粉丝', '大蒜'] },
  { id: 'p-57', name: '西兰花虾仁', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '高蛋白', '快手'], ingredients: ['西兰花', '虾仁', '胡萝卜'] },
  { id: 'p-58', name: '黄瓜木耳虾仁', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '脆爽', '清爽'], ingredients: ['黄瓜', '木耳', '虾仁'] },
  { id: 'p-59', name: '豆腐鲈鱼汤', style: 'soup', category: 'dinner', difficulty: 'easy', timeNeeded: 18, tags: ['荤菜', '汤品', '鲜甜'], ingredients: ['豆腐', '鲈鱼', '白菜'] },
  { id: 'p-60', name: '三色虾仁', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '颜色丰富', '快手'], ingredients: ['虾仁', '玉米粒', '胡萝卜', '青豆'] },
  { id: 'p-61', name: '黑椒三文鱼块', style: 'bake', category: 'dinner', difficulty: 'easy', timeNeeded: 18, tags: ['荤菜', '高蛋白', '有满足感'], ingredients: ['三文鱼', '黑胡椒', '芦笋'] },
  { id: 'p-62', name: '姜葱巴沙鱼', style: 'steam', category: 'dinner', difficulty: 'easy', timeNeeded: 16, tags: ['荤菜', '清蒸感', '嫩口'], ingredients: ['巴沙鱼', '姜片', '小葱'] },
  { id: 'p-63', name: '菌菇虾滑煲', style: 'braise', category: 'dinner', difficulty: 'easy', timeNeeded: 18, tags: ['荤菜', '鲜味', '嫩滑'], ingredients: ['虾滑', '口蘑', '白菜'] },
  { id: 'p-64', name: '冬瓜虾仁豆腐煲', style: 'braise', category: 'dinner', difficulty: 'easy', timeNeeded: 18, tags: ['荤菜', '清爽', '嫩滑'], ingredients: ['冬瓜', '虾仁', '豆腐'] },
  { id: 'p-65', name: '芦笋虾仁滑蛋', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '鲜嫩', '高蛋白'], ingredients: ['芦笋', '虾仁', '鸡蛋'] },
  { id: 'p-66', name: '清蒸多宝鱼', style: 'steam', category: 'dinner', difficulty: 'medium', timeNeeded: 22, tags: ['荤菜', '硬菜感', '高蛋白'], ingredients: ['多宝鱼', '姜片', '小葱'] },
  { id: 'p-67', name: '柠香虾仁彩椒', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '清爽', '快手'], ingredients: ['虾仁', '彩椒', '柠檬'] },
  { id: 'p-68', name: '秋葵虾仁炒蛋', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '高纤维', '家常'], ingredients: ['秋葵', '虾仁', '鸡蛋'] },
  { id: 'p-69', name: '麻婆豆腐轻油版', style: 'braise', category: 'dinner', difficulty: 'easy', timeNeeded: 16, tags: ['荤菜', '豆腐菜', '下饭'], ingredients: ['豆腐', '肉末', '小葱'] },
  { id: 'p-70', name: '番茄豆腐滑蛋', style: 'braise', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '嫩滑', '家常'], ingredients: ['番茄', '豆腐', '鸡蛋'] },
  { id: 'p-71', name: '香菇蒸豆腐', style: 'steam', category: 'dinner', difficulty: 'easy', timeNeeded: 15, tags: ['荤菜', '嫩滑', '清淡'], ingredients: ['香菇', '豆腐', '小葱'] },
  { id: 'p-72', name: '虾仁蒸蛋豆腐', style: 'steam', category: 'dinner', difficulty: 'easy', timeNeeded: 16, tags: ['荤菜', '高蛋白', '嫩口'], ingredients: ['虾仁', '鸡蛋', '豆腐'] },
  { id: 'p-73', name: '芦笋炒蛋', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 10, tags: ['荤菜', '快手', '清爽'], ingredients: ['芦笋', '鸡蛋'] },
  { id: 'p-74', name: '青椒木耳炒蛋', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 10, tags: ['荤菜', '家常', '快手'], ingredients: ['青椒', '木耳', '鸡蛋'] },
  { id: 'p-75', name: '虾皮蒸水蛋', style: 'steam', category: 'dinner', difficulty: 'easy', timeNeeded: 12, tags: ['荤菜', '蒸蛋', '鲜味'], ingredients: ['虾皮', '鸡蛋', '小葱'] },
  { id: 'p-76', name: '口蘑滑蛋', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 10, tags: ['荤菜', '嫩滑', '快手'], ingredients: ['口蘑', '鸡蛋', '小葱'] },
  { id: 'p-77', name: '白菜豆腐炖粉丝', style: 'braise', category: 'dinner', difficulty: 'easy', timeNeeded: 16, tags: ['荤菜', '家常', '汤汁感'], ingredients: ['白菜', '豆腐', '粉丝'] },
  { id: 'p-78', name: '金针菇豆腐蒸盅', style: 'steam', category: 'dinner', difficulty: 'easy', timeNeeded: 15, tags: ['荤菜', '嫩滑', '轻负担'], ingredients: ['金针菇', '豆腐', '鸡蛋'] },
  { id: 'p-79', name: '山药木耳蒸蛋', style: 'steam', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['荤菜', '清爽', '家常'], ingredients: ['山药', '木耳', '鸡蛋'] },
  { id: 'p-80', name: '西兰花鸡蛋豆腐煲', style: 'braise', category: 'dinner', difficulty: 'easy', timeNeeded: 16, tags: ['荤菜', '高蛋白', '轻油'], ingredients: ['西兰花', '鸡蛋', '豆腐'] },
];

const vegetableSeeds: RecipeSeed[] = [
  { id: 'v-1', name: '蒜蓉生菜', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 8, tags: ['素菜', '百搭', '快手'], ingredients: ['生菜', '大蒜'] },
  { id: 'v-2', name: '上汤娃娃菜轻油版', style: 'soup', category: 'dinner', difficulty: 'easy', timeNeeded: 12, tags: ['素菜', '汤感', '清爽'], ingredients: ['娃娃菜', '香菇', '姜片'] },
  { id: 'v-3', name: '清炒上海青', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 8, tags: ['素菜', '百搭', '家常'], ingredients: ['上海青', '大蒜'] },
  { id: 'v-4', name: '豆豉蒸茄子', style: 'steam', category: 'dinner', difficulty: 'easy', timeNeeded: 16, tags: ['素菜', '蒸菜', '下饭'], ingredients: ['茄子', '豆豉', '大蒜'] },
  { id: 'v-5', name: '番茄炒花菜', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 12, tags: ['素菜', '家常', '颜色丰富'], ingredients: ['番茄', '花菜'] },
  { id: 'v-6', name: '口蘑芦笋', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 10, tags: ['素菜', '清爽', '脆嫩'], ingredients: ['口蘑', '芦笋'] },
  { id: 'v-7', name: '西芹百合腰果', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 12, tags: ['素菜', '脆嫩', '有层次'], ingredients: ['西芹', '百合', '腰果'] },
  { id: 'v-8', name: '麻酱菠菜', style: 'cold', category: 'dinner', difficulty: 'easy', timeNeeded: 8, tags: ['素菜', '凉菜', '清爽'], ingredients: ['菠菜', '芝麻酱'] },
  { id: 'v-9', name: '凉拌西兰花木耳', style: 'cold', category: 'dinner', difficulty: 'easy', timeNeeded: 10, tags: ['素菜', '凉菜', '高纤维'], ingredients: ['西兰花', '木耳'] },
  { id: 'v-10', name: '蒜香空心菜', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 8, tags: ['素菜', '快手', '百搭'], ingredients: ['空心菜', '大蒜'] },
  { id: 'v-11', name: '小炒藕片', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 12, tags: ['素菜', '脆口', '家常'], ingredients: ['莲藕', '彩椒'] },
  { id: 'v-12', name: '清炒莴笋胡萝卜', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 10, tags: ['素菜', '清爽', '颜色丰富'], ingredients: ['莴笋', '胡萝卜'] },
  { id: 'v-13', name: '蒜香西葫芦', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 9, tags: ['素菜', '快手', '清甜'], ingredients: ['西葫芦', '大蒜'] },
  { id: 'v-14', name: '青椒土豆片轻油版', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 12, tags: ['素菜', '家常', '常规好吃'], ingredients: ['青椒', '土豆'] },
  { id: 'v-15', name: '玉米豌豆胡萝卜', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 10, tags: ['素菜', '小朋友友好', '颜色丰富'], ingredients: ['玉米粒', '青豆', '胡萝卜'] },
  { id: 'v-16', name: '凉拌海带丝', style: 'cold', category: 'dinner', difficulty: 'easy', timeNeeded: 10, tags: ['素菜', '凉菜', '解腻'], ingredients: ['海带', '黄瓜'] },
  { id: 'v-17', name: '凉拌金针菇黄瓜', style: 'cold', category: 'dinner', difficulty: 'easy', timeNeeded: 10, tags: ['素菜', '凉菜', '清爽'], ingredients: ['金针菇', '黄瓜'] },
  { id: 'v-18', name: '茄汁菜花', style: 'braise', category: 'dinner', difficulty: 'easy', timeNeeded: 12, tags: ['素菜', '酸甜清爽', '家常'], ingredients: ['番茄', '菜花'] },
  { id: 'v-19', name: '烤南瓜西兰花', style: 'bake', category: 'dinner', difficulty: 'easy', timeNeeded: 18, tags: ['素菜', '烤箱友好', '高颜值'], ingredients: ['南瓜', '西兰花'] },
  { id: 'v-20', name: '香菇青菜', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 10, tags: ['素菜', '菌香', '家常'], ingredients: ['香菇', '青菜'] },
  { id: 'v-21', name: '上汤豆苗', style: 'soup', category: 'dinner', difficulty: 'easy', timeNeeded: 10, tags: ['素菜', '汤感', '清爽'], ingredients: ['豆苗', '香菇'] },
  { id: 'v-22', name: '凉拌菠菜花生', style: 'cold', category: 'dinner', difficulty: 'easy', timeNeeded: 8, tags: ['素菜', '凉菜', '有层次'], ingredients: ['菠菜', '花生'] },
  { id: 'v-23', name: '蒜香杏鲍菇', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 10, tags: ['素菜', '香气足', '快手'], ingredients: ['杏鲍菇', '大蒜'] },
  { id: 'v-24', name: '番茄菌菇烩白菜', style: 'braise', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['素菜', '汤汁感', '家常'], ingredients: ['番茄', '口蘑', '白菜'] },
  { id: 'v-25', name: '黄瓜拌腐竹', style: 'cold', category: 'dinner', difficulty: 'easy', timeNeeded: 10, tags: ['素菜', '凉菜', '高蛋白'], ingredients: ['黄瓜', '腐竹'] },
  { id: 'v-26', name: '西兰花豆干', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 12, tags: ['素菜', '高蛋白', '家常'], ingredients: ['西兰花', '豆干'] },
  { id: 'v-27', name: '蒜蓉茼蒿', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 8, tags: ['素菜', '百搭', '快手'], ingredients: ['茼蒿', '大蒜'] },
  { id: 'v-28', name: '双椒茄条少油版', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['素菜', '有食欲', '常规好吃'], ingredients: ['茄子', '青椒', '彩椒'] },
  { id: 'v-29', name: '凉拌苦菊圣女果', style: 'cold', category: 'dinner', difficulty: 'easy', timeNeeded: 7, tags: ['素菜', '凉菜', '清爽'], ingredients: ['苦菊', '圣女果'] },
  { id: 'v-30', name: '凉拌秋葵', style: 'cold', category: 'dinner', difficulty: 'easy', timeNeeded: 8, tags: ['素菜', '凉菜', '高纤维'], ingredients: ['秋葵', '大蒜'] },
  { id: 'v-31', name: '蒜香小白菜', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 8, tags: ['素菜', '百搭', '清爽'], ingredients: ['小白菜', '大蒜'] },
  { id: 'v-32', name: '木耳荷兰豆', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 10, tags: ['素菜', '脆口', '快手'], ingredients: ['木耳', '荷兰豆'] },
  { id: 'v-33', name: '番茄焖豆角', style: 'braise', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['素菜', '家常', '下饭'], ingredients: ['番茄', '豆角'] },
  { id: 'v-34', name: '清炒菜心', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 8, tags: ['素菜', '百搭', '家常'], ingredients: ['菜心', '大蒜'] },
  { id: 'v-35', name: '腰果西兰花', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 12, tags: ['素菜', '有层次', '高颜值'], ingredients: ['腰果', '西兰花'] },
  { id: 'v-36', name: '洋葱彩椒炒蘑菇', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 11, tags: ['素菜', '香气足', '快手'], ingredients: ['洋葱', '彩椒', '口蘑'] },
  { id: 'v-37', name: '山药木耳小炒', style: 'stirfry', category: 'dinner', difficulty: 'easy', timeNeeded: 11, tags: ['素菜', '脆嫩', '清爽'], ingredients: ['山药', '木耳'] },
  { id: 'v-38', name: '黄瓜拌豆皮', style: 'cold', category: 'dinner', difficulty: 'easy', timeNeeded: 8, tags: ['素菜', '凉菜', '高蛋白'], ingredients: ['黄瓜', '豆皮'] },
  { id: 'v-39', name: '冬瓜海带汤', style: 'soup', category: 'dinner', difficulty: 'easy', timeNeeded: 12, tags: ['汤品', '清爽', '解腻'], ingredients: ['冬瓜', '海带'] },
  { id: 'v-40', name: '白菜豆腐汤', style: 'soup', category: 'dinner', difficulty: 'easy', timeNeeded: 12, tags: ['汤品', '家常', '温和'], ingredients: ['白菜', '豆腐'] },
  { id: 'v-41', name: '番茄菌菇汤', style: 'soup', category: 'dinner', difficulty: 'easy', timeNeeded: 12, tags: ['汤品', '鲜甜', '家常'], ingredients: ['番茄', '口蘑', '香菇'] },
  { id: 'v-42', name: '紫菜虾皮豆腐汤', style: 'soup', category: 'dinner', difficulty: 'easy', timeNeeded: 10, tags: ['汤品', '鲜味', '快手'], ingredients: ['紫菜', '虾皮', '豆腐'] },
  { id: 'v-43', name: '玉米胡萝卜鸡汤', style: 'soup', category: 'dinner', difficulty: 'medium', timeNeeded: 24, tags: ['汤品', '温暖', '家常'], ingredients: ['玉米', '胡萝卜', '鸡腿肉'] },
  { id: 'v-44', name: '黄豆芽豆腐汤', style: 'soup', category: 'dinner', difficulty: 'easy', timeNeeded: 12, tags: ['汤品', '清爽', '家常'], ingredients: ['黄豆芽', '豆腐'] },
  { id: 'v-45', name: '莲藕花生汤', style: 'soup', category: 'dinner', difficulty: 'medium', timeNeeded: 24, tags: ['汤品', '清润', '家常'], ingredients: ['莲藕', '花生'] },
  { id: 'v-46', name: '丝瓜蛤蜊汤', style: 'soup', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['汤品', '鲜甜', '夏天友好'], ingredients: ['丝瓜', '蛤蜊'] },
  { id: 'v-47', name: '口蘑蔬菜汤', style: 'soup', category: 'dinner', difficulty: 'easy', timeNeeded: 12, tags: ['汤品', '清淡', '轻盈'], ingredients: ['口蘑', '西兰花', '胡萝卜'] },
  { id: 'v-48', name: '番茄土豆蔬菜汤', style: 'soup', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['汤品', '家常', '顺口'], ingredients: ['番茄', '土豆', '胡萝卜'] },
  { id: 'v-49', name: '山药枸杞鸡汤', style: 'soup', category: 'dinner', difficulty: 'medium', timeNeeded: 24, tags: ['汤品', '温和', '滋味足'], ingredients: ['山药', '枸杞', '鸡腿肉'] },
  { id: 'v-50', name: '菠菜猪肝汤', style: 'soup', category: 'dinner', difficulty: 'easy', timeNeeded: 14, tags: ['汤品', '家常', '高蛋白'], ingredients: ['菠菜', '猪肝', '姜片'] },
];

export const recipeDatabase: Dish[] = [
  ...breakfastSeeds,
  ...completeMealSeeds,
  ...proteinSeeds,
  ...vegetableSeeds,
].map(buildDish);

export const fruitsList = [
  { name: '苹果', unit: '个' },
  { name: '香蕉', unit: '根' },
  { name: '橙子', unit: '个' },
  { name: '葡萄', unit: '串' },
  { name: '草莓', unit: '盒' },
  { name: '蓝莓', unit: '盒' },
  { name: '梨', unit: '个' },
  { name: '猕猴桃', unit: '个' },
  { name: '火龙果', unit: '个' },
  { name: '桃子', unit: '个' },
];
