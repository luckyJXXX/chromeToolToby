/**
 * CardItem Component - 卡片组件
 * 支持拖拽、点击打开、右键菜单
 */

import { useState, useEffect } from 'react';
import { Card } from '../../../types';
import {
  Edit,
  Trash2,
  Folder,
  Copy,
  Check,
  Sparkles,
  X,
  Share
} from 'lucide-react';

interface CardItemProps {
  card: Card;
  collectionId: string;
  viewMode?: 'grid' | 'list' | 'compact';
  onDelete: () => void;
  onEdit: (card: Card) => void;
  onMove: (card: Card) => void;
  onAI?: (card: Card) => void;
}

export default function CardItem({
  card,
  collectionId,
  viewMode = 'grid',
  onDelete,
  onEdit,
  onMove,
  onAI
}: CardItemProps) {
  const isCompact = viewMode === 'compact';
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);

  // 监听全局菜单切换事件
  useEffect(() => {
    const handleToggleMenu = (e: CustomEvent<{ menuId: string }>) => {
      if (e.detail.menuId !== card.id && showMenu) {
        setShowMenu(false);
      }
    };
    window.addEventListener('toggle-menu' as keyof WindowEventMap, handleToggleMenu as EventListener);
    return () => window.removeEventListener('toggle-menu' as keyof WindowEventMap, handleToggleMenu as EventListener);
  }, [card.id, showMenu]);

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'card',
      cardId: card.id,
      sourceCollectionId: collectionId
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  // 点击打开链接
  const handleClick = (_e: React.MouseEvent) => {
    if (showMenu) {
      setShowMenu(false);
      return;
    }
    chrome.tabs.create({ url: card.url });
  };

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    window.dispatchEvent(new CustomEvent('toggle-menu', { detail: { menuId: card.id } }));
    setShowMenu(true);
  };

  // 关闭菜单
  useEffect(() => {
    const handleClickOutside = () => setShowMenu(false);
    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu]);

  // 复制链接
  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(card.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`flex items-center gap-2 bg-dark-800 hover:bg-dark-700 rounded-lg group cursor-pointer transition-colors ${
        isCompact ? 'p-1' : 'p-2'
      }`}
    >
      {/* 拖拽手柄区域 */}
      <div className={`flex items-center gap-2 flex-1 min-w-0`}>
        <div className={`flex-shrink-0 ${isCompact ? 'w-4 h-4' : 'w-5 h-5'}`}>
          {card.favicon ? (
            <img src={card.favicon} alt="" className="w-full h-full" />
          ) : (
            <div className={`w-full h-full bg-dark-600 rounded flex items-center justify-center text-dark-300 ${
              isCompact ? 'text-[8px]' : 'text-[10px]'
            }`}>
              {card.title.charAt(0) || '?'}
            </div>
          )}
        </div>
        <span className={`text-dark-300 truncate flex-1 ${
          isCompact ? 'text-xs' : 'text-sm'
        }`}>{card.title}</span>
      </div>

      {/* 操作按钮组 */}
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all">
        {/* 复制按钮 */}
        <button
          onClick={handleCopyUrl}
          className="p-1 hover:bg-dark-600 rounded text-dark-500 hover:text-indigo-400 transition-all"
          title="复制链接"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>

        {/* AI 分析按钮 */}
        {onAI && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onAI(card);
            }}
            className="p-1 hover:bg-dark-600 rounded text-dark-500 hover:text-indigo-400 transition-all"
            title="AI 分析"
          >
            <Sparkles size={12} />
          </button>
        )}

        {/* 编辑按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onEdit(card);
          }}
          className="p-1 hover:bg-dark-600 rounded text-dark-500 hover:text-indigo-400 transition-all"
          title="编辑"
        >
          <Share size={12} />
        </button>

        {/* 删除按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete();
          }}
          className="p-1 hover:bg-dark-600 rounded text-dark-500 hover:text-red-400 transition-all"
          title="删除"
        >
          <X size={12} />
        </button>
      </div>

      {/* 右键菜单 */}
      {showMenu && (
        <div
          className="fixed bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-50 py-1 min-w-[140px]"
          style={{ left: menuPosition.x, top: menuPosition.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onEdit(card);
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700"
          >
            <Edit size={14} />
            编辑
          </button>
          <button
            onClick={() => {
              onMove(card);
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700"
          >
            <Folder size={14} />
            移动到...
          </button>
          <button
            onClick={() => {
              onDelete();
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
  );
}
