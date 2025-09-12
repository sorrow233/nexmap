---
description: SEO 极致优化
---

全栈 SEO 架构工作流 (React + Cloudflare Pages)
核心哲学： 采用 “边缘注入 (Edge Injection)” 策略。 目标： 实现 “双面渲染” —— 用户享受 SPA 的极致丝滑（0 跳转、0 闪烁），爬虫看到完整的静态 HTML。

第一阶段：单一真理源 (The Single Source of Truth)
核心问题： 防止“伪装（Cloaking）”风险，即爬虫看到的标题和用户看到的不一致。 现代方式： 配置文件驱动（Config-Driven）。

建立 SEOConfig 字典

Action: 在代码库中创建一个中央 JSON/TS 文件，映射所有路由的元数据。

内容： 包含每种语言的 Title, Description, OG Image URL。

Why: 这是“大脑”。React 组件读取它来显示页面标题，Cloudflare Middleware 读取它来修改 HTML。保证人机看到的数据源完全一致。

本地化策略： 关键词本地化，而非翻译。日语 Title 用“マインドマップ”，英语用“Mind Map”。

第二阶段：边缘拦截系统 (Infrastructure & Edge)
核心问题： SPA 是空壳，爬虫不执行 JS 就看不到内容。 现代方式： 利用 Cloudflare Functions 在网络边缘动态重写 HTML。

部署 Cloudflare Functions (Middleware)

Action: 编写一个 _middleware.ts 或 Functions 脚本。

逻辑：

拦截所有 HTML 请求。

解析 URL 确定语言（如 /ja/）和页面 ID。

从 SEOConfig 中查找对应元数据。

使用 HTMLRewriter API，在 HTML 返回给浏览器之前，动态替换 <title>、<meta description> 和 Open Graph 标签。

Why: 这是本方案的核心。 它发生在 CDN 边缘，延迟极低。用户拿到的是带数据的 HTML，React 随后接管（Hydrate），体验无损。

注入 JSON-LD (结构化数据)

Action: 同样利用 HTMLRewriter，在 <head> 中 append 一个 <script type="application/ld+json">。

Why: 只有这样，Google 才能在搜索结果中显示“软件评分”、“价格”等富媒体摘要（Rich Snippets）。

第三阶段：路由与链接 (Routing & Canonical)
核心问题： 避免权重分散和重复收录。

URL 规范化 (Canonical Tags)

Action: 每个页面必须包含 <link rel="canonical" href="..." />，指向不带参数的纯净 URL。

Why: 当用户访问 .../ja/?source=twitter 时，告诉 Google “把权重算在 .../ja/ 头上”。

严格的目录结构

Action: 坚持使用子目录 /en/, /ja/。

禁止: 避免使用查询参数 ?lang=en（Google 处理得很差）或子域名（权重不继承）。

第四阶段：语义化与内容 (Semantics & Content)
核心问题： 让爬虫读懂网页的“骨架”。

语义化标签 (Semantic HTML)

Action: 严格遵守：H1 (唯一主标题) -> H2 (章节) -> H3 (子点)。

Check: 图片必须有 alt 属性，且文件名语义化（ai-mind-map.png）。

处理 Soft 404 (软 404)

Action: 在 React 的 NotFound 组件中，动态插入 <meta name="robots" content="noindex">。

Why: SPA 路由不存在时通常也会返回 HTTP 200。这个 Meta 标签是告诉 Google “这虽然能打开，但请把它从索引里删掉”的唯一补救措施。

第五阶段：索引通道 (Indexing Pipeline)
核心问题： 主动喂数据，而不是被动等待。

构建时生成 Sitemap (Post-build)

Action: 编写构建脚本，遍历所有路由生成 sitemap.xml。

关键优化： 将 Hreflang 信息直接写入 Sitemap，而不是塞在 HTML 头部。

Why: 保持 HTML 头部清爽，提高加载速度，同时明确告诉 Google 各语言版本的对应关系。

Robots.txt 配置

Action: 开放 /，封禁 /api/ 和 /admin/，并在底部指明 Sitemap 地址。

第六阶段：性能护城河 (Core Web Vitals)
核心问题： 速度慢 = 排名降。

CLS (布局偏移) 防御

Action: 所有 <img> 必须设置宽高或 CSS 占位。

Why: 防止图片加载出来时页面抖动，这是 Google 最讨厌的用户体验问题之一。

LCP (最大内容渲染) 优化

Action: 首屏大图（Hero Image）禁止懒加载，添加 fetchpriority="high"。

总结：为什么这套方案是“最优解”？
用户体验无损： 我们没有在客户端做重定向（Client-side Redirect），也没有用服务器端渲染（SSR）的复杂架构。React 依然负责丝滑的页面切换。

SEO 满分： 爬虫拿到了它是嗜好的所有东西：静态 HTML、语义化标签、结构化数据、极快的首字节时间（TTFB）。

开发维护统一： 所有 SEO 数据源于一个 Config 文件，前端开发和 SEO 优化不再打架。