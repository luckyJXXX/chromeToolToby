/**
 * Chrome API Service - Chrome 浏览器 API 服务
 * 负责与 Chrome 扩展 API 交互
 */

import { ChromeTab, ChromeWindow } from '../types';

// 获取所有窗口和标签页
export async function getAllWindows(): Promise<ChromeWindow[]> {
  const extensionId = chrome.runtime.id;
  return new Promise((resolve) => {
    chrome.windows.getAll({ populate: true }, (windows) => {
      const result: ChromeWindow[] = windows
        .filter(w => w.type === 'normal' && w.id !== undefined)
        .map(w => ({
          id: w.id!,
          focused: w.focused,
          incognito: w.incognito,
          type: w.type as 'normal' | 'popup' | 'devtools',
          tabs: (w.tabs || [])
            .filter(t => {
              // 排除扩展自己的页面和新标签页
              if (t.url?.startsWith(`chrome-extension://${extensionId}`)) return false;
              if (t.url === 'about:newtab' || t.url === 'chrome://newtab/') return false;
              return true;
            })
            .map(t => ({
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

// 提取页面正文内容（用于 AI 分析）
export async function extractPageContent(tabId: number): Promise<string> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // 移除脚本和样式
        const removeElements = ['script', 'style', 'noscript', 'iframe', 'nav', 'header', 'footer'];
        const clone = document.body.cloneNode(true) as HTMLElement;

        removeElements.forEach(tag => {
          clone.querySelectorAll(tag).forEach(el => el.remove());
        });

        // 获取主要内容区域
        const contentSelectors = [
          'article', 'main', '.content', '#content',
          '.post-content', '.article-content', '.entry-content'
        ];

        let content = '';
        for (const selector of contentSelectors) {
          const element = clone.querySelector(selector);
          if (element) {
            content = element.textContent || '';
            break;
          }
        }

        // 如果没有找到主要内容区域，获取 body 文本
        if (!content) {
          content = clone.textContent || '';
        }

        // 清理空白字符
        content = content.replace(/\s+/g, ' ').trim();

        // 限制内容长度（API 限制）
        return content.substring(0, 8000);
      }
    });

    return results[0]?.result || '';
  } catch (error) {
    console.error('提取页面内容失败:', error);
    return '';
  }
}
