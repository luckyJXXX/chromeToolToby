import { ChromeTab, ChromeWindow } from '../types';

// 获取所有窗口和标签页
export async function getAllWindows(): Promise<ChromeWindow[]> {
  return new Promise((resolve) => {
    chrome.windows.getAll({ populate: true }, (windows) => {
      const result: ChromeWindow[] = windows
        .filter(w => w.type === 'normal' && w.id !== undefined)
        .map(w => ({
          id: w.id!,
          focused: w.focused,
          incognito: w.incognito,
          type: w.type as 'normal' | 'popup' | 'devtools',
          tabs: (w.tabs || []).map(t => ({
            id: t.id!,
            windowId: w.id!,
            title: t.title || '无标题',
            url: t.url || '',
            favIconUrl: t.favIconUrl,
            pinned: t.pinned,
            active: t.active
          }))
        }));
      resolve(result);
    });
  });
}

// 获取当前窗口的标签页
export async function getCurrentWindowTabs(): Promise<ChromeTab[]> {
  return new Promise((resolve) => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      resolve(tabs.map(t => ({
        id: t.id!,
        windowId: t.windowId!,
        title: t.title || '无标题',
        url: t.url || '',
        favIconUrl: t.favIconUrl,
        pinned: t.pinned,
        active: t.active
      })));
    });
  });
}

// 关闭指定标签页
export async function closeTab(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    chrome.tabs.remove(tabId, resolve);
  });
}

// 批量打开多个 URL
export async function openUrls(urls: string[]): Promise<void> {
  for (const url of urls) {
    await chrome.tabs.create({ url, active: false });
  }
}

// 创建新标签页
export async function createTab(url: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.tabs.create({ url }, () => resolve());
  });
}

// 获取标签页信息
export async function getTab(tabId: number): Promise<ChromeTab | null> {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        resolve(null);
        return;
      }
      resolve({
        id: tab.id!,
        windowId: tab.windowId!,
        title: tab.title || '无标题',
        url: tab.url || '',
        favIconUrl: tab.favIconUrl,
        pinned: tab.pinned,
        active: tab.active
      });
    });
  });
}
