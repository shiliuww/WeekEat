import React, { useEffect, useMemo, useState } from 'react';
import { Dish, Ingredient } from '../types';
import { getDishes, deleteDish, updateDish, addDish } from '../utils/database';
import {
  Plus,
  Edit2,
  Trash2,
  Star,
  Award,
  CheckCircle,
  Clock,
  Flame,
  Sparkles,
  ChevronDown,
  Search,
  Filter,
  MessageSquare,
  X,
  Send,
  Tag,
  BookOpen,
  Carrot,
} from 'lucide-react';
import { aiService } from '../utils/aiService';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const defaultNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };

const createEmptyDishForm = (): Partial<Dish> => ({
  name: '',
  ingredients: [],
  instructions: [],
  nutrition: defaultNutrition,
  tags: [],
  category: 'dinner',
  difficulty: 'medium',
  timeNeeded: 30,
  isCompleteMeal: false,
});

const createEmptyIngredient = (): Ingredient => ({
  name: '',
  quantity: '',
  unit: '',
  category: 'vegetable',
});

export const RecipeLibrary: React.FC = () => {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [ingredientHintText, setIngredientHintText] = useState('');
  const [newDish, setNewDish] = useState<Partial<Dish>>(createEmptyDishForm());
  const [searchText, setSearchText] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | Dish['difficulty']>('all');
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [showTagFilterPanel, setShowTagFilterPanel] = useState(false);
  const [selectedIngredientFilters, setSelectedIngredientFilters] = useState<string[]>([]);
  const [showIngredientFilterPanel, setShowIngredientFilterPanel] = useState(false);
  const [ingredientFilterInput, setIngredientFilterInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [showAiChat, setShowAiChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '你好，我可以帮你一起看菜谱库该怎么改。你可以直接说想优化哪道菜、想补什么食材结构，或者想统一调整哪些标签。',
    },
  ]);
  const [isChatting, setIsChatting] = useState(false);

  useEffect(() => {
    loadDishes();
  }, []);

  const loadDishes = () => {
    setDishes(getDishes());
  };

  const allTags = useMemo(() => {
    return Array.from(new Set(dishes.flatMap(dish => dish.tags || []))).sort((a, b) => a.localeCompare(b));
  }, [dishes]);

  const allIngredientNames = useMemo(() => {
    return Array.from(
      new Set(
        dishes.flatMap(dish =>
          dish.ingredients
            .map(ingredient => ingredient.name.trim())
            .filter(Boolean)
        )
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [dishes]);

  const ingredientSuggestions = useMemo(() => {
    const keyword = ingredientFilterInput.trim();
    const baseList = allIngredientNames.filter(name => !selectedIngredientFilters.includes(name));

    if (!keyword) {
      return baseList.slice(0, 18);
    }

    return baseList
      .filter(name => name.includes(keyword))
      .slice(0, 18);
  }, [allIngredientNames, ingredientFilterInput, selectedIngredientFilters]);

  const filteredDishes = useMemo(() => {
    return dishes.filter(dish => {
      const matchesSearch =
        !searchText.trim() ||
        dish.name.includes(searchText.trim()) ||
        dish.tags.some(tag => tag.includes(searchText.trim())) ||
        dish.ingredients.some(ingredient => ingredient.name.includes(searchText.trim()));

      const matchesDifficulty = difficultyFilter === 'all' || dish.difficulty === difficultyFilter;
      const matchesTag =
        selectedTagFilters.length === 0 ||
        selectedTagFilters.some(tag => dish.tags.includes(tag));
      const matchesIngredient =
        selectedIngredientFilters.length === 0 ||
        selectedIngredientFilters.some(ingredientName =>
          dish.ingredients.some(ingredient => ingredient.name === ingredientName)
        );

      return matchesSearch && matchesDifficulty && matchesTag && matchesIngredient;
    });
  }, [dishes, searchText, difficultyFilter, selectedTagFilters, selectedIngredientFilters]);

  const toggleTagFilter = (tag: string) => {
    setSelectedTagFilters(current => {
      if (current.includes(tag)) {
        return current.filter(item => item !== tag);
      }

      return [...current, tag];
    });
  };

  const toggleIngredientFilter = (ingredientName: string) => {
    setSelectedIngredientFilters(current => {
      if (current.includes(ingredientName)) {
        return current.filter(item => item !== ingredientName);
      }

      return [...current, ingredientName];
    });
    setIngredientFilterInput('');
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个菜谱吗？')) {
      deleteDish(id);
      loadDishes();
    }
  };

  const handleGenerateWithAI = async () => {
    if (!newDish.name) {
      alert('请先输入菜名');
      return;
    }

    setIsGenerating(true);
    try {
      const hints = ingredientHintText
        .split(/[，,、]/)
        .map(item => item.trim())
        .filter(Boolean);
      const generatedDish = await aiService.generateDishFromName(newDish.name, true, hints);
      setNewDish({
        ...generatedDish,
      });
    } catch (error) {
      console.error('AI生成菜谱失败:', error);
      alert('AI生成失败，请手动填写或稍后再试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    const dishToSave: Dish = {
      id: editingDish?.id || `manual_${Date.now()}`,
      name: newDish.name || '',
      ingredients: (newDish.ingredients || []).filter(ingredient => ingredient.name.trim()),
      instructions: (newDish.instructions || []).map(step => step.trim()).filter(Boolean),
      nutrition: newDish.nutrition || defaultNutrition,
      tags: Array.from(new Set((newDish.tags || []).map(tag => tag.trim()).filter(Boolean))),
      category: newDish.category || 'dinner',
      difficulty: newDish.difficulty || 'medium',
      timeNeeded: Number(newDish.timeNeeded) || 30,
      isCompleteMeal: newDish.isCompleteMeal,
      recommendationScore: editingDish?.recommendationScore ?? 50,
      addedFrom: editingDish ? editingDish.addedFrom : 'manual',
      addedDate: editingDish ? editingDish.addedDate : new Date().toISOString().split('T')[0],
      isUserInput: editingDish?.isUserInput ?? false,
      imageUrl: editingDish?.imageUrl,
      lastRecommendedDate: editingDish?.lastRecommendedDate,
      isFavorite: editingDish?.isFavorite,
    };

    if (!dishToSave.name) {
      alert('菜名不能为空');
      return;
    }

    if (dishToSave.ingredients.length === 0) {
      alert('请至少填写一种食材');
      return;
    }

    if (dishToSave.instructions.length === 0) {
      alert('请至少填写一步教程');
      return;
    }

    if (editingDish) {
      updateDish(editingDish.id, dishToSave);
    } else {
      addDish(dishToSave);
    }

    setShowAddModal(false);
    setEditingDish(null);
    resetForm();
    loadDishes();
  };

  const resetForm = () => {
    setNewDish(createEmptyDishForm());
    setIngredientHintText('');
    setTagInput('');
  };

  const openAddModal = () => {
    setEditingDish(null);
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (dish: Dish) => {
    setEditingDish(dish);
    setNewDish({
      ...dish,
      ingredients: dish.ingredients.map(ingredient => ({ ...ingredient })),
      instructions: [...dish.instructions],
      tags: [...dish.tags],
    });
    setIngredientHintText('');
    setTagInput('');
    setShowAddModal(true);
  };

  const toggleTag = (tag: string) => {
    const currentTags = newDish.tags || [];
    if (currentTags.includes(tag)) {
      setNewDish({ ...newDish, tags: currentTags.filter(item => item !== tag) });
      return;
    }
    setNewDish({ ...newDish, tags: [...currentTags, tag] });
  };

  const addCustomTag = () => {
    const value = tagInput.trim();
    if (!value) return;
    if (!(newDish.tags || []).includes(value)) {
      setNewDish({ ...newDish, tags: [...(newDish.tags || []), value] });
    }
    setTagInput('');
  };

  const removeTagGlobally = (tag: string) => {
    if (!confirm(`确定要彻底删除标签“${tag}”吗？删除后，所有带这个标签的菜谱都会同步去掉该标签。`)) {
      return;
    }

    dishes
      .filter(dish => dish.tags.includes(tag))
      .forEach(dish => {
        updateDish(dish.id, {
          tags: dish.tags.filter(item => item !== tag),
        });
      });

    setSelectedTagFilters(current => current.filter(item => item !== tag));
    setNewDish(current => ({
      ...current,
      tags: (current.tags || []).filter(item => item !== tag),
    }));
    loadDishes();
  };

  const removeTag = (tag: string) => {
    setNewDish({ ...newDish, tags: (newDish.tags || []).filter(item => item !== tag) });
  };

  const updateIngredientField = (index: number, field: keyof Ingredient, value: string) => {
    const nextIngredients = [...(newDish.ingredients || [])];
    nextIngredients[index] = {
      ...nextIngredients[index],
      [field]: value,
    };
    setNewDish({ ...newDish, ingredients: nextIngredients });
  };

  const addIngredientRow = () => {
    setNewDish({
      ...newDish,
      ingredients: [...(newDish.ingredients || []), createEmptyIngredient()],
    });
  };

  const removeIngredientRow = (index: number) => {
    setNewDish({
      ...newDish,
      ingredients: (newDish.ingredients || []).filter((_, currentIndex) => currentIndex !== index),
    });
  };

  const updateInstruction = (index: number, value: string) => {
    const nextInstructions = [...(newDish.instructions || [])];
    nextInstructions[index] = value;
    setNewDish({ ...newDish, instructions: nextInstructions });
  };

  const addInstructionRow = () => {
    setNewDish({
      ...newDish,
      instructions: [...(newDish.instructions || []), ''],
    });
  };

  const removeInstructionRow = (index: number) => {
    setNewDish({
      ...newDish,
      instructions: (newDish.instructions || []).filter((_, currentIndex) => currentIndex !== index),
    });
  };

  const sendLibraryChat = async () => {
    const input = chatInput.trim();
    if (!input) return;

    const nextUserMessage: ChatMessage = { role: 'user', content: input };
    setChatMessages(prev => [...prev, nextUserMessage]);
    setChatInput('');
    setIsChatting(true);

    try {
      const context = [
        '你正在协助用户优化本地菜谱库。',
        `当前菜谱总数：${dishes.length}。`,
        `现有标签：${allTags.slice(0, 20).join('、') || '暂无'}。`,
        `当前搜索结果中的示例菜谱：${filteredDishes.slice(0, 10).map(dish => dish.name).join('、') || '暂无'}。`,
        '请围绕菜谱结构、食材、教程、标签、分类、营养信息给出简洁可执行建议；如果用户要求修改方案，优先给出具体改法。',
      ].join('\n');

      const response = await aiService.chat(`${context}\n\n用户问题：${input}`, chatMessages);
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: error instanceof Error ? error.message : '抱歉，刚刚和 AI 沟通失败了。',
        },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const getRecommendationColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getDifficultyBadge = (diff: string) => {
    const colors = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800',
    };
    const labels = { easy: '简单', medium: '中等', hard: '困难' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${colors[diff as keyof typeof colors]}`}>
        {labels[diff as keyof typeof labels]}
      </span>
    );
  };

  const getSourceBadge = (source: string) => {
    const configs = {
      manual: { color: 'bg-purple-100 text-purple-800', label: '手动添加', icon: <Edit2 size={12} /> },
      image: { color: 'bg-blue-100 text-blue-800', label: '图片识别', icon: <Flame size={12} /> },
      ai: { color: 'bg-cyan-100 text-cyan-800', label: 'AI生成', icon: <Star size={12} /> },
      preset: { color: 'bg-gray-100 text-gray-800', label: '预设', icon: <CheckCircle size={12} /> },
    };
    const cfg = configs[source as keyof typeof configs] || configs.manual;
    return (
      <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${cfg.color}`}>
        {cfg.icon} {cfg.label}
      </span>
    );
  };

  return (
    <div className="p-4">
      <div className="mb-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-800">📚 我的菜谱库</h2>
          <p className="text-sm text-gray-500 mt-1">支持检索、筛选、折叠查看食材和教程，也可以直接在这里编辑标签。</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowAiChat(true)}
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-[#e9c56b] bg-[#fff1c9] px-4 py-3 text-[#8c5a2b] font-semibold whitespace-nowrap"
          >
            <MessageSquare size={18} />
            AI对话
          </button>
          <button
            onClick={openAddModal}
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 text-white font-semibold whitespace-nowrap shadow-lg transition-all hover:from-green-600 hover:to-emerald-600"
          >
            <Plus size={20} />
            添加菜谱
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索菜名、标签或食材"
              className="w-full rounded-2xl border border-gray-200 py-3 pl-10 pr-4"
            />
          </div>
          <div className="grid gap-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <Filter size={16} className="text-gray-400" />
                难度筛选
              </div>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value as 'all' | Dish['difficulty'])}
                className="w-full appearance-none rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-10"
              >
                <option value="all">全部难度</option>
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-[#fffdf8] p-3">
              <button
                type="button"
                onClick={() => setShowTagFilterPanel(current => !current)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Tag size={16} className="text-gray-400" />
                    标签筛选
                  </div>
                  <div className="mt-1 text-xs leading-5 text-gray-500">
                    {selectedTagFilters.length > 0
                      ? `已选 ${selectedTagFilters.length} 个：${selectedTagFilters.join('、')}`
                      : '未选择标签，点击展开后可多选'}
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-500 shadow-sm">
                  <ChevronDown
                    size={18}
                    className={`transition-transform ${showTagFilterPanel ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>
              {selectedTagFilters.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedTagFilters.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTagFilter(tag)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#f4b596] bg-[#ffe9dc] px-3 py-1 text-xs text-[#8f4628]"
                    >
                      #{tag}
                      <X size={12} />
                    </button>
                  ))}
                </div>
              )}
              {showTagFilterPanel && (
                <div className="mt-3 rounded-2xl border border-dashed border-[#f1dcc7] bg-white/80 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    {selectedTagFilters.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedTagFilters([])}
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                      >
                        清空
                      </button>
                    )}
                  </div>
                  <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
                    {allTags.map(tag => {
                      const active = selectedTagFilters.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTagFilter(tag)}
                          className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                            active
                              ? 'border-[#f4b596] bg-[#ffe1d2] text-[#8f4628]'
                              : 'border-gray-200 bg-white text-gray-600'
                          }`}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                    {allTags.length === 0 && (
                      <div className="text-sm text-gray-400">当前还没有可用标签</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-gray-200 bg-[#f8fff9] p-3">
              <button
                type="button"
                onClick={() => setShowIngredientFilterPanel(current => !current)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Carrot size={16} className="text-gray-400" />
                    食材筛选
                  </div>
                  <div className="mt-1 text-xs leading-5 text-gray-500">
                    {selectedIngredientFilters.length > 0
                      ? `已选 ${selectedIngredientFilters.length} 个：${selectedIngredientFilters.join('、')}`
                      : '输入食材关键词后，从下方匹配结果里选择'}
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-500 shadow-sm">
                  <ChevronDown
                    size={18}
                    className={`transition-transform ${showIngredientFilterPanel ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>
              {selectedIngredientFilters.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedIngredientFilters.map(ingredientName => (
                    <button
                      key={ingredientName}
                      type="button"
                      onClick={() => toggleIngredientFilter(ingredientName)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#b7ddb5] bg-[#e7f8e6] px-3 py-1 text-xs text-[#2d6d3f]"
                    >
                      {ingredientName}
                      <X size={12} />
                    </button>
                  ))}
                </div>
              )}
              {showIngredientFilterPanel && (
                <div className="mt-3 rounded-2xl border border-dashed border-[#d9ecd6] bg-white/80 p-3">
                  <div className="mb-3 space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={ingredientFilterInput}
                        onChange={(e) => setIngredientFilterInput(e.target.value)}
                        placeholder="输入食材关键词，例如：豆、鸡、番茄"
                        className="w-full rounded-2xl border border-[#cfe5cc] bg-white px-4 py-3 pr-10 text-sm text-gray-700 outline-none transition focus:border-[#84b97f]"
                      />
                      {ingredientFilterInput && (
                        <button
                          type="button"
                          onClick={() => setIngredientFilterInput('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-3">
                    {selectedIngredientFilters.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIngredientFilters([]);
                          setIngredientFilterInput('');
                        }}
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                      >
                        清空
                      </button>
                    )}
                  </div>
                  </div>
                  <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
                    {ingredientSuggestions.map(ingredientName => {
                      const active = selectedIngredientFilters.includes(ingredientName);
                      return (
                        <button
                          key={ingredientName}
                          type="button"
                          onClick={() => toggleIngredientFilter(ingredientName)}
                          className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                            active
                              ? 'border-[#b7ddb5] bg-[#e7f8e6] text-[#2d6d3f]'
                              : 'border-gray-200 bg-white text-gray-600'
                          }`}
                        >
                          {ingredientName}
                        </button>
                      );
                    })}
                    {allIngredientNames.length === 0 && (
                      <div className="text-sm text-gray-400">当前还没有可用食材</div>
                    )}
                    {allIngredientNames.length > 0 && ingredientSuggestions.length === 0 && (
                      <div className="text-sm text-gray-400">没有找到匹配食材，换个关键词试试</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="pt-4 text-sm text-gray-500">
          共 {dishes.length} 道菜，当前显示 {filteredDishes.length} 道
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDishes.map((dish) => (
          <div key={dish.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3 gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{dish.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {getDifficultyBadge(dish.difficulty)}
                  {getSourceBadge(dish.addedFrom)}
                  {dish.isCompleteMeal && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center gap-1">
                      <CheckCircle size={12} /> 完整一餐
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${getRecommendationColor(dish.recommendationScore)}`}>
                    <Award size={12} />
                    推荐度 {dish.recommendationScore}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(dish)}
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                  title="编辑菜谱"
                >
                  <Edit2 size={16} />
                </button>
                {dish.addedFrom !== 'preset' && (
                  <button
                    onClick={() => handleDelete(dish.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    title="删除菜谱"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3 text-center text-xs">
              <div className="bg-orange-50 p-2 rounded-lg">
                <div className="font-bold text-orange-600">{dish.nutrition.calories}</div>
                <div className="text-gray-500">卡路里</div>
              </div>
              <div className="bg-red-50 p-2 rounded-lg">
                <div className="font-bold text-red-600">{dish.nutrition.protein}g</div>
                <div className="text-gray-500">蛋白质</div>
              </div>
              <div className="bg-yellow-50 p-2 rounded-lg">
                <div className="font-bold text-yellow-600">{dish.nutrition.carbs}g</div>
                <div className="text-gray-500">碳水</div>
              </div>
              <div className="bg-blue-50 p-2 rounded-lg">
                <div className="font-bold text-blue-600">{dish.nutrition.fat}g</div>
                <div className="text-gray-500">脂肪</div>
              </div>
            </div>

            {dish.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {dish.tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              <span className="flex items-center gap-1">
                <Clock size={14} /> {dish.timeNeeded}分钟
              </span>
            </div>

            <div className="space-y-2 border-t border-dashed border-gray-200 pt-3">
              <details className="group rounded-xl border border-[#e8e0d6] bg-[#fffdf8] px-3 py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-[#5d4a3a]">
                  <span className="flex items-center gap-2">
                    <Carrot size={16} />
                    食材
                  </span>
                  <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  {dish.ingredients.map((ingredient, index) => (
                    <div key={`${ingredient.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                      <span>{ingredient.name}</span>
                      <span className="text-gray-500">
                        {ingredient.quantity}
                        {ingredient.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </details>

              <details className="group rounded-xl border border-[#e8e0d6] bg-[#fffdf8] px-3 py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-[#5d4a3a]">
                  <span className="flex items-center gap-2">
                    <BookOpen size={16} />
                    教程
                  </span>
                  <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  {dish.instructions.map((step, index) => (
                    <div key={`${dish.id}-step-${index}`} className="rounded-lg bg-white px-3 py-2">
                      <span className="font-semibold text-[#8c5a2b]">步骤 {index + 1}：</span>
                      {step}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingDish ? '编辑菜谱' : '添加新菜谱'}
            </h3>

            <div className="space-y-5">
              {!editingDish && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-blue-700 text-sm">
                    输入菜名后点击“AI生成”，系统会把食材、教程步骤、营养和标签一起补全好，你再按需要微调。
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">菜名 *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDish.name || ''}
                    onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
                    placeholder="例如：宫保鸡丁、番茄炒蛋"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  {!editingDish && (
                    <button
                      onClick={handleGenerateWithAI}
                      disabled={isGenerating || !newDish.name}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          AI生成
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {!editingDish && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">食材提示（可选）</label>
                  <input
                    type="text"
                    value={ingredientHintText}
                    onChange={(e) => setIngredientHintText(e.target.value)}
                    placeholder="例如：鸡胸肉、南瓜、西兰花"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">这里只填你希望优先出现的食材，AI 会补全详细配方和教程。</p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                  <select
                    value={newDish.category || 'dinner'}
                    onChange={(e) => setNewDish({ ...newDish, category: e.target.value as Dish['category'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="breakfast">早餐</option>
                    <option value="lunch">午餐</option>
                    <option value="dinner">晚餐</option>
                    <option value="snack">小食</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">难度</label>
                  <select
                    value={newDish.difficulty || 'medium'}
                    onChange={(e) => setNewDish({ ...newDish, difficulty: e.target.value as Dish['difficulty'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="easy">简单</option>
                    <option value="medium">中等</option>
                    <option value="hard">困难</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">烹饪时间（分钟）</label>
                <input
                  type="number"
                  value={newDish.timeNeeded || 30}
                  onChange={(e) => setNewDish({ ...newDish, timeNeeded: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isCompleteMeal"
                  checked={newDish.isCompleteMeal || false}
                  onChange={(e) => setNewDish({ ...newDish, isCompleteMeal: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isCompleteMeal" className="text-sm text-gray-700">
                  这是完整一餐（如煲仔饭、炒饭等，不需要再额外配菜）
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">卡路里</label>
                  <input
                    type="number"
                    value={newDish.nutrition?.calories || 0}
                    onChange={(e) => setNewDish({
                      ...newDish,
                      nutrition: { ...(newDish.nutrition || defaultNutrition), calories: Number(e.target.value) || 0 },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">蛋白质(g)</label>
                  <input
                    type="number"
                    value={newDish.nutrition?.protein || 0}
                    onChange={(e) => setNewDish({
                      ...newDish,
                      nutrition: { ...(newDish.nutrition || defaultNutrition), protein: Number(e.target.value) || 0 },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">碳水(g)</label>
                  <input
                    type="number"
                    value={newDish.nutrition?.carbs || 0}
                    onChange={(e) => setNewDish({
                      ...newDish,
                      nutrition: { ...(newDish.nutrition || defaultNutrition), carbs: Number(e.target.value) || 0 },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">脂肪(g)</label>
                  <input
                    type="number"
                    value={newDish.nutrition?.fat || 0}
                    onChange={(e) => setNewDish({
                      ...newDish,
                      nutrition: { ...(newDish.nutrition || defaultNutrition), fat: Number(e.target.value) || 0 },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">食材</h4>
                  <button
                    onClick={addIngredientRow}
                    className="text-sm px-3 py-1.5 rounded-lg bg-green-50 text-green-700"
                  >
                    + 添加食材
                  </button>
                </div>
                <div className="space-y-3">
                  {(newDish.ingredients || []).map((ingredient, index) => (
                    <div key={`ingredient-${index}`} className="grid gap-2 sm:grid-cols-2 md:grid-cols-[1.2fr_0.8fr_0.7fr_0.9fr_auto]">
                      <input
                        type="text"
                        value={ingredient.name}
                        onChange={(e) => updateIngredientField(index, 'name', e.target.value)}
                        placeholder="食材名"
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredientField(index, 'quantity', e.target.value)}
                        placeholder="数量"
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={ingredient.unit}
                        onChange={(e) => updateIngredientField(index, 'unit', e.target.value)}
                        placeholder="单位"
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <select
                        value={ingredient.category}
                        onChange={(e) => updateIngredientField(index, 'category', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="vegetable">蔬菜</option>
                        <option value="meat">肉类</option>
                        <option value="seasoning">调料</option>
                        <option value="grain">主食</option>
                        <option value="fruit">水果</option>
                        <option value="other">其他</option>
                      </select>
                      <button
                        onClick={() => removeIngredientRow(index)}
                        className="justify-self-end sm:col-span-2 md:col-span-1 p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        title="删除食材"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {(newDish.ingredients || []).length === 0 && (
                    <div className="text-sm text-gray-500">还没有食材，点击右上角添加。</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">教程步骤</h4>
                  <button
                    onClick={addInstructionRow}
                    className="text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700"
                  >
                    + 添加步骤
                  </button>
                </div>
                <div className="space-y-3">
                  {(newDish.instructions || []).map((instruction, index) => (
                    <div key={`instruction-${index}`} className="flex gap-2 items-start">
                      <div className="w-8 h-8 rounded-full bg-[#fff1c9] text-[#8c5a2b] flex items-center justify-center text-sm font-semibold mt-1">
                        {index + 1}
                      </div>
                      <textarea
                        value={instruction}
                        onChange={(e) => updateInstruction(index, e.target.value)}
                        rows={2}
                        placeholder="输入该步骤的具体做法"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <button
                        onClick={() => removeInstructionRow(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        title="删除步骤"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {(newDish.instructions || []).length === 0 && (
                    <div className="text-sm text-gray-500">还没有教程步骤，点击右上角添加。</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="font-semibold text-gray-800">标签管理</h4>
                    <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomTag();
                        }
                      }}
                      placeholder="新增标签"
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <button
                      onClick={addCustomTag}
                      className="px-3 py-2 rounded-lg bg-[#fff1c9] text-[#8c5a2b]"
                    >
                      添加
                    </button>
                  </div>
                </div>

                {(newDish.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(newDish.tags || []).map(tag => (
                      <button
                        key={tag}
                        onClick={() => removeTag(tag)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm"
                      >
                        #{tag}
                        <X size={12} />
                      </button>
                    ))}
                  </div>
                )}

                    <div className="mb-4">
                    <div className="mb-2 text-sm font-medium text-gray-700">现有标签</div>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map(tag => (
                        <div key={`global-${tag}`} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700">
                          <button
                            onClick={() => toggleTag(tag)}
                            className={`rounded-full px-1 ${
                              (newDish.tags || []).includes(tag) ? 'text-[#b85c3d]' : 'text-gray-500'
                            }`}
                            title={(newDish.tags || []).includes(tag) ? '取消当前菜谱标签' : '添加到当前菜谱'}
                          >
                            #{tag}
                          </button>
                          <button
                            onClick={() => removeTagGlobally(tag)}
                            className="rounded-full p-0.5 text-red-500 hover:bg-red-50"
                            title="从所有菜谱中删除这个标签"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    点左边标签名可给当前菜谱勾选/取消，点右侧垃圾桶会把这个标签从整个菜谱库中彻底移除。
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingDish(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!newDish.name}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAiChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-800">菜谱库 AI 对话</h3>
                <p className="text-sm text-gray-500">可以直接问：哪道菜食材结构不合理、哪些标签该统一、教程哪里还需要补。</p>
              </div>
              <button
                onClick={() => setShowAiChat(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-[#fffdf8]">
              {chatMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                    message.role === 'user'
                      ? 'ml-auto bg-[#ffe1d2] text-[#6a3b24]'
                      : 'bg-white border border-gray-200 text-gray-700'
                  }`}
                >
                  {message.content}
                </div>
              ))}
              {isChatting && (
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-white border border-gray-200 text-gray-500">
                  AI 正在整理建议...
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 p-4">
              <div className="flex gap-2">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  rows={2}
                  placeholder="例如：帮我看看高蛋白标签是不是有遗漏；糖醋排骨的教程步骤能不能更细一点？"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-xl"
                />
                <button
                  onClick={sendLibraryChat}
                  disabled={isChatting || !chatInput.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl disabled:opacity-50 flex items-center gap-2"
                >
                  <Send size={16} />
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
