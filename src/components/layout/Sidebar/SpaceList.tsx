/**
 * SpaceList Component - Space 列表
 */

import { useState } from 'react';
import { Space, Collection } from '../../../types';
import {
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  GripVertical,
  MoreVertical,
  Trash2,
  Folder
} from 'lucide-react';

interface SpaceListProps {
  spaces: Space[];
  collections: Collection[];
  activeSpaceId: string;
  onSpaceChange: (spaceId: string) => void;
  onAddSpace: (name: string) => void;
  onDeleteSpace: (spaceId: string) => void;
}

export default function SpaceList({
  spaces,
  collections,
  activeSpaceId,
  onSpaceChange,
  onAddSpace,
  onDeleteSpace
}: SpaceListProps) {
  const [showAddSpace, setShowAddSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [spaceMenuOpen, setSpaceMenuOpen] = useState<string | null>(null);
  const [draggedSpace, setDraggedSpace] = useState<Space | null>(null);
  const [dragOverSpace, setDragOverSpace] = useState<string | null>(null);

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

  // Space 拖拽
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

    setDraggedSpace(null);
    setDragOverSpace(null);
  };

  const handleDragEnd = () => {
    setDraggedSpace(null);
    setDragOverSpace(null);
  };

  // 添加 Space
  const handleAddSpace = () => {
    if (newSpaceName.trim()) {
      onAddSpace(newSpaceName.trim());
      setNewSpaceName('');
      setShowAddSpace(false);
    }
  };

  return (
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
                  onClick={() => {
                    onDeleteSpace(space.id);
                    setSpaceMenuOpen(null);
                  }}
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
  );
}
