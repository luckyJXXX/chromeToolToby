import { useState, useEffect, useCallback, useRef } from 'react';
import { Collection, Space, Card } from '../types';
import {
  Grid3X3,
  List,
  PanelLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  ExternalLink,
  MoreVertical,
  Trash2,
  Edit,
  GripVertical,
  X,
  Folder,
  Link2,
  Share,
  Copy,
  Check,
  Sparkles,
  Loader2
} from 'lucide-react';
import { getMiniMaxApiKey, analyzeContent, AIAnalysisResult } from '../services/ai';
import { extractPageContent } from '../services/chrome';
import { AddCardModal, EditCardModal, MoveCardModal, AIResultModal } from './modals';

interface MainContentProps {
  collections: Collection[];
  onCollectionsChange: (collections: Collection[]) => void;
  activeSpace?: Space;
  allCollections: Collection[];
  spaces?: Space[];
  onTabDropped?: (tabId: number) => void;
  // 模态框控制
  modalAddCardTo?: string | null;
  onModalAddCardChange?: (collectionId: string | null) => void;
  modalEditingCard?: { card: Card; collectionId: string } | null;
  onModalEditingCardChange?: (card: { card: Card; collectionId: string } | null) => void;
  modalMovingCard?: { card: Card; collectionId: string } | null;
  onModalMovingCardChange?: (card: { card: Card; collectionId: string } | null) => void;
}

// 可排序的 Collection 组件
function SortableCollection({
  collection,
  onUpdate,
  onDelete,
  onOpenAll,
  onAddCard,
  onEditCard,
  onMoveCard,
  onAICard,
  viewMode,
  onDrop
}: {
  collection: Collection;
  onUpdate: (collection: Collection) => void;
  onDelete: (collectionId: string) => void;
  onOpenAll: (collection: Collection) => void;
  onAddCard: (collectionId: string) => void;
  onEditCard: (card: Card, collectionId: string) => void;
  onMoveCard: (card: Card, collectionId: string) => void;
  onAICard?: (card: Card, collectionId: string) => void;
  viewMode?: 'grid' | 'list' | 'compact';
  onDrop?: (collectionId: string, e: React.DragEvent) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(collection.name);

  // 监听全局菜单切换事件，关闭其他菜单
  useEffect(() => {
    const handleToggleMenu = (e: CustomEvent<{ menuId: string }>) => {
      if (e.detail.menuId !== collection.id && showMenu) {
        setShowMenu(false);
      }
    };
    window.addEventListener('toggle-menu' as keyof WindowEventMap, handleToggleMenu as EventListener);
    return () => window.removeEventListener('toggle-menu' as keyof WindowEventMap, handleToggleMenu as EventListener);
  }, [collection.id, showMenu]);

  const handleSave = () => {
    onUpdate({ ...collection, name: editName });
    setIsEditing(false);
  };

  // 处理外部拖拽（从右侧面板拖入的标签页）- 使用原生事件
  const handleNativeDragOver = (e: React.DragEvent) => {
    // 调试：打印 dragover
    console.log('[Collection] DragOver:', collection.id);

    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleNativeDragEnter = (_e: React.DragEvent) => {
    // 调试：打印 dragenter
    console.log('[Collection] DragEnter:', collection.id);
  };

  const handleNativeDragLeave = (_e: React.DragEvent) => {
    // 调试：打印 dragleave
    console.log('[Collection] DragLeave:', collection.id);
  };

  const handleNativeDrop = (e: React.DragEvent) => {
    // 调试：打印 drop
    console.log('[Collection] Drop:', collection.id);

    e.preventDefault();

    // 尝试获取数据
    const dataStr = e.dataTransfer?.getData('text/plain');
    console.log('[Collection] Drop data:', dataStr);

    if (onDrop) {
      onDrop(collection.id, e);
    }
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
          onClick={(e) => {
            e.stopPropagation();
            onOpenAll(collection);
          }}
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

      {/* Cards 列表 - 也是 droppable 区域 */}
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
                  onDelete={() => {
                    const updated = {
                      ...collection,
                      cards: collection.cards.filter(c => c.id !== card.id)
                    };
                    onUpdate(updated);
                  }}
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

// 卡片组件 - 支持拖拽和右键菜单
function CardItem({
  card,
  collectionId,
  onDelete,
  onEdit,
  onMove,
  onAI,
  viewMode = 'grid'
}: {
  card: Card;
  collectionId: string;
  onDelete: () => void;
  onEdit: (card: Card) => void;
  onMove: (card: Card) => void;
  onAI?: (card: Card) => void;
  viewMode?: 'grid' | 'list' | 'compact';
}) {
  const isCompact = viewMode === 'compact';
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);

  // 监听全局菜单切换事件，关闭其他菜单
  useEffect(() => {
    const handleToggleMenu = (e: CustomEvent<{ menuId: string }>) => {
      if (e.detail.menuId !== card.id && showMenu) {
        setShowMenu(false);
      }
    };
    window.addEventListener('toggle-menu' as keyof WindowEventMap, handleToggleMenu as EventListener);
    return () => window.removeEventListener('toggle-menu' as keyof WindowEventMap, handleToggleMenu as EventListener);
  }, [card.id, showMenu]);

  // 简化拖拽：使用原生 HTML5 拖拽
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'card',
      cardId: card.id,
      sourceCollectionId: collectionId
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  // 处理打开链接
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
      <div
        className={`flex items-center gap-2 flex-1 min-w-0 ${isCompact ? '' : ''}`}
      >
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
          onClick={async (e) => {
            e.stopPropagation();
            e.preventDefault();
            try {
              await navigator.clipboard.writeText(card.url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch (err) {
              console.error('复制失败:', err);
            }
          }}
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
        {/* 分享/编辑按钮 */}
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

export default function MainContent({
  collections,
  onCollectionsChange,
  activeSpace,
  allCollections,
  spaces,
  onTabDropped,
  modalAddCardTo,
  onModalAddCardChange,
  modalEditingCard,
  onModalEditingCardChange,
  modalMovingCard,
  onModalMovingCardChange
}: MainContentProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  const [, setMenuOpenId] = useState<string | null>(null);

  // 使用 props 传入的模态框状态，如果没传入则使用内部状态
  const [internalAddCardTo, setInternalAddCardTo] = useState<string | null>(null);
  const addCardTo = modalAddCardTo !== undefined ? modalAddCardTo : internalAddCardTo;
  const setAddCardTo = onModalAddCardChange || setInternalAddCardTo;

  const [internalEditingCard, setInternalEditingCard] = useState<{ card: Card; collectionId: string } | null>(null);
  const editingCard = modalEditingCard !== undefined ? modalEditingCard : internalEditingCard;
  const setEditingCard = onModalEditingCardChange || setInternalEditingCard;

  const [internalMovingCard, setInternalMovingCard] = useState<{ card: Card; collectionId: string } | null>(null);
  const movingCard = modalMovingCard !== undefined ? modalMovingCard : internalMovingCard;
  const setMovingCard = onModalMovingCardChange || setInternalMovingCard;

  // 全局菜单关闭 - 当打开一个新菜单时关闭其他菜单
  useEffect(() => {
    const handleMenuToggle = (e: CustomEvent<{ menuId: string }>) => {
      setMenuOpenId(prev => prev === e.detail.menuId ? null : e.detail.menuId);
    };
    window.addEventListener('toggle-menu' as keyof WindowEventMap, handleMenuToggle as EventListener);
    return () => window.removeEventListener('toggle-menu' as keyof WindowEventMap, handleMenuToggle as EventListener);
  }, []);

  // AI 分析状态
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [aiResultCard, setAiResultCard] = useState<{ card: Card; collectionId: string } | null>(null);

  // 文档级别的拖拽监听 - 确保捕获所有 drop 事件
  useEffect(() => {
    const handleDocumentDrop = (e: DragEvent) => {
      console.log('[Document] Drop event captured');
      e.preventDefault();

      const dataStr = e.dataTransfer?.getData('text/plain');
      console.log('[Document] Drop data:', dataStr);

      if (dataStr) {
        try {
          const data = JSON.parse(dataStr);
          if (data.type === 'tab') {
            // 找到用户实际放置的目标集合
            const targetElement = (e.target as HTMLElement).closest('[data-collection-id]');
            let collectionId: string;

            if (targetElement) {
              // 用户放置到了具体的集合
              collectionId = targetElement.getAttribute('data-collection-id') || collections[0].id;
              console.log('[Document] Dropped on collection:', collectionId);
            } else {
              // 没有放置到具体集合，默认第一个
              collectionId = collections[0].id;
              console.log('[Document] No specific collection, using first:', collectionId);
            }

            const targetCollection = allCollections.find(c => c.id === collectionId);
            if (targetCollection && data.url) {
              const newCard: Card = {
                id: `card-${Date.now()}`,
                url: data.url,
                title: data.title || '无标题',
                favicon: data.favIconUrl,
                createdAt: Date.now(),
                updatedAt: Date.now()
              };

              const updatedCollection = {
                ...targetCollection,
                cards: [...targetCollection.cards, newCard],
                updatedAt: Date.now()
              };

              const newCollections = allCollections.map(c =>
                c.id === targetCollection.id ? updatedCollection : c
              );

              onCollectionsChange(newCollections);
              console.log('[Document] Card added to collection:', targetCollection.name);

              // 关闭原始标签页
              if (data.tabId) {
                chrome.tabs.remove(data.tabId).catch(() => {});
              }
            }
          }
        } catch (err) {
          console.error('[Document] Drop error:', err);
        }
      }
    };

    const handleDocumentDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
    };

    document.addEventListener('dragover', handleDocumentDragOver);
    document.addEventListener('drop', handleDocumentDrop);

    return () => {
      document.removeEventListener('dragover', handleDocumentDragOver);
      document.removeEventListener('drop', handleDocumentDrop);
    };
  }, [collections, allCollections, onCollectionsChange]);
  const [_aiProgress, setAiProgress] = useState({ current: 0, total: 0 });

  // ========== 拖拽状态管理 ==========
  // 使用 ref 来存储拖拽状态，避免触发不必要的重渲染
  const isDraggingFromRightRef = useRef(false);
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Step 3: onDrop - 仅提取数据，异步处理更新
  const handleExternalDrop = useCallback(async (collectionId: string, e: React.DragEvent) => {
    console.log('[handleExternalDrop] Called with collectionId:', collectionId);
    e.preventDefault();

    try {
      const dataStr = e.dataTransfer?.getData('text/plain');
      console.log('[handleExternalDrop] Raw data:', dataStr);
      if (!dataStr) {
        console.log('[handleExternalDrop] No data found');
        return;
      }

      const data = JSON.parse(dataStr);
      console.log('[handleExternalDrop] Parsed data:', data);

      if (data.type === 'tab') {
        console.log('[handleExternalDrop] Processing tab drop');
        // 找到目标 Collection
        const targetCollection = allCollections.find(c => c.id === collectionId);
        console.log('[handleExternalDrop] Target collection:', targetCollection);

        if (targetCollection && data.url) {
          console.log('[handleExternalDrop] Adding card to collection');
          // 创建新卡片
          const newCard: Card = {
            id: `card-${Date.now()}`,
            url: data.url,
            title: data.title || '无标题',
            favicon: data.favIconUrl,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };

          // 添加到目标 Collection
          const updatedCollection = {
            ...targetCollection,
            cards: [...targetCollection.cards, newCard],
            updatedAt: Date.now()
          };

          const newCollections = allCollections.map(c =>
            c.id === targetCollection.id ? updatedCollection : c
          );

          console.log('[handleExternalDrop] Calling onCollectionsChange');
          // 使用防抖机制：200ms 后才触发存储
          if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
          }

          dragTimeoutRef.current = setTimeout(() => {
            // Step 4: updateState - 异步处理数据更新
            onCollectionsChange(newCollections);

            // 关闭原始标签页（异步）
            if (data.tabId && typeof data.tabId === 'number') {
              chrome.tabs.remove(data.tabId).catch(() => {});
              onTabDropped?.(data.tabId);
            }
          }, 200);
        }
      }
    } catch (err) {
      console.error('Drop error:', err);
      // 确保即使发生错误也停止传播
      e.stopPropagation();
    } finally {
      // 清理状态
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }
      isDraggingFromRightRef.current = false;
    }
  }, [allCollections, onCollectionsChange, onTabDropped]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  // 处理卡片跨集合拖拽
  const handleCardMove = useCallback((cardId: string, sourceCollectionId: string, targetCollectionId: string) => {
    const sourceCollection = allCollections.find(c => c.id === sourceCollectionId);
    const targetCollection = allCollections.find(c => c.id === targetCollectionId);

    if (sourceCollection && targetCollection) {
      const card = sourceCollection.cards.find(c => c.id === cardId);
      if (card) {
        // 从原集合删除
        const newSourceCards = sourceCollection.cards.filter(c => c.id !== cardId);
        const newSourceCollection = { ...sourceCollection, cards: newSourceCards, updatedAt: Date.now() };

        // 添加到目标集合
        const newTargetCards = [...targetCollection.cards, { ...card, updatedAt: Date.now() }];
        const newTargetCollection = { ...targetCollection, cards: newTargetCards, updatedAt: Date.now() };

        const newCollections = allCollections.map(c => {
          if (c.id === sourceCollectionId) return newSourceCollection;
          if (c.id === targetCollectionId) return newTargetCollection;
          return c;
        });

        onCollectionsChange(newCollections);
      }
    }
  }, [allCollections, onCollectionsChange]);

  const handleAddCollection = () => {
    const newCollection: Collection = {
      id: `collection-${Date.now()}`,
      spaceId: activeSpace?.id || 'default',
      name: '新集合',
      cards: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    // 使用 allCollections 而不是 collections，避免数据丢失
    const newCollections = [...allCollections, newCollection];
    onCollectionsChange(newCollections);
  };

  const handleUpdateCollection = (updated: Collection) => {
    // 使用 allCollections 而不是 collections，避免数据丢失
    const newCollections = allCollections.map(c =>
      c.id === updated.id ? updated : c
    );
    onCollectionsChange(newCollections);
  };

  const handleDeleteCollection = (collectionId: string) => {
    // 使用 allCollections 而不是 collections，避免数据丢失
    const newCollections = allCollections.filter(c => c.id !== collectionId);
    onCollectionsChange(newCollections);
  };

  const handleOpenAll = (collection: Collection) => {
    collection.cards.forEach(card => {
      chrome.tabs.create({ url: card.url, active: false });
    });
  };

  const handleAddCard = (collectionId: string) => {
    setAddCardTo(collectionId);
  };

  const handleCardAdded = (url: string, title: string) => {
    if (!addCardTo) return;

    const targetCollection = allCollections.find(c => c.id === addCardTo);
    if (targetCollection) {
      const newCard: Card = {
        id: `card-${Date.now()}`,
        url,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const updatedCollection = {
        ...targetCollection,
        cards: [...targetCollection.cards, newCard],
        updatedAt: Date.now()
      };

      const newCollections = allCollections.map(c =>
        c.id === targetCollection.id ? updatedCollection : c
      );

      onCollectionsChange(newCollections);
    }
    setAddCardTo(null);
  };

  // 编辑卡片
  const handleEditCard = (card: Card, collectionId: string) => {
    setEditingCard({ card, collectionId });
  };

  const handleSaveEditedCard = (url: string, title: string, description?: string, shortUrl?: string, targetCollectionId?: string) => {
    if (!editingCard) return;

    const { card, collectionId } = editingCard;
    const sourceCollection = allCollections.find(c => c.id === collectionId);
    const targetId = targetCollectionId || collectionId;
    const targetCollection = allCollections.find(c => c.id === targetId);

    if (!sourceCollection || !targetCollection) return;

    if (targetCollectionId && targetCollectionId !== collectionId) {
      // 移动到另一个集合
      const updatedCard = { ...card, url, title, description, shortUrl, updatedAt: Date.now() };

      // 从原集合中移除
      const newSourceCards = sourceCollection.cards.filter(c => c.id !== card.id);
      const newSourceCollection = { ...sourceCollection, cards: newSourceCards, updatedAt: Date.now() };

      // 添加到目标集合
      const newTargetCards = [...targetCollection.cards, updatedCard];
      const newTargetCollection = { ...targetCollection, cards: newTargetCards, updatedAt: Date.now() };

      const newCollections = allCollections.map(c => {
        if (c.id === sourceCollection.id) return newSourceCollection;
        if (c.id === targetCollection.id) return newTargetCollection;
        return c;
      });

      onCollectionsChange(newCollections);
    } else {
      // 同一集合内编辑
      const updatedCards = targetCollection.cards.map(c =>
        c.id === card.id ? { ...c, url, title, description, shortUrl, updatedAt: Date.now() } : c
      );

      const updatedCollection = {
        ...targetCollection,
        cards: updatedCards,
        updatedAt: Date.now()
      };

      const newCollections = allCollections.map(c =>
        c.id === targetCollection.id ? updatedCollection : c
      );

      onCollectionsChange(newCollections);
    }
    setEditingCard(null);
  };

  // 删除编辑中的卡片
  const handleDeleteEditingCard = () => {
    if (!editingCard) return;

    const { card, collectionId } = editingCard;
    const targetCollection = allCollections.find(c => c.id === collectionId);
    if (targetCollection) {
      const updatedCards = targetCollection.cards.filter(c => c.id !== card.id);

      const updatedCollection = {
        ...targetCollection,
        cards: updatedCards,
        updatedAt: Date.now()
      };

      const newCollections = allCollections.map(c =>
        c.id === targetCollection.id ? updatedCollection : c
      );

      onCollectionsChange(newCollections);
    }
    setEditingCard(null);
  };

  // 移动卡片
  const handleMoveCard = (card: Card, collectionId: string) => {
    setMovingCard({ card, collectionId });
  };

  const handleCardMoved = (targetCollectionId: string) => {
    if (!movingCard) return;

    const { card, collectionId: sourceCollectionId } = movingCard;
    const sourceCollection = allCollections.find(c => c.id === sourceCollectionId);
    const targetCollection = allCollections.find(c => c.id === targetCollectionId);

    if (sourceCollection && targetCollection) {
      // 从原集合删除
      const updatedSourceCards = sourceCollection.cards.filter(c => c.id !== card.id);
      const updatedSourceCollection = {
        ...sourceCollection,
        cards: updatedSourceCards,
        updatedAt: Date.now()
      };

      // 添加到目标集合
      const updatedTargetCollection = {
        ...targetCollection,
        cards: [...targetCollection.cards, { ...card, updatedAt: Date.now() }],
        updatedAt: Date.now()
      };

      const newCollections = allCollections.map(c => {
        if (c.id === sourceCollectionId) return updatedSourceCollection;
        if (c.id === targetCollectionId) return updatedTargetCollection;
        return c;
      });

      onCollectionsChange(newCollections);
    }
    setMovingCard(null);
  };

  // AI 分析单个卡片
  const handleAICard = async (card: Card, collectionId: string) => {
    const apiKey = await getMiniMaxApiKey();
    if (!apiKey) {
      alert('请先在左下角"设置"中配置 MiniMax API Key');
      return;
    }

    setAiAnalyzing(true);
    setAiProgress({ current: 0, total: 1 });

    try {
      // 通过 chrome.tabs API 获取对应标签页的内容
      const tabs = await chrome.tabs.query({ url: card.url });
      let content = '';

      if (tabs.length > 0) {
        // 如果标签页已打开，提取内容
        content = await extractPageContent(tabs[0].id || 0);
      }

      let result: AIAnalysisResult;

      if (content && content.length > 50) {
        result = await analyzeContent(content, card.title, apiKey);
      } else {
        // 如果无法提取内容，返回提示
        result = {
          summary: '无法提取页面内容，请确保页面已加载完成后再试。',
          keywords: [],
          category: '未知'
        };
      }

      setAiResult(result);
      setAiResultCard({ card, collectionId });
    } catch (error) {
      console.error('AI 分析失败:', error);
      setAiResult({
        summary: '分析失败: ' + (error as Error).message,
        keywords: [],
        category: '错误'
      });
      setAiResultCard({ card, collectionId });
    }

    setAiAnalyzing(false);
  };

  // 应用 AI 结果到卡片
  const handleApplyAIResult = () => {
    if (!aiResult || !aiResultCard) return;

    const { card, collectionId } = aiResultCard;
    const targetCollection = allCollections.find(c => c.id === collectionId);

    if (targetCollection) {
      // 将 AI 结果组合成描述
      const description = [
        aiResult.title ? `标题: ${aiResult.title}` : '',
        `摘要: ${aiResult.summary}`,
        aiResult.keywords.length > 0 ? `关键词: ${aiResult.keywords.join(', ')}` : '',
        `分类: ${aiResult.category}`
      ].filter(Boolean).join('\n');

      const updatedCards = targetCollection.cards.map(c =>
        c.id === card.id
          ? {
              ...c,
              title: aiResult.title || c.title,
              description,
              updatedAt: Date.now()
            }
          : c
      );

      const updatedCollection = {
        ...targetCollection,
        cards: updatedCards,
        updatedAt: Date.now()
      };

      const newCollections = allCollections.map(c =>
        c.id === targetCollection.id ? updatedCollection : c
      );

      onCollectionsChange(newCollections);
    }

    setAiResult(null);
    setAiResultCard(null);
  };

  // 关闭 AI 结果弹窗
  const handleCloseAIResult = () => {
    setAiResult(null);
    setAiResultCard(null);
  };

  return (
    <main className="flex-1 h-full flex flex-col bg-dark-950 overflow-hidden">
      {/* 顶部功能区 */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-dark-800">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-dark-100">
            {activeSpace?.name || '我的收藏'}
          </h1>
          <span className="text-sm text-dark-500">
            {collections.length} 个集合
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (viewMode === 'grid') setViewMode('list');
              else if (viewMode === 'list') setViewMode('compact');
              else setViewMode('grid');
            }}
            className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-800 rounded-lg"
            title={viewMode === 'grid' ? '切换到列表视图' : viewMode === 'list' ? '切换到紧凑视图' : '切换到网格视图'}
          >
            {viewMode === 'grid' ? <Grid3X3 size={18} /> : viewMode === 'list' ? <PanelLeft size={18} /> : <List size={18} />}
          </button>

          <button
            onClick={handleAddCollection}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            添加集合
          </button>
        </div>
      </header>

      {/* Collections 列表 - 使用纯原生 HTML5 拖拽 */}
      <div
        id="collections-container"
        className="flex-1 overflow-y-auto p-6"
        onDragOver={(e) => {
          console.log('[MainContent] DragOver fired');
          // 关键：允许 drop
          e.preventDefault();
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move';
          }
        }}
        onDragEnter={(e) => {
          console.log('[MainContent] DragEnter fired');
          e.preventDefault();
        }}
        onDragLeave={(_e) => {
          console.log('[MainContent] DragLeave fired');
        }}
        onDrop={(e) => {
          console.log('[MainContent] Drop fired on container');
          // 处理从右侧面板拖入的标签页
          e.preventDefault();
          const dataStr = e.dataTransfer?.getData('text/plain');
          console.log('[MainContent] Drop data:', dataStr);
          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);
              console.log('[MainContent] Parsed data:', data);
              if (data.type === 'tab' && collections.length > 0) {
                // 找到目标集合
                const targetElement = (e.target as HTMLElement).closest('[data-collection-id]');
                let collectionId: string;
                if (targetElement) {
                  collectionId = targetElement.getAttribute('data-collection-id') || collections[0].id;
                } else {
                  collectionId = collections[0].id;
                }
                console.log('[MainContent] Adding tab to collection:', collectionId);
                handleExternalDrop(collectionId, e);
              } else if (data.type === 'card') {
                // 处理卡片的跨集合拖拽
                const targetCollectionId = (e.target as HTMLElement).closest('[data-collection-id]')?.getAttribute('data-collection-id');
                if (targetCollectionId && data.sourceCollectionId !== targetCollectionId) {
                  handleCardMove(data.cardId, data.sourceCollectionId, targetCollectionId);
                }
              }
            } catch (err) {
              console.error('Drop error:', err);
            }
          }
        }}
      >
        <div className="space-y-4">
          {collections.map((collection) => (
            <SortableCollection
              key={collection.id}
              collection={collection}
              onUpdate={handleUpdateCollection}
              onDelete={handleDeleteCollection}
              onOpenAll={handleOpenAll}
              onAddCard={handleAddCard}
              onEditCard={handleEditCard}
              onMoveCard={handleMoveCard}
              onAICard={handleAICard}
              viewMode={viewMode}
              onDrop={handleExternalDrop}
            />
          ))}
        </div>

        {collections.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-dark-500">
            <Folder size={48} className="mb-4 opacity-50" />
            <p className="text-lg mb-2">还没有集合</p>
            <p className="text-sm mb-4">点击"添加集合"开始组织你的标签页</p>
            <button
              onClick={handleAddCollection}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm"
            >
              <Plus size={16} />
              添加集合
            </button>
          </div>
        )}
      </div>

      {/* 手动添加链接弹窗 */}
      <AddCardModal
        isOpen={!!addCardTo}
        onClose={() => setAddCardTo(null)}
        onAdd={handleCardAdded}
      />

      {/* 编辑卡片弹窗 */}
      <EditCardModal
        isOpen={!!editingCard}
        card={editingCard?.card || null}
        onClose={() => setEditingCard(null)}
        onSave={handleSaveEditedCard}
        onDelete={handleDeleteEditingCard}
        allCollections={allCollections}
        currentCollectionId={editingCard?.collectionId}
        spaces={spaces}
      />

      {/* 移动卡片弹窗 */}
      <MoveCardModal
        isOpen={!!movingCard}
        card={movingCard?.card || null}
        collections={allCollections}
        currentCollectionId={movingCard?.collectionId || ''}
        onClose={() => setMovingCard(null)}
        onMove={handleCardMoved}
      />

      {/* AI 分析结果弹窗 */}
      <AIResultModal
        isOpen={!!aiResult}
        result={aiResult}
        onClose={handleCloseAIResult}
        onApply={handleApplyAIResult}
      />

      {/* AI 分析中加载提示 */}
      {aiAnalyzing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl p-6 border border-dark-700 flex items-center gap-3">
            <Loader2 size={20} className="text-indigo-400 animate-spin" />
            <span className="text-dark-100">AI 分析中...</span>
          </div>
        </div>
      )}
    </main>
  );
}
