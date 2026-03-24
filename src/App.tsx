import { useState, useEffect, useCallback } from 'react';
import { Space, Collection, ChromeWindow, ChromeTab, Card } from './types';
import { getAppState, initStorage, saveCollections } from './utils/storage';
import { getAllWindows } from './utils/chrome';

// 组件
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import RightPanel from './components/RightPanel';

function App() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string>('default');
  const [windows, setWindows] = useState<ChromeWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 刷新窗口数据
  const refreshWindows = useCallback(async () => {
    try {
      const windowData = await getAllWindows();
      setWindows(windowData);
    } catch (e) {
      console.error('刷新窗口失败:', e);
    }
  }, []);

  // 处理拖拽标签页保存到集合
  const handleDropTabToCollection = useCallback(async (tab: ChromeTab, collectionId: string) => {
    const targetCollection = collections.find(c => c.id === collectionId);
    if (!targetCollection) return;

    // 创建新卡片
    const newCard: Card = {
      id: `card-${Date.now()}`,
      url: tab.url,
      title: tab.title || '无标题',
      favicon: tab.favIconUrl,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 添加到 Collection
    const updatedCollection = {
      ...targetCollection,
      cards: [...targetCollection.cards, newCard],
      updatedAt: Date.now()
    };

    const newCollections = collections.map(c =>
      c.id === targetCollection.id ? updatedCollection : c
    );

    await saveCollections(newCollections);
    setCollections(newCollections);

    // 保留原标签页，不再关闭
    // await closeTab(tab.id);

    // 刷新
    await refreshWindows();
  }, [collections, refreshWindows]);

  // 初始化加载数据
  useEffect(() => {
    const init = async () => {
      await initStorage();
      const state = await getAppState();
      setSpaces(state.spaces);
      setCollections(state.collections);
      setActiveSpaceId(state.activeSpaceId);

      await refreshWindows();
      setIsLoading(false);
    };
    init();

    // 监听标签页创建事件 - 自动刷新
    chrome.tabs.onCreated.addListener(refreshWindows);
    chrome.tabs.onRemoved.addListener(refreshWindows);
    chrome.tabs.onUpdated.addListener(refreshWindows);

    // 定期刷新（每5秒）
    const interval = setInterval(refreshWindows, 5000);

    return () => {
      chrome.tabs.onCreated.removeListener(refreshWindows);
      chrome.tabs.onRemoved.removeListener(refreshWindows);
      chrome.tabs.onUpdated.removeListener(refreshWindows);
      clearInterval(interval);
    };
  }, [refreshWindows]);

  // 切换 Space
  const handleSpaceChange = (spaceId: string) => {
    setActiveSpaceId(spaceId);
    chrome.storage.local.set({ toby_active_space: spaceId });
  };

  // 更新 Collections（带持久化）
  const handleCollectionsChange = (newCollections: Collection[]) => {
    setCollections(newCollections);
    saveCollections(newCollections);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-950">
        <div className="text-dark-400">加载中...</div>
      </div>
    );
  }

  // 获取当前 Space 的 Collections
  // 'all' 是一个特殊 ID，表示显示所有空间的收藏
  const currentCollections = activeSpaceId === 'all'
    ? collections
    : collections.filter(c => c.spaceId === activeSpaceId);

  return (
    <div className="h-screen flex bg-dark-950 overflow-hidden">
      {/* 左侧边栏 - Spaces 导航 */}
      <Sidebar
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        onSpaceChange={handleSpaceChange}
        collections={collections}
      />

      {/* 中间主内容区 - Collections 和 Cards */}
      <MainContent
        collections={currentCollections}
        onCollectionsChange={handleCollectionsChange}
        activeSpace={spaces.find(s => s.id === activeSpaceId)}
        allCollections={collections}
        spaces={spaces}
        onTabDropped={() => refreshWindows()}
      />

      {/* 右侧边栏 - 当前打开的标签页 */}
      <RightPanel
        windows={windows}
        onRefresh={refreshWindows}
        collections={collections}
        onDropTab={handleDropTabToCollection}
      />
    </div>
  );
}

export default App;
