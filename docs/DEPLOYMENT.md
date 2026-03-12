# 部署与开发命令

## 1. 本地开发

```bash
npm install
npm run dev
```

本地构建：

```bash
npm run build
```

`npm run build` 会执行：

1. `node scripts/generate-sitemap.js`
2. `npx vite build`

## 2. Cloudflare Pages 部署脚本

当前 `package.json` 中已有这些脚本：

```bash
npm run deploy:main
npm run deploy:beta
npm run deploy:alpha

npm run ship:main
npm run ship:beta
npm run ship:alpha
```

含义：

- `deploy:*`：构建并部署到 Cloudflare Pages 指定分支
- `ship:*`：部署后再执行 `git push origin <branch>`

当前默认脚本仍指向 beta：

```bash
npm run deploy
npm run ship
```

## 3. 浏览器扩展打包

```bash
npm run ext:build
npm run ext:zip
```

产物：

- `dist-extension/`
- `dist-extension.zip`

## 4. Cloudflare Functions 目录

Cloudflare Pages 会从以下目录加载边缘逻辑：

```text
functions/
  _middleware.js
  api/
```

`public/_headers` 与 `public/_redirects` 也会一起参与部署行为。

## 5. 当前环境变量 / Binding

### Cloudflare Functions

| 名称 | 用途 |
| --- | --- |
| `SYSTEM_GMI_API_KEY` | 系统额度与免费图片生成上游 Key |
| `SYSTEM_CREDITS_KV` | 免费额度与兑换码 KV |
| `STRIPE_SECRET_KEY` | Stripe Session/Order 查询 |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook |
| `ADMIN_UIDS` | 管理员 UID 白名单 |

### 前端构建时可选变量

| 名称 | 用途 |
| --- | --- |
| `VITE_S3_CONFIG_JSON` | 给前端注入默认对象存储配置 |

## 6. 当前部署层面的事实

- 前端 Firebase 配置现在直接写在 `src/services/firebase.js` 中，不依赖运行时 env。
- 没有独立的 `wrangler.toml` 参与脚本分支切换，分支由 `wrangler pages deploy --branch ...` 决定。
- `functions/_middleware.js` 会在 bot 访问时做 SEO meta 注入。
