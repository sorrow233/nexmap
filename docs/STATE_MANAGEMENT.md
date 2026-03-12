# 状态管理

## 1. Store 入口

根入口是 `src/store/useStore.js`。

当前特征：

- 使用 Zustand 组合 10 个 slices
- 使用 Zundo temporal middleware 维护撤销/重做
- 历史记录上限为 50 步
- 历史只追踪 `cards`、`connections`、`groups`、`boardPrompts`
- 暴露 `undo`、`redo`、`clearHistory`

```js
const useStoreBase = create(
  temporal(
    (set, get) => ({
      ...createCanvasSlice(set, get),
      ...createCardSlice(set, get),
      ...createConnectionSlice(set, get),
      ...createGroupSlice(set, get),
      ...createSelectionSlice(set, get),
      ...createAISlice(set, get),
      ...createSettingsSlice(set, get),
      ...createShareSlice(set, get),
      ...createCreditsSlice(set, get),
      ...createBoardSlice(set, get),
    }),
    { limit: 50, partialize: ... }
  )
);
```

## 2. Slice 清单

| Slice | 主要职责 |
| --- | --- |
| `canvasSlice` | 画布偏移、缩放、交互模式、连接起点、加载状态 |
| `cardSlice` | 卡片 CRUD、拖拽移动、更新正文、删除逻辑 |
| `connectionSlice` | 连线创建、删除、关联查询 |
| `groupSlice` | 分组/Zone 管理 |
| `selectionSlice` | 框选与选中集 |
| `aiSlice` | 生成中卡片、消息队列、流式更新、收藏、AI 入口动作 |
| `settingsSlice` | Provider 配置、角色模型、快速模型切换、离线模式 |
| `shareSlice` | 分享相关状态 |
| `creditsSlice` | 系统额度、Pro 状态、加载状态 |
| `boardSlice` | 画板 Prompt、全局 Prompt、画板指令设置 |

## 3. 当前几个最关键的状态模式

### 3.1 AI 状态不是“是否生成中”这么简单

`aiSlice` 当前至少包含这些重点能力：

- `generatingCardIds`: 正在生成的卡片集合
- `pendingMessages`: 卡片级待发送消息队列
- `createAICard()`: 建卡并初始化对话
- `handleChatGenerate()`: 组装上下文后进入 AIManager
- `toggleFavorite()`: 收藏消息到收藏系统

这让“流式回复期间继续发消息”“关闭 ChatModal 后仍排队发送”等行为成为可能。

### 3.2 设置状态分为“持久配置”和“会话覆盖”

`settingsSlice` 中当前最容易忽略的点：

- `providers` / `globalRoles` 是长期配置
- `quickChatModel` / `quickChatProviderId` 是当前画布的快速临时覆盖
- `getEffectiveChatConfig()` 会优先使用会话覆盖，再回退到全局角色配置
- `offlineMode` 可能被手动打开，也可能由同步异常自动触发

### 3.3 画板状态不仅仅是 cards

`boardSlice` 当前管理：

- `boardPrompts`
- `boardInstructionSettings`
- `globalPrompts`
- 全局 Prompt 的本地持久化时间戳

也就是说，画板级 Prompt 和自定义指令已经是一级产品概念，不再是临时 UI 附件。

## 4. Temporal 历史设计

当前历史策略刻意不包含所有状态：

- 包含：`cards`、`connections`、`groups`、`boardPrompts`
- 不包含：Provider 配置、额度、模态框开关、搜索状态、同步状态

这样可以把撤销/重做聚焦在“画板内容”本身，避免 UI 抖动和无意义的历史污染。

## 5. 使用 Store 时的注意事项

- 尽量订阅稳定原始字段，不要在 selector 内部返回新的对象或数组。
- 最近修复过 `getEffectiveChatConfig()` 被直接放进 selector 导致 React 无限重渲染的问题，后续新增 selector 时要避免重犯。
- 对高频流式更新，项目已经使用 `streamRenderBuffer` 做缓冲，不要在组件层再叠一层粗暴 `setState`。
