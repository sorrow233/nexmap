# 画板背景生成 功能逻辑文档 (v2.2.71+)

本文档详细说明了目前系统中的画板背景生成功能的代码逻辑、流程和关键文件。

**更新说明 (v2.2.71)**: 本功能已完成**彻底重构**。文本摘要生成（免费/基础功能）与背景图片生成（高级功能）现在是两个完全独立的函数，互不依赖。

## 核心文件概览

1.  **逻辑核心**: `src/hooks/useBoardBackground.js` (核心 Hook)
2.  **UI 调用**: `src/components/BoardGallery.jsx` (手动触发) & `src/pages/BoardPage.jsx` (自动触发)

---

## 核心逻辑 (`useBoardBackground.js`)

该 Hook 现在导出两个独立的函数：`generateBoardSummary` 和 `generateBoardImage`。

### 1. 通用辅助：上下文提取 (Context Extraction)
两个功能都依赖于同一个辅助函数 `extractBoardContext`。
*   **逻辑**：遍历画板上的所有卡片，提取 Title, Text, Content, Messages，拼接成一个长字符串。
*   **日志**：`[Background Gen] Extracted context length: X`。

### 2. 功能 A：文本摘要生成 (`generateBoardSummary`)
*   **用途**：生成画板的标签 (Tags) 和主题色 (Theme)，用于 Dashboard 卡片展示。
*   **触发条件**：
    *   自动：当画板卡片数 > 3 且从未生成过摘要时。
*   **流程**：
    1.  提取上下文。
    2.  调用 `aiSummaryService` (文本模型)。
    3.  返回摘要对象 `{ summary: "...", theme: "..." }`。
    4.  更新数据库 `summary` 字段。
*   **与其他功能的关系**：完全独立，**不会**触发图片生成。

### 3. 功能 B：背景图片生成 (`generateBoardImage`)
*   **用途**：分析画板内容，生成一张匹配意境的背景大图。
*   **触发条件**：
    *   手动：用户点击 Gallery 卡片上的图片按钮。
    *   自动：当画板卡片数 > 10 且从未生成过背景图时。
*   **流程**：
    1.  提取上下文。
    2.  **视觉概念分析**：调用 LLM 分析画板的"视觉主题" (Visual Concept)。
    3.  **Prompt 工程**：调用 LLM 将概念转化为详细的英文绘图提示词 (Image Prompt)。
    4.  **绘图**：调用绘图模型 (DALL-E/Flux) 生成图片。
    5.  **上传**：上传至 S3。
    6.  更新数据库 `backgroundImage` 字段。
*   **日志关键点**：
    *   `[Image Gen] Starting generation...`
    *   `[Image Gen] Visual Concept: ...`
    *   `[Image Gen] Final Image Prompt: ...`
*   **与其他功能的关系**：完全独立，不需要依赖摘要生成的结果。

---

## 自动触发逻辑 (`BoardPage.jsx`)

在画板详情页，我们使用两个独立的检测逻辑：

1.  **摘要检测**：
    *   如果 `activeCards > 3` 且没有摘要 -> 调用 `generateBoardSummary`。
2.  **图片检测**：
    *   如果 `activeCards > 10` 且没有背景图 -> 调用 `generateBoardImage`。

---

## 常见问题 (FAQ)

**Q: 为什么点击生成图片按钮没有反应？**
A: 请检查控制台日志。
*   如果看到 `[Image Gen] Starting generation...`，说明请求已发送，正在等待 AI (可能需要 30 秒)。
*   如果不显示任何日志，可能是组件未正确绑定事件。

**Q: 为什么日志显示 Context length 很大 (例如 30k+)?**
A: 这是正常的。我们将所有卡片内容都发给了 AI 以保证生成的准确性。处理大量文本需要时间，请耐心等待。
