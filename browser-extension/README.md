# Aimainmap Browser Extension (MVP)

## 功能
- 在任意网页中划词后显示 `Flow` 按钮。
- 首次发送时要求输入 `FlowStudio Firebase UID`，之后静默发送。
- 请求失败自动重试；超过直连重试后进入队列，后台定时补发。

## 本地打包
```bash
npm run ext:build
```
打包输出目录：`dist-extension/`

## 导入 Chrome
1. 打开 `chrome://extensions`。
2. 开启「开发者模式」。
3. 点击「加载已解压的扩展程序」。
4. 选择 `dist-extension/`（或 `browser-extension/` 目录）。

## 使用
1. 在插件设置页保存 `FlowStudio Firebase UID`。
2. 任意网页划词，点击浮窗 `Flow`。
3. 按钮状态含义：
   - `发送中`：请求进行中
   - `已添加`：发送成功
   - `已排队`：暂存到重试队列
   - `失败`：发送失败且未入队

## 说明
- 发送目标：`https://flowstudio.catzz.work/api/import`
- 发送字段：`text`, `userId`, `source`, `timestamp`
