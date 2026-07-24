const { contextBridge, shell } = require('electron');

contextBridge.exposeInMainWorld('recipeAppStorage', {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
});

contextBridge.exposeInMainWorld('recipeAppShell', {
  openExternal: (url) => shell.openExternal(url),
});
