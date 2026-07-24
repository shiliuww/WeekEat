import { AppConfig, loadConfig, PROVIDERS, supportsVision } from './config';
import { Dish } from '../types';

// ============================================
// 细致的提示词系统
// ============================================

const PROMPTS = {
  // 菜名规范化
  normalizeDishName: (inputName: string) => {
    return `作为专业的美食专家，请将用户输入的菜名规范化为标准的、通用名称。
用户输入: "${inputName}"

请直接返回规范化后的菜名，不要其他文字。
例如：
- "鳗鱼烧饭" → "蒲烧鳗鱼饭"
- "煮面条" → "红烧牛肉面"
- "土豆丝" → "酸辣土豆丝"
- "红烧肉" → "红烧肉"
- "番茄炒蛋" → "番茄炒蛋"

只返回菜名，不要引号和其他任何文字。`;
  },

  // 根据菜名生成完整菜谱
  generateDishFromName: (dishName: string, ingredientHints: string[] = []) => {
    return `作为专业的营养师和厨师，请根据以下菜名生成一份详细、好吃、适合家常复刻的单人份菜谱。

菜名: "${dishName}"
用户提供的食材偏好: ${ingredientHints.length > 0 ? ingredientHints.join('、') : '无'}

重要要求：
1. 必须返回纯 JSON，不要任何其他文字、Markdown 标记或解释
2. JSON 格式如下：
JSON:
{
  "name": "菜名",
  "ingredients": [
    {"name": "食材名", "quantity": "数量", "unit": "单位", "category": "vegetable/meat/seasoning/grain/fruit/other"}
  ],
  "instructions": ["步骤1", "步骤2", "步骤3"],
  "nutrition": {
    "calories": 200,
    "protein": 20,
    "carbs": 30,
    "fat": 10
  },
  "tags": ["标签1", "标签2"],
  "category": "breakfast/lunch/dinner/snack",
  "difficulty": "easy/medium/hard",
  "timeNeeded": 30
}

3. ingredients 中 category 的值必须是以下之一：vegetable, meat, seasoning, grain, fruit, other
4. nutrition 中数值必须是数字
5. tags 可以是标签，如：高蛋白, 快手菜, 养胃, 减脂, 健康
6. category 根据菜品适合早餐/午餐/晚餐
7. difficulty: easy/medium/hard
8. timeNeeded: 整数分钟
9. 单人份，适合一人食
10. 如果用户提供了食材偏好，请优先使用这些食材
11. 菜谱风格要更有食欲，不要过于寡淡，要像受欢迎的家常创意菜
12. 早餐类避免面包、面条、馒头、油条、饼类等面食，优先粥、蛋、酸奶、燕麦、薯类、谷物碗
13. 如果是午餐或晚餐，优先让菜本身具备荤素搭配，或者适合与素菜搭配

只返回 JSON，不要其他任何文字！`;
  },

  // 分析图片并生成菜谱
  analyzeImage: `分析这张美食图片，识别菜品并生成详细菜谱。

重要：只返回纯 JSON，格式如下：
{
  "name": "菜名",
  "ingredients": [
    {"name": "食材名", "quantity": "数量", "unit": "单位", "category": "vegetable/meat/seasoning/grain/fruit/other"}
  ],
  "instructions": ["步骤1", "步骤2"],
  "nutrition": {"calories": 200, "protein": 20, "carbs": 30, "fat": 10},
  "tags": ["标签1", "标签2"],
  "category": "dinner",
  "difficulty": "medium",
  "timeNeeded": 30
}

只返回 JSON，不要其他任何文字！`,

  // 分析用户饮食需求并给出建议
  analyzeDietNeeds: (userMessage: string) => {
    return `作为专业的营养师，请分析用户的饮食需求并输出结构化结果，方便本地推荐算法更新整库推荐度。

用户说: "${userMessage}"

要求：
1. 只返回纯 JSON，不要 Markdown，不要解释
2. JSON 结构如下：
{
  "suggestions": "对用户的整体饮食建议，1-3句话",
  "recommendedIngredients": ["食材1", "食材2"],
  "recommendedDishes": ["菜名1", "菜名2"],
  "avoidIngredients": ["食材1", "食材2"],
  "likedTags": ["高蛋白", "清爽"],
  "dislikedTags": ["高油", "重口"],
  "healthGoals": ["减脂", "养胃"],
  "preferenceSummary": "一句话总结用户整体偏好",
  "shouldRebalanceAllScores": true
}
3. 如果用户表达的是整体偏好、长期目标、身体状态、饮食原则，而不是只提一两道菜，请把 shouldRebalanceAllScores 设为 true
4. likedTags / dislikedTags 请尽量使用抽象风格词，不要乱造长句
5. 不确定时返回空数组，不要编造

只返回 JSON。`;
  },

  // 优化菜谱
  optimizeWeeklyMenu: (weeklyMenu: any[], userDishes: Dish[], desiredIngredients: string[], desiredDishes: string[]) => {
    return `作为营养师和美食编辑，请检查以下周菜谱是否足够健康、有食欲、符合本地规则。只返回需要替换的菜品，格式：
{
  "replacements": [
    {"dayIndex": 0, "mealType": "breakfast/lunch/dinner", "replaceDishName": "要替换的菜", "reason": "原因", "suggestion": "新菜名"}
  ]
}

当前周菜谱：
${JSON.stringify(weeklyMenu)}

用户想吃的菜：${JSON.stringify(userDishes.map(d => d.name))}
用户想尝试的食材：${JSON.stringify(desiredIngredients)}
用户想尝试的菜名：${JSON.stringify(desiredDishes)}

要求：
1. 确保每天三餐都有
2. 早餐不要出现面包、面条、馒头、油条、饼类等面食，早餐要更健康
3. 午餐和晚餐要尽量做到荤素搭配；如果该餐有“完整一餐”则可以只保留一道
4. 确保菜品有食欲，不要太敷衍、太单调
5. 确保不重复
6. 确保用户想吃的菜必须出现
7. 确保用户指定食材尽量出现

只返回 JSON，不要其他文字！`;
  },

  // 生成采购清单
  generateShoppingList: (menu: any[]) => {
    return `根据以下周菜谱生成详细采购清单。

周菜谱：
${JSON.stringify(menu)}

要求返回纯 JSON 数组：
[
  {"name": "食材名", "quantity": 1, "unit": "单位", "category": "蔬菜/肉类/调料/主食/水果/其他", "isSameDay": false}
]

只返回 JSON，不要其他文字！`;
  }
};

export class AIService {
  private config: AppConfig;

  constructor(config?: AppConfig) {
    this.config = config || loadConfig();
  }

  updateConfig(config: Partial<AppConfig>) {
    this.config = { ...this.config, ...config };
  }

  private async callAPI(messages: any[], image?: File): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('请先在设置中配置API密钥');
    }

    // #region debug-point C:api-request-shape
    fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"wanted-cover-regression",runId:"pre-fix",hypothesisId:"C",location:"src/utils/aiService.ts:callAPI:request",msg:"[DEBUG] AI request prepared",data:{provider:this.config.provider,baseUrl:this.config.baseUrl,model:this.config.model,hasImage:!!image,messagePreview:messages?.map?.((message:any)=>typeof message?.content==='string'?message.content.slice(0,220):'[structured]').slice(0,2)},ts:Date.now()})}).catch(()=>{});
    // #endregion

    const headers: any = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };

    let requestMessages: any[];

    if (image && supportsVision(this.config)) {
      const base64 = await this.fileToBase64(image);
      requestMessages = [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: base64 } },
            { type: 'text', text: PROMPTS.analyzeImage }
          ]
        }
      ];
    } else {
      requestMessages = messages;
    }

    const body = {
      model: this.config.model,
      messages: requestMessages,
      temperature: this.config.temperature,
      max_tokens: 2048,
    };

    console.log('🤖 AI调用中...', { model: this.config.model });

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API调用失败', { status: response.status, error: errorText });
        throw new Error(`API调用失败: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      // #region debug-point C:api-response-shape
      fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"wanted-cover-regression",runId:"pre-fix",hypothesisId:"C",location:"src/utils/aiService.ts:callAPI:response",msg:"[DEBUG] AI response received",data:{model:this.config.model,responsePreview:typeof content==='string'?content.slice(0,260):'',status:'ok'},ts:Date.now()})}).catch(()=>{});
      // #endregion
      
      if (!content) {
        throw new Error('API返回空响应');
      }

      console.log('✅ AI返回内容:', content);
      return content;
    } catch (error) {
      // #region debug-point C:api-error
      fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"wanted-cover-regression",runId:"pre-fix",hypothesisId:"C",location:"src/utils/aiService.ts:callAPI:error",msg:"[DEBUG] AI request failed",data:{model:this.config.model,error:String(error)},ts:Date.now()})}).catch(()=>{});
      // #endregion
      console.error('❌ API请求异常:', error);
      throw error;
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private extractJSON(text: string): any {
    console.log('🔍 解析AI返回内容:', text);
    let jsonStr = text.trim();
    
    try {
      const firstBrace = jsonStr.indexOf('{');
      const firstBracket = jsonStr.indexOf('[');
      const jsonStart = firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket) ? firstBrace : firstBracket;
      
      if (jsonStart === -1) {
        throw new Error('未找到JSON开始标记');
      }

      const braceStack = [];
      let jsonEnd = -1;
      
      for (let i = jsonStart; i < jsonStr.length; i++) {
        if (jsonStr[i] === '{' || jsonStr[i] === '[') {
          braceStack.push(jsonStr[i]);
        } else if (jsonStr[i] === '}' || jsonStr[i] === ']') {
          braceStack.pop();
          if (braceStack.length === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
      }
      
      if (jsonEnd === -1) {
        throw new Error('未找到完整的JSON结束标记');
      }

      jsonStr = jsonStr.substring(jsonStart, jsonEnd);
      jsonStr = jsonStr.replace(/```json|```/g, '').trim();
      
      const result = JSON.parse(jsonStr);
      console.log('✅ JSON解析成功:', result);
      return result;
    } catch (e) {
      console.error('❌ JSON解析失败:', e);
      console.error('尝试解析的原始文本:', text);
      throw e;
    }
  }

  async normalizeDishName(inputName: string): Promise<string> {
    console.log('🔍 规范化菜名:', inputName);
    try {
      const response = await this.callAPI([
        { role: 'user', content: PROMPTS.normalizeDishName(inputName) }
      ]);
      const normalized = response.trim().replace(/^["']|["']$/g, '');
      console.log('✅ 菜名已规范化:', normalized);
      return normalized || inputName;
    } catch (error) {
      console.warn('⚠️ 菜名规范化失败，使用原名:', inputName);
      return inputName;
    }
  }

  async generateDishFromName(
    dishName: string,
    shouldNormalize: boolean = true,
    ingredientHints: string[] = []
  ): Promise<Dish> {
    console.log('🍳 生成菜谱:', dishName);
    
    let finalName = dishName;
    if (shouldNormalize) {
      finalName = await this.normalizeDishName(dishName);
    }
    
    const response = await this.callAPI([
      { role: 'user', content: PROMPTS.generateDishFromName(finalName, ingredientHints) }
    ]);
    
    const parsed = this.extractJSON(response);
    
    return {
      ...parsed,
      id: `ai_${Date.now()}`,
      isUserInput: true,
      recommendationScore: 95,
      addedFrom: 'ai',
      addedDate: new Date().toISOString().split('T')[0]
    };
  }

  async analyzeImage(image: File): Promise<Dish> {
    if (!supportsVision(this.config)) {
      throw new Error(`${PROVIDERS[this.config.provider].name} 不支持图像识别`);
    }
    
    const response = await this.callAPI([{ role: 'user', content: '' }], image);
    const parsed = this.extractJSON(response);
    
    return {
      ...parsed,
      id: `ai_${Date.now()}`,
      isUserInput: true,
      recommendationScore: 95,
      addedFrom: 'image',
      addedDate: new Date().toISOString().split('T')[0]
    };
  }

  async analyzeDietNeeds(userMessage: string): Promise<{
    suggestions: string;
    recommendedIngredients: string[];
    recommendedDishes: string[];
    avoidIngredients: string[];
    likedTags: string[];
    dislikedTags: string[];
    healthGoals: string[];
    preferenceSummary: string;
    shouldRebalanceAllScores: boolean;
  }> {
    const response = await this.callAPI([
      { role: 'user', content: PROMPTS.analyzeDietNeeds(userMessage) }
    ]);
    const parsed = this.extractJSON(response);

    return {
      suggestions: parsed.suggestions || '',
      recommendedIngredients: Array.isArray(parsed.recommendedIngredients) ? parsed.recommendedIngredients.filter(Boolean) : [],
      recommendedDishes: Array.isArray(parsed.recommendedDishes) ? parsed.recommendedDishes.filter(Boolean) : [],
      avoidIngredients: Array.isArray(parsed.avoidIngredients) ? parsed.avoidIngredients.filter(Boolean) : [],
      likedTags: Array.isArray(parsed.likedTags) ? parsed.likedTags.filter(Boolean) : [],
      dislikedTags: Array.isArray(parsed.dislikedTags) ? parsed.dislikedTags.filter(Boolean) : [],
      healthGoals: Array.isArray(parsed.healthGoals) ? parsed.healthGoals.filter(Boolean) : [],
      preferenceSummary: parsed.preferenceSummary || '',
      shouldRebalanceAllScores: Boolean(parsed.shouldRebalanceAllScores),
    };
  }

  async generateShoppingList(menu: any[]): Promise<any[]> {
    const response = await this.callAPI([
      { role: 'user', content: PROMPTS.generateShoppingList(menu) }
    ]);
    return this.extractJSON(response);
  }

  async optimizeWeeklyMenu(
    weeklyMenu: any[],
    userDishes: Dish[],
    desiredIngredients: string[],
    desiredDishes: string[]
  ): Promise<
    { dayIndex: number; mealType: 'breakfast' | 'lunch' | 'dinner'; replaceDishName: string; reason: string; suggestion: string }[]
  > {
    const response = await this.callAPI([
      {
        role: 'user',
        content: PROMPTS.optimizeWeeklyMenu(weeklyMenu, userDishes, desiredIngredients, desiredDishes),
      },
    ]);
    const parsed = this.extractJSON(response);
    return parsed.replacements || [];
  }

  async chat(message: string, history: { role: 'user' | 'assistant'; content: string }[] = []): Promise<string> {
    const messages = [
      { role: 'system' as const, content: '你是一位专业的营养师和厨师助手。你可以：\n1. 回答用户关于饮食、营养、烹饪的问题\n2. 如果用户提到饮食需求（如养胃、减脂等），使用专业知识分析\n3. 友好、专业、有帮助' },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user' as const, content: message },
    ];
    return await this.callAPI(messages);
  }
}

export const aiService = new AIService();
