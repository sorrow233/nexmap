# 服务层

## 1. 服务层现状

当前 `src/services/` 已经不是简单的 API 包装目录，而是项目的主要业务中台。真正的“产品规则”大量存在于这里。

主要模块如下：

| 模块 | 作用 |
| --- | --- |
| `llm.js` | AI 文本/流式/图片统一入口 |
| `llm/` | Provider 工厂、注册表、协议实现、解析器、并发闸门、KeyPool |
| `ai/AIManager.js` | AI 任务调度中心 |
| `boardService.js` | 本地画板 CRUD、回收站、视口、搜索加载 |
| `storage.js` | 对旧调用保持兼容的 facade |
| `syncService.js` | Firestore 同步、监听、重试、离线模式 |
| `customInstructionsService.js` | 自定义指令目录与画板启用规则 |
| `boardTitle/metadata.js` | 自动/手动/占位标题规则 |
| `search/searchDataLoader.js` | 受控并发的画板搜索加载器 |
| `stats/userStatsService.js` | 用户统计 |
| `favoritesService.js` | 收藏能力 |
| `notesService.js` | 笔记中心数据 |
| `s3.js` | 可选对象存储上传 |
| `linkageService.js` | FlowStudio 联动 |

## 2. LLM 体系

### 2.1 统一入口

`src/services/llm.js` 负责导出：

- 文本补全
- 流式对话
- 图片生成
- 其他分析类调用

组件和 slice 不应直接耦合具体 provider 细节，而是尽量通过这里进入。

### 2.2 Provider 选择

`src/services/llm/factory.js` 当前规则：

- 没有用户 API Key 时，默认走 `SystemCreditsProvider`
- `protocol === gemini` 且模型名确实是 Gemini/Gemma，走 `GeminiProvider`
- 其他情况走 `OpenAIProvider`

### 2.3 Gemini 链路是当前最复杂的服务

`src/services/llm/providers/gemini.js` 已经承载很多关键规则：

- 官方 Gemini 直连与 GMI 代理的链路区分
- KeyPool 冷却与等待
- 模型级/请求级重试
- `gemini-3.1-pro-preview` 的特殊 fallback 与高负载处理
- 搜索工具默认策略
- 流式解析与非流式降级协作
- 图片生成入口

配套文件：

- `providers/gemini/errorUtils.js`
- `providers/gemini/streamParser.js`
- `providers/gemini/concurrencyGate.js`
- `providers/gemini/partUtils.js`

## 3. AI 调度中心

`src/services/ai/AIManager.js` 当前承担：

- 按优先级排队
- 卡片级并发上限（当前 `MAX_CONCURRENT_CARDS = 8`）
- 重复任务去重（非 chat 类型）
- 按 `card:{id}` 标签取消运行中任务
- 在任务完成/失败/取消后自动继续 drain 队列

这层设计的意义是把“请求稳定性”从 UI 组件里拿出来，避免一堆按钮逻辑各自实现并发控制。

## 4. 本地存储与画板服务

### 4.1 `boardService.js`

负责：

- 画板元数据列表
- 画板正文保存/加载
- 软删除、恢复、永久删除
- 视口状态
- 给搜索模块提供板内容加载接口

### 4.2 `storage.js`

它是兼容层，不是新的业务中心。很多旧代码仍通过这里访问：

- `createBoard`
- `saveBoard`
- `loadBoard`
- `saveBoardToCloud`
- `updateUserSettings`

真实实现则已经拆到 `boardService.js` / `syncService.js` / `imageStore.js`。

## 5. 云同步与离线兜底

`syncService.js` 现在非常关键，当前包含：

- 画板元数据监听
- 当前活跃画板监听
- 云端写入排队
- 重试定时器
- 快照游标
- 离线模式自动切换
- 配额 / 网络问题检测
- 同步成功后的离线状态恢复

这是最近几个月重构最重的模块之一，也是画板“不丢数据”的核心。

## 6. 指令、自动命名与自动摘要

### 6.1 自定义指令

`customInstructionsService.js` 提供：

- 指令条目标准化
- 全局/可选指令拆分
- 画板已启用指令集合清洗
- 当前画板有效指令解析
- 本地缓存读写

### 6.2 自动命名

`useAutoBoardNaming.js` 结合：

- `boardTitle/metadata.js`
- `services/ai/boardAutoTitleService.js`

来判断：

- 当前标题是不是占位标题
- 是否已被用户手动命名
- 是否达到自动命名阈值

### 6.3 自动摘要与背景

`useAutoBoardSummaries.js` / `useBoardBackground.js` 当前负责：

- `3-9` 张卡时尝试生成摘要
- `10+` 张卡时尝试生成背景图
- 避免同一画板在会话中重复触发

## 7. 其他值得注意的服务

- `s3.js`: 没配对象存储时会退回本地 Base64/IDB 存储
- `linkageService.js`: 会把 FlowStudio UID 本地缓存并尽量同步云端
- `dataExportService.js`: 导出/分享相关逻辑
- `scheduledBackupService.js`: 定时备份相关能力
- `systemCredits/systemCreditsService.js`: 额度查询与错误类型
