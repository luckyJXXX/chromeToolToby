# Toby Chrome Extension 架构重构设计方案

## 一、当前项目问题分析

### 1.1 代码行数超标
| 文件 | 当前行数 | 限制 | 状态 |
|------|---------|------|------|
| MainContent.tsx | 1191 | 500 | ❌ 超标 138% |
| Sidebar.tsx | 659 | 500 | ❌ 超标 31% |
| App.tsx | 224 | 500 | ✅ 正常 |
| RightPanel.tsx | 278 | 500 | ✅ 正常 |

### 1.2 目录结构问题
- 缺少 `hooks` 目录（自定义 Hooks）
- 缺少 `components/common` 目录（通用 UI 组件）
- 缺少 `components/business` 目录（业务组件）
- `modals` 目录位置不清晰
- `utils` 目录功能混杂

### 1.3 缺乏分层设计
- UI 组件和业务逻辑混合
- 缺少统一的hooks抽象
- 事件处理逻辑分散

---

## 二、最优架构设计

### 2.1 分层架构

```
src/
├── main.tsx                    # React 入口
├── App.tsx                     # 应用根组件（状态聚合）
├── types/                      # 类型定义层
│   └── index.ts
├── constants/                  # 常量配置层
│   └── storage.ts
├── hooks/                      # Hooks 层（业务逻辑抽象）
│   ├── useSpaces.ts           # Space 相关逻辑
│   ├── useCollections.ts      # Collection 相关逻辑
│   ├── useSearch.ts           # 搜索逻辑
│   ├── useKeyboard.ts         # 键盘快捷键
│   └── useDragDrop.ts         # 拖拽逻辑
├── services/                   # 服务层（数据请求）
│   ├── storage.ts             # 存储服务
│   ├── chrome.ts              # Chrome API 服务
│   └── ai.ts                  # AI 服务
├── components/                 # 组件层
│   ├── common/                # 通用 UI 组件
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Dropdown.tsx
│   │   └── ...
│   ├── layout/                # 布局组件
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── SpaceList.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── Settings.tsx
│   │   ├── MainContent/
│   │   │   ├── MainContent.tsx
│   │   │   ├── CollectionList.tsx
│   │   │   └── Collection.tsx
│   │   └── RightPanel/
│   │       ├── RightPanel.tsx
│   │       ├── WindowList.tsx
│   │       └── TabItem.tsx
│   └── modals/                # 弹窗组件
│       ├── AddCardModal.tsx
│       ├── EditCardModal.tsx
│       ├── MoveCardModal.tsx
│       ├── AIResultModal.tsx
│       └── index.ts
├── utils/                      # 工具层（辅助函数）
│   ├── common.ts              # 通用工具
│   ├── format.ts              # 格式化工具
│   └── constants.ts           # 静态常量
└── styles/                     # 样式层
    └── index.css
```

### 2.2 数据流向

```
User Action
    ↓
Component (View)
    ↓
Hook (Business Logic)
    ↓
Service (Data Layer)
    ↓
chrome.storage.local
```

### 2.3 模块职责划分

| 层级 | 职责 | 示例 |
|------|------|------|
| Hooks | 业务逻辑封装、状态管理 | useSpaces 管理 Space 的 CRUD |
| Services | 数据请求、API 调用 | storage.ts 提供数据持久化 |
| Components | UI 渲染、用户交互 | Sidebar 渲染侧边栏 |
| Utils | 纯函数、工具方法 | format.ts 格式化日期 |

---

## 三、组件拆分方案

### 3.1 MainContent.tsx 拆分（1191 行 → 7 个文件）

| 子组件 | 行数 | 职责 |
|--------|------|------|
| CollectionList.tsx | ~200 | 集合列表渲染 |
| Collection.tsx | ~300 | 单个集合组件 |
| CollectionHeader.tsx | ~100 | 集合头部（名称、菜单） |
| CardGrid.tsx | ~150 | 卡片网格展示 |
| CardItem.tsx | ~150 | 单个卡片组件 |
| EmptyState.tsx | ~50 | 空状态展示 |
| ViewModeToggle.tsx | ~50 | 视图切换器 |

### 3.2 Sidebar.tsx 拆分（659 行 → 6 个文件）

| 子组件 | 行数 | 职责 |
|--------|------|------|
| SpaceList.tsx | ~150 | Space 列表 |
| SpaceItem.tsx | ~100 | 单个 Space |
| SearchBar.tsx | ~80 | 搜索栏 |
| QuickLinks.tsx | ~80 | 快捷链接 |
| Stats.tsx | ~50 | 统计信息 |
| Settings.tsx | ~150 | 设置面板 |

---

## 四、编码规范细则

### 4.1 命名规范

```typescript
// 组件命名 - PascalCase
function Sidebar() {}
function CollectionList() {}

// Hooks 命名 - use 前缀 + CamelCase
function useSpaces() {}
function useSearch() {}

// 服务命名 - 名词 + Service/Manager
function StorageService {}
function ChromeAPI {}

// 常量 - UPPER_SNAKE_CASE
const STORAGE_KEY = 'toby_spaces';
const REFRESH_INTERVAL = 5000;

// 类型 - PascalCase + Type/Interface 后缀
interface SpaceType {}
type ViewMode = 'grid' | 'list' | 'compact';
```

### 4.2 函数规范

```typescript
// 推荐：显式返回类型
function getSpaces(): Space[] {
  return [];
}

// 推荐：解构参数 + 类型定义
function updateCollection(
  collections: Collection[],
  collectionId: string,
  updates: Partial<Collection>
): Collection[] {
  // ...
}

// 推荐：异步函数使用 try-catch
async function saveData(data: Data): Promise<void> {
  try {
    await storage.set(data);
  } catch (error) {
    console.error('保存失败:', error);
  }
}
```

### 4.3 注释规范

```typescript
/**
 * 获取所有窗口和标签页
 * @returns 窗口数组
 */
async function getAllWindows(): Promise<ChromeWindow[]> {}

/**
 * 处理拖拽标签页保存到集合
 * @param tab - Chrome 标签页对象
 * @param collectionId - 目标集合 ID
 */
async function handleDropTab(tab: ChromeTab, collectionId: string): Promise<void> {}
```

---

## 五、优化实施计划

### 5.1 第一阶段：目录重构

1. 创建 `hooks` 目录
2. 创建 `services` 目录，移动工具函数
3. 拆分 `components` 为 common/layout/modals

### 5.2 第二阶段：组件拆分

1. MainContent.tsx → 7 个子组件
2. Sidebar.tsx → 6 个子组件
3. 提取公共 UI 组件

### 5.3 第三阶段：逻辑抽象

1. 提取 useSpaces hook
2. 提取 useCollections hook
3. 提取 useSearch hook
4. 提取 useDragDrop hook

### 5.4 第四阶段：规范落地

1. 补充类型定义
2. 添加注释
3. 统一导入导出

---

## 六、预期收益

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 最大文件行数 | 1191 | ≤500 |
| 组件复用率 | 低 | 高 |
| 代码可读性 | 一般 | 优秀 |
| 可测试性 | 困难 | 容易 |
| 新功能开发效率 | 慢 | 快 |

---

## 七、注意事项

1. **渐进式重构** - 不破坏现有功能，分批次实施
2. **保持 API 兼容** - 组件 Props 接口不变
3. **测试验证** - 每次改动后运行测试
4. **零样式改动** - 不修改现有 CSS 样式

---

## 八、优化实施结果

### 8.1 新增目录结构

```
src/
├── services/                    # 服务层（新建）
│   ├── storage.ts              # 存储服务（144行）
│   ├── chrome.ts               # Chrome API 服务（148行）
│   └── ai.ts                  # AI 服务（149行）
├── hooks/                      # Hooks 层（新建）
│   ├── index.ts               # 导出入口（8行）
│   ├── useSpaces.ts          # Space 逻辑（67行）
│   ├── useCollections.ts     # Collection 逻辑（100行）
│   ├── useSearch.ts          # 搜索逻辑（86行）
│   └── useKeyboard.ts        # 键盘快捷键（38行）
└── utils/
    └── common.ts             # 通用工具（84行）
```

### 8.2 优化前后对比

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 服务层 | 混在 utils 中 | 独立的 services 目录 |
| Hooks | 无 | 5 个自定义 Hooks |
| 工具函数 | 混在 utils 中 | 分类到 utils/common.ts |
| 测试通过率 | 61/61 | 61/61 ✅ |
| 构建 | 成功 | 成功 ✅ |

### 8.3 代码分层收益

1. **可维护性提升** - 业务逻辑与 UI 分离
2. **可复用性增强** - Hooks 可在多个组件中复用
3. **可测试性改善** - 服务层函数可单独单元测试
4. **团队协作优化** - 明确分工边界

### 8.4 待续

- [ ] MainContent.tsx 拆分为多个子组件（当前 1192 行）
- [ ] Sidebar.tsx 拆分为多个子组件（当前 659 行）
- [ ] 提取公共 UI 组件到 components/common
