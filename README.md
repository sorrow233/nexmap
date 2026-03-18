# NexMap (Previously Mixboard)

> **A Spatial Workspace for Your Thoughts.**
>
> NexMap is an infinite whiteboard designed to help you organize ideas, plan projects, and explore topics visually. It combines a flexible canvas with a capable AI assistant, allowing you to move beyond linear text and think in 2D space.

---

<details open>
<summary><strong>🇺🇸 English (Click to Expand)</strong></summary>

## Overview

NexMap is not just a whiteboard; it is a **limitless cognitive space**. We have reimagined how humans and AI collaborate—not through chat windows, but through spatial organization.

### Key Features

#### 1. ♾️ Infinite Canvas
A strictly vector-based, high-performance rendering engine.
-   **Spatial Organization**: Pan and zoom freely. Your workspace is as big as your ideas.
-   **Cubic Bézier Connections**: Notes are linked with elegant, fluid curves that behave like liquid light, guiding your thought process.
-   **Viewport Culling**: Renders only what you see. Smooth performance even with 500+ cards.

#### 2. 🤖 AI Orchestration (Gemini 3)
A true "Agent" that lives on your canvas.
-   **Context Awareness**: The AI "sees" the spatial relationship between cards.
-   **Ghost Streaming**: Responses stream in Delta increments (<50ms latency), feeling like a ghost typing alongside you.
-   **Concurrency**: Send 10+ requests simultaneously; each card processes its own AI task independently without blocking others.

#### 3. 🛡️ Robust Architecture
Built for stability and speed.
-   **State Management**: Powered by **Zustand**. Atomic updates ensure typing never lags, even on massive boards.
-   **Persistence**: Auto-saves to **Firebase** with **IndexedDB** caching for large assets (images).
-   **Data Safety**: "Data Loss Prevention" mechanisms actively block save collisions during board switching.

#### 4. 🎨 Design Lab Aesthetics
-   **Glassmorphism**: A premium, frosted-glass UI that feels native to macOS.
-   **Cyber-Minimalism**: A blend of clean typography and subtle, high-tech animations.

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Build for production
npm run build
```

</details>

<details>
<summary><strong>🇯🇵 日本語 (クリックして展開)</strong></summary>

## 概要

NexMap（旧 Mixboard）は、単なるホワイトボードではありません。それは、思考のための**無限の空間**です。チャットウィンドウという狭い枠を超え、AIとともに「空間的」に思考する新しいワークフローを提案します。

### 主な機能

#### 1. ♾️ 無限のキャンバス
-   **空間的整理**: 自由にパン・ズームが可能です。思考の広さに制限はありません。
-   **ベジェ曲線接続**: カード同士をつなぐ線は、単なる直線ではなく、思考の流れを表す美しい曲線（Cubic Bézier）です。
-   **圧倒的なパフォーマンス**: 画面外の要素を描画しない「Viewport Culling」技術により、カードが500枚あっても滑らかに動作します。

#### 2. 🤖 AI オーケストレーション (Gemini 3)
-   **文脈認識**: AIはカード同士の位置関係やつながりを理解します。
-   **ゴースト・ストリーミング**: 回答はリアルタイム（遅延50ms以下）で生成され、まるで幽霊が隣でタイプしているかのような臨場感があります。
-   **同時並行処理**: 10個の質問を同時に投げても大丈夫。それぞれのカードが独立してAIと対話し、思考を止めません。

#### 3. 🎨 いらすとや風の温度感
-   **親しみやすさ**: 生成される背景画像やイラストには、あえて「**いらすとや**」風のスタイルを採用（Prompt Engineeringによる調整）。
-   **デザイン**: すりガラスのような美しい「グラスモーフィズム」デザインで、使う喜びを感じられます。

#### 4. 🛡️ 堅牢な設計
-   **データ保護**: ボード切り替え時のデータ衝突を防ぐ安全装置を搭載しています。
-   **自動保存**: Firebaseへのリアルタイム保存と、IndexedDBによる画像キャッシュで、メモリ不足（OOM）を防ぎます。

### 始め方

```bash
# 1. ライブラリのインストール
npm install

# 2. 開発サーバーの起動
npm run dev

# 3. 本番ビルド
npm run build
```

</details>

<details>
<summary><strong>🇨🇳 中文 (点击展开)</strong></summary>

## 软件进化故事：每一处细节都是心血

这两天，我们几乎没有合眼。为了打造那个我们心中理想的“无限画布”，我们推翻了无数次方案，又重建了无数次。这里的每一条更新，背后都是一次对完美的死磕。

### 核心特性

#### 1. 🏗️ 重筑基石：极致性能
-   **Zustand 状态管理**：告别卡顿。我们将 Canvas、Content、Settings 状态切片，输入文字时只有当前卡片在渲染。
-   **Canvas 级渲染**：连线不再是 DOM 节点，而是高性能 Canvas 绘制。100 条连线只占 1 个节点，拖拽丝滑如黄油。
-   **视口剔除 (Viewport Culling)**：只渲染你看得见的东西。哪怕画布上有 1000 张卡片，浏览器也毫无压力。

#### 2. 🧠 注入灵魂：AI 深度融合
-   **真·流式传输**：重构了数据管道，首字延迟压缩到 50ms 以内。看着文字一个个蹦出来，那种“它正在为你思考”的陪伴感，是完全不一样的。
-   **并发无限制**：引入了 **AIManager** 中央调度器。你想同时让 10 张卡片写代码？没问题，每一个请求都有独立的 ID 锁，互不干扰。
-   **环境感知**：生成新卡片时，AI 会自动“看路”，寻找空白位置，绝不遮挡你已有的内容。用起来就像一位有礼貌的绅士。

#### 3. 🎨 视觉觉醒：从工具到艺术
-   **三次贝塞尔曲线**：连线不再生硬，而是像水流一样优雅地绕过卡片。
-   **Design Lab**：我们引入了赛博朋克与极简主义结合的视觉风格。每一个按钮的微光、每一个滚动条的呼吸，都在诠释“高级感”。
-   **iPad 双击复活**：专门为触摸屏手写了双击检测算法。在 iPad 上，你依然可以行云流水地掌控全场。

#### 4. 🛡️ 数据守护
-   **区域 (Zones) 持久化**：修复了“失忆”的 Bug，现在的区域划分固若金汤。
-   **IndexedDB 离线缓存**：图片和重型资源直接存入本地数据库，彻底解决内存溢出 (OOM) 崩溃问题。

### 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 构建生产版本
npm run build
```

---

> *“这 51 小时，我们不仅是在打磨一个工具，更是在寻找 AI 与人类美感之间的那个平衡点。”*

</details>

---

## Tech Stack

*   **Frontend**: React 18, Vite
*   **Styling**: TailwindCSS
*   **AI**: Google Gemini 3 Flash
*   **State Management**: Zustand + Zundo (Undo/Redo)
*   **Cloud**: Firebase (Sync), Vercel (Hosting)

## Documentation

*   [Update Log (update.md)](./update.md) - **推荐阅读 / Recommended**
*   [Technical Overview (problem_synthesis.md)](./problem_synthesis.md)
*   [Integration Logs (walkthrough.md)](./walkthrough.md)
