/**
 * useKeyboard Hook - 键盘快捷键
 * 管理全局键盘事件
 */

import { useEffect, useCallback } from 'react';

interface KeyboardOptions {
  onEscape?: () => void;
  onToggleSidebar?: () => void;
  onFocusSearch?: () => void;
}

export function useKeyboard(options: KeyboardOptions = {}) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Escape: 关闭所有模态框
    if (e.key === 'Escape') {
      options.onEscape?.();
    }

    // Ctrl+B: 切换侧边栏
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      options.onToggleSidebar?.();
    }

    // Ctrl+Shift+F: 聚焦搜索框
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      options.onFocusSearch?.();
    }
  }, [options]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
