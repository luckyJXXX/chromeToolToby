/**
 * Toby Popup Script
 * 处理弹窗界面的交互逻辑
 */

document.addEventListener('DOMContentLoaded', init);

let currentTab = 'tabs';
let currentGroup = 'domain';
let allTabs = [];
let allFavorites = [];
let allHistory = [];

// ========== 初始化 ==========

async function init() {
  await loadAllData();
  bindEvents();
  renderCurrentTab();
}

// ========== 数据加载 ==========

async function loadAllData() {
  try {
    allTabs = await getAllTabs();
    allFavorites = await Storage.getFavorites();
    allHistory = await Storage.getHistory();
  } catch (e) {
    console.error('加载数据失败:', e);
  }
}

/**
 * 获取所有标签页
 */
async function getAllTabs() {
  return new Promise((resolve) => {
    chrome.tabs.query({}, (tabs) => {
      resolve(tabs || []);
    });
  });
}

// ========== 事件绑定 ==========

function bindEvents() {
  // 标签切换
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // 分组切换
  document.querySelectorAll('.group-btn').forEach(btn => {
    btn.addEventListener('click', () => switchGroup(btn.dataset.group));
  });

  // 搜索
  document.getElementById('favSearch').addEventListener('input', (e) => {
    renderFavorites(e.target.value);
  });

  // 清空历史
  document.getElementById('clearHistory').addEventListener('click', async () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      await Storage.clearHistory();
      allHistory = [];
      renderHistory();
    }
  });

  // 底部操作按钮
  document.getElementById('organizeBtn').addEventListener('click', organizeTabs);
  document.getElementById('favoriteCurrentBtn').addEventListener('click', favoriteCurrentTab);
  document.getElementById('exportBtn').addEventListener('click', exportData);

  // 设置
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('closeSettings').addEventListener('click', closeSettings);
  document.getElementById('overlay').addEventListener('click', closeSettings);
  document.getElementById('importBtn').addEventListener('click', importData);
  document.getElementById('clearAllBtn').addEventListener('click', clearAllData);
}

// ========== 标签切换 ==========

function switchTab(tabName) {
  currentTab = tabName;

  // 更新标签按钮状态
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // 更新内容显示
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-content`);
  });

  renderCurrentTab();
}

function switchGroup(groupType) {
  currentGroup = groupType;

  document.querySelectorAll('.group-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.group === groupType);
  });

  renderTabs();
}

function renderCurrentTab() {
  switch (currentTab) {
    case 'tabs':
      renderTabs();
      break;
    case 'favorites':
      renderFavorites();
      break;
    case 'history':
      renderHistory();
      break;
  }
}

// ========== 标签页渲染 ==========

function renderTabs() {
  const container = document.getElementById('tabsList');
  const countEl = document.getElementById('tabCount');

  if (!allTabs.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 3v18M3 9h6"/>
        </svg>
        <p>没有打开的标签页</p>
      </div>
    `;
    countEl.textContent = '0 个标签页';
    return;
  }

  countEl.textContent = `${allTabs.length} 个标签页`;

  let html = '';
  if (currentGroup === 'domain') {
    html = renderTabsByDomain();
  } else {
    html = renderTabsByTitle();
  }

  container.innerHTML = html;
  bindTabEvents();
}

function renderTabsByDomain() {
  const groups = {};

  allTabs.forEach(tab => {
    try {
      const domain = new URL(tab.url).hostname.replace('www.', '');
      if (!groups[domain]) {
        groups[domain] = [];
      }
      groups[domain].push(tab);
    } catch (e) {
      // 忽略无效URL
    }
  });

  let html = '';
  const domains = Object.keys(groups).sort();

  domains.forEach(domain => {
    const tabs = groups[domain];
    html += `
      <div class="group-header" data-domain="${domain}">
        <span class="group-name">${domain}</span>
        <span class="group-count">${tabs.length} 个标签</span>
        <button class="close-group" title="关闭该组所有标签">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="group-items" data-domain="${domain}">
        ${tabs.map(tab => createTabItem(tab)).join('')}
      </div>
    `;
  });

  return html;
}

function renderTabsByTitle() {
  // 提取标题关键词进行分组
  const groups = {};

  allTabs.forEach(tab => {
    const title = tab.title || '无标题';
    const keywords = title.split(/[\s\-_|]/).filter(w => w.length > 2);
    const key = keywords[0] || '其他';

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(tab);
  });

  let html = '';
  const keys = Object.keys(groups).sort();

  keys.forEach(key => {
    const tabs = groups[key];
    html += `
      <div class="group-header" data-keyword="${key}">
        <span class="group-name">${key}</span>
        <span class="group-count">${tabs.length} 个标签</span>
        <button class="close-group" title="关闭该组所有标签">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="group-items" data-keyword="${key}">
        ${tabs.map(tab => createTabItem(tab)).join('')}
      </div>
    `;
  });

  return html;
}

function createTabItem(tab) {
  const title = tab.title || '无标题';
  const url = tab.url;
  const favicon = tab.favIconUrl || '';

  return `
    <div class="list-item" data-tab-id="${tab.id}" data-url="${escapeHtml(url)}">
      <div class="favicon">
        ${favicon ? `<img src="${escapeHtml(favicon)}" alt="">` : getFaviconPlaceholder(url)}
      </div>
      <div class="info">
        <div class="title-text">${escapeHtml(title)}</div>
        <div class="meta">${escapeHtml(url)}</div>
      </div>
      <div class="actions">
        <button class="action-icon favorite-btn" title="收藏">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
          </svg>
        </button>
        <button class="action-icon close-btn" title="关闭">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function getFaviconPlaceholder(url) {
  try {
    const domain = new URL(url).hostname;
    return domain.charAt(0).toUpperCase();
  } catch (e) {
    return '?';
  }
}

function bindTabEvents() {
  // 点击打开标签页
  document.querySelectorAll('.list-item[data-tab-id]').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.action-icon')) return;
      const tabId = parseInt(item.dataset.tabId);
      chrome.tabs.update(tabId, { active: true });
      window.close();
    });
  });

  // 关闭标签
  document.querySelectorAll('.list-item .close-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const item = btn.closest('.list-item');
      const tabId = parseInt(item.dataset.tabId);
      await chrome.tabs.remove(tabId);
      allTabs = allTabs.filter(t => t.id !== tabId);
      renderTabs();
    });
  });

  // 收藏标签
  document.querySelectorAll('.list-item .favorite-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const item = btn.closest('.list-item');
      const url = item.dataset.url;
      const tab = allTabs.find(t => t.id === parseInt(item.dataset.tabId));
      if (tab) {
        await Storage.addFavorite(tab);
        allFavorites = await Storage.getFavorites();
        alert('已添加到收藏！');
      }
    });
  });

  // 关闭分组
  document.querySelectorAll('.close-group').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const header = btn.closest('.group-header');
      const domain = header.dataset.domain;
      const keyword = header.dataset.keyword;

      let tabsToClose = [];
      if (domain) {
        tabsToClose = allTabs.filter(tab => {
          try {
            const d = new URL(tab.url).hostname.replace('www.', '');
            return d === domain;
          } catch (e) {
            return false;
          }
        });
      } else if (keyword) {
        tabsToClose = allTabs.filter(tab => {
          const title = tab.title || '';
          return title.includes(keyword);
        });
      }

      if (tabsToClose.length) {
        const tabIds = tabsToClose.map(t => t.id);
        await chrome.tabs.remove(tabIds);
        allTabs = allTabs.filter(t => !tabIds.includes(t.id));
        renderTabs();
      }
    });
  });
}

// ========== 收藏渲染 ==========

function renderFavorites(searchQuery = '') {
  const container = document.getElementById('favoritesList');
  const countEl = document.getElementById('favCount');

  let favorites = allFavorites;

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    favorites = favorites.filter(f =>
      f.title.toLowerCase().includes(query) ||
      f.url.toLowerCase().includes(query)
    );
  }

  countEl.textContent = `${favorites.length} 个收藏`;

  if (!favorites.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
        </svg>
        <p>${searchQuery ? '没有匹配的收藏' : '还没有收藏，快去添加吧'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = favorites.map(fav => createFavoriteItem(fav)).join('');
  bindFavoriteEvents();
}

function createFavoriteItem(fav) {
  return `
    <div class="list-item" data-id="${fav.id}" data-url="${escapeHtml(fav.url)}">
      <div class="favicon">
        ${fav.favicon ? `<img src="${escapeHtml(fav.favicon)}" alt="">` : getFaviconPlaceholder(fav.url)}
      </div>
      <div class="info">
        <div class="title-text">${escapeHtml(fav.title)}</div>
        <div class="meta">${escapeHtml(fav.domain)} · ${formatDate(fav.createdAt)}</div>
      </div>
      <div class="actions">
        <button class="action-icon open-btn" title="打开">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
          </svg>
        </button>
        <button class="action-icon danger delete-btn" title="删除">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function bindFavoriteEvents() {
  document.querySelectorAll('#favoritesList .list-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.action-icon')) return;
      const url = item.dataset.url;
      chrome.tabs.create({ url });
      window.close();
    });
  });

  document.querySelectorAll('#favoritesList .open-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = btn.closest('.list-item').dataset.url;
      chrome.tabs.create({ url });
      window.close();
    });
  });

  document.querySelectorAll('#favoritesList .delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.closest('.list-item').dataset.id;
      await Storage.removeFavorite(id);
      allFavorites = allFavorites.filter(f => f.id !== id);
      renderFavorites(document.getElementById('favSearch').value);
    });
  });
}

// ========== 历史记录渲染 ==========

function renderHistory() {
  const container = document.getElementById('historyList');
  const countEl = document.getElementById('historyCount');

  countEl.textContent = `${allHistory.length} 条记录`;

  if (!allHistory.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <p>暂无历史记录</p>
      </div>
    `;
    return;
  }

  container.innerHTML = allHistory.map(item => createHistoryItem(item)).join('');
  bindHistoryEvents();
}

function createHistoryItem(item) {
  return `
    <div class="list-item" data-url="${escapeHtml(item.url)}">
      <div class="favicon">
        ${item.favicon ? `<img src="${escapeHtml(item.favicon)}" alt="">` : getFaviconPlaceholder(item.url)}
      </div>
      <div class="info">
        <div class="title-text">${escapeHtml(item.title)}</div>
        <div class="meta">${escapeHtml(item.domain)} · ${formatDate(item.visitedAt)}</div>
      </div>
      <div class="actions">
        <button class="action-icon open-btn" title="打开">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function bindHistoryEvents() {
  document.querySelectorAll('#historyList .list-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.action-icon')) return;
      const url = item.dataset.url;
      chrome.tabs.create({ url });
      window.close();
    });
  });

  document.querySelectorAll('#historyList .open-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = btn.closest('.list-item').dataset.url;
      chrome.tabs.create({ url });
      window.close();
    });
  });
}

// ========== 功能函数 ==========

async function organizeTabs() {
  // 按域名创建标签组
  const groups = {};

  allTabs.forEach(tab => {
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

  // 使用 Chrome 标签组功能
  const tabIds = allTabs.map(t => t.id);

  // 先移除所有标签组
  try {
    const groups = await chrome.tabGroups.query({});
    for (const group of groups) {
      await chrome.tabGroups.remove(group.id);
    }
  } catch (e) {
    // 标签组API可能不可用
  }

  // 创建新分组
  for (const domain in groups) {
    if (groups[domain].length > 1) {
      try {
        const groupId = await chrome.tabs.group({ tabIds: groups[domain] });
        await chrome.tabGroups.update(groupId, { title: domain });
      } catch (e) {
        console.error('创建标签组失败:', e);
      }
    }
  }

  window.close();
}

async function favoriteCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    await Storage.addFavorite(tab);
    allFavorites = await Storage.getFavorites();
    alert('已添加到收藏！');
  }
}

async function exportData() {
  const data = await Storage.exportData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `toby-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = await Storage.importData(event.target.result);
      if (result.success) {
        alert('导入成功！');
        allFavorites = await Storage.getFavorites();
        allHistory = await Storage.getHistory();
        closeSettings();
        renderCurrentTab();
      } else {
        alert('导入失败: ' + result.error);
      }
    };
    reader.readAsText(file);
  };

  input.click();
}

async function clearAllData() {
  if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
    await Storage.clearAllData();
    allFavorites = [];
    allHistory = [];
    alert('已清空所有数据');
    closeSettings();
    renderCurrentTab();
  }
}

// ========== 设置面板 ==========

function openSettings() {
  document.getElementById('settingsPanel').classList.add('active');
  document.getElementById('overlay').classList.add('active');
}

function closeSettings() {
  document.getElementById('settingsPanel').classList.remove('active');
  document.getElementById('overlay').classList.remove('active');
}

// ========== 工具函数 ==========

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;

  return date.toLocaleDateString('zh-CN');
}
