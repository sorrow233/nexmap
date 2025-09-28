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
