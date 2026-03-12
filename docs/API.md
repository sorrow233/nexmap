# Cloudflare API

当前服务端接口位于 `functions/`，由 Cloudflare Pages Functions 承载。

## 1. 接口清单

| 路径 | 方法 | 作用 | 认证 |
| --- | --- | --- | --- |
| `/api/gmi-serving` | `POST` | 通用 AI 代理，支持流式/非流式，保护 API Key | 否，由请求体提供目标参数 |
| `/api/system-credits` | `POST` | 系统额度对话、额度查询、免费图片生成 | Firebase Bearer Token |
| `/api/image-gen` | `POST` | GMI 图片生成 submit/poll 代理 | 请求体 API Key |
| `/api/image-proxy` | `GET` | 代理 GMI 存储图片，解决 CORS | 否 |
| `/api/feedback` | `GET/POST/PUT` | 反馈列表、提交反馈、投票；带 `feedbackId` 时也处理评论 | 可选/部分依赖登录 |
| `/api/create-checkout` | `POST` | 创建 Stripe Checkout Session | Firebase Bearer Token |
| `/api/order-details` | `GET` | 查询支付成功后的订单信息 | Firebase Bearer Token |
| `/api/webhook` | `POST` | Stripe Webhook，发放 credits 或 Pro | Stripe |
| `/api/redeem` | `POST` | 兑换码兑换积分或 Pro | Firebase Bearer Token |
| `/api/admin/codes` | `POST` | 生成兑换码 | Firebase Bearer Token + 管理员 UID |
| `/api/test` | `GET` | 基础健康检查 | 否 |

## 2. 关键接口说明

### 2.1 `/api/gmi-serving`

用途：

- 代理 GMI / Gemini 相关请求
- 在代理层做超时、有限重试、错误透传
- 对 `429/401/403` 明确不做代理重试，避免放大问题

关键点：

- 流式和非流式有不同超时与尝试次数
- 会修正非法 `thinkingLevel`
- 会透传 `Retry-After` / `X-RateLimit-Reset`

### 2.2 `/api/system-credits`

当前系统额度规则来自代码：

- 对话模型：`moonshotai/Kimi-K2-Thinking`
- 分析模型：`deepseek-ai/DeepSeek-V3.2`
- 免费对话额度：每周 `200`
- 免费图片额度：每周 `20`
- 图片模型：`seedream-4-0-250828`

支持动作：

- `action: "check"` 查询额度
- `action: "image"` 生成图片
- 默认对话链路由前端 provider 调用

### 2.3 支付链路

- `/api/create-checkout` 使用 Stripe REST API 创建结账会话
- `/api/order-details` 在支付成功页拉取订单详情
- `/api/webhook` 根据 Stripe 元数据为用户增加 bonus credits 或开通 Pro

### 2.4 反馈链路

`/api/feedback` 当前同时承担：

- 反馈列表排序（`hot/top/recent`）
- 提交新反馈
- 点赞 / 取消点赞
- 按 `feedbackId` 处理评论读写

## 3. Middleware

`functions/_middleware.js` 不是 API，但同样属于 Edge 层逻辑：

- 只对 bot/crawler 生效
- 根据路径和语言注入 SEO meta
- 静态资源和普通用户请求直接放行

## 4. 当前依赖的主要环境变量 / Binding

| 名称 | 用途 |
| --- | --- |
| `SYSTEM_GMI_API_KEY` | 系统额度与免费图片生成所用上游 Key |
| `SYSTEM_CREDITS_KV` | 用户额度与兑换码存储 |
| `STRIPE_SECRET_KEY` | 创建支付会话、查询订单 |
| `STRIPE_WEBHOOK_SECRET` | Webhook 配置 |
| `ADMIN_UIDS` | 管理员 UID 白名单 |
