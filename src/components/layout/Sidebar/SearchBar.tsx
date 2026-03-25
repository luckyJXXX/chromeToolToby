/**
 * SearchBar Component - 搜索栏
 */

import { Search, Filter, ExternalLink } from 'lucide-react';

interface SearchResult {
  url: string;
  title: string;
  collectionId: string;
  collectionName: string;
  spaceName: string;
}

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: SearchResult[];
}

export default function SearchBar({
  searchQuery,
  onSearchChange,
  searchResults
}: SearchBarProps) {
  return (
    <div className="p-4 border-b border-dark-800">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" size={16} />
        <input
          type="text"
          placeholder="搜索收藏..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-10 pr-4 py-2 text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:border-indigo-500"
        />
      </div>
      {/* 搜索结果 */}
      {searchResults.length > 0 && (
        <div className="mt-2 max-h-64 overflow-y-auto bg-dark-800 border border-dark-700 rounded-lg">
          <div className="px-3 py-2 text-xs text-dark-500 border-b border-dark-700 flex items-center gap-1">
            <Filter size={12} />
            找到 {searchResults.length} 个结果
          </div>
          {searchResults.map((result, index) => (
            <button
              key={index}
              onClick={() => {
                chrome.tabs.create({ url: result.url });
                onSearchChange('');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-dark-700 border-b border-dark-700 last:border-0"
            >
              <ExternalLink size={12} className="text-dark-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-dark-300 truncate">{result.title}</div>
                <div className="text-xs text-dark-500 truncate">{result.spaceName} / {result.collectionName}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
