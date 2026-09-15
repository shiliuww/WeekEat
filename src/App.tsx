import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { Plus, ShoppingCart, Calendar, ChevronLeft, Upload, Check, Trash2, Settings, MessageSquare, Sparkles, RefreshCw, Bot, EyeOff, BookOpen, ThumbsUp, Download, X, Heart, History } from 'lucide-react';
import { Dish, DailyMenu, ShoppingItem, GenerationRecord } from './types';
import { generateWeeklyMenu, generateShoppingList, analyzeImage } from './utils/recipeGenerator';
import { initDatabase, getDishes, upsertDish, applyDietPreferenceProfile, adjustRecommendationScoresByName } from './utils/database';
import { aiService } from './utils/aiService';
import { RecipeLibrary } from './components/RecipeLibrary';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { loadConfig, saveConfig, validateConfig, AppConfig, PROVIDERS, Provider, supportsVision } from './utils/config';
import { loadJson, saveJson } from './utils/storage';
import { toPng } from 'html-to-image';
import { checkForAppUpdate, CURRENT_APP_VERSION, dismissUpdateReminder, openUpdateLink, UPDATE_CHECK_ENABLED } from './utils/updateChecker';
import type { AvailableUpdate } from './utils/updateChecker';
import { downloadBackupSnapshot, parseBackupFile, restoreBackupSnapshot } from './utils/backup';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

type ViewState = 'home' | 'upload' | 'menu' | 'shopping' | 'settings' | 'chat' | 'library' | 'history';
type ChatMessage = { role: 'user' | 'assistant'; content: string };

const APP_STATE_KEY = 'recipe_app_state_v1';
const GENERATION_HISTORY_KEY = 'weekeat_generation_history_v1';

type PersistedAppState = {
  view: ViewState;
  userDishes: Dish[];
  desiredIngredients: string[];
  desiredDishes: string[];
  ingredientInput: string;
  dishInput: string;
  weeklyMenu: DailyMenu[];
  shoppingList: ShoppingItem[];
  selectedItems: string[];
  chatMessages: ChatMessage[];
};

const defaultAppState: PersistedAppState = {
  view: 'home',
  userDishes: [],
  desiredIngredients: [],
  desiredDishes: [],
  ingredientInput: '',
  dishInput: '',
  weeklyMenu: [],
  shoppingList: [],
  selectedItems: [],
  chatMessages: [],
};

function loadAppState(): PersistedAppState {
  return {
    ...defaultAppState,
    ...loadJson<PersistedAppState>(APP_STATE_KEY, defaultAppState),
  };
}

function loadGenerationHistory(): GenerationRecord[] {
  return loadJson<GenerationRecord[]>(GENERATION_HISTORY_KEY, []);
}

function saveGenerationHistory(records: GenerationRecord[]): void {
  saveJson(GENERATION_HISTORY_KEY, records);
}

function formatIngredientPortion(dish: Dish, index: number): string {
  const ingredient = dish.ingredients[index];
  if (!ingredient) {
    return '';
  }

  const quantity = ingredient.quantity?.trim();
  const unit = ingredient.unit?.trim();
  return `${quantity ?? ''}${unit ?? ''}`.trim();
}

function TutorialContent({
  dish,
  stepKeyPrefix,
}: {
  dish: Dish;
  stepKeyPrefix: string;
}) {
  return (
    <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
      <section className="rounded-2xl border border-[#eddac6] bg-white p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#d46a4c]">
          食材与分量
        </div>
        {dish.ingredients.length > 0 ? (
          <div className="space-y-2">
            {dish.ingredients.map((ingredient, index) => {
              const portion = formatIngredientPortion(dish, index);

              return (
                <div
                  key={`${dish.id}-${stepKeyPrefix}-ingredient-${index}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[#f3e4d3] bg-[#fffaf2] px-4 py-3 text-sm text-[#5f4a3a]"
                >
                  <span className="font-medium">{ingredient.name}</span>
                  <span className="shrink-0 rounded-full bg-[#fff1c9] px-3 py-1 text-xs font-semibold text-[#8c5a2b]">
                    {portion || '适量'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#eddac6] bg-[#fffaf2] px-4 py-6 text-center text-sm text-[#8c6b54]">
            这道菜暂时还没有补充食材分量。
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d46a4c]">
          做法步骤
        </div>
        {dish.instructions.length > 0 ? (
          dish.instructions.map((step, index) => (
            <div
              key={`${dish.id}-${stepKeyPrefix}-tutorial-${index}`}
              className="rounded-2xl border border-[#eddac6] bg-white px-4 py-3 text-sm leading-6 text-[#5f4a3a]"
            >
              <span className="mr-2 inline-flex rounded-full border border-[#f2b48d] bg-[#fff1c9] px-2 py-0.5 text-xs font-semibold text-[#8c5a2b]">
                步骤 {index + 1}
              </span>
              {step}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[#eddac6] bg-white px-4 py-6 text-center text-sm text-[#8c6b54]">
            这道菜暂时还没有补充教程文字。
          </div>
        )}
      </section>
    </div>
  );
}

async function saveElementAsImage(
  element: HTMLElement,
  fileName: string,
  shareTitle: string,
  shareText: string
): Promise<void> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#fff7eb',
  });
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const imageFile =
    typeof File === 'function' ? new File([blob], fileName, { type: 'image/png' }) : null;
  const shareNavigator = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  const shareSupportsFiles =
    imageFile !== null &&
    typeof shareNavigator.canShare === 'function' &&
    shareNavigator.canShare({ files: [imageFile] });

  if (navigator.share && shareSupportsFiles && imageFile) {
    try {
      await navigator.share({
        files: [imageFile],
        title: shareTitle,
        text: shareText,
      });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      console.warn('系统分享失败，已回退为下载图片:', error);
    }
  }

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function buildGenerationRecord(
  weeklyMenu: DailyMenu[],
  shoppingList: ShoppingItem[],
  desiredIngredients: string[],
  desiredDishes: string[],
  userDishes: Dish[]
): GenerationRecord {
  return {
    id: `record-${Date.now()}`,
    createdAt: new Date().toISOString(),
    weeklyMenu,
    shoppingList,
    completedMenuItemKeys: [],
    desiredIngredients: [...desiredIngredients],
    desiredDishes: [...desiredDishes],
    userDishNames: userDishes.map((dish) => dish.name),
  };
}

function formatRecordTime(isoString: string): string {
  const date = new Date(isoString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function App() {
  const initialStateRef = useRef<PersistedAppState>(loadAppState());
  const initialState = initialStateRef.current;

  const [view, setView] = useState<ViewState>(initialState.view);
  const [userDishes, setUserDishes] = useState<Dish[]>(initialState.userDishes);
  const [desiredIngredients, setDesiredIngredients] = useState<string[]>(initialState.desiredIngredients);
  const [desiredDishes, setDesiredDishes] = useState<string[]>(initialState.desiredDishes);
  const [ingredientInput, setIngredientInput] = useState(initialState.ingredientInput);
  const [dishInput, setDishInput] = useState(initialState.dishInput);
  const [weeklyMenu, setWeeklyMenu] = useState<DailyMenu[]>(initialState.weeklyMenu);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(initialState.shoppingList);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(initialState.selectedItems));
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialState.chatMessages);
  const [config, setConfig] = useState<AppConfig>(loadConfig);
  const [availableUpdate, setAvailableUpdate] = useState<AvailableUpdate | null>(null);
  const [generationHistory, setGenerationHistory] = useState<GenerationRecord[]>(loadGenerationHistory);

  useEffect(() => {
    initDatabase();
    if (UPDATE_CHECK_ENABLED) {
      void checkForAppUpdate().then(setAvailableUpdate);
    }
  }, []);

  useEffect(() => {
    aiService.updateConfig(config);
  }, [config]);

  const handleManualCheckUpdate = async (): Promise<
    { status: 'available'; version: string } | { status: 'latest'; version: string } | { status: 'error' }
  > => {
    try {
      const update = await checkForAppUpdate({
        ignoreDismissedVersion: true,
        throwOnError: true,
      });

      if (update) {
        setAvailableUpdate(update);
        return { status: 'available', version: update.version };
      }

      return { status: 'latest', version: CURRENT_APP_VERSION };
    } catch (error) {
      console.error('手动检查更新失败:', error);
      return { status: 'error' };
    }
  };

  useEffect(() => {
    saveJson(APP_STATE_KEY, {
      view,
      userDishes,
      desiredIngredients,
      desiredDishes,
      ingredientInput,
      dishInput,
      weeklyMenu,
      shoppingList,
      selectedItems: Array.from(selectedItems),
      chatMessages,
    });
  }, [
    view,
    userDishes,
    desiredIngredients,
    desiredDishes,
    ingredientInput,
    dishInput,
    weeklyMenu,
    shoppingList,
    selectedItems,
    chatMessages,
  ]);

  useEffect(() => {
    saveGenerationHistory(generationHistory);
  }, [generationHistory]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setIsAnalyzing(true);
    try {
      for (const file of files) {
      try {
        const dish = await analyzeImage(file);
        setUserDishes(prev =>
          prev.some(existing => existing.id === dish.id || existing.name === dish.name)
            ? prev
            : [...prev, dish]
        );
      } catch (error) {
        console.error('分析失败:', error);
        alert(error instanceof Error ? error.message : '分析失败');
      }
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addIngredient = () => {
    if (ingredientInput.trim() && !desiredIngredients.includes(ingredientInput.trim())) {
      setDesiredIngredients(prev => [...prev, ingredientInput.trim()]);
      setIngredientInput('');
    }
  };

  const removeIngredient = (ingredient: string) => {
    setDesiredIngredients(prev => prev.filter(i => i !== ingredient));
  };

  const addDesiredDish = () => {
    if (dishInput.trim() && !desiredDishes.includes(dishInput.trim())) {
      setDesiredDishes(prev => [...prev, dishInput.trim()]);
      setDishInput('');
    }
  };

  const removeDesiredDish = (dish: string) => {
    setDesiredDishes(prev => prev.filter(d => d !== dish));
  };

  const removeDish = (dishId: string) => {
    setUserDishes(prev => prev.filter(d => d.id !== dishId));
  };

  const generateMenu = async () => {
    setIsGenerating(true);
    try {
      const menu = await generateWeeklyMenu(userDishes, desiredIngredients, desiredDishes);
      setWeeklyMenu(menu);
      const shopping = await generateShoppingList(menu);
      setShoppingList(shopping);
      setGenerationHistory((prev) => [
        buildGenerationRecord(menu, shopping, desiredIngredients, desiredDishes, userDishes),
        ...prev,
      ]);
      setView('menu');
    } catch (error) {
      console.error('生成失败:', error);
      alert(error instanceof Error ? error.message : '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleItem = (itemName: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(itemName)) {
      newSet.delete(itemName);
    } else {
      newSet.add(itemName);
    }
    setSelectedItems(newSet);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7eb_0%,#fffdf8_40%,#fff3e3_100%)] lg:px-6 lg:py-6">
      <div className="mx-auto min-h-screen w-full max-w-md bg-[#fffdf8] shadow-[0_0_0_3px_#3d2b1f,10px_10px_0_0_rgba(243,192,122,0.35)] lg:min-h-[calc(100vh-3rem)] lg:max-w-6xl lg:overflow-hidden lg:rounded-[36px]">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <HomeView 
              key="home"
              onStart={() => setView('upload')}
              onSettings={() => setView('settings')}
              onChat={() => setView('chat')}
              onLibrary={() => setView('library')}
              onHistory={() => setView('history')}
              hasConfig={validateConfig(config)}
              config={config}
            />
          )}

          {view === 'upload' && (
            <UploadView
              key="upload"
              userDishes={userDishes}
              desiredIngredients={desiredIngredients}
              desiredDishes={desiredDishes}
              ingredientInput={ingredientInput}
              dishInput={dishInput}
              isAnalyzing={isAnalyzing}
              isGenerating={isGenerating}
              onIngredientInputChange={setIngredientInput}
              onAddIngredient={addIngredient}
              onRemoveIngredient={removeIngredient}
              onDishInputChange={setDishInput}
              onAddDesiredDish={addDesiredDish}
              onRemoveDesiredDish={removeDesiredDish}
              onRemoveDish={removeDish}
              onImageUpload={handleImageUpload}
              onGenerate={generateMenu}
              onBack={() => setView('home')}
              hasConfig={validateConfig(config)}
              config={config}
            />
          )}
          
          {view === 'menu' && (
            <MenuView
              key="menu"
              weeklyMenu={weeklyMenu}
              onShopping={() => setView('shopping')}
              onBack={() => setView('upload')}
              onRegenerate={generateMenu}
              isGenerating={isGenerating}
            />
          )}
          
          {view === 'shopping' && (
            <ShoppingView
              key="shopping"
              shoppingList={shoppingList}
              selectedItems={selectedItems}
              onToggleItem={toggleItem}
              onBack={() => setView('menu')}
            />
          )}

          {view === 'settings' && (
            <SettingsView
              key="settings"
              config={config}
              onConfigChange={(newConfig) => {
                setConfig(newConfig);
                saveConfig(newConfig);
              }}
              onManualCheckUpdate={handleManualCheckUpdate}
              showUpdateControls={UPDATE_CHECK_ENABLED}
              onBack={() => setView('home')}
            />
          )}

          {view === 'chat' && (
            <ChatView
              key="chat"
              onBack={() => setView('home')}
              hasConfig={validateConfig(config)}
              messages={chatMessages}
              onMessagesChange={setChatMessages}
            />
          )}

          {view === 'library' && (
            <RecipeLibraryWrapper
              key="library"
              onBack={() => setView('home')}
            />
          )}

          {view === 'history' && (
            <HistoryView
              key="history"
              records={generationHistory}
              onBack={() => setView('home')}
              onReplaceRecord={(updatedRecord) =>
                setGenerationHistory((prev) =>
                  prev.map((record) => (record.id === updatedRecord.id ? updatedRecord : record))
                )
              }
              onDeleteRecord={(recordId) =>
                setGenerationHistory((prev) => prev.filter((record) => record.id !== recordId))
              }
            />
          )}
        </AnimatePresence>

        {availableUpdate && (
          <UpdatePrompt
            update={availableUpdate}
            onDismiss={() => {
              dismissUpdateReminder(availableUpdate.version);
              setAvailableUpdate(null);
            }}
            onUpdateNow={() => {
              openUpdateLink(availableUpdate.releaseUrl);
            }}
          />
        )}
      </div>
    </div>
  );
}

function UpdatePrompt({
  update,
  onDismiss,
  onUpdateNow,
}: {
  update: AvailableUpdate;
  onDismiss: () => void;
  onUpdateNow: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/35 px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex min-h-full w-full items-center justify-center">
        <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border-2 border-[#3d2b1f] bg-[#fffaf2] shadow-[8px_8px_0_0_rgba(243,192,122,0.35)] max-h-[min(88vh,42rem)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#eddac6] px-5 py-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d46a4c]">发现新版本</div>
            <h3 className="mt-1 text-xl font-black text-[#3d2b1f]">
              {update.title || `WeekEat ${update.version}`}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#6f5646]">
              当前版本 <span className="font-semibold text-[#3d2b1f]">v{update.currentVersion}</span>，最新版本 <span className="font-semibold text-[#3d2b1f]">v{update.version}</span>。
              {update.publishedAt ? ` 发布日期：${update.publishedAt}。` : ''}
            </p>
          </div>
          {!update.forceUpdate && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full border-2 border-[#3d2b1f] bg-white p-2 text-[#6a5444]"
              aria-label="关闭更新提醒"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-2xl border border-[#eddac6] bg-white px-4 py-4">
            <div className="text-sm font-semibold text-[#8c5a2b]">更新内容</div>
            {update.releaseNotes.length > 0 ? (
              <div className="mt-3 space-y-2">
                {update.releaseNotes.map((note, index) => (
                  <div
                    key={`${update.version}-note-${index}`}
                    className="rounded-2xl border border-[#f5e4cf] bg-[#fffaf5] px-3 py-2 text-sm leading-6 text-[#5f4a3a] break-words"
                  >
                    {note}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-[#7f6b5d]">
                已发布新版本，建议前往下载最新版安装包。
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#eddac6] bg-[#fffaf2] px-5 py-4 sm:flex-row sm:justify-end">
          {!update.forceUpdate && (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center justify-center rounded-full border-2 border-[#3d2b1f] bg-white px-4 py-2 text-sm font-semibold text-[#6a5444]"
            >
              稍后提醒我
            </button>
          )}
          <button
            type="button"
            onClick={onUpdateNow}
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#3d2b1f] bg-[#fff1c9] px-4 py-2 text-sm font-semibold text-[#8c5a2b] shadow-[3px_3px_0_0_rgba(243,192,122,0.3)]"
          >
            <Download className="h-4 w-4" />
            去下载更新
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

function RecipeLibraryWrapper({ onBack }: { onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="sticky top-0 bg-white z-10 p-6 border-b border-gray-100">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 ml-2">我的菜谱库</h1>
        </div>
      </div>
      <RecipeLibrary />
    </motion.div>
  );
}

function HomeView({ onStart, onSettings, onChat, onLibrary, onHistory, hasConfig, config }: {
  onStart: () => void; 
  onSettings: () => void; 
  onChat: () => void;
  onLibrary: () => void;
  onHistory: () => void;
  hasConfig: boolean;
  config: AppConfig;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-screen flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top,#fff2cc_0%,#fffdf8_45%,#ffe9d4_100%)] lg:min-h-[calc(100vh-3rem)] lg:px-10"
    >
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={onHistory}
          className="p-3 bg-[#f7efe3] text-[#6a5444] rounded-full border-2 border-[#3d2b1f] transition-all"
          title="历史记录"
        >
          <History className="w-6 h-6" />
        </button>
        <button
          onClick={onLibrary}
          className="p-3 bg-[#fff1c9] text-[#8c5a2b] rounded-full border-2 border-[#3d2b1f] transition-all"
          title="菜谱库"
        >
          <BookOpen className="w-6 h-6" />
        </button>
        <button
          onClick={onChat}
          className="p-3 bg-[#ffe1d2] text-[#b85c3d] rounded-full border-2 border-[#3d2b1f] transition-all"
          title="AI 助手"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
        <button
          onClick={onSettings}
          className="p-3 bg-[#f7efe3] text-[#6a5444] rounded-full border-2 border-[#3d2b1f] transition-all"
          title="设置"
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>

      <div className="w-full lg:grid lg:max-w-5xl lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-10">
        <div className="text-center mb-12 lg:mb-0 lg:text-left">
          <div className="w-32 h-32 bg-[#ffd36e] rounded-[38px] border-4 border-[#3d2b1f] flex items-center justify-center mb-6 shadow-[8px_8px_0_0_rgba(243,192,122,0.35)] mx-auto rotate-[-4deg] lg:mx-0">
            <img
              src="/favicon.png"
              alt="WeekEat 应用图标"
              className="h-24 w-24 rounded-[28px] object-cover"
            />
          </div>
          <h1 className="text-4xl font-black text-[#3d2b1f] mb-2 lg:text-5xl">
            WeekEat：智能菜谱助手
          </h1>
          <p className="text-[#8c6b54] text-lg font-semibold">
            一周菜谱 · 智能采买
          </p>
          {!hasConfig && (
              <p className="text-amber-700 text-sm mt-3 bg-[#fff1c9] px-3 py-1 rounded-full inline-block border-2 border-[#3d2b1f]">
              ⚙️ 请先配置API密钥以启用AI功能
            </p>
          )}
          {hasConfig && (
              <p className="text-[#b85c3d] text-sm mt-3 bg-[#ffe1d2] px-3 py-1 rounded-full inline-block border-2 border-[#3d2b1f]">
              ✅ 已连接 {PROVIDERS[config.provider].name}
            </p>
          )}
        </div>

        <div className="card w-full bg-[#fff8ef] p-5 lg:p-6">
          <button
            onClick={onStart}
            className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-3"
          >
            <Plus className="w-6 h-6" />
            开始生成菜谱
          </button>

          <div className="text-center text-[#8c6b54] text-sm mt-6 font-medium space-y-2">
            <p>📷 上传想吃的菜的图片</p>
            <p>🥗 智能安排一周营养均衡菜谱</p>
            <p>🛒 一键生成采购清单</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function UploadView({
  userDishes,
  desiredIngredients,
  desiredDishes,
  ingredientInput,
  dishInput,
  isAnalyzing,
  isGenerating,
  onIngredientInputChange,
  onAddIngredient,
  onRemoveIngredient,
  onDishInputChange,
  onAddDesiredDish,
  onRemoveDesiredDish,
  onRemoveDish,
  onImageUpload,
  onGenerate,
  onBack,
  hasConfig,
  config,
}: {
  userDishes: Dish[],
  desiredIngredients: string[],
  desiredDishes: string[],
  ingredientInput: string,
  dishInput: string,
  isAnalyzing: boolean,
  isGenerating: boolean,
  onIngredientInputChange: (v: string) => void,
  onAddIngredient: () => void,
  onRemoveIngredient: (v: string) => void,
  onDishInputChange: (v: string) => void,
  onAddDesiredDish: () => void,
  onRemoveDesiredDish: (v: string) => void,
  onRemoveDish: (id: string) => void,
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void,
  onGenerate: () => void,
  onBack: () => void,
  hasConfig: boolean,
  config: AppConfig,
}) {
  const canUseVision = supportsVision(config);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-[linear-gradient(180deg,#fff7eb_0%,#fffdf8_50%,#ffeede_100%)] px-6 pt-6 pb-48 lg:min-h-[calc(100vh-3rem)] lg:pb-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center mb-8">
          <button onClick={onBack} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-2xl font-black text-[#3d2b1f] ml-2">记录你的胃口偏好</h1>
        </div>
        <div className="mb-6 rounded-2xl border border-[#efd9bf] bg-[#fff8ef] px-4 py-3 text-sm leading-6 text-[#7a604f] shadow-sm">
          写下这周特别想吃、想试的几样就可以，不需要把整周内容全部自己想出来，剩下的搭配和补全会由系统自动完成。
        </div>

        {isGenerating && (
          <div className="mb-6 rounded-[28px] border-2 border-[#3d2b1f] bg-[#fff1c9] p-5 shadow-[6px_6px_0_0_rgba(243,192,122,0.25)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#3d2b1f] bg-white">
                <RefreshCw className="h-5 w-5 animate-spin text-[#d46a4c]" />
              </div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#d46a4c]">
                  WeekEat 正在生成
                </div>
                <div className="mt-1 text-lg font-black text-[#3d2b1f]">
                  正在为你安排这一周怎么吃
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-[#6f5646] sm:grid-cols-3">
              <div className="rounded-2xl border border-[#efcfaa] bg-white px-4 py-3">1. 整理这周偏好</div>
              <div className="rounded-2xl border border-[#efcfaa] bg-white px-4 py-3">2. 搭配每日三餐</div>
              <div className="rounded-2xl border border-[#efcfaa] bg-white px-4 py-3">3. 同步生成采购清单</div>
            </div>
          </div>
        )}

        {!hasConfig && (
          <div className="bg-[#fff1c9] border-2 border-[#3d2b1f] rounded-2xl p-4 mb-6">
            <p className="text-amber-700 text-sm flex items-start gap-2">
              <Sparkles className="w-5 h-5 flex-shrink-0" />
              配置API密钥后可启用AI图像识别和智能菜谱生成
            </p>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:items-start">
        <div className="mb-8 lg:mb-0">
        <h2 className="text-lg font-bold text-[#3d2b1f] mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          上传想吃的菜
        </h2>
        {!canUseVision && hasConfig ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
            <EyeOff className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 font-medium">当前模型不支持图像识别</p>
            <p className="text-gray-400 text-sm mt-1">
              {config.provider === 'deepseek'
                ? 'DeepSeek 请使用 deepseek-v4-flash-vision-exp 模型。'
                : '请切换到支持视觉输入的模型后再上传图片。'}
            </p>
          </div>
        ) : (
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-[#3d2b1f] bg-[#fff8ef] rounded-[28px] p-8 text-center transition-all shadow-[5px_5px_0_0_rgba(243,192,122,0.25)]">
              <Upload className="w-12 h-12 text-[#d46a4c] mx-auto mb-2" />
              <p className="text-[#b85c3d] font-semibold">点击上传图片</p>
              <p className="text-[#8c6b54] text-sm mt-1">支持单张或多张图片；识别出的新菜会自动补入菜谱库并纳入本周菜单</p>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onImageUpload}
              className="hidden"
            />
          </label>
        )}
        
        {isAnalyzing && (
          <div className="mt-4 text-center text-primary-600 flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-600 border-t-transparent" />
            AI正在识别图片并同步菜谱库...
          </div>
        )}
        
        {userDishes.length > 0 && (
          <div className="mt-4 space-y-2">
            {userDishes.map(dish => (
              <div key={dish.id} className="flex items-center justify-between bg-primary-50 p-4 rounded-2xl">
                <div className="flex items-center gap-2">
                  {dish.isUserInput && <Sparkles className="w-4 h-4 text-primary-500" />}
                  <span className="font-medium text-gray-700">{dish.name}</span>
                </div>
                <button onClick={() => onRemoveDish(dish.id)} className="p-1 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-bold text-[#3d2b1f] mb-4">
            这周想尝试的食材
          </h2>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={ingredientInput}
              onChange={(e) => onIngredientInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddIngredient()}
              placeholder="输入食材名称"
              className="input-field flex-1"
            />
            <button onClick={onAddIngredient} className="btn-primary px-4">
              添加
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {desiredIngredients.map((ing, idx) => (
              <span
                key={idx}
                className="bg-primary-100 text-primary-700 px-4 py-2 rounded-full flex items-center gap-2"
              >
                {ing}
                <button onClick={() => onRemoveIngredient(ing)} className="text-primary-500">×</button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-[#3d2b1f]">
              这周想尝试的菜
            </h2>
            <span className="text-xs rounded-full border border-[#f2b48d] bg-[#fff1c9] px-3 py-1 text-[#8c5a2b]">
              输入后记得点右侧“添加”
            </span>
          </div>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={dishInput}
              onChange={(e) => onDishInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddDesiredDish()}
              placeholder="输入菜名"
              className="input-field flex-1"
            />
            <button onClick={onAddDesiredDish} className="btn-primary px-4">
              添加
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {desiredDishes.map((dish, idx) => (
              <span
                key={idx}
                className="bg-green-100 text-green-700 px-4 py-2 rounded-full flex items-center gap-2"
              >
                {dish}
                <button onClick={() => onRemoveDesiredDish(dish)} className="text-green-500">×</button>
              </span>
            ))}
          </div>
        </div>
        </div>
      </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 lg:static lg:mt-8 lg:border-t-0 lg:bg-transparent lg:p-0">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                AI正在生成...
              </>
            ) : (
              <>
                <Calendar className="w-6 h-6" />
                生成一周菜谱
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function MenuView({ weeklyMenu, onShopping, onBack, onRegenerate, isGenerating }: { 
  weeklyMenu: DailyMenu[], 
  onShopping: () => void, 
  onBack: () => void,
  onRegenerate: () => void,
  isGenerating: boolean,
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [selectedTutorialDish, setSelectedTutorialDish] = useState<Dish | null>(null);

  const handleSaveImage = async () => {
    if (!captureRef.current || weeklyMenu.length === 0) return;

    setIsSavingImage(true);
    try {
      await saveElementAsImage(
        captureRef.current,
        'weekeat-menu.png',
        '本周菜谱',
        'WeekEat 本周菜谱'
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('保存图片失败:', error);
      alert('保存图片失败，请稍后再试');
    } finally {
      setIsSavingImage(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-[linear-gradient(180deg,#fff8ef_0%,#fffdf8_100%)] px-6 pt-6 pb-32 lg:min-h-[calc(100vh-3rem)] lg:pb-8"
    >
      <div className="sticky top-0 z-10 mx-auto mb-5 max-w-6xl rounded-[28px] border-2 border-[#3d2b1f] bg-[#fffdf8]/95 p-5 shadow-[6px_6px_0_0_rgba(243,192,122,0.2)] backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-2xl font-black text-[#3d2b1f]">本周菜谱</h1>
          <button 
            onClick={onRegenerate}
            disabled={isGenerating}
            className="p-2 -mr-2 text-gray-500 hover:text-primary-600 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-6 h-6", isGenerating && "animate-spin")} />
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-[#7f6b5d]">
            已为你整理好一周菜单，也可以继续重生成新方案。
          </div>
          <button
            onClick={handleSaveImage}
            disabled={isSavingImage}
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#3d2b1f] bg-[#fff1c9] px-4 py-2 text-sm font-semibold text-[#8c5a2b] shadow-[3px_3px_0_0_rgba(243,192,122,0.3)] disabled:opacity-50"
          >
            {isSavingImage ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            保存图片
          </button>
        </div>
      </div>

      <div ref={captureRef} className="mx-auto max-w-6xl pb-2">
        <div className="mb-4 rounded-[28px] border-2 border-[#3d2b1f] bg-[#fff8ef] p-5 shadow-[6px_6px_0_0_rgba(243,192,122,0.28)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d46a4c]">WeekEat</div>
          <div className="mt-2 text-3xl font-black text-[#3d2b1f]">本周菜谱</div>
          <div className="mt-1 text-sm text-[#7f6b5d]">智能推荐的一周饮食安排，可直接保存为图片。</div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {weeklyMenu.map((day, idx) => (
            <div key={idx} className="card p-4 bg-[#fff8ef] border-2 border-[#3d2b1f] shadow-[6px_6px_0_0_rgba(243,192,122,0.35)]">
              <div className="inline-flex text-lg font-black text-[#d46a4c] mb-3 bg-[#ffe1d2] px-3 py-1 rounded-full border-2 border-[#3d2b1f]">
                {day.dayName}
              </div>

              {day.meals.breakfast && (
                <MealCard meal={day.meals.breakfast} label="早餐" onOpenTutorial={setSelectedTutorialDish} />
              )}
              {day.meals.lunch && (
                <MealCard meal={day.meals.lunch} label="午餐" onOpenTutorial={setSelectedTutorialDish} />
              )}
              {day.meals.dinner && (
                <MealCard meal={day.meals.dinner} label="晚餐" onOpenTutorial={setSelectedTutorialDish} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-xs text-[#9b6b43]">
          由 WeekEat 生成
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 lg:static lg:mx-auto lg:mt-8 lg:max-w-6xl lg:border-t-0 lg:bg-transparent lg:p-6">
        <button
          onClick={onShopping}
          className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-6 h-6" />
          查看采购清单
        </button>
      </div>

      {selectedTutorialDish && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4 py-5 sm:px-6"
          onClick={() => setSelectedTutorialDish(null)}
        >
          <div
            className="w-[min(28rem,calc(100vw-2rem))] rounded-[28px] border-2 border-[#3d2b1f] bg-[#fffaf2] p-5 shadow-[8px_8px_0_0_rgba(243,192,122,0.35)] sm:w-[min(30rem,calc(100vw-3rem))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d46a4c]">文字教程</div>
                <h3 className="mt-1 text-xl font-black text-[#3d2b1f]">{selectedTutorialDish.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTutorialDish(null)}
                className="rounded-full border-2 border-[#3d2b1f] bg-white p-2 text-[#6a5444]"
                aria-label="关闭教程窗口"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <TutorialContent dish={selectedTutorialDish} stepKeyPrefix="menu" />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function MealCard({
  meal,
  label,
  onOpenTutorial,
  checkedDishKeys,
  getDishEntryKey,
  onToggleDish,
}: {
  meal: any;
  label: string;
  onOpenTutorial: (dish: Dish) => void;
  checkedDishKeys?: Set<string>;
  getDishEntryKey?: (dish: Dish, index: number) => string;
  onToggleDish?: (dishKey: string) => void;
}) {
  const totalNutrition = meal.dishes.reduce(
    (acc: { calories: number; protein: number }, dish: Dish) => ({
      calories: acc.calories + (dish.nutrition?.calories || 0),
      protein: acc.protein + (dish.nutrition?.protein || 0),
    }),
    { calories: 0, protein: 0 }
  );

  return (
    <div className="flex items-start gap-3 py-3 border-t border-dashed border-[#d7b798] first:border-t-0">
      <div className="w-16 h-16 bg-[#ffe9b8] rounded-2xl border-2 border-[#3d2b1f] flex items-center justify-center flex-shrink-0 shadow-[3px_3px_0_0_rgba(243,192,122,0.4)]">
        <span className="text-2xl">
          {label === '早餐' ? '🌅' : label === '午餐' ? '☀️' : '🌙'}
        </span>
      </div>
      <div className="flex-1">
        <div className="text-sm text-[#9b6b43] mb-1 font-semibold">{label}</div>
        <div className="text-xs text-[#7f6b5d] mt-1">
          {totalNutrition.calories || '~'} 千卡 · {totalNutrition.protein || '~'}g 蛋白质
        </div>
        <div className="mt-3 space-y-3">
          {meal.dishes.map((dish: Dish, index: number) => (
            <div
              key={`${dish.id}-${index}`}
              className={cn(
                "rounded-2xl border-2 px-3 py-3 shadow-[3px_3px_0_0_rgba(243,192,122,0.28)] transition-all",
                checkedDishKeys?.has(getDishEntryKey?.(dish, index) ?? '')
                  ? "border-[#d8cec3] bg-[#f3eee7] opacity-80"
                  : "border-[#3d2b1f] bg-white"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      className={cn(
                        "font-bold text-[#3d2b1f]",
                        checkedDishKeys?.has(getDishEntryKey?.(dish, index) ?? '') && "text-[#8e8276] line-through"
                      )}
                    >
                      {dish.name}
                    </div>
                    {dish.isUserInput && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#f2b48d] bg-[#fff1c9] px-2 py-1 text-[11px] font-semibold text-[#d46a4c]">
                        <Heart size={12} className="fill-current" />
                        想吃
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-xs text-[#7f6b5d]",
                      checkedDishKeys?.has(getDishEntryKey?.(dish, index) ?? '') && "text-[#a79a8d]"
                    )}
                  >
                    食材：{dish.ingredients.slice(0, 5).map((ing: any) => ing.name).join('、')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getDishEntryKey && onToggleDish && (
                    <button
                      type="button"
                      onClick={() => onToggleDish(getDishEntryKey(dish, index))}
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                        checkedDishKeys?.has(getDishEntryKey(dish, index))
                          ? "border-[#b7b0a9] bg-[#d9d3cc] text-white"
                          : "border-[#3d2b1f] bg-white text-[#6a5444]"
                      )}
                      aria-label={`标记${dish.name}`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenTutorial(dish)}
                    className="inline-flex items-center gap-1 rounded-full border-2 border-[#3d2b1f] bg-[#fff1c9] px-2 py-1 text-xs font-semibold text-[#8c5a2b]"
                  >
                    教程
                    <BookOpen size={12} />
                  </button>
                </div>
              </div>
              {dish.tags && dish.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {dish.tags.slice(0, 4).map((tag: string, i: number) => (
                    <span key={i} className="text-xs bg-[#ffe8d6] text-[#9c5b3d] px-2 py-1 rounded-full border border-[#f2b48d]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {dish.recommendationScore >= 80 && (
                <div className="flex items-center gap-1 mt-2 text-xs text-green-700">
                  <ThumbsUp size={12} />
                  高推荐度
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShoppingView({ shoppingList, selectedItems, onToggleItem, onBack }: {
  shoppingList: ShoppingItem[], 
  selectedItems: Set<string>, 
  onToggleItem: (name: string) => void, 
  onBack: () => void,
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const grouped = shoppingList.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const handleSaveImage = async () => {
    if (!captureRef.current || shoppingList.length === 0) return;

    setIsSavingImage(true);
    try {
      await saveElementAsImage(
        captureRef.current,
        'weekeat-shopping-list.png',
        '采购清单',
        'WeekEat 采购清单'
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('保存采购清单图片失败:', error);
      alert('保存图片失败，请稍后再试');
    } finally {
      setIsSavingImage(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-[linear-gradient(180deg,#fff8ef_0%,#fffdf8_100%)] lg:min-h-[calc(100vh-3rem)]"
    >
      <div className="sticky top-0 z-10 border-b border-[#eadccd] bg-[#fffdf8]/95 p-6 backdrop-blur">
        <div className="mx-auto max-w-6xl flex items-center mb-4">
          <button onClick={onBack} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="ml-2 text-2xl font-black text-[#3d2b1f]">采购清单</h1>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 text-sm text-[#8c6b54]">
          <span className="rounded-full border border-[#efcfaa] bg-[#fff1c9] px-3 py-1 font-semibold">
            已选 {selectedItems.size} / {shoppingList.length} 项
          </span>
          <button
            onClick={handleSaveImage}
            disabled={isSavingImage}
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#3d2b1f] bg-[#fff1c9] px-4 py-2 text-sm font-semibold text-[#8c5a2b] shadow-[3px_3px_0_0_rgba(243,192,122,0.3)] disabled:opacity-50"
          >
            {isSavingImage ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            保存图片
          </button>
        </div>
      </div>

      <div ref={captureRef} className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-4 rounded-[28px] border-2 border-[#3d2b1f] bg-[#fff8ef] p-5 shadow-[6px_6px_0_0_rgba(243,192,122,0.28)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d46a4c]">WeekEat</div>
          <div className="mt-2 text-3xl font-black text-[#3d2b1f]">采购清单</div>
          <div className="mt-1 text-sm text-[#7f6b5d]">根据本周菜谱汇总出的采购清单，可直接保存为图片。</div>
        </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {Object.entries(grouped).map(([category, items]) => (
          <section
            key={category}
            className="rounded-[28px] border-2 border-[#3d2b1f] bg-[#fff8ef] p-4 shadow-[6px_6px_0_0_rgba(243,192,122,0.2)]"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-[#3d2b1f]">{category}</h3>
              <span className="rounded-full border border-[#edd7bf] bg-white px-3 py-1 text-xs font-semibold text-[#8c6b54]">
                {items.length} 项
              </span>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onToggleItem(item.name)}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition-all",
                    selectedItems.has(item.name)
                      ? "border-[#d9cec1] bg-[#f5efe8]"
                      : "border-[#efe5da] bg-white hover:border-[#f2b48d]"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className={cn(
                        "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2",
                        selectedItems.has(item.name)
                          ? "bg-primary-500 border-primary-500"
                          : "border-gray-300"
                      )}>
                        {selectedItems.has(item.name) && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className={cn(
                          "font-medium text-[#3d2b1f]",
                          selectedItems.has(item.name) && "line-through text-gray-400"
                        )}>
                          {item.name}
                        </div>
                        {item.isSameDay && (
                          <span className="mt-2 inline-flex rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-600">
                            当天买
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#fff6eb] px-3 py-1 text-sm font-semibold text-[#8c6b54] whitespace-nowrap">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      </div>
    </motion.div>
  );
}

function HistoryView({
  records,
  onBack,
  onReplaceRecord,
  onDeleteRecord,
}: {
  records: GenerationRecord[];
  onBack: () => void;
  onReplaceRecord: (record: GenerationRecord) => void;
  onDeleteRecord: (recordId: string) => void;
}) {
  const [selectedRecord, setSelectedRecord] = useState<GenerationRecord | null>(null);
  const [detailMode, setDetailMode] = useState<'menu' | 'shopping' | null>(null);
  const [selectedTutorialDish, setSelectedTutorialDish] = useState<Dish | null>(null);
  const checkedDishKeys = new Set(selectedRecord?.completedMenuItemKeys ?? []);

  useEffect(() => {
    if (!selectedRecord) {
      return;
    }

    const latestRecord = records.find((record) => record.id === selectedRecord.id);
    if (latestRecord && latestRecord !== selectedRecord) {
      setSelectedRecord(latestRecord);
    }
  }, [records, selectedRecord]);

  const replaceSelectedRecord = (updater: (record: GenerationRecord) => GenerationRecord) => {
    setSelectedRecord((prev) => {
      if (!prev) {
        return prev;
      }

      const updatedRecord = updater(prev);
      onReplaceRecord(updatedRecord);
      return updatedRecord;
    });
  };

  const toggleHistoryDish = (dishKey: string) => {
    replaceSelectedRecord((record) => {
      const completedKeys = new Set(record.completedMenuItemKeys ?? []);
      if (completedKeys.has(dishKey)) {
        completedKeys.delete(dishKey);
      } else {
        completedKeys.add(dishKey);
      }

      return {
        ...record,
        completedMenuItemKeys: Array.from(completedKeys),
      };
    });
  };

  const toggleHistoryShoppingItem = (itemIndex: number) => {
    replaceSelectedRecord((record) => ({
      ...record,
      shoppingList: record.shoppingList.map((item, index) =>
        index === itemIndex ? { ...item, checked: !item.checked } : item
      ),
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-[linear-gradient(180deg,#fff8ef_0%,#fffdf8_100%)] p-6 lg:min-h-[calc(100vh-3rem)]"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center">
          <button onClick={onBack} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="ml-2 text-2xl font-black text-[#3d2b1f]">历史记录</h1>
        </div>

        {records.length === 0 ? (
          <div className="rounded-[28px] border-2 border-dashed border-[#d8c1a7] bg-[#fff8ef] p-8 text-center text-[#8c6b54]">
            还没有生成记录。等你生成过一轮菜谱后，这里就会自动保存菜谱和采购清单。
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {records.map((record) => (
              <article
                key={record.id}
                className="rounded-[28px] border-2 border-[#3d2b1f] bg-[#fff8ef] p-5 shadow-[6px_6px_0_0_rgba(243,192,122,0.2)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d46a4c]">
                      {formatRecordTime(record.createdAt)}
                    </div>
                    <h3 className="mt-2 text-xl font-black text-[#3d2b1f]">
                      第 {records.length - records.findIndex((item) => item.id === record.id)} 次生成
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteRecord(record.id)}
                    className="rounded-full border-2 border-[#3d2b1f] bg-white p-2 text-[#6a5444]"
                    aria-label="删除历史记录"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-[#efcfaa] bg-[#fff1c9] px-3 py-1 font-semibold text-[#8c5a2b]">
                    {record.weeklyMenu.length} 天菜谱
                  </span>
                  <span className="rounded-full border border-[#efcfaa] bg-white px-3 py-1 font-semibold text-[#8c5a2b]">
                    {record.shoppingList.length} 项采购
                  </span>
                </div>

                {(record.desiredIngredients.length > 0 || record.desiredDishes.length > 0 || record.userDishNames.length > 0) && (
                  <div className="mt-4 space-y-2 text-sm text-[#6f5646]">
                    {record.desiredIngredients.length > 0 && (
                      <div>食材：{record.desiredIngredients.join('、')}</div>
                    )}
                    {record.desiredDishes.length > 0 && (
                      <div>想吃的菜：{record.desiredDishes.join('、')}</div>
                    )}
                    {record.userDishNames.length > 0 && (
                      <div>上传识别：{record.userDishNames.join('、')}</div>
                    )}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRecord(record);
                      setDetailMode('menu');
                    }}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-[#3d2b1f] bg-[#fff1c9] px-4 py-2 text-sm font-semibold text-[#8c5a2b]"
                  >
                    <Calendar className="h-4 w-4" />
                    看菜谱
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRecord(record);
                      setDetailMode('shopping');
                    }}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-[#3d2b1f] bg-white px-4 py-2 text-sm font-semibold text-[#6a5444]"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    看清单
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {selectedRecord && detailMode === 'menu' && (
        <div
          className="fixed inset-0 z-40 overflow-y-auto bg-black/35 px-4 py-5 sm:px-6"
          onClick={() => setDetailMode(null)}
        >
          <div
            className="mx-auto w-full max-w-6xl rounded-[32px] border-2 border-[#3d2b1f] bg-[#fffaf2] p-5 shadow-[8px_8px_0_0_rgba(243,192,122,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d46a4c]">历史菜谱</div>
                <h3 className="mt-1 text-xl font-black text-[#3d2b1f]">{formatRecordTime(selectedRecord.createdAt)}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailMode(null)}
                className="rounded-full border-2 border-[#3d2b1f] bg-white p-2 text-[#6a5444]"
                aria-label="关闭历史菜谱"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {selectedRecord.weeklyMenu.map((day, idx) => (
                <div key={`${selectedRecord.id}-${day.dayName}-${idx}`} className="card p-4 bg-[#fff8ef] border-2 border-[#3d2b1f] shadow-[6px_6px_0_0_rgba(243,192,122,0.35)]">
                  <div className="inline-flex text-lg font-black text-[#d46a4c] mb-3 bg-[#ffe1d2] px-3 py-1 rounded-full border-2 border-[#3d2b1f]">
                    {day.dayName}
                  </div>
                  {day.meals.breakfast && (
                    <MealCard
                      meal={day.meals.breakfast}
                      label="早餐"
                      onOpenTutorial={setSelectedTutorialDish}
                      checkedDishKeys={checkedDishKeys}
                      getDishEntryKey={(dish, dishIndex) =>
                        `${selectedRecord.id}-${idx}-breakfast-${dish.id}-${dishIndex}`
                      }
                      onToggleDish={toggleHistoryDish}
                    />
                  )}
                  {day.meals.lunch && (
                    <MealCard
                      meal={day.meals.lunch}
                      label="午餐"
                      onOpenTutorial={setSelectedTutorialDish}
                      checkedDishKeys={checkedDishKeys}
                      getDishEntryKey={(dish, dishIndex) =>
                        `${selectedRecord.id}-${idx}-lunch-${dish.id}-${dishIndex}`
                      }
                      onToggleDish={toggleHistoryDish}
                    />
                  )}
                  {day.meals.dinner && (
                    <MealCard
                      meal={day.meals.dinner}
                      label="晚餐"
                      onOpenTutorial={setSelectedTutorialDish}
                      checkedDishKeys={checkedDishKeys}
                      getDishEntryKey={(dish, dishIndex) =>
                        `${selectedRecord.id}-${idx}-dinner-${dish.id}-${dishIndex}`
                      }
                      onToggleDish={toggleHistoryDish}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedRecord && detailMode === 'shopping' && (
        <div
          className="fixed inset-0 z-40 overflow-y-auto bg-black/35 px-4 py-5 sm:px-6"
          onClick={() => setDetailMode(null)}
        >
          <div
            className="mx-auto w-full max-w-5xl rounded-[32px] border-2 border-[#3d2b1f] bg-[#fffaf2] p-5 shadow-[8px_8px_0_0_rgba(243,192,122,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d46a4c]">历史采购清单</div>
                <h3 className="mt-1 text-xl font-black text-[#3d2b1f]">{formatRecordTime(selectedRecord.createdAt)}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailMode(null)}
                className="rounded-full border-2 border-[#3d2b1f] bg-white p-2 text-[#6a5444]"
                aria-label="关闭历史采购清单"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {Object.entries(
                selectedRecord.shoppingList.reduce((acc, item, itemIndex) => {
                  if (!acc[item.category]) {
                    acc[item.category] = [];
                  }
                  acc[item.category].push({ item, itemIndex });
                  return acc;
                }, {} as Record<string, { item: ShoppingItem; itemIndex: number }[]>)
              ).map(([category, items]) => (
                <section
                  key={`${selectedRecord.id}-${category}`}
                  className="rounded-[28px] border-2 border-[#3d2b1f] bg-[#fff8ef] p-4 shadow-[6px_6px_0_0_rgba(243,192,122,0.2)]"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-black text-[#3d2b1f]">{category}</h3>
                    <span className="rounded-full border border-[#edd7bf] bg-white px-3 py-1 text-xs font-semibold text-[#8c6b54]">
                      {items.length} 项
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.map(({ item, itemIndex }, idx) => (
                      <button
                        type="button"
                        onClick={() => toggleHistoryShoppingItem(itemIndex)}
                        key={`${selectedRecord.id}-${category}-${item.name}-${idx}`}
                        className={cn(
                          "w-full rounded-2xl border p-4 text-left transition-all",
                          item.checked
                            ? "border-[#d8cec3] bg-[#f3eee7] opacity-80"
                            : "border-[#efe5da] bg-white hover:border-[#f2b48d]"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div
                              className={cn(
                                "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                                item.checked
                                  ? "border-[#b7b0a9] bg-[#d9d3cc] text-white"
                                  : "border-[#3d2b1f] bg-white text-[#6a5444]"
                              )}
                            >
                              <Check className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div
                                className={cn(
                                  "font-medium text-[#3d2b1f]",
                                  item.checked && "text-[#8e8276] line-through"
                                )}
                              >
                                {item.name}
                              </div>
                            {item.isSameDay && (
                              <span className="mt-2 inline-flex rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-600">
                                当天买
                              </span>
                            )}
                          </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-[#fff6eb] px-3 py-1 text-sm font-semibold text-[#8c6b54] whitespace-nowrap">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedTutorialDish && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-5 sm:px-6"
          onClick={() => setSelectedTutorialDish(null)}
        >
          <div
            className="w-[min(28rem,calc(100vw-2rem))] rounded-[28px] border-2 border-[#3d2b1f] bg-[#fffaf2] p-5 shadow-[8px_8px_0_0_rgba(243,192,122,0.35)] sm:w-[min(30rem,calc(100vw-3rem))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d46a4c]">文字教程</div>
                <h3 className="mt-1 text-xl font-black text-[#3d2b1f]">{selectedTutorialDish.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTutorialDish(null)}
                className="rounded-full border-2 border-[#3d2b1f] bg-white p-2 text-[#6a5444]"
                aria-label="关闭教程窗口"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <TutorialContent dish={selectedTutorialDish} stepKeyPrefix="history" />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SettingsView({ config, onConfigChange, onManualCheckUpdate, showUpdateControls, onBack }: {
  config: AppConfig;
  onConfigChange: (config: AppConfig) => void;
  onManualCheckUpdate: () => Promise<
    { status: 'available'; version: string } | { status: 'latest'; version: string } | { status: 'error' }
  >;
  showUpdateControls: boolean;
  onBack: () => void;
}) {
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateCheckMessage, setUpdateCheckMessage] = useState<string | null>(null);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const handleProviderChange = (provider: Provider) => {
    const providerConfig = PROVIDERS[provider];
    onConfigChange({
      ...config,
      provider,
      baseUrl: providerConfig.defaultBaseUrl,
      model: providerConfig.defaultModel,
    });
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateCheckMessage(null);

    const result = await onManualCheckUpdate();

    if (result.status === 'available') {
      setUpdateCheckMessage(`发现新版本 v${result.version}，已为你打开更新提示。`);
    } else if (result.status === 'latest') {
      setUpdateCheckMessage(`当前已经是最新版本 v${result.version}。`);
    } else {
      setUpdateCheckMessage('检查更新失败，请稍后再试。');
    }

    setIsCheckingUpdate(false);
  };

  const handleExportBackup = () => {
    try {
      const fileName = downloadBackupSnapshot();
      setBackupMessage(`备份已导出：${fileName}`);
    } catch (error) {
      console.error('导出备份失败:', error);
      setBackupMessage('导出备份失败，请稍后再试。');
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const confirmed = window.confirm('导入备份会覆盖当前设备上的本地数据，是否继续？');
    if (!confirmed) {
      return;
    }

    setIsImportingBackup(true);
    setBackupMessage(null);

    try {
      const snapshot = await parseBackupFile(file);
      restoreBackupSnapshot(snapshot);
      setBackupMessage('备份导入成功，正在刷新应用...');
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      console.error('导入备份失败:', error);
      setBackupMessage(error instanceof Error ? error.message : '导入备份失败，请检查文件后重试。');
    } finally {
      setIsImportingBackup(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen p-6 lg:min-h-[calc(100vh-3rem)]"
    >
      <div className="mx-auto max-w-6xl">
      <div className="flex items-center mb-8">
        <button onClick={onBack} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800 ml-2">API 设置</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div className="space-y-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            选择 AI 厂商
          </label>
          <div className="space-y-2">
            {(Object.entries(PROVIDERS) as [Provider, typeof PROVIDERS.openai][]).map(([key, provider]) => (
              <button
                key={key}
                onClick={() => handleProviderChange(key)}
                className={cn(
                  "w-full p-4 rounded-2xl border-2 text-left transition-all",
                  config.provider === key
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-800">{provider.name}</div>
                    <div className="text-sm text-gray-500">{provider.description}</div>
                  </div>
                  {config.provider === key && (
                    <Check className="w-6 h-6 text-primary-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card bg-[#fffaf2] p-5">
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  API 密钥
                </label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => onConfigChange({ ...config, apiKey: e.target.value })}
                  placeholder={`输入 ${PROVIDERS[config.provider].name} API Key`}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  API 地址
                </label>
                <input
                  type="text"
                  value={config.baseUrl}
                  onChange={(e) => onConfigChange({ ...config, baseUrl: e.target.value })}
                  placeholder={PROVIDERS[config.provider].defaultBaseUrl}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  模型
                </label>
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => onConfigChange({ ...config, model: e.target.value })}
                  placeholder={PROVIDERS[config.provider].defaultModel}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  温度 (创造力: {config.temperature})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => onConfigChange({ ...config, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>保守</span>
                  <span>创意</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary-50 rounded-2xl p-4">
            <h3 className="font-semibold text-primary-800 mb-2">配置说明</h3>
            <ul className="text-sm text-primary-700 space-y-1">
              <li>• <strong>OpenAI</strong>: gpt-4o (推荐，最强能力全面)</li>
              <li>• <strong>DeepSeek</strong>: 性价比高，不支持图像识别</li>
              <li>• <strong>智谱 AI</strong>: 国产模型，支持图像识别</li>
              <li>• <strong>Kimi</strong>: Moonshot OpenAI 兼容接口，默认适合文本与长上下文</li>
              <li>• <strong>Qwen</strong>: 默认使用 `qwen-plus`，如需图像识别可手动换成 VL 模型</li>
            </ul>
          </div>

          {showUpdateControls && (
          <div className="card bg-[#fffaf2] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#3d2b1f]">版本更新</h3>
                <p className="mt-1 text-sm text-[#7f6b5d]">当前版本 v{CURRENT_APP_VERSION}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleCheckUpdate()}
                disabled={isCheckingUpdate}
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#3d2b1f] bg-[#fff1c9] px-4 py-2 text-sm font-semibold text-[#8c5a2b] shadow-[3px_3px_0_0_rgba(243,192,122,0.3)] disabled:opacity-60"
              >
                {isCheckingUpdate ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    检查中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    手动检查更新
                  </>
                )}
              </button>
            </div>
            {updateCheckMessage && (
              <div className="mt-3 rounded-2xl border border-[#eddac6] bg-white px-4 py-3 text-sm text-[#6f5646]">
                {updateCheckMessage}
              </div>
            )}
          </div>
          )}

          <div className="card bg-[#fffaf2] p-5">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-base font-semibold text-[#3d2b1f]">数据备份与恢复</h3>
                <p className="mt-1 text-sm leading-6 text-[#7f6b5d]">
                    导出当前设备上的菜谱库、历史记录和偏好设置；不会包含 API Key 或相关配置。导入后会覆盖本地数据。
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#3d2b1f] bg-white px-4 py-2 text-sm font-semibold text-[#6a5444]"
                >
                  <Download className="h-4 w-4" />
                  导出备份
                </button>

                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  disabled={isImportingBackup}
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#3d2b1f] bg-[#fff1c9] px-4 py-2 text-sm font-semibold text-[#8c5a2b] shadow-[3px_3px_0_0_rgba(243,192,122,0.3)] disabled:opacity-60"
                >
                  {isImportingBackup ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      导入中...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      导入备份
                    </>
                  )}
                </button>

                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(event) => void handleImportBackup(event)}
                />
              </div>

              {backupMessage && (
                <div className="rounded-2xl border border-[#eddac6] bg-white px-4 py-3 text-sm text-[#6f5646]">
                  {backupMessage}
                </div>
              )}
            </div>
          </div>

          <div className="text-sm text-gray-500">
            💡 配置会保存在当前设备本地，后续打包成 Electron 也可沿用这套持久化接口
          </div>
        </div>
      </div>
      </div>
    </motion.div>
  );
}

function ChatView({
  onBack,
  hasConfig,
  messages,
  onMessagesChange,
}: {
  onBack: () => void;
  hasConfig: boolean;
  messages: ChatMessage[];
  onMessagesChange: Dispatch<SetStateAction<ChatMessage[]>>;
}) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const quickPrompts = ['我想养胃，最近晚饭怎么安排？', '帮我推荐几道减脂但不寡淡的菜', '我这周想多吃蒸菜和汤，可以怎么搭？'];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!input.trim() || !hasConfig) return;

    const userMessage = { role: 'user' as const, content: input.trim() };
    onMessagesChange(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const libraryBeforeChanges = getDishes();
      const plan = await aiService.planConversationLibraryChanges(userMessage.content, libraryBeforeChanges);

      applyDietPreferenceProfile(plan.preference);
      const adjustedNames = adjustRecommendationScoresByName(plan.scoreAdjustments);
      const addedNames: string[] = [];

      for (const dishName of plan.addDishNames) {
        if (getDishes().some(dish => dish.name === dishName)) continue;
        try {
          const newDish = await aiService.generateDishFromName(dishName);
          upsertDish({ ...newDish, addedFrom: 'ai' });
          addedNames.push(dishName);
        } catch {
          // 单道菜生成失败不影响已经完成的偏好与喜爱度更新。
        }
      }

      const appliedChanges = [
        addedNames.length ? `已加入菜谱库：${addedNames.join('、')}` : '',
        adjustedNames.length ? `已调整喜爱度：${adjustedNames.join('、')}` : '',
        plan.preference.preferenceSummary ? '已更新长期口味偏好' : '',
      ].filter(Boolean);
      const response = [plan.reply, appliedChanges.length ? `\n\n✅ ${appliedChanges.join('；')}` : ''].join('');
      onMessagesChange(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      onMessagesChange(prev => [...prev, {
        role: 'assistant', 
        content: error instanceof Error ? error.message : '抱歉，遇到了一些问题，请稍后再试。' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-[linear-gradient(180deg,#fff7eb_0%,#fffdf8_48%,#ffe9d4_100%)] px-6 pt-6 pb-6 lg:min-h-[calc(100vh-3rem)]"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5">
        <div className="sticky top-0 z-10 rounded-[28px] border-2 border-[#3d2b1f] bg-[#fffaf2]/95 p-5 shadow-[6px_6px_0_0_rgba(243,192,122,0.2)] backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center">
              <button onClick={onBack} className="p-2 -ml-2">
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div className="flex items-center gap-3 ml-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-[#3d2b1f] bg-[#ffe1d2] shadow-[3px_3px_0_0_rgba(243,192,122,0.28)]">
                  <Bot className="w-5 h-5 text-[#b85c3d]" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-[#3d2b1f]">AI 助手</h1>
                  <p className="text-xs text-[#8c6b54]">
                    {isTyping ? '正在思考你的问题...' : hasConfig ? '在线，随时可以一起聊吃什么' : '请先配置 API'}
                  </p>
                </div>
              </div>
            </div>
            <div className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              hasConfig
                ? "border-[#f2b48d] bg-[#fff1c9] text-[#8c5a2b]"
                : "border-[#e3d6c8] bg-white text-[#8c6b54]"
            )}>
              {isTyping ? '思考中' : hasConfig ? '已连接' : '未配置'}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-[32px] border-2 border-[#3d2b1f] bg-[#fffaf2] p-4 shadow-[8px_8px_0_0_rgba(243,192,122,0.2)] sm:p-5">
          {messages.length === 0 && (
            <div className="rounded-[28px] border-2 border-dashed border-[#d8c1a7] bg-[#fff8ef] px-6 py-12 text-center text-[#8c6b54]">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border-2 border-[#3d2b1f] bg-[#ffe1d2] shadow-[4px_4px_0_0_rgba(243,192,122,0.25)]">
                <Bot className="h-8 w-8 text-[#b85c3d]" />
              </div>
              <p className="text-xl font-black text-[#3d2b1f]">你好，我是你的吃饭搭子</p>
              <p className="mt-2 text-sm leading-6">无论是养胃、减脂、清淡一点，还是单纯想吃点顺口的，都可以直接问我。</p>
              <div className="mt-6">
                <p className="text-sm font-semibold text-[#d46a4c]">试试这些问题</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setInput(prompt)}
                      className="rounded-full border-2 border-[#3d2b1f] bg-white px-4 py-2 text-sm font-medium text-[#6f5646] shadow-[3px_3px_0_0_rgba(243,192,122,0.18)]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex gap-3 max-w-[85%]",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div className={cn(
                  "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-[#3d2b1f]",
                  msg.role === 'user'
                    ? "bg-[#fff1c9] text-[#8c5a2b]"
                    : "bg-[#ffe1d2] text-[#b85c3d]"
                )}>
                  {msg.role === 'user' ? '我' : <Bot className="w-4 h-4" />}
                </div>
                <div className={cn(
                  "rounded-[24px] border-2 p-4 whitespace-pre-wrap shadow-[4px_4px_0_0_rgba(243,192,122,0.16)]",
                  msg.role === 'user'
                    ? "border-[#3d2b1f] bg-[#ffe8c7] text-[#3d2b1f]"
                    : "border-[#efd9bf] bg-white text-[#4f3c30]"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 max-w-[85%] mr-auto">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-[#3d2b1f] bg-[#ffe1d2] text-[#b85c3d]">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="rounded-[24px] border-2 border-[#efd9bf] bg-white p-4 text-[#4f3c30] shadow-[4px_4px_0_0_rgba(243,192,122,0.16)]">
                  <div className="text-sm font-medium text-[#8c6b54]">正在思考中...</div>
                  <div className="mt-2 flex gap-1">
                    <div className="w-2 h-2 bg-[#d6a06a] rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-[#d6a06a] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-[#d6a06a] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="rounded-[28px] border-2 border-[#3d2b1f] bg-[#fff8ef] p-4 shadow-[6px_6px_0_0_rgba(243,192,122,0.18)]">
          {!hasConfig ? (
            <div className="text-center py-4 text-[#8c6b54]">
              请先在设置中配置API密钥
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="输入你的问题..."
                className="input-field flex-1"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
                className="btn-primary px-6 disabled:opacity-50 sm:self-end"
              >
                {isTyping ? '思考中...' : '发送'}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default App;
