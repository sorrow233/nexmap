# MixBoard Canvas 代码库文档

> 📚 本文档作为 MixBoard Canvas 代码库文档的总索引 (v2.1.4)。为了更好的维护性和可读性，文档已被模块化为单独的文件。

## 🆕 最新更新 (v2.1.4)
- **支付系统**: 集成 Stripe 实现积分购买和 Pro 会员计划。
- **反馈系统**: 用户反馈收集，支持投票和评论功能。
- **数据安全**: S3 图片存储和定时本地备份。
- **同步功能**: 针对多设备使用的智能冲突解决机制。

## 📖 目录

### 1. [项目概述 (Overview)](docs/OVERVIEW.md)
*   **项目概述**: MixBoard Canvas 是什么及其核心功能。
*   **技术栈**: 项目使用的技术。
*   **目录结构**: 代码库的文件组织方式。

### 2. [架构 (Architecture)](docs/ARCHITECTURE.md)
*   **核心架构**: 高层架构图和描述。
*   **数据流**: 数据如何在应用中流动，包括用户交互、画板图表和启动流程。

### 3. [状态管理 (State Management)](docs/STATE_MANAGEMENT.md)
*   **Zustand Store**: 全局状态是如何管理的。
*   **Slices**: 各个状态切片的详情，如 `cardSlice`, `aiSlice`, `canvasSlice` 等。
*   **撤销/重做**: 时间旅行历史记录的实现。

### 4. [服务 (Services)](docs/SERVICES.md)
*   **LLM 服务**: 多提供商 AI 支持架构 (Gemini, OpenAI)。
*   **AI 管理器**: AI 请求的任务队列系统。
*   **画板服务**: 创建、保存和加载画板的逻辑。
*   **同步服务**: Firebase 云同步。
*   **存储**: 本地存储机制 (IndexedDB, localStorage)。
*   **新特性**: 兑换服务, S3 存储, 定时备份。

### 5. [组件 (Components)](docs/COMPONENTS.md)
*   **组件关系**: 组件之间如何交互。
*   **核心组件**: `App`, `BoardPage`, `Canvas`, `Card` 等组件的详情。

### 6. [Hooks](docs/HOOKS.md)
*   **自定义 Hooks**: 可复用逻辑的文档，如 `useCardCreator`, `useDraggable`, `useAISprouting`。

### 7. [API (Cloudflare Functions)](docs/API.md)
*   **端点**: 服务器端即服务的文档，如 `gmi-proxy`, `system-credits`, `create-checkout`, `feedback`。

### 8. [业务逻辑 (Business Logic)](docs/BUSINESS_LOGIC.md)
*   **核心逻辑**: 深入了解特定功能，如多提供商支持、积分系统和自动布局。

### 9. [部署 (Deployment)](docs/DEPLOYMENT.md)
*   **命令**: 如何运行、构建和部署应用。
*   **环境变量**: 必须的配置。

### 10. [常见问题与说明 (FAQ & Notes)](docs/FAQ.md)
*   **常见问题**: 状态持久化详情、安全说明、性能提示。

### 11. [历史记录 (History)](docs/HISTORY.md)
*   **Git 历史**: 随时间推移的重要更改、特性和错误修复的摘要。

### 12. [Git 疑难杂症与修复 (Git Troubleshooting)](docs/GIT_TROUBLESHOOTING.md)
*   **Bug 修复**: 记录了项目中遇到的致命 Bug (如死循环、UI 卡死) 及其解决方案。
*   **最佳实践**: 避免未来踩坑的经验总结。
