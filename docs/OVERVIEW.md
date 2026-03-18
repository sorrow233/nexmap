# 项目概述

## 1. 项目概述

MixBoard Canvas 是一个基于 AI 的可视化白板应用，允许用户：
- 🗣️ 与 AI 进行对话，生成卡片形式的回复
- 🎨 在无限画布上组织和连接多个对话卡片
- 🔗 建立卡片间的连接关系，形成知识网络
- 📤 支持多 AI 服务商配置 (Gemini, OpenAI Compatible)
- ☁️ Firebase 云同步用户数据
- 🎁 为无 API Key 用户提供免费额度系统

---

## 2. 技术栈

| 类别 | 技术 |
|------|------|
| **前端框架** | React 18 + Vite |
| **状态管理** | Zustand (Slices 模式) + Zundo (撤销/重做) |
| **样式** | Tailwind CSS |
| **路由** | React Router DOM v7 |
| **认证** | Firebase Auth (Google 登录) |
| **数据库** | Firebase Firestore + IndexedDB (本地) |
| **动画** | React Spring + @use-gesture/react |
| **部署** | Cloudflare Pages + Cloudflare Functions |
| **包管理** | npm |

---

## 3. 目录结构

```
/Users/kang/Documents/AICode/aimainmap/
├── src/
│   ├── App.jsx                  # 应用入口，路由配置，认证逻辑
│   ├── main.jsx                 # React 挂载点
│   ├── index.css                # 全局样式
│   │
│   ├── components/              # UI 组件 (27个)
│   │   ├── Canvas.jsx           # 核心：无限画布
│   │   ├── Card.jsx             # 对话卡片 (收起状态)
│   │   ├── ChatBar.jsx          # 底部输入栏
│   │   ├── ChatModal.jsx        # 卡片展开的聊天模态框
│   │   ├── ConnectionLayer.jsx  # 卡片连线渲染
│   │   ├── SettingsModal.jsx    # 设置面板
│   │   ├── WelcomeCanvas.jsx    # 欢迎/引导界面
│   │   ├── Zone.jsx             # 分组区域
│   │   ├── BoardGallery.jsx     # 画板列表
│   │   ├── FavoritesGallery.jsx # 收藏夹
│   │   ├── StickyNote.jsx       # 便签
│   │   │
│   │   ├── chat/                # 聊天相关子组件
│   │   ├── settings/            # 设置相关子组件
│   │   └── share/               # 分享相关子组件
│   │
│   ├── store/                   # Zustand 状态管理
│   │   ├── useStore.js          # 入口：组合所有 Slices
│   │   └── slices/
│   │       ├── aiSlice.js       # AI 生成状态
│   │       ├── canvasSlice.js   # 画布状态 (缩放/平移)
│   │       ├── cardSlice.js     # 卡片 CRUD
│   │       ├── connectionSlice.js # 连线管理
│   │       ├── groupSlice.js    # 分组/Zone
│   │       ├── selectionSlice.js# 选中状态
│   │       ├── settingsSlice.js # 用户设置
│   │       ├── creditsSlice.js  # 系统额度
│   │       └── shareSlice.js    # 分享状态
│   │
│   ├── services/                # 业务逻辑层
│   │   ├── llm.js               # LLM 统一入口
│   │   ├── llm/                 # LLM 子模块
│   │   │   ├── factory.js       # Provider 工厂
│   │   │   ├── registry.js      # 默认配置
│   │   │   ├── providers/       # 具体 Provider 实现
│   │   │   │   ├── base.js      # 抽象基类
│   │   │   │   ├── gemini.js    # Gemini 协议
│   │   │   │   ├── openai.js    # OpenAI 协议
│   │   │   │   └── systemCredits.js # 系统额度代理
│   │   │   └── utils.js         # 工具函数
│   │   │
│   │   ├── ai/
│   │   │   ├── AIManager.js     # AI 任务队列管理器
│   │   │   └── promptUtils.js   # Prompt 工具
│   │   │
│   │   ├── boardService.js      # 画板 CRUD
│   │   ├── syncService.js       # Firebase 云同步
│   │   ├── storage.js           # localStorage 封装
│   │   ├── firebase.js          # Firebase 初始化
│   │   ├── db/indexedDB.js      # IndexedDB 封装
│   │   ├── imageStore.js        # 图片存储
│   │   ├── favoritesService.js  # 收藏服务
│   │   ├── clearAllUserData.js  # 登出清理
│   │   └── systemCredits/       # 系统额度服务
│   │
│   ├── hooks/                   # 自定义 Hooks
│   │   ├── useCardCreator.js    # 卡片创建逻辑
│   │   ├── useAISprouting.js    # AI 话题扩展
│   │   ├── useCanvasGestures.js # 画布手势
│   │   ├── useDraggable.js      # 拖拽逻辑
│   │   ├── useSelection.js      # 选中框逻辑
│   │   ├── useGlobalHotkeys.js  # 全局快捷键
│   │   ├── useImageUpload.js    # 图片上传
│   │   ├── useBoardBackground.js# 背景图
│   │   └── useAppInit.js        # 应用初始化
│   │
│   ├── pages/
│   │   ├── BoardPage.jsx        # 主画板页面
│   │   └── NotePage.jsx         # 单卡片全屏页
│   │
│   ├── utils/                   # 工具函数
│   │   ├── autoLayout.js        # 自动布局算法
│   │   ├── geometry.js          # 几何计算
│   │   ├── format.js            # 格式化
│   │   ├── uuid.js              # ID 生成
│   │   ├── debugLogger.js       # 调试日志
│   │   ├── graphUtils.js        # 图遍历
│   │   └── routing.js           # 路由工具
│   │
│   ├── contexts/                # React Context
│   │   └── LanguageContext.jsx  # 多语言
│   │
│   └── modules/                 # 功能模块
│       └── landing/             # 落地页
│
├── functions/                   # Cloudflare Functions (API)
│   └── api/
│       ├── gmi-proxy.js         # GMI API 代理
│       ├── system-credits.js    # 系统额度 API
│       ├── image-gen.js         # 图片生成代理
│       └── image-proxy.js       # 图片代理
│
├── public/                      # 静态资源
├── dist/                        # 构建输出
└── package.json                 # 项目配置
```
