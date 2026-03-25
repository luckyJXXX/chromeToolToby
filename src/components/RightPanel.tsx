/**
 * RightPanel - 右侧面板组件
 * 显示所有打开的窗口和标签页，支持拖拽保存
 */

import { useState } from 'react';
import { ChromeWindow, ChromeTab, Collection } from '../types';
import { AppWindow, RefreshCw } from 'lucide-react';
import { WindowItem } from './layout/RightPanel';

interface RightPanelProps {
  windows: ChromeWindow[];
  onRefresh: () => void;
  collections: Collection[];
  onDropTab?: (tab: ChromeTab, collectionId: string) => void;
}

export default function RightPanel({
  windows,
  onRefresh,
  collections
}: RightPanelProps) {
  const [, setDraggingTab] = useState<ChromeTab | null>(null);

  // 处理拖拽开始
  const handleDragStart = (tab: ChromeTab) => {
    setDraggingTab(tab);
  };

  // 计算总标签页数
  const totalTabs = windows.reduce((sum, w) => sum + w.tabs.length, 0);

  // 一键保存整个窗口
  const handleSaveWindow = async (windowId: number, targetCollectionId?: string) => {
    const window = windows.find(w => w.id === windowId);
    if (!window) return;

    if (targetCollectionId) {
      // 添加到现有集合
      const targetCollection = collections.find(c => c.id === targetCollectionId);
      if (targetCollection) {
        const newCards = window.tabs.map(tab => ({
          id: `card-${tab.id}`,
          url: tab.url,
          title: tab.title || '无标题',
          favicon: tab.favIconUrl,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }));

        const updatedCollection = {
          ...targetCollection,
          cards: [...targetCollection.cards, ...newCards],
          updatedAt: Date.now()
        };

        const current = await chrome.storage.local.get('toby_collections');
        const existing = current.toby_collections || [];
        const newCollections = existing.map((c: Collection) =>
          c.id === targetCollectionId ? updatedCollection : c
        );
        await chrome.storage.local.set({ toby_collections: newCollections });
      }
    } else {
      // 创建新集合
      const newCollection: Collection = {
        id: `collection-${Date.now()}`,
        spaceId: 'default',
        name: `窗口 ${window.id}`,
        cards: window.tabs.map(tab => ({
          id: `card-${tab.id}`,
          url: tab.url,
          title: tab.title || '无标题',
          favicon: tab.favIconUrl,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const current = await chrome.storage.local.get('toby_collections');
      const existing = current.toby_collections || [];
      await chrome.storage.local.set({ toby_collections: [...existing, newCollection] });
    }

    onRefresh();
  };

  return (
    <aside className="w-72 h-full bg-dark-900 border-l border-dark-800 flex flex-col">
      {/* 顶部 */}
      <div className="flex items-center justify-between p-4 border-b border-dark-800">
        <div className="flex items-center gap-2">
          <AppWindow size={18} className="text-indigo-400" />
          <h2 className="text-dark-100 font-medium">打开的标签页</h2>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 text-dark-500 hover:text-dark-300 hover:bg-dark-800 rounded"
          title="刷新"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* 标签页数量 */}
      <div className="px-4 py-2 text-xs text-dark-500 border-b border-dark-800">
        {windows.length} 个窗口 · {totalTabs} 个标签页
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-2">
        {windows.map((window) => (
          <WindowItem
            key={window.id}
            window={window}
            collections={collections}
            onDragStart={handleDragStart}
            onSaveWindow={handleSaveWindow}
          />
        ))}

        {windows.length === 0 && (
          <div className="text-center py-8 text-dark-500 text-sm">
            没有打开的标签页
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="p-3 border-t border-dark-800 text-xs text-dark-500 text-center">
        拖拽标签页到集合保存
      </div>
    </aside>
  );
}
