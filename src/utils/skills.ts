// Skills API - 为外部 AI 工具提供接口
import { Space, Collection } from '../types';

/**
 * 获取所有空间列表
 */
export async function getSpacesForSkills(): Promise<Space[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get('toby_spaces', (result) => {
      const spaces = result.toby_spaces || [];
      // 添加默认空间
      if (!spaces.find((s: Space) => s.id === 'default')) {
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
}

/**
 * 获取所有集合列表（包含卡片信息）
 */
export async function getCollectionsForSkills(): Promise<Collection[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get('toby_collections', (result) => {
      resolve(result.toby_collections || []);
    });
  });
}

/**
 * 获取指定空间的最近收藏
 * @param spaceId 空间ID
 * @param limit 返回数量限制
 */
export async function getRecentCardsFromSpace(spaceId: string, limit = 10): Promise<{
  space: Space | null;
  cards: Array<{ url: string; title: string; createdAt: number }>;
}> {
  const spaces = await getSpacesForSkills();
  const collections = await getCollectionsForSkills();

  const space = spaceId === 'all'
    ? { id: 'all', name: '所有空间', createdAt: 0, updatedAt: 0 }
    : spaces.find(s => s.id === spaceId) || null;

  if (!space) {
    return { space: null, cards: [] };
  }

  const filteredCollections = spaceId === 'all'
    ? collections
    : collections.filter(c => c.spaceId === spaceId);

  // 获取最近的卡片
  const allCards = filteredCollections
    .flatMap(c => c.cards.map(card => ({
      ...card,
      collectionName: c.name,
      spaceName: space.name
    })))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, limit);

  return {
    space,
    cards: allCards.map(card => ({
      url: card.url,
      title: card.title,
      createdAt: card.createdAt
    }))
  };
}

/**
 * 搜索收藏
 * @param query 搜索关键词
 */
export async function searchCards(query: string): Promise<Array<{
  url: string;
  title: string;
  description?: string;
  collectionName: string;
  spaceName: string;
}>> {
  const spaces = await getSpacesForSkills();
  const collections = await getCollectionsForSkills();
  const lowerQuery = query.toLowerCase();

  const results: Array<{
    url: string;
    title: string;
    description?: string;
    collectionName: string;
    spaceName: string;
  }> = [];

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

  return results.slice(0, 50); // 限制返回数量
}

/**
 * 获取空间和集合的简要信息（适合 AI 分析）
 */
export async function getSpacesSummary(): Promise<{
  spaces: Array<{ id: string; name: string; collectionCount: number }>;
  totalCards: number;
}> {
  const spaces = await getSpacesForSkills();
  const collections = await getCollectionsForSkills();

  const spacesSummary = spaces.map(space => ({
    id: space.id,
    name: space.name,
    collectionCount: collections.filter(c => c.spaceId === space.id).length
  }));

  const totalCards = collections.reduce((sum, c) => sum + c.cards.length, 0);

  return { spaces: spacesSummary, totalCards };
}

// 消息处理器 - 用于接收来自其他扩展或外部的消息
export function setupSkillsMessageHandler() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const { action, payload } = message;

    (async () => {
      try {
        let result;

        switch (action) {
          case 'getSpaces':
            result = await getSpacesForSkills();
            break;

          case 'getCollections':
            result = await getCollectionsForSkills();
            break;

          case 'getRecentCards':
            result = await getRecentCardsFromSpace(payload?.spaceId || 'default', payload?.limit || 10);
            break;

          case 'searchCards':
            result = await searchCards(payload?.query || '');
            break;

          case 'getSpacesSummary':
            result = await getSpacesSummary();
            break;

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
}
