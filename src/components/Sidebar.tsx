/**
 * Sidebar - 左侧边栏组件
 * 包含搜索、快捷链接、Space 列表、设置面板
 */

import { useState, useEffect } from 'react';
import { Space, Collection } from '../types';
import { Settings as SettingsIcon } from 'lucide-react';
import { SearchBar, QuickLinks, SpaceList, Settings } from './layout/Sidebar';

interface SidebarProps {
  spaces: Space[];
  activeSpaceId: string;
  onSpaceChange: (spaceId: string) => void;
  onSpacesChange?: (spaces: Space[]) => void;
  collections: Collection[];
  onSearchResults?: (results: Array<{ url: string; title: string; collectionId: string; collectionName: string; spaceName: string }>) => void;
}

interface SearchResult {
  url: string;
  title: string;
  collectionId: string;
  collectionName: string;
  spaceName: string;
}

export default function Sidebar({
  spaces,
  activeSpaceId,
  onSpaceChange,
  onSpacesChange,
  collections,
  onSearchResults
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // 搜索功能
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      onSearchResults?.([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    for (const collection of collections) {
      const space = spaces.find(s => s.id === collection.spaceId);
      const spaceName = space?.name || '默认空间';

      for (const card of collection.cards) {
        if (
          card.title.toLowerCase().includes(query) ||
          card.url.toLowerCase().includes(query) ||
          (card.description?.toLowerCase().includes(query))
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

    setSearchResults(results.slice(0, 20));
    onSearchResults?.(results);
  }, [searchQuery, collections, spaces, onSearchResults]);

  // 处理默认链接点击
  const handleDefaultLinkClick = (linkId: string) => {
    if (linkId === 'all' || linkId === 'favorites') {
      onSpaceChange('all');
    } else if (linkId === 'unread') {
      onSpaceChange('default');
    }
  };

  // 添加新 Space
  const handleAddSpace = async (name: string) => {
    const newSpace: Space = {
      id: `space-${Date.now()}`,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const currentSpaces = await new Promise<Space[]>((resolve) => {
      chrome.storage.local.get('toby_spaces', (result) => {
        resolve(result.toby_spaces || []);
      });
    });

    const updatedSpaces = [...currentSpaces, newSpace];
    await chrome.storage.local.set({ toby_spaces: updatedSpaces });
    onSpacesChange?.(updatedSpaces);
    window.location.reload();
  };

  // 删除 Space
  const handleDeleteSpace = async (spaceId: string) => {
    const current = await chrome.storage.local.get('toby_spaces');
    const spaces = (current.toby_spaces || []).filter((s: Space) => s.id !== spaceId);
    await chrome.storage.local.set({ toby_spaces: spaces });

    // 同时删除该 Space 下的所有 Collection
    const collectionsData = await chrome.storage.local.get('toby_collections');
    const collections = (collectionsData.toby_collections || []).filter((c: Collection) => c.spaceId !== spaceId);
    await chrome.storage.local.set({ toby_collections: collections });

    window.location.reload();
  };

  return (
    <aside className="w-64 h-full bg-dark-900 border-r border-dark-800 flex flex-col">
      {/* 搜索栏 */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchResults={searchResults}
      />

      {/* 快捷链接 */}
      <QuickLinks onLinkClick={handleDefaultLinkClick} />

      {/* Space 列表 */}
      <SpaceList
        spaces={spaces}
        collections={collections}
        activeSpaceId={activeSpaceId}
        onSpaceChange={onSpaceChange}
        onAddSpace={handleAddSpace}
        onDeleteSpace={handleDeleteSpace}
      />

      {/* 底部设置按钮 */}
      <div className="p-2 border-t border-dark-800">
        <button
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-dark-400 hover:bg-dark-800 hover:text-dark-100 transition-colors"
        >
          <SettingsIcon size={18} />
          <span className="text-sm">设置</span>
        </button>
      </div>

      {/* 设置面板 */}
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </aside>
  );
}
