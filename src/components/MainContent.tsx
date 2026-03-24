import { useState, useEffect, useCallback, useRef } from 'react';
import { Collection, Space, Card } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { getMiniMaxApiKey, analyzeContent, extractPageContent, AIAnalysisResult } from '../utils/ai';
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
  isOver,
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
  isOver?: boolean;
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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: collection.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const handleSave = () => {
    onUpdate({ ...collection, name: editName });
    setIsEditing(false);
  };

  // 处理外部拖拽（从右侧面板拖入的标签页）- 使用原生事件
  const handleNativeDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleNativeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDrop) {
      onDrop(collection.id, e);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-collection-id={collection.id}
      onDragOver={handleNativeDragOver}
      onDrop={handleNativeDrop}
      className={`bg-dark-800/50 rounded-xl border transition-all ${
        isOver
          ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-600/10'
          : 'border-dark-700/50'
      }`}
    >
      {/* Collection 标题栏 */}
      <div className="flex items-center gap-2 p-4 border-b border-dark-700/50">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-dark-500 hover:text-dark-300"
        >
          <GripVertical size={16} />
        </button>

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

  // 拖拽功能
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { type: 'card', card, sourceCollectionId: collectionId }
  });

  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto'
  } : undefined;

  // 处理打开链接
  const handleClick = (_e: React.MouseEvent) => {
    // 如果正在拖拽，不触发点击
    if (isDragging) return;

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
      style={style}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`flex items-center gap-2 bg-dark-800 hover:bg-dark-700 rounded-lg group cursor-pointer transition-colors ${
        isCompact ? 'p-1' : 'p-2'
      }`}
    >
      {/* 拖拽手柄区域 */}
      <div
        ref={setDragRef}
        {...attributes}
        {...listeners}
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
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
  const [_aiProgress, setAiProgress] = useState({ current: 0, total: 0 });

  // ========== 拖拽状态管理 ==========
  // 使用 ref 来存储拖拽状态，避免触发不必要的重渲染
  const isDraggingFromRightRef = useRef(false);
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Step 3: onDrop - 仅提取数据，异步处理更新
  const handleExternalDrop = useCallback(async (collectionId: string, e: React.DragEvent) => {
    e.preventDefault();

    try {
      // 确保 stopPropagation 被调用
      e.stopPropagation();

      const dataStr = e.dataTransfer?.getData('text/plain');
      if (!dataStr) return;

      const data = JSON.parse(dataStr);

      if (data.type === 'tab') {
        // 找到目标 Collection
        const targetCollection = allCollections.find(c => c.id === collectionId);

        if (targetCollection && data.url) {
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10 // 需要移动 10px 才能激活拖拽
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    // 检测是否是外部拖拽（从右侧面板拖入的标签页）
    const externalDragData = (window as any).__TOBY_EXTERNAL_DRAG__;
    if (externalDragData) {
      // 外部拖拽开始，设置 dnd-kit 的 active 数据
      event.active.data.current = {
        isExternal: true,
        externalData: externalDragData
      };
      isDraggingFromRightRef.current = true;
    }
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: { over: { id: string | number } | null }) => {
    if (event.over) {
      setOverId(event.over.id?.toString() || null);
    } else {
      setOverId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // 处理外部拖拽（从右侧面板拖入的标签页）
    const activeData = active?.data?.current;
    if (activeData?.isExternal && over) {
      // 外部拖拽结束，将标签添加到目标集合
      const targetCollectionId = over.id.toString();
      const externalData = activeData.externalData;

      if (externalData && externalData.type === 'tab') {
        const targetCollection = allCollections.find(c => c.id === targetCollectionId);
        if (targetCollection && externalData.url) {
          const newCard: Card = {
            id: `card-${Date.now()}`,
            url: externalData.url,
            title: externalData.title || '无标题',
            favicon: externalData.favIconUrl,
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

          // 关闭原始标签页
          if (externalData.tabId) {
            try {
              await chrome.tabs.remove(externalData.tabId);
            } catch (e) {
              console.error('关闭标签页失败:', e);
            }
          }
        }
      }
    }

    // 处理卡片的跨集合拖拽
    if (over && active.data.current?.type === 'card') {
      const card = active.data.current.card as Card;
      const sourceCollectionId = active.data.current.sourceCollectionId as string;
      const targetCollectionId = over.id.toString().replace('drop-', '');

      if (sourceCollectionId && targetCollectionId && sourceCollectionId !== targetCollectionId) {
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

        setActiveId(null);
        setOverId(null);
        return;
      }
    }

    // 处理 Collection 排序
    if (over && active.id !== over.id) {
      const oldIndex = collections.findIndex(c => c.id === active.id);
      const newIndex = collections.findIndex(c => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newCollections = arrayMove(collections, oldIndex, newIndex);
        onCollectionsChange(newCollections);
      }
    }

    setActiveId(null);
    setOverId(null);
  };

  const handleAddCollection = () => {
    const newCollection: Collection = {
      id: `collection-${Date.now()}`,
      spaceId: activeSpace?.id || 'default',
      name: '新集合',
      cards: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const newCollections = [...collections, newCollection];
    onCollectionsChange(newCollections);
  };

  const handleUpdateCollection = (updated: Collection) => {
    const newCollections = collections.map(c =>
      c.id === updated.id ? updated : c
    );
    onCollectionsChange(newCollections);
  };

  const handleDeleteCollection = (collectionId: string) => {
    const newCollections = collections.filter(c => c.id !== collectionId);
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

      {/* Collections 列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          autoScroll={false}
        >
          <SortableContext
            items={collections.map(c => c.id)}
            strategy={verticalListSortingStrategy}
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
                  isOver={overId === collection.id}
                  viewMode={viewMode}
                  onDrop={handleExternalDrop}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeId ? (
              <div className="bg-dark-800 rounded-xl border-2 border-indigo-500 p-4 opacity-80">
                移动中...
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

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
