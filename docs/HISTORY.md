# 项目演进历史 (Git History)

> 以下是从 git 历史中提取的重要功能和修复记录，帮助理解项目发展方向。

## 1. 最近重点工作 (2025年12月)

### 🎁 系统额度功能
- `feat(system-credits)`: 新用户免费试用积分系统
- `fix(credits)`: 改进加载超时和错误处理
- 为无 API Key 用户提供 100 积分 ($1 等值) 免费额度

### 🔐 安全修复
- `fix(security)`: 修复登出后数据未清理的安全隐患
- 实现 `clearAllUserData.js` 全面清理 localStorage, IndexedDB, Redux Store

### 🤖 多 Provider 支持
- `feat: implement multi-provider support with per-provider roles`
- 支持 Gemini 和 OpenAI Compatible 协议
- 每个 Provider 可配置不同角色模型 (chat/analysis/image)

### ⚡ AI 响应流畅度
- `feat: implement smooth character-dripping effect for AI streaming`
- `feat: improve AI response fluidity with flash speed and gray tail effect`
- 20ms 节流批量更新优化

### 🔧 Gemini 工具配置
- `fix(gemini): disable code_execution to resolve tool conflict`
- `fix(gemini): remove invalid url_context tool`
- 优先使用 google_search 进行信息检索

## 2. 关键架构变更

| 提交 | 变更 |
|------|------|
| `7b2b2ca` | 重构: 统一拖拽逻辑，模块化 'God files' |
| `c5a76fd` | 重建 debugLogger，支持环境感知彩色日志 |
| `3d50e52` | 修复: 重构分区锁定逻辑为基于连接而非位置 |
| `6f43e7e` | 文档: 添加 ARCHITECTURE.md |

## 3. 已解决的重要 Bug

| 问题 | 解决方案 |
|------|---------|
| 登出后数据残留 | 实现全面数据清理 (`clearAllUserData.js`) |
| 卡片拖动 NaN 错误 | 修复坐标计算逻辑 |
| 云端同步死循环 | 使用 `createdAt` 和 `localUpdatedAt` 区分操作类型 |
| 卡片删除后重现 | syncService 精确区分远程新增和本地删除 |
| Provider 云同步丢失 | 修复 provider persistence 问题 |
| 图片生成 ERR_BLOCKED | 改用本地 base64 解码 |

---

## 更新日志

| 日期 | 更新内容 |
|------|---------|
| 2025-12-27 | 初始版本，完整代码库扫描 |

---

> 📝 **维护提示：** 当代码发生重大变更时，请同步更新此文档。
