/**
 * MainContent - 主内容区组件
 * 管理集合列表、卡片操作、拖拽处理
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Collection as CollectionType, Space, Card } from '../types';
import { getMiniMaxApiKey, analyzeContent, AIAnalysisResult } from '../services/ai';
import { extractPageContent } from '../services/chrome';
import { AddCardModal, EditCardModal, MoveCardModal, AIResultModal } from './modals';
import Collection from './layout/MainContent/Collection';
import EmptyState from './layout/MainContent/EmptyState';
import ViewModeToggle from './layout/MainContent/ViewModeToggle';
import { Plus, Loader2 } from 'lucide-react';

// Props 接口
interface MainContentProps {
  collections: CollectionType[];
  onCollectionsChange: (collections: CollectionType[]) => void;
  activeSpace?: Space;
  allCollections: CollectionType[];
  spaces?: Space[];
  onTabDropped?: (tabId: number) => void;
  modalAddCardTo?: string | null;
  onModalAddCardChange?: (collectionId: string | null) => void;
  modalEditingCard?: { card: Card; collectionId: string } | null;
  onModalEditingCardChange?: (card: { card: Card; collectionId: string } | null) => void;
  modalMovingCard?: { card: Card; collectionId: string } | null;
  onModalMovingCardChange?: (card: { card: Card; collectionId: string } | null) => void;
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
  // ========== 状态管理 ==========
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  const [, setMenuOpenId] = useState<string | null>(null);

  // 模态框状态
  const [internalAddCardTo, setInternalAddCardTo] = useState<string | null>(null);
  const addCardTo = modalAddCardTo !== undefined ? modalAddCardTo : internalAddCardTo;
  const setAddCardTo = onModalAddCardChange || setInternalAddCardTo;

  const [internalEditingCard, setInternalEditingCard] = useState<{ card: Card; collectionId: string } | null>(null);
  const editingCard = modalEditingCard !== undefined ? modalEditingCard : internalEditingCard;
  const setEditingCard = onModalEditingCardChange || setInternalEditingCard;

  const [internalMovingCard, setInternalMovingCard] = useState<{ card: Card; collectionId: string } | null>(null);
  const movingCard = modalMovingCard !== undefined ? modalMovingCard : internalMovingCard;
  const setMovingCard = onModalMovingCardChange || setInternalMovingCard;

  // AI 分析状态
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [aiResultCard, setAiResultCard] = useState<{ card: Card; collectionId: string } | null>(null);

  // Refs
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  // ========== Effects ==========

  // 全局菜单关闭
  useEffect(() => {
    const handleMenuToggle = (e: CustomEvent<{ menuId: string }>) => {
      setMenuOpenId(prev => prev === e.detail.menuId ? null : e.detail.menuId);
    };
    window.addEventListener('toggle-menu' as keyof WindowEventMap, handleMenuToggle as EventListener);
    return () => window.removeEventListener('toggle-menu' as keyof WindowEventMap, handleMenuToggle as EventListener);
  }, []);

  // 文档级别拖拽监听
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
            const targetElement = (e.target as HTMLElement).closest('[data-collection-id]');
            let collectionId = targetElement
              ? targetElement.getAttribute('data-collection-id') || collections[0].id
              : collections[0].id;

            console.log('[Document] Dropped on collection:', collectionId);

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

  // 清理函数
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    };
  }, []);

  // ========== 事件处理 ==========

  // 处理外部拖拽
  const handleExternalDrop = useCallback(async (collectionId: string, e: React.DragEvent) => {
    console.log('[handleExternalDrop] Called with collectionId:', collectionId);
    e.preventDefault();

    try {
      const dataStr = e.dataTransfer?.getData('text/plain');
      if (!dataStr) return;

      const data = JSON.parse(dataStr);
      if (data.type === 'tab') {
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

          if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);

          dragTimeoutRef.current = setTimeout(() => {
            onCollectionsChange(newCollections);
            if (data.tabId && typeof data.tabId === 'number') {
              chrome.tabs.remove(data.tabId).catch(() => {});
              onTabDropped?.(data.tabId);
            }
          }, 200);
        }
      }
    } catch (err) {
      console.error('Drop error:', err);
      e.stopPropagation();
    } finally {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }
    }
  }, [allCollections, onCollectionsChange, onTabDropped]);

  // 卡片跨集合移动
  const handleCardMove = useCallback((cardId: string, sourceCollectionId: string, targetCollectionId: string) => {
    const sourceCollection = allCollections.find(c => c.id === sourceCollectionId);
    const targetCollection = allCollections.find(c => c.id === targetCollectionId);

    if (sourceCollection && targetCollection) {
      const card = sourceCollection.cards.find(c => c.id === cardId);
      if (card) {
        const newSourceCards = sourceCollection.cards.filter(c => c.id !== cardId);
        const newSourceCollection = { ...sourceCollection, cards: newSourceCards, updatedAt: Date.now() };

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

  // 添加集合
  const handleAddCollection = () => {
    const newCollection: CollectionType = {
      id: `collection-${Date.now()}`,
      spaceId: activeSpace?.id || 'default',
      name: '新集合',
      cards: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const newCollections = [...allCollections, newCollection];
    onCollectionsChange(newCollections);
  };

  // 更新集合
  const handleUpdateCollection = (updated: CollectionType) => {
    const newCollections = allCollections.map(c => c.id === updated.id ? updated : c);
    onCollectionsChange(newCollections);
  };

  // 删除集合
  const handleDeleteCollection = (collectionId: string) => {
    const newCollections = allCollections.filter(c => c.id !== collectionId);
    onCollectionsChange(newCollections);
  };

  // 打开全部
  const handleOpenAll = (collection: CollectionType) => {
    collection.cards.forEach(card => {
      chrome.tabs.create({ url: card.url, active: false });
    });
  };

  // 添加卡片
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
      const newSourceCards = sourceCollection.cards.filter(c => c.id !== card.id);
      const newSourceCollection = { ...sourceCollection, cards: newSourceCards, updatedAt: Date.now() };
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
      const updatedSourceCards = sourceCollection.cards.filter(c => c.id !== card.id);
      const updatedSourceCollection = {
        ...sourceCollection,
        cards: updatedSourceCards,
        updatedAt: Date.now()
      };

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

  // AI 分析
  const handleAICard = async (card: Card, collectionId: string) => {
    const apiKey = await getMiniMaxApiKey();
    if (!apiKey) {
      alert('请先在左下角"设置"中配置 MiniMax API Key');
      return;
    }

    setAiAnalyzing(true);

    try {
      const tabs = await chrome.tabs.query({ url: card.url });
      let content = '';

      if (tabs.length > 0) {
        content = await extractPageContent(tabs[0].id || 0);
      }

      let result: AIAnalysisResult;

      if (content && content.length > 50) {
        result = await analyzeContent(content, card.title, apiKey);
      } else {
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

  // 应用 AI 结果
  const handleApplyAIResult = () => {
    if (!aiResult || !aiResultCard) return;

    const { card, collectionId } = aiResultCard;
    const targetCollection = allCollections.find(c => c.id === collectionId);

    if (targetCollection) {
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

  // 关闭 AI 结果
  const handleCloseAIResult = () => {
    setAiResult(null);
    setAiResultCard(null);
  };

  // ========== 渲染 ==========
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
          <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />

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
      <div
        id="collections-container"
        className="flex-1 overflow-y-auto p-6"
        onDragOver={(e) => {
          console.log('[MainContent] DragOver fired');
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
          e.preventDefault();
          const dataStr = e.dataTransfer?.getData('text/plain');
          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'tab' && collections.length > 0) {
                const targetCollectionId = (e.target as HTMLElement).closest('[data-collection-id]')?.getAttribute('data-collection-id');
                const collectionId = targetCollectionId || collections[0].id;
                console.log('[MainContent] Adding tab to collection:', collectionId);
                handleExternalDrop(collectionId, e);
              } else if (data.type === 'card') {
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
            <Collection
              key={collection.id}
              collection={collection}
              viewMode={viewMode}
              onUpdate={handleUpdateCollection}
              onDelete={handleDeleteCollection}
              onOpenAll={handleOpenAll}
              onAddCard={handleAddCard}
              onEditCard={handleEditCard}
              onMoveCard={handleMoveCard}
              onAICard={handleAICard}
              onDrop={handleExternalDrop}
            />
          ))}
        </div>

        {collections.length === 0 && (
          <EmptyState onAddCollection={handleAddCollection} />
        )}
      </div>

      {/* 模态框 */}
      <AddCardModal
        isOpen={!!addCardTo}
        onClose={() => setAddCardTo(null)}
        onAdd={handleCardAdded}
      />

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

      <MoveCardModal
        isOpen={!!movingCard}
        card={movingCard?.card || null}
        collections={allCollections}
        currentCollectionId={movingCard?.collectionId || ''}
        onClose={() => setMovingCard(null)}
        onMove={handleCardMoved}
      />

      <AIResultModal
        isOpen={!!aiResult}
        result={aiResult}
        onClose={handleCloseAIResult}
        onApply={handleApplyAIResult}
      />

      {/* AI 分析加载提示 */}
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
