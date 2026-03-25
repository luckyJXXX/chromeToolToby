/**
 * EmptyState Component - 空状态展示
 */

import { Folder, Plus } from 'lucide-react';

interface EmptyStateProps {
  onAddCollection: () => void;
}

export default function EmptyState({ onAddCollection }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-dark-500">
      <Folder size={48} className="mb-4 opacity-50" />
      <p className="text-lg mb-2">还没有集合</p>
      <p className="text-sm mb-4">点击"添加集合"开始组织你的标签页</p>
      <button
        onClick={onAddCollection}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm"
      >
        <Plus size={16} />
        添加集合
      </button>
    </div>
  );
}
