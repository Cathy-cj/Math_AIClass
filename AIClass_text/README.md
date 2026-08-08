# AIClass Text

纯文字题互动课 **monorepo**：三包 + 生产文档区。

| 目录 | 类型 | 职责 |
|------|------|------|
| [`../_output_/`](../_output_/) | 真源 | 每门课唯一归属：course.json 注册表 + outline / plan / debug / .generated |
| [`engine/`](engine/) | 包 | 共享纯文字运行时、模板、工具、KaTeX vendor |
| [`AGENTS.md`](AGENTS.md) | 入口 | 任意 Agent 产品的统一说明 |

## 从这里开始

任意 Agent 先读 **[`AGENTS.md`](AGENTS.md)**（SOP 真源见根 [`../skills/`](../skills/README.md)）。一次只推进一门课；主路径为大纲 → 讲法 → 编排 → 预览（可选导出）。本仓只承载纯文字题；纯计算题和有图题由独立仓库负责。

| 需要 | 去读 |
|------|------|
| **Agent 总入口** | [`AGENTS.md`](AGENTS.md) |
| **命名、流程与 CLI** | SOP [`pipeline`](../skills/make/pipeline.md) |
| **流程导航** | [`根 skills 地图`](../skills/README.md) |
| 内容 SOP（outline / plan） | [`根 skills 地图`](../skills/README.md)；校验运行 `npm run content:check:text` |
| 引擎命令 | [`engine/docs/commands.md`](engine/docs/commands.md) |
| 引擎架构 | [`engine/docs/architecture.md`](engine/docs/architecture.md) |

本地 Plan 根路径：配置 `engine/workspace.local.json`（不提交）。示例见 [`engine/workspace.example.json`](engine/workspace.example.json)。
