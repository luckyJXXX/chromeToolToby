import { useState } from 'react';
import { ChromeWindow, ChromeTab, Collection } from '../types';
import { closeTab } from '../services/chrome';
import {
  RefreshCw,
  X,
  AppWindow,
  Monitor,
  Save,
  GripVertical,
  Plus,
  Folder
} from 'lucide-react';

interface RightPanelProps {
  windows: ChromeWindow[];
  onRefresh: () => void;
  collections: Collection[];
  onDropTab?: (tab: ChromeTab, collectionId: string) => void;
}

// 可拖拽的标签页项
function DraggableTab({
  tab,
  onDragStart
}: {
  tab: ChromeTab;
  onDragStart: (tab: ChromeTab) => void;
}) {
  const handleDragStart = (e: React.DragEvent) => {
    // 调试：打印拖拽开始
    console.log('[DragStart] 右侧标签开始拖拽:', {
      tabId: tab.id,
      title: tab.title,
      url: tab.url
    });

    // 设置完整数据
    const tabData = {
      type: 'tab',
      tabId: tab.id,
      url: tab.url,
      title: tab.title || '无标题',
      favIconUrl: tab.favIconUrl
    };

    // 设置外部拖拽标记，供 MainContent 的 DndContext 检测
    (window as any).__TOBY_EXTERNAL_DRAG__ = tabData;

    // 标准化：设置 dataTransfer 数据
    e.dataTransfer.setData('text/plain', JSON.stringify(tabData));
    e.dataTransfer.effectAllowed = 'move';

    // 调用回调
    onDragStart(tab);
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await closeTab(tab.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-700 cursor-grab active:cursor-grabbing group transition-colors"
    >
      <GripVertical size={14} className="text-dark-600 flex-shrink-0" />
      <div className="w-4 h-4 flex-shrink-0">
        {tab.favIconUrl ? (
          <img src={tab.favIconUrl} alt="" className="w-full h-full" />
        ) : (
          <div className="w-full h-full bg-dark-600 rounded" />
        )}
      </div>
      <span className="text-sm text-dark-300 truncate flex-1">
        {tab.title || '无标题'}
      </span>
      <button
        onClick={handleClose}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-dark-600 rounded text-dark-500 hover:text-red-400 transition-all"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export default function RightPanel({
  windows,
  onRefresh,
  collections,
  onDropTab: _onDropTab
}: RightPanelProps) {
  const [, setDraggingTab] = useState<ChromeTab | null>(null);
  const [savedWindowId, setSavedWindowId] = useState<number | null>(null);
  const [showSaveMenu, setShowSaveMenu] = useState<number | null>(null);

  // 处理拖拽开始
  const handleDragStart = (tab: ChromeTab) => {
    setDraggingTab(tab);
  };

  // 计算总标签页数
  const totalTabs = windows.reduce((sum, w) => sum + w.tabs.length, 0);

  // 一键保存整个窗口 - 询问保存到哪个集合
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

      // 保存到存储
      const current = await chrome.storage.local.get('toby_collections');
      const existing = current.toby_collections || [];
      await chrome.storage.local.set({ toby_collections: [...existing, newCollection] });
    }

    setSavedWindowId(windowId);
    setShowSaveMenu(null);
    setTimeout(() => setSavedWindowId(null), 2000);
    onRefresh();
  };

  // 全局拖拽事件处理
  useState(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener('dragover', handleDragOver);
    return () => document.removeEventListener('dragover', handleDragOver);
  });

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
          <div key={window.id} className="mb-4 relative">
            {/* Window 标题 */}
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <div className="flex items-center gap-2 text-xs text-dark-500">
                <Monitor size={12} />
                <span>窗口 {window.id}</span>
              </div>
              <button
                onClick={() => setShowSaveMenu(showSaveMenu === window.id ? null : window.id)}
                className="flex items-center gap-1 px-2 py-0.5 text-xs text-indigo-400 hover:bg-indigo-600/20 rounded"
                title="保存整个窗口"
              >
                <Save size={10} />
                {savedWindowId === window.id ? '已保存' : '保存'}
              </button>

              {/* 保存选项下拉菜单 */}
              {showSaveMenu === window.id && (
                <div className="absolute right-0 top-full mt-1 bg-dark-800 border border-dark-700 rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
                  <button
                    onClick={() => handleSaveWindow(window.id)}
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
                      onClick={() => handleSaveWindow(window.id, collection.id)}
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
                <DraggableTab
                  key={tab.id}
                  tab={tab}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          </div>
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
