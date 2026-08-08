# AIClass Calculation

纯计算题互动课 **monorepo**：三包 + 生产文档区。

| 目录 | 类型 | 职责 |
|------|------|------|
| [`../_output_/`](../_output_/) | 真源 | 每门课唯一归属：course.json 注册表 + outline / plan / debug / .generated |
| [`engine/`](engine/) | 包 | 共享计算运行时（`top-split`、`.calc-*`）、模板、工具、KaTeX |
| [`AGENTS.md`](AGENTS.md) | 入口 | 任意 Agent 产品的统一说明 |

## 从这里开始

任意 Agent 先读 **[`AGENTS.md`](AGENTS.md)**（SOP 真源见根 [`../skills/`](../skills/README.md)）。

本仓只承载**纯计算题**（方程/算式演算等）。有图题见 AIClass；纯文字应用题见 AIClass_text。

| 需要 | 去读 |
|------|------|
| **Agent 总入口** | [`AGENTS.md`](AGENTS.md) |
| **命名、流程与 CLI** | SOP [`pipeline`](../skills/make/pipeline.md) |
| **流程导航** | [`根 skills 地图`](../skills/README.md) |
| **计算呈现契约** | [`plan/calculation`](../skills/plan/calculation/presentation.md) |
| **口播/TTS** | [`plan/common/voice`](../skills/plan/common/voice.md)、[`phrase-bank`](../skills/plan/common/phrase-bank.json) |
| 内容校验 | 根目录执行 `npm run content:check:calculation` |
| 引擎命令 | [`engine/docs/commands.md`](engine/docs/commands.md) |

本地 Plan 根路径：配置 `engine/workspace.local.json`（不提交）。示例见 [`engine/workspace.example.json`](engine/workspace.example.json)。
