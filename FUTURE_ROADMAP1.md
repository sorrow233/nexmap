# MixBoard Canvas - 未来开发路线图

> 🚀 本文档规划了 MixBoard Canvas 的未来发展方向，旨在使产品变得更加**专业**、**稳定**、**高效**。

---

## 目录

1. [愿景与目标](#1-愿景与目标)
2. [稳定性改进 (P0 - 最高优先级)](#2-稳定性改进-p0--最高优先级)
3. [性能优化 (P1)](#3-性能优化-p1)
4. [用户体验提升 (P2)](#4-用户体验提升-p2)
5. [新功能规划 (P3)](#5-新功能规划-p3)
6. [技术债务清理](#6-技术债务清理)
7. [基础设施升级](#7-基础设施升级)
8. [实施优先级矩阵](#8-实施优先级矩阵)

---

## 1. 愿景与目标

### 1.1 产品愿景
将 MixBoard Canvas 打造成**最直观的 AI 思维可视化工具**，帮助用户：
- 以可视化方式组织与 AI 的对话
- 构建个人/团队知识网络
- 实现高效的头脑风暴和决策支持

### 1.2 核心目标

| 目标 | 关键指标 |
|------|---------|
| **专业性** | 企业级功能、团队协作、数据导出 |
| **稳定性** | 99.9% 可用性、零数据丢失、优雅降级 |
| **高效性** | 首屏加载 < 2s、AI 响应 < 1s TTFB、流畅 60fps |

---

## 2. 稳定性改进 (P0 - 最高优先级)

### 2.1 数据持久化增强

#### 🔧 问题现状
- IndexedDB 和 Firestore 双写可能导致不一致
- 网络中断时数据可能丢失
- 大型画板 (100+ 卡片) 保存延迟

#### ✅ 改进方案

**2.1.1 实现乐观更新 + 确认机制**
```
位置: src/services/boardService.js, src/services/syncService.js

改进:
1. 本地优先写入，异步同步到云端
2. 添加同步状态指示器 (synced/syncing/error)
3. 实现操作队列，保证顺序执行
4. 冲突检测和解决策略 (Last-Write-Wins → 可选合并)
```

**2.1.2 增量保存**
```
位置: src/store/slices/cardSlice.js

改进:
1. 仅保存变更的卡片，而非全量
2. 使用 diff 算法检测变化
3. 减少 IndexedDB 写入量
```

**2.1.3 离线模式**
```
新增: src/services/offlineQueue.js

功能:
1. 检测网络状态
2. 离线时将操作加入队列
3. 恢复在线时批量同步
4. UI 提示离线状态
```

### 2.2 错误边界完善

#### 🔧 问题现状
- 某些组件崩溃会导致整个应用白屏
- 错误信息对用户不友好

#### ✅ 改进方案

**2.2.1 细粒度 ErrorBoundary**
```
位置: src/components/

需要包裹:
- 每个 Card 组件
- ChatModal
- Canvas (已有)
- SettingsModal

每个 ErrorBoundary 提供:
1. 友好的错误提示
2. "重试" 按钮
3. 自动上报错误日志
```

**2.2.2 全局错误追踪**
```
新增: src/services/errorReporting.js

集成选项:
- Sentry (推荐)
- 自建日志服务

捕获:
- JavaScript 运行时错误
- Promise rejection
- AI API 错误
- 网络错误
```

### 2.3 自动恢复机制

**2.3.1 自动保存草稿**
```
位置: src/hooks/useAutoSave.js (新增)

功能:
1. 每 30 秒自动保存到 localStorage
2. 检测异常退出，下次启动提示恢复
3. 保留最近 5 个版本
```

**2.3.2 AI 生成中断恢复**
```
位置: src/store/slices/aiSlice.js

改进:
1. 保存生成中的状态
2. 页面刷新后可继续生成
3. 显示 "上次未完成的生成" 提示
```

---

## 3. 性能优化 (P1)

### 3.1 渲染性能

#### 🔧 问题现状
- 大量卡片时滚动/缩放卡顿
- 每次状态更新触发全量重渲染

#### ✅ 改进方案

**3.1.1 虚拟化渲染**
```
位置: src/components/Canvas.jsx

方案:
1. 只渲染视口内的卡片
2. 使用 IntersectionObserver 或手动计算
3. 视口外卡片使用占位符

预期效果:
- 支持 1000+ 卡片无卡顿
- 内存占用降低 70%
```

**3.1.2 React.memo 优化**
```
位置: src/components/Card.jsx, StickyNote.jsx

改进:
1. 使用 React.memo 包裹
2. 自定义比较函数，避免不必要重渲染
3. 拆分大组件为更小的 memo 组件
```

**3.1.3 状态订阅优化**
```
位置: 所有组件

改进:
1. 使用 Zustand selector 精确订阅
2. 避免订阅整个 state
3. 使用 shallow 比较

示例:
// 之前
const { cards, connections, offset } = useStore();

// 之后
const cards = useStore(state => state.cards);
const offset = useStore(state => state.offset, shallow);
```

### 3.2 加载性能

**3.2.1 代码分割**
```
位置: src/App.jsx, vite.config.js

改进:
1. 路由级别 lazy loading
2. 大型组件按需加载 (SettingsModal, ChatModal)
3. 第三方库分包

示例:
const SettingsModal = React.lazy(() => import('./SettingsModal'));
```

**3.2.2 资源预加载**
```
位置: index.html

改进:
1. 预连接 API 域名
2. 预加载关键字体
3. 预取下一页资源
```

**3.2.3 图片优化**
```
位置: src/services/imageStore.js

改进:
1. 压缩上传图片 (最大 1MB)
2. 生成缩略图用于卡片预览
3. 懒加载图片
4. 使用 WebP 格式
```

### 3.3 AI 响应优化

**3.3.1 更细粒度的流式更新**
```
位置: src/store/slices/aiSlice.js

当前: 20ms 节流
目标: 根据设备性能动态调整

改进:
1. 检测设备性能
2. 高性能设备: 10ms
3. 低性能设备: 50ms
4. 使用 requestIdleCallback
```

**3.3.2 预测性加载**
```
位置: src/hooks/useAISprouting.js

改进:
1. 用户停止输入时预测意图
2. 预加载可能需要的模型响应
3. 缓存常见问题的回答
```

---

## 4. 用户体验提升 (P2)

### 4.1 交互优化

**4.1.1 快捷键系统增强**
```
位置: src/hooks/useGlobalHotkeys.js

新增快捷键:
- Cmd/Ctrl + K: 快速搜索
- Cmd/Ctrl + /: 快捷键提示
- Cmd/Ctrl + D: 复制卡片
- Cmd/Ctrl + E: 导出选中
- Cmd/Ctrl + G: 创建分组
- 1-9: 快速切换画板
```

**4.1.2 右键菜单**
```
新增: src/components/ContextMenu.jsx

功能:
- 卡片右键: 复制/删除/收藏/导出/AI扩展
- 画布右键: 粘贴/新建卡片/新建便签
- 连线右键: 删除连线
```

**4.1.3 拖放增强**
```
位置: src/hooks/useDraggable.js

改进:
1. 拖拽时显示目标位置预览
2. 吸附到网格 (可选)
3. 智能对齐辅助线
4. 多选拖拽保持相对位置
```

### 4.2 视觉反馈

**4.2.1 加载状态优化**
```
位置: 全局

改进:
1. 骨架屏替代 Spinner
2. 进度条显示加载进度
3. AI 生成时显示预估剩余时间
```

**4.2.2 操作反馈**
```
新增: src/components/Toast.jsx

功能:
1. 保存成功/失败提示
2. 复制成功提示
3. 操作撤销提示 (带撤销按钮)
```

**4.2.3 状态指示器**
```
新增: src/components/StatusBar.jsx

显示:
- 当前画板名称
- 同步状态
- 在线/离线状态
- AI 额度剩余
- 快捷键提示
```

### 4.3 搜索与导航

**4.3.1 全局搜索**
```
新增: src/components/SearchModal.jsx

功能:
1. 搜索所有画板的卡片内容
2. 搜索结果高亮
3. 点击跳转到对应卡片
4. 支持正则表达式
```

**4.3.2 画板缩略图导航**
```
新增: src/components/MiniMap.jsx

功能:
1. 右下角小地图
2. 显示所有卡片位置
3. 点击快速跳转
4. 显示当前视口范围
```

---

## 5. 新功能规划 (P3)

### 5.1 协作功能 (重大功能)

**5.1.1 实时协作**
```
技术方案:
- 使用 Firebase Realtime Database 或 Firestore 实时监听
- 或使用 Yjs + WebRTC 实现 P2P 协作
- 显示协作者光标和选择

实施路径:
1. Phase 1: 只读分享 (已有基础)
2. Phase 2: 异步协作 (评论/标注)
3. Phase 3: 实时同步编辑
```

**5.1.2 评论系统**
```
新增: src/components/Comments.jsx, src/store/slices/commentSlice.js

功能:
1. 在卡片上添加评论
2. @提及用户
3. 评论通知
4. 评论解决/未解决状态
```

### 5.2 导出与集成

**5.2.1 多格式导出**
```
新增: src/services/exportService.js

支持格式:
- Markdown (带图片)
- PDF (保留布局)
- PNG/SVG (画布截图)
- JSON (备份/迁移)
- Notion 格式
- Obsidian 格式
```

**5.2.2 导入功能**
```
新增: src/services/importService.js

支持导入:
- Markdown 文件
- JSON 备份
- 图片 (批量)
- URL 链接 (自动抓取内容)
```

**5.2.3 API 集成**
```
新增: functions/api/webhooks.js

功能:
1. Webhook 通知
2. Zapier 集成
3. Slack 通知
4. 自定义 API 访问
```

### 5.3 AI 能力增强

**5.3.1 多模型对比**
```
新增: src/components/ModelComparison.jsx

功能:
1. 同一问题发送到多个模型
2. 并排显示结果
3. 用户评分/选择最佳回答
```

**5.3.2 AI 记忆**
```
新增: src/services/memoryService.js

功能:
1. 长期记忆跨对话
2. 用户偏好学习
3. 自定义知识库 (RAG)
4. 上传文档建立上下文
```

**5.3.3 AI Agent 模式**
```
新增: src/services/agentService.js

功能:
1. 定义任务目标
2. AI 自动分解任务
3. 执行多步骤操作
4. 与外部服务交互 (搜索、计算等)
```

### 5.4 模板与工作流

**5.4.1 画板模板**
```
新增: src/components/TemplateGallery.jsx

预设模板:
- 头脑风暴
- SWOT 分析
- 用户旅程图
- 产品 PRD
- 技术架构图
- 会议记录
```

**5.4.2 自动化工作流**
```
新增: src/services/workflowService.js

功能:
1. 定义触发条件
2. 自动执行操作
3. 示例: 每周自动总结所有卡片
```

---

## 6. 技术债务清理

### 6.1 代码质量

| 任务 | 位置 | 优先级 |
|------|------|--------|
| 添加 TypeScript | 全项目 | 中 |
| 统一错误处理 | services/ | 高 |
| 移除未使用代码 | 全项目 | 低 |
| 完善 JSDoc 注释 | 关键函数 | 中 |
| 单元测试覆盖 | store/, services/ | 高 |

### 6.2 依赖更新

| 包 | 当前版本 | 建议操作 |
|---|---------|---------|
| react | 18.2.0 | 关注 React 19 |
| zustand | 5.0.9 | 保持最新 |
| firebase | 10.7.1 | 定期更新安全补丁 |

### 6.3 测试覆盖

**目标覆盖率:**
- 单元测试: 80%
- 集成测试: 50%
- E2E 测试: 关键用户路径

**测试计划:**
```
1. 添加 Vitest 配置 (已在 package.json)
2. 为所有 slices 编写测试
3. 为核心 services 编写测试
4. 使用 Playwright 进行 E2E 测试
```

---

## 7. 基础设施升级

### 7.1 监控与观测

**7.1.1 性能监控**
```
集成: Web Vitals

监控指标:
- LCP (最大内容绘制)
- FID (首次输入延迟)
- CLS (累积布局偏移)
- TTFB (首字节时间)
```

**7.1.2 用户行为分析**
```
集成: Mixpanel 或 Amplitude

跟踪事件:
- 卡片创建/删除
- AI 生成请求
- 功能使用频率
- 错误发生率
```

### 7.2 CI/CD 改进

**7.2.1 自动化流程**
```
新增: .github/workflows/

流程:
1. PR 时自动运行测试
2. Lint 检查
3. Type 检查 (如添加 TS)
4. 自动部署预览环境
```

**7.2.2 分支策略**
```
建议:
- main: 生产环境
- beta: 测试环境
- feature/*: 功能开发
- hotfix/*: 紧急修复
```

### 7.3 安全增强

**7.3.1 内容安全**
```
改进:
1. XSS 防护 (已有 DOMPurify)
2. CSP 策略配置
3. 敏感数据加密存储
```

**7.3.2 访问控制**
```
改进:
1. API Rate Limiting
2. Token 刷新机制
3. 异常登录检测
```

---

## 8. 实施优先级矩阵

### 8.1 优先级评分

| 功能 | 影响力 | 工作量 | 优先级 | 预计周期 |
|------|--------|--------|--------|---------|
| 离线模式 | 高 | 中 | **P0** | 2 周 |
| 虚拟化渲染 | 高 | 高 | **P1** | 3 周 |
| 全局搜索 | 中 | 低 | **P1** | 1 周 |
| 右键菜单 | 中 | 低 | **P2** | 3 天 |
| 多格式导出 | 中 | 中 | **P2** | 2 周 |
| 实时协作 | 高 | 高 | **P3** | 6 周 |
| AI 记忆 | 高 | 高 | **P3** | 4 周 |
| TypeScript 迁移 | 中 | 高 | **P3** | 4 周 |

### 8.2 里程碑规划

#### 🏁 v1.1 - 稳定版 (4 周)
- [ ] 离线模式
- [ ] 细粒度 ErrorBoundary
- [ ] 自动保存草稿
- [ ] Toast 通知系统
- [ ] 测试覆盖率 50%

#### 🏁 v1.2 - 性能版 (6 周)
- [ ] 虚拟化渲染
- [ ] 代码分割
- [ ] 图片压缩
- [ ] 状态订阅优化

#### 🏁 v1.3 - 体验版 (4 周)
- [ ] 全局搜索
- [ ] 右键菜单
- [ ] 快捷键增强
- [ ] MiniMap

#### 🏁 v2.0 - 协作版 (8 周)
- [ ] 实时协作
- [ ] 评论系统
- [ ] 多格式导出
- [ ] API 集成

---

## 附录：快速参考

### A. 文件变更速查

```
新增文件:
├── src/
│   ├── services/
│   │   ├── offlineQueue.js      # 离线队列
│   │   ├── exportService.js     # 导出服务
│   │   ├── importService.js     # 导入服务
│   │   ├── errorReporting.js    # 错误上报
│   │   └── memoryService.js     # AI 记忆
│   │
│   ├── components/
│   │   ├── ContextMenu.jsx      # 右键菜单
│   │   ├── Toast.jsx            # 通知
│   │   ├── StatusBar.jsx        # 状态栏
│   │   ├── SearchModal.jsx      # 搜索
│   │   ├── MiniMap.jsx          # 小地图
│   │   └── TemplateGallery.jsx  # 模板
│   │
│   └── hooks/
│       └── useAutoSave.js       # 自动保存

修改文件:
├── src/services/boardService.js  # 增量保存
├── src/services/syncService.js   # 离线支持
├── src/components/Canvas.jsx     # 虚拟化
├── src/components/Card.jsx       # memo 优化
└── src/hooks/useGlobalHotkeys.js # 新快捷键
```

### B. 技术选型建议

| 需求 | 推荐方案 | 备选 |
|------|---------|------|
| 实时协作 | Yjs + WebRTC | Firestore |
| 错误追踪 | Sentry | LogRocket |
| 虚拟化 | 自定义实现 | react-window |
| 测试 | Vitest + Playwright | Jest + Cypress |
| CI/CD | GitHub Actions | Cloudflare Pages CI |

---

> 📅 **最后更新**: 2025-12-27  
> 📝 **维护者**: AI Assistant  
> 🔄 **下次评审**: 建议每季度更新一次路线图
