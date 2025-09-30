# Git 历史 Bug 与修复回顾

本文档详细记录了我们在开发过程中遇到的严重 Bug、原因分析以及具体的修复方案。这些经验对于理解代码库的某些"奇怪"设计至关重要。

## 1. 状态管理危急 (State Management)

### 🔴 Bug: React Error #185 (无限重渲染)
**提交:** `4e95ef1` (Revert), `2394583`
- **现象:** 页面崩溃，控制台报错 `Maximum update depth exceeded`。
- **原因:** 在重构 `useStore` 时，为了性能优化，我们尝试将多个 selector 合并。但这导致每次 store 更新时，selector 返回一个新的对象引用（即使内容没变），触发组件无限重新渲染。
- **修复:**
    1. **紧急回退 (Revert):** 直接回退导致问题的 commit，恢复到稳定状态。
    2. **正确方案:** 在使用 Zustand 时，如果 selector 返回对象，必须使用 `useShallow` 或确保返回的是稳定引用（基本类型）。我们最终放弃了激进的 selector 合并。

### 🟠 Bug: TypeError: O is not a function
**提交:** `a3e367b`
- **现象:** 打开 BoardPage 直接白屏。
- **原因:** Zustand v5 的 selector 写法问题，或者是组件引用的 store 方法不存在（拼写错误）。
- **修复:** 严格检查 `useStore` 的导出和引用，确保所有 slice 的 action 都正确合并到了 root store 中。

## 2. 云同步灾难 (Cloud Sync)

### 🔴 Bug: Firestore 配额耗尽 (死循环)
**提交:** `9dc6e4e`, `918d832`
- **现象:** 短短几分钟内消耗了 50k+ 次读取操作，导致 Firebase 配额耗尽，服务不可用。
- **原因:** `onSnapshot` (监听云端) -> `updateLocal` (更新本地) -> `useEffect` (监听本地) -> `saveToCloud` (保存云端) -> `onSnapshot`... 形成了经典的乒乓死循环。
- **修复:**
    1. **逻辑时钟:** 引入 `syncVersion`。只有当 `remoteVersion > localVersion` 时才更新本地，且更新本地时不触发保存。
    2. **来源标记:** 在更新 store 时及其来源 (Source: 'remote' vs 'user')，'remote' 来源的变更不触发保存副作用。
    3. **熔断机制:** 增加 `offlineMode`，当检测到 Quota 错误时，自动切断网络请求，防止错误级联。

### 🟠 Bug: 幽灵数据 (远程删除后本地又上传)
**提交:** `syncUtils.js` 优化
- **现象:** 在一个设备删除卡片，另一个设备同步时，反而把删除的卡片又上传了回去。
- **原因:** 简单的“合并”策略 (A U B) 无法区分“我是没收到这张卡”还是“我删了这张卡”。
- **修复:** 引入**智能和解算法 (`reconcileCards`)**。
    - 如果本地没有，但云端有 -> 检查云端创建时间。如果比本地最后同步时间新，则是**远程新增**（保留）；否则认为是**本地已删除**（忽略）。

## 3. UI/UX 交互陷阱

### 🟠 Bug: 设置面板保存按钮无法点击
**提交:** `1b20e1a`, `51f419f`
- **现象:** 看起来按钮在那里，但点击无效，点击事件穿透到了下方的 Canvas 卡片上。
- **原因:** CSS 堆叠上下文 (Stacking Context) 问题。Canvas 使用了 `transform`，导致其层级变得非常高，覆盖了 Modal 的层级，尽管 Modal 的 `z-index` 设得很高。
- **修复:**
    1. 为 Modal 容器显式添加 `position: relative` 和 `z-index`。
    2. 确保 Modal 挂载在 `document.body` 的直接子级（使用 Portal），避免被深层 DOM 结构限制。

### 🟢 Bug: 移动端页面卡顿
**提交:** `eb76347`
- **现象:** 手机上加载 Landing Page 非常慢。
- **原因:** 一次性加载了过多高分辨率图片和复杂的 3D 组件。
- **修复:**
    - 实现**懒加载 (Lazy Loading)**。
    - 拆分代码与组件 (`React.lazy`)。
    - 图片使用 WebP 格式并压缩。

## 4. 支付与 Webhook

### 🔴 Bug: 支付成功但未到账
**提交:** `ac01c44`
- **现象:** 用户扣款成功，但系统里积分没增加。
- **原因:** Stripe Webhook 的签名验证失败，或者 Firebase Admin SDK 在 Edge Runtime (Cloudflare Workers) 中不兼容。
- **修复:**
    - Cloudflare 函数中移除不兼容的 Firebase Admin SDK，改用 REST API 直接操作 Firestore/KV。
    - 简化 Webhook 逻辑，优先确保核心数据 (KV) 写入成功。

## 5. 最佳实践总结 (Lessons Learned)
1. **不要手动修改 God File**: 文件超过 500 行必须拆分，否则极易冲突。
2. **状态同步很难**: 永远不要相信“简单的合并”，必须有版本控制 (Logical Clock)。
3. **防御性编程**: 永远假设 API 会失败（尤其是配额不足），必须有降级方案 (Offline Mode)。
4. **小步提交**: 遇到问题方便 Revert，不要一个 commit 改 20 个文件。
