# 关键业务逻辑详解

## 1. 多 Provider 支持

**配置结构：**
```javascript
{
    providers: {
        'google': {
            id: 'google',
            name: 'GMI Gemini',
            baseUrl: 'https://api.gmi-serving.com/v1',
            apiKey: 'YOUR_KEY',
            model: 'google/gemini-3-pro-preview',
            protocol: 'gemini',  // 'gemini' | 'openai'
            roles: {
                chat: 'google/gemini-3-pro-preview',
                analysis: 'google/gemini-3-flash-preview',
                image: 'gemini-3-pro-image-preview'
            }
        },
        'custom': {
            id: 'custom',
            name: '自定义 OpenAI',
            baseUrl: 'https://api.openai.com/v1',
            apiKey: '...',
            model: 'gpt-4',
            protocol: 'openai'
        }
    },
    activeId: 'google'
}
```

**角色模型：**
- `chat` - 主对话模型
- `analysis` - 分析/后续问题生成 (较快的模型)
- `image` - 图片生成模型

## 2. 免费额度系统

**流程：**
1. 用户未配置 API Key
2. `ModelFactory.getProvider()` 返回 `SystemCreditsProvider`
3. Provider 发送请求到 `/api/system-credits`
4. Cloudflare Function 验证 Firebase Token
5. 检查 KV 中用户额度
6. 使用系统 API Key 调用 AI
7. 计算消耗 Token 并扣除额度
8. 返回响应和剩余额度

**额度计算：**
```javascript
function calculateCreditsUsed(inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1_000_000) * PRICING.INPUT_PER_MILLION;
    const outputCost = (outputTokens / 1_000_000) * PRICING.OUTPUT_PER_MILLION;
    return inputCost + outputCost;
}
```

## 3. 撤销/重做

**实现：** Zundo middleware

**配置：**
```javascript
temporal(storeCreator, {
    limit: 50,  // 最多 50 步历史
    equality: (a, b) => a.cards === b.cards && a.connections === b.connections,
    partialize: (state) => ({
        cards: state.cards,
        connections: state.connections,
        groups: state.groups
    })
})
```

**使用：**
```javascript
import { undo, redo } from './store/useStore';

// 撤销
undo();

// 重做
redo();
```

## 4. 自动布局

**两种布局：**

1. **树形布局** (`calculateLayout`)
   - 识别连接关系
   - 找到根节点
   - 递归布局子节点
   - 从左到右展开

2. **网格布局** (`calculateGridLayout`)
   - 按选中顺序排列
   - 固定列数
   - 等间距网格

## 5. 卡片连接

**创建连接：**
1. 点击卡片连接按钮 → `handleConnect(sourceId)`
2. 进入连接模式
3. 点击目标卡片 → `handleConnect(targetId)`
4. 自动检查重复
5. 添加连接并退出连接模式

**连接时自动分组：**
- 如果源卡片在 Zone 中，目标自动加入
- 如果目标在 Zone 中，源自动加入
- 如果都在不同 Zone，合并到源的 Zone

- 如果都在不同 Zone，合并到源的 Zone

## 6. 核心算法细节 (Core Algorithms)

### 6.1 智能卡片定位 (`geometry.js`)
新卡片创建时，系统通过 `findOptimalPosition` 寻找最佳位置，包含三种回退策略：
1.  **上下文关联**: 如果有选中卡片，优先寻找其右侧 `(Right + Margin)` 的空闲区域。
2.  **螺旋搜索**: 以视口中心为原点，进行网格化螺旋搜索 (Spiral Search)，找到第一个无重叠的空位。
3.  **随机回退**: 如果前两者都失败，在视口中心附近添加微小随机偏移。

### 6.2 语义化连接点 (`getBestAnchorPair`)
连线并非简单连接两个中心，而是计算最佳锚点 (Top/Bottom/Left/Right)。
- **惩罚系统**: 引入 `penalty` 机制强制语义流向。
    - **水平布局**: 如果 A 在 B 左侧，强制使用 (A.Right -> B.Left)，其他方向增加 5000 距离惩罚。
    - **垂直布局**: 类似地，强制使用 (A.Bottom -> B.Top)。

### 6.3 树形自动布局 (`autoLayout.js`)
实现了类 MindNode 的思维导图布局算法：
- **递归高度计算**: 计算每个子树的 `totalHeight`。
- **垂直居中**: 父节点定位于其所有子节点高度集合的垂直中心。
- **森林堆叠**: 如果有断开的图 (Forest)，将它们垂直堆叠，避免重叠。

### 6.4 网格布局算法
使用 `Math.sqrt(N)` 计算最佳列数，并实现了**视觉顺序排序**：
- 在重排前，先根据原位置的 (Y, X) 进行排序，确保原本在左上角的卡片重排后依然在前面，保持用户的视觉心智模型。

## 7. 性能监控 (`performanceMonitor.js`)

**功能：**
- 追踪 LLM 响应时间 (TTFT - Time To First Token)
- 计算 tokens/sec (生成速率)
- 估算 chunk 大小与 token 的关系 (约 1.5 chars/token)
- 自动记录性能日志供分析

## 7. 用户引导 (`onboarding.js`)

**功能：**
- 定义首次加载时的欢迎卡片数据结构
- 预设连接关系 (Guide 1 -> Guide 2)
- 介绍核心功能 (双击创建、智能连线、快捷键)
- 区分不同分发渠道 (Alpha/Beta/Main) 的引导内容
