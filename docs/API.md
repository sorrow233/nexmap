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

## 5. `create-checkout.js` - Stripe 支付

**路径：** `/api/create-checkout`

**功能：**
- 创建 Stripe Checkout Session
- 处理不同的产品套餐 (Credits 500/2000/5000, Pro License)
- 验证 Firebase Token

**请求格式：**
```javascript
POST /api/create-checkout
{
    productId: 'credits_500' | 'pro_lifetime',
    successUrl: '...',
    cancelUrl: '...'
}
```

## 6. `feedback.js` - 用户反馈系统

**路径：** `/api/feedback`

**功能：**
- `GET`: 获取反馈列表 (支持 sort=hot/top/recent)
- `POST`: 提交新反馈 (需验证邮箱)
- `PUT`: 投票 (Upvote/Downvote)
- 子资源 `/comments`: 获取或提交评论

**存储：** Firestore `feedback` 集合

## 7. `redeem.js` - 兑换码系统

**路径：** `/api/redeem`

**功能：**
- 验证并消耗兑换码
- 增加用户积分或升级 Pro
- 防止重复兑换 (KV 存储状态)

**请求格式：**
```javascript
POST /api/redeem
{
    code: 'PRO-2024-XYZ'
}
```

## 8. `webhook.js` - Stripe Webhook

**路径：** `/api/webhook`

**功能：**
- 监听 `checkout.session.completed` 事件
- 自动发货 (增加积分或开通 Pro)
- 更新 System Credits KV
