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
            id: "sample-musk-algorithm",
            name: "马斯克的五步工作法",
            createdAt: t(24),
            updatedAt: t(2),
            lastAccessedAt: t(2),
            cardCount: 7,
            backgroundImage: "https://aimappic.obs.cn-east-3.myhuaweicloud.com/1766823633432-spvds5w-bg_1766817094375_1766823633429.png",
            summary: {
                theme: "purple",
                summary: "SpaceX 研发流程 · 极简主义 · 自动化原则"
            },
            isSample: true
        },
        {
            id: "sample-commercialization",
            name: "关于商业化的本质困境",
            createdAt: t(48),
            updatedAt: t(5),
            lastAccessedAt: t(5),
            cardCount: 3,
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
            createdAt: t(72),
            updatedAt: t(10),
            lastAccessedAt: t(10),
            cardCount: 2,
            backgroundImage: "https://aimappic.obs.cn-east-3.myhuaweicloud.com/backgrounds/2026-01/1767704397504-qac658g-bg_1767688330243_1767704397502.png",
            summary: {
                theme: "blue",
                summary: "AI 开发工作流 · 技术架构规划 · 交互体验优化"
            },
            isSample: true
        },
        {
            id: "sample-solid-battery",
            name: "如果手机用上固态电池会怎么样？",
            createdAt: t(96),
            updatedAt: t(12),
            lastAccessedAt: t(12),
            cardCount: 2,
            backgroundImage: "https://storage.googleapis.com/gmi-video-assests-prod/user-assets/e54d0b64-bb26-47df-9cbf-c1d6e0987a41/a6cee7b4-4b9b-467c-b550-f061dea6fe40/gmi-videogen/generated/google_ai_studio_7142ade6-5aa1-400b-bb0e-8aafe7a9c067_b3b04885-1935-4028-aa67-bc602920081e.png",
            summary: {
                theme: "amber",
                summary: "固态电池 · 科技前沿 · 未来手机形态"
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
        "sample-musk-algorithm": {
            cards: [
                {
                    id: "m-title", x: 0, y: -400, type: "standard",
                    data: { title: "马斯克的五步工程法", messages: [{ role: "assistant", content: "这是 SpaceX 和 Tesla 能够快速迭代、降低成本的核心秘诀。\n\n**关键原则：任何步骤都必须能够被质疑，无论它来自谁。**" }] }
                },
                {
                    id: "m-step-1", x: -600, y: 0, type: "standard",
                    data: { title: "1. 质疑每一个需求", messages: [{ role: "assistant", content: "不要假设需求是正确的，即使它来自聪明的部门。\n\n**每个人都是错的，只是程度不同。**\n必须知道需求的确切制定者，并直接向他质疑。" }] }
                },
                {
                    id: "m-step-2", x: -200, y: 0, type: "standard",
                    data: { title: "2. 删除不必要的部件", messages: [{ role: "assistant", content: "**最好的部件是不存在的部件。**\n\n如果你删掉的东西不需要加回来 10%，说明你删得还不够多。\n为了防范风险而增加冗余是错误的。" }] }
                },
                {
                    id: "m-step-3", x: 200, y: 0, type: "standard",
                    data: { title: "3. 简化和优化", messages: [{ role: "assistant", content: "只有在确认需要后才优化。\n\n**不要优化一个本不该存在的东西。**\n常见的错误是花大力气去优化一个应该被删除的步骤。" }] }
                },
                {
                    id: "m-step-4", x: 600, y: 0, type: "standard",
                    data: { title: "4. 加速周期时间", messages: [{ role: "assistant", content: "但不要在前三步完成之前加速。\n\n如果你在挖自己的坟墓，不要挖得太快。" }] }
                },
                {
                    id: "m-step-5", x: 1000, y: 0, type: "standard",
                    data: { title: "5. 自动化", messages: [{ role: "assistant", content: "这是最后一步，不是第一步。\n\n过早自动化是工程灾难的根源。" }] }
                },
                {
                    id: "m-note", x: 200, y: 400, type: "note",
                    data: { color: "yellow", content: "💡 **案例：Tesla Model 3 的电池组**\n\n最初设计了复杂的玻璃纤维垫来降噪，为此还要买昂贵的机器人来安装。后来从流水线上把垫子拿掉测试，发现噪音根本没变化。于是直接删除了垫子和机器人。" }
                }
            ],
            connections: [
                { from: "m-title", to: "m-step-1" },
                { from: "m-step-1", to: "m-step-2" },
                { from: "m-step-2", to: "m-step-3" },
                { from: "m-step-3", to: "m-step-4" },
                { from: "m-step-4", to: "m-step-5" },
                { from: "m-step-2", to: "m-note" }
            ],
            groups: []
        },
        "sample-commercialization": {
            cards: [
                {
                    id: "c-q1", x: -400, y: 0, type: "standard",
                    data: { title: "独立开发的死局？", messages: [{ role: "user", content: "用户懒得学新东西，开发者没钱推广，独立开发是不是个死局？" }] }
                },
                {
                    id: "c-a1", x: 0, y: 0, type: "standard",
                    data: { title: "认知错位与胜率洼地", messages: [{ role: "assistant", content: "这不是死局，可以从三个方向突围：\n\n1. **存量截流**：不要创造新需求，去 Chrome 插件商店这种有流量的地方。\n2. **降低预期**：不要上来就想做一个平台，做一个好用的「锤子」。\n3. **长期主义**：Notion 也熬了很久才有今天。" }] }
                },
                {
                    id: "c-note", x: 400, y: 0, type: "note",
                    data: { color: "blue", content: "🚀 **行动指南**\n\n找一个你熟悉的领域，解决你自己极其痛苦的一个小问题。如果不痛苦，就不要做。" }
                }
            ],
            connections: [
                { from: "c-q1", to: "c-a1" },
                { from: "c-a1", to: "c-note" }
            ],
            groups: []
        },
        "sample-software-dev": {
            cards: [
                {
                    id: "dev-1", x: -200, y: 0, type: "standard",
                    data: { title: "AI 辅助编程", messages: [{ role: "user", content: "如何高效利用 AI 进行开发？" }, { role: "assistant", content: "把 AI 当作一个**没有上下文的高级实习生**。\n\n1. 每次只给一个小任务\n2. 提供完整的上下文（相关代码文件）\n3. 必须进行 Code Review" }] }
                },
                {
                    id: "dev-note", x: 200, y: 0, type: "note",
                    data: { color: "purple", content: "💡 **技巧**\n\n让 AI 先生成伪代码或计划，确认后再生成代码，可以大幅减少返工。" }
                }
            ],
            connections: [{ from: "dev-1", to: "dev-note" }],
            groups: []
        },
        "sample-solid-battery": {
            cards: [
                {
                    id: "bat-1", x: -200, y: 0, type: "standard",
                    data: { title: "手机会变薄吗？", messages: [{ role: "user", content: "固态电池能量密度翻倍，手机是不是能变薄一半？" }] }
                },
                {
                    id: "bat-2", x: 200, y: 0, type: "standard",
                    data: { title: "反直觉的结论", messages: [{ role: "assistant", content: "**大概率不会。**\n\n厂商会选择维持厚度，但将续航提升 2 倍，或者塞入更强大的相机模组和散热系统。\n\n手机厚度的瓶颈不在电池，而在手感（太薄了握不住）和镜头模组。" }] }
                }
            ],
            connections: [{ from: "bat-1", to: "bat-2" }],
            groups: []
        }
    };
    return sampleData[boardId] || { cards: [], connections: [], groups: [] };
};
