import { useState, useEffect, useRef } from 'react';
import { Collection, Space, Card, ChromeTab } from '../types';
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
  useDroppable,
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
  Link,
  Link2
} from 'lucide-react';
import { saveCollections } from '../utils/storage';

interface MainContentProps {
  collections: Collection[];
  onCollectionsChange: (collections: Collection[]) => void;
  activeSpace?: Space;
  allCollections: Collection[];
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
  isOver
}: {
  collection: Collection;
  onUpdate: (collection: Collection) => void;
  onDelete: (collectionId: string) => void;
  onOpenAll: (collection: Collection) => void;
  onAddCard: (collectionId: string) => void;
  onEditCard: (card: Card, collectionId: string) => void;
  onMoveCard: (card: Card, collectionId: string) => void;
  isOver?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(collection.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: collection.id });

  // 添加 droppable 功能
  const { setNodeRef: setDropNodeRef, isOver: isDropOver } = useDroppable({
    id: `drop-${collection.id}`,
    data: { type: 'collection', collection }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const handleSave = () => {
    onUpdate({ ...collection, name: editName });
    setIsEditing(false);
  };

  const isHighlighted = isOver || isDropOver;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-collection-id={collection.id}
      className={`bg-dark-800/50 rounded-xl border transition-all ${
        isHighlighted
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

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
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
          ref={setDropNodeRef}
          data-collection-id={collection.id}
          className={`p-4 min-h-[100px] transition-colors ${
            isDropOver ? 'bg-indigo-600/10' : ''
          }`}
        >
          {collection.cards.length === 0 ? (
            <div className="text-center py-8 text-dark-500 text-sm border-2 border-dashed border-dark-700 rounded-lg">
              拖拽标签页到这里保存
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {collection.cards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  collectionId={collection.id}
                  onDelete={() => {
                    const updated = {
                      ...collection,
                      cards: collection.cards.filter(c => c.id !== card.id)
                    };
                    onUpdate(updated);
                  }}
                  onEdit={(editedCard) => onEditCard(editedCard, collection.id)}
                  onMove={(moveCard) => onMoveCard(moveCard, collection.id)}
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
  onMove
}: {
  card: Card;
  collectionId: string;
  onDelete: () => void;
  onEdit: (card: Card) => void;
  onMove: (card: Card) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // 拖拽功能
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { type: 'card', card, sourceCollectionId: collectionId }
  });

  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto'
  } : undefined;

  // 处理打开链接
  const handleClick = (e: React.MouseEvent) => {
    if (showMenu) {
      setShowMenu(false);
      return;
    }
    e.preventDefault();
    chrome.tabs.create({ url: card.url });
  };

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
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
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2 p-2 bg-dark-800 hover:bg-dark-700 rounded-lg group cursor-pointer transition-colors"
    >
      <div className="w-5 h-5 flex-shrink-0">
        {card.favicon ? (
          <img src={card.favicon} alt="" className="w-full h-full" />
        ) : (
          <div className="w-full h-full bg-dark-600 rounded flex items-center justify-center text-[10px] text-dark-300">
            {card.title.charAt(0) || '?'}
          </div>
        )}
      </div>
      <span className="text-sm text-dark-300 truncate flex-1">{card.title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-dark-600 rounded text-dark-500 hover:text-red-400 transition-all"
      >
        <X size={12} />
      </button>

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

// 手动添加链接的弹窗
function AddCardModal({
  isOpen,
  onClose,
  onAdd
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (url: string, title: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onAdd(url, title || url);
      setUrl('');
      setTitle('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-xl p-6 w-96 border border-dark-700">
        <h3 className="text-lg font-medium text-dark-100 mb-4">手动添加链接</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-dark-400 mb-1">网址 *</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-dark-400 mb-1">标题（可选）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入标题"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
            >
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 编辑卡片的弹窗
function EditCardModal({
  isOpen,
  card,
  onClose,
  onSave
}: {
  isOpen: boolean;
  card: Card | null;
  onClose: () => void;
  onSave: (url: string, title: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (card) {
      setUrl(card.url);
      setTitle(card.title);
    }
  }, [card]);

  if (!isOpen || !card) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSave(url, title || url);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-xl p-6 w-96 border border-dark-700">
        <h3 className="text-lg font-medium text-dark-100 mb-4">编辑链接</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-dark-400 mb-1">网址 *</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-dark-400 mb-1">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入标题"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 移动卡片的弹窗
function MoveCardModal({
  isOpen,
  card,
  collections,
  currentCollectionId,
  onClose,
  onMove
}: {
  isOpen: boolean;
  card: Card | null;
  collections: Collection[];
  currentCollectionId: string;
  onClose: () => void;
  onMove: (targetCollectionId: string) => void;
}) {
  if (!isOpen || !card) return null;

  // 排除当前所在的 Collection
  const availableCollections = collections.filter(c => c.id !== currentCollectionId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-xl p-6 w-80 max-h-[80vh] overflow-y-auto border border-dark-700">
        <h3 className="text-lg font-medium text-dark-100 mb-4">移动到...</h3>
        {availableCollections.length === 0 ? (
          <p className="text-dark-500 text-sm py-4">没有其他集合可移动</p>
        ) : (
          <div className="space-y-1">
            {availableCollections.map(collection => (
              <button
                key={collection.id}
                onClick={() => {
                  onMove(collection.id);
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700 rounded-lg text-left"
              >
                <Folder size={14} className="text-indigo-400" />
                {collection.name}
                <span className="text-dark-500 text-xs ml-auto">
                  {collection.cards.length} 个链接
                </span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600"
        >
          取消
        </button>
      </div>
    </div>
  );
}

export default function MainContent({
  collections,
  onCollectionsChange,
  activeSpace,
  allCollections
}: MainContentProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [addCardTo, setAddCardTo] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  // 编辑卡片状态
  const [editingCard, setEditingCard] = useState<{ card: Card; collectionId: string } | null>(null);

  // 移动卡片状态
  const [movingCard, setMovingCard] = useState<{ card: Card; collectionId: string } | null>(null);

  // 全局拖拽处理 - 处理从右侧面板拖入的标签页
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();

      const dataStr = e.dataTransfer!.getData('text/plain');
      if (!dataStr) return;

      try {
        const data = JSON.parse(dataStr);

        if (data.type === 'tab') {
          // 找到目标 Collection
          const target = e.target as HTMLElement;
          const collectionEl = target.closest('[data-collection-id]');

          if (collectionEl) {
            const collectionId = collectionEl.getAttribute('data-collection-id');
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

              onCollectionsChange(newCollections);

              // 保留原标签页，不再关闭
              // if (data.tabId) {
              //   await chrome.tabs.remove(data.tabId);
              // }
            }
          }
        }
      } catch (err) {
        console.error('Drop error:', err);
      }
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, [allCollections, onCollectionsChange]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: { over: { id: string } | null }) => {
    setOverId(event.over?.id || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // 处理从右侧面板拖入的标签页
    if (over && active.data.current?.type === 'tab') {
      const tab = active.data.current.tab;
      const collectionId = over.id.toString().replace('drop-', '');
      const targetCollection = allCollections.find(c => c.id === collectionId);

      if (targetCollection && tab) {
        // 创建新卡片
        const newCard: Card = {
          id: `card-${Date.now()}`,
          url: tab.url,
          title: tab.title || '无标题',
          favicon: tab.favIconUrl,
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

        onCollectionsChange(newCollections);

        // 关闭原始标签页（不再默认关闭，保留原页面）
        // chrome.tabs.remove(tab.id);

        setActiveId(null);
        setOverId(null);
        return;
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

  const handleSaveEditedCard = (url: string, title: string) => {
    if (!editingCard) return;

    const { card, collectionId } = editingCard;
    const targetCollection = allCollections.find(c => c.id === collectionId);
    if (targetCollection) {
      const updatedCards = targetCollection.cards.map(c =>
        c.id === card.id ? { ...c, url, title, updatedAt: Date.now() } : c
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
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-800 rounded-lg"
          >
            {viewMode === 'grid' ? <List size={18} /> : <Grid3X3 size={18} />}
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
                  isOver={overId === collection.id}
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
    </main>
  );
}
