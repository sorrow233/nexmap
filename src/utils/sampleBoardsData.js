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
    const t = (h) => now - h * 3600000;

    return [
        {
            id: "sample-commercialization",
            name: "关于商业化的本质困境",
            createdAt: t(48),
            updatedAt: t(5),
            lastAccessedAt: t(5),
            cardCount: 2,
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
            createdAt: t(120),
            updatedAt: t(10),
            lastAccessedAt: t(10),
            cardCount: 1,
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
            createdAt: t(168),
            updatedAt: t(15),
            lastAccessedAt: t(15),
            cardCount: 1,
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
            createdAt: t(240),
            updatedAt: t(20),
            lastAccessedAt: t(20),
            cardCount: 1,
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
            createdAt: t(340),
            updatedAt: t(2),
            lastAccessedAt: t(2),
            cardCount: 2,
            backgroundImage: "https://aimappic.obs.cn-east-3.myhuaweicloud.com/1766823633432-spvds5w-bg_1766817094375_1766817094375_1766823633429.png",
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
 */
export const getSampleBoardData = (boardId) => {
    const sampleData = {
        "sample-commercialization": {
            cards: [
                {
                    id: "sample-card-1",
                    x: -250, // Modified to be centered
                    y: 0,
                    type: "standard",
                    data: {
                        title: "关于商业化的本质困境",
                        messages: [
                            {
                                role: "user",
                                content: "个人开发难在商业化。用户懒得学新东西，开发者没钱没精力推广，这是否是一个无解的死局？"
                            },
                            {
                                role: "assistant",
                                content: "商业化对个人开发者而言，确实是一个极高概率的胜率洼地，但称其为死局并不准确。\n\n**认知错位：**\n开发者往往在解决「我觉得这很有用」的问题，而商业化的本质是解决「用户愿意付出的代价小于其收益」的问题。\n\n**结论：** 用户不是懒得学，而是产品的边际效用不足以抵消切换成本。\n\n**解决路径：** 不要创造新需求，要去存量市场（如 Chrome 插件商店）截流。"
                            }
                        ],
                        model: "sample"
                    }
                },
                {
                    id: "sample-card-2",
                    x: 250, // Modified to be centered
                    y: 0,
                    type: "standard",
                    data: {
                        title: "Notion 是怎么成功的？",
                        messages: [
                            {
                                role: "user",
                                content: "Notion 是怎么成功的？他们是不是一开始就有专业的营销资源？"
                            },
                            {
                                role: "assistant",
                                content: "Notion 的起步是一场极其狼狈的绝地求生。\n\n**京都时期的背水一战：**\n2015 年，Notion 1.0 版本几乎无人问津，公司资金链断裂。 Notion 创始人退掉了旧金山的昂贵办公室，搬到了日本京都省钱重写代码。\n\n**乐高式的模块化哲学：**\n它不是给用户一个复杂的工具，而是给了用户一盒积木。用户不需要一开始就学完整套系统，这种自发的探索欲抵消了学习的痛苦。\n\n**口碑杠杆：**\n那些博主和发烧友成为了 Notion 的免费销售员。"
                            }
                        ],
                        model: "sample"
                    }
                }
            ],
            connections: [
                { from: "sample-card-1", to: "sample-card-2" }
            ],
            groups: []
        },
        "sample-software-dev": {
            cards: [
                {
                    id: "dev-card-1",
                    x: 0,
                    y: 0,
                    type: "standard",
                    data: {
                        title: "AI 辅助开发的最佳实践",
                        messages: [
                            {
                                role: "user",
                                content: "使用 AI 辅助开发时，有什么最佳实践可以提高效率？"
                            },
                            {
                                role: "assistant",
                                content: "**核心原则：把 AI 当成极其聪明但没有项目上下文的新同事。**\n\n1. **提供充足的上下文**\n   - 不要只给一个函数，要给整个模块的目的说明\n   - 说明技术栈、项目约定、已经踩过的坑\n\n2. **小步迭代**\n   - 不要一次性让 AI 完成一个大功能\n   - 拆分成多个小任务，逐步验证\n\n3. **代码审查而非盲信**\n   - AI 生成的代码要像审查同事 PR 一样仔细检查\n   - 特别注意边界条件和错误处理"
                            }
                        ],
                        model: "sample"
                    }
                }
            ],
            connections: [],
            groups: []
        },
        "sample-indie-hacker": {
            cards: [
                {
                    id: "indie-card-1",
                    x: 0,
                    y: 0,
                    type: "standard",
                    data: {
                        title: "独立开发者的商业化路径",
                        messages: [
                            {
                                role: "user",
                                content: "独立网站和软件都是怎么样商业化的？"
                            },
                            {
                                role: "assistant",
                                content: "独立开发者的商业化通常有几条主流路径：\n\n**1. SaaS 订阅模式**\n- 月费/年费制，适合有持续价值的工具\n- 关键指标：MRR、Churn Rate\n\n**2. 一次性买断**\n- 适合工具类产品，如 Mac 软件\n- 需要不断出新版本来维持收入\n\n**3. Freemium 模式**\n- 基础功能免费，高级功能收费\n- 需要找到合适的功能切割点\n\n**4. 广告/赞助**\n- 适合流量型产品\n- 注意不要影响用户体验"
                            }
                        ],
                        model: "sample"
                    }
                }
            ],
            connections: [],
            groups: []
        },
        "sample-solid-battery": {
            cards: [
                {
                    id: "battery-card-1",
                    x: 0,
                    y: 0,
                    type: "standard",
                    data: {
                        title: "固态电池会如何改变手机？",
                        messages: [
                            {
                                role: "user",
                                content: "如果手机用上固态电池会怎么样？"
                            },
                            {
                                role: "assistant",
                                content: "固态电池将从根本上改变手机的设计逻辑：\n\n**1. 容量翻倍，厚度减半**\n- 固态电池能量密度是锂离子电池的 2-3 倍\n- 同样容量下可以做得更薄\n\n**2. 充电速度革命**\n- 5 分钟充满 80% 将成为可能\n- 告别电量焦虑\n\n**3. 安全性大幅提升**\n- 不会燃烧爆炸\n- 手机设计可以更激进\n\n**4. 寿命延长**\n- 循环次数可达 1000+ 次\n- 3-5 年后电池健康度仍在 90% 以上"
                            }
                        ],
                        model: "sample"
                    }
                }
            ],
            connections: [],
            groups: []
        },
        "sample-musk-algorithm": {
            cards: [
                {
                    id: "sample-card-1",
                    x: -250,
                    y: 0,
                    type: "standard",
                    data: {
                        title: "马斯克的五步工程法",
                        messages: [
                            {
                                role: "user",
                                content: "你知道马斯克的五步法吗？"
                            },
                            {
                                role: "assistant",
                                content: "马斯克的五步工程法是他在 SpaceX 和 Tesla 总结出的产品开发方法论：\n\n**1. 质疑每一个需求**\n- 不要假设需求是正确的\n- 问：这个需求是谁提的？为什么需要？\n\n**2. 删除不必要的部件或流程**\n- 最好的部件是不存在的部件\n- 如果你删掉的东西不需要加回来，说明你删得还不够多\n\n**3. 简化和优化**\n- 只有在确认需要后才优化\n- 不要优化一个本不该存在的东西\n\n**4. 加速周期时间**\n- 但不要在前三步完成之前加速\n\n**5. 自动化**\n- 这是最后一步，不是第一步"
                            }
                        ],
                        model: "sample"
                    }
                },
                {
                    id: "sample-card-2",
                    x: 250,
                    y: 0,
                    type: "standard",
                    data: {
                        title: "Notion 是怎么成功的？",
                        messages: [
                            {
                                role: "note",
                                content: "这里原始数据ID重复了或者我看错了。检查原始数据是 'Notion' 卡片在 sample-commercialization，而 Musk 板块有 content: '...狼狈的绝地求生...'? 不，我上文 Step 204 显示 Musk 板块的第二个卡片是 'note' 类型，content: '💡 **核心洞察**...'"
                            }
                        ],
                        // Let me fix this manually based on Step 204 reading
                    }
                }
            ]
        }
    };

    // CORRECTION FOR MUSK BOARD based on Step 204:
    sampleData["sample-musk-algorithm"] = {
        cards: [
            {
                id: "sample-card-1",
                x: -250,
                y: 0,
                type: "standard",
                data: {
                    title: "马斯克的五步工程法",
                    messages: [
                        {
                            role: "user",
                            content: "你知道马斯克的五步法吗？"
                        },
                        {
                            role: "assistant",
                            content: "马斯克的五步工程法是他在 SpaceX 和 Tesla 总结出的产品开发方法论：\n\n**1. 质疑每一个需求**\n- 不要假设需求是正确的\n- 问：这个需求是谁提的？为什么需要？\n\n**2. 删除不必要的部件或流程**\n- 最好的部件是不存在的部件\n- 如果你删掉的东西不需要加回来，说明你删得还不够多\n\n**3. 简化和优化**\n- 只有在确认需要后才优化\n- 不要优化一个本不该存在的东西\n\n**4. 加速周期时间**\n- 但不要在前三步完成之前加速\n\n**5. 自动化**\n- 这是最后一步，不是第一步"
                        }
                    ],
                    model: "sample"
                }
            },
            {
                id: "sample-card-2",
                x: 250,
                y: 0,
                type: "standard", // Step 204 said type: "standard" with "Notion" data? NO.
                // Step 204 View for "sample-musk-algorithm":
                // id: "sample-card-2", x: 550, y: 100, type: "standard", data: { title: "Notion...", ... } -> WAIT.
                // Look closely at Step 204 Output.
                // 
                // "sample-commercialization": 
                //    cards: [ {id: "sample-card-1" ...}, {id: "sample-card-2", title: "Notion..."} ]
                // 
                // "sample-musk-algorithm":
                //    cards: [ {id: "musk-card-1" ...}, {id: "musk-card-2", type:"note", content: "💡 **核心洞察**..."} ]
                //
                // OK, I must be careful. sample-commercialization uses ids "sample-card-1" and "sample-card-2".
                // sample-musk uses "musk-card-1" and "musk-card-2".
            }
        ],
        connections: [
            { from: "sample-card-1", to: "sample-card-2" }
        ],
        groups: []
    };

    // RE-CORRECTING MUSK DATA STRUCT:
    sampleData["sample-musk-algorithm"] = {
        cards: [
            {
                id: "musk-card-1",
                x: -250,
                y: 0,
                type: "standard",
                data: {
                    title: "马斯克的五步工程法",
                    messages: [
                        { role: "user", content: "你知道马斯克的五步法吗？" },
                        { role: "assistant", content: "马斯克的五步工程法是他在 SpaceX 和 Tesla 总结出的产品开发方法论：\n\n**1. 质疑每一个需求**\n- 不要假设需求是正确的\n- 问：这个需求是谁提的？为什么需要？\n\n**2. 删除不必要的部件或流程**\n- 最好的部件是不存在的部件\n- 如果你删掉的东西不需要加回来，说明你删得还不够多\n\n**3. 简化和优化**\n- 只有在确认需要后才优化\n- 不要优化一个本不该存在的东西\n\n**4. 加速周期时间**\n- 但不要在前三步完成之前加速\n\n**5. 自动化**\n- 这是最后一步，不是第一步" }
                    ],
                    model: "sample"
                }
            },
            {
                id: "musk-card-2",
                x: 250,
                y: 0,
                type: "note", // It was type: "note" in 204? Wait.
                // Let's re-read the snippet in 204 for musk-algorithm specifically.
                // Snippet 204, lines 221-257:
                // id: "musk-card-1" ...
                // id: "musk-card-2", type: "note", data: { content: "💡 **核心洞察**...", color: "yellow" }
                // YES.

                data: {
                    content: "💡 **核心洞察**：\n\n马斯克的五步法本质上是在对抗「过早优化」和「需求膨胀」这两个工程恶魔。\n\n**著名案例**：SpaceX 的 Flufferbot 事件——他们花了数百万美元自动化一个放置玻璃纤维垫的流程，后来发现这个垫子本身就不需要。",
                    color: "yellow"
                }
            }
        ],
        connections: [
            { from: "musk-card-1", to: "musk-card-2" }
        ],
        groups: []
    }

    return sampleData[boardId] || { cards: [], connections: [], groups: [] };
};
