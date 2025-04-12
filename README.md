# 🧠 Neural Canvas (Mixboard)
> *Where Infinite Ideas Meet Advanced AI*

Neural Canvas 是一个**无限画布思维导图与 AI 协作平台**。它打破了传统线性对话的限制，让你在无限的二维空间中自由组织想法，并随时召唤 AI (Gemini 3 Flash) 为每个节点注入智慧。

![Canvas Preview](./public/preview.png)

## ✨ 核心特性 (Core Features)

### 1. ♾️ 无限画布 (Infinite Canvas)
*   **自由布局**：双指缩放、拖拽平移，想在哪里画就在哪里画。
*   **智能连线**：点击卡片链接图标，轻松建立节点间的逻辑关联。
*   **空间记忆**：你的每一次移动都被精准记录，构建你的思维宫殿。

### 2. 🧠 满血版 Gemini 3 Flash 集成
我们突破了常规 API 的限制，集成了 **Google Search Grounding (联网搜索)**，让 AI 拥有“实时视力”。
*   **🌍 实时联网**：准确回答 2025 年的最新资讯（如《无限暖暖》2.0）。
*   **⚡️ 伪流式体验**：独创的 `Pseudo-Streaming` 架构，既保证了联网搜索的准确性，又还原了流畅的打字机效果。
*   **🚫 零报错**：智能合并消息队列，完美兼容 Gemini API 严苛的格式要求。

### 3. 💎 极致 UI (Glassmorphism)
*   **玻璃拟态**：全站采用现代磨砂玻璃风格，精致通透。
*   **暗黑模式**：深邃的 Cyberpunk 配色，专注思考不刺眼。
*   **流畅动效**：每一次展开、生成、连线都伴随着顺滑的物理动画。

## 🛠️ 技术栈 (Tech Stack)

*   **框架**: React 18 + Vite
*   **样式**: TailwindCSS (v3 & v4 features)
*   **AI**: Gemini 3 Flash Preview (Native API)
*   **存储**: Firebase (Cloud Sync) + LocalStorage (Offline)
*   **部署**: Vercel

## 🚀 快速开始 (Quick Start)

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境
在根目录创建 `.env` 文件（可选，本地预览已内置配置）：
```env
VITE_apiKey=your_gemini_api_key
```

### 3. 启动开发服务器
```bash
npm run dev
```
打开浏览器访问 `http://localhost:5173` 即可开始创作。

## 💡 独家技术揭秘：如何让 Gemini "变聪明"？

我们攻克了 GMI Cloud 托管环境下 Gemini 模型“失忆”（没联网）的问题。
详见我们的技术复盘文档：
*   [📄 深度技术复盘 (problem_synthesis.md)](./problem_synthesis.md)
*   [📝 集成更新日志 (walkthrough.md)](./walkthrough.md)
*   [🚀 软件进化足迹 (update.md)](./update.md)

---
*Built with ❤️ by Neural Canvas Team*
