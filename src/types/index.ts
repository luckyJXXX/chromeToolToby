// Space - 工作区
export interface Space {
  id: string;
  name: string;
  icon?: string;
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
}

// Collection - 集合/卡片组
export interface Collection {
  id: string;
  spaceId: string;
  name: string;
  color?: string;
  icon?: string;
  cards: Card[];
  createdAt: number;
  updatedAt: number;
}

// Card - 书签卡片
export interface Card {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  description?: string;
  shortUrl?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

// Chrome Tab 类型
export interface ChromeTab {
  id: number;
  windowId: number;
  title: string;
  url: string;
  favIconUrl?: string;
  pinned: boolean;
  active: boolean;
}

// Chrome Window 类型
export interface ChromeWindow {
  id: number;
  tabs: ChromeTab[];
  focused: boolean;
  incognito: boolean;
  type: 'normal' | 'popup' | 'devtools';
}

// App State
export interface AppState {
  spaces: Space[];
  collections: Collection[];
  activeSpaceId: string | null;
}
