# 项目代码库全解文档 (Project Codebase Documentation)

本文档旨在全面解析 MixBoard 项目的代码架构、设计思路、核心功能模块及页面构建细节。

## 1. 项目概览 (Overview)
MixBoard 是一个基于 React + Vite 构建的无限画布思维导图与 AI 协作平台。核心理念是将 AI 的生成能力与无限画布的自由度结合。

### 核心技术栈
- **前端框架**: React 18 + Vite
- **状态管理**: Zustand (Slice 模式) + Zundo (撤销/重做)
- **样式系统**: Tailwind CSS
- **AI 集成**: 自研 Service Layer (适配多种模型提供商)
- **数据持久化**: Firebase (云端) + IndexedDB/LocalStorage (本地)

---

## 2. 目录结构详解 (Directory Structure)

项目遵循功能模块化与分层架构的设计原则。

```
src/
├── components/         # 通用 UI 组件 (按钮、弹窗、输入框等)
├── config/             # 全局配置文件
├── contexts/           # React Context (用于非 Store 的全局状态，如 Theme, Toast)
├── hooks/              # 自定义 Hooks (UI 逻辑复用)
├── modules/            # 独立业务模块 (如 Landing Page)
├── pages/              # 路由页面组件
├── services/           # [核心] 业务逻辑层与外部服务 (API, Database, AI)
├── store/              # [核心] 全局状态管理 (Zustand Slices)
├── styles/             # 全局样式文件
└── utils/              # 工具函数 (格式化, 验证, LazyLoad)
```

---

## 3. 设计系统 (Design System)

### 3.1 色彩系统 (Colors)
项目使用了 Tailwind CSS 自定义配置 (`tailwind.config.js`)，核心品牌色为 `brand` 系列：

| 色号 | Hex 值 | 用途 |
|------|--------|------|
| 50   | #f0f9ff | 最浅背景，高亮底色 |
| 500  | #0ea5e9 | **主品牌色**，主要按钮与强调 |
| 600  | #0284c7 | 悬停状态 |
| 900  | #0c4a6e | 深色模式下的强调色 |

此外，深色模式 (`dark:`) 广泛应用于 `bg-slate-950` 等深灰/黑色系，营造沉浸式体验。

### 3.2 字体 (Typography)
- **主字体**: `Inter` (默认 sans)
- **特色字体**: `LXGW WenKai` (霞鹜文楷)，用于中文展示，提供不仅限于黑体的手写感。

### 3.3 动画 (Animations)
- `fade-in`: 0.5s 淡入
- `slide-up`: 底部滑入效果 (用于 Toolbar 出现)
- `pulse-slow`: 缓慢呼吸效果 (用于加载中状态)

---

## 4. 核心架构设计 (Core Architecture)

### 4.1 状态管理 (Zustand + Slice Pattern)
**文件**: `src/store/useStore.js`
**设计理由**: 随着应用复杂度增加，单一 Store 文件会变得难以维护。项目中采用了 **Slice Pattern**，将不同功能区的状态拆分为独立文件，最后合并。

- **`canvasSlice.js`**: 画布缩放、位移 (Viewport X/Y/Zoom)。
- **`cardSlice.js`**: 卡片的增删改查。
- **`aiSlice.js`**: 聊天记录、AI 生成状态。
- **`selectionSlice.js`**: 多选交互逻辑。
- **`temporal` (Zundo)**: 实现了全局的时间旅行（撤销/重做），通过 `partialize` 仅持久化关键数据。

### 4.2 服务层 (Service Layer)
**文件**: `src/services/`
**设计理由**: 将业务逻辑与 UI 组件分离。UI 只负责渲染和调用 Service，Service 处理数据流转和 API 请求。**Inversion of Control (控制反转)** 思想在 AI 模块中体现尤为明显。

#### 核心服务模块
1.  **AI 服务 (`src/services/llm.js`)**:
    -   `chatCompletion`: 通用对话接口。
    -   `streamChatCompletion`: 流式输出，提供打字机效果。
    -   `generateFollowUpTopics` (**Sprout 功能**): 读取最近 2 条消息，预测 5 个后续问题。
    -   `splitTextIntoSections`: 智能拆分长文本为卡片。
    -   `generateQuickSproutTopics`: 快速生成 3 个相关话题。

2.  **数据服务 (`src/services/storage.js` & `boardService.js`)**:
    -   负责加载/保存画板数据。
    -   实现了本地 (IndexedDB) 与云端 (Firebase) 的双向同步逻辑。

3.  **用户统计 (`src/services/stats/userStatsService.js`)**:
    -   追踪 Token 使用量、模型调用次数，为计费和限流提供数据支持。

---

## 5. 页面构建与逻辑 (Page Construction)

### 5.1 路由配置 (`App.jsx`)
使用 `react-router-dom` 管理路由。
- **懒加载 (`lazyWithRetry`)**: 对 `GalleryPage`, `BoardPage` 等大组件进行代码分割，且增加了加载失败自动重试机制，提升弱网体验。
- **全局 Modal**: `SearchModal`, `ModernDialog` 挂载在 App 根节点，确保层级最高。
- **初始化钩子**: `useAppInit` 负责在应用启动时恢复用户会话和加载配置。

### 5.2 画板页 (`src/pages/BoardPage.jsx`)
这是应用的核心页面。
- **逻辑抽离**: 所有的交互逻辑（拖拽、生成、选中）都被抽离到了 hooks 中 (`useBoardLogic`)，保持 JSX 结构清晰。
- **自动背景生成逻辑**:
    -   当卡片数量 > 3 时：自动触发 `generateBoardSummary` 生成文字摘要。
    -   当卡片数量 > 10 时：自动触发 `generateBoardImage` 生成视觉背景图。
    -   **设计意图**: 让用户的画板随着内容丰富度自动“进化”，提供成就感。
- **Toolbar**: 底部悬浮工具栏，仅在选中元素时通过 `animate-slide-up` 出现。

### 5.3 落地页 (`src/modules/landing`)
- 独立的模块化设计，拥有自己的组件体系，不与主应用耦合，方便独立迭代营销内容。

---

## 6. 用户为何这样设计？(Design Rationale)

1.  **为什么不直接在组件里写 AI 调用？**
    为了**解耦**。如果未来更换 AI 提供商（例如从 OpenAI 换到 Anthropic），只需修改 `services/llm/factory.js`，而不需要修改任何 React 组件。

2.  **为什么使用 Zustand 而不是 Redux?**
    Zustand 更轻量，且没有 Redux 繁琐的 Boilerplate 代码。配合 Immer 中间件可以进行 Mutable 写法，开发效率极高。

3.  **为什么要做自动背景生成？**
    为了解决无限画布“空旷洁白”的焦虑感。当用户创作到一定程度，系统给予视觉反馈，增强用户的沉浸感。

4.  **Sprout (发芽) 功能的意义**
    打破思维僵局。当用户不知道下一步该想什么时，AI 根据上下文主动提问（Follow-up），引导用户继续深入思考。

---

此文档对应代码库版本：2026-01-09。
