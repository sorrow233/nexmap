# 常见问题与注意事项

## 1. 状态持久化

| 数据类型 | 存储位置 | 备注 |
|---------|---------|------|
| 画板内容 (cards, connections, groups) | IndexedDB + Firestore | 自动同步 |
| Provider 设置 | localStorage (`mixboard_providers_v3`) | 敏感信息 |
| 视口状态 (offset, scale) | localStorage | 每个画板独立 |
| 系统额度 | Cloudflare KV | 服务端管理 |

## 2. 图片存储

- **上传图片：** 转为 Base64 存入卡片 data
- **云同步：** 可选上传到 S3/云存储
- **限制：** Base64 会增大数据体积

## 3. 性能优化点

1. **AI 任务队列** - 并发控制防止过载
2. **防抖保存** - 减少存储操作
3. **虚拟化渲染** - 大量卡片时考虑
4. **图片懒加载** - 减少初始加载

## 4. 安全注意事项

1. **API Key 保护** - 用户 Key 仅存本地，系统 Key 在 Cloudflare 环境变量
2. **Firebase Token 验证** - 系统额度 API 验证用户身份
3. **CORS** - Cloudflare Functions 正确配置

## 5. 调试日志

使用 `debugLogger.js`:
```javascript
import { debugLog } from '../utils/debugLogger';

debugLog.ai('AI 相关日志', data);
debugLog.ui('UI 事件日志', data);
debugLog.storage('存储操作日志', data);
debugLog.error('错误日志', error);
```
