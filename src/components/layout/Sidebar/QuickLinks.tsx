/**
 * QuickLinks Component - 快捷链接
 */

import { Layers, Clock, Star } from 'lucide-react';

interface QuickLinksProps {
  onLinkClick: (linkId: string) => void;
}

const defaultLinks = [
  { id: 'all', name: '所有链接', icon: <Layers size={18} /> },
  { id: 'unread', name: '稍后阅读', icon: <Clock size={18} /> },
  { id: 'favorites', name: '我的收藏', icon: <Star size={18} /> },
];

export default function QuickLinks({ onLinkClick }: QuickLinksProps) {
  return (
    <nav className="p-2 border-b border-dark-800">
      {defaultLinks.map((link) => (
        <button
          key={link.id}
          onClick={() => onLinkClick(link.id)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-dark-300 hover:bg-dark-800 hover:text-dark-100 transition-colors"
        >
          {link.icon}
          <span className="text-sm">{link.name}</span>
        </button>
      ))}
    </nav>
  );
}
