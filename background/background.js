/**
 * Toby Background Service Worker
 * 处理后台任务、右键菜单等
 */

// 监听插件安装
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // 初始化存储
    await initStorage();
    // 创建右键菜单
    createContextMenus();
  }
});

// 初始化存储
async function initStorage() {
  await chrome.storage.local.set({
    toby_favorites: [],
    toby_history: [],
    toby_settings: {
      theme: 'light',
      autoGroup: false,
      maxHistory: 500
    }
  });
}

// 创建右键菜单
function createContextMenus() {
  // 收藏当前页面
  chrome.contextMenus.create({
    id: 'toby-favorite-page',
    title: '收藏此页面',
    contexts: ['page']
  });

  // 收藏选中文本
  chrome.contextMenus.create({
    id: 'toby-favorite-selection',
    title: '收藏选中内容',
    contexts: ['selection']
  });

  // 整理标签页
  chrome.contextMenus.create({
    id: 'toby-organize-tabs',
    title: '整理所有标签页',
    contexts: ['page']
  });
}

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'toby-favorite-page':
      await favoritePage(tab);
      break;
    case 'toby-favorite-selection':
      await favoriteSelection(info, tab);
      break;
    case 'toby-organize-tabs':
      await organizeAllTabs();
      break;
  }
});

// 收藏当前页面
async function favoritePage(tab) {
  const favorites = await getFavorites();
  const favorite = {
    id: Date.now().toString(),
    url: tab.url,
    title: tab.title,
    favicon: tab.favIconUrl || '',
    domain: new URL(tab.url).hostname,
    createdAt: new Date().toISOString(),
    tags: [],
    note: ''
  };

  // 检查是否已收藏
  if (favorites.some(f => f.url === tab.url)) {
    showNotification('该页面已在收藏中');
    return;
  }

  favorites.unshift(favorite);
  await chrome.storage.local.set({ toby_favorites: favorites });
  showNotification('已添加到收藏');
}

// 收藏选中文本
async function favoriteSelection(info, tab) {
  const favorites = await getFavorites();

  const favorite = {
    id: Date.now().toString(),
    url: tab.url,
    title: info.selectionText.substring(0, 100),
    favicon: tab.favIconUrl || '',
    domain: new URL(tab.url).hostname,
    createdAt: new Date().toISOString(),
    tags: [],
    note: `选自: ${tab.title}`
  };

  favorites.unshift(favorite);
  await chrome.storage.local.set({ toby_favorites: favorites });
  showNotification('已收藏选中内容');
}

// 整理所有标签页
async function organizeAllTabs() {
  const tabs = await chrome.tabs.query({});
  const groups = {};

  tabs.forEach(tab => {
    try {
      const domain = new URL(tab.url).hostname.replace('www.', '');
      if (!groups[domain]) {
        groups[domain] = [];
      }
      groups[domain].push(tab.id);
    } catch (e) {
      // 忽略无效URL
    }
  });

  // 为每个域名创建标签组
  for (const domain in groups) {
    if (groups[domain].length > 1) {
      try {
        const groupId = await chrome.tabs.group({ tabIds: groups[domain] });
        await chrome.tabGroups.update(groupId, { title: domain, color: getGroupColor(domain) });
      } catch (e) {
        console.error('创建标签组失败:', e);
      }
    }
  }
}

// 获取标签组颜色
function getGroupColor(domain) {
  const colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan'];
  const hash = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// 获取收藏列表
async function getFavorites() {
  const result = await chrome.storage.local.get('toby_favorites');
  return result.toby_favorites || [];
}

// 显示通知
function showNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    title: 'Toby',
    message: message
  });
}

// 监听标签更新，记录历史
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    await addToHistory(tab);
  }
});

// 添加到历史记录
async function addToHistory(tab) {
  const history = await getHistory();

  // 避免重复
  const filtered = history.filter(h => h.url !== tab.url);

  const item = {
    id: Date.now().toString(),
    url: tab.url,
    title: tab.title,
    favicon: tab.favIconUrl || '',
    domain: new URL(tab.url).hostname,
    visitedAt: new Date().toISOString()
  };

  filtered.unshift(item);

  // 限制历史记录数量
  const settings = await getSettings();
  const limited = filtered.slice(0, settings.maxHistory || 500);

  await chrome.storage.local.set({ toby_history: limited });
}

// 获取历史记录
async function getHistory() {
  const result = await chrome.storage.local.get('toby_history');
  return result.toby_history || [];
}

// 获取设置
async function getSettings() {
  const result = await chrome.storage.local.get('toby_settings');
  return result.toby_settings || { maxHistory: 500 };
}

// 监听键盘快捷键
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-popup') {
    // 打开弹窗
    const popup = chrome.runtime.getManifest().action.default_popup;
    // 这是一个占位实现，实际的popup toggle需要用户点击图标
  }
});

console.log('Toby background script loaded');
