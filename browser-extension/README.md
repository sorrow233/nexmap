# Aimainmap Browser Extension (v0.3)

## 目标
在网页阅读时，尽量少打断：
- 划词出现极简按钮（图标 + `Flow`）
- 复制也可直接触发发送
- 右键菜单提供额外发送入口

## 功能
- 划词迷你按钮：仅显示图标和 `Flow`。
- 复制触发：用户复制选中文本时自动发送。
- 右键菜单：选中文本后可点击 `发送到 FlowStudio`。
- UID 绑定：首次发送若未绑定，自动弹窗引导绑定。
- 可靠传输：直连重试 + 队列补发 + 死信记录。

## 本地打包
```bash
npm run ext:build
```
输出目录：`dist-extension/`

## 导入 Chrome
1. 打开 `chrome://extensions`
2. 开启开发者模式
3. 点击“加载已解压的扩展程序”
4. 选择 `dist-extension/`

## 快速验证
1. 在设置页保存 UID。
2. 任意网页划词，确认出现极简 `Flow` 按钮，点击后可发送。
3. 复制同一段文本，确认会自动触发发送。
4. 右键选中文本，确认能看到“发送到 FlowStudio”并可发送。

## 接口
- 发送地址：`https://flowstudio.catzz.work/api/import`
- 请求字段：`text`, `userId`, `source`, `timestamp`, `requestId`, `idempotencyKey`
