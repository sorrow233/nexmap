/**
 * guideBoardData.js
 * NexMap 使用指南画布数据
 * 使用对话卡片 (standard) 展示所有核心功能
 * 
 * 布局参数（与 autoLayout.js 保持一致）：
 * - CARD_WIDTH = 320
 * - CARD_HEIGHT = 300
 * - HORIZONTAL_GAP = 300 (水平间距)
 * - VERTICAL_GAP = 60 (垂直间距)
 * 
 * 连线颜色由 source card 的 data.cardColor 决定
 */

export const getGuideBoardData = () => {
    // 布局常量 - 与 autoLayout.js 保持一致
    const CARD_WIDTH = 320;
    const CARD_HEIGHT = 300;
    const H_GAP = 300; // 水平间距
    const V_GAP = 60;  // 垂直间距
    const COL_STEP = CARD_WIDTH + H_GAP; // 620
    const ROW_STEP = CARD_HEIGHT + V_GAP; // 360

    // 起始位置 - 让画布居中
    const startX = -300;
    const startY = 0;

    return {
        cards: [
            // ═══════════════════════════════════════════════════════════════
            // 第 0 列 (X = startX): 根节点 - 欢迎卡片
            // ═══════════════════════════════════════════════════════════════
            {
                id: 'guide-welcome',
                x: startX,
                y: startY,
                w: CARD_WIDTH,
                type: 'standard',
                data: {
                    title: '🚀 欢迎来到 NexMap',
                    messages: [{
                        role: 'assistant',
                        content: `**无限 AI 思维空间**

在这里，你可以：
- 🤖 **Gemini 3.0 / DeepSeek V3** 双模型 AI 对话
- 🌱 **AI Sprouting** 一键延伸多个相关话题
- 🎨 **26+ 精美主题** 一键导出为图片
- 🔗 **7 色智能连线** 建立思维关联
- ☁️ **云端同步** 跨设备无缝衔接
- 🌐 **中/英/日** 三语支持

👇 探索右侧卡片，了解强大功能
💬 点击任意卡片可以继续对话！`
                    }],
                    model: 'guide'
                }
            },

            // ═══════════════════════════════════════════════════════════════
            // 第 1 列 (X = startX + COL_STEP): 三大核心功能
            // Y 分布: -ROW_STEP, 0, +ROW_STEP (垂直居中于根节点)
            // ═══════════════════════════════════════════════════════════════

            // AI 对话功能 (蓝色线条)
            {
                id: 'guide-ai-chat',
                x: startX + COL_STEP,
                y: startY - ROW_STEP,
                w: CARD_WIDTH,
                type: 'standard',
                data: {
                    title: '🤖 AI 智能对话',
                    messages: [{
                        role: 'assistant',
                        content: `**双模型驱动，随心切换**

每张卡片都是一个 AI 助手：
1. ✍️ 在卡片中输入问题
2. ✨ 点击右上角 **AI 图标**
3. 🎯 获得智能回复

**模型选择：**
- **Gemini 3.0** - 强大的多模态能力
- **DeepSeek V3** - 极速响应

**Pro 功能：**
📷 上传图片进行 AI 分析
🖼️ AI 图片生成

💡 试试在这里输入问题！`
                    }],
                    cardColor: 'blue',
                    model: 'guide'
                }
            },

            // AI Sprouting 功能 (绿色线条)
            {
                id: 'guide-sprouting',
                x: startX + COL_STEP,
                y: startY,
                w: CARD_WIDTH,
                type: 'standard',
                data: {
                    title: '🌱 AI Sprouting',
                    messages: [{
                        role: 'assistant',
                        content: `**一个想法，无限延伸**

从一个核心概念自动生成多个相关话题：

1. 📝 在卡片中写下核心想法
2. 🔮 右键菜单选择 **"延伸话题"**
3. 🌿 AI 自动生成多个关联卡片

**实际效果：**
→ 写下 "人工智能的未来"
→ 自动延伸出多个相关话题
  
**连线自动创建！**

🔮 右键试试 "延伸话题"`
                    }],
                    cardColor: 'green',
                    model: 'guide'
                }
            },

            // 导出主题功能 (紫色线条)
            {
                id: 'guide-export',
                x: startX + COL_STEP,
                y: startY + ROW_STEP,
                w: CARD_WIDTH,
                type: 'standard',
                data: {
                    title: '🎨 精美导出主题',
                    messages: [{
                        role: 'assistant',
                        content: `**26+ 风格，一键导出**

选中卡片 → 右键 → 导出为图片

**经典主题：**
• **Editorial** - 纽约时报杂志风
• **Swiss** - 瑞士极简设计
• **Terminal** - 硅谷极客风

**日系主题：**
🌸 Sakura | 🍵 Matcha
📖 Manga | 🌿 Ghibli

**布局：** Card / Full / Social / Slide

🖼️ 右键试试导出功能！`
                    }],
                    cardColor: 'violet',
                    model: 'guide'
                }
            },

            // ═══════════════════════════════════════════════════════════════
            // 第 2 列 (X = startX + 2*COL_STEP): 功能演示
            // ═══════════════════════════════════════════════════════════════

            // AI 对话演示 (红色线条) - 对应 guide-ai-chat
            {
                id: 'guide-ai-demo',
                x: startX + 2 * COL_STEP,
                y: startY - ROW_STEP - ROW_STEP / 2,
                w: CARD_WIDTH,
                type: 'standard',
                data: {
                    title: '💬 对话示例',
                    messages: [
                        {
                            role: 'user',
                            content: '帮我分析一下 React 和 Vue 的区别'
                        },
                        {
                            role: 'assistant',
                            content: `| 特性 | React | Vue |
|------|-------|-----|
| 学习曲线 | 较陡 | 平缓 |
| 虚拟DOM | ✓ | ✓ |
| 状态管理 | Redux | Vuex |

两者都是优秀框架，选择取决于团队经验...

💬 继续问我任何问题！`
                        }
                    ],
                    cardColor: 'red',
                    model: 'guide'
                }
            },

            // 7 色连线 (黄色) - 对应 guide-ai-chat
            {
                id: 'guide-colors',
                x: startX + 2 * COL_STEP,
                y: startY - ROW_STEP / 2,
                w: CARD_WIDTH,
                type: 'standard',
                data: {
                    title: '🌈 7 色智能连线',
                    messages: [{
                        role: 'assistant',
                        content: `**为思维关系赋予颜色**

右键卡片 → 线条颜色：

🔴 Red - 重要/警告
🟡 Yellow - 待定/思考中  
🟢 Green - 已完成/确认
🔵 Teal - 参考/引用
🔷 Blue - 主线/核心
🟣 Violet - 创意/灵感

🎨 右键试试改变线条颜色`
                    }],
                    cardColor: 'yellow',
                    model: 'guide'
                }
            },

            // Sprouting 延伸示例 - 主题 (青色线条) - 对应 guide-sprouting
            {
                id: 'guide-sprout-topic',
                x: startX + 2 * COL_STEP,
                y: startY + ROW_STEP / 2,
                w: CARD_WIDTH,
                type: 'standard',
                data: {
                    title: '💡 核心想法',
                    messages: [{
                        role: 'user',
                        content: `**AI 时代的教育变革**

*右键这张卡片，选择"延伸话题"*`
                    }],
                    cardColor: 'teal',
                    model: 'guide'
                }
            },

            // 导出预览演示 - 对应 guide-export
            {
                id: 'guide-export-demo',
                x: startX + 2 * COL_STEP,
                y: startY + ROW_STEP + ROW_STEP / 2,
                w: CARD_WIDTH,
                type: 'standard',
                data: {
                    title: '✨ 导出效果预览',
                    messages: [{
                        role: 'assistant',
                        content: `**多尺寸输出：** 1x / 2x / 3x

**使用场景：**
📱 社交媒体分享 (1:1)
📊 演示幻灯片 (16:9)
📝 笔记卡片 (自适应)

**专业字体：**
Playfair Display / Inter
日文: Kiwi Maru

> 右键卡片 → 导出为图片`
                    }],
                    model: 'guide'
                }
            },

            // ═══════════════════════════════════════════════════════════════
            // 第 3 列 (X = startX + 3*COL_STEP): Sprouting 延伸效果 + 操作指南
            // ═══════════════════════════════════════════════════════════════

            // Sprouting 延伸 1
            {
                id: 'guide-sprout-1',
                x: startX + 3 * COL_STEP,
                y: startY - ROW_STEP / 2 - 120,
                w: CARD_WIDTH,
                type: 'standard',
                data: {
                    title: '🎓 个性化学习',
                    messages: [{
                        role: 'assistant',
                        content: 'AI 根据学生能力定制学习路径，实现真正的因材施教'
                    }],
                    model: 'guide'
                }
            },

            // Sprouting 延伸 2
            {
                id: 'guide-sprout-2',
                x: startX + 3 * COL_STEP,
                y: startY + 120,
                w: CARD_WIDTH,
                type: 'standard',
                data: {
                    title: '👨‍🏫 教师角色转型',
                    messages: [{
                        role: 'assistant',
                        content: '从知识传授者转变为学习引导者和心灵导师'
                    }],
                    model: 'guide'
                }
            },

            // Sprouting 延伸 3
            {
                id: 'guide-sprout-3',
                x: startX + 3 * COL_STEP,
                y: startY + ROW_STEP / 2 + 240,
                w: CARD_WIDTH,
                type: 'standard',
                data: {
                    title: '🧠 批判性思维',
                    messages: [{
                        role: 'assistant',
                        content: 'AI 时代最重要的核心能力：独立思考与批判分析'
                    }],
                    model: 'guide'
                }
            },

            // 画布操作
            {
                id: 'guide-canvas',
                x: startX + 3 * COL_STEP,
                y: startY + ROW_STEP + 240,
                w: CARD_WIDTH,
                type: 'standard',
                data: {
                    title: '🖱️ 画布操作',
                    messages: [{
                        role: 'assistant',
                        content: `**移动与缩放：**
🖐️ 拖拽空白处 - 平移
🔍 滚轮/双指 - 缩放
⌨️ Space+拖拽 - 快速平移

**编辑：**
👆 单击 - 选中
✏️ 双击 - 编辑
⬜ 框选 - 批量

🖱️ 试试这些操作`
                    }],
                    model: 'guide'
                }
            },

            // ═══════════════════════════════════════════════════════════════
            // 第 4 列 (X = startX + 4*COL_STEP): 总结
            // ═══════════════════════════════════════════════════════════════

            // 快捷键
            {
                id: 'guide-shortcuts',
                x: startX + 4 * COL_STEP,
                y: startY - ROW_STEP / 2,
                w: CARD_WIDTH,
                type: 'standard',
                data: {
                    title: '⌨️ 快捷键',
                    messages: [{
                        role: 'assistant',
                        content: `**基础操作：**
\`Cmd/Ctrl + Z\` 撤销
\`Cmd/Ctrl + Shift + Z\` 重做
\`Backspace\` 删除
\`V\` 切换选择/平移模式

**高级功能：**
🪄 工具栏魔法棒 - 自动布局
🔍 Cmd/Ctrl + F - 全局搜索

⌨️ 记住快捷键，效率翻倍！`
                    }],
                    model: 'guide'
                }
            },

            // 云同步多语言
            {
                id: 'guide-cloud',
                x: startX + 4 * COL_STEP,
                y: startY + ROW_STEP / 2,
                w: CARD_WIDTH,
                type: 'standard',
                data: {
                    title: '☁️ 云端同步 & 🌐 多语言',
                    messages: [{
                        role: 'assistant',
                        content: `**跨设备无缝衔接**
登录后，数据自动同步到云端
💻 电脑 → 📱 手机 → 🖥️ 平板

**三语支持**
🇺🇸 English | 🇨🇳 中文 | 🇯🇵 日本語
自动检测浏览器语言

☁️ 登录体验云同步`
                    }],
                    model: 'guide'
                }
            },

            // 开始创作
            {
                id: 'guide-start',
                x: startX + 4 * COL_STEP,
                y: startY + ROW_STEP + ROW_STEP / 2,
                w: CARD_WIDTH,
                type: 'standard',
                data: {
                    title: '🎯 开始创作',
                    messages: [{
                        role: 'assistant',
                        content: `**现在就开始！**

1. 🆕 点击左上角 + 新建画布
2. ✍️ 双击空白处创建卡片
3. 🤖 点击卡片的 ✨ 召唤 AI
4. 🔗 拖拽边缘建立连接
5. 📤 右键卡片导出分享

**祝你创作愉快！** 🚀

💬 有问题随时问我！`
                    }],
                    model: 'guide'
                }
            }
        ],

        // ═══════════════════════════════════════════════════════════════════
        // 连线配置
        // 连线颜色由 source card 的 data.cardColor 决定
        // ═══════════════════════════════════════════════════════════════════
        connections: [
            // 根节点 → 第1列 (三大功能)
            { from: 'guide-welcome', to: 'guide-ai-chat', id: 'c-welcome-ai' },
            { from: 'guide-welcome', to: 'guide-sprouting', id: 'c-welcome-sprout' },
            { from: 'guide-welcome', to: 'guide-export', id: 'c-welcome-export' },

            // 第1列 → 第2列 (功能演示)
            { from: 'guide-ai-chat', to: 'guide-ai-demo', id: 'c-ai-demo' },       // 蓝色
            { from: 'guide-ai-chat', to: 'guide-colors', id: 'c-ai-colors' },      // 蓝色
            { from: 'guide-sprouting', to: 'guide-sprout-topic', id: 'c-sprout-topic' }, // 绿色
            { from: 'guide-export', to: 'guide-export-demo', id: 'c-export-demo' },     // 紫色

            // 第2列 → 第3列 (Sprouting 延伸)
            { from: 'guide-sprout-topic', to: 'guide-sprout-1', id: 'c-sprout-1' }, // 青色
            { from: 'guide-sprout-topic', to: 'guide-sprout-2', id: 'c-sprout-2' }, // 青色
            { from: 'guide-sprout-topic', to: 'guide-sprout-3', id: 'c-sprout-3' }, // 青色

            // 第2列 → 第3列 (操作指南)
            { from: 'guide-export-demo', to: 'guide-canvas', id: 'c-export-canvas' },

            // 第2列/第3列 → 第4列 (总结)
            { from: 'guide-colors', to: 'guide-shortcuts', id: 'c-colors-shortcuts' }, // 黄色
            { from: 'guide-ai-demo', to: 'guide-shortcuts', id: 'c-demo-shortcuts' },  // 红色
            { from: 'guide-sprout-3', to: 'guide-cloud', id: 'c-sprout-cloud' },
            { from: 'guide-canvas', to: 'guide-cloud', id: 'c-canvas-cloud' },
            { from: 'guide-canvas', to: 'guide-start', id: 'c-canvas-start' }
        ]
    };
};
