const translations = {
    en: {
        hero: {
            brand: "Mixboard 2.0",
            title1: "Infinite",
            title2: "Canvas.",
            sub1: "Stop thinking in files and folders.",
            sub2: "Start thinking in connections.",
            ctaPrimary: "Start Thinking for Free",
            ctaSecondary: "See the magic",
            cards: {
                alpha: "Project Alpha",
                ideas: "Ideas",
                tags: "Tags flow",
                explore: "Exploration"
            }
        },
        bento: {
            headline: {
                pre: "For",
                highlight: "Professional",
                post: "LLM Users."
            },
            subtext: "To build the ultimate engine, we uncapped concurrency for massive parallel workloads, engineered a recursive graph-walker for deep context, and implemented spatial zoning for city-scale architecture.",
            graph: {
                badge: "Graph Context Walking",
                title: "It reads the connections.",
                text: "Traditional chat UIs are oblivious to structure. Our engine traverses the semantic graph of your canvas, pruning irrelevant nodes and injecting precise neighbor context into every generation.",
                stat1: "Token Window",
                stat2: "Depth"
            },
            sprout: {
                title: "Recursive \"Sprout\"",
                text: "Active ideation. Click \"Sprout\" to have the AI recursively branch one thought into five divergent execution paths."
            },
            concurrency: {
                title: "Unlimited Concurrency",
                text: "No \"Thinking...\" blockers. Fire off 50 streams simultaneous. Our non-blocking AIManager handles the load."
            },
            spatial: {
                badge: "Spatial Organization",
                title: "Semantic Zoning.",
                text: "Don't just organize—build cities. Group related thoughts into dynamic Zones that auto-adjust their bounding boxes. Like \"Cities: Skylines\" for your neural architecture.",
                zoneExample: "Zone: Architecture",
                autoExpand: "Auto-Expand"
            }
        },
        concurrency: {
            badge: "Non-Blocking Architecture",
            title: "Unlimited Concurrency.",
            text: "No \"Thinking...\" blockers. Fire off 50 streams simultaneous. Our non-blocking AIManager handles the load.",
            idle: "Idle..."
        },
        spatial: {
            badge: "Spatial Organization",
            title1: "Spatial",
            title2: "Organization.",
            text: "Semantic Zoning. Don't just organize—build cities. Group related thoughts into dynamic Zones that auto-adjust their bounding boxes. Like \"Cities: Skylines\" for your neural architecture.",
            stateOrganized: "STATE: ORGANIZED",
            stateChaos: "STATE: CHAOS",
            cards: {
                floorPlans: "Floor Plans",
                elevations: "Elevations",
                materials: "Materials",
                structures: "Structures",
                electrical: "Electrical"
            },
            zones: {
                arch: "Zone: Architecture",
                eng: "Zone: Engineering"
            }
        },
        sprout: {
            badge1: "128k Token Window",
            badge2: "∞ Depth",
            title1: "Recursive",
            title2: "\"Sprout\"",
            text: "Active ideation. Click \"Sprout\" to have the AI recursively branch one thought into five divergent execution paths."
        },
        graph: {
            badge: "Engine Core v2.1",
            title1: "Graph Context",
            title2: "Walking.",
            text: "It reads the connections. Traditional chat UIs are oblivious to structure. Our engine traverses the semantic graph of your canvas, pruning irrelevant nodes and injecting precise neighbor context into every generation."
        },
        demoInfinite: {
            title: "Intelligent Order.",
            text: "Watch AI scan your scattered thoughts and instantly structure them into actionable workflows.",
            organizing: "AI Organizing...",
            complete: "Structure Complete",
            cards: {
                roadmap: "Roadmap",
                planning: "Planning",
                assets: "Assets",
                design: "Design",
                schema: "Schema",
                dev: "Dev",
                ideas: "Ideas",
                brainstorm: "Brainstorm",
                sources: "Sources",
                research: "Research",
                sprints: "Sprints",
                agile: "Agile"
            }
        },
        footer: {
            title: "Start Thinking in Connections.",
            cta: "Launch Alpha",
            rights: "© 2024 Mixboard. All rights reserved."
        }
    },
    zh: {
        hero: {
            brand: "Mixboard 2.0",
            title1: "无限",
            title2: "画布。",
            sub1: "停止以文件和文件夹思考。",
            sub2: "开始以连接思考。",
            ctaPrimary: "免费开始思考",
            ctaSecondary: "见证魔法",
            cards: {
                alpha: "项目 Alpha",
                ideas: "创意",
                tags: "标签流",
                explore: "探索"
            }
        },
        bento: {
            headline: {
                pre: "为",
                highlight: "专业",
                post: "LLM 用户打造。"
            },
            subtext: "为了构建终极引擎，我们解锁了无上限并发以支持海量并行任务，通过递归图遍历器深度解析上下文，并实现了城市级的空间分区架构。",
            graph: {
                badge: "图上下文遍历",
                title: "它能读懂所有的连接。",
                text: "传统的聊天界面由于线性的逻辑，完全忽视了结构。我们的引擎遍历你画布的语义图谱，修剪无关节点，并将精确的邻域上下文注入到每一次生成中。",
                stat1: "令牌窗口",
                stat2: "深度"
            },
            sprout: {
                title: "递归 \"萌芽\"",
                text: "主动构思。点击“萌芽”，让AI将一个想法递归地分支成五条不同的执行路径。"
            },
            concurrency: {
                title: "无限并发",
                text: "没有“思考中…”的阻塞。同时启动50个流。我们的非阻塞AI管理器轻松应对负载。"
            },
            spatial: {
                badge: "空间组织",
                title: "语义分区。",
                text: "不仅仅是组织——而是建造城市。将相关的想法分组到动态的区域中，这些区域会自动调整边界框。就像你的神经架构的“城市：天际线”。",
                zoneExample: "区域：建筑",
                autoExpand: "自动扩展"
            }
        },
        concurrency: {
            badge: "非阻塞架构",
            title: "无限并发。",
            text: "没有“思考中…”的阻塞。同时启动50个流。我们的非阻塞AI管理器轻松应对负载。",
            idle: "空闲..."
        },
        spatial: {
            badge: "空间组织",
            title1: "空间",
            title2: "组织。",
            text: "语义分区。不仅仅是组织——而是建造城市。将相关的想法分组到动态的区域中，这些区域会自动调整边界框。就像你的神经架构的“城市：天际线”。",
            stateOrganized: "状态：有序",
            stateChaos: "状态：混乱",
            cards: {
                floorPlans: "平面图",
                elevations: "立面图",
                materials: "材料",
                structures: "结构",
                electrical: "电气"
            },
            zones: {
                arch: "区域：建筑",
                eng: "区域：工程"
            }
        },
        sprout: {
            badge1: "128k 令牌窗口",
            badge2: "∞ 深度",
            title1: "递归",
            title2: "\"萌芽\"",
            text: "主动构思。点击“萌芽”，让AI将一个想法递归地分支成五条不同的执行路径。"
        },
        graph: {
            badge: "引擎核心 v2.1",
            title1: "图上下文",
            title2: "遍历。",
            text: "它能读懂连接。传统的聊天界面忽视了结构。我们的引擎遍历你画布的语义图谱，修剪无关节点，并将精确的邻域上下文注入到每一次生成中。"
        },
        demoInfinite: {
            title: "智能秩序。",
            text: "观看AI扫描你零散的想法，并立即将其构建为可执行的工作流。",
            organizing: "AI 正在组织...",
            complete: "结构完成",
            cards: {
                roadmap: "路线图",
                planning: "规划",
                assets: "资产",
                design: "设计",
                schema: "架构",
                dev: "开发",
                ideas: "创意",
                brainstorm: "头脑风暴",
                sources: "来源",
                research: "研究",
                sprints: "冲刺",
                agile: "敏捷"
            }
        },
        footer: {
            title: "开始以连接思考。",
            cta: "启动 Alpha",
            rights: "© 2024 Mixboard. 保留所有权利。"
        }
    },
    ja: {
        hero: {
            brand: "Mixboard 2.0",
            title1: "無限の",
            title2: "キャンバス。",
            sub1: "ファイルやフォルダで考えるのはやめましょう。",
            sub2: "つながりで考え始めましょう。",
            ctaPrimary: "無料で思考を開始",
            ctaSecondary: "魔法を見る",
            cards: {
                alpha: "Project Alpha",
                ideas: "アイデア",
                tags: "タグフロー",
                explore: "探索"
            }
        },
        bento: {
            headline: {
                pre: "",
                highlight: "プロフェッショナル",
                post: "LLMユーザーのために。"
            },
            subtext: "究極のエンジンを構築するために、大規模な並列ワークロード向けの同時実行制限を解除し、深いコンテキストのための再帰的グラフウォーカーを設計し、都市規模のアーキテクチャのための空間ゾーニングを実装しました。",
            graph: {
                badge: "グラフコンテキストウォーキング",
                title: "つながりを読む。",
                text: "従来のチャットUIは構造を無視しています。私たちのエンジンはキャンバスの意味グラフを横断し、無関係なノードを削除し、正確な近隣コンテキストをすべての生成に注入します。",
                stat1: "トークンウィンドウ",
                stat2: "深度"
            },
            sprout: {
                title: "再帰的 \"スプラウト\"",
                text: "能動的なアイデア出し。「スプラウト」をクリックすると、AIが1つの思考を5つの異なる実行パスに再帰的に分岐させます。"
            },
            concurrency: {
                title: "無制限の同時実行",
                text: "「考え中...」のブロッキングはありません。50のストリームを同時に開始します。非ブロッキングAIManagerが負荷を処理します。"
            },
            spatial: {
                badge: "空間的組織",
                title: "セマンティックゾーニング。",
                text: "ただ整理するのではなく、都市を建設しましょう。関連する思考を、バウンディングボックスを自動調整する動的なゾーンにグループ化します。神経アーキテクチャのための「Cities: Skylines」のようなものです。",
                zoneExample: "ゾーン: 建築",
                autoExpand: "自動拡張"
            }
        },
        concurrency: {
            badge: "非ブロッキングアーキテクチャ",
            title: "無制限の同時実行。",
            text: "「考え中...」のブロッキングはありません。50のストリームを同時に開始します。非ブロッキングAIManagerが負荷を処理します。",
            idle: "アイドル..."
        },
        spatial: {
            badge: "空間的組織",
            title1: "空間的",
            title2: "組織。",
            text: "セマンティックゾーニング。ただ整理するのではなく、都市を建設しましょう。関連する思考を、バウンディングボックスを自動調整する動的なゾーンにグループ化します。神経アーキテクチャのための「Cities: Skylines」のようなものです。",
            stateOrganized: "状態: 整理済",
            stateChaos: "状態: 混沌",
            cards: {
                floorPlans: "平面図",
                elevations: "立面図",
                materials: "材料",
                structures: "構造",
                electrical: "電気"
            },
            zones: {
                arch: "ゾーン: 建築",
                eng: "ゾーン: 工学"
            }
        },
        sprout: {
            badge1: "128k トークンウィンドウ",
            badge2: "∞ 深度",
            title1: "再帰的",
            title2: "\"スプラウト\"",
            text: "能動的なアイデア出し。「スプラウト」をクリックすると、AIが1つの思考を5つの異なる実行パスに再帰的に分岐させます。"
        },
        graph: {
            badge: "エンジンコア v2.1",
            title1: "グラフコンテキスト",
            title2: "ウォーキング。",
            text: "つながりを読みます。従来のチャットUIは構造を無視しています。私たちのエンジンはキャンバスの意味グラフを横断し、無関係なノードを削除し、正確な近隣コンテキストをすべての生成に注入します。"
        },
        demoInfinite: {
            title: "インテリジェントな秩序。",
            text: "AIがあなたの散らばった思考をスキャンし、即座に実行可能なワークフローに構築するのを見てください。",
            organizing: "AIが整理中...",
            complete: "構造化完了",
            cards: {
                roadmap: "ロードマップ",
                planning: "計画",
                assets: "アセット",
                design: "デザイン",
                schema: "スキーマ",
                dev: "開発",
                ideas: "アイデア",
                brainstorm: "ブレスト",
                sources: "ソース",
                research: "研究",
                sprints: "スプリント",
                agile: "アジャイル"
            }
        },
        footer: {
            title: "つながりで考え始めましょう。",
            cta: "Alphaを起動",
            rights: "© 2024 Mixboard. All rights reserved."
        }
    }
};

export default translations;
