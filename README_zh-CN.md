# NexMap

NexMap 是一个以 AI 协作为核心的无限画布应用，用来把对话、灵感、笔记、卡片和视觉上下文放进同一块空间里组织。

文档同步快照：`v2.2.190`，更新于 `2026-03-13`

## 当前项目已经包含的能力

- 无限画布：卡片、便签、分组、连线、框选、平移缩放、全局快捷键
- AI 工作流：流式对话、批量对话、Sprout/分叉、图片生成、卡片级任务隔离
- 画板级能力：全局 Prompt、画板 Prompt、自定义指令面板、自动命名、自动摘要、自动背景图
- 画廊能力：搜索、收藏、笔记中心、统计、回收站、反馈、定价与支付成功回流
- 模型配置：Gemini 原生协议、OpenAI Compatible、自带系统额度兜底
- 数据层：IndexedDB 本地缓存、Firebase Auth/Firestore 云同步、离线模式与重试队列
- 服务端：Cloudflare Pages Functions 负责 AI 代理、额度、支付、兑换码、反馈等接口
- 附加模块：浏览器扩展、FlowStudio 联动、SEO 中间件

## 技术栈

| 类别 | 当前实现 |
| --- | --- |
| 前端 | React 18 + Vite + React Router 7 |
| 状态管理 | Zustand slices + Zundo |
| 样式与动效 | Tailwind CSS + Framer Motion |
| 本地存储 | IndexedDB、localStorage |
| 云服务 | Firebase Auth / Firestore |
| AI 接入 | Gemini Native、OpenAI Compatible、Cloudflare 代理链 |
| 部署 | Cloudflare Pages + Functions |
| 支付 | Stripe REST API（通过 Functions 调用） |

## 目录速览

```text
src/
  components/        组件层，包含画布、聊天、设置、分享、反馈、统计等 UI
  hooks/             交互与业务编排 Hook
  pages/             画廊、画板、定价、反馈、管理页等路由页面
  services/          存储、同步、LLM、图片、导出、联动、统计等服务
  store/             Zustand Store 与各个 Slice
  modules/landing/   官网落地页模块
functions/
  api/               Cloudflare Functions 接口
browser-extension/   浏览器划词扩展
docs/                技术文档
```

## 快速开始

```bash
npm install
npm run dev
```

常用脚本：

```bash
npm run build
npm run deploy:main
npm run deploy:beta
npm run ext:build
npm run ext:zip
```

说明：

- `npm run build` 会先执行 `scripts/generate-sitemap.js`，再执行 Vite 构建。
- 前端 Firebase 配置当前写在 `src/services/firebase.js` 中。
- Cloudflare Pages Functions 会自动从 `functions/` 目录加载。

## 建议先读这些文档

- [代码库总文档](./docs/CODEBASE_DOCUMENTATION.md)
- [Cloudflare API 文档](./docs/API.md)
- [近期演进历史](./docs/HISTORY.md)
