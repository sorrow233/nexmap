# Aimainmap Browser Extension (v0.2)

## 目标
在任意网页划词后，直接把内容发送到 FlowStudio 队列，保持与主项目的 Flow 发送逻辑一致（UID 绑定 + 静默发送 + 重试补发）。

## 功能
- 划词浮窗：支持 DOM 文本与输入框文本。
- Flow 一键发送：状态反馈为 `发送中 / 已添加 / 已排队 / 失败`。
- UID 绑定：首次发送自动弹窗绑定，设置页可修改。
- 可靠传输：直连重试 + 队列补发 + 死信记录。
- 幂等保障：每次请求携带 `requestId` 与 `idempotencyKey`。

## 目录结构
- `manifest.json`：MV3 配置。
- `content/`：划词识别、浮窗 UI、发送编排。
- `background/`：发送重试、队列与补发调度。
- `options/`：UID 管理与队列监控页面。

## 本地打包
```bash
npm run ext:build
```
输出目录：`dist-extension/`

## 导入 Chrome
1. 打开 `chrome://extensions`
2. 开启开发者模式
3. 选择“加载已解压的扩展程序”
4. 选择 `dist-extension/`

## 快速验证
1. 在插件设置页填写 UID 并保存。
2. 任意网页划词后点击 `Flow`。
3. 断网发送一次，应显示 `已排队`。
4. 恢复网络后等待自动补发，或在设置页点击“全量补发”。

## 接口
- 发送地址：`https://flowstudio.catzz.work/api/import`
- 请求字段：`text`, `userId`, `source`, `timestamp`, `requestId`, `idempotencyKey`
