# MixBoard 项目深度技术文档 (Project Technical Documentation)

本文档是 MixBoard 项目的单一事实来源 (Single Source of Truth)，详细记录了系统架构、数据结构、核心逻辑与开发指南。建立此文档的目的是为了让开发者能够**细致地理解每一个模块的功能实现**。

## 1. 系统架构 (System Architecture)

MixBoard 采用分层架构设计，实现了 UI、状态管理与业务逻辑的严格分离。

### 1.1 核心数据流 (Data Flow)

```mermaid
graph TD
    User[用户交互 (User)] --> UI[组件层 (React Components)]
    UI -->|Dispatch Actions| Store[状态管理 (Zustand Store)]
    Store -->|Call Services| Service[逻辑与服务层 (Services)]
    
    subgraph Storage Layer
    Service -->|Persist| IDB[(IndexedDB - 本地全量数据)]
    Service -->|Meta| LS[(LocalStorage - 列表/视口)]
    Service -->|Sync| Firebase[(Firebase - 云端同步)]
    end

    subgraph AI Layer
    Service -->|Request| LLM_Factory[Model Factory]
    LLM_Factory -->|API Call| Provider[AI Provider (OpenAI/Gemini)]
    end

    Store -->|Update State| UI
```

### 1.2 目录结构深度解析
只列出关键业务目录：

-   **`src/store/slices/`**: 状态切片。
    -   `cardSlice.js`: **核心**。控制卡片的 CRUD、软删除与布局算法。
    -   `canvasSlice.js`: 控制无限画布的视口变换 (Pan/Zoom)。
    -   `aiSlice.js`: 管理 AI 对话历史与流式响应状态。
-   **`src/services/`**: 业务逻辑。
    -   `boardService.js`: 画板数据的增删改查与迁移逻辑。
    -   `storage.js`: 统一的数据访问门面 (Facade)，以此为入口调用底层 DB。
    -   `llm.js`: AI 调用的核心入口，包含 Prompt 工程逻辑。
-   **`src/components/board/`**: 画板页面专用组件。
    -   `Sidebar.jsx`: 左侧工具栏。
    -   `BoardTopBar.jsx`: 顶部标题与设置入口。

---

## 2. 数据字典 (Data Dictionary)

### 2.1 画板列表元数据 (Board Metadata)
存储位置: `localStorage` -> key: `mixboard_boards_list`
描述: 用于在 Gallery 页面快速展示列表，不包含具体卡片数据。

| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `id` | string | 唯一标识符 (Timestamp String) |
| `name` | string | 画板名称 |
| `createdAt` | number | 创建时间戳 |
| `updatedAt` | number | 最后修改时间戳 |
| `lastAccessedAt`| number | 最后访问时间戳 (用于最近访问排序) |
| `cardCount` | number | 卡片数量缓存 (用于展示) |
| `deletedAt` | number?| 软删除时间戳 (存在即为回收站项目) |

### 2.2 画板全量数据 (Full Board Data)
存储位置: `IndexedDB` -> key: `mixboard_board_{id}`
描述: 画板的完整内容。

| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `cards` | Card[] | 卡片对象数组 |
| `connections` | Connection[] | 连线对象数组 |
| `groups` | Group[] | 区域 (Zone) 对象数组 |
| `boardPrompts` | object[] | **历史记录**。存储用户在该画板的所有 AI 指令历史。 |

### 2.3 卡片对象 (Card Schema)

| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `id` | string | UUID |
| `type` | 'text' \| 'note' | 卡片类型 (对话卡片 / 便利贴) |
| `x`, `y` | number | 画布坐标 |
| `w`, `h` | number | 尺寸 (仅部分卡片支持) |
| `data` | object | **业务数据**。包含 `title`, `messages` (对话数组)。 |
| `deletedAt` | number?| 软删除标记。UI 渲染时会过滤掉此字段存在的卡片。 |

---

## 3. 核心功能与逻辑细节 (Key Functions & Logic)

### 3.1 画布渲染机制 (`Canvas.jsx`)
画布采用了绝对定位 + CSS Transform 的方式实现高性能渲染。

-   **层级管理 (Z-Index)**:
    1.  `Standard Connection Layer`: 静态连线 (底层)。
    2.  `Active Connection Layer`: 选中时的高亮连线 ("流光"效果)。
    3.  `Zone Layer`: 区域背景。
    4.  `Card Layer`: 卡片实体。使用了视口剔除 (Viewport Culling) 优化，仅渲染视野内 `+400px` 范围的卡片。
    5.  `Selection Rect`: 鼠标拖拽时的选择框 (最顶层)。

-   **交互模式**:
    -   `Select Mode (v)`: 默认。左键框选，空格+拖拽平移。
    -   `Pan Mode (h)`: 左键拖拽平移。

### 3.2 AI 服务 (`llm.js`)

#### `generateFollowUpTopics(messages)` (Sprout)
-   **功能**: 读取最近 2 条对话，预测用户可能感兴趣的 5 个后续问题。
-   **逻辑**: 构建 Prompt `Predict exactly 5 follow-up questions...` -> 调用 LLM -> 解析 JSON 数组 -> 如果失败返回 Fallback 数组。

#### `splitTextIntoSections(text)`
-   **功能**: 将长文本智能拆分为多张卡片。
-   **逻辑**: 要求 AI 返回 Json String Array，且必须是原文的精确摘录 ("EXACT COPY")，用于保持原文引用准确性。

### 3.3 状态管理核心 (`cardSlice.js`)

#### `updateCardFull(id, updater)`
-   **功能**: 全量更新卡片数据。
-   **设计细节**: `updater` 参数支持 **函数式更新** (如 `prev => ({...prev, title: 'new'})`)，这是为了解决闭包陷阱，确保在高频更新时（如 AI 流式输出）不会丢失状态。

#### `arrangeCards()`
-   **功能**: 自动布局算法。
-   **逻辑**:
    1.  如果有 **Zone (Group)**: 优先保持 Group 内相对位置，仅对散落卡片进行网格排列。
    2.  如果有 **Connections**: 使用力导向或树状结构布局 (Mind Map 逻辑)。
    3.  单纯散落卡片: 执行 `calculateGridLayout`，按紧凑网格排列到视野左上角。

### 3.4 数据加载流程 (`loadBoard` in `boardService.js`)
为了兼容旧版本并确保性能，加载流程设计了多级回退：
1.  **Try IDB**: 优先从 IndexedDB 读取 (快，容量大)。
2.  **Fallback LocalStorage**: 如果 IDB 无数据，尝试读取 LocalStorage (旧版数据位置)。
3.  **Migration**: 如果在 LS 找到数据，**自动静默迁移**到 IDB，并删除 LS 旧数据。
4.  **S3 Image Hydration**: 遍历卡片数据，检测是否有 `type: 'image'` 且 `source: 'url'` 的图片。如果有，自动下载并转换为 Base64 存储 (防止 S3 链接过期或跨域问题)。

---

## 4. 设计系统规格 (Design System Specs)
MixBoard 的视觉设计已原子化到 `tailwind.config.js` 中。

### 4.1 色彩系统
用户界面构建主要依赖 `brand` 色系 (Blue based) 和 `slate` (Neutral based)。

-   **交互色 (Brand)**:
    -   `brand-500 (#0ea5e9)`: 主按钮、选中框、高亮连线。
    -   `brand-50 (#f0f9ff)`: 选中背景、轻量提示底色。
-   **语义色**:
    -   `Delete`: `red-500` (警示) / `red-50` (背景)
    -   `Sprout`: `emerald-600` (生机/绿色)
    -   `Zone`: `indigo-600` (区域/架构)

### 4.2 动效 (Motion)
-   **Slide Up**: 工具栏出场动画 (`animate-slide-up`)，增加灵动感。
-   **Fade In**: 模态框与 Toast 的入场。
-   **Pulse**: 加载状态的呼吸效果。

---

## 5. 开发指南 (Development Guide)

### 5.1 新增一个功能
假设要新增一个 "导出为 PDF" 的功能：

1.  **Service 层**: 在 `src/services/dataExportService.js` 中添加 `exportBoardToPDF(boardData)` 函数，实现 PDF 生成逻辑。
2.  **State 层**: 不需要额外 State，直接使用数据。
3.  **UI 层**:
    -   在 `src/components/board/BoardTopBar.jsx` 的菜单中添加 "Export PDF" 按钮。
    -   点击时，调用 `useStore.getState()` 获取当前 `cards`，传入 Service 函数。

### 5.2 调试工具
-   **Debug Logger**: 使用 `debugLog.ui(...)` 或 `debugLog.store(...)`。在生产环境会自动静默，仅在 Dev 模式或 Beta 环境开启。

---

本文档对应版本 `v2.2.77`。修改代码时请同步更新此文档。
