/**
 * sampleBoardsData.js
 * 新用户首次访问时展示的示例面板数据
 * 展示产品的核心功能和典型使用场景
 */

/**
 * 获取示例面板列表（仅元数据，用于 Gallery 展示）
 * 注意：这些是"只读展示"的示例，用户无法编辑，只能查看
 */
export const getSampleBoardsList = () => {
    const now = Date.now();

    return [
        {
            id: "sample-commercialization",
            name: "关于商业化的本质困境",
            createdAt: now - 86400000 * 2,
            updatedAt: now - 3600000,
            lastAccessedAt: now - 3600000,
            cardCount: 8,
            backgroundImage: "https://aimappic.obs.cn-east-3.myhuaweicloud.com/backgrounds/2026-01/1767910650391-j49iao9-bg_1767908903163_1767910650388.png",
            summary: {
                theme: "emerald",
                summary: "商业化困境 · 幸存者偏差 · 现实主义"
            },
            isSample: true
        },
        {
            id: "sample-software-dev",
            name: "软件开发工作流",
            createdAt: now - 86400000 * 5,
            updatedAt: now - 7200000,
            lastAccessedAt: now - 7200000,
            cardCount: 9,
            backgroundImage: "https://aimappic.obs.cn-east-3.myhuaweicloud.com/backgrounds/2026-01/1767704397504-qac658g-bg_1767688330243_1767704397502.png",
            summary: {
                theme: "blue",
                summary: "AI 开发工作流 · 技术架构规划 · 交互体验优化"
            },
            isSample: true
        },
        {
            id: "sample-indie-hacker",
            name: "独立网站和软件都是怎么样商业化的",
            createdAt: now - 86400000 * 7,
            updatedAt: now - 14400000,
            lastAccessedAt: now - 14400000,
            cardCount: 11,
            backgroundImage: "https://storage.googleapis.com/gmi-video-assests-prod/user-assets/e54d0b64-bb26-47df-9cbf-c1d6e0987a41/a6cee7b4-4b9b-467c-b550-f061dea6fe40/gmi-videogen/generated/google_ai_studio_929a3a18-6141-40e1-836c-73d6a52c3f33_aa443634-83fd-47cb-ba9c-04841878394d.png",
            summary: {
                theme: "indigo",
                summary: "商业模式 · 流量获取 · 独立开发者生存指南"
            },
            isSample: true
        },
        {
            id: "sample-solid-battery",
            name: "如果手机用上固态电池会怎么样？",
            createdAt: now - 86400000 * 10,
            updatedAt: now - 28800000,
            lastAccessedAt: now - 28800000,
            cardCount: 6,
            backgroundImage: "https://storage.googleapis.com/gmi-video-assests-prod/user-assets/e54d0b64-bb26-47df-9cbf-c1d6e0987a41/a6cee7b4-4b9b-467c-b550-f061dea6fe40/gmi-videogen/generated/google_ai_studio_7142ade6-5aa1-400b-bb0e-8aafe7a9c067_b3b04885-1935-4028-aa67-bc602920081e.png",
            summary: {
                theme: "amber",
                summary: "固态电池 · 科技前沿 · 未来手机形态"
            },
            isSample: true
        },
        {
            id: "sample-musk-algorithm",
            name: "你知道马斯克的五步法吗？",
            createdAt: now - 86400000 * 14,
            updatedAt: now - 43200000,
            lastAccessedAt: now - 43200000,
            cardCount: 8,
            backgroundImage: "https://aimappic.obs.cn-east-3.myhuaweicloud.com/1766823633432-spvds5w-bg_1766817094375_1766823633429.png",
            summary: {
                theme: "purple",
                summary: "五步工程法 · SpaceX 实践 · 产品极简主义"
            },
            isSample: true
        }
    ];
};

/**
 * 获取示例面板的完整数据（cards, connections）
 * 每个面板包含精选的对话内容，用于展示产品能力
 */
export const getSampleBoardData = (boardId) => {
    // 辅助生成卡片的函数
    const createCard = (id, x, y, title, content, type = "standard", color = "default") => ({
        id, x, y, type,
        data: type === "standard" ? {
            title,
            messages: [{ role: "assistant", content }],
            model: "sample"
        } : { content, color }
    });

    const sampleData = {
        "sample-commercialization": {
            cards: [
                createCard("c-1", 0, 0, "核心问题：商业化困境", "个人开发难在商业化。用户懒得学新东西，开发者没钱没精力推广，这是否是一个无解的死局？"),
                createCard("c-2", 400, 0, "认知错位", "开发者往往在解决「我觉得这很有用」的问题，而商业化的本质是解决「用户愿意付出的代价小于其收益」的问题。"),
                createCard("c-3", 800, 0, "Notion 的启示", "Notion 的起步是一场极其狼狈的绝地求生。\n\n**乐高式的模块化哲学：**\n它不是给用户一个复杂的工具，而是给了用户一盒积木。用户不需要一开始就学完整套系统，这种自发的探索欲抵消了学习的痛苦。"),
                createCard("c-4", 200, 300, "幸存者偏差", "我们看到的成功案例（如 Indie Hackers 上的采访）往往是已经在商业上跑通过的千万分之一。沉默的大多数都在 Github 的角落里积灰。", "note", "red"),
                createCard("c-5", 600, 300, "PMF (Product Market Fit)", "在找到 PMF 之前，任何推广都是在浪费时间。你需要的是 100 个极其热爱你产品的用户，而不是 10000 个觉得你产品「还行」的用户。", "note", "blue"),
                createCard("c-6", 0, 600, "反直觉真理", "最好的商业化是「看不见商业化」。当用户在使用产品过程中自然地感受到价值，付费就是水到渠成的事情。"),
                createCard("c-7", 400, 600, "具体的行动建议", "1. 别憋大招：MVP 赶紧上线\n2. 建立 Audience：在 Twitter/Reddit 上分享构建过程 (Building in public)\n3. 专注于利基市场 (Niche Market)", "standard"),
                createCard("c-8", 800, 600, "收费策略", "**Freemium vs Free Trial**\n\n对于效率工具，Freemium (基础版免费) 通常更好，因为它可以培养用户习惯。", "standard")
            ],
            connections: [
                { from: "c-1", to: "c-2" },
                { from: "c-2", to: "c-3" },
                { from: "c-1", to: "c-4" },
                { from: "c-2", to: "c-5" },
                { from: "c-5", to: "c-7" },
                { from: "c-7", to: "c-8" }
            ],
            groups: []
        },

        "sample-software-dev": {
            cards: [
                createCard("d-1", 0, 0, "AI 辅助开发的最佳实践", "**核心原则：把 AI 当成极其聪明但没有项目上下文的新同事。**\n\n1. 提供充足的上下文\n2. 小步迭代\n3. 代码审查"),
                createCard("d-2", 400, -100, "Prompt Engineering", "这不是玄学，是「如何清晰表达需求」的学科。结构化的 Prompt (Role, Context, Task, Constraints) 永远比自然语言更有效。"),
                createCard("d-3", 400, 200, "Cursor & Copilot", "现代开发者的左膀右臂。Copilot 擅长补全，Cursor 擅长重构和理解整个代码库。", "note", "purple"),
                createCard("d-4", 800, 0, "测试驱动开发 (TDD)", "AI 时代 TDD 变得更容易了。先让 AI 写测试用例，再让 AI 写通过测试的代码。"),
                createCard("d-5", 0, 400, "技术债管理", "AI 会加速代码产出，也会加速技术债的堆积。定期进行 Refactoring Sprints 变得比以往任何时候都重要。", "note", "red"),
                createCard("d-6", 400, 500, "前端架构", "在这个项目中，采用的是 React + Vite + Tailwind 方案。这种组合提供了极致的灵活性和构建速度。", "standard"),
                createCard("d-7", 800, 500, "状态管理", "Zustand 是比 Redux 更轻量、更现代的选择。它避免了繁琐的 Boilerplate code。", "standard"),
                createCard("d-8", 1200, 250, "部署与 CI/CD", "自动化部署流程：\nGitHub Actions -> Cloudflare Pages\n每次 Push 自动构建预览版 (Preview Deployment)。", "standard"),
                createCard("d-9", 1200, 550, "性能优化", "Code Splitting, Lazy Loading, 图片格式优化 (WebP/AVIF), 还有最重要的——减少不必要的 Re-render。", "standard")
            ],
            connections: [
                { from: "d-1", to: "d-2" },
                { from: "d-1", to: "d-4" },
                { from: "d-1", to: "d-5" },
                { from: "d-6", to: "d-7" },
                { from: "d-6", to: "d-9" },
                { from: "d-8", to: "d-6" }
            ],
            groups: [
                { id: "g-1", title: "AI Workflow", cardIds: ["d-1", "d-2", "d-3", "d-4"], color: "blue", x: -20, y: -150, width: 1000, height: 500 }
            ]
        },

        "sample-indie-hacker": {
            cards: [
                createCard("i-1", 0, 0, "独立开发商业化路径", "1. SaaS 订阅\n2. 一次性买断\n3. Freemium\n4. 广告/赞助"),
                createCard("i-2", 400, 0, "SaaS 订阅", "最性感的模式。MRR (Monthly Recurring Revenue) 是核心指标。只要 Churn Rate 控制得当，复利效应惊人。"),
                createCard("i-3", 800, 0, "一次性买断", "并没有过时。对于工具类 APP，买断制往往转化率更高。现在流行「一年更新期」的买断模式 (Sketch 模式)。"),
                createCard("i-4", 0, 300, "流量获取：SEO", "长期主义者的游戏。内容营销 (Content Marketing) 是获取免费流量的最佳途径。关键是「解决用户问题」而非「推销产品」。", "note", "green"),
                createCard("i-5", 400, 300, "流量获取：Product Hunt", "爆发式流量的来源。要在 PH 上成功，需要准备精美的配图、视频和即时的评论互动。", "note", "orange"),
                createCard("i-6", 800, 300, "流量获取：Twitter/X", "构建个人品牌 (Personal Branding)。人们更愿意信任具体的人，而不是冷冰冰的 Logo。", "note", "blue"),
                createCard("i-7", 200, 600, "案例：Pieter Levels", "12 个月做 12 个产品的狂人。Nomad List 和 Remote OK 让他实现了财务自由。核心教训：快速发货，验证死活。", "standard"),
                createCard("i-8", 600, 600, "案例：Tony Dinh", "从 DevUtils 到 TypingMind。擅长利用 Twitter 营销，将小工具做到极致。", "standard"),
                createCard("i-9", 1000, 600, "定价心理学", "锚定效应 (Anchoring)：设置一个昂贵的企业版，让专业版看起来很划算。\n以 9 结尾的价格确实有效。", "standard"),
                createCard("i-10", 0, 900, "失败的陷阱", "1. 伪需求 (解决不存在的问题)\n2. 完美主义 (迟迟不肯上线)\n3. 忽视营销 (以为酒香不怕巷子深)", "note", "red"),
                createCard("i-11", 400, 900, "支付渠道", "Stripe 是首选，但仅限支持地区。Paddle 是很好的 Merchant of Record 替代方案 (处理税务)。Lemon Squeezy 是新起之秀。", "standard")
            ],
            connections: [
                { from: "i-1", to: "i-2" },
                { from: "i-1", to: "i-3" },
                { from: "i-1", to: "i-4" },
                { from: "i-4", to: "i-5" },
                { from: "i-5", to: "i-6" },
                { from: "i-7", to: "i-1" },
                { from: "i-8", to: "i-1" }
            ],
            groups: []
        },

        "sample-solid-battery": {
            cards: [
                createCard("b-1", 0, 0, "固态电池革命", "固态电池将从根本上改变手机的设计逻辑：\n1. 容量翻倍，厚度减半\n2. 5分钟充满80%\n3. 极度安全"),
                createCard("b-2", 400, 0, "手机形态的解放", "如果电池不再需要钢壳保护，不再怕弯折，那么「柔性屏手机」将真正实用化。手镯手机、折纸手机成为可能。", "standard"),
                createCard("b-3", 800, 0, "电动汽车的影响", "不仅仅是手机。电动汽车续航突破 1000km 将是常态。充电像加油一样快。燃油车将彻底成为历史。", "standard"),
                createCard("b-4", 200, 300, "全固态 vs 半固态", "目前市场上的「半固态」是过渡方案。全固态（硫化物、氧化物路线）才是终局，但量产难度极高。", "note", "yellow"),
                createCard("b-5", 600, 300, "成本障碍", "目前固态电池成本是液态锂电池的 4-10 倍。需要 5-10 年才能降到平价水平。", "note", "red"),
                createCard("b-6", 400, 600, "未来的移动设备", "想象一下，你的 AR 眼镜腿里就是电池，能用一整天。你的智能手表充一次电用一个月。", "standard")
            ],
            connections: [
                { from: "b-1", to: "b-2" },
                { from: "b-1", to: "b-3" },
                { from: "b-2", to: "b-6" },
                { from: "b-3", to: "b-4" }
            ],
            groups: []
        },

        "sample-musk-algorithm": {
            cards: [
                createCard("m-1", 0, 0, "马斯克的五步工程法", "1. 质疑每一个需求\n2. 删除不必要的部件或流程\n3. 简化和优化\n4. 加速周期时间\n5. 自动化"),
                createCard("m-2", 400, -100, "第一步：质疑需求", "需求越聪明的人提出来的，越要质疑。因为人们往往不好意思质疑聪明人。需求必须有具体的个人负责，而不是「部门」。"),
                createCard("m-3", 400, 150, "第二步：删除", "如果你的删除量不够，说明你没努力。如果最后你不需要把删掉的 10% 加回来，说明你删得还不够多。", "note", "red"),
                createCard("m-4", 800, 0, "第三步：简化", "最常见的错误是「优化一个不该存在的东西」。必须先做前两步！", "standard"),
                createCard("m-5", 1200, 0, "第四步：加速", "只有当你挖出了垃圾，停止了为了挖垃圾而挖垃圾，这时候才能加速。"),
                createCard("m-6", 1600, 0, "第五步：自动化", "最后一步才是用机器取代人。过早自动化是产能地狱的根源。", "standard"),
                createCard("m-7", 600, 400, "第一性原理 (First Principles)", "不要用类比思维 (Analogy) 思考，要回归到物理学的基本真理。火箭为什么贵？是因为由于材料贵？不，原材料只占 2%。剩下的都是制造方法的低效。", "note", "purple"),
                createCard("m-8", 200, 400, "Idiot Index", "白痴指数：成品的成本与原材料成本的比值。如果比值很高，说明制造过程极其低效，改进空间巨大。", "note", "blue")
            ],
            connections: [
                { from: "m-1", to: "m-2" },
                { from: "m-1", to: "m-3" },
                { from: "m-1", to: "m-4" },
                { from: "m-4", to: "m-5" },
                { from: "m-5", to: "m-6" },
                { from: "m-1", to: "m-7" },
                { from: "m-7", to: "m-8" }
            ],
            groups: []
        }
    };

    return sampleData[boardId] || { cards: [], connections: [], groups: [] };
};
