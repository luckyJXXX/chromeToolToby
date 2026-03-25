/**
 * useSpaces Hook - Space 业务逻辑
 * 管理 Space 的增删改查
 */

import { useState, useCallback } from 'react';
import { Space } from '../types';
import * as StorageService from '../services/storage';

interface UseSpacesOptions {
  onSpacesChange?: (spaces: Space[]) => void;
}

export function useSpaces(initialSpaces: Space[], options: UseSpacesOptions = {}) {
  const [spaces, setSpaces] = useState<Space[]>(initialSpaces);

  // 创建 Space
  const createSpace = useCallback(async (name: string): Promise<Space> => {
    const newSpace: Space = {
      id: `space-${Date.now()}`,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const updatedSpaces = [...spaces, newSpace];
    await StorageService.saveSpaces(updatedSpaces);
    setSpaces(updatedSpaces);
    options.onSpacesChange?.(updatedSpaces);

    return newSpace;
  }, [spaces, options]);

  // 更新 Space
  const updateSpace = useCallback(async (spaceId: string, updates: Partial<Space>): Promise<void> => {
    const updatedSpaces = spaces.map(space =>
      space.id === spaceId
        ? { ...space, ...updates, updatedAt: Date.now() }
        : space
    );
    await StorageService.saveSpaces(updatedSpaces);
    setSpaces(updatedSpaces);
    options.onSpacesChange?.(updatedSpaces);
  }, [spaces, options]);

  // 删除 Space
  const deleteSpace = useCallback(async (spaceId: string): Promise<void> => {
    const spaceToDelete = spaces.find(s => s.id === spaceId);
    if (spaceToDelete?.isDefault) {
      console.warn('不能删除默认 Space');
      return;
    }

    const updatedSpaces = spaces.filter(s => s.id !== spaceId);
    await StorageService.deleteSpace(spaceId);
    setSpaces(updatedSpaces);
    options.onSpacesChange?.(updatedSpaces);
  }, [spaces, options]);

  return {
    spaces,
    setSpaces,
    createSpace,
    updateSpace,
    deleteSpace
  };
}
