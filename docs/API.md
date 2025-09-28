# API 端点 (Cloudflare Functions)

## 1. `gmi-proxy.js` - 通用 AI 代理

**路径：** `/api/gmi-proxy`

**功能：** 代理所有 GMI Cloud API 请求，保护 API Key

**请求格式：**
```javascript
POST /api/gmi-proxy
{
    apiKey: '...',
    baseUrl: 'https://api.gmi-serving.com/v1',
    endpoint: '/models/google/gemini-3-pro-preview:generateContent',
    method: 'POST',
    requestBody: { ... },
    stream: true/false
}
```

**响应：** 透传上游响应

## 2. `system-credits.js` - 免费额度 API

**路径：** `/api/system-credits`

**功能：** 
- 为无 API Key 用户提供免费 AI 访问
- 跟踪 Token 消耗
- 扣除用户额度

**认证：** Firebase ID Token (Header: `Authorization: Bearer <token>`)

**初始额度：** 100 credits ($1 等值)

**定价模型：**
```javascript
const PRICING = {
    INPUT_PER_MILLION: 0.40,   // $0.40/M tokens
    OUTPUT_PER_MILLION: 2.40   // $2.40/M tokens
};
```

**额度存储：** Cloudflare KV (`SYSTEM_CREDITS` binding)

**请求格式：**
```javascript
POST /api/system-credits
{
    action: 'chat' | 'check',
    model: '...',
    messages: [...],
    stream: true/false
}
```

**响应格式：**
```javascript
{
    // 流式：返回 text/event-stream
    // 非流式：
    content: '...',
    credits: {
        used: 0.5,
        remaining: 99.5
    }
}
```

## 3. `image-gen.js` - 图片生成代理

**路径：** `/api/image-gen`

**功能：** 代理图片生成请求

## 4. `image-proxy.js` - 图片加载代理

**路径：** `/api/image-proxy`

**功能：** 代理外部图片加载，解决 CORS
