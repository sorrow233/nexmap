# 项目概述

## 1. 当前项目是什么

NexMap 是一个 AI 驱动的无限画布工作区，核心目标不是“在聊天框里问 AI”，而是把对话、笔记、图像、连线、指令和画板元数据全部放进同一块空间中协作。

当前实现已经覆盖以下产品层能力：

- 画板创作：卡片、便签、连线、分组、框选、缩放、自动布局
- AI 协作：流式回答、批量对话、分叉、Sprout、图片生成、收藏
- 画板增强：自动命名、自动摘要、自动背景图、画板级 Prompt、自定义指令
- 画廊能力：搜索、收藏夹、笔记中心、统计页、反馈页、回收站
- 配置能力：多 Provider、角色模型、系统额度、S3/图床、FlowStudio 联动
- 云端能力：Firebase 登录与同步，Cloudflare Functions API，Stripe 支付

## 2. 技术栈

| 类别 | 当前技术 |
| --- | --- |
| 前端框架 | React 18 + Vite |
| 路由 | React Router DOM v7 |
| 状态管理 | Zustand slices + Zundo temporal |
| 样式 | Tailwind CSS + Framer Motion |
| 存储 | IndexedDB、localStorage、Firebase Firestore |
| 认证 | Firebase Auth（Google 登录） |
| AI 协议 | Gemini Native、OpenAI Compatible、系统额度代理 |
| 部署 | Cloudflare Pages + Cloudflare Functions |
| 支付 | Stripe REST API（通过 Functions） |

## 3. 主要目录结构

```text
/Users/kang/Documents/aimainmap
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── components/
│   │   ├── board/
│   │   ├── chat/
│   │   ├── feedback/
│   │   ├── notes/
│   │   ├── settings/
│   │   └── share/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   │   ├── ai/
│   │   ├── boardTitle/
│   │   ├── db/
│   │   ├── image/
│   │   ├── llm/
│   │   ├── search/
│   │   ├── stats/
│   │   └── systemCredits/
│   ├── store/
│   │   └── slices/
│   ├── modules/landing/
│   └── utils/
├── functions/
│   ├── _middleware.js
│   └── api/
├── browser-extension/
├── docs/
├── public/
└── package.json
```

## 4. 关键页面与入口

| 路由/入口 | 作用 |
| --- | --- |
| `/`、`/intro` | 官网落地页 |
| `/gallery/*` | 画廊、收藏、笔记、统计、回收站、反馈 |
| `/board/:id` | 主画板页 |
| `/board/:id/note/:noteId` | 画板内便签全屏页 |
| `/pricing` | 支付与套餐 |
| `/feedback` | 公开反馈页 |
| `/admin` | 隐藏管理页 |

## 5. 当前代码结构的几个关键判断

- `src/App.jsx` 仍然是应用装配入口，但重逻辑已经大幅下沉到 `hooks/`、`services/`、`store/`。
- 画板的核心编排不是单个“上帝组件”，而是 `BoardPage + useBoardLogic + Zustand slices + services` 的组合。
- 存储层已经通过 `storage.js` facade 兼容旧调用，但真实职责在 `boardService.js` 与 `syncService.js`。
- `functions/` 已经是产品正式链路的一部分，不再只是实验性代理。
