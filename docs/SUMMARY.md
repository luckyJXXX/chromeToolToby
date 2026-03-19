# Toby Chrome 插件开发总结

## 项目概述

开发一个类 Toby 的 Chrome 浏览器标签页与书签管理插件，替代浏览器的"新标签页"，提供可视化工作区。

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS (暗黑主题)
- **拖拽库**: @dnd-kit
- **Chrome API**: Manifest V3

## 目录结构

```
toby/
├── manifest.json           # 扩展配置文件
├── package.json           # 项目依赖
├── vite.config.ts         # Vite 配置
├── tailwind.config.js     # Tailwind 配置
├── index.html             # 入口 HTML
├── background.js          # 后台脚本
├── src/
│   ├── main.tsx          # React 入口
│   ├── App.tsx           # 主应用
│   ├── index.css         # 全局样式
│   ├── types/
│   │   └── index.ts     # TypeScript 类型
│   ├── utils/
│   │   ├── storage.ts   # 存储工具
│   │   └── chrome.ts    # Chrome API 工具
│   └── components/
│       ├── Sidebar.tsx       # 左侧边栏
│       ├── MainContent.tsx   # 中间主内容区
│       └── RightPanel.tsx    # 右侧边栏
└── dist/                 # 构建输出
```

## 实现功能

### 1. 三栏布局
- **左侧边栏**: Spaces 导航、搜索框、快捷链接
- **中间区域**: Collections 集合管理、卡片展示
- **右侧边栏**: 当前打开的窗口和标签页

### 2. 核心功能
- 标签页自动刷新（每5秒 + 事件监听）
- 拖拽标签页保存到集合
- 拖拽调整集合顺序
- 手动添加链接
- 一键保存整个窗口
- 打开/删除集合和卡片

### 3. 数据持久化
- 使用 `chrome.storage.local` 存储
- 数据结构: Space → Collection → Card

## 遇到的问题及解决方案

### 问题 1: 扩展无法加载 - 清单文件缺失

**错误信息**: `未能成功加载扩展程序` / `清单文件缺失或不可读取`

**原因**:
1. 构建后 `manifest.json` 没有复制到 `dist` 目录
2. 使用的 `service_worker` 配置需要 ES Module，但 background.js 是普通脚本

**解决方案**:
```json
// 错误的配置
"background": {
  "service_worker": "background.js",
  "type": "module"
}

// 正确的配置
"background": {
  "scripts": ["background.js"]
}
```

### 问题 2: 拖拽功能失效

**现象**: 拖拽标签页后，标签页被关闭但没有出现在集合中

**原因**: 右侧面板和中间区域是不同组件，跨组件拖拽数据传递失败

**解决方案**:
1. 在 `MainContent` 组件中添加全局 `drop` 事件监听
2. 通过 `data-collection-id` 属性标识目标集合
3. 使用 `text/plain` 格式传递拖拽数据

```javascript
// 右侧面板 - 设置拖拽数据
e.dataTransfer.setData('text/plain', JSON.stringify({
  type: 'tab',
  tabId: tab.id,
  url: tab.url,
  title: tab.title,
  favIconUrl: tab.favIconUrl
}));

// 中间区域 - 处理拖拽放置
const handleDrop = async (e: DragEvent) => {
  const data = JSON.parse(e.dataTransfer.getData('text/plain'));
  if (data.type === 'tab') {
    // 添加到集合...
  }
};
```

### 问题 3: Lucide React 图标导入错误

**错误**: `Window is not exported by lucide-react`

**解决方案**: 使用正确的图标名称 `AppWindow` 代替 `Window`

### 问题 4: 左侧边栏点击无反应

**原因**: 默认链接没有绑定点击事件处理函数

**解决方案**: 添加 `onClick` 事件处理

### 问题 5: 自动刷新不工作

**原因**: 标签页事件监听没有正确实现

**解决方案**: 在 `App.tsx` 中添加完整的事件监听

```javascript
chrome.tabs.onCreated.addListener(refreshWindows);
chrome.tabs.onRemoved.addListener(refreshWindows);
chrome.tabs.onUpdated.addListener(refreshWindows);
```

## 构建命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 复制必要文件到 dist
cp manifest.json dist/
cp background.js dist/
```

## 加载插件步骤

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `~/work/chormeToby/dist` 目录

## 待优化功能

1. [ ] 拖拽卡片在集合间移动
2. [ ] 卡片拖拽排序
3. [ ] 搜索过滤功能
4. [ ] Space 增删改
5. [ ] 数据导入/导出
6. [ ] 标签页分组颜色

## 关键代码片段

### manifest.json
```json
{
  "manifest_version": 3,
  "name": "Toby - 标签页管理器",
  "version": "1.0.0",
  "background": {
    "scripts": ["background.js"]
  },
  "chrome_url_overrides": {
    "newtab": "index.html"
  },
  "permissions": ["tabs", "storage", "windows"]
}
```

### 拖拽数据传递
```javascript
// 拖拽开始
onDragStart={(e) => {
  e.dataTransfer.setData('text/plain', JSON.stringify({
    type: 'tab',
    tabId: tab.id,
    url: tab.url,
    title: tab.title
  }));
}}

// 拖拽放置
onDrop={(e) => {
  const data = JSON.parse(e.dataTransfer.getData('text/plain'));
  // 处理放置逻辑
}}
```

## 总结

本次开发完成了基本的插件框架和核心拖拽功能。遇到的主要问题是 Manifest V3 的 background 配置以及跨组件拖拽实现。通过简化使用原生 HTML5 拖拽 API 和全局事件监听解决了问题。
