/**
 * TabItem Component - 可拖拽的标签页项
 */

import { ChromeTab } from '../../../types';
import { closeTab } from '../../../services/chrome';
import { GripVertical, X } from 'lucide-react';

interface TabItemProps {
  tab: ChromeTab;
  onDragStart: (tab: ChromeTab) => void;
}

export default function TabItem({ tab, onDragStart }: TabItemProps) {
  const handleDragStart = (e: React.DragEvent) => {
    console.log('[DragStart] 右侧标签开始拖拽:', {
      tabId: tab.id,
      title: tab.title,
      url: tab.url
    });

    const tabData = {
      type: 'tab',
      tabId: tab.id,
      url: tab.url,
      title: tab.title || '无标题',
      favIconUrl: tab.favIconUrl
    };

    (window as any).__TOBY_EXTERNAL_DRAG__ = tabData;
    e.dataTransfer.setData('text/plain', JSON.stringify(tabData));
    e.dataTransfer.effectAllowed = 'move';

    onDragStart(tab);
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await closeTab(tab.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center gap-2 p-2 rounded-lg hover:bg-dark-700 cursor-grab active:cursor-grabbing group transition-colors"
    >
      <GripVertical size={14} className="text-dark-600 flex-shrink-0" />
      <div className="w-4 h-4 flex-shrink-0">
        {tab.favIconUrl ? (
          <img src={tab.favIconUrl} alt="" className="w-full h-full" />
        ) : (
          <div className="w-full h-full bg-dark-600 rounded" />
        )}
      </div>
      <span className="text-sm text-dark-300 truncate flex-1">
        {tab.title || '无标题'}
      </span>
      <button
        onClick={handleClose}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-dark-600 rounded text-dark-500 hover:text-red-400 transition-all"
      >
        <X size={12} />
      </button>
    </div>
  );
}
