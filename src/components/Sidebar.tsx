import { useState, useEffect } from 'react';
import { Space, Collection } from '../types';
import {
  Search,
  Plus,
  Star,
  Clock,
  Settings,
  ChevronRight,
  ChevronDown,
  Layers,
  X,
  Key,
  MoreVertical,
  Trash2,
  Folder,
  GripVertical
} from 'lucide-react';
import { getMiniMaxApiKey, setMiniMaxApiKey } from '../utils/ai';

interface SidebarProps {
  spaces: Space[];
  activeSpaceId: string;
  onSpaceChange: (spaceId: string) => void;
  onSpacesChange?: (spaces: Space[]) => void;
  collections: Collection[];
}

interface DefaultLink {
  id: string;
  name: string;
  icon: React.ReactNode;
}

export default function Sidebar({
  spaces,
  activeSpaceId,
  onSpaceChange,
  onSpacesChange,
  collections
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSpace, setShowAddSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [spaceMenuOpen, setSpaceMenuOpen] = useState<string | null>(null);
  const [draggedSpace, setDraggedSpace] = useState<Space | null>(null);
  const [dragOverSpace, setDragOverSpace] = useState<string | null>(null);

  const defaultLinks: DefaultLink[] = [
    { id: 'all', name: '所有链接', icon: <Layers size={18} /> },
    { id: 'unread', name: '稍后阅读', icon: <Clock size={18} /> },
    { id: 'favorites', name: '我的收藏', icon: <Star size={18} /> },
  ];

  // 处理默认链接点击 - 显示所有收藏的卡片
  const handleDefaultLinkClick = (linkId: string) => {
    // 切换到默认空间
    if (linkId === 'all') {
      // "所有链接" 显示所有空间的收藏
      onSpaceChange('all');
    } else if (linkId === 'unread') {
      // 稍后阅读 - 暂时使用 default space
      onSpaceChange('default');
    } else if (linkId === 'favorites') {
      // 收藏 - 显示所有收藏的卡片
      onSpaceChange('all');
    }
  };

  // 加载 API Key
  useEffect(() => {
    const loadApiKey = async () => {
      const key = await getMiniMaxApiKey();
      if (key) {
        setApiKey(key);
      }
    };
    if (showSettings) {
      loadApiKey();
    }
  }, [showSettings]);

  // 保存 API Key
  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    setSavingKey(true);
    try {
      await setMiniMaxApiKey(apiKey.trim());
      setShowSettings(false);
    } catch (error) {
      console.error('保存 API Key 失败:', error);
    }
    setSavingKey(false);
  };

  // 切换 Space 展开/折叠
  const toggleSpaceExpand = (spaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSpaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(spaceId)) {
        newSet.delete(spaceId);
      } else {
        newSet.add(spaceId);
      }
      return newSet;
    });
  };

  // 切换 Space 菜单
  const toggleSpaceMenu = (spaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSpaceMenuOpen(prev => prev === spaceId ? null : spaceId);
  };

  // Space 拖拽排序
  const handleDragStart = (e: React.DragEvent, space: Space) => {
    setDraggedSpace(space);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', space.id);
  };

  const handleDragOver = (e: React.DragEvent, spaceId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSpace(spaceId);
  };

  const handleDragLeave = () => {
    setDragOverSpace(null);
  };

  const handleDrop = (e: React.DragEvent, targetSpace: Space) => {
    e.preventDefault();
    if (!draggedSpace || draggedSpace.id === targetSpace.id) {
      setDraggedSpace(null);
      setDragOverSpace(null);
      return;
    }

    const draggedIndex = spaces.findIndex(s => s.id === draggedSpace.id);
    const targetIndex = spaces.findIndex(s => s.id === targetSpace.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedSpace(null);
      setDragOverSpace(null);
      return;
    }

    const newSpaces = [...spaces];
    newSpaces.splice(draggedIndex, 1);
    newSpaces.splice(targetIndex, 0, draggedSpace);

    chrome.storage.local.set({ toby_spaces: newSpaces });
    onSpacesChange?.(newSpaces);

    setDraggedSpace(null);
    setDragOverSpace(null);
  };

  const handleDragEnd = () => {
    setDraggedSpace(null);
    setDragOverSpace(null);
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

    setSpaceMenuOpen(null);
    window.location.reload();
  };

  // 添加新 Space
  const handleAddSpace = async () => {
    if (newSpaceName.trim()) {
      const newSpace: Space = {
        id: `space-${Date.now()}`,
        name: newSpaceName.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // 保存到存储
      const currentSpaces = await getSpaces();
      const updatedSpaces = [...currentSpaces, newSpace];
      await chrome.storage.local.set({ toby_spaces: updatedSpaces });

      setNewSpaceName('');
      setShowAddSpace(false);

      // 触发刷新
      window.location.reload();
    }
  };

  // 获取当前 spaces
  const getSpaces = (): Promise<Space[]> => {
    return new Promise((resolve) => {
      chrome.storage.local.get('toby_spaces', (result) => {
        resolve(result.toby_spaces || []);
      });
    });
  };

  return (
    <aside className="w-64 h-full bg-dark-900 border-r border-dark-800 flex flex-col">
      {/* 顶部搜索框 */}
      <div className="p-4 border-b border-dark-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" size={16} />
          <input
            type="text"
            placeholder="搜索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-10 pr-4 py-2 text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* 默认快捷链接 */}
      <nav className="p-2 border-b border-dark-800">
        {defaultLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => handleDefaultLinkClick(link.id)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-dark-300 hover:bg-dark-800 hover:text-dark-100 transition-colors"
          >
            {link.icon}
            <span className="text-sm">{link.name}</span>
          </button>
        ))}
      </nav>

      {/* Spaces 列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-medium text-dark-500 uppercase">Spaces</span>
          <button
            onClick={() => setShowAddSpace(!showAddSpace)}
            className="p-1 hover:bg-dark-800 rounded text-dark-500 hover:text-dark-300"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* 添加 Space 输入框 */}
        {showAddSpace && (
          <div className="px-3 py-2 mb-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="输入 Space 名称"
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSpace()}
                className="flex-1 bg-dark-800 border border-dark-700 rounded px-3 py-1.5 text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <button
                onClick={() => setShowAddSpace(false)}
                className="p-1.5 text-dark-500 hover:text-dark-300"
              >
                <X size={14} />
              </button>
            </div>
            <button
              onClick={handleAddSpace}
              className="w-full mt-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm"
            >
              创建 Space
            </button>
          </div>
        )}

        {/* Space 列表 */}
        {spaces.map((space) => {
          const collectionCount = collections.filter(c => c.spaceId === space.id).length;
          const isExpanded = expandedSpaces.has(space.id);
          const isDragOver = dragOverSpace === space.id && draggedSpace?.id !== space.id;

          return (
            <div
              key={space.id}
              className={`relative ${isDragOver ? 'border-t-2 border-indigo-500' : ''}`}
              onDragOver={(e) => handleDragOver(e, space.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, space)}
            >
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, space)}
                onDragEnd={handleDragEnd}
                onClick={() => onSpaceChange(space.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-grab active:cursor-grabbing ${
                  draggedSpace?.id === space.id ? 'opacity-50' : ''
                } ${
                  activeSpaceId === space.id
                    ? 'bg-indigo-600/20 text-indigo-400'
                    : 'text-dark-300 hover:bg-dark-800 hover:text-dark-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <GripVertical size={14} className="text-dark-600 flex-shrink-0" />
                  <div className="w-6 h-6 rounded bg-dark-800 flex items-center justify-center text-xs font-medium">
                    {space.name.charAt(0)}
                  </div>
                  <span className="text-sm truncate">{space.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-dark-500">{collectionCount}</span>
                  <button
                    onClick={(e) => toggleSpaceExpand(space.id, e)}
                    className="p-1 hover:bg-dark-700 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-dark-500" />
                    ) : (
                      <ChevronRight size={14} className="text-dark-500" />
                    )}
                  </button>
                  <button
                    onClick={(e) => toggleSpaceMenu(space.id, e)}
                    className="p-1 hover:bg-dark-700 rounded"
                  >
                    <MoreVertical size={14} className="text-dark-500" />
                  </button>
                </div>
              </div>

              {/* Space 操作菜单 */}
              {spaceMenuOpen === space.id && !space.isDefault && (
                <div className="absolute right-0 top-full mt-1 bg-dark-800 border border-dark-700 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                  <button
                    onClick={() => handleDeleteSpace(space.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-dark-700 text-left"
                  >
                    <Trash2 size={14} />
                    删除 Space
                  </button>
                </div>
              )}

              {/* 展开的 Collections 列表 */}
              {isExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {collections.filter(c => c.spaceId === space.id).map(collection => (
                    <button
                      key={collection.id}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-400 hover:bg-dark-800 rounded-lg text-left"
                    >
                      <Folder size={12} />
                      {collection.name}
                      <span className="ml-auto text-dark-500">{collection.cards.length}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 底部：设置 */}
      <div className="p-2 border-t border-dark-800">
        <button
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-dark-400 hover:bg-dark-800 hover:text-dark-100 transition-colors"
        >
          <Settings size={18} />
          <span className="text-sm">设置</span>
        </button>
      </div>

      {/* 设置弹窗 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl p-6 w-[420px] border border-dark-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings size={20} className="text-indigo-400" />
                <h3 className="text-lg font-medium text-dark-100">设置</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-dark-500 hover:text-dark-300"
              >
                <X size={20} />
              </button>
            </div>

            {/* API Key 设置 */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Key size={16} className="text-indigo-400" />
                <span className="text-sm font-medium text-dark-300">MiniMax API Key</span>
              </div>
              <p className="text-xs text-dark-500 mb-2">
                输入您的 MiniMax API Key 以启用 AI 分析功能。
              </p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-xxxxxxxxxxxxxxxx"
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-indigo-500 mb-3"
              />
              <button
                onClick={handleSaveApiKey}
                disabled={savingKey || !apiKey.trim()}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-dark-600 disabled:text-dark-500 text-white rounded-lg text-sm"
              >
                {savingKey ? '保存中...' : '保存 API Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
