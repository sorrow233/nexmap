---
description: 四语适配，以及 SEO 优化
---

# SEO 和多语言适配工作流

## 概述
本工作流用于确保 NexMap 应用支持四种语言（英语、中文、日语、韩语）并优化 SEO 设置。

## 检查项目

### 1. 翻译文件完整性检查
- 检查 `src/contexts/translations.js` 是否包含所有四种语言
- 确保每种语言的所有 key 都已翻译
- 特别关注：hero, bento, settings, credits, pricing, feedback, sidebar 等核心模块

### 2. SEO 优化检查
- 检查 `index.html` 的 meta 标签是否完善
- 验证 Open Graph 和 Twitter Cards 设置
- 确保 `public/sitemap.xml` 包含所有公开页面
- 验证 `public/robots.txt` 配置正确
- 检查结构化数据 (JSON-LD) 是否完整

### 3. 语言切换功能
- 确保语言切换器工作正常
- 验证语言偏好保存到 localStorage

## 执行步骤

### Step 1: 补全缺失语言
// turbo
```bash
检查现有翻译，添加缺失的语言（如韩语）
```

### Step 2: 补全缺失翻译
- 对比 en 和其他语言，找出缺失的 key
- 翻译缺失内容

### Step 3: SEO 优化
- 更新 sitemap.xml 日期
- 验证 canonical URL
- 添加多语言 hreflang 标签（如适用）

### Step 4: 部署验证
// turbo
```bash
npm run deploy:beta
git add . && git commit -m "SEO and multi-language optimization" && git push origin beta
```
