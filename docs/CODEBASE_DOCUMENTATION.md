# NexMap 代码库文档索引

本索引对应当前代码快照：`v2.2.190`，同步日期 `2026-03-13`。

过去几个月项目已经从早期的单一白板应用，演进成包含 AI 编排、云同步、系统额度、支付、反馈、浏览器扩展和跨项目联动的完整产品，因此旧版文档中的目录结构、部署方式和服务边界已经不再准确。本目录下的文档现在以当前代码实现为准。

## 推荐阅读顺序

1. [项目概述](./OVERVIEW.md)
2. [核心架构](./ARCHITECTURE.md)
3. [状态管理](./STATE_MANAGEMENT.md)
4. [服务层](./SERVICES.md)
5. [组件结构](./COMPONENTS.md)
6. [Hooks 说明](./HOOKS.md)
7. [Cloudflare API](./API.md)
8. [关键业务逻辑](./BUSINESS_LOGIC.md)
9. [部署说明](./DEPLOYMENT.md)
10. [常见问题](./FAQ.md)
11. [近期演进历史](./HISTORY.md)

## 这套文档重点覆盖什么

- 当前产品由哪些页面、模块和服务组成
- Zustand store 的真实切片结构与职责分工
- AI 请求如何从前端进入 provider、队列、重试链和 Cloudflare Function
- 本地存储、云同步、离线模式、回收站、自动命名等核心规则
- 现在真正可用的部署脚本、扩展打包方式、Functions 接口清单

## 维护约定

- 当 `src/store/`、`src/services/`、`functions/` 或主要路由结构发生明显变化时，应同时更新对应文档。
- 如果只是小修复，不必机械改所有文档，但至少要确保 `README`、`API`、`DEPLOYMENT` 不会误导后来者。
