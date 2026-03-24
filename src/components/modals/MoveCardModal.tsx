import { Card, Collection } from '../../types';
import { Folder } from 'lucide-react';

interface MoveCardModalProps {
  isOpen: boolean;
  card: Card | null;
  collections: Collection[];
  currentCollectionId: string;
  onClose: () => void;
  onMove: (targetCollectionId: string) => void;
}

export default function MoveCardModal({
  isOpen,
  card,
  collections,
  currentCollectionId,
  onClose,
  onMove
}: MoveCardModalProps) {
  if (!isOpen || !card) return null;

  const availableCollections = collections.filter((c) => c.id !== currentCollectionId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-xl p-6 w-80 max-h-[80vh] overflow-y-auto border border-dark-700">
        <h3 className="text-lg font-medium text-dark-100 mb-4">移动到...</h3>
        {availableCollections.length === 0 ? (
          <p className="text-dark-500 text-sm py-4">没有其他集合可移动</p>
        ) : (
          <div className="space-y-1">
            {availableCollections.map((collection) => (
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
