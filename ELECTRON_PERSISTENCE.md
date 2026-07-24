# Electron Persistence Plan

当前 Web 版已经把配置、菜谱库和页面关键状态统一收口到 `src/utils/storage.ts`。

## 现在已经持久化的内容

- AI 配置
- 本地菜谱库
- 推荐度和最近推荐时间
- 上传识别得到的用户菜谱
- 输入中的目标食材、目标菜名
- 已生成的周菜单
- 采购清单与勾选状态
- AI 聊天记录

## Electron 接入方式

未来接入 Electron 时，不需要再改业务层代码，只需要在 preload 暴露一个同步存储桥：

```ts
contextBridge.exposeInMainWorld('recipeAppStorage', {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
});
```

推荐使用 `electron-store` 或基于 `app.getPath('userData')` 的 JSON 文件存储，让每个安装用户都拥有独立且可持续的数据目录。

## 迁移原则

1. 保持 `window.recipeAppStorage` 的 `getItem/setItem/removeItem` 接口不变。
2. 桌面版首次启动时，如果发现旧版 `localStorage` 数据，可做一次迁移到文件存储。
3. 打包后不要把业务数据放在应用安装目录，而是放在用户数据目录，避免升级覆盖。
