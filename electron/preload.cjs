const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('recipeAppStorage', {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
});
