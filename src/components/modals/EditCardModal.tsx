import { useState, useEffect } from 'react';
import { Card, Collection, Space } from '../../types';
import { Link } from 'lucide-react';

interface EditCardModalProps {
  isOpen: boolean;
  card: Card | null;
  onClose: () => void;
  onSave: (
    url: string,
    title: string,
    description?: string,
    shortUrl?: string,
    targetCollectionId?: string
  ) => void;
  onDelete?: () => void;
  allCollections?: Collection[];
  currentCollectionId?: string;
  spaces?: Space[];
}

export default function EditCardModal({
  isOpen,
  card,
  onClose,
  onSave,
  onDelete,
  allCollections,
  currentCollectionId,
  spaces
}: EditCardModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [targetCollectionId, setTargetCollectionId] = useState(currentCollectionId || '');

  useEffect(() => {
    if (card) {
      setUrl(card.url);
      setTitle(card.title);
      setDescription(card.description || '');
      setShortUrl(card.shortUrl || '');
      setTargetCollectionId(currentCollectionId || '');
    }
  }, [card, currentCollectionId]);

  if (!isOpen || !card) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSave(
        url,
        title || url,
        description,
        shortUrl,
        targetCollectionId !== currentCollectionId ? targetCollectionId : undefined
      );
      onClose();
    }
  };

  const getSpaceName = (collection: Collection) => {
    const space = spaces?.find((s) => s.id === collection.spaceId);
    return space?.name || '默认空间';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-xl p-6 w-[420px] border border-dark-700">
        <h3 className="text-lg font-medium text-dark-100 mb-4">编辑链接</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
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
          <div className="mb-3">
            <label className="block text-sm text-dark-400 mb-1">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入标题"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          {allCollections && allCollections.length > 0 && (
            <div className="mb-3">
              <label className="block text-sm text-dark-400 mb-1">移动到</label>
              <select
                value={targetCollectionId}
                onChange={(e) => setTargetCollectionId(e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:outline-none focus:border-indigo-500"
              >
                {allCollections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {getSpaceName(collection)} / {collection.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mb-3">
            <label className="block text-sm text-dark-400 mb-1">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入描述（可选）"
              rows={2}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-dark-400 mb-1">
              <Link size={12} className="inline mr-1" />
              自定义短链
            </label>
            <input
              type="text"
              value={shortUrl}
              onChange={(e) => setShortUrl(e.target.value)}
              placeholder="输入短链（可选）"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"
              >
                DELETE
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
            >
              DONE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
