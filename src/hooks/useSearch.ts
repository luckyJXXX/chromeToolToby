/**
 * useSearch Hook - 搜索业务逻辑
 * 管理搜索查询和搜索结果
 */

import { useState, useCallback, useMemo } from 'react';
import { Collection, Space } from '../types';

export interface SearchResult {
  url: string;
  title: string;
  collectionId: string;
  collectionName: string;
  spaceName: string;
}

interface UseSearchOptions {
  collections: Collection[];
  spaces: Space[];
  maxResults?: number;
}

export function useSearch(options: UseSearchOptions) {
  const { collections, spaces, maxResults = 20 } = options;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // 执行搜索
  const search = useCallback((query: string): SearchResult[] => {
    if (!query.trim()) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const collection of collections) {
      const space = spaces.find(s => s.id === collection.spaceId);
      const spaceName = space?.name || '默认空间';

      for (const card of collection.cards) {
        if (
          card.title.toLowerCase().includes(lowerQuery) ||
          card.url.toLowerCase().includes(lowerQuery) ||
          (card.description?.toLowerCase().includes(lowerQuery))
        ) {
          results.push({
            url: card.url,
            title: card.title,
            collectionId: collection.id,
            collectionName: collection.name,
            spaceName
          });
        }
      }
    }

    return results.slice(0, maxResults);
  }, [collections, spaces, maxResults]);

  // 处理搜索输入
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    const results = search(query);
    setSearchResults(results);
  }, [search]);

  // 清除搜索
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  // 搜索结果是否为空
  const hasResults = useMemo(() => searchResults.length > 0, [searchResults]);

  return {
    searchQuery,
    searchResults,
    handleSearch,
    clearSearch,
    hasResults,
    isSearching: searchQuery.length > 0
  };
}
