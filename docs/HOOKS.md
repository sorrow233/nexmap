# 自定义 Hooks

## 1. 主要 Hooks 一览

| Hook | 作用 |
| --- | --- |
| `useAppInit` | 登录态初始化、画板列表、基础数据启动 |
| `useBoardLogic` | 画板主编排 Hook，聚合大量交互与业务动作 |
| `useBoardSync` | 当前画板的云同步监听 |
| `useTabLock` | 多标签页只读锁与接管逻辑 |
| `useBoardBackground` | 画板摘要/背景生成 |
| `useAutoBoardNaming` | 自动命名队列 |
| `useAutoBoardSummaries` | 自动摘要/自动背景触发队列 |
| `useCardCreator` | 建卡、建便签、批量 AI 创建 |
| `useAISprouting` | Sprout / 分叉相关工作流 |
| `useSelection` | 框选逻辑 |
| `useCanvasGestures` | 平移、滚轮缩放、触控手势 |
| `useGlobalHotkeys` | 全局快捷键 |
| `useImageUpload` | 图片上传流程 |
| `useThumbnailCapture` | 画板缩略图捕获 |
| `useVisibleCanvasData` | 画布可视区域数据选择 |

## 2. 最关键的几个 Hook

### `useBoardLogic`

这是当前画板页最重要的编排层，负责把以下内容串起来：

- store 中的卡片、连接、分组、设置、指令、AI 状态
- 画板内创建/删除/批量对话/分叉/便签创建
- 路由、全屏便签、拖拽粘贴、Prompt Drop
- 指令面板与设置联动

如果你在找“BoardPage 的业务逻辑去哪了”，大部分答案都在这里。

### `useBoardSync`

负责：

- 监听当前活跃画板的云端变化
- 避免多标签页编辑冲突
- 将实时更新写回本地状态

### `useAutoBoardNaming` / `useAutoBoardSummaries`

这是近期新增的重要后台 Hook：

- `useAutoBoardNaming` 会按队列为符合条件的画板生成自动标题
- `useAutoBoardSummaries` 会在画廊里异步处理摘要或背景图生成

它们都尽量避免把逻辑塞回 UI 组件里。

## 3. Hook 设计建议

- 涉及跨组件共享的业务规则，优先写进 Hook 或 service，不要写进单个组件。
- 高频交互 Hook 应尽量只暴露必要状态和动作，避免返回大量每次都新建的对象。
- 画布类 Hook 新增逻辑时，优先检查是否会放大渲染频率或破坏现有并发/节流策略。
