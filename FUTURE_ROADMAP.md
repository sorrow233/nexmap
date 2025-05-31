# MixBoard Canvas - 未来发展路线图

> � 本文档基于对代码库的深度分析，规划了使 MixBoard Canvas 更加专业、稳定、高效的发展方向。

---

## 目录

1. [架构优化](#1-架构优化)
2. [性能提升](#2-性能提升)
3. [功能增强](#3-功能增强)
4. [用户体验](#4-用户体验)
5. [稳定性与监控](#5-稳定性与监控)
6. [商业化准备](#6-商业化准备)

---

## 1. 架构优化

### 1.1 代码分割与懒加载 🔥 高优先

**现状问题**: 
- 主 bundle `index-*.js` 达 1.2MB，影响首屏加载
- 所有模块静态导入，即使不使用也会加载

**建议方案**:
```javascript
// 路由级别懒加载
const BoardPage = lazy(() => import('./pages/BoardPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));

// 功能模块懒加载
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const ChatModal = lazy(() => import('./components/ChatModal'));
```

**预期收益**: 首屏加载时间减少 40-60%

---

### 1.2 状态管理优化

**现状问题**:
- 所有 slices 在 `useStore.js` 中耦合
- 部分状态更新触发不必要的重渲染

**建议方案**:
```javascript
// 按需选择器 - 避免订阅整个 store
const cards = useStore(state => state.cards);
const cardById = useStore(useCallback(state => 
  state.cards.find(c => c.id === id), [id]
));

// 浅比较优化
const { offset, scale } = useStore(
  state => ({ offset: state.offset, scale: state.scale }),
  shallow
);
```

---

### 1.3 Service Worker 离线支持

**功能描述**: 支持离线使用画板，网络恢复后自动同步

**实现要点**:
- 缓存静态资源和 API 响应
- IndexedDB 作为离线数据源
- 后台同步队列处理未完成的操作

---

## 2. 性能提升

### 2.1 Canvas 虚拟化 🔥 高优先

**现状问题**: 卡片数量超过 50 张时，渲染性能明显下降

**建议方案**:
```javascript
// 仅渲染视口内的卡片
const visibleCards = useMemo(() => {
  const viewport = getViewportBounds(offset, scale, window);
  return cards.filter(card => isCardInViewport(card, viewport));
}, [cards, offset, scale]);
```

**预期收益**: 支持 500+ 卡片流畅操作

---

### 2.2 AI 流式响应优化

**现状问题**: 
- 内容缓冲区 throttle 固定 20ms
- 高负载时可能卡顿

**建议方案**:
```javascript
// 自适应节流 - 根据帧率动态调整
const adaptiveThrottle = () => {
  const fps = measureFPS();
  return fps > 50 ? 16 : fps > 30 ? 33 : 50;
};
```

---

### 2.3 图片处理优化

**功能描述**: 
- 上传时自动压缩大图
- 使用 WebP 格式减少存储
- 实现渐进式图片加载

**实现要点**:
```javascript
// 压缩配置
const compressOptions = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.85,
  mimeType: 'image/webp'
};
```

---

## 3. 功能增强

### 3.1 协作功能 🔥 高优先

**功能描述**: 多人实时协作编辑画板

**技术选型**:
- **方案A**: Firebase Realtime Database (简单,成本较高)
- **方案B**: Yjs + WebRTC (P2P,复杂但免费)
- **方案C**: Liveblocks (专业,付费)

**MVP 功能**:
- [ ] 实时光标显示
- [ ] 卡片锁定机制
- [ ] 操作冲突解决
- [ ] 在线用户列表

---

### 3.2 AI 能力扩展

**3.2.1 多模型对比**
```javascript
// 同时向多个模型发送请求，对比回答
const compareModels = async (prompt, models) => {
  return Promise.all(models.map(model => 
    generateResponse(prompt, model)
  ));
};
```

**3.2.2 RAG 知识库**
- 支持上传 PDF/文档构建知识库
- AI 回答时自动检索相关内容
- 基于 embedding 的语义搜索

**3.2.3 Agent 工作流**
- 定义多步骤 AI 任务流程
- 卡片间自动传递上下文
- 支持条件分支和循环

---

### 3.3 模板系统

**功能描述**: 预设画板模板，一键创建特定用途的画板

**模板类型**:
| 模板名称 | 描述 |
|---------|------|
| 头脑风暴 | 中心话题 + 发散卡片 |
| 项目规划 | 时间线 + 任务卡片 |
| 知识图谱 | 概念节点 + 关系连线 |
| 会议记录 | 议题 + 决议 + 待办 |
| 学习笔记 | 主题 + 问题卡 + 答案卡 |

---

### 3.4 高级连线功能

**功能描述**: 
- 连线添加标签/描述
- 不同连线类型（箭头、虚线、双向）
- 连线颜色和样式自定义

---

### 3.5 版本历史

**功能描述**: 查看和恢复画板历史版本

**实现要点**:
- 基于时间戳的快照存储
- 差异对比显示
- 选择性恢复特定元素

---

## 4. 用户体验

### 4.1 快捷键系统增强

**新增快捷键**:
| 快捷键 | 功能 |
|--------|------|
| `Cmd+K` | 全局命令面板 |
| `Cmd+/` | 快速 AI 提问 |
| `Cmd+Shift+F` | 全局搜索 |
| `Tab` | 快速创建连接卡片 |
| `Space` 拖动 | 画布平移 |

---

### 4.2 全局搜索 🔥 高优先

**功能描述**: 搜索所有画板中的内容

```javascript
// 搜索架构
const search = async (query) => {
  const results = [];
  for (const board of boards) {
    const data = await loadBoard(board.id);
    data.cards.forEach(card => {
      if (matchContent(card, query)) {
        results.push({ board, card, matches });
      }
    });
  }
  return results;
};
```

---

### 4.3 深色主题优化

**现状问题**: 部分组件深色模式适配不完整

**待优化组件**:
- [ ] 设置面板
- [ ] 收藏夹侧边栏
- [ ] 分享对话框
- [ ] 图片预览

---

### 4.4 移动端适配

**阶段规划**:
1. **Phase 1**: 响应式布局，触摸手势支持
2. **Phase 2**: PWA 安装支持
3. **Phase 3**: 原生 App (React Native/Flutter)

---

## 5. 稳定性与监控

### 5.1 错误监控系统

**建议工具**: Sentry / LogRocket

```javascript
// 错误边界增强
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    Sentry.captureException(error, { extra: errorInfo });
    this.setState({ hasError: true });
  }
}
```

---

### 5.2 性能监控

**监控指标**:
- FCP (First Contentful Paint)
- LCP (Largest Contentful Paint)
- TTI (Time to Interactive)
- AI 响应延迟
- 流式渲染帧率

---

### 5.3 自动化测试

**测试策略**:
| 测试类型 | 工具 | 覆盖范围 |
|---------|------|---------|
| 单元测试 | Vitest | Store, Services |
| 组件测试 | Testing Library | 关键 UI 组件 |
| E2E 测试 | Playwright | 核心用户流程 |

**优先覆盖**:
- [ ] AI 生成流程
- [ ] 画板 CRUD
- [ ] 云同步逻辑
- [ ] 积分扣费

---

### 5.4 API 健康检查

```javascript
// 定期检查 AI API 可用性
const healthCheck = async () => {
  const checks = [
    checkGMIEndpoint(),
    checkFirebaseAuth(),
    checkCloudflareKV()
  ];
  return Promise.allSettled(checks);
};
```

---

## 6. 商业化准备

### 6.1 付费订阅体系

**套餐设计**:
| 套餐 | 价格 | 功能 |
|------|------|------|
| Free | 免费 | 100 积分，3 画板 |
| Pro | ¥29/月 | 无限积分，无限画板，高级模型 |
| Team | ¥99/月 | Pro + 协作功能 + 管理后台 |

---

### 6.2 分析埋点

**关键事件**:
- 用户注册/登录
- 画板创建/删除
- AI 对话开始/完成
- 功能使用频率
- 付费转化路径

---

### 6.3 数据合规

**待完成项**:
- [ ] 隐私政策页面
- [ ] 用户数据导出功能
- [ ] 账号删除流程
- [ ] GDPR 合规检查

---

## 开发优先级建议

### Phase 1 (1-2 月) - 稳定性
- [x] Bug 修复（已完成）
- [ ] 代码分割与懒加载
- [ ] Canvas 虚拟化
- [ ] 错误监控集成

### Phase 2 (2-3 月) - 体验
- [ ] 全局搜索
- [ ] 快捷键增强
- [ ] 深色主题完善
- [ ] 移动端 Phase 1

### Phase 3 (3-4 月) - 功能
- [ ] 模板系统
- [ ] 版本历史
- [ ] 高级连线

### Phase 4 (4-6 月) - 商业化
- [ ] 付费订阅
- [ ] 协作功能
- [ ] 数据分析

---

## 技术债务清单

| 问题 | 位置 | 优先级 |
|------|------|--------|
| useStore 动态导入警告 | syncService.js | 中 |
| Bundle 过大 | 全局 | 高 |
| 测试覆盖率低 | 全局 | 中 |
| console.log 清理 | 多处 | 低 |

---

*文档创建: 2024-12-27*  
*最后更新: 2024-12-27*
