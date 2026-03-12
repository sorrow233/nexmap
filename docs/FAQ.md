# 常见问题与注意事项

## 1. 数据都存在哪里

| 数据 | 位置 | 说明 |
| --- | --- | --- |
| 画板正文 | IndexedDB + Firestore | 本地优先，登录后可同步 |
| 画板列表元数据 | localStorage + Firestore | 包括标题、摘要、背景、删除状态 |
| 视口状态 | localStorage | 每个画板单独记录 |
| Provider 配置 | localStorage (`mixboard_providers_v3`) | 包含模型和协议配置 |
| 快速模型切换 | localStorage (`mixboard_quick_models`) | 只影响当前对话角色 |
| 全局 Prompt | localStorage | 在 `boardSlice` 管理 |
| 自定义指令 | localStorage（带时间戳包装）+ 云端设置 | 画板启用状态另有缓存 |
| 图片 | IndexedDB / 对象存储 / base64 回退 | 取决于配置和链路 |
| 系统额度 / 兑换码 | Cloudflare KV | 服务端管理 |

## 2. 为什么有时候会自动进入离线模式

这是同步层的保护机制：

- Firestore 配额异常
- 短时间网络异常
- 后台写入反复失败

系统会自动触发 `offlineMode`，避免继续打崩同步链路。恢复后可再尝试云同步。

## 3. 为什么同样是 Gemini，有时会直连，有时会走代理

因为当前代码会按以下条件区分：

- `baseUrl`
- Key 类型是否为官方 `AIza`
- provider 协议与模型名

所以“我选了 google”并不等于“一定直连 Google 官方接口”。

## 4. 为什么开两个标签页会有一个只读

这是 `useTabLock` 的保护设计：

- 同一画板默认只允许一个主编辑标签页
- 其他标签页会提示只读
- 需要时可以手动点击 `Take Over`

## 5. 为什么没配 API Key 也能用

因为当前项目有系统额度链路，会在用户未配置自有 Key 时切到 `SystemCreditsProvider`。

## 6. 开发时最容易踩的坑

- 在 Zustand selector 里返回新对象，容易触发高频重渲染甚至死循环
- 在组件中直接追加复杂 AI / 同步逻辑，会把业务边界重新打乱
- 修改 Gemini 链路时如果没同时考虑代理、重试、搜索工具和 KeyPool，很容易引入回归
