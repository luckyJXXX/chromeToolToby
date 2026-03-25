/**
 * Collection Component - 集合组件
 * 包含集合头部和卡片列表，支持拖拽接收
 */

import { useState, useEffect } from 'react';
import { Collection as CollectionType, Card } from '../../../types';
import CardItem from './CardItem';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  GripVertical,
  MoreVertical,
  ExternalLink,
  Link2,
  Edit,
  Trash2
} from 'lucide-react';

interface CollectionProps {
  collection: CollectionType;
  viewMode?: 'grid' | 'list' | 'compact';
  onUpdate: (collection: CollectionType) => void;
  onDelete: (collectionId: string) => void;
  onOpenAll: (collection: CollectionType) => void;
  onAddCard: (collectionId: string) => void;
  onEditCard: (card: Card, collectionId: string) => void;
  onMoveCard: (card: Card, collectionId: string) => void;
  onAICard?: (card: Card, collectionId: string) => void;
  onDrop?: (collectionId: string, e: React.DragEvent) => void;
}

export default function Collection({
  collection,
  viewMode = 'grid',
  onUpdate,
  onDelete,
  onOpenAll,
  onAddCard,
  onEditCard,
  onMoveCard,
  onAICard,
  onDrop
}: CollectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(collection.name);

  // 监听全局菜单切换事件
  useEffect(() => {
    const handleToggleMenu = (e: CustomEvent<{ menuId: string }>) => {
      if (e.detail.menuId !== collection.id && showMenu) {
        setShowMenu(false);
      }
    };
    window.addEventListener('toggle-menu' as keyof WindowEventMap, handleToggleMenu as EventListener);
    return () => window.removeEventListener('toggle-menu' as keyof WindowEventMap, handleToggleMenu as EventListener);
  }, [collection.id, showMenu]);

  // 保存编辑
  const handleSave = () => {
    onUpdate({ ...collection, name: editName });
    setIsEditing(false);
  };

  // 拖拽处理
  const handleNativeDragOver = (e: React.DragEvent) => {
    console.log('[Collection] DragOver:', collection.id);
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleNativeDragEnter = (_e: React.DragEvent) => {
    console.log('[Collection] DragEnter:', collection.id);
  };

  const handleNativeDragLeave = (_e: React.DragEvent) => {
    console.log('[Collection] DragLeave:', collection.id);
  };

  const handleNativeDrop = (e: React.DragEvent) => {
    console.log('[Collection] Drop:', collection.id);
    e.preventDefault();
    const dataStr = e.dataTransfer?.getData('text/plain');
    console.log('[Collection] Drop data:', dataStr);
    if (onDrop) {
      onDrop(collection.id, e);
    }
  };

  // 删除卡片
  const handleDeleteCard = (cardId: string) => {
    const updated = {
      ...collection,
      cards: collection.cards.filter(c => c.id !== cardId)
    };
    onUpdate(updated);
  };

  return (
    <div
      data-collection-id={collection.id}
      onDragOver={handleNativeDragOver}
      onDragEnter={handleNativeDragEnter}
      onDragLeave={handleNativeDragLeave}
      onDrop={handleNativeDrop}
      className="bg-dark-800/50 rounded-xl border border-dark-700/50 transition-all"
    >
      {/* Collection 标题栏 */}
      <div className="flex items-center gap-2 p-4 border-b border-dark-700/50">
        <div className="text-dark-500 hover:text-dark-300 cursor-grab">
          <GripVertical size={16} />
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-dark-400 hover:text-dark-200"
        >
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        <Folder size={16} className="text-indigo-400" />

        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="flex-1 bg-dark-700 border border-dark-600 rounded px-2 py-1 text-sm text-dark-100 focus:outline-none focus:border-indigo-500"
            autoFocus
          />
        ) : (
          <h3
            onClick={() => setIsEditing(true)}
            className="flex-1 text-dark-100 font-medium cursor-pointer hover:text-indigo-400"
          >
            {collection.name}
          </h3>
        )}

        <span className="text-xs text-dark-500">
          {collection.cards.length} 个链接
        </span>

        <button
          onClick={() => onOpenAll(collection)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-400 hover:bg-indigo-600/20 rounded transition-colors"
          title="全部打开"
        >
          <ExternalLink size={12} />
          打开
        </button>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('toggle-menu', { detail: { menuId: collection.id } }));
              setShowMenu(!showMenu);
            }}
            className="p-1.5 text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded"
          >
            <MoreVertical size={16} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-10">
              <button
                onClick={() => {
                  onAddCard(collection.id);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700 rounded-t-lg"
              >
                <Link2 size={14} />
                手动添加
              </button>
              <button
                onClick={() => {
                  onOpenAll(collection);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700"
              >
                <ExternalLink size={14} />
                全部打开
              </button>
              <button
                onClick={() => {
                  setIsEditing(true);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700"
              >
                <Edit size={14} />
                重命名
              </button>
              <button
                onClick={() => {
                  onDelete(collection.id);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-dark-700 rounded-b-lg"
              >
                <Trash2 size={14} />
                删除
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cards 列表 */}
      {isExpanded && (
        <div
          data-collection-id={collection.id}
          onDragOver={handleNativeDragOver}
          onDrop={handleNativeDrop}
          className="p-4 min-h-[100px] transition-colors"
        >
          {collection.cards.length === 0 ? (
            <div className="text-center py-8 text-dark-500 text-sm border-2 border-dashed border-dark-700 rounded-lg">
              拖拽标签页到这里保存
            </div>
          ) : (
            <div className={`grid gap-2 ${
              viewMode === 'compact' ? 'grid-cols-5' :
              viewMode === 'list' ? 'grid-cols-1' : 'grid-cols-2'
            }`}>
              {collection.cards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  collectionId={collection.id}
                  viewMode={viewMode}
                  onDelete={() => handleDeleteCard(card.id)}
                  onEdit={(editedCard) => onEditCard(editedCard, collection.id)}
                  onMove={(moveCard) => onMoveCard(moveCard, collection.id)}
                  onAI={onAICard ? (c) => onAICard(c, collection.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
