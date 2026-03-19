// Toby Background Service Worker
// 处理后台任务

console.log('Toby background script loaded');

// 监听插件安装
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Toby installed');
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // 可以在这里处理标签页加载完成的事件
  }
});

// 监听标签页关闭
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // 可以在这里处理标签页关闭的事件
});

console.log('Toby background service worker ready');
