/**
 * Storage Service - 数据持久化服务
 * 负责与 chrome.storage.local 交互
 */

import { Space, Collection, Card, AppState } from '../types';
import { STORAGE_KEYS, DEFAULT_SPACE, DEFAULT_COLLECTION } from '../constants/storage';

// 获取所有数据
export async function getAppState(): Promise<AppState> {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [STORAGE_KEYS.SPACES, STORAGE_KEYS.COLLECTIONS, STORAGE_KEYS.ACTIVE_SPACE],
      (result) => {
        const spaces = result[STORAGE_KEYS.SPACES] as Space[] || [DEFAULT_SPACE];
        const collections = result[STORAGE_KEYS.COLLECTIONS] as Collection[] || [DEFAULT_COLLECTION];
        const activeSpaceId = result[STORAGE_KEYS.ACTIVE_SPACE] as string || 'default';

        resolve({ spaces, collections, activeSpaceId });
      }
    );
  });
}

// 保存 Spaces
export async function saveSpaces(spaces: Space[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.SPACES]: spaces }, resolve);
  });
}

// 保存 Collections
export async function saveCollections(collections: Collection[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.COLLECTIONS]: collections }, resolve);
  });
}

// 保存当前活跃的 Space
export async function saveActiveSpace(spaceId: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_SPACE]: spaceId }, resolve);
  });
}

// 添加 Space
export async function addSpace(space: Space): Promise<void> {
  const state = await getAppState();
  state.spaces.push(space);
  await saveSpaces(state.spaces);
}

// 删除 Space
export async function deleteSpace(spaceId: string): Promise<void> {
  const state = await getAppState();
  const filtered = state.spaces.filter(s => s.id !== spaceId && !s.isDefault);
  await saveSpaces(filtered);

  // 同时删除该 Space 下的所有 Collection
  const filteredCollections = state.collections.filter(c => c.spaceId !== spaceId);
  await saveCollections(filteredCollections);
}

// 添加 Collection
export async function addCollection(collection: Collection): Promise<void> {
  const state = await getAppState();
  state.collections.push(collection);
  await saveCollections(state.collections);
}

// 更新 Collection
export async function updateCollection(collection: Collection): Promise<void> {
  const state = await getAppState();
  const index = state.collections.findIndex(c => c.id === collection.id);
  if (index !== -1) {
    state.collections[index] = { ...collection, updatedAt: Date.now() };
    await saveCollections(state.collections);
  }
}

// 删除 Collection
export async function deleteCollection(collectionId: string): Promise<void> {
  const state = await getAppState();
  const filtered = state.collections.filter(c => c.id !== collectionId);
  await saveCollections(filtered);
}

// 添加 Card 到 Collection
export async function addCardToCollection(collectionId: string, card: Card): Promise<void> {
  const state = await getAppState();
  const collection = state.collections.find(c => c.id === collectionId);
  if (collection) {
    collection.cards.push(card);
    collection.updatedAt = Date.now();
    await saveCollections(state.collections);
  }
}

// 从 Collection 删除 Card
export async function removeCardFromCollection(collectionId: string, cardId: string): Promise<void> {
  const state = await getAppState();
  const collection = state.collections.find(c => c.id === collectionId);
  if (collection) {
    collection.cards = collection.cards.filter(c => c.id !== cardId);
    collection.updatedAt = Date.now();
    await saveCollections(state.collections);
  }
}

// 移动 Card 到另一个 Collection
export async function moveCardToCollection(
  fromCollectionId: string,
  toCollectionId: string,
  cardId: string
): Promise<void> {
  const state = await getAppState();
  const fromCollection = state.collections.find(c => c.id === fromCollectionId);
  const toCollection = state.collections.find(c => c.id === toCollectionId);

  if (fromCollection && toCollection) {
    const cardIndex = fromCollection.cards.findIndex(c => c.id === cardId);
    if (cardIndex !== -1) {
      const [card] = fromCollection.cards.splice(cardIndex, 1);
      toCollection.cards.push(card);
      fromCollection.updatedAt = Date.now();
      toCollection.updatedAt = Date.now();
      await saveCollections(state.collections);
    }
  }
}

// 初始化存储（如果为空）
export async function initStorage(): Promise<void> {
  const state = await getAppState();
  if (state.spaces.length === 0) {
    await saveSpaces([DEFAULT_SPACE]);
  }
  if (state.collections.length === 0) {
    await saveCollections([DEFAULT_COLLECTION]);
  }
  if (!state.activeSpaceId) {
    await saveActiveSpace('default');
  }
}
