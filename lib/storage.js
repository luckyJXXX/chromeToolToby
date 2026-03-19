/**
 * Toby 存储工具类
 * 使用 chrome.storage.local 进行本地数据存储
 */

const Storage = {
  KEYS: {
    FAVORITES: 'toby_favorites',
    HISTORY: 'toby_history',
    SETTINGS: 'toby_settings',
    TABS_CACHE: 'toby_tabs_cache'
  },

  /**
   * 获取存储数据
   */
  async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key]);
      });
    });
  },

  /**
   * 设置存储数据
   */
  async set(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  },

  /**
   * 删除存储数据
   */
  async remove(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => {
        resolve();
      });
    });
  },

  // ========== 收藏模块 ==========

  /**
   * 获取所有收藏
   */
  async getFavorites() {
    const favorites = await this.get(this.KEYS.FAVORITES);
    return favorites || [];
  },

  /**
   * 添加收藏
   */
  async addFavorite(tab) {
    const favorites = await this.getFavorites();
    const favorite = {
      id: Date.now().toString(),
      url: tab.url,
      title: tab.title,
      favicon: tab.favIconUrl || '',
      domain: new URL(tab.url).hostname,
      createdAt: new Date().toISOString(),
      tags: []
    };
    favorites.unshift(favorite);
    await this.set(this.KEYS.FAVORITES, favorites);
    return favorite;
  },

  /**
   * 删除收藏
   */
  async removeFavorite(id) {
    const favorites = await this.getFavorites();
    const filtered = favorites.filter(f => f.id !== id);
    await this.set(this.KEYS.FAVORITES, filtered);
  },

  /**
   * 更新收藏
   */
  async updateFavorite(id, data) {
    const favorites = await this.getFavorites();
    const index = favorites.findIndex(f => f.id === id);
    if (index !== -1) {
      favorites[index] = { ...favorites[index], ...data };
      await this.set(this.KEYS.FAVORITES, favorites);
    }
  },

  // ========== 历史记录模块 ==========

  /**
   * 获取历史记录
   */
  async getHistory() {
    const history = await this.get(this.KEYS.HISTORY);
    return history || [];
  },

  /**
   * 添加到历史记录
   */
  async addToHistory(tab) {
    const history = await this.getHistory();
    const item = {
      id: Date.now().toString(),
      url: tab.url,
      title: tab.title,
      favicon: tab.favIconUrl || '',
      domain: new URL(tab.url).hostname,
      visitedAt: new Date().toISOString()
    };
    // 避免重复添加相同URL（保留最新的）
    const filtered = history.filter(h => h.url !== tab.url);
    filtered.unshift(item);
    // 限制历史记录数量
    const limited = filtered.slice(0, 500);
    await this.set(this.KEYS.HISTORY, limited);
    return item;
  },

  /**
   * 清空历史记录
   */
  async clearHistory() {
    await this.set(this.KEYS.HISTORY, []);
  },

  // ========== 数据管理模块 ==========

  /**
   * 导出所有数据
   */
  async exportData() {
    const data = {
      favorites: await this.getFavorites(),
      history: await this.getHistory(),
      settings: await this.get(this.KEYS.SETTINGS),
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    return JSON.stringify(data, null, 2);
  },

  /**
   * 导入数据
   */
  async importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.favorites) {
        await this.set(this.KEYS.FAVORITES, data.favorites);
      }
      if (data.history) {
        await this.set(this.KEYS.HISTORY, data.history);
      }
      if (data.settings) {
        await this.set(this.KEYS.SETTINGS, data.settings);
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * 清空所有数据
   */
  async clearAllData() {
    await this.set(this.KEYS.FAVORITES, []);
    await this.set(this.KEYS.HISTORY, []);
  },

  // ========== 设置模块 ==========

  /**
   * 获取设置
   */
  async getSettings() {
    const settings = await this.get(this.KEYS.SETTINGS);
    return settings || {
      theme: 'light',
      autoGroup: false,
      maxHistory: 500
    };
  },

  /**
   * 更新设置
   */
  async updateSettings(newSettings) {
    const settings = await this.getSettings();
    await this.set(this.KEYS.SETTINGS, { ...settings, ...newSettings });
  }
};

// 导出到全局
window.Storage = Storage;
