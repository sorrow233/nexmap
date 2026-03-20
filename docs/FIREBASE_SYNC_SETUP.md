# Firebase 云同步对照说明

这次前端已经按下面这套路径接入 Firebase 云同步：

| 项目 | 默认值 |
| --- | --- |
| 用户集合 | `users` |
| 画板集合 | `boards` |
| 增量子集合 | `updates` |
| checkpoint 分片集合 | `snapshots` |

完整路径示例：

```text
users/{uid}/boards/{boardId}
users/{uid}/boards/{boardId}/updates/{updateId}
users/{uid}/boards/{boardId}/snapshots/{checkpointId}
users/{uid}/boards/{boardId}/snapshots/{checkpointId}/parts/{partId}
```

## 你现在需要检查什么

### 1. 规则路径是否一致

如果你现在 Firebase Rules 已经是按上面的路径写的，那么前端不需要再改。

如果你现在的规则集合名不同，可以通过环境变量覆盖：

```bash
VITE_FIREBASE_SYNC_USERS_COLLECTION=users
VITE_FIREBASE_SYNC_BOARDS_COLLECTION=boards
VITE_FIREBASE_SYNC_UPDATES_COLLECTION=updates
VITE_FIREBASE_SYNC_SNAPSHOTS_COLLECTION=snapshots
```

### 2. 登录用户是否就是 Firebase Auth 当前用户

同步只会在前端检测到 `auth.currentUser.uid` 后启动。

所以你需要确认：

- Firebase Auth 已经正常工作
- 当前设备登录后能拿到同一个 `uid`
- 你要同步的账号就是这个 `uid`

### 3. Firestore 是否已经启用

前端同步依赖 Firestore。

需要确认：

- 当前 Firebase 项目已开通 Firestore
- 规则允许当前用户访问自己的：
  - `users/{uid}/boards/{boardId}`
  - `updates`
  - `snapshots`
  - `snapshots/{checkpointId}/parts`

## 当前前端行为

| 行为 | 说明 |
| --- | --- |
| 打开 board | 先读本地，再补云端 checkpoint 和增量 |
| 编辑 board | 本地先保存，再批量写入 Firebase |
| 周期压缩 | 把当前 Yjs 状态写成 root checkpoint，超大内容自动分片 |
| 登录后 | 本地已有 board 会后台补种到 Firebase root checkpoint |
| 换设备 | 先拉 board 元数据，再在打开时拉内容 |

## 可选环境变量

```bash
VITE_FIREBASE_SYNC_ENABLED=true
VITE_FIREBASE_SYNC_UPLOAD_DEBOUNCE_MS=2500
VITE_FIREBASE_SYNC_MAX_PENDING_UPDATE_BYTES=24576
VITE_FIREBASE_SYNC_SNAPSHOT_AFTER_FLUSHES=24
VITE_FIREBASE_SYNC_METADATA_DEBOUNCE_MS=3000
```

这些都有默认值，不配也能跑。

## 最少动作清单

如果你已经写好了 Firebase 数据和 Rules，你现在通常只需要确认这三件事：

1. Firestore 路径名是否匹配默认集合名
2. 当前登录用户是不是你要同步的那个 Firebase 用户
3. 同一账号在另一台设备登录后，是否能访问自己的 `users/{uid}/boards/*`
