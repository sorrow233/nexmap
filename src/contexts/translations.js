const translations = {
    en: {
        hero: {
            brand: "NexMap 2.0",
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
            title1: "Spatial",
            title2: "Organization.",
            text: "Semantic Zoning. Don't just organize—build cities. Group related thoughts into dynamic Zones that auto-adjust their bounding boxes. Like \"Cities: Skylines\" for your neural architecture.",
            stateOrganized: "STATE: ORGANIZED",
            stateChaos: "STATE: CHAOS",
            zones: {
                arch: "Zone: Architecture",
                eng: "Zone: Engineering"
            },
            cards: {
                floorPlans: "Floor Plans",
                elevations: "Elevations",
                materials: "Materials",
                structures: "Structures",
                electrical: "Electrical"
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
            title: "Continuous Order.",
            text: "Watch AI scan your scattered thoughts and instantly arrange them into a neat, organized structure.",
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
            rights: "© 2024 NexMap. All rights reserved."
        }
    },
    zh: {
        hero: {
            brand: "NexMap 2.0",
            title1: "无限",
            title2: "画布。",
            sub1: "忘掉文件，打破层级。",
            sub2: "让一切在「连接」中重生。",
            ctaPrimary: "开启无限思维",
            ctaSecondary: "见证奇迹",
            cards: {
                alpha: "Project Alpha",
                ideas: "灵感库",
                tags: "标签流",
                explore: "探索边界"
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
                badge: "图上下文游走",
                title: "它能读懂连接。",
                text: "传统的聊天界面对结构一无所知。我们的引擎会遍历你画布上的语义结构图，修剪不相关的节点，并将精确的相邻上下文注入到每一次生成中。",
                stat1: "Token 窗口",
                stat2: "深度"
            },
            sprout: {
                title: "递归“发芽”",
                text: "主动构思。点击“发芽”，让 AI 递归地将一个想法分支成五条不同的执行路径。"
            },
            concurrency: {
                title: "无限并发",
                text: "没有“思考中…”的阻碍。同时启动 50 个流。我们的非阻塞 AIManager 轻松应对负载。"
            },
            spatial: {
                badge: "空间分区",
                title: "语义分区。",
                text: "不仅仅是组织——而是建造城市。将相关的想法分组到动态的“区域”中，这些区域会自动调整其边界框。就像神经架构的“城市：天际线”。",
                zoneExample: "区域：架构",
                autoExpand: "自动扩展"
            }
        },
        concurrency: {
            badge: "非阻塞式架构",
            title: "无限并发。",
            text: "告别“正在思考”的等待。50+ 线程同时迸发，非阻塞架构让你的灵感无需排队，火力全开。",
            idle: "待机中..."
        },
        spatial: {
            title1: "空间化",
            title2: "组织架构。",
            text: "思维特区。不仅仅是整理，而是在规划你的思维城市。创建动态调整的“特区 (Zones)”，让混乱的想法自动归位，井然有序。",
            stateOrganized: "状态: 有序",
            stateChaos: "状态: 混沌",
            zones: {
                arch: "特区: 架构设计",
                eng: "特区: 工程实现"
            },
            cards: {
                floorPlans: "平面图",
                elevations: "立面图",
                materials: "材质库",
                structures: "结构分析",
                electrical: "电气系统"
            }
        },
        sprout: {
            badge1: "128k 上下文窗口",
            badge2: "∞ 探索深度",
            title1: "递归式",
            title2: "“思维裂变”",
            text: "拒绝单线程。点击“Sprout”，让一个念头瞬间衍生出五条并行的思考路径，灵感从此指数级爆发。"
        },
        graph: {
            badge: "引擎核心 v2.1",
            title1: "图谱语境",
            title2: "深度游走。",
            text: "洞察每一条脉络。传统对话是线性的，而思维是网状的。Mixboard 能够遍历你画布上的语义网络，修剪无关枝节，让每一次生成都精准切中上下文要害。"
        },
        demoInfinite: {
            title: "秩序之美。",
            text: "观看 AI 扫描你零散的想法，并将它们瞬间整理得井井有条。",
            organizing: "AI 正在重构...",
            complete: "结构构建完成",
            cards: {
                roadmap: "路线图",
                planning: "全盘规划",
                assets: "核心资产",
                design: "设计规范",
                schema: "数据模型",
                dev: "开发文档",
                ideas: "灵感碎片",
                brainstorm: "头脑风暴",
                sources: "数据源",
                research: "深度调研",
                sprints: "冲刺计划",
                agile: "敏捷迭代"
            }
        },
        footer: {
            title: "开始用「连接」思考。",
            cta: "启动 Alpha 版",
            rights: "© 2024 NexMap. 保留所有权利。"
        }
    },
    ja: {
        hero: {
            brand: "NexMap 2.0",
            title1: "無限の",
            title2: "キャンバス。",
            sub1: "ファイルも、フォルダも、過去のもの。",
            sub2: "「繋がり」こそが、思考の翼になる。",
            ctaPrimary: "思考を解き放つ",
            ctaSecondary: "魔法を目撃する",
            cards: {
                alpha: "Project Alpha",
                ideas: "アイデア源",
                tags: "タグフロー",
                explore: "探索"
            }
        },
        bento: {
            headline: {
                pre: "すべての",
                highlight: "プロフェッショナル",
                post: "へ。"
            },
            subtext: "究極のエンジンを構築するために。並列処理の制限を撤廃し、文脈を深く理解する再帰的グラフウォーカーを設計。都市規模の知識を支える「ゾーニング」技術を実装しました。",
            graph: {
                badge: "グラフ・コンテキスト・ウォーキング",
                title: "文脈を、旅する。",
                text: "チャットUIはもう古い。NexMapはキャンバス上の意味論的グラフを横断し、無関係なノイズを排除。最適なコンテキストだけを、瞬時に抽出します。",
                stat1: "トークン・ウィンドウ",
                stat2: "探索深度"
            },
            sprout: {
                title: "思考の連鎖爆発 \"Sprout\"",
                text: "単一の回答では物足りない。「Sprout（発芽）」させれば、一つのアイデアが五つの並行世界へと分岐。思考は、指数関数的に加速します。"
            },
            concurrency: {
                title: "完全並列思考",
                text: "「考え中...」で待たされることはありません。50以上のストリームを同時展開。ノンブロッキング構造が、あなたの思考スピードに追いつきます。"
            },
            spatial: {
                badge: "空間的オーガナイゼーション",
                title: "セマンティック・シティ。",
                text: "整理整頓のその先へ。思考を「ゾーン」で都市計画のように構築。関連するアイデアは自動的に集約され、あなたの脳内地図は動的に進化します。",
                zoneExample: "Zone: Architecture",
                autoExpand: "自動拡張"
            }
        },
        concurrency: {
            badge: "ノンブロッキング・アーキテクチャ",
            title: "完全並列思考。",
            text: "「考え中...」で待たされることはありません。50以上のストリームを同時展開。ノンブロッキング構造が、あなたの思考スピードに追いつきます。",
            idle: "待機中..."
        },
        spatial: {
            title1: "空間的",
            title2: "オーガナイゼーション。",
            text: "セマンティック・シティ。整理整頓のその先へ。思考を「ゾーン」で都市計画のように構築。関連するアイデアは自動的に集約され、あなたの脳内地図は動的に進化します。",
            stateOrganized: "STATE: ORGANIZED",
            stateChaos: "STATE: CHAOS",
            zones: {
                arch: "Zone: Architecture",
                eng: "Zone: Engineering"
            },
            cards: {
                floorPlans: "平面図",
                elevations: "立面図",
                materials: "マテリアル",
                structures: "構造解析",
                electrical: "電気系統"
            }
        },
        sprout: {
            badge1: "128k トークン",
            badge2: "∞ 深度",
            title1: "再帰的",
            title2: "「スプラウト」",
            text: "単一の回答では物足りない。「Sprout（発芽）」させれば、一つのアイデアが五つの並行世界へと分岐。思考は、指数関数的に加速します。"
        },
        graph: {
            badge: "Engine Core v2.1",
            title1: "グラフ・コンテキスト",
            title2: "ウォーキング。",
            text: "文脈を、旅する。チャットUIはもう古い。NexMapはキャンバス上の意味論的グラフを横断し、無関係なノイズを排除。最適なコンテキストだけを、瞬時に抽出します。"
        },
        demoInfinite: {
            title: "秩序ある、カオス。",
            text: "AIが散らばった思考をスキャンし、瞬時に整然と整理する様子をご覧ください。",
            organizing: "AIが再構築中...",
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
                research: "リサーチ",
                sprints: "スプリント",
                agile: "アジャイル"
            }
        },
        footer: {
            title: "思考の「繋がり」を始めよう。",
            cta: "Alpha版を起動",
            rights: "© 2024 NexMap. All rights reserved."
        }
    }
};

export default translations;
