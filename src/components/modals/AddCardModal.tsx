import { useState } from 'react';

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (url: string, title: string) => void;
}

export default function AddCardModal({ isOpen, onClose, onAdd }: AddCardModalProps) {
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
