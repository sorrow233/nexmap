# 部署与开发命令

## 1. 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 2. 部署

```bash
# 部署到 Beta (推荐日常开发)
npm run ship:beta
# 等于: npm run deploy:beta && git push origin beta

# 部署到 Main (生产)
npm run ship:main

# 仅部署不推送
npm run deploy:beta
npm run deploy:main
```

## 3. 环境变量

**Cloudflare Pages 环境变量：**
- `GEMINI_API_KEY` - 系统额度使用的 API Key
- `FIREBASE_CONFIG` - Firebase 配置 JSON

**Cloudflare KV Bindings：**
- `SYSTEM_CREDITS` - 用户额度存储
