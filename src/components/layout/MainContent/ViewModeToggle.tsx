/**
 * ViewModeToggle Component - 视图模式切换器
 */

import { Grid3X3, List, PanelLeft } from 'lucide-react';

type ViewMode = 'grid' | 'list' | 'compact';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export default function ViewModeToggle({ viewMode, onChange }: ViewModeToggleProps) {
  const handleToggle = () => {
    if (viewMode === 'grid') {
      onChange('list');
    } else if (viewMode === 'list') {
      onChange('compact');
    } else {
      onChange('grid');
    }
  };

  const getIcon = () => {
    if (viewMode === 'grid') return <Grid3X3 size={18} />;
    if (viewMode === 'list') return <PanelLeft size={18} />;
    return <List size={18} />;
  };

  const getTitle = () => {
    if (viewMode === 'grid') return '切换到列表视图';
    if (viewMode === 'list') return '切换到紧凑视图';
    return '切换到网格视图';
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-800 rounded-lg"
      title={getTitle()}
    >
      {getIcon()}
    </button>
  );
}
