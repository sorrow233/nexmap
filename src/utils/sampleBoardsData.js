/**
 * sampleBoardsData.js
 * 新用户首次访问时展示的示例面板数据
 * 展示产品的核心功能和典型使用场景
 */

/**
 * 获取示例面板列表（仅元数据，用于 Gallery 展示）
 */
export const getSampleBoardsList = () => {
    const now = Date.now();

    return [
        {
            id: "sample-musk-algorithm",
            name: "马斯克的五步工程法",
            createdAt: now - 86400000 * 2,
            updatedAt: now - 3600000,
            lastAccessedAt: now - 3600000,
            cardCount: 16, // 扩充内容
            backgroundImage: "https://aimappic.obs.cn-east-3.myhuaweicloud.com/1766823633432-spvds5w-bg_1766817094375_1766823633429.png", // 复用一张好看的图
            summary: {
                theme: "purple",
                summary: "五步工作法 · SpaceX 案例 · 极简主义"
            },
            isSample: true
        },
        {
            id: "sample-indie-hacker",
            name: "独立产品商业化指南",
            createdAt: now - 86400000 * 7,
            updatedAt: now - 14400000,
            lastAccessedAt: now - 14400000,
            cardCount: 24, // 扩充内容
            backgroundImage: "https://storage.googleapis.com/gmi-video-assests-prod/user-assets/e54d0b64-bb26-47df-9cbf-c1d6e0987a41/a6cee7b4-4b9b-467c-b550-f061dea6fe40/gmi-videogen/generated/google_ai_studio_929a3a18-6141-40e1-836c-73d6a52c3f33_aa443634-83fd-47cb-ba9c-04841878394d.png",
            summary: {
                theme: "indigo",
                summary: "SaaS 定价 · 流量增长 · 避坑指南"
            },
            isSample: true
        },
        {
            id: "sample-dev-workflow",
            name: "全栈 AI 开发工作流",
            createdAt: now - 86400000 * 14,
            updatedAt: now - 43200000,
            lastAccessedAt: now - 43200000,
            cardCount: 32, // 扩充内容
            backgroundImage: "https://aimappic.obs.cn-east-3.myhuaweicloud.com/backgrounds/2026-01/1767704397504-qac658g-bg_1767688330243_1767704397502.png",
            summary: {
                theme: "blue",
                summary: "技术栈选型 · CI/CD · 性能优化 · 状态管理"
            },
            isSample: true
        }
    ];
};

/**
 * 获取示例面板的完整数据（cards, connections, groups）
 */
export const getSampleBoardData = (boardId) => {
    // 辅助：生成卡片
    // 布局策略：cols 表示列数，i 表示当前索引，spacing 表示间距
    const createLayoutCard = (id, i, colCount, title, content, type = "standard", color = "default", baseXY = { x: 0, y: 0 }) => {
        const spacingX = 450;
        const spacingY = 350;
        const row = Math.floor(i / colCount);
        const col = i % colCount;
        return {
            id,
            x: baseXY.x + col * spacingX,
            y: baseXY.y + row * spacingY,
            type,
            data: type === "standard" ? {
                title,
                messages: [{ role: "assistant", content }],
                model: "sample"
            } : { content, color, title }
        };
    };

    const sampleData = {
        // =================================================================================
        // BOARD 1: 马斯克的五步法 (16 Cards) - 重点展示分区和逻辑流
        // =================================================================================
        "sample-musk-algorithm": {
            cards: [
                // Zone 1: The Algorithm (Cards 0-6)
                ...[
                    { t: "核心法则：The Algorithm", c: "马斯克在生产地狱中总结出的绝对真理。每当偏离这五步，灾难就会发生。" },
                    { t: "Step 1: 质疑需求", c: "需求越聪明的人提出来的，越要质疑。因为人们往往不敢质疑聪明人。任何需求都必须有具体的负责人，而不是某个「部门」。" },
                    { t: "Step 2: 删除部件/流程", c: "如果你的删除量不够，说明你没努力。如果最后你不需要把删掉的 10% 加回来，说明你删得还不够多。", type: "note", color: "red" },
                    { t: "Step 3: 简化和优化", c: "最常见的错误是「优化一个不该存在的东西」。必须先做完前两步（质疑+删除），确认它必须存在后，才能开始优化。" },
                    { t: "Step 4: 加速周期", c: "只有当你挖出了垃圾流程，停止了为了挖垃圾而挖垃圾，这时候才能加速。" },
                    { t: "Step 5: 自动化", c: "最后一步才是用机器取代人。过早自动化是产能地狱的根源（例如 Model 3 早期的 Flufferbot 悲剧）。" },
                    { t: "First Principles", c: "永远回归物理学第一性原理。不要类比思考（别人怎么做我也怎么做），要思考事物的本质极限在哪里。", type: "note", color: "purple" }
                ].map((item, i) => createLayoutCard(`m-${i}`, i, 3, item.t, item.c, item.type, item.color, { x: 0, y: 0 })),

                // Zone 2: Starship Case Study (Cards 7-11)
                ...[
                    { t: "案例：星舰栅格翼", c: "传统经验：栅格翼需要折叠（气动优化）。\nAlgorithm应用：马斯克问「不折叠会死吗？」。结论是不折叠只增加微小阻力，但省去了沉重的液压折叠机构。结果：删除折叠机构。", type: "standard" },
                    { t: "案例：不锈钢外壳", c: "传统经验：碳纤维轻，用碳纤维。\nAlgorithm应用：不锈钢虽然重，但熔点极高，可以省去背风面的隔热瓦。综合计算下来，整体更优且极其便宜。结果：改用不锈钢。", type: "standard" },
                    { t: "案例：筷子夹火箭", c: "传统经验：火箭必须自带起落架。\nAlgorithm应用：起落架是死重。为什么不能让地面（发射塔）接住它？结果：删除起落架，移到地面。", type: "note", color: "blue" },
                    { t: "Idiot Index", c: "白痴指数：成品成本 / 原材料成本。如果这个比值很高，说明你的制造过程极其低效（如传统航天）。SpaceX 的目标是把这个指数降到个位数。", type: "note", color: "yellow" },
                    { t: "Raptor 3 引擎", c: "2025 年的奇迹。不需要隔热罩，因为把冷却管路整合进了内壁。没有外部零件，这就是「删除」的极致。", type: "standard" }
                ].map((item, i) => createLayoutCard(`m-case-${i}`, i, 3, item.t, item.c, item.type, item.color, { x: 0, y: 1000 })),

                // Zone 3: Personal Application (Cards 12-15)
                ...[
                    { t: "生活中的应用", c: "不仅仅是造火箭。这套逻辑适用于所有复杂系统：学习、烹饪、甚至人际关系。", type: "note", color: "green" },
                    { t: "删除：极简生活", c: "家里 80% 的东西是没用的。不是整理它们，而是删除它们。" },
                    { t: "质疑：社会规训", c: "「大家都这么做」不是理由。为什么要买房？为什么要考证？如果不做会怎样？" },
                    { t: "简化：饮食习惯", c: "不要追求花哨的食谱。只需几种核心调料（盐、蒜、鲜），就能覆盖 90% 的美味需求。", type: "standard" }
                ].map((item, i) => createLayoutCard(`m-life-${i}`, i, 4, item.t, item.c, item.type, item.color, { x: 0, y: 1800 }))
            ],
            connections: [
                { from: "m-0", to: "m-1" }, { from: "m-1", to: "m-2" }, { from: "m-2", to: "m-3" }, { from: "m-3", to: "m-4" }, { from: "m-4", to: "m-5" },
                { from: "m-0", to: "m-6" },
                { from: "m-3", to: "m-case-0" }, { from: "m-3", to: "m-case-1" }, { from: "m-2", to: "m-case-2" },
                { from: "m-6", to: "m-case-3" },
                { from: "m-0", to: "m-life-0" }, { from: "m-2", to: "m-life-2" }
            ],
            groups: [
                { id: "g-m-1", title: "五步工程法理论", cardIds: ["m-0", "m-1", "m-2", "m-3", "m-4", "m-5", "m-6"], color: "purple", x: -50, y: -150, width: 1400, height: 900 },
                { id: "g-m-2", title: "SpaceX 实战案例", cardIds: ["m-case-0", "m-case-1", "m-case-2", "m-case-3", "m-case-4"], color: "blue", x: -50, y: 850, width: 1400, height: 800 },
                { id: "g-m-3", title: "生活哲学应用", cardIds: ["m-life-0", "m-life-1", "m-life-2", "m-life-3"], color: "green", x: -50, y: 1700, width: 1800, height: 500 }
            ]
        },

        // =================================================================================
        // BOARD 2: 独立开发商业化 (24 Cards) - 重点展示内容密度
        // =================================================================================
        "sample-indie-hacker": {
            cards: [
                // Section 1: 核心思维 (0-7)
                ...[
                    { t: "商业化困境", c: "用户懒得学新东西，开发者没钱推广。这不是死局，是过滤网。" },
                    { t: "切换成本 (Switching Cost)", c: "除非你的产品好 10 倍，否则用户不会迁移。因为迁移有「认知成本」和「数据沉没成本」。" },
                    { t: "维生素 vs 止痛片", c: "维生素：锦上添花（整理笔记）。止痛片：雪中送炭（一键修复 Bug）。Indie Hacker 只能做止痛片。", type: "note", color: "red" },
                    { t: "三秒原则", c: "用户打开网页 3 秒内，必须知道这东西能解决他什么痛苦。" },
                    { t: "寄生策略", c: "没钱买流量？去有鱼的地方钓鱼。Chrome 商店、Notion 社区、Shopify 插件市场。", type: "note", color: "blue" },
                    { t: "PMF 验证", c: "不要写代码！先做落地页。如果有 100 个人点击「购买」，你再开始写代码。" },
                    { t: "Freemium 陷阱", c: "对于小团队，免费用户往往是负担（客服成本）。尽早收费，筛选高价值用户。" },
                    { t: "SaaS 估值逻辑", c: "MRR (月经常性收入) 是核心。100 个付 $10/月的用户 > 1 个付 $1000 的用户。" }
                ].map((item, i) => createLayoutCard(`i-${i}`, i, 4, item.t, item.c, item.type, item.color, { x: 0, y: 0 })),

                // Section 2: 流量与营销 (8-15)
                ...[
                    { t: "流量来源：SEO", c: "内容营销是长尾流量之王。写「How to」类文章，解决用户具体问题，顺便推荐自己的工具。" },
                    { t: "流量来源：Product Hunt", c: "发布日的爆发性流量。准备好视频、Gif、第一批评论种子。最好在周二/周三发布。" },
                    { t: "流量来源：Twitter/X", c: "Build in Public (公开构建)。分享你的失败、你的收入、用破烂英语写代码的过程。人们通过信任「人」来信任「产品」。", type: "standard" },
                    { t: "案例：Pieter Levels", c: "Nomad List 创始人。他卖的不是数据，是「数字游民」的梦想。他是营销天才，而不只是程序员。", type: "standard" },
                    { t: "案例：Carrd", c: "极简建站工具。解决了「我就想 1 分钟搞个网页」的痛点。切中了大型建站工具(Wix)过于复杂的软肋。", type: "standard" },
                    { t: "冷启动邮件", c: "不要群发。找到 50 个潜在客户，手动写 50 封真诚的邮件。" },
                    { t: "KOL 合作", c: "送给 YouTuber 终身会员，换取一个提及。微小网红（Micro-Influencers）的转化率往往比大网红高。" },
                    { t: "Side Project 营销", c: "开发一些免费的小工具（如「图片压缩器」、「配色生成器」）来给主产品引流。" }
                ].map((item, i) => createLayoutCard(`i-m-${i}`, i, 4, item.t, item.c, item.type, item.color, { x: 0, y: 1000 })),

                // Section 3: 定价与心理学 (16-23)
                ...[
                    { t: "定价心理学", c: "永远要有三个档位。中间那个是你真正想卖的。右边那个是用来显得中间那个「很划算」的（锚定效应）。", type: "note", color: "yellow" },
                    { t: "买断 vs 订阅", c: "工具类适合买断（+1年更新权）。服务类/云存储类必须订阅。不要为了订阅而订阅。" },
                    { t: "退款政策", c: "大方退款。30 天无理由退款能极大地降低用户的购买决策门槛。" },
                    { t: "终身版 (LTD)", c: "早期快速回笼资金的神器，但也是未来的债务。慎用，或者限量。", type: "note", color: "red" },
                    { t: "支付网关", c: "Stripe (全球首选)，Lemon Squeezy (处理税务更省心)，Paddle (适合 SaaS)。" },
                    { t: "涨价的艺术", c: "老用户保留原价（Grandfathering）。新用户涨价。这能刺激观望者立刻下单。" },
                    { t: "黑五促销", c: "如果不降价，就送额度。降价会伤害品牌，送额度不会。" },
                    { t: "放弃完美主义", c: "V1 版本如果不够尴尬，说明你发布晚了。Bug 是最好的用户反馈渠道。" }
                ].map((item, i) => createLayoutCard(`i-p-${i}`, i, 4, item.t, item.c, item.type, item.color, { x: 0, y: 2000 }))
            ],
            connections: [
                { from: "i-0", to: "i-2" }, { from: "i-1", to: "i-2" }, { from: "i-2", to: "i-3" }, { from: "i-3", to: "i-5" },
                { from: "i-m-0", to: "i-3" }, { from: "i-m-2", to: "i-m-3" },
                { from: "i-0", to: "i-p-0" }, { from: "i-p-0", to: "i-p-1" }
            ],
            groups: [
                { id: "g-i-1", title: "核心商业思维", cardIds: [], color: "blue", x: -50, y: -150, width: 1800, height: 900 }, // 框住第一区
                { id: "g-i-2", title: "流量获取战术", cardIds: [], color: "indigo", x: -50, y: 900, width: 1800, height: 900 }, // 框住第二区
                { id: "g-i-3", title: "定价与变现", cardIds: [], color: "emerald", x: -50, y: 1900, width: 1800, height: 900 } // 框住第三区
            ]
        },

        // =================================================================================
        // BOARD 3: 全栈开发工作流 (32 Cards) - 巨型看板
        // =================================================================================
        "sample-dev-workflow": {
            cards: [
                // Zone 1: Planning & AI (0-7)
                ...[
                    { t: "AI-First Development", c: "现在写代码，第一步不是打开 IDE，而是打开 Chat 窗口。把 AI 当作结对编程的伙伴，而不是搜索引擎。" },
                    { t: "Prompt Engineering", c: "Role (角色) + Context (背景) + Constraints (约束) + Format (格式)。写 Prompt 就是在用自然语言编程。", type: "note", color: "purple" },
                    { t: "Cursor 编辑器", c: "VS Code 的超集。Cmd+K 直接修改代码，Cmd+L 针对代码库提问。它改变了「阅读代码」的方式。" },
                    { t: "需求分析", c: "先让 AI 写 PRD (产品文档)。把模糊的想法变成结构化的功能列表。" },
                    { t: "技术选型", c: "让 AI 对比不同方案的优劣。例如：Next.js vs Vite + React SPA。" },
                    { t: "数据库设计", c: "把需求发给 AI，让它生成 Mermaid ER 图和 SQL 建表语句。" },
                    { t: "API 定义", c: "先定义接口 (Swagger/OpenAPI)，前后端并行开发。" },
                    { t: "原型设计", c: "v0.dev 或 Claude Artifacts 快速生成 UI 原型，验证交互逻辑。" }
                ].map((item, i) => createLayoutCard(`d-ai-${i}`, i, 4, item.t, item.c, item.type, item.color, { x: 0, y: 0 })),

                // Zone 2: Frontend Engineering (8-17)
                ...[
                    { t: "React 生态", c: "Vite (构建) + React (视图) + Tailwind (样式) + Zustand (状态)。这是目前的甜点级组合。" },
                    { t: "Tailwind CSS", c: "Utility-first。虽然 HTML 看起来乱，但开发速度极快，且彻底解决了命名难题。", type: "standard" },
                    { t: "组件化思维", c: "Atomic Design：原子 (Button) -> 分子 (SearchBox) -> 有机体 (Header) -> 模板 -> 页面。" },
                    { t: "状态管理", c: "不要滥用 Context。服务端状态用 TanStack Query，客户端全局状态用 Zustand，局部状态用 useState。" },
                    { t: "性能优化：Lighthouse", c: "关注 LCP (最大内容绘制) 和 CLS (累积布局偏移)。图片必须用 WebP + LazyLoad。" },
                    { t: "React Hooks 陷阱", c: "useEffect 闭包陷阱、不必要的 Re-render。使用 useMemo 和 useCallback 保护昂贵的计算。" },
                    { t: "TypeScript", c: "AnyScript 没意义。严谨的类型定义是重构的底气。利用 AI 自动生成 Interface。", type: "note", color: "blue" },
                    { t: "PWA (渐进式 Web 应用)", c: "让网页像 App 一样离线运行、可安装。Service Worker 是核心。" },
                    { t: "可访问性 (a11y)", c: "语义化 HTML (header, main, footer)。不仅是为了残障人士，对 SEO 也极好。" },
                    { t: "动画交互", c: "Framer Motion。声明式动画，比手写 CSS Keyframes 强太大。" }
                ].map((item, i) => createLayoutCard(`d-fe-${i}`, i, 5, item.t, item.c, item.type, item.color, { x: 0, y: 800 })),

                // Zone 3: Backend & Serverless (18-25)
                ...[
                    { t: "Serverless 架构", c: "Cloudflare Workers / AWS Lambda。忘记服务器运维，按请求计费。极度适合个人开发者。" },
                    { t: "Edge Computing", c: "让代码在离用户最近的节点运行。更低的延迟，无需 CDN 回源。" },
                    { t: "BaaS (Backend as a Service)", c: "Firebase / Supabase。给你现成的 Auth、Database、Storage。省去 90% 后端工作。" },
                    { t: "API 安全", c: "JWT (Json Web Token) 鉴权。Rate Limiting (限流) 防止被刷。CORS 配置。" },
                    { t: "数据库选型", c: "关系型 (PostgreSQL) 还是 NoSQL (Firestore)? 现在的趋势是 NewSQL (如 PlanetScale)。" },
                    { t: "对象存储", c: "S3 / R2 / OBS。把文件存云端，数据库只存链接。" },
                    { t: "WebSockets", c: "实时应用 (IM, 协同编辑) 的基石。Socket.io 或原生 WS。" },
                    { t: "GraphQL vs REST", c: "GraphQL 灵活但复杂。REST 简单但可能请求冗余。tRPC 是全栈 TypeScript 的新宠。" }
                ].map((item, i) => createLayoutCard(`d-be-${i}`, i, 4, item.t, item.c, item.type, item.color, { x: 0, y: 1600 })),

                // Zone 4: DevOps & Production (26-31)
                ...[
                    { t: "CI/CD 流水线", c: "GitHub Actions。Push 代码 -> 跑测试 -> 构建 -> 自动部署。拒绝手动 FTP。" },
                    { t: "环境隔离", c: "Development (本地) -> Staging (预发布) -> Production (生产)。数据和配置严格分离。", type: "note", color: "red" },
                    { t: "监控与日志", c: "Sentry (报错追踪)。LogRocket (用户行为回放)。不要等用户报错才知道崩了。" },
                    { t: "Docker 容器化", c: "虽然 Serverless 不需要，但本地开发环境用 Docker Compose 编排数据库还是很香的。" },
                    { t: "Git 规范", c: "Conventional Commits (feat: xxx, fix: xxx)。分支策略 (Git Flow / Trunk Based)。" },
                    { t: "终身学习", c: "技术半衰期只有 2 年。保持对新事物的饥饿感，但要有自己的技术判断力。" }
                ].map((item, i) => createLayoutCard(`d-ops-${i}`, i, 3, item.t, item.c, item.type, item.color, { x: 0, y: 2400 }))
            ],
            connections: [
                { from: "d-ai-0", to: "d-ai-1" }, { from: "d-ai-1", to: "d-ai-2" }, { from: "d-ai-3", to: "d-ai-4" }, { from: "d-ai-4", to: "d-ai-5" },
                { from: "d-fe-0", to: "d-fe-1" }, { from: "d-fe-0", to: "d-fe-3" }, { from: "d-fe-3", to: "d-be-2" },
                { from: "d-be-0", to: "d-be-1" }, { from: "d-be-2", to: "d-be-5" },
                { from: "d-ops-0", to: "d-ops-1" }, { from: "d-ai-3", to: "d-ops-0" }
            ],
            groups: [
                { id: "g-d-1", title: "Wait... Let AI Help You", cardIds: [], color: "purple", x: -50, y: -150, width: 1800, height: 700 },
                { id: "g-d-2", title: "Modern Frontend", cardIds: [], color: "blue", x: -50, y: 700, width: 2200, height: 750 },
                { id: "g-d-3", title: "Backend & Infrastructure", cardIds: [], color: "slate", x: -50, y: 1500, width: 1800, height: 750 },
                { id: "g-d-4", title: "DevOps & Life Cycle", cardIds: [], color: "rose", x: -50, y: 2300, width: 1400, height: 800 }
            ]
        }
    };

    return sampleData[boardId] || { cards: [], connections: [], groups: [] };
};
