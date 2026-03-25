/**
 * WindowItem Component - 窗口组件
 */

import { useState } from 'react';
import { ChromeWindow, ChromeTab, Collection } from '../../../types';
import TabItem from './TabItem';
import { Monitor, Save, Plus, Folder } from 'lucide-react';

interface WindowItemProps {
  window: ChromeWindow;
  collections: Collection[];
  onDragStart: (tab: ChromeTab) => void;
  onSaveWindow: (windowId: number, targetCollectionId?: string) => void;
}

export default function WindowItem({
  window,
  collections,
  onDragStart,
  onSaveWindow
}: WindowItemProps) {
  const [showSaveMenu, setShowSaveMenu] = useState(false);

  return (
    <div key={window.id} className="mb-4 relative">
      {/* Window 标题 */}
      <div className="flex items-center justify-between px-2 py-1 mb-1">
        <div className="flex items-center gap-2 text-xs text-dark-500">
          <Monitor size={12} />
          <span>窗口 {window.id}</span>
        </div>
        <button
          onClick={() => setShowSaveMenu(!showSaveMenu)}
          className="flex items-center gap-1 px-2 py-0.5 text-xs text-indigo-400 hover:bg-indigo-600/20 rounded"
          title="保存整个窗口"
        >
          <Save size={10} />
          保存
        </button>

        {/* 保存选项下拉菜单 */}
        {showSaveMenu && (
          <div className="absolute right-0 top-full mt-1 bg-dark-800 border border-dark-700 rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
            <button
              onClick={() => {
                onSaveWindow(window.id);
                setShowSaveMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-dark-300 hover:bg-dark-700 text-left"
            >
              <Plus size={12} />
              保存为新集合
            </button>
            {collections.length > 0 && (
              <div className="border-t border-dark-700 my-1" />
            )}
            {collections.slice(0, 5).map(collection => (
              <button
                key={collection.id}
                onClick={() => {
                  onSaveWindow(window.id, collection.id);
                  setShowSaveMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-dark-300 hover:bg-dark-700 text-left"
              >
                <Folder size={12} />
                添加到 {collection.name}
              </button>
            ))}
            {collections.length > 5 && (
              <div className="px-3 py-1 text-xs text-dark-500">
                还有 {collections.length - 5} 个集合...
              </div>
            )}
          </div>
        )}
      </div>

      {/* 标签页列表 */}
      <div className="space-y-0.5">
        {window.tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  );
}
