// Storage keys for chrome.storage.local
export const STORAGE_KEYS = {
  SPACES: 'toby_spaces',
  COLLECTIONS: 'toby_collections',
  ACTIVE_SPACE: 'toby_active_space',
  API_KEY: 'toby_api_key'
} as const;

// Default values
export const DEFAULT_SPACE = {
  id: 'default',
  name: '我的收藏',
  isDefault: true,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

export const DEFAULT_COLLECTION = {
  id: 'uncategorized',
  spaceId: 'default',
  name: '未分类',
  cards: [],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// Default settings
export const DEFAULT_SETTINGS = {
  theme: 'dark' as const,
  autoGroup: false,
  maxHistory: 500
};
