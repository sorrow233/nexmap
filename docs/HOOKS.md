# 自定义 Hooks

## 1. `useCardCreator.js` - 卡片创建

**导出函数：**
```javascript
{
    handleCreateCard,    // 通用卡片创建 (文本/AI/图片)
    handleCreateNote,    // 创建便签
    handleBatchChat,     // 批量对话
    createCardWithText   // 从首页创建带初始内容的卡片
}
```

**创建流程：**
```javascript
async handleCreateCard(text, images = [], position = null) {
    // 1. 判断类型：仅图片 → 普通卡片, 有文本 → AI 卡片
    // 2. 计算位置 (使用 findOptimalPosition)
    // 3. 调用 createAICard 或 addCard
    // 4. 触发保存
}
```

## 2. `useAISprouting.js` - AI 话题扩展

**导出函数：**
```javascript
{
    handleExpandTopics,  // 展开标记的话题
    handleSprout         // 根据后续问题生成新卡片
}
```

**扩展逻辑：**
```javascript
handleExpandTopics(sourceId) {
    // 1. 获取源卡片的 marks
    // 2. 为每个 mark 创建新卡片
    // 3. 自动创建连接
    // 4. 请求 AI 生成内容
}
```

## 3. `useDraggable.js` - 拖拽逻辑

**参数：**
```javascript
useDraggable({
    id,           // 元素 ID
    x, y,         // 初始位置
    isSelected,   // 是否选中
    onSelect,     // 选中回调
    onMove,       // 移动回调
    onDragEnd,    // 拖拽结束回调
    disabled      // 是否禁用
})
```

**返回：**
```javascript
{
    style,              // 应用于元素的样式 (transform)
    handleMouseDown,    // 鼠标按下处理
    handleTouchStart    // 触摸开始处理
}
```

## 4. `useCanvasGestures.js` - 画布手势

**功能：**
- 双指缩放
- 滚轮缩放
- 拖拽平移

## 5. `useGlobalHotkeys.js` - 全局快捷键

**支持的快捷键：**
- `Ctrl+Z` / `Cmd+Z` → 撤销
- `Ctrl+Shift+Z` / `Cmd+Shift+Z` → 重做
- `Delete` / `Backspace` → 删除选中
- `Escape` → 取消选中
- `Ctrl+A` / `Cmd+A` → 全选

## 6. `useAppInit.js` - 应用初始化

**职责：**
- 加载用户设置
- 设置云同步监听
- 加载系统额度

## 7. `useBoardBackground.js` - 背景管理

**功能：**
- 切换背景类型 (点阵/网格/图片)
- 上传自定义背景图 (S3)
- 调整透明度和模糊度

## 8. `useThumbnailCapture.js` - 缩略图生成

**功能：**
- 使用 `html-to-image` 捕获画布截图
- 自动压缩
- 保存到 IDB 作为画板封面

## 9. `useNeuralNotepad.js` - 智能便签

**功能：**
- 实时 AI 补全 (Typewriter effect)
- 选中相关性分析
