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

// Skills API - 处理来自外部的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { action, payload } = message;

  (async () => {
    try {
      let result;

      switch (action) {
        case 'getSpaces': {
          const spaces = await new Promise((resolve) => {
            chrome.storage.local.get('toby_spaces', (res) => {
              const spaces = res.toby_spaces || [];
              // 添加默认空间
              if (!spaces.find(s => s.id === 'default')) {
                spaces.unshift({
                  id: 'default',
                  name: '我的收藏',
                  isDefault: true,
                  createdAt: Date.now(),
                  updatedAt: Date.now()
                });
              }
              resolve(spaces);
            });
          });
          result = spaces;
          break;
        }

        case 'getCollections': {
          const collections = await new Promise((resolve) => {
            chrome.storage.local.get('toby_collections', (res) => {
              resolve(res.toby_collections || []);
            });
          });
          result = collections;
          break;
        }

        case 'getRecentCards': {
          const spaceId = payload?.spaceId || 'default';
          const limit = payload?.limit || 10;

          const spaces = await new Promise((resolve) => {
            chrome.storage.local.get('toby_spaces', (res) => {
              resolve(res.toby_spaces || []);
            });
          });

          const collections = await new Promise((resolve) => {
            chrome.storage.local.get('toby_collections', (res) => {
              resolve(res.toby_collections || []);
            });
          });

          const space = spaceId === 'all'
            ? { id: 'all', name: '所有空间', createdAt: 0, updatedAt: 0 }
            : spaces.find(s => s.id === spaceId) || null;

          if (!space) {
            result = { space: null, cards: [] };
            break;
          }

          const filteredCollections = spaceId === 'all'
            ? collections
            : collections.filter(c => c.spaceId === spaceId);

          const allCards = filteredCollections
            .flatMap(c => c.cards.map(card => ({
              ...card,
              collectionName: c.name,
              spaceName: space.name
            })))
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            .slice(0, limit);

          result = {
            space,
            cards: allCards.map(card => ({
              url: card.url,
              title: card.title,
              createdAt: card.createdAt
            }))
          };
          break;
        }

        case 'searchCards': {
          const query = payload?.query || '';
          const lowerQuery = query.toLowerCase();

          const spaces = await new Promise((resolve) => {
            chrome.storage.local.get('toby_spaces', (res) => {
              resolve(res.toby_spaces || []);
            });
          });

          const collections = await new Promise((resolve) => {
            chrome.storage.local.get('toby_collections', (res) => {
              resolve(res.toby_collections || []);
            });
          });

          const results = [];

          for (const collection of collections) {
            const space = spaces.find(s => s.id === collection.spaceId);
            const spaceName = space?.name || '未知空间';

            for (const card of collection.cards) {
              if (
                card.title.toLowerCase().includes(lowerQuery) ||
                card.url.toLowerCase().includes(lowerQuery) ||
                (card.description?.toLowerCase().includes(lowerQuery))
              ) {
                results.push({
                  url: card.url,
                  title: card.title,
                  description: card.description,
                  collectionName: collection.name,
                  spaceName
                });
              }
            }
          }

          result = results.slice(0, 50);
          break;
        }

        case 'getSpacesSummary': {
          const spaces = await new Promise((resolve) => {
            chrome.storage.local.get('toby_spaces', (res) => {
              resolve(res.toby_spaces || []);
            });
          });

          const collections = await new Promise((resolve) => {
            chrome.storage.local.get('toby_collections', (res) => {
              resolve(res.toby_collections || []);
            });
          });

          const spacesSummary = spaces.map(space => ({
            id: space.id,
            name: space.name,
            collectionCount: collections.filter(c => c.spaceId === space.id).length
          }));

          const totalCards = collections.reduce((sum, c) => sum + c.cards.length, 0);

          result = { spaces: spacesSummary, totalCards };
          break;
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      sendResponse({ success: true, data: result });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error).message });
    }
  })();

  return true; // 异步响应
});

console.log('Toby background service worker ready');
