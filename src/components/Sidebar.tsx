import { useState } from 'react';
import { Space, Collection } from '../types';
import {
  Search,
  Plus,
  Star,
  Clock,
  Bookmark,
  Settings,
  ChevronRight,
  Layers,
  X
} from 'lucide-react';

interface SidebarProps {
  spaces: Space[];
  activeSpaceId: string;
  onSpaceChange: (spaceId: string) => void;
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
  collections
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSpace, setShowAddSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');

  const defaultLinks: DefaultLink[] = [
    { id: 'all', name: '所有链接', icon: <Layers size={18} /> },
    { id: 'unread', name: '稍后阅读', icon: <Clock size={18} /> },
    { id: 'favorites', name: '我的收藏', icon: <Star size={18} /> },
  ];

  // 处理默认链接点击 - 显示所有收藏的卡片
  const handleDefaultLinkClick = (linkId: string) => {
    // 切换到默认空间
    if (linkId === 'all' || linkId === 'favorites') {
      onSpaceChange('default');
    } else if (linkId === 'unread') {
      // 稍后阅读可以创建一个专门的 space
      onSpaceChange('default');
    }
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
          return (
            <button
              key={space.id}
              onClick={() => onSpaceChange(space.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                activeSpaceId === space.id
                  ? 'bg-indigo-600/20 text-indigo-400'
                  : 'text-dark-300 hover:bg-dark-800 hover:text-dark-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-dark-800 flex items-center justify-center text-xs font-medium">
                  {space.name.charAt(0)}
                </div>
                <span className="text-sm truncate">{space.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-dark-500">{collectionCount}</span>
                <ChevronRight size={14} className="text-dark-500" />
              </div>
            </button>
          );
        })}
      </div>

      {/* 底部：设置 */}
      <div className="p-2 border-t border-dark-800">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-dark-400 hover:bg-dark-800 hover:text-dark-100 transition-colors">
          <Settings size={18} />
          <span className="text-sm">设置</span>
        </button>
      </div>
    </aside>
  );
}
