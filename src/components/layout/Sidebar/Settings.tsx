/**
 * Settings Component - 设置面板
 */

import { useState, useEffect } from 'react';
import { X, Key, Settings as SettingsIcon, Download, Upload } from 'lucide-react';
import { getMiniMaxApiKey, setMiniMaxApiKey } from '../../../services/ai';
import { Collection } from '../../../types';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Stats {
  spaces: number;
  collections: number;
  cards: number;
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [stats, setStats] = useState<Stats>({ spaces: 0, collections: 0, cards: 0 });

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      const key = await getMiniMaxApiKey();
      if (key) {
        setApiKey(key);
      }

      // 加载统计数据
      const spacesData = await chrome.storage.local.get('toby_spaces');
      const collectionsData = await chrome.storage.local.get('toby_collections');
      const spaces = spacesData.toby_spaces || [];
      const collections = (collectionsData.toby_collections || []) as Collection[];
      const cards = collections.reduce((sum, c) => sum + c.cards.length, 0);

      setStats({
        spaces: spaces.length,
        collections: collections.length,
        cards
      });
    };
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // 保存 API Key
  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    setSavingKey(true);
    try {
      await setMiniMaxApiKey(apiKey.trim());
      onClose();
    } catch (error) {
      console.error('保存 API Key 失败:', error);
    }
    setSavingKey(false);
  };

  // 导出数据
  const handleExportData = async (format: 'json' | 'csv') => {
    const spacesData = await chrome.storage.local.get('toby_spaces');
    const collectionsData = await chrome.storage.local.get('toby_collections');

    const data = {
      spaces: spacesData.toby_spaces || [],
      collections: collectionsData.toby_collections || [],
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    let blob: Blob;
    let filename: string;
    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'json') {
      blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      filename = `toby-backup-${timestamp}.json`;
    } else {
      // CSV format
      const rows = ['title,url,description,collection,space,createdAt'];
      for (const collection of data.collections) {
        const space = data.spaces.find((s: { id: string }) => s.id === collection.spaceId);
        const spaceName = space?.name || '默认空间';
        for (const card of collection.cards) {
          const title = (card.title || '').replace(/"/g, '""');
          const description = (card.description || '').replace(/"/g, '""');
          rows.push(`"${title}","${card.url}","${description}","${collection.name}","${spaceName}","${card.createdAt}"`);
        }
      }
      blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      filename = `toby-backup-${timestamp}.csv`;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入数据
  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.spaces) {
          await chrome.storage.local.set({ toby_spaces: data.spaces });
        }
        if (data.collections) {
          await chrome.storage.local.set({ toby_collections: data.collections });
        }

        window.location.reload();
      } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败，请检查文件格式');
      }
    };
    input.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-xl p-6 w-[420px] border border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SettingsIcon size={20} className="text-indigo-400" />
            <h3 className="text-lg font-medium text-dark-100">设置</h3>
          </div>
          <button
            onClick={onClose}
            className="text-dark-500 hover:text-dark-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* API Key 设置 */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Key size={16} className="text-indigo-400" />
            <span className="text-sm font-medium text-dark-300">MiniMax API Key</span>
          </div>
          <p className="text-xs text-dark-500 mb-2">
            输入您的 MiniMax API Key 以启用 AI 分析功能。
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-xxxxxxxxxxxxxxxx"
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-indigo-500 mb-3"
          />
          <button
            onClick={handleSaveApiKey}
            disabled={savingKey || !apiKey.trim()}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-dark-600 disabled:text-dark-500 text-white rounded-lg text-sm"
          >
            {savingKey ? '保存中...' : '保存 API Key'}
          </button>
        </div>

        {/* 统计信息 */}
        <div className="mb-4 pt-4 border-t border-dark-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-dark-300">数据统计</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-dark-700 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-indigo-400">{stats.spaces}</div>
              <div className="text-xs text-dark-500">Spaces</div>
            </div>
            <div className="bg-dark-700 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-indigo-400">{stats.collections}</div>
              <div className="text-xs text-dark-500">Collections</div>
            </div>
            <div className="bg-dark-700 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-indigo-400">{stats.cards}</div>
              <div className="text-xs text-dark-500">Cards</div>
            </div>
          </div>
        </div>

        {/* 数据导出/导入 */}
        <div className="mb-4 pt-4 border-t border-dark-700">
          <div className="flex items-center gap-2 mb-2">
            <Download size={16} className="text-indigo-400" />
            <span className="text-sm font-medium text-dark-300">数据备份</span>
          </div>
          <p className="text-xs text-dark-500 mb-3">
            导出您的收藏数据为 JSON 或 CSV 格式，也可以从备份文件导入。
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleExportData('json')}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg text-sm"
            >
              <Download size={14} />
              导出 JSON
            </button>
            <button
              onClick={() => handleExportData('csv')}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg text-sm"
            >
              <Download size={14} />
              导出 CSV
            </button>
            <button
              onClick={handleImportData}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg text-sm"
            >
              <Upload size={14} />
              导入
            </button>
          </div>
        </div>

        {/* 快捷键提示 */}
        <div className="pt-4 border-t border-dark-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-dark-300">快捷键</span>
          </div>
          <div className="space-y-1 text-xs text-dark-500">
            <div className="flex justify-between">
              <span>切换侧边栏</span>
              <kbd className="px-1.5 py-0.5 bg-dark-700 rounded text-dark-400">Ctrl+B</kbd>
            </div>
            <div className="flex justify-between">
              <span>关闭弹窗</span>
              <kbd className="px-1.5 py-0.5 bg-dark-700 rounded text-dark-400">Esc</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
