
export const ONBOARDING_DATA = {
    name: "NexMap 使用指南 🚀",
    cards: [
        {
            id: "guide-1",
            x: 100,
            y: 100,
            type: "standard",
            data: {
                title: "欢迎来到 NexMap",
                messages: [{
                    role: "assistant",
                    content: "这是一个基于 **Graph OS** 理念的非线性思维工具。\n\n你可以通过双击画布创建卡片，或者在下方输入框直接开始对话。所有的思考都将以节点的形式呈现，帮助你构建知识图谱。"
                }],
                model: "system-onboarding"
            }
        },
        {
            id: "guide-2",
            x: 550,
            y: 100,
            type: "standard",
            data: {
                title: "智能路由连接",
                messages: [{
                    role: "assistant",
                    content: "注意卡片之间的连线！它们现在是平滑的 **三次贝塞尔曲线**。\n\n线条会自动寻找最近的边缘进行吸附，并且在卡片移动时动态调整路径，始终保持视觉上的有序与美观。"
                }],
                model: "system-onboarding"
            }
        },
        {
            id: "guide-3",
            x: 100,
            y: 450,
            type: "note",
            data: {
                content: "💡 **快捷键提示**：\n- **L**: 快速连接选中的两个卡片\n- **C**: 断开选中卡片的所有连接\n- **Delete**: 删除选中的卡片\n- **Cmd + Z**: 撤销操作"
            }
        },
        {
            id: "guide-4",
            x: 550,
            y: 450,
            type: "standard",
            data: {
                title: "开发与分发机制",
                messages: [{
                    role: "assistant",
                    content: "本项目采用三级分发体系：\n- **Alpha**: 实验性功能测试\n- **Beta**: 稳定功能演示 (当前环境)\n- **Main**: 正式生产版本\n\n每次 `npm run ship` 都会自动完成构建、部署并同步 Git 分支。"
                }],
                model: "system-onboarding"
            }
        }
    ],
    connections: [
        { from: "guide-1", to: "guide-2" },
        { from: "guide-1", to: "guide-3" },
        { from: "guide-2", to: "guide-4" },
        { from: "guide-3", to: "guide-4" }
    ]
};
