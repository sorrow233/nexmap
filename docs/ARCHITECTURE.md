# 核心架构

## 1. 架构图

```mermaid
graph TB
    subgraph Frontend["前端 (React + Vite)"]
        App[App.jsx]
        Pages[Pages]
        Components[Components]
        Hooks[Hooks]
        Store[Zustand Store]
        Services[Services]
    end
    
    subgraph CloudflareEdge["Cloudflare Edge"]
        CFPages[Cloudflare Pages]
        CFFunc[Cloudflare Functions]
    end
    
    subgraph ExternalServices["外部服务"]
        Firebase[Firebase Auth/Firestore]
        GMI[GMI Gemini API]
        OpenAI[OpenAI Compatible API]
    end
    
    subgraph LocalStorage["本地存储"]
        IDB[(IndexedDB)]
        LS[(localStorage)]
    end
    
    App --> Pages
    Pages --> Components
    Components --> Hooks
    Components --> Store
    Hooks --> Store
    Hooks --> Services
    Store --> Services
    
    Services --> CFFunc
    Services --> Firebase
    Services --> IDB
    Services --> LS
    
    CFFunc --> GMI
    CFFunc --> OpenAI
```

### 4.2 数据流概述

1. **用户交互** → 触发组件事件
2. **组件** → 调用 Hooks 或 Store Actions
3. **Store Actions** → 更新状态 & 调用 Services
4. **Services** → 
   - 本地：IndexedDB / localStorage
   - 远程：Firebase / Cloudflare Functions
5. **Cloudflare Functions** → 代理 AI 请求，保护 API Key

---

## 2. 详细数据流

### 2.1 用户发送消息流程

```mermaid
sequenceDiagram
    participant User
    participant ChatBar
    participant useCardCreator
    participant aiSlice
    participant AIManager
    participant ModelFactory
    participant Provider
    participant CloudflareProxy
    participant GMIAPI
    
    User->>ChatBar: 输入消息
    ChatBar->>useCardCreator: handleCreateCard()
    useCardCreator->>aiSlice: createAICard()
    aiSlice->>aiSlice: addCard() 创建空卡片
    aiSlice->>AIManager: requestTask()
    AIManager->>ModelFactory: getProvider()
    ModelFactory-->>AIManager: Provider实例
    AIManager->>Provider: stream()
    Provider->>CloudflareProxy: /api/gmi-proxy
    CloudflareProxy->>GMIAPI: 实际请求
    GMIAPI-->>CloudflareProxy: SSE流
    CloudflareProxy-->>Provider: SSE流
    loop 每个chunk
        Provider-->>AIManager: onProgress(chunk)
        AIManager-->>aiSlice: onProgress(chunk)
        aiSlice->>aiSlice: updateCardContent()
    end
    AIManager-->>aiSlice: 完成
    aiSlice->>aiSlice: setCardGenerating(false)
```

### 2.2 画板保存流程

```mermaid
sequenceDiagram
    participant Component
    participant Store
    participant boardService
    participant IndexedDB
    participant syncService
    participant Firestore
    
    Component->>Store: 修改状态
    Store->>Store: 触发防抖保存
    Store->>boardService: saveBoard()
    boardService->>IndexedDB: idbSet()
    alt 用户已登录
        boardService->>syncService: saveBoardToCloud()
        syncService->>Firestore: setDoc()
    end
```

### 2.3 应用启动流程

```mermaid
sequenceDiagram
    participant Browser
    participant App
    participant Firebase
    participant useAppInit
    participant boardService
    participant syncService
    participant Store
    
    Browser->>App: 加载应用
    App->>Firebase: onAuthStateChanged监听
    Firebase-->>App: 用户状态
    App->>useAppInit: 初始化
    useAppInit->>boardService: loadBoardsMetadata()
    alt 用户已登录
        useAppInit->>syncService: listenForBoardUpdates()
        useAppInit->>syncService: loadUserSettings()
        syncService-->>Store: 更新设置
    end
    App->>boardService: loadBoard(currentBoardId)
    boardService-->>Store: 恢复状态
```
