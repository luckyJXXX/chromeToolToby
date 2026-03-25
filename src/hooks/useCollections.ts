/**
 * useCollections Hook - Collection 业务逻辑
 * 管理 Collection 和 Card 的增删改查
 */

import { useCallback } from 'react';
import { Collection, Card } from '../types';
import * as StorageService from '../services/storage';

interface UseCollectionsOptions {
  allCollections?: Collection[];
}

export function useCollections(options: UseCollectionsOptions = {}) {
  // 创建 Collection
  const createCollection = useCallback(async (
    spaceId: string,
    name: string
  ): Promise<Collection> => {
    const newCollection: Collection = {
      id: `collection-${Date.now()}`,
      spaceId,
      name,
      cards: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await StorageService.addCollection(newCollection);
    return newCollection;
  }, []);

  // 更新 Collection
  const updateCollection = useCallback(async (collection: Collection): Promise<void> => {
    await StorageService.updateCollection(collection);
  }, []);

  // 删除 Collection
  const deleteCollection = useCallback(async (collectionId: string): Promise<void> => {
    await StorageService.deleteCollection(collectionId);
  }, []);

  // 添加 Card 到 Collection
  const addCard = useCallback(async (
    collectionId: string,
    card: Card
  ): Promise<void> => {
    await StorageService.addCardToCollection(collectionId, card);
  }, []);

  // 删除 Card
  const removeCard = useCallback(async (
    collectionId: string,
    cardId: string
  ): Promise<void> => {
    await StorageService.removeCardFromCollection(collectionId, cardId);
  }, []);

  // 移动 Card 到另一个 Collection
  const moveCard = useCallback(async (
    fromCollectionId: string,
    toCollectionId: string,
    cardId: string
  ): Promise<void> => {
    await StorageService.moveCardToCollection(fromCollectionId, toCollectionId, cardId);
  }, []);

  // 更新 Card
  const updateCard = useCallback(async (
    collectionId: string,
    cardId: string,
    updates: Partial<Card>
  ): Promise<void> => {
    const collections = options.allCollections || [];
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return;

    const card = collection.cards.find(c => c.id === cardId);
    if (!card) return;

    const updatedCard = { ...card, ...updates, updatedAt: Date.now() };
    const updatedCollections = collections.map(c =>
      c.id === collectionId
        ? { ...c, cards: c.cards.map(card => card.id === cardId ? updatedCard : card) }
        : c
    );

    await StorageService.saveCollections(updatedCollections);
  }, [options.allCollections]);

  return {
    createCollection,
    updateCollection,
    deleteCollection,
    addCard,
    removeCard,
    moveCard,
    updateCard
  };
}
