# 画板背景生成 (Visualize) 功能技术逻辑文档

本文档详细说明了目前系统中的画板背景生成功能的代码逻辑、流程和关键文件。该功能旨在通过 AI 分析画板内容，自动生成符合语境的高质量背景图片。

## 核心文件概览

该功能主要涉及以下几个关键文件：

1.  **逻辑核心**: `src/hooks/useBoardBackground.js` (自定义 Hook，封装了所有业务逻辑)
2.  **UI 调用方 A**: `src/components/BoardGallery.jsx` (画板列表页，点击卡片按钮触发)
3.  **UI 调用方 B**: `src/pages/BoardPage.jsx` (画板详情页，自动触发或手动触发)

---

## 1. 核心逻辑 (`useBoardBackground.js`)

这是整个功能的"大脑"。它导出一个 `generateBackground` 函数，执行一个 2 阶段的 AI 流水线。

### 完整执行流程

当调用 `generateBackground(boardId, callback, options)` 时，系统按以下步骤执行：

#### 第一步：上下文提取 (Context Extraction)
*   **目的**：把画板上的所有卡片内容转换成 AI 能读懂的纯文本。
*   **逻辑**：
    1.  如果画板不存在或没有卡片，报错并中止。
    2.  遍历画板上的所有卡片，提取以下字段：
        *   `title` (标题)
        *   `text` (文本内容)
        *   `content` (便签内容)
        *   `messages` (如果是对话卡片，提取对话记录)
    3.  将提取到的内容拼接成一个长字符串 (`boardContext`)。
    4.  **日志**：`[Background Gen] Extracted context length: X` (这里的 X 是字符数，如果很大，AI 处理会变慢)。

#### 第二步：第一阶段 AI 并行处理 (Stage 1: Parallel)
*   **目的**：同时进行"视觉概念分析"和"文本摘要生成"。
*   **逻辑**：使用 `Promise.all` 并行发起两个请求：
    1.  **视觉概念分析 (Visual Concept)**:
        *   调用 LLM (文本模型)。
        *   **Prompt**: 要求 AI 分析上下文，构思一个适合该画板的视觉主题、氛围、环境设置。
        *   **注意**：如果传入了 `options.summaryOnly = true`，这一步会被跳过，返回 `null`。
    2.  **画板摘要 (Board Summary)**:
        *   调用 `aiSummaryService`。
        *   生成用于在 UI 上显示的简短标签和装饰性主题（如 "Blue", "Tech" 等）。
*   **日志**：`[Background Gen] Stage 1: Parallel Generation...`。

#### 第三步：摘要更新 (Intermediate Update)
*   **逻辑**：一旦摘要生成成功，立刻调用回调函数更新数据库中的画板元数据 (`summary` 字段)。
*   **UI 反馈**：此时用户可能会看到 Toast 提示 "Board Summary Updated!"。
*   **关键判断**：如果 `options.summaryOnly` 为 `true`，流程到此**直接结束**，不再生成图片。

#### 第四步：第二阶段 Prompt 工程 (Stage 2: Prompt Gen)
*   **前提**：必须有上一步生成的"视觉概念 (Visual Concept)"。
*   **逻辑**：
    *   调用 LLM (文本模型)。
    *   **Prompt**: 将抽象的"视觉概念"转换为专门针对绘图模型（如 DALL-E 3 或 Flux）优化的详细英文提示词 (Image Prompt)。
*   **日志**：`[Background Gen] Image Prompt: ...`。

#### 第五步：图片生成 (Stage 3: Image Gen)
*   **逻辑**：
    *   调用绘图模型接口 (`imageGeneration`)。
    *   传入上一步生成的详细 Prompt。
    *   **等待**：这是最耗时的一步，通常需要 10-30 秒。

#### 第六步：后续处理 (Finalization)
*   **逻辑**：
    1.  拿到图片 URL。
    2.  (可选) 通过代理下载图片并上传到 S3 存储桶（如果配置了 S3），确保持久化。
    3.  调用回调函数更新数据库中的画板元数据 (`backgroundImage` 字段)。
*   **UI 反馈**：Toast 提示 "Board Background Updated!"。

---

## 2. 问题修复说明 (BUG Fix)

**之前的 BUG 现象**：
点击卡片上的图片生成按钮，控制台显示 "Summary only requested. Skipping image generation."，且只生成了文本摘要，没有生成图片。

**原因分析**：
在 `BoardGallery.jsx` 和 `BoardPage.jsx` 中，调用 `generateBackground` 时被错误地硬编码了参数：
```javascript
// ❌ 错误代码 (v2.2.68 及以前)
generateBackground(id, callback, { summaryOnly: true }) 
```
这相当于告诉核心逻辑："我只要文本摘要，不要生成图片"。

**目前的逻辑 (v2.2.70)**：
我们移除了所有硬编码的 `{ summaryOnly: true }`，现在调用方式为：
```javascript
// ✅ 修复后的代码 (v2.2.70)
generateBackground(id, callback) 
// 或者显式传入 false
// generateBackground(id, callback, { summaryOnly: false })
```
这确保了默认行为是执行完整的流水线（生成摘要 + 生成图片）。

---

## 3. 为什么有时候会"卡住"？

您在日志中看到停在 `[Background Gen] Stage 1: Parallel Generation...`，原因如下：

*   **大数据量**：您的日志显示 `Extracted context length: 36377`。这意味着您一次性发送了 **3.6 万个字符** 给 AI。
*   **AI 处理时间**：AI 需要阅读理解这 3.6 万字，然后进行概括和构思。这个过程非常消耗算力。
*   **网络等待**：前端必须保持 HTTP 连接打开，直到 AI 返回结果。如果时间超过 60 秒，浏览器或网络层可能会超时。

**这不是代码逻辑错误**，而是因为输入内容过多导致的正常处理耗时。建议耐心等待 1-2 分钟，或者分拆画板内容。
